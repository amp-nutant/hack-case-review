import { v4 as uuidv4 } from 'uuid';
import { Report, Case } from '../models/index.js';
import { generateMockCases, generateMockAnalysis } from '../utils/dataSimulator.js';

/**
 * Handle file upload and create a new report
 */
export const uploadFile = async (req, res, next) => {
  try {
    const file = req.file;
    
    if (!file) {
      return res.status(400).json({
        status: 'error',
        message: 'No file uploaded',
      });
    }
    
    // Determine file type
    const ext = file.originalname.split('.').pop().toLowerCase();
    const validTypes = ['csv', 'xlsx', 'xls', 'json'];
    
    if (!validTypes.includes(ext)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid file type. Supported: CSV, Excel, JSON',
      });
    }
    
    // Create report record
    const report = new Report({
      name: file.originalname.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' '),
      fileName: file.originalname,
      fileSize: file.size,
      fileType: ext,
      status: 'processing',
      processingStartedAt: new Date(),
    });
    
    await report.save();
    
    // Simulate processing - in real app, this would be a background job
    // For hackathon demo, we'll generate mock data immediately
    setTimeout(async () => {
      try {
        // Generate mock cases for this report
        const mockCases = generateMockCases(Math.floor(Math.random() * 100) + 50);
        
        // Save cases
        const caseDocs = mockCases.map((c) => ({
          ...c,
          _id: undefined,
          id: undefined,
          reportId: report._id,
        }));
        
        await Case.insertMany(caseDocs);
        
        // Update report status
        const caseCount = caseDocs.length;
        const openCases = caseDocs.filter((c) => c.status === 'open').length;
        const resolvedCases = caseDocs.filter((c) => c.status === 'resolved').length;
        const closedCases = caseDocs.filter((c) => c.status === 'closed').length;
        const criticalCases = caseDocs.filter((c) => c.priority === 'critical').length;
        
        await Report.findByIdAndUpdate(report._id, {
          status: 'completed',
          caseCount,
          summary: {
            totalCases: caseCount,
            openCases,
            resolvedCases,
            closedCases,
            criticalCases,
            avgResolutionTime: `${(Math.random() * 4 + 2).toFixed(1)} hours`,
          },
          processingCompletedAt: new Date(),
        });
      } catch (err) {
        console.error('Error processing report:', err);
        await Report.findByIdAndUpdate(report._id, {
          status: 'failed',
          errorMessage: err.message,
        });
      }
    }, 2000);
    
    res.status(201).json({
      id: report._id,
      name: report.name,
      fileName: report.fileName,
      status: report.status,
      message: 'File uploaded successfully. Processing started.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get upload status
 */
export const getStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const report = await Report.findById(id).select('status processingStartedAt processingCompletedAt errorMessage');
    
    if (!report) {
      return res.status(404).json({
        status: 'error',
        message: 'Report not found',
      });
    }
    
    res.json({
      status: report.status,
      processingStartedAt: report.processingStartedAt,
      processingCompletedAt: report.processingCompletedAt,
      errorMessage: report.errorMessage,
    });
  } catch (error) {
    next(error);
  }
};

export default {
  uploadFile,
  getStatus,
};
