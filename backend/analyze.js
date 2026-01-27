#!/usr/bin/env node

/**
 * CLI to analyze a case using LLM
 * 
 * Usage: 
 *   node analyze.js <caseNumber>           # Fetch and analyze
 *   node analyze.js --file <jsonFile>      # Analyze from existing JSON
 * 
 * Example: 
 *   node analyze.js 00475706
 *   node analyze.js --file output/case_475706.json
 */

import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs/promises';
import path from 'path';
import { getCaseDetails } from './src/services/caseQuery.service.js';
import { analyzeCase } from './src/services/caseAnalysis.service.js';
import { testConnection, closePool } from './src/config/postgres.js';

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    printHelp();
    process.exit(0);
  }

  let caseData;
  let caseNumber;
  let needsDbConnection = true;

  // Check if analyzing from file
  if (args[0] === '--file' || args[0] === '-f') {
    needsDbConnection = false;
    const filePath = args[1];
    if (!filePath) {
      console.error('Error: Please provide a JSON file path');
      process.exit(1);
    }
    
    console.log(`\n📄 Loading case data from: ${filePath}\n`);
    const fileContent = await fs.readFile(filePath, 'utf-8');
    caseData = JSON.parse(fileContent);
    caseNumber = caseData.caseInfo.caseNumber;
  } else {
    caseNumber = args[0];
  }

  console.log(`\n🔍 Analyzing case: ${caseNumber}\n`);

  try {
    // Fetch case data if not from file
    if (!caseData) {
      const connected = await testConnection();
      if (!connected) {
        console.error('\n❌ Cannot connect to PostgreSQL. Check .env configuration.');
        process.exit(1);
      }

      console.log('📊 Fetching case data...');
      caseData = await getCaseDetails(caseNumber);
      console.log('✅ Case data fetched');
      
      // Save the case data first
      const outputDir = path.join(process.cwd(), 'output');
      await fs.mkdir(outputDir, { recursive: true });
      const caseFile = path.join(outputDir, `case_${caseNumber.replace(/^0+/, '')}.json`);
      await fs.writeFile(caseFile, JSON.stringify(caseData, null, 2), 'utf-8');
      console.log(`📁 Case data saved to: ${caseFile}`);
    }

    // Analyze the case
    console.log('\n🤖 Analyzing with LLM...');
    const startTime = Date.now();
    
    const analysis = await analyzeCase(caseData);
    
    const duration = Date.now() - startTime;
    console.log(`✅ Analysis completed in ${(duration / 1000).toFixed(1)}s`);

    // Save analysis result
    const outputDir = path.join(process.cwd(), 'output');
    await fs.mkdir(outputDir, { recursive: true });
    const analysisFile = path.join(outputDir, `analysis_${caseNumber.replace(/^0+/, '')}.json`);
    await fs.writeFile(analysisFile, JSON.stringify(analysis, null, 2), 'utf-8');
    console.log(`\n📁 Analysis saved to: ${analysisFile}`);

    // Print summary
    printAnalysisSummary(analysis);

  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    if (process.env.NODE_ENV === 'development') {
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    if (needsDbConnection) {
      await closePool();
    }
  }
}

