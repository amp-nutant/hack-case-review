import CaseDetails from "../models/CaseDetails.model.js";
import Report from "../models/Report.model.js";

import { bucketiseCase } from "./caseBucketisation.service.js";
import { validateKBRelevance } from "./kbValidation.service.js";
import { transformJiraDetails, validateJIRARelevance } from "./jiraValidation.service.js";
import { validateClosureTagsSimplified } from "./caseClosureTagValidation.service.js";
import { generateActionSummary } from "./actionSummary.service.js";
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

  return caseDetails;
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

const generateIdentifiers = (caseDetails) => {
  const identifiers = [];

  if (caseDetails.jira?.present) {
    identifiers.push('has_jira');
  }

  if (caseDetails.kb?.present) {
    identifiers.push('has_kb');
  }

  if (caseDetails.jira?.missing) {
    identifiers.push('jira_missing');
  }

  if (caseDetails.kb?.missing) {
    identifiers.push('kb_missing');
  }

  if (caseDetails.kb && !caseDetails.kb.valid) {
    identifiers.push('kb_not_valid');
  }

  if (!caseDetails.isClosedTagValid) {
    identifiers.push('wrong_closed_tag');
  }

  if (caseDetails.jira && !caseDetails.jira.valid) {
    identifiers.push('jira_not_valid');
  }

  return identifiers;
};

const getBucketCount = (caseList) => {
  const caseCountPerBucket = caseList.reduce((acc, curr) => {
    if (acc[curr.bucket]) {
      acc[curr.bucket] += 1;
    } else {
      acc[curr.bucket] = 1;
    }
    return acc;
  }, {});

  return Object.entries(caseCountPerBucket).map(([bucket, count]) => ({
    name: bucket,
    count,
  }));
};

const getClosedTagCount = (caseList) => {
  const caseCountPerClosedTag = caseList.reduce((acc, curr) => {
    const closedTags = curr.tags?.closeTags || [];
    closedTags.forEach((closedTag) => {
      if (acc[closedTag]) {
        acc[closedTag] += 1;
      } else {
        acc[closedTag] = 1;
      }
    });
    return acc;
  }, {});

  return Object.entries(caseCountPerClosedTag).map(([closedTag, count]) => ({
    name: closedTag,
    count,
  }));
};

export const getKBArticles = async (articleNumbers) => {
  if (!articleNumbers || articleNumbers.length === 0) {
    return [];
  }

  const articleNumbersArray = articleNumbers.split(',').map((articleNumber) => articleNumber.trim()); 

  try {
    const result = await query(
      `SELECT articleNumber, title, summary, solution__c, description__c FROM sfdc.knowledge_base__kav WHERE articleNumber = ANY($1)`,
      [articleNumbersArray],
    );

    return result.rows.map(({ articleNumber, title, summary, solution__c, description__c }) => ({
      articleNumber,
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
        const { isValid: isCaseClosureTagValid, ...tagValidationSummary } = await validateClosureTagsSimplified(caseDetails);

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

          console.log(`Case number ${caseDetails.caseNumber}:`);
          console.log(`Bucketisation: ${caseBucketisationResponse.category}`);
          console.log(`JIRA validation: ${jiraValidationResponse.isValid} - Reason: ${jiraValidationResponse.reason}`);
          console.log(`KB validation: ${kbValidationResponse.isValid} - Reason: ${kbValidationResponse.reason}`);
          console.log(`Tag validation: ${isCaseClosureTagValid}`);
          console.log(`Progress ${index + 1} of ${caseList.length}`);
          console.log(`--------------------------------`);

          let isJIRAMissing = false;
          if (['Bug', 'Improvement'].includes(caseBucketisationResponse.category)) {
            if (!jiraDetails) {
              isJIRAMissing = true;
            }
          }

          let isKBMissing = false;
          if (['Customer Assistance', 'Customer Questions', 'Bug'].includes(caseBucketisationResponse.category)) {
            if (caseBucketisationResponse.category === 'Bug') {
              if (basicInfo.jiraCase) {
                // If JIRA is already present, then we can have a KB article indicating that it is a known bug
                isKBMissing = true;
              }
            } else if (!kbDetails) {
              isKBMissing = true;
            }
          }

          const transformedJIRAList = transformJiraDetails(jiraDetails);

          const jiraAdditionalDetails = {
            ticket: basicInfo.jiraCase,
            jiraDetails: transformedJIRAList.map((jira) => {
              return {
                key: jira.key,
                summary: jira.summary,
                issueType: jira.issueType,
                status: jira.status,
                labels: jira.labels,
                components: jira.components,
                affectedVersions: jira.affectedVersions,
                fixVersions: jira.fixVersions,
              };
            }),
            valid: jiraValidationResponse.isValid,
            present: !!basicInfo.jiraCase,
            missing: isJIRAMissing,
            reason: jiraValidationResponse.reason,
          };

          const kbAdditionalDetails = {
            article: basicInfo.kbArticle,
            kbDetails: kbDetails.map((kb) => {
              return {
                articleNumber: kb.articleNumber,
                title: kb.title,
                summary: kb.summary,
              };
            }),
            valid: kbValidationResponse.isValid,
            present: !!basicInfo.kbArticle,
            missing: isKBMissing,
            reason: kbValidationResponse.reason,
          };

          caseList[index].bucket = caseBucketisationResponse.category;
          caseList[index].isClosedTagValid = true;
          caseList[index].jira = jiraAdditionalDetails;
          caseList[index].kb = kbAdditionalDetails;
          caseList[index].identifiers = generateIdentifiers(caseList[index]);
          successfulCaseReviewCount += 1;

          await CaseDetails.findByIdAndUpdate(caseDetails._id, {
            bucket: caseBucketisationResponse.category,
            isClosedTagValid: true,
            jira: jiraAdditionalDetails,
            kb: kbAdditionalDetails,
            tagValidationSummary,
          });
        } else {
          console.log(`Case number ${caseDetails.caseNumber}:`);
          console.log(`Tag validation: ${isCaseClosureTagValid}`, tagValidationSummary);
          console.log(`Progress ${index + 1} of ${caseList.length}`);
          console.log(`--------------------------------`);

          caseList[index].bucket = 'Wrong Closure Tag';
          caseList[index].isClosedTagValid = false;
          caseList[index].identifiers = generateIdentifiers(caseList[index]);

          await CaseDetails.findByIdAndUpdate(caseDetails._id, {
            bucket: 'Wrong Closure Tag',
            isClosedTagValid: false,
            tagValidationSummary,
          });

          skippedCaseReviewCount += 1;
        }
      } catch (err) {
        await CaseDetails.findByIdAndUpdate(caseDetails._id, {
          error: true,
        });
        console.error(`Error reviewing case ${caseDetails.caseNumber}:`, err);
        failedCaseReviewCount += 1;
      }
    }

    const actionSummary = generateActionSummary(caseList);

    await Report.findOneAndUpdate({ reportId }, {
      reviewSummary: {
        success: successfulCaseReviewCount,
        failed: failedCaseReviewCount,
        skipped: skippedCaseReviewCount,
        buckets: getBucketCount(caseList),
        closedTags: getClosedTagCount(caseList),
        actionSummary,
      },
    });

    console.log(`Case review completed for report ${reportId}. Successful: ${successfulCaseReviewCount}, Failed: ${failedCaseReviewCount}, Skipped: ${skippedCaseReviewCount}`);
  } catch (err) {
    console.error('Error reviewing case report:', err);
    throw err;
  }
};

export {
  reviewCaseReport,
};
