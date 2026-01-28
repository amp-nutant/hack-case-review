#!/usr/bin/env node

/**
 * Import Cases Script
 * 
 * Reads case numbers from a text file, fetches details from PostgreSQL,
 * and inserts them into MongoDB.
 * 
 * Usage:
 *   node importCases.js <casesFile>
 *   node importCases.js cases.txt
 *   node importCases.js cases.txt --force   # Re-import even if exists
 */

import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs/promises';
import mongoose from 'mongoose';
import { getCaseDetails } from './src/services/caseQuery.service.js';
import { testConnection, closePool } from './src/config/postgres.js';
import ImportedCase from './src/models/ImportedCase.model.js';
import config from './src/config/index.js';

const CONCURRENCY_LIMIT = 5; // Process 5 cases at a time

async function connectMongoDB() {
  try {
    await mongoose.connect(config.mongoUri, {
      autoIndex: true,
    });
    console.log(`📦 MongoDB connected: ${mongoose.connection.host}`);
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    return false;
  }
}

async function disconnectMongoDB() {
  await mongoose.connection.close();
  console.log('MongoDB connection closed');
}

async function readCaseNumbers(filePath) {
  const content = await fs.readFile(filePath, 'utf-8');
  const lines = content.split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#')); // Skip empty lines and comments
  return lines;
}

async function processCaseBatch(caseNumbers, forceReimport) {
  const results = {
    imported: [],
    skipped: [],
    failed: [],
  };

  for (let i = 0; i < caseNumbers.length; i += CONCURRENCY_LIMIT) {
    const batch = caseNumbers.slice(i, i + CONCURRENCY_LIMIT);
    
    const batchPromises = batch.map(async (caseNumber) => {
      const progressIndex = i + batch.indexOf(caseNumber) + 1;
      
      try {
        // Check if already exists in MongoDB
        if (!forceReimport) {
          const existing = await ImportedCase.findOne({ caseNumber: caseNumber });
          if (existing) {
            console.log(`⏭️  [${progressIndex}/${caseNumbers.length}] Skipping ${caseNumber} - already in MongoDB`);
            results.skipped.push({ caseNumber, reason: 'already exists' });
            return;
          }
        }

        console.log(`📊 [${progressIndex}/${caseNumbers.length}] Fetching case: ${caseNumber}`);
        
        // Fetch case data from PostgreSQL
        const caseData = await getCaseDetails(caseNumber);
        
        if (!caseData || !caseData.caseInfo) {
          console.error(`❌ [${progressIndex}/${caseNumbers.length}] No data found for: ${caseNumber}`);
          results.failed.push({ caseNumber, error: 'No data returned from PostgreSQL' });
          return;
        }

        // Upsert into MongoDB
        await ImportedCase.findOneAndUpdate(
          { caseNumber: caseNumber },
          {
            caseNumber: caseNumber,
            caseInfo: caseData.caseInfo,
            customer: caseData.customer,
            ownership: caseData.ownership,
            tags: caseData.tags,
            resolution: caseData.resolution,
            escalation: caseData.escalation,
            responseMetrics: caseData.responseMetrics,
            timeline: caseData.timeline,
            conversation: caseData.conversation,
            importedAt: new Date(),
            source: 'postgresql',
          },
          { upsert: true, new: true }
        );
        
        console.log(`✅ [${progressIndex}/${caseNumbers.length}] Imported: ${caseNumber}`);
        results.imported.push({ caseNumber });
      } catch (error) {
        console.error(`❌ [${progressIndex}/${caseNumbers.length}] Failed: ${caseNumber} - ${error.message}`);
        results.failed.push({ caseNumber, error: error.message });
      }
    });

    await Promise.all(batchPromises);
  }

  return results;
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    printHelp();
    process.exit(0);
  }

  const casesFilePath = args[0];
  const forceReimport = args.includes('--force') || args.includes('-f');
  
  console.log('\n' + '═'.repeat(80));
  console.log('                    CASE IMPORT TO MONGODB');
  console.log('═'.repeat(80));

  try {
    // Read case numbers
    console.log(`\n📄 Reading case numbers from: ${casesFilePath}`);
    const caseNumbers = await readCaseNumbers(casesFilePath);
    console.log(`   Found ${caseNumbers.length} case(s) to process\n`);

    if (caseNumbers.length === 0) {
      console.log('No cases to import.');
      process.exit(0);
    }

    // Connect to PostgreSQL
    console.log('🔌 Connecting to PostgreSQL...');
    const pgConnected = await testConnection();
    if (!pgConnected) {
      console.error('\n❌ Cannot connect to PostgreSQL. Check .env configuration.');
      process.exit(1);
    }
    console.log('✅ PostgreSQL connected\n');

    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    const mongoConnected = await connectMongoDB();
    if (!mongoConnected) {
      console.error('\n❌ Cannot connect to MongoDB. Check .env configuration.');
      await closePool();
      process.exit(1);
    }

    // Process cases
    const startTime = Date.now();
    const results = await processCaseBatch(caseNumbers, forceReimport);
    const duration = Date.now() - startTime;

    // Print summary
    console.log('\n' + '═'.repeat(80));
    console.log('                         IMPORT SUMMARY');
    console.log('═'.repeat(80));
    console.log(`\n   Total Cases:     ${caseNumbers.length}`);
    console.log(`   ✅ Imported:     ${results.imported.length}`);
    console.log(`   ⏭️  Skipped:      ${results.skipped.length} (already in MongoDB)`);
    console.log(`   ❌ Failed:       ${results.failed.length}`);
    console.log(`   ⏱️  Duration:     ${(duration / 1000).toFixed(1)}s`);
    
    if (results.failed.length > 0) {
      console.log('\n   Failed cases:');
      results.failed.forEach(f => console.log(`     - ${f.caseNumber}: ${f.error}`));
    }

    // Show MongoDB collection stats
    const totalInMongo = await ImportedCase.countDocuments();
    console.log(`\n   📊 Total cases in MongoDB: ${totalInMongo}`);

    console.log('\n' + '═'.repeat(80) + '\n');

  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    if (process.env.NODE_ENV === 'development') {
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    await closePool();
    await disconnectMongoDB();
  }
}

function printHelp() {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                      Case Import to MongoDB                                    ║
╚═══════════════════════════════════════════════════════════════════════════════╝

USAGE:
  node importCases.js <casesFile> [options]

OPTIONS:
  -f, --force     Force re-import even if case already exists in MongoDB
  -h, --help      Show this help message

INPUT FILE FORMAT (one case number per line):
  # This is a comment
  02010256
  02010258
  00475706

ENVIRONMENT VARIABLES REQUIRED:
  PG_*          PostgreSQL connection settings
  MONGODB_URI   MongoDB connection string (default: mongodb://localhost:27017/case-review)

EXAMPLE:
  node importCases.js cases.txt
  node importCases.js cases.txt --force

WHAT IT DOES:
  1. Reads case numbers from the input file
  2. Fetches full case details from PostgreSQL
  3. Inserts/updates cases in MongoDB (ImportedCase collection)
`);
}

main().catch(console.error);
