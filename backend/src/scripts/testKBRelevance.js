#!/usr/bin/env node

/**
 * CLI Script to test KB relevance checking
 * 
 * Usage:
 *   node src/scripts/testKBRelevance.js <caseNumber> [options]
 * 
 * Examples:
 *   node src/scripts/testKBRelevance.js 00475706
 *   node src/scripts/testKBRelevance.js 00475706 --threshold 50
 *   node src/scripts/testKBRelevance.js 00475706 --kb KB-12345,KB-67890
 *   node src/scripts/testKBRelevance.js 00475706 --json
 */

import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import fs from 'fs/promises';
import dotenv from 'dotenv';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../.env') });

import { getCaseDetails } from '../services/caseQuery.service.js';
import { getKBArticles } from '../services/kbQuery.service.js';
import { checkKBRelevance, buildCaseContext } from '../services/kbRelevance.service.js';
import { testConnection, closePool } from '../config/postgres.js';

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    printHelp();
    process.exit(0);
  }

  const options = parseArgs(args);

  if (!options.caseNumber) {
    console.error('❌ Error: Case number is required');
    printHelp();
    process.exit(1);
  }

  console.log(`\n🔍 Testing KB Relevance for Case: ${options.caseNumber}\n`);
  console.log('─'.repeat(80));

  try {
    // Test database connection
    const connected = await testConnection();
    if (!connected) {
      console.error('\n❌ Could not connect to PostgreSQL. Check your .env configuration.');
      process.exit(1);
    }

    // Check LLM configuration
    if (!process.env.LLM_API_URL) {
      console.error('\n❌ LLM_API_URL is not configured in .env');
      process.exit(1);
    }

    // Step 1: Fetch case details
    console.log('\n📊 Step 1: Fetching case details...');
    const startTime = Date.now();
    const caseData = await getCaseDetails(options.caseNumber);
    console.log(`   ✅ Case fetched in ${Date.now() - startTime}ms`);
    console.log(`   📋 Subject: ${caseData.caseInfo.subject}`);
    console.log(`   📊 Status: ${caseData.caseInfo.status}`);
    console.log(`   🏷️  Tags: ${[...caseData.tags.openTags, ...caseData.tags.closeTags].join(', ') || 'None'}`);

    // Step 2: Get KB articles
    console.log('\n📚 Step 2: Fetching KB articles...');
    let kbArticles = [];

    if (options.kbArticleNumbers && options.kbArticleNumbers.length > 0) {
      // Use specified KB articles
      console.log(`   📎 Using specified KBs: ${options.kbArticleNumbers.join(', ')}`);
      kbArticles = await getKBArticles(options.kbArticleNumbers);
    } else if (caseData.caseInfo.kbArticle) {
      // Use KB article from case
      const kbNumbers = caseData.caseInfo.kbArticle.split(',').map(k => k.trim()).filter(Boolean);
      console.log(`   📎 Using KB from case: ${kbNumbers.join(', ')}`);
      kbArticles = await getKBArticles(kbNumbers);
    } else {
      console.log('   ⚠️  No KB articles found in case. Use --kb option to specify.');
      console.log('\n   Example: node src/scripts/testKBRelevance.js 00475706 --kb KB-12345');
      await closePool();
      process.exit(0);
    }

    if (kbArticles.length === 0) {
      console.log('   ⚠️  Could not fetch KB articles from database.');
      await closePool();
      process.exit(0);
    }

    console.log(`   ✅ Fetched ${kbArticles.length} KB article(s)`);
    kbArticles.forEach((kb, i) => {
      console.log(`      ${i + 1}. ${kb.title?.substring(0, 60) || 'No title'}...`);
    });

    // Step 3: Build case context
    console.log('\n🔧 Step 3: Building case context...');
    const caseContext = buildCaseContext(caseData);
    console.log('   ✅ Case context built');
    if (!options.jsonOutput) {
      console.log('\n   Context Preview:');
      console.log('   ─'.repeat(40));
      console.log(`   Subject: ${caseContext.subject?.substring(0, 60) || 'N/A'}...`);
      console.log(`   Product: ${caseContext.product || 'N/A'}`);
      console.log(`   NOS Version: ${caseContext.nosVersion || 'N/A'}`);
      console.log(`   Skill: ${caseContext.skill || 'N/A'}`);
      console.log(`   Tags: ${caseContext.tags?.join(', ') || 'None'}`);
      console.log(`   Description: ${caseContext.description?.substring(0, 100) || 'N/A'}...`);
      console.log(`   Resolution: ${caseContext.resolutionNotes?.substring(0, 100) || 'N/A'}...`);
    }

    // Step 4: Check KB relevance
    console.log('\n🤖 Step 4: Checking KB relevance with LLM...');
    const llmStartTime = Date.now();
    
    const relevanceResult = await checkKBRelevance(kbArticles, caseData, {
      threshold: options.threshold,
    });
    
    const llmDuration = Date.now() - llmStartTime;
    console.log(`   ✅ LLM analysis completed in ${llmDuration}ms`);

    // Step 5: Display results
    if (options.jsonOutput) {
      console.log('\n' + '═'.repeat(80));
      console.log(JSON.stringify(relevanceResult, null, 2));
    } else {
      printResults(relevanceResult, options);
    }

    // Save output if requested
    if (options.outputFile) {
      const output = {
        caseNumber: options.caseNumber,
        caseSubject: caseData.caseInfo.subject,
        caseContext,
        kbArticles: kbArticles.map(kb => ({
          id: kb.id || kb.articleNumber,
          title: kb.title,
        })),
        relevanceResult,
        metadata: {
          timestamp: new Date().toISOString(),
          threshold: options.threshold,
          llmDurationMs: llmDuration,
        },
      };

      const outputPath = resolve(process.cwd(), options.outputFile);
      const outputDir = dirname(outputPath);
      await fs.mkdir(outputDir, { recursive: true });
      await fs.writeFile(outputPath, JSON.stringify(output, null, 2), 'utf-8');
      console.log(`\n📁 Results saved to: ${outputPath}`);
    }

    // Print timing summary
    const totalDuration = Date.now() - startTime;
    console.log('\n' + '─'.repeat(80));
    console.log(`⏱️  Total execution time: ${totalDuration}ms (LLM: ${llmDuration}ms)`);

  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    if (process.env.NODE_ENV === 'development') {
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    await closePool();
  }
}

