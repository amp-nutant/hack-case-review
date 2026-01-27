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

    // Analyze the case with LLM (includes tag validation against predefined lists)
    console.log('\n🤖 Analyzing with LLM (including tag validation against predefined lists)...');
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

  // Tag Validation (LLM Analysis with Predefined Lists)
  const tv = a.tagValidation;
  console.log('\n🏷️  TAG VALIDATION (LLM Analysis vs Predefined Lists)');
  console.log('─'.repeat(80));
  if (tv) {
    // Open Tags
    console.log(`   OPEN TAGS: Score ${tv.openTags?.score || 'N/A'}/10`);
    console.log(`     Applied:     ${tv.openTags?.appliedTags?.join(', ') || 'None'}`);
    console.log(`     Recommended: ${tv.openTags?.recommendedTags?.join(', ') || 'N/A'}`);
    console.log(`     Correct:     ${tv.openTags?.correctlyApplied?.join(', ') || 'None'}`);
    if (tv.openTags?.missingTags?.length > 0) {
      console.log(`     Missing:     ${Array.isArray(tv.openTags.missingTags) ? tv.openTags.missingTags.join(', ') : tv.openTags.missingTags}`);
    }
    if (tv.openTags?.incorrectlyApplied?.length > 0) {
      console.log(`     Incorrect:   ${Array.isArray(tv.openTags.incorrectlyApplied) ? tv.openTags.incorrectlyApplied.join(', ') : tv.openTags.incorrectlyApplied}`);
    }
    console.log(`     Explanation: ${tv.openTags?.explanation || 'N/A'}`);
    
    // Close Tags
    console.log(`\n   CLOSE TAGS: Score ${tv.closeTags?.score || 'N/A'}/10`);
    console.log(`     Applied:     ${tv.closeTags?.appliedTags?.join(', ') || 'None'}`);
    console.log(`     Recommended: ${tv.closeTags?.recommendedTags?.join(', ') || 'N/A'}`);
    console.log(`     Correct:     ${tv.closeTags?.correctlyApplied?.join(', ') || 'None'}`);
    if (tv.closeTags?.missingTags?.length > 0) {
      console.log(`     Missing:     ${Array.isArray(tv.closeTags.missingTags) ? tv.closeTags.missingTags.join(', ') : tv.closeTags.missingTags}`);
    }
    if (tv.closeTags?.incorrectlyApplied?.length > 0) {
      console.log(`     Incorrect:   ${Array.isArray(tv.closeTags.incorrectlyApplied) ? tv.closeTags.incorrectlyApplied.join(', ') : tv.closeTags.incorrectlyApplied}`);
    }
    console.log(`     Explanation: ${tv.closeTags?.explanation || 'N/A'}`);
    
    // Overall
    console.log(`\n   OVERALL TAG SCORE: ${tv.overallScore || 'N/A'}/10`);
    console.log(`   ${tv.overallExplanation || ''}`);
  } else {
    console.log(`   No tag validation data available`);
  }

  // Issue Classification
  console.log('\n🔍 ISSUE CLASSIFICATION');
  console.log('─'.repeat(80));
  const ic = a.issueClassification || {};
  
  const bugInfo = ic.isBug || {};
  console.log(`   Is Bug:              ${bugInfo.verdict ?? 'N/A'} (${bugInfo.confidence || 'N/A'} confidence)`);
  if (bugInfo.verdict === true) {
    console.log(`     → Bug Type: ${bugInfo.bugType || 'N/A'}`);
    console.log(`     → Evidence: ${bugInfo.evidence || 'N/A'}`);
  }
  
  const configInfo = ic.isConfigurationIssue || {};
  console.log(`   Is Configuration:    ${configInfo.verdict ?? 'N/A'} (${configInfo.confidence || 'N/A'} confidence)`);
  if (configInfo.verdict === true) {
    console.log(`     → Config Type: ${configInfo.configurationType || 'N/A'}`);
  }
  
  const customerErr = ic.isCustomerError || {};
  console.log(`   Is Customer Error:   ${customerErr.verdict ?? 'N/A'} (${customerErr.confidence || 'N/A'} confidence)`);
  if (customerErr.verdict === true) {
    console.log(`     → Error Type: ${customerErr.errorType || 'N/A'}`);
    console.log(`     → Description: ${customerErr.description || 'N/A'}`);
  }
  
  const nonNtnx = ic.isNonNutanixIssue || {};
  console.log(`   Is Non-Nutanix:      ${nonNtnx.verdict ?? 'N/A'} (${nonNtnx.confidence || 'N/A'} confidence)`);
  if (nonNtnx.verdict === true) {
    console.log(`     → Actual Source: ${nonNtnx.actualSource || 'N/A'}`);
    console.log(`     → Description: ${nonNtnx.description || 'N/A'}`);
  }

  // Resolution Analysis
  console.log('\n✅ RESOLUTION ANALYSIS');
  console.log('─'.repeat(80));
  const ra = a.resolutionAnalysis || {};
  console.log(`   Resolution Method:   ${ra.resolutionMethod || 'N/A'}`);
  console.log(`   Resolved By:         ${ra.resolvedBy?.who || 'N/A'} (${ra.resolvedBy?.confidence || 'N/A'} confidence)`);
  console.log(`   Self-Resolved:       ${ra.wasSelfResolved?.verdict ?? 'N/A'}`);
  if (ra.wasSelfResolved?.verdict === true) {
    console.log(`     → Evidence: ${ra.wasSelfResolved?.evidence || 'N/A'}`);
  }
  console.log(`   Support Contribution: ${ra.supportContribution?.level || 'N/A'}`);
  console.log(`   Resolution Quality:  ${ra.resolutionQuality?.score || 'N/A'}/10`);
  console.log(`     → Permanent Fix: ${ra.resolutionQuality?.isPermanentFix ?? 'N/A'}`);
  console.log(`     → Is Workaround: ${ra.resolutionQuality?.isWorkaround ?? 'N/A'}`);
  console.log(`     → Will Recur: ${ra.resolutionQuality?.willRecur || 'N/A'}`);

  // RCA Assessment
  console.log('\n🔬 RCA ASSESSMENT');
  console.log('─'.repeat(80));
  const rca = a.rcaAssessment || {};
  console.log(`   RCA Performed:       ${rca.rcaPerformed ?? 'N/A'}`);
  console.log(`   RCA Quality:         ${rca.rcaQuality?.score || 'N/A'}/10 - ${rca.rcaQuality?.verdict || 'N/A'}`);
  console.log(`   RCA Conclusive:      ${rca.rcaConclusive?.verdict ?? 'N/A'}`);
  if (rca.rcaConclusive?.evidence) {
    console.log(`     → Evidence: ${rca.rcaConclusive.evidence}`);
  }
  console.log(`   RCA Actionable:      ${rca.rcaActionable?.verdict ?? 'N/A'}`);
  if (rca.rcaActionable?.actionsIdentified?.length > 0) {
    console.log(`     → Actions Identified: ${rca.rcaActionable.actionsIdentified.join('; ')}`);
  }
  if (rca.rcaActionable?.missingActions?.length > 0) {
    console.log(`     → Missing Actions: ${rca.rcaActionable.missingActions.join('; ')}`);
  }
  if (rca.rcaGaps?.length > 0) {
    console.log(`   RCA Gaps:            ${rca.rcaGaps.join('; ')}`);
  }

  // Classification Tags
  console.log('\n🏷️  DERIVED CLASSIFICATION');
  console.log('─'.repeat(80));
  console.log(`   Problem Categories:  ${a.tags?.problemCategory?.join(', ') || 'N/A'}`);
  console.log(`   Product Areas:       ${a.tags?.productArea?.join(', ') || 'N/A'}`);
  console.log(`   Complexity:          ${a.tags?.technicalComplexity || 'N/A'}`);
  console.log(`   Issue Type:          ${a.tags?.issueType || 'N/A'}`);
  console.log(`   Resolution Type:     ${a.tags?.resolutionType || 'N/A'}`);
  console.log(`   Fault Attribution:   ${a.tags?.faultAttribution || 'N/A'}`);

  // Quality Scores
  console.log('\n⭐ QUALITY SCORES');
  console.log('─'.repeat(80));
  const qa = a.qualityAssessment || {};
  console.log(`   Resolution Quality:    ${qa.resolutionQuality?.score || 'N/A'}/10`);
  console.log(`   Response Timeliness:   ${qa.responseTimeliness?.score || 'N/A'}/10`);
  console.log(`   Communication Quality: ${qa.communicationQuality?.score || 'N/A'}/10`);
  console.log(`   Technical Accuracy:    ${qa.technicalAccuracy?.score || 'N/A'}/10`);
  console.log(`   Overall Handling:      ${qa.overallHandling?.score || 'N/A'}/10`);

  // Sentiment
  console.log('\n💭 SENTIMENT');
  console.log('─'.repeat(80));
  const cs = a.sentimentAnalysis?.customerSentiment || {};
  const ss = a.sentimentAnalysis?.supportSentiment || {};
  console.log(`   Customer: ${cs.overall || 'N/A'} | Frustration: ${cs.frustrationLevel || 'N/A'} | Trajectory: ${cs.trajectory || 'N/A'}`);
  console.log(`   Support:  Tone: ${ss.tone || 'N/A'} | Empathy: ${ss.empathy || 'N/A'} | Proactive: ${ss.proactiveness || 'N/A'}`);

  // Clustering Features
  console.log('\n🔗 CLUSTERING FEATURES');
  console.log('─'.repeat(80));
  const cf = a.clusteringFeatures || {};
  console.log(`   Primary Topic:       ${cf.primaryTopic || 'N/A'}`);
  console.log(`   Secondary Topics:    ${cf.secondaryTopics?.join(', ') || 'N/A'}`);
  console.log(`   Keywords:            ${cf.keywords?.join(', ') || 'N/A'}`);

  // Actionable Insights
  console.log('\n🎯 ACTIONABLE INSIGHTS');
  console.log('─'.repeat(80));
  const ai = a.actionableInsights || {};
  if (ai.knowledgeBaseGaps?.length > 0) {
    console.log(`   KB Gaps:             ${ai.knowledgeBaseGaps.join('; ')}`);
  }
  if (ai.processImprovements?.length > 0) {
    console.log(`   Process Improvements: ${ai.processImprovements.join('; ')}`);
  }
  if (ai.preventionRecommendations?.length > 0) {
    console.log(`   Prevention:          ${ai.preventionRecommendations.join('; ')}`);
  }

  // Metadata
  console.log('\n📊 ANALYSIS METADATA');
  console.log('─'.repeat(80));
  console.log(`   Confidence Score:    ${a.metadata?.confidenceScore || 'N/A'}`);
  console.log(`   Requires Human Review: ${a.metadata?.requiresHumanReview ?? 'N/A'}`);
  if (a.metadata?.reviewReasons?.length > 0) {
    console.log(`   Review Reasons:      ${a.metadata.reviewReasons.join('; ')}`);
  }
  console.log(`   Analysis Timestamp:  ${result.analysisTimestamp}`);

  console.log('\n' + '═'.repeat(80));
  console.log('\n📄 Full analysis saved to JSON file\n');
}

main().catch(console.error);
