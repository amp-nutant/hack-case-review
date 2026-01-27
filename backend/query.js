#!/usr/bin/env node

/**
 * Simple CLI to fetch case details
 * 
 * Usage: node query.js <caseNumber>
 * Example: node query.js 00475706
 */

import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs/promises';
import path from 'path';
import { getCaseDetails } from './src/services/caseQuery.service.js';
import { testConnection, closePool } from './src/config/postgres.js';

const caseNumber = process.argv[2];

if (!caseNumber) {
  console.log('Usage: node query.js <caseNumber>');
  console.log('Example: node query.js 00475706');
  process.exit(1);
}

async function main() {
  console.log(`\n🔍 Fetching case: ${caseNumber}\n`);

  try {
    // Test connection
    const connected = await testConnection();
    if (!connected) {
      console.error('\n❌ Cannot connect to PostgreSQL. Check .env configuration:');
      console.error('   PG_HOST, PG_PORT, PG_DATABASE, PG_USER, PG_PASSWORD, PG_SCHEMA');
      process.exit(1);
    }

    console.log('\n📊 Querying case data...\n');
    const startTime = Date.now();
    
    const caseData = await getCaseDetails(caseNumber);
    
    const duration = Date.now() - startTime;
    console.log(`✅ Data fetched in ${duration}ms`);

    // Create output directory if needed
    const outputDir = path.join(process.cwd(), 'output');
    await fs.mkdir(outputDir, { recursive: true });

    // Write JSON file
    const shortCaseNum = caseNumber.replace(/^0+/, '');
    const outputFile = path.join(outputDir, `case_${shortCaseNum}.json`);
    await fs.writeFile(outputFile, JSON.stringify(caseData, null, 2), 'utf-8');
    
    console.log(`\n📁 Output saved to: ${outputFile}`);

    // Print summary
    printSummary(caseData);

  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    process.exit(1);
  } finally {
    await closePool();
  }
}

function printSummary(data) {
  const c = data.caseInfo;
  const m = data.responseMetrics;
  const t = data.tags;
  const e = data.escalation;
  const r = data.resolution;

  console.log('\n' + '═'.repeat(80));
  console.log('                              CASE SUMMARY');
  console.log('═'.repeat(80));

  console.log(`
📋 Case:          ${c.caseNumber} - ${c.subject || 'N/A'}
📊 Status:        ${c.status} | Priority: ${c.priority}
📅 Created:       ${c.createdDate}
📅 Closed:        ${c.closedDate || 'N/A'}
⏱️  Age:           ${c.caseAgeDays || 'N/A'} days
👤 Owner:         ${data.ownership.currentOwner || 'N/A'}
🏢 Customer:      ${data.customer.accountName || 'N/A'} (${data.customer.contactEmail || 'N/A'})
🔧 Product:       ${c.product || 'N/A'} | Version: ${c.nosVersion || 'N/A'}
`);

  console.log('─'.repeat(80));
  console.log('🏷️  TAGS');
  console.log('─'.repeat(80));
  console.log(`   Open Tags:   ${t.openTags.length > 0 ? t.openTags.join(', ') : 'None'}`);
  console.log(`   Close Tags:  ${t.closeTags.length > 0 ? t.closeTags.join(', ') : 'None'}`);

  if (e.isEscalated) {
    console.log('\n' + '─'.repeat(80));
    console.log('🚨 ESCALATION');
    console.log('─'.repeat(80));
    console.log(`   Escalated:     Yes`);
    console.log(`   Date:          ${e.escalatedDate || 'N/A'}`);
    console.log(`   Status:        ${e.escalationStatus || 'N/A'}`);
    console.log(`   Temperature:   ${e.escalationTemperature || 'N/A'}`);
    if (e.portalEscalationReason) {
      console.log(`   Reason:        ${e.portalEscalationReason}`);
    }
    if (e.portalEscalationComments) {
      console.log(`   Comments:      ${e.portalEscalationComments.substring(0, 200)}`);
    }
  }

  console.log('\n' + '─'.repeat(80));
  console.log('✅ RESOLUTION');
  console.log('─'.repeat(80));
  if (r.resolutionNotes) {
    const notes = r.resolutionNotes.replace(/\n/g, '\n   ');
    console.log(`   ${notes.substring(0, 500)}${notes.length > 500 ? '...' : ''}`);
  } else {
    console.log('   No resolution notes recorded');
  }

  console.log('\n' + '─'.repeat(80));
  console.log('📊 RESPONSE METRICS (Customer Messages)');
  console.log('─'.repeat(80));
  console.log(`   Avg Response Time:     ${m.avgResponseTimeHours ?? 'N/A'} hours`);
  console.log(`   Median Response Time:  ${m.medianResponseTimeHours ?? 'N/A'} hours`);
  console.log(`   Min Response Time:     ${m.minResponseTimeHours ?? 'N/A'} hours`);
  console.log(`   Max Response Time:     ${m.maxResponseTimeHours ?? 'N/A'} hours`);
  console.log(`   Customer Messages:     ${m.totalCustomerMessages}`);
  console.log(`   Support Responses:     ${m.totalSupportResponses}`);

  console.log('\n' + '─'.repeat(80));
  console.log('💬 CONVERSATION FLOW');
  console.log('─'.repeat(80));
  console.log(`   Total Messages:        ${data.conversation.length}`);
  console.log(`   External Emails:       ${data.metadata.externalEmails}`);
  console.log(`   External Comments:     ${data.metadata.externalComments}`);
  console.log(`   Timeline Events:       ${data.metadata.totalEvents}`);
  console.log(`   (Filtered Internal:    ${data.metadata.filteredInternalEmails} emails, ${data.metadata.filteredInternalComments} comments)`);

  // Show conversation preview
  if (data.conversation.length > 0) {
    console.log('\n   📨 Conversation Preview (first 5 messages):');
    data.conversation.slice(0, 5).forEach((msg, i) => {
      const dir = msg.isCustomer ? '← CUSTOMER' : '→ SUPPORT';
      const time = new Date(msg.timestamp).toISOString().slice(0, 16).replace('T', ' ');
      const preview = (msg.contentPreview || msg.content || '').substring(0, 80).replace(/\n/g, ' ');
      console.log(`   ${i + 1}. [${time}] ${dir}: ${preview}...`);
    });
  }

  // Show timeline events summary
  const timeline = data.timeline.categorized;
  console.log('\n' + '─'.repeat(80));
  console.log('📅 TIMELINE EVENTS');
  console.log('─'.repeat(80));
  console.log(`   Lifecycle:     ${timeline.lifecycle.length} (${timeline.lifecycle.map(e => e.type).join(', ') || 'none'})`);
  console.log(`   Ownership:     ${timeline.ownership.length} changes`);
  console.log(`   Escalation:    ${timeline.escalation.length} events`);
  console.log(`   Automation:    ${timeline.automation.length} events`);

  console.log('\n' + '═'.repeat(80));
  console.log(`\n📄 Full details saved to JSON file\n`);
}

main().catch(console.error);
