/**
 * Script to import JSON data into MongoDB
 * 
 * Usage: npm run import-data
 *        or: node src/scripts/importData.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths to JSON files
const CASE_DETAILS_PATH = path.join(__dirname, '../../input/case-details.json');
const CASE_CLUSTER_PATH = path.join(__dirname, '../../input/case-cluster.json');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/case-review';

// Define schemas (flexible - accepts any fields)
const caseDetailsSchema = new mongoose.Schema({}, { strict: false });
const clusteredCasesSchema = new mongoose.Schema({}, { strict: false });

// Create models
const CaseDetails = mongoose.model('case-details', caseDetailsSchema, 'case-details');
const ClusteredCases = mongoose.model('clustered_cases', clusteredCasesSchema, 'clustered_cases');

/**
 * Convert MongoDB Extended JSON format to native types
 * Handles $oid, $date, etc.
 */
function convertExtendedJSON(obj) {
  if (obj === null || obj === undefined) return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(item => convertExtendedJSON(item));
  }
  
  if (typeof obj === 'object') {
    // Handle $oid - convert to new ObjectId
    if (obj.$oid) {
      return new mongoose.Types.ObjectId(obj.$oid);
    }
    
    // Handle $date - convert to Date
    if (obj.$date) {
      return new Date(obj.$date);
    }
    
    // Recursively process nested objects
    const converted = {};
    for (const [key, value] of Object.entries(obj)) {
      converted[key] = convertExtendedJSON(value);
    }
    return converted;
  }
  
  return obj;
}

async function importData() {
  console.log('🚀 Starting data import...\n');
  
  try {
    // Connect to MongoDB
    console.log(`📦 Connecting to MongoDB: ${MONGODB_URI}`);
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Import case details
    if (fs.existsSync(CASE_DETAILS_PATH)) {
      console.log('📄 Reading case-details.json...');
      const caseDetailsRaw = fs.readFileSync(CASE_DETAILS_PATH, 'utf-8');
      const caseDetailsDataRaw = JSON.parse(caseDetailsRaw);
      
      // Convert MongoDB Extended JSON to native types
      console.log('   Converting Extended JSON format...');
      const caseDetailsData = convertExtendedJSON(caseDetailsDataRaw);
      
      console.log(`   Found ${caseDetailsData.length} cases`);
      
      // Clear existing data
      console.log('   Clearing existing case-details collection...');
      await CaseDetails.deleteMany({});
      
      // Insert new data
      console.log('   Inserting cases...');
      const caseResult = await CaseDetails.insertMany(caseDetailsData);
      console.log(`✅ Imported ${caseResult.length} cases into case-details collection\n`);
    } else {
      console.log('⚠️  case-details.json not found at:', CASE_DETAILS_PATH);
    }

    // Import cluster data
    if (fs.existsSync(CASE_CLUSTER_PATH)) {
      console.log('📄 Reading case-cluster.json...');
      const clusterDataRaw = fs.readFileSync(CASE_CLUSTER_PATH, 'utf-8');
      const clusterDataParsed = JSON.parse(clusterDataRaw);
      
      // Convert MongoDB Extended JSON to native types
      console.log('   Converting Extended JSON format...');
      const clusterData = convertExtendedJSON(clusterDataParsed);
      
      console.log(`   Found cluster data with ${clusterData.summary?.total_cases || 'N/A'} cases in ${clusterData.summary?.total_clusters || 'N/A'} clusters`);
      
      // Clear existing data
      console.log('   Clearing existing clustered_cases collection...');
      await ClusteredCases.deleteMany({});
      
      // Insert new data (single document)
      console.log('   Inserting cluster data...');
      await ClusteredCases.create(clusterData);
      console.log(`✅ Imported cluster data into clustered_cases collection\n`);
    } else {
      console.log('⚠️  case-cluster.json not found at:', CASE_CLUSTER_PATH);
    }

    // Verify import
    console.log('📊 Verifying import...');
    const caseCount = await CaseDetails.countDocuments();
    const clusterCount = await ClusteredCases.countDocuments();
    
    console.log(`   - case-details: ${caseCount} documents`);
    console.log(`   - clustered_cases: ${clusterCount} documents`);
    
    console.log('\n✅ Data import completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Error during import:', error.message);
    throw error;
  } finally {
    // Close connection
    await mongoose.connection.close();
    console.log('\n📦 MongoDB connection closed');
  }
}

// Run the import
importData()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
