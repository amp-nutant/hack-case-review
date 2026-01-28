#!/usr/bin/env node

/**
 * Batch Case Analysis Script
 * 
 * Reads case numbers from a text file and processes all of them.
 * Generates individual analysis files and an aggregated summary.
 * 
 * Usage:
 *   node batchAnalyze.js <casesFile>
 *   node batchAnalyze.js cases.txt
 * 
 * Input file format (one case number per line):
 *   02010256
 *   02010258
 *   00475706
 */

import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs/promises';
import path from 'path';
import { getCaseDetails } from './src/services/caseQuery.service.js';
import { analyzeCase } from './src/services/caseAnalysis.service.js';
import { aggregateAnalyses } from './src/services/aggregation.service.js';
import { testConnection, closePool } from './src/config/postgres.js';

const CONCURRENCY_LIMIT = 3; // Process 3 cases at a time

async function readCaseNumbers(filePath) {
  const content = await fs.readFile(filePath, 'utf-8');
  const lines = content.split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#')); // Skip empty lines and comments
  return lines;
}

async function processCaseBatch(caseNumbers, outputDir, existingAnalyses) {
  const results = {
    successful: [],
    failed: [],
    skipped: [],
  };

  for (let i = 0; i < caseNumbers.length; i += CONCURRENCY_LIMIT) {
    const batch = caseNumbers.slice(i, i + CONCURRENCY_LIMIT);
    
    const batchPromises = batch.map(async (caseNumber) => {
      const normalizedNumber = caseNumber.replace(/^0+/, '');
      const analysisFile = path.join(outputDir, `analysis_${normalizedNumber}.json`);
      
      // Check if analysis already exists
      try {
        await fs.access(analysisFile);
        console.log(`⏭️  Skipping ${caseNumber} - analysis already exists`);
        const existingAnalysis = JSON.parse(await fs.readFile(analysisFile, 'utf-8'));
        results.skipped.push({ caseNumber, analysis: existingAnalysis });
        return;
      } catch {
        // File doesn't exist, proceed with analysis
      }

      try {
        console.log(`\n📊 [${i + batch.indexOf(caseNumber) + 1}/${caseNumbers.length}] Processing case: ${caseNumber}`);
        
        // Fetch case data
        const caseData = await getCaseDetails(caseNumber);
        
        // Save case data
        const caseFile = path.join(outputDir, `case_${normalizedNumber}.json`);
        await fs.writeFile(caseFile, JSON.stringify(caseData, null, 2), 'utf-8');
        
        // Analyze with LLM
        const analysis = await analyzeCase(caseData);
        
        // Save analysis
        await fs.writeFile(analysisFile, JSON.stringify(analysis, null, 2), 'utf-8');
        
        console.log(`✅ Completed: ${caseNumber}`);
        results.successful.push({ caseNumber, analysis });
      } catch (error) {
        console.error(`❌ Failed: ${caseNumber} - ${error.message}`);
        results.failed.push({ caseNumber, error: error.message });
      }
    });

    await Promise.all(batchPromises);
  }

  return results;
}

async function loadExistingAnalyses(outputDir) {
  const analyses = [];
  try {
    const files = await fs.readdir(outputDir);
    const analysisFiles = files.filter(f => f.startsWith('analysis_') && f.endsWith('.json'));
    
    for (const file of analysisFiles) {
      try {
        const content = await fs.readFile(path.join(outputDir, file), 'utf-8');
        analyses.push(JSON.parse(content));
      } catch (e) {
        console.warn(`Warning: Could not read ${file}`);
      }
    }
  } catch {
    // Directory doesn't exist yet
  }
  return analyses;
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    printHelp();
    process.exit(0);
  }

  const casesFilePath = args[0];
  const forceReanalyze = args.includes('--force') || args.includes('-f');
  
  console.log('\n' + '═'.repeat(80));
  console.log('                    BATCH CASE ANALYSIS');
  console.log('═'.repeat(80));

  try {
    // Read case numbers
    console.log(`\n📄 Reading case numbers from: ${casesFilePath}`);
    const caseNumbers = await readCaseNumbers(casesFilePath);
    console.log(`   Found ${caseNumbers.length} case(s) to process\n`);

    if (caseNumbers.length === 0) {
      console.log('No cases to process.');
      process.exit(0);
    }

    // Test database connection
    const connected = await testConnection();
    if (!connected) {
      console.error('\n❌ Cannot connect to PostgreSQL. Check .env configuration.');
      process.exit(1);
    }

    // Setup output directory
    const outputDir = path.join(process.cwd(), 'output');
    await fs.mkdir(outputDir, { recursive: true });

    // Process cases
    const startTime = Date.now();
    const existingAnalyses = forceReanalyze ? [] : await loadExistingAnalyses(outputDir);
    const results = await processCaseBatch(caseNumbers, outputDir, existingAnalyses);
    const duration = Date.now() - startTime;

    // Combine all analyses for aggregation
    const allAnalyses = [
      ...results.successful.map(r => r.analysis),
      ...results.skipped.map(r => r.analysis),
    ];

    // Generate aggregated summary
    if (allAnalyses.length > 0) {
      console.log('\n📈 Generating aggregated summary...');
      const aggregated = aggregateAnalyses(allAnalyses);
      
      const summaryFile = path.join(outputDir, 'aggregated_summary.json');
      await fs.writeFile(summaryFile, JSON.stringify(aggregated, null, 2), 'utf-8');
      console.log(`📁 Aggregated summary saved to: ${summaryFile}`);
    }

    // Print summary
    console.log('\n' + '═'.repeat(80));
    console.log('                         BATCH SUMMARY');
    console.log('═'.repeat(80));
    console.log(`\n   Total Cases:     ${caseNumbers.length}`);
    console.log(`   ✅ Successful:   ${results.successful.length}`);
    console.log(`   ⏭️  Skipped:      ${results.skipped.length} (already analyzed)`);
    console.log(`   ❌ Failed:       ${results.failed.length}`);
    console.log(`   ⏱️  Duration:     ${(duration / 1000).toFixed(1)}s`);
    
    if (results.failed.length > 0) {
      console.log('\n   Failed cases:');
      results.failed.forEach(f => console.log(`     - ${f.caseNumber}: ${f.error}`));
    }

    console.log('\n' + '═'.repeat(80) + '\n');

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

function printHelp() {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                      Batch Case Analysis Utility                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝

USAGE:
  node batchAnalyze.js <casesFile> [options]

OPTIONS:
  -f, --force     Force re-analyze even if analysis exists
  -h, --help      Show this help message

INPUT FILE FORMAT (one case number per line):
  # This is a comment
  02010256
  02010258
  00475706

OUTPUT:
  - Individual case data:    output/case_<number>.json
  - Individual analysis:     output/analysis_<number>.json
  - Aggregated summary:      output/aggregated_summary.json

EXAMPLE:
  echo "02010256" > cases.txt
  echo "02010258" >> cases.txt
  node batchAnalyze.js cases.txt
`);
}

main().catch(console.error);
