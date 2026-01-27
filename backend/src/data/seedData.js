import { Report, Case, Analysis } from '../models/index.js';
import { generateMockReport, generateMockCases, generateMockAnalysis } from '../utils/dataSimulator.js';

/**
 * Seed the database with sample data
 */
export async function seedDatabase() {
  try {
    console.log('Checking if seed data is needed...');
    
    const existingReports = await Report.countDocuments();
    
    if (existingReports > 0) {
      console.log('Database already has data, skipping seed.');
      return;
    }
    
    console.log('Seeding database with sample data...');
    
    // Create sample reports
    const reportData = [
      {
        name: 'Q4 2025 Case Review',
        fileName: 'q4_2025_cases.csv',
        fileSize: 245678,
        fileType: 'csv',
        status: 'completed',
        caseCount: 156,
        summary: {
          totalCases: 156,
          openCases: 45,
          resolvedCases: 89,
          closedCases: 22,
          criticalCases: 12,
          avgResolutionTime: '4.2 hours',
        },
        processingStartedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        processingCompletedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 5 * 60 * 1000),
      },
      {
        name: 'November Cases Analysis',
        fileName: 'november_2025_report.xlsx',
        fileSize: 512000,
        fileType: 'xlsx',
        status: 'completed',
        caseCount: 203,
        summary: {
          totalCases: 203,
          openCases: 32,
          resolvedCases: 145,
          closedCases: 26,
          criticalCases: 8,
          avgResolutionTime: '3.8 hours',
        },
        processingStartedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        processingCompletedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000 + 8 * 60 * 1000),
      },
    ];
    
    const reports = await Report.insertMany(reportData);
    console.log(`Created ${reports.length} reports`);
    
    // Create cases for first report
    const mockCases = generateMockCases(50);
    const caseDocs = mockCases.map((c) => ({
      ...c,
      _id: undefined,
      id: undefined,
      reportId: reports[0]._id,
    }));
    
    await Case.insertMany(caseDocs);
    console.log(`Created ${caseDocs.length} cases for first report`);
    
    // Create analysis for first report
    const mockAnalysis = generateMockAnalysis();
    await Analysis.create({
      reportId: reports[0]._id,
      ...mockAnalysis,
      generatedAt: new Date(),
    });
    console.log('Created analysis for first report');
    
    console.log('Database seeding completed!');
  } catch (error) {
    console.error('Error seeding database:', error);
  }
}

export default seedDatabase;
