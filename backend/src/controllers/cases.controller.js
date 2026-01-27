import { Case } from '../models/index.js';
import { generateMockCases } from '../utils/dataSimulator.js';

/**
 * Get cases by report ID
 */
export const getByReport = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Handle demo/mock IDs
    if (id.startsWith('demo-')) {
      const mockCases = generateMockCases(15);
      return res.json(mockCases);
    }
    
    const cases = await Case.find({ reportId: id }).sort({ createdAt: -1 });
    
    // If no cases, return mock data
    if (cases.length === 0) {
      const mockCases = generateMockCases(15);
      return res.json(mockCases);
    }
    
    res.json(cases);
  } catch (error) {
    next(error);
  }
};

/**
 * Get a single case by ID
 */
export const getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Handle demo/mock IDs
    if (id.startsWith('case-')) {
      const mockCases = generateMockCases(1);
      mockCases[0].id = id;
      return res.json(mockCases[0]);
    }
    
    const caseItem = await Case.findById(id);
    
    if (!caseItem) {
      return res.status(404).json({
        status: 'error',
        message: 'Case not found',
      });
    }
    
    res.json(caseItem);
  } catch (error) {
    next(error);
  }
};

/**
 * Update a case
 */
export const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Handle demo/mock IDs
    if (id.startsWith('case-')) {
      const mockCases = generateMockCases(1);
      return res.json({ ...mockCases[0], ...updates, id });
    }
    
    const caseItem = await Case.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    );
    
    if (!caseItem) {
      return res.status(404).json({
        status: 'error',
        message: 'Case not found',
      });
    }
    
    res.json(caseItem);
  } catch (error) {
    next(error);
  }
};

/**
 * Search cases
 */
export const search = async (req, res, next) => {
  try {
    const { q, status, priority, reportId } = req.query;
    
    const query = {};
    
    if (reportId) query.reportId = reportId;
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (q) {
      query.$or = [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { caseNumber: { $regex: q, $options: 'i' } },
      ];
    }
    
    const cases = await Case.find(query).sort({ createdAt: -1 }).limit(100);
    
    res.json(cases);
  } catch (error) {
    next(error);
  }
};

export default {
  getByReport,
  getById,
  update,
  search,
};
