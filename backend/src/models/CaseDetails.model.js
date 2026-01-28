import mongoose from 'mongoose';

const caseDetailsSchema = new mongoose.Schema(
  {},
  {
    strict: false,
  }
);

// Indexes for common queries
caseDetailsSchema.index({ reportId: 1 });

const CaseDetails = mongoose.model('case-details', caseDetailsSchema, 'case-details');

export default CaseDetails;

