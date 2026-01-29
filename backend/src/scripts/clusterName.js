import dotenv from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import ClusteredCases from '../models/ClusteredCases.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../.env') });

import { connectToMongoDB } from '../utils/mongoose.js';
import { invokeLLMAPI, parseLLMJSONResponse } from '../services/llm.service.js';

// ============================================================================
// PROMPTS
// ============================================================================

const CLUSTER_NAMING_SYSTEM_PROMPT = `You are an expert at analyzing support case patterns and generating concise, descriptive names.

Your task is to generate a short, meaningful name (3-4 words) that represents a cluster of related support cases.

Guidelines:
- The name should capture the common theme/issue across all cases
- Use technical but clear terminology
- Focus on the problem type, component, or symptom
- Be specific enough to distinguish from other clusters
- Avoid generic terms like "Issue", "Problem", "Error" alone

Examples of good cluster names:
- "VM Migration Failures"
- "Storage Capacity Alerts"
- "Network Connectivity Timeout"
- "Cluster Upgrade Issues"
- "AHV Host Unresponsive"
- "Prism Central Login"
- "Snapshot Replication Delays"

Return your response as JSON with the following format:
{
  "clusterName": "<3-4 word descriptive name>",
  "confidence": <0.0-1.0>,
  "reasoning": "<brief explanation of why this name fits>"
}`;

/**
 * Build user prompt for cluster naming
 */
function buildClusterNamingUserPrompt(cluster) {
  const cases = cluster.cases || [];
  
  // Extract subjects and resolution summaries
  const caseDetails = cases.slice(0, 15).map((c, idx) => {
    const subject = c.subject || c.caseInfo?.subject || 'N/A';
    const resolution = c.resolution_summary || c.resolution?.resolutionNotes || '';
    
    return `Case ${idx + 1}:
  Subject: ${subject}
  Resolution: ${resolution.substring(0, 200)}${resolution.length > 200 ? '...' : ''}`;
  }).join('\n\n');

  return `Analyze the following ${cases.length} support cases that have been grouped into a cluster and generate a concise 3-4 word name that represents the common theme.

${cluster.representative_title ? `Current Representative Title: ${cluster.representative_title}\n` : ''}
Total Cases in Cluster: ${cases.length}

Sample Cases:
${caseDetails}

Generate a 3-4 word cluster name that best describes the common issue or theme across these cases.`;
}

// ============================================================================
// CLUSTER NAMING LOGIC
// ============================================================================

/**
 * Generate name for a single cluster using LLM
 */
async function generateClusterName(cluster, index) {
  try {
    const userPrompt = buildClusterNamingUserPrompt(cluster);
    
    const response = await invokeLLMAPI({
      systemPrompt: CLUSTER_NAMING_SYSTEM_PROMPT,
      userPrompt,
      maxTokens: 256,
      temperature: 0.3, // Lower temperature for consistent naming
    });

    const parsed = parseLLMJSONResponse(response);
    
    if (parsed.clusterName) {
      console.log(`✅ Cluster ${index + 1}: "${parsed.clusterName}" (confidence: ${parsed.confidence})`);
      return {
        success: true,
        clusterName: parsed.clusterName,
        confidence: parsed.confidence || 0.8,
        reasoning: parsed.reasoning || '',
      };
    }
    
    // Fallback: try to extract from text response
    const fallbackName = extractNameFromText(response.text || response.content);
    if (fallbackName) {
      console.log(`⚠️ Cluster ${index + 1}: "${fallbackName}" (extracted from text)`);
      return {
        success: true,
        clusterName: fallbackName,
        confidence: 0.6,
        reasoning: 'Extracted from non-JSON response',
      };
    }

    throw new Error('Could not parse cluster name from response');
  } catch (error) {
    console.error(`❌ Cluster ${index + 1}: Failed - ${error.message}`);
    return {
      success: false,
      clusterName: cluster.representative_title || `Cluster ${index + 1}`,
      confidence: 0,
      reasoning: `Error: ${error.message}`,
    };
  }
}

/**
 * Extract cluster name from text if JSON parsing fails
 */
function extractNameFromText(text) {
  if (!text) return null;
  
  // Try to find quoted text that looks like a name
  const quotedMatch = text.match(/"([^"]{5,50})"/);
  if (quotedMatch) {
    const words = quotedMatch[1].split(/\s+/);
    if (words.length >= 2 && words.length <= 5) {
      return quotedMatch[1];
    }
  }
  
  return null;
}

/**
 * Process all clusters and generate names
 */
async function processAllClusters(clusters, options = {}) {
  const { batchSize = 5, delayBetweenBatches = 1000 } = options;
  const results = [];

  console.log(`\n📊 Processing ${clusters.length} clusters...\n`);

  for (let i = 0; i < clusters.length; i += batchSize) {
    const batch = clusters.slice(i, i + batchSize);
    
    // Process batch in parallel
    const batchResults = await Promise.all(
      batch.map((cluster, batchIdx) => generateClusterName(cluster, i + batchIdx))
    );
    
    results.push(...batchResults);
    
    // Delay between batches to avoid rate limiting
    if (i + batchSize < clusters.length) {
      console.log(`\n⏳ Processed ${Math.min(i + batchSize, clusters.length)}/${clusters.length} clusters...\n`);
      await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
    }
  }

  return results;
}

// ============================================================================
// MAIN SCRIPT
// ============================================================================

async function generateClusterNames() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await connectToMongoDB();
    
    // Fetch the first document (which contains all clusters)
    let clusterDoc = await ClusteredCases.find({}).lean();
    clusterDoc = clusterDoc[0];
    
    if (!clusterDoc || !Array.isArray(clusterDoc.clusters)) {
      console.log('❌ No clusters found in clustered_cases collection');
      process.exit(1);
    }

    const clusters = clusterDoc.clusters;
    console.log(`📦 Found ${clusters.length} clusters to process`);

    // Generate names for all clusters
    const results = await processAllClusters(clusters, {
      batchSize: 3,
      delayBetweenBatches: 2000,
    });

    // Update clusters with generated names
    const updatedClusters = clusters.map((cluster, idx) => ({
      ...cluster,
      generated_name: results[idx].clusterName,
      name_confidence: results[idx].confidence,
      name_reasoning: results[idx].reasoning,
    }));

    console.log('clusters updated');

    // Update the document in MongoDB
    await ClusteredCases.findOneAndUpdate(
      { _id: clusterDoc._id },
      { 
        $set: { 
          clusters: updatedClusters,
        } 
      }
    );

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📋 CLUSTER NAMING SUMMARY');
    console.log('='.repeat(60));
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log(`✅ Successfully named: ${successful}`);
    console.log(`❌ Failed: ${failed}`);
    console.log('\nGenerated Names:');
    
    updatedClusters.forEach((cluster, idx) => {
      const caseCount = cluster.cases?.length || 0;
      console.log(`  ${idx + 1}. "${cluster.generated_name}" (${caseCount} cases)`);
    });

    console.log('\n✨ Cluster names saved to database');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the script
generateClusterNames();
