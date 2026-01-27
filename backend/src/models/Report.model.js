import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Report name is required'],
      trim: true,
      maxlength: [200, 'Name cannot exceed 200 characters'],
    },
    fileName: {
      type: String,
      required: [true, 'File name is required'],
      trim: true,
    },
    fileSize: {
      type: Number,
      default: 0,
    },
    fileType: {
      type: String,
      enum: ['csv', 'xlsx', 'xls', 'json'],
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
    },
    caseCount: {
      type: Number,
      default: 0,
    },
    summary: {
      totalCases: Number,
      openCases: Number,
      resolvedCases: Number,
      closedCases: Number,
      criticalCases: Number,
      avgResolutionTime: String,
    },
    processingStartedAt: {
      type: Date,
    },
    processingCompletedAt: {
      type: Date,
    },
    errorMessage: {
      type: String,
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

// Indexes
reportSchema.index({ status: 1, createdAt: -1 });
reportSchema.index({ createdAt: -1 });

// Virtual to get cases for this report
reportSchema.virtual('cases', {
  ref: 'Case',
  localField: '_id',
  foreignField: 'reportId',
});

const Report = mongoose.model('Report', reportSchema);

export default Report;
