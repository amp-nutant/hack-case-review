import CaseDetails from "../models/CaseDetails.model.js";
import Report from "../models/Report.model.js";

import { bucketiseCase } from "./caseBucketisation.service.js";
import { validateKBRelevance } from "./kbValidation.service.js";
import { validateJIRARelevance } from "./jiraValidation.service.js";
import { validateClosureTagsSimplified } from "./caseClosureValidation.service.js";
import { query } from "../config/postgres.js";
import { cleanHtmlForLLM } from "../utils/dataFormatter.js";
import { getJIRADetails } from "../api.js";

// things to do:
// 1. Complete the end to end flow of case review
// - Invoke LLM for KB or JIRA accuracy
// - Check for accuracy of case bucketisation and case closure tags
// - Have the flow to trigger case review for a report ID

const getCasesAssociatedWithReport = async (reportId) => {
  const caseDetails = await CaseDetails.find({ reportId }).lean();

  return caseDetails.slice(1, 11);
};

// const BUCKET_CLASSIFICATION_MAPPING = {
//   'Bug': 'Bug/Improvement',
//   'Improvement': 'Bug/Improvement',
//   'Non-Nutanix Error': 'CX-Environment/Non-Nutanix',
//   'Customer Assistance': 'Customer Assistance/Questions',
//   'Customer Questions': 'Customer Assistance/Questions',
//   'Customer Mistake': 'CX-Error/Mistake',
//   'Customer-Experience Error': 'CX-Error/Mistake',
//   'Customer-Experience Environment': 'CX-Environment/Non-Nutanix',
//   'Issue Self Resolved': 'Issue Self Resolved/Customer Self Resolved',
//   'Customer Self Resolved': 'Issue Self Resolved/Customer Self Resolved',
//   'RCA not conclusive': 'RCA not done/RCA inconclusive',
//   'RCA not done': 'RCA not done/RCA inconclusive',
// };

const generateActionSummary = (caseList) => {

};

export const getKBArticles = async (articleNumbers) => {
  if (!articleNumbers || articleNumbers.length === 0) {
    return [];
  }

  const articleNumbersArray = articleNumbers.split(',').map((articleNumber) => articleNumber.trim()); 

  try {
    const result = await query(
      `SELECT title, summary, solution__c, description__c FROM sfdc.knowledge_base__kav WHERE articleNumber = ANY($1)`,
      [articleNumbersArray],
    );

    return result.rows.map(({ title, summary, solution__c, description__c }) => ({
      title,
      summary,
      solution: cleanHtmlForLLM(solution__c),
      description: cleanHtmlForLLM(description__c),
    }));
  } catch (err) {
    console.error('Error getting KB articles:', err);
    return [];
  }
};

/**
 * Review the case report by analysing all the cases associated with the report
 * 1. Check if the case closure tag is valid or not
 * 2. If valid, invoke 2 LLM calls simulataneously: One for JIRA/KB validation and other for case bucketisation
 * 3. Upon LLM call completion, update the case bucket with the mapping defined in BUCKET_CLASSIFICATION_MAPPING. Also keep the original bucket value for reference
 * 4. For JIRA/KB validation, update isJIRAValid and isKBValid fields in the case details
 * 5. Upon completion of all cases, generate the issue summary for the report
 * @param {string} reportId - The ID of the report to review
 */
const reviewCaseReport = async (reportId) => {
  try {
    const caseList = await getCasesAssociatedWithReport(reportId);

    let successfulCaseReviewCount = 0;
    let failedCaseReviewCount = 0;
    let skippedCaseReviewCount = 0;

    for (let index = 0; index < caseList.length; index += 1) {
      const caseDetails = caseList[index];

      try {
        // Validate the closure tag
        const { isValid: isCaseClosureTagValid, missingTags: recommendedTags } = await validateClosureTagsSimplified(caseDetails);

        if (isCaseClosureTagValid) {
          const basicInfo = caseDetails.caseInfo;

          const [jiraDetails, kbDetails] = await Promise.all([
            getJIRADetails(basicInfo.jiraCase || ''),
            getKBArticles(basicInfo.kbArticle || ''),
          ]);

          const [caseBucketisationResponse, kbValidationResponse, jiraValidationResponse] = await Promise.all([
            bucketiseCase(caseDetails),
            validateKBRelevance(kbDetails, caseDetails),
            validateJIRARelevance(jiraDetails, caseDetails),
          ]);

          await CaseDetails.findByIdAndUpdate(caseDetails._id, {
            bucket: caseBucketisationResponse.category,
            isJIRAValid: jiraValidationResponse.isValid,
            isKBValid: kbValidationResponse.isValid,
            isClosedTagValid: true,
            recommendedTags,
          });

          caseList[index].bucket = caseBucketisationResponse.category;
          caseList[index].isJIRAValid = jiraValidationResponse.isValid;
          caseList[index].isKBValid = kbValidationResponse.isValid;
          caseList[index].isClosedTagValid = true;
          caseList[index].recommendedTags = recommendedTags;

          successfulCaseReviewCount += 1;
        } else {
          await CaseDetails.findByIdAndUpdate(caseDetails._id, {
            bucket: 'Wrong Closure Tag',
            isClosedTagValid: false,
            recommendedTags,
          });

          caseList[index].bucket = 'Wrong Closure Tag';
          caseList[index].isClosedTagValid = false;
          caseList[index].recommendedTags = recommendedTags;

          skippedCaseReviewCount += 1;
        }
      } catch (err) {
        console.error(`Error reviewing case ${caseDetails.caseNumber}:`, err);
        failedCaseReviewCount += 1;
      }
    }

    const actionSummary = generateActionSummary(caseList);

    await Report.findByIdAndUpdate(reportId, {
      actionSummary,
      review_summary: {
        success: successfulCaseReviewCount,
        failed: failedCaseReviewCount,
        skipped: skippedCaseReviewCount,
      },
    });
  } catch (err) {
    console.error('Error reviewing case report:', err);
    throw err;
  }
};

export {
  reviewCaseReport,
};
