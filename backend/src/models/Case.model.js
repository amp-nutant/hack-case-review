import mongoose from 'mongoose';

const caseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'resolved', 'closed'],
      default: 'open',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    assignee: {
      type: String,
      trim: true,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    analysis: {
      summary: String,
      recommendations: [String],
      generatedAt: Date,
    },
    metadata: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
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
caseSchema.index({ status: 1, createdAt: -1 });
caseSchema.index({ priority: 1 });
caseSchema.index({ tags: 1 });

const Case = mongoose.model('Case', caseSchema);

export default Case;

