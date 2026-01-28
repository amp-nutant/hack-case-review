import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Schema for imported case data from PostgreSQL
 * Stores the full case structure including conversation history
 * Using Schema.Types.Mixed for flexibility with varying data structures
 */

const importedCaseSchema = new Schema(
  {
    // Case Number as top-level for easy querying and uniqueness
    caseNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    // Case Info - using Mixed for flexibility
    caseInfo: {
      type: Schema.Types.Mixed,
      required: true,
    },

    // Customer Info
    customer: {
      type: Schema.Types.Mixed,
    },

    // Ownership
    ownership: {
      type: Schema.Types.Mixed,
    },

    // Tags
    tags: {
      type: Schema.Types.Mixed,
    },

    // Resolution
    resolution: {
      type: Schema.Types.Mixed,
    },

    // Escalation
    escalation: {
      type: Schema.Types.Mixed,
    },

    // Response Metrics
    responseMetrics: {
      type: Schema.Types.Mixed,
    },

    // Timeline Events
    timeline: {
      type: Schema.Types.Mixed,
    },

    // Conversation
    conversation: {
      type: [Schema.Types.Mixed],
    },

    // Import metadata
    importedAt: {
      type: Date,
      default: Date.now,
    },
    source: {
      type: String,
      default: 'postgresql',
    },
  },
  {
    timestamps: true,
    strict: false, // Allow additional fields not in schema
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexes for common queries
importedCaseSchema.index({ 'caseInfo.status': 1 });
importedCaseSchema.index({ 'caseInfo.priority': 1 });
importedCaseSchema.index({ 'caseInfo.createdDate': -1 });
importedCaseSchema.index({ 'caseInfo.product': 1 });
importedCaseSchema.index({ 'customer.accountName': 1 });
importedCaseSchema.index({ 'tags.openTags': 1 });
importedCaseSchema.index({ 'tags.closeTags': 1 });

const ImportedCase = mongoose.model('ImportedCase', importedCaseSchema);

export default ImportedCase;
