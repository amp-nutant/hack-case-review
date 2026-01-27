import mongoose from 'mongoose';

const clusterSchema = new mongoose.Schema({
  name: String,
  description: String,
  count: Number,
  percentage: Number,
  color: String,
  keywords: [String],
  caseIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Case' }],
});

const analysisSchema = new mongoose.Schema(
  {
    reportId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Report',
      required: true,
      index: true,
    },
    summary: {
      overview: String,
      keyFindings: [String],
      recommendations: [String],
      trends: {
        improving: [String],
        declining: [String],
        stable: [String],
      },
    },
    clusters: [clusterSchema],
    chatHistory: [
      {
        role: {
          type: String,
          enum: ['user', 'assistant'],
          required: true,
        },
        content: {
          type: String,
          required: true,
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    chartData: {
      priorityDistribution: [
        {
          name: String,
          value: Number,
          color: String,
        },
      ],
      statusOverview: [
        {
          name: String,
          value: Number,
        },
      ],
      casesOverTime: [
        {
          date: String,
          count: Number,
        },
      ],
      assigneeWorkload: [
        {
          name: String,
          open: Number,
          inProgress: Number,
          resolved: Number,
        },
      ],
    },
    generatedAt: {
      type: Date,
    },
    lastUpdatedAt: {
      type: Date,
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

// Ensure one analysis per report
analysisSchema.index({ reportId: 1 }, { unique: true });

const Analysis = mongoose.model('Analysis', analysisSchema);

export default Analysis;