function parseArgs(args) {
  const options = {
    caseNumber: null,
    kbArticleNumbers: [],
    threshold: 40,
    jsonOutput: false,
    outputFile: null,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg.startsWith('--')) {
      switch (arg) {
        case '--kb':
          options.kbArticleNumbers = args[++i]?.split(',').map(k => k.trim()) || [];
          break;
        case '--threshold':
          options.threshold = parseInt(args[++i], 10) || 40;
          break;
        case '--json':
          options.jsonOutput = true;
          break;
        case '--output':
        case '-o':
          options.outputFile = args[++i];
          break;
      }
    } else if (!options.caseNumber) {
      options.caseNumber = arg;
    }
  }

  return options;
}

function printResults(result, options) {
  console.log('\n' + '═'.repeat(80));
  console.log('                         KB RELEVANCE RESULTS');
  console.log('═'.repeat(80));

  console.log(`\n📋 Case: ${result.caseSubject || 'N/A'}`);
  console.log(`📊 Evaluated: ${result.evaluatedCount || 0} KB article(s)`);
  console.log(`🎯 Threshold: ${options.threshold}+ score`);

  if (result.summary) {
    console.log(`\n📝 Summary: ${result.summary}`);
  }

  if (!result.relevantKBs || result.relevantKBs.length === 0) {
    console.log('\n' + '─'.repeat(80));
    console.log('❌ No relevant KB articles found above the threshold.');
    console.log('─'.repeat(80));
    return;
  }

  console.log('\n' + '─'.repeat(80));
  console.log('                         RELEVANT KB ARTICLES');
  console.log('─'.repeat(80));

  result.relevantKBs.forEach((kb, index) => {
    const relevanceIcon = kb.relevanceScore >= 80 ? '🟢' : kb.relevanceScore >= 60 ? '🟡' : '🟠';
    const typeIcon = getTypeIcon(kb.recommendationType);

    console.log(`\n${index + 1}. ${kb.kbTitle || kb.kbId || 'Unknown KB'}`);
    console.log('   ' + '─'.repeat(70));
    console.log(`   ${relevanceIcon} Relevance Score: ${kb.relevanceScore}/100`);
    console.log(`   ${typeIcon} Type: ${formatRecommendationType(kb.recommendationType)}`);
    console.log(`   🎯 Confidence: ${kb.confidence || 'N/A'}`);
    console.log(`   ✅ Relevant: ${kb.isRelevant ? 'Yes' : 'No'}`);
    
    if (kb.reasoning) {
      console.log(`\n   💡 Reasoning:`);
      const reasoningLines = wrapText(kb.reasoning, 65);
      reasoningLines.forEach(line => console.log(`      ${line}`));
    }

    if (kb.matchedAspects && kb.matchedAspects.length > 0) {
      console.log(`\n   ✓ Matched Aspects:`);
      kb.matchedAspects.forEach(aspect => console.log(`      • ${aspect}`));
    }

    if (kb.mismatchedAspects && kb.mismatchedAspects.length > 0) {
      console.log(`\n   ✗ Mismatched Aspects:`);
      kb.mismatchedAspects.forEach(aspect => console.log(`      • ${aspect}`));
    }
  });

  // Token usage if available
  if (result.usage) {
    console.log('\n' + '─'.repeat(80));
    console.log('📊 LLM USAGE');
    console.log('─'.repeat(80));
    console.log(`   Prompt Tokens:     ${result.usage.prompt_tokens || 'N/A'}`);
    console.log(`   Completion Tokens: ${result.usage.completion_tokens || 'N/A'}`);
    console.log(`   Total Tokens:      ${result.usage.total_tokens || 'N/A'}`);
  }

  console.log('\n' + '═'.repeat(80));
}

