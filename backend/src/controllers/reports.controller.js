import { Report, Case } from '../models/index.js';
import CaseDetails from '../models/CaseDetails.model.js';
import { generateMockReport, generateMockCases } from '../utils/dataSimulator.js';

/**
 * Get all reports
 */
export const getAll = async (req, res, next) => {
  try {
    const reports = await Report.find().sort({ createdAt: -1 });

    // If no reports exist, return mock data
    if (reports.length === 0) {
      const mockReports = generateMockReport(5);
      return res.json(mockReports);
    }

    res.json(reports);
  } catch (error) {
    next(error);
  }
};

/**
 * Get a single report by ID
 */
export const getById = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Handle demo/mock IDs
    if (id.startsWith('demo-')) {
      const mockReports = generateMockReport(1);
      mockReports[0].id = id;
      return res.json(mockReports[0]);
    }

    const report = await Report.findById(id);

    if (!report) {
      return res.status(404).json({
        status: 'error',
        message: 'Report not found',
      });
    }

    res.json(report);
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a report
 */
export const deleteReport = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Handle demo/mock IDs
    if (id.startsWith('demo-')) {
      return res.json({
        status: 'ok',
        message: 'Report deleted successfully',
      });
    }

    const report = await Report.findByIdAndDelete(id);

    if (!report) {
      return res.status(404).json({
        status: 'error',
        message: 'Report not found',
      });
    }

    // Also delete associated cases
    await Case.deleteMany({ reportId: id });

    res.json({
      status: 'ok',
      message: 'Report deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get report summary/stats
 */
export const getSummary = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Handle demo/mock IDs
    if (id.startsWith('demo-')) {
      return res.json({
        totalCases: 156,
        openCases: 45,
        resolvedCases: 89,
        closedCases: 22,
        criticalCases: 12,
        avgResolutionTime: '4.2 hours',
      });
    }

    const report = await Report.findById(id);

    if (!report) {
      return res.status(404).json({
        status: 'error',
        message: 'Report not found',
      });
    }

    // Calculate summary from cases
    const cases = await Case.find({ reportId: id });

    const summary = {
      totalCases: cases.length,
      openCases: cases.filter(c => c.status === 'open').length,
      inProgressCases: cases.filter(c => c.status === 'in_progress').length,
      resolvedCases: cases.filter(c => c.status === 'resolved').length,
      closedCases: cases.filter(c => c.status === 'closed').length,
      criticalCases: cases.filter(c => c.priority === 'critical').length,
    };

    res.json(summary);
  } catch (error) {
    next(error);
  }
};

/**
 * Get cases for a report from the case-details collection
 */
export const getCasesFromDetails = async (req, res, next) => {
  try {
    const { id } = '123';

    // Handle demo/mock IDs
    if (id.startsWith('demo-')) {
      const mockCases = generateMockCases(15);
      return res.json(mockCases);
    }

    const cases = await CaseDetails.find({ reportId: id }).lean();

    const normalizeStatus = flag => {
      if (flag === true) return 'valid';
      if (flag === false) return 'wrong';
      return 'missing';
    };

    const normalized = cases.map(item => {
      const caseInfo = item.caseInfo || {};
      const closedTagValue = item.tags?.closeTags?.[0] || null;
      const kbValue = caseInfo.kbArticle || null;
      const jiraValue = caseInfo.jiraCase || caseInfo.jira_case_no__c || item.jiraTicket || null;

      return {
        id: item._id?.toString(),
        caseNumber: caseInfo.caseNumber || item.caseNumber || '',
        title: caseInfo.subject || item.title || '',
        bucket: item.bucket || 'Uncategorized',
        accountName: item.customer?.accountName || '',
        owner: item.ownership?.currentOwner || '',
        aosVersion: caseInfo.nosVersion || caseInfo.nos_version_snapshot__c || '',
        hypervisorVersion: caseInfo.hypervisorVersion || '',
        pcVersion: caseInfo.product_version || caseInfo.product || caseInfo.pcVersion || '',
        description: caseInfo.description || item.description || '',
        closedTag: {
          value: closedTagValue,
          status: normalizeStatus(item.isClosedTagValid),
          suggestedValue: item.recommendedTags?.[0] || item.tagValidationSummary?.tagsWithImprovements?.[0]?.suggestedImprovement || null,
        },
        kbArticle: {
          value: kbValue,
          status: normalizeStatus(item.isKBValid),
          suggestedValue: item.recommendedKB || null,
        },
        jiraTicket: {
          value: jiraValue,
          status: normalizeStatus(item.isJIRAValid),
          suggestedValue: item.recommendedJIRA || null,
        },
        issues: item.issues || item.tagValidationSummary?.tagsWithImprovements?.map(t => t.suggestedImprovement) || [],
        createdAt: caseInfo.createdDate || item.createdAt,
        closedAt: caseInfo.closedDate || item.closedAt,
        actionsTaken: item.actionsTaken || [],
        identifiedActions: item.identifiedActions || [],
      };
    });

    res.json(normalized);
  } catch (error) {
    next(error);
  }
};

export default {
  getAll,
  getById,
  delete: deleteReport,
  getSummary,
  getCasesFromDetails,
};