function printHelp() {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                        Case Analysis Utility                                   ║
╚═══════════════════════════════════════════════════════════════════════════════╝

USAGE:
  node analyze.js <caseNumber>              Fetch case from DB and analyze
  node analyze.js --file <jsonFile>         Analyze from existing case JSON

EXAMPLES:
  node analyze.js 00475706
  node analyze.js --file output/case_475706.json

OUTPUT:
  - Case data saved to: output/case_<number>.json
  - Analysis saved to:  output/analysis_<number>.json

ENVIRONMENT VARIABLES:
  PG_*          PostgreSQL connection (for fetching case)
  LLM_API_URL   LLM API endpoint
  LLM_API_KEY   LLM API key/token
  LLM_API_MODEL LLM model name
`);
}

function printAnalysisSummary(result) {
  const a = result.analysis;
  
  console.log('\n' + '═'.repeat(80));
  console.log('                           CASE ANALYSIS SUMMARY');
  console.log('═'.repeat(80));

  // Issue Summary
  console.log('\n📋 ISSUE SUMMARY');
  console.log('─'.repeat(80));
  console.log(`   Brief: ${a.issueSummary?.brief || 'N/A'}`);
  console.log(`   Technical Area: ${a.issueSummary?.technicalArea || 'N/A'}`);
  console.log(`   Root Cause: ${a.issueSummary?.rootCause || 'N/A'}`);

  // Tags
  console.log('\n🏷️  CLASSIFICATION TAGS');
  console.log('─'.repeat(80));
  console.log(`   Problem Categories: ${a.tags?.problemCategory?.join(', ') || 'N/A'}`);
  console.log(`   Product Areas: ${a.tags?.productArea?.join(', ') || 'N/A'}`);
  console.log(`   Technical Complexity: ${a.tags?.technicalComplexity || 'N/A'}`);
  console.log(`   Issue Type: ${a.tags?.issueType || 'N/A'}`);
  console.log(`   Resolution Type: ${a.tags?.resolutionType || 'N/A'}`);

  // Quality Scores
  console.log('\n⭐ QUALITY ASSESSMENT');
  console.log('─'.repeat(80));
  const qa = a.qualityAssessment || {};
  console.log(`   Resolution Quality:    ${qa.resolutionQuality?.score || 'N/A'}/10 - ${qa.resolutionQuality?.reasoning || ''}`);
  console.log(`   Response Timeliness:   ${qa.responseTimeliness?.score || 'N/A'}/10 - ${qa.responseTimeliness?.reasoning || ''}`);
  console.log(`   Communication Quality: ${qa.communicationQuality?.score || 'N/A'}/10 - ${qa.communicationQuality?.reasoning || ''}`);
  console.log(`   Technical Accuracy:    ${qa.technicalAccuracy?.score || 'N/A'}/10 - ${qa.technicalAccuracy?.reasoning || ''}`);
  console.log(`   Overall Handling:      ${qa.overallHandling?.score || 'N/A'}/10 - ${qa.overallHandling?.reasoning || ''}`);

  // Sentiment
  console.log('\n💭 SENTIMENT ANALYSIS');
  console.log('─'.repeat(80));
  const cs = a.sentimentAnalysis?.customerSentiment || {};
  const ss = a.sentimentAnalysis?.supportSentiment || {};
  console.log(`   Customer Sentiment: ${cs.overall || 'N/A'} (Trajectory: ${cs.trajectory || 'N/A'})`);
  console.log(`   Frustration Level: ${cs.frustrationLevel || 'N/A'}`);
  console.log(`   Support Tone: ${ss.tone || 'N/A'}, Empathy: ${ss.empathy || 'N/A'}, Proactiveness: ${ss.proactiveness || 'N/A'}`);

  // Experience Insights
  console.log('\n💡 EXPERIENCE INSIGHTS');
  console.log('─'.repeat(80));
  const exp = a.experienceInsights || {};
  console.log(`   Positive Aspects: ${exp.positiveAspects?.join('; ') || 'N/A'}`);
  console.log(`   Improvement Areas: ${exp.improvementAreas?.join('; ') || 'N/A'}`);
  console.log(`   Resolution Effective: ${exp.wasResolutionEffective ?? 'N/A'}`);
  console.log(`   Customer Effort: ${exp.customerEffortLevel || 'N/A'}`);
  console.log(`   Time to Resolution: ${exp.timeToResolutionAssessment || 'N/A'}`);

  // Clustering Features
  console.log('\n🔗 CLUSTERING FEATURES');
  console.log('─'.repeat(80));
  const cf = a.clusteringFeatures || {};
  console.log(`   Primary Topic: ${cf.primaryTopic || 'N/A'}`);
  console.log(`   Secondary Topics: ${cf.secondaryTopics?.join(', ') || 'N/A'}`);
  console.log(`   Keywords: ${cf.keywords?.join(', ') || 'N/A'}`);

  // Actionable Insights
  console.log('\n🎯 ACTIONABLE INSIGHTS');
  console.log('─'.repeat(80));
  const ai = a.actionableInsights || {};
  if (ai.knowledgeBaseGaps?.length > 0) {
    console.log(`   KB Gaps: ${ai.knowledgeBaseGaps.join('; ')}`);
  }
  if (ai.processImprovements?.length > 0) {
    console.log(`   Process Improvements: ${ai.processImprovements.join('; ')}`);
  }
  if (ai.trainingOpportunities?.length > 0) {
    console.log(`   Training Opportunities: ${ai.trainingOpportunities.join('; ')}`);
  }

  // Metadata
  console.log('\n📊 ANALYSIS METADATA');
  console.log('─'.repeat(80));
  console.log(`   Confidence Score: ${a.metadata?.confidenceScore || 'N/A'}`);
  console.log(`   Analysis Timestamp: ${result.analysisTimestamp}`);
  console.log(`   Conversation Messages: ${result.inputSummary.conversationLength}`);
  console.log(`   Had Escalation: ${result.inputSummary.hadEscalation}`);

  console.log('\n' + '═'.repeat(80));
  console.log('\n📄 Full analysis saved to JSON file\n');
}

main().catch(console.error);
