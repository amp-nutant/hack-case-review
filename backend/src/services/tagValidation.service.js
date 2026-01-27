import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load tag definitions
const tagsFilePath = path.join(__dirname, '../data/tags.json');
let TAG_DEFINITIONS = { openTags: [], closeTags: [] };

try {
  const tagsData = fs.readFileSync(tagsFilePath, 'utf-8');
  TAG_DEFINITIONS = JSON.parse(tagsData);
} catch (error) {
  console.warn('Warning: Could not load tags.json, using empty lists');
}

/**
 * Normalize tag for comparison (lowercase, trim, remove extra spaces)
 */
function normalizeTag(tag) {
  if (!tag) return '';
  return tag.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Find best matching tag from the valid list
 */
function findBestMatch(tag, validTags) {
  const normalizedTag = normalizeTag(tag);
  
  // Exact match (case-insensitive)
  const exactMatch = validTags.find(vt => normalizeTag(vt) === normalizedTag);
  if (exactMatch) {
    return { match: exactMatch, score: 1.0, type: 'exact' };
  }
  
  // Partial match - tag contains or is contained in valid tag
  for (const validTag of validTags) {
    const normalizedValid = normalizeTag(validTag);
    if (normalizedValid.includes(normalizedTag) || normalizedTag.includes(normalizedValid)) {
      const similarity = Math.min(normalizedTag.length, normalizedValid.length) / 
                        Math.max(normalizedTag.length, normalizedValid.length);
      return { match: validTag, score: similarity * 0.8, type: 'partial' };
    }
  }
  
  // Word overlap match
  const tagWords = normalizedTag.split(/[\s\-_\/]+/).filter(w => w.length > 2);
  let bestOverlap = { match: null, score: 0, type: 'none' };
  
  for (const validTag of validTags) {
    const validWords = normalizeTag(validTag).split(/[\s\-_\/]+/).filter(w => w.length > 2);
    const overlap = tagWords.filter(w => validWords.some(vw => vw.includes(w) || w.includes(vw)));
    const overlapScore = overlap.length / Math.max(tagWords.length, validWords.length, 1);
    
    if (overlapScore > bestOverlap.score && overlapScore > 0.3) {
      bestOverlap = { match: validTag, score: overlapScore * 0.6, type: 'word-overlap' };
    }
  }
  
  return bestOverlap;
}

/**
 * Validate tags against the predefined list
 * @param {string[]} caseTags - Tags from the case
 * @param {string[]} validTags - List of valid tags
 * @returns {Object} Validation results
 */
function validateTags(caseTags, validTags) {
  if (!caseTags || caseTags.length === 0) {
    return {
      provided: [],
      valid: [],
      invalid: [],
      suggestions: [],
      matchedTags: [],
      unmatchedTags: [],
      score: 0,
      coverage: 0,
      details: []
    };
  }

  const results = {
    provided: caseTags,
    valid: [],
    invalid: [],
    suggestions: [],
    matchedTags: [],
    unmatchedTags: [],
    details: []
  };

  for (const tag of caseTags) {
    const match = findBestMatch(tag, validTags);
    
    const detail = {
      tag,
      matchType: match.type,
      matchScore: parseFloat(match.score.toFixed(2)),
      suggestedTag: match.match
    };
    
    results.details.push(detail);
    
    if (match.type === 'exact') {
      results.valid.push(tag);
      results.matchedTags.push({ provided: tag, matched: match.match });
    } else if (match.score >= 0.5) {
      results.valid.push(tag);
      results.matchedTags.push({ provided: tag, matched: match.match, score: match.score });
      if (match.match !== tag) {
        results.suggestions.push({ current: tag, suggested: match.match });
      }
    } else {
      results.invalid.push(tag);
      results.unmatchedTags.push(tag);
      if (match.match) {
        results.suggestions.push({ current: tag, suggested: match.match });
      }
    }
  }

  // Calculate overall score
  const totalTags = caseTags.length;
  const validCount = results.valid.length;
  const avgMatchScore = results.details.reduce((sum, d) => sum + d.matchScore, 0) / totalTags;
  
  results.score = parseFloat((avgMatchScore * 10).toFixed(1)); // Scale to 1-10
  results.coverage = parseFloat(((validCount / totalTags) * 100).toFixed(1));

  return results;
}

/**
 * Validate a case's tags (both open and close)
 * @param {Object} caseData - Case data with tags
 * @returns {Object} Complete tag validation results
 */
export function validateCaseTags(caseData) {
  const openTags = caseData.tags?.openTags || [];
  const closeTags = caseData.tags?.closeTags || [];

  const openValidation = validateTags(openTags, TAG_DEFINITIONS.openTags);
  const closeValidation = validateTags(closeTags, TAG_DEFINITIONS.closeTags);

  // Calculate overall score
  const totalTags = openTags.length + closeTags.length;
  const overallScore = totalTags > 0 
    ? ((openValidation.score * openTags.length + closeValidation.score * closeTags.length) / totalTags)
    : 0;

  return {
    openTags: {
      ...openValidation,
      totalValidTags: TAG_DEFINITIONS.openTags.length
    },
    closeTags: {
      ...closeValidation,
      totalValidTags: TAG_DEFINITIONS.closeTags.length
    },
    summary: {
      totalTagsProvided: totalTags,
      totalValid: openValidation.valid.length + closeValidation.valid.length,
      totalInvalid: openValidation.invalid.length + closeValidation.invalid.length,
      overallScore: parseFloat(overallScore.toFixed(1)),
      overallCoverage: parseFloat((
        ((openValidation.valid.length + closeValidation.valid.length) / Math.max(totalTags, 1)) * 100
      ).toFixed(1))
    },
    validationTimestamp: new Date().toISOString()
  };
}

/**
 * Get all valid tags
 */
export function getValidTags() {
  return {
    openTags: [...TAG_DEFINITIONS.openTags],
    closeTags: [...TAG_DEFINITIONS.closeTags]
  };
}

/**
 * Reload tags from file (useful if tags.json is updated)
 */
export function reloadTags() {
  try {
    const tagsData = fs.readFileSync(tagsFilePath, 'utf-8');
    TAG_DEFINITIONS = JSON.parse(tagsData);
    return true;
  } catch (error) {
    console.error('Failed to reload tags:', error.message);
    return false;
  }
}

/**
 * Add custom tags to the validation list (in memory only)
 */
export function addCustomTags(openTags = [], closeTags = []) {
  TAG_DEFINITIONS.openTags = [...new Set([...TAG_DEFINITIONS.openTags, ...openTags])];
  TAG_DEFINITIONS.closeTags = [...new Set([...TAG_DEFINITIONS.closeTags, ...closeTags])];
}

export default {
  validateCaseTags,
  getValidTags,
  reloadTags,
  addCustomTags
};
