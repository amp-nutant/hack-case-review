#!/usr/bin/env node

/**
 * CLI Script to fetch complete case details and save as JSON
 * 
 * Usage:
 *   node src/scripts/fetchCase.js <caseNumber> [outputFile]
 * 
 * Examples:
 *   node src/scripts/fetchCase.js 00475706
 *   node src/scripts/fetchCase.js 00475706 ./output/case_475706.json
 *   node src/scripts/fetchCase.js 475706 --stdout
 */

import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import fs from 'fs/promises';
import dotenv from 'dotenv';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../.env') });

import { getCaseDetails, searchCases } from '../services/caseQuery.service.js';
import { testConnection, closePool } from '../config/postgres.js';

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    printHelp();
    process.exit(0);
  }

  // Handle --list command to search cases
  if (args[0] === '--list' || args[0] === '-l') {
    await listCases(args.slice(1));
    return;
  }

  const caseNumber = args[0];
  const outputArg = args[1];
  const writeToStdout = outputArg === '--stdout' || outputArg === '-s';

  console.log(`\n🔍 Fetching case: ${caseNumber}\n`);

  try {
    // Test connection first
    const connected = await testConnection();
    if (!connected) {
      console.error('\n❌ Could not connect to PostgreSQL. Check your .env configuration.');
      process.exit(1);
    }

    console.log('\n📊 Querying case data...');
    const startTime = Date.now();
    
    const caseData = await getCaseDetails(caseNumber);
    
    const duration = Date.now() - startTime;
    console.log(`✅ Data fetched in ${duration}ms`);

    // Format JSON with pretty printing
    const jsonOutput = JSON.stringify(caseData, null, 2);

    if (writeToStdout) {
      console.log('\n' + '='.repeat(80));
      console.log(jsonOutput);
    } else {
      // Determine output file path
      const outputFile = outputArg || `./output/case_${caseNumber.replace(/^0+/, '')}.json`;
      const outputPath = resolve(process.cwd(), outputFile);
      
      // Ensure output directory exists
      const outputDir = dirname(outputPath);
      await fs.mkdir(outputDir, { recursive: true });
      
      // Write JSON file
      await fs.writeFile(outputPath, jsonOutput, 'utf-8');
      console.log(`\n📁 Output saved to: ${outputPath}`);
    }

    // Print summary
    printSummary(caseData);

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
║                        Case Query Utility                                      ║
╚═══════════════════════════════════════════════════════════════════════════════╝

USAGE:
  node src/scripts/fetchCase.js <caseNumber> [outputFile]
  node src/scripts/fetchCase.js <caseNumber> --stdout

COMMANDS:
  <caseNumber>              Fetch details for a specific case
  --list, -l                List cases (with optional filters)
  --help, -h                Show this help message

OPTIONS:
  --stdout, -s              Print JSON to stdout instead of file
  
EXAMPLES:
  # Fetch case and save to default output directory
  node src/scripts/fetchCase.js 00475706
  
  # Fetch case and save to specific file
  node src/scripts/fetchCase.js 00475706 ./my-output/case.json
  
  # Fetch case and print to stdout
  node src/scripts/fetchCase.js 00475706 --stdout
  
  # List recent closed cases
  node src/scripts/fetchCase.js --list --status Closed --limit 20

ENVIRONMENT VARIABLES (in .env):
  PG_HOST         PostgreSQL host
  PG_PORT         PostgreSQL port (default: 5432)
  PG_DATABASE     Database name
  PG_USER         Database user
  PG_PASSWORD     Database password
  PG_SCHEMA       Schema name (default: sfdc)
  PG_SSL          Enable SSL (true/false)
`);
}

async function listCases(args) {
  const options = parseListArgs(args);
  
  console.log('\n🔍 Searching cases...\n');
  
  try {
    const connected = await testConnection();
    if (!connected) {
      process.exit(1);
    }

    const cases = await searchCases(options);
    
    if (cases.length === 0) {
      console.log('No cases found matching criteria.');
      return;
    }

    console.log(`Found ${cases.length} cases:\n`);
    console.log('─'.repeat(100));
    console.log(
      'Case #'.padEnd(12) +
      'Status'.padEnd(12) +
      'Priority'.padEnd(15) +
      'Created'.padEnd(22) +
      'Subject'
    );
    console.log('─'.repeat(100));

    cases.forEach(c => {
      console.log(
        (c.casenumber || '').padEnd(12) +
        (c.status || '').padEnd(12) +
        (c.priority || '').padEnd(15) +
        (c.createddate ? new Date(c.createddate).toISOString().slice(0, 19) : '').padEnd(22) +
        (c.subject || '').substring(0, 50)
      );
    });

  } finally {
    await closePool();
  }
}

function parseListArgs(args) {
  const options = {
    limit: 10,
    offset: 0,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--status':
        options.status = args[++i];
        break;
      case '--priority':
        options.priority = args[++i];
        break;
      case '--product':
        options.product = args[++i];
        break;
      case '--limit':
        options.limit = parseInt(args[++i], 10);
        break;
      case '--from':
        options.dateFrom = args[++i];
        break;
      case '--to':
        options.dateTo = args[++i];
        break;
    }
  }

  return options;
}

function printSummary(caseData) {
  console.log('\n' + '═'.repeat(80));
  console.log('                           CASE SUMMARY');
  console.log('═'.repeat(80));
  
  console.log(`
📋 Case Number:    ${caseData.caseInfo.caseNumber}
📝 Subject:        ${caseData.caseInfo.subject || 'N/A'}
📊 Status:         ${caseData.caseInfo.status}
🔥 Priority:       ${caseData.caseInfo.priority}
📅 Created:        ${caseData.caseInfo.createdDate}
📅 Closed:         ${caseData.caseInfo.closedDate || 'N/A'}
⏱️  Case Age:       ${caseData.caseInfo.caseAgeDays || 'N/A'} days
👤 Owner:          ${caseData.ownership.currentOwner || 'N/A'}
🏢 Account:        ${caseData.customer.accountName || 'N/A'}
`);

  console.log('─'.repeat(80));
  console.log('🏷️  TAGS');
  console.log('─'.repeat(80));
  console.log(`   Open Tags:   ${caseData.tags.openTags.join(', ') || 'None'}`);
  console.log(`   Close Tags:  ${caseData.tags.closeTags.join(', ') || 'None'}`);

  if (caseData.escalation.isEscalated) {
    console.log('\n' + '─'.repeat(80));
    console.log('🚨 ESCALATION');
    console.log('─'.repeat(80));
    console.log(`   Status:      ${caseData.escalation.escalationStatus || 'N/A'}`);
    console.log(`   Temperature: ${caseData.escalation.escalationTemperature || 'N/A'}`);
    console.log(`   Reason:      ${caseData.escalation.portalEscalationReason || 'N/A'}`);
    console.log(`   Comments:    ${caseData.escalation.portalEscalationComments || 'N/A'}`);
  }

  console.log('\n' + '─'.repeat(80));
  console.log('✅ RESOLUTION');
  console.log('─'.repeat(80));
  const resolution = caseData.resolution.resolutionNotes || 'No resolution notes';
  console.log(`   ${resolution.substring(0, 200)}${resolution.length > 200 ? '...' : ''}`);

  console.log('\n' + '─'.repeat(80));
  console.log('📊 RESPONSE METRICS');
  console.log('─'.repeat(80));
  const metrics = caseData.responseMetrics;
  console.log(`   Avg Response Time:  ${metrics.avgResponseTimeHours ?? 'N/A'} hours`);
  console.log(`   Min Response Time:  ${metrics.minResponseTimeHours ?? 'N/A'} hours`);
  console.log(`   Max Response Time:  ${metrics.maxResponseTimeHours ?? 'N/A'} hours`);
  console.log(`   Total Responses:    ${metrics.totalResponses}`);
  console.log(`   Inbound Messages:   ${metrics.inboundCount}`);
  console.log(`   Outbound Messages:  ${metrics.outboundCount}`);

  console.log('\n' + '─'.repeat(80));
  console.log('💬 CONVERSATION');
  console.log('─'.repeat(80));
  console.log(`   Total Messages:  ${caseData.conversation.length}`);
  console.log(`   Comments:        ${caseData.metadata.totalComments}`);
  console.log(`   Emails:          ${caseData.metadata.totalEmails}`);
  console.log(`   Events:          ${caseData.metadata.totalEvents}`);

  console.log('\n' + '═'.repeat(80));
}

// Run the script
main().catch(console.error);
