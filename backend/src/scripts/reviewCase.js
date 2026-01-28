import dotenv from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../.env') });
import { connectToMongoDB } from '../utils/mongoose.js';
import { reviewCaseReport } from '../services/caseReview.service.js';


async function reviewSampleCaseReport(reportId) {
  try {
    await connectToMongoDB();

    reviewCaseReport(reportId);
  } catch (err) {
    console.error('Error reviewing case report:', err);
  }
}

reviewSampleCaseReport('123');