function getTypeIcon(type) {
  switch (type) {
    case 'exact_match': return '🎯';
    case 'partial_match': return '🔶';
    case 'related_topic': return '🔗';
    case 'not_relevant': return '❌';
    default: return '❓';
  }
}

function formatRecommendationType(type) {
  switch (type) {
    case 'exact_match': return 'Exact Match';
    case 'partial_match': return 'Partial Match';
    case 'related_topic': return 'Related Topic';
    case 'not_relevant': return 'Not Relevant';
    default: return type || 'Unknown';
  }
}

function wrapText(text, maxWidth) {
  if (!text) return [];
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';

  words.forEach(word => {
    if ((currentLine + ' ' + word).trim().length <= maxWidth) {
      currentLine = (currentLine + ' ' + word).trim();
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  });

  if (currentLine) lines.push(currentLine);
  return lines;
}

function printHelp() {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                      KB Relevance Testing Utility                              ║
╚═══════════════════════════════════════════════════════════════════════════════╝

DESCRIPTION:
  Tests whether Knowledge Base articles are relevant to a support case using
  LLM-based analysis. The script fetches case details, associated KB articles,
  and uses an LLM to evaluate relevance.

USAGE:
  node src/scripts/testKBRelevance.js <caseNumber> [options]

OPTIONS:
  --kb <ids>          Comma-separated KB article numbers to check
                      Example: --kb KB-12345,KB-67890
  
  --threshold <n>     Minimum relevance score (0-100, default: 40)
                      Only KBs with score >= threshold are shown
  
  --json              Output results in JSON format
  
  --output, -o <file> Save results to a JSON file
  
  --help, -h          Show this help message

EXAMPLES:
  # Check KB relevance using KB articles linked to the case
  node src/scripts/testKBRelevance.js 00475706
  
  # Check specific KB articles against a case
  node src/scripts/testKBRelevance.js 00475706 --kb KB-12345,KB-67890
  
  # Use higher threshold (only show very relevant KBs)
  node src/scripts/testKBRelevance.js 00475706 --threshold 70
  
  # Output as JSON
  node src/scripts/testKBRelevance.js 00475706 --json
  
  # Save results to file
  node src/scripts/testKBRelevance.js 00475706 -o ./output/relevance_result.json

ENVIRONMENT VARIABLES (in .env):
  LLM_API_URL         LLM API endpoint (required)
  LLM_API_KEY         LLM API key or token
  LLM_API_MODEL       Model name (default: gpt-4)
  
  PG_HOST             PostgreSQL host
  PG_PORT             PostgreSQL port (default: 5432)
  PG_DATABASE         Database name
  PG_USER             Database user
  PG_PASSWORD         Database password

RELEVANCE SCORE INTERPRETATION:
  🟢 80-100  Exact or near-exact match - Highly recommended
  🟡 60-79   Good match with minor differences
  🟠 40-59   Related but not directly applicable
  ⚪ 0-39    Not relevant (filtered by default)
`);
}

// Run the script
main().catch(console.error);

