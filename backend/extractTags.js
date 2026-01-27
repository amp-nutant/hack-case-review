#!/usr/bin/env node

/**
 * Extract unique open and close tags from the database
 * 
 * Usage: node extractTags.js
 * 
 * This will query the database for all unique tags and save them to src/data/tags.json
 */

import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs/promises';
import path from 'path';
import { query, testConnection, closePool } from './src/config/postgres.js';

async function extractTags() {
  console.log('\n🔍 Extracting tags from database...\n');

  try {
    const connected = await testConnection();
    if (!connected) {
      console.error('❌ Cannot connect to PostgreSQL');
      process.exit(1);
    }

    // Extract open tags from mapping table
    console.log('📥 Fetching open tags from datascience.close_tag_open_tag_mapping...');
    const openTagsResult = await query(`
      SELECT DISTINCT c."Related_Open_Tag_Name__c" AS opentag 
      FROM datascience.close_tag_open_tag_mapping c
      WHERE c."Related_Open_Tag_Name__c" IS NOT NULL 
        AND c."Related_Open_Tag_Name__c" != ''
      ORDER BY opentag
    `);

    // Extract close tags from mapping table
    console.log('📥 Fetching close tags from datascience.close_tag_open_tag_mapping...');
    const closeTagsResult = await query(`
      SELECT DISTINCT c."Name" AS closetag 
      FROM datascience.close_tag_open_tag_mapping c
      WHERE c."Name" IS NOT NULL 
        AND c."Name" != ''
      ORDER BY closetag
    `);

    // Process tags (already distinct from query)
    const openTags = openTagsResult.rows
      .map(row => row.opentag?.trim())
      .filter(tag => tag);

    const closeTags = closeTagsResult.rows
      .map(row => row.closetag?.trim())
      .filter(tag => tag);

    console.log(`\n✅ Found ${openTags.length} unique open tags`);
    console.log(`✅ Found ${closeTags.length} unique close tags`);

    // Save to tags.json
    const tagsData = {
      openTags,
      closeTags,
      _metadata: {
        extractedAt: new Date().toISOString(),
        openTagsCount: openTags.length,
        closeTagsCount: closeTags.length,
        source: 'datascience.close_tag_open_tag_mapping'
      }
    };

    const outputPath = path.join(process.cwd(), 'src/data/tags.json');
    await fs.writeFile(outputPath, JSON.stringify(tagsData, null, 2), 'utf-8');
    console.log(`\n📁 Tags saved to: ${outputPath}`);

    // Print sample
    console.log('\n📋 Sample Open Tags (first 10):');
    openTags.slice(0, 10).forEach(tag => console.log(`   - ${tag}`));
    
    console.log('\n📋 Sample Close Tags (first 10):');
    closeTags.slice(0, 10).forEach(tag => console.log(`   - ${tag}`));

    console.log('\n✅ Done! You can now run: node analyze.js <caseNumber>\n');

  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    process.exit(1);
  } finally {
    await closePool();
  }
}

extractTags().catch(console.error);
