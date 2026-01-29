import mongoose from 'mongoose';

const clusteredCasesSchema = new mongoose.Schema(
  {},
  {
    strict: false,
  }
);

const ClusteredCases = mongoose.model('clustered_cases', clusteredCasesSchema, 'clustered_cases');

export default ClusteredCases;

