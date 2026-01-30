import { CaseDetails, Report } from '../models/index.js';

/**
 * Get overview stats for a report (or all cases)
 */
export const getOverview = async (req, res, next) => {
  try {
    const rawReportId = req.params.reportId || req.query.reportId;
    const reportId =
      rawReportId && rawReportId !== 'undefined' && rawReportId !== 'null'
        ? rawReportId
        : null;
    const query = reportId ? { reportId } : {};

    let cases = await CaseDetails.find(query).lean();

    // If a reportId was provided but doesn't match any data, fall back to all cases
    if (reportId && cases.length === 0) {
      cases = await CaseDetails.find({}).lean();
    }
    const bucketSet = new Set();
    const bucketCounts = new Map();
    let kbJiraIssuesTotal = 0;
    let kbMissingTotal = 0;
    let jiraOpenTotal = 0;
    const closedTagsSet = new Set();
    const closedTagCounts = new Map();
    const kbJiraCounts = new Map();

    const truncateLabel = (text, maxLength = 30) => {
      if (!text) return '';
      if (text.length <= maxLength) return text;
      return `${text.slice(0, maxLength - 3).trim()}...`;
    };

    cases.forEach((caseItem) => {
      const bucket =
        caseItem.bucket ||
        caseItem.caseInfo?.bucket ||
        caseItem.caseInfo?.caseBucket ||
        caseItem.caseInfo?.case_bucket;

      if (bucket) {
        bucketSet.add(bucket);
        bucketCounts.set(bucket, (bucketCounts.get(bucket) || 0) + 1);
      }

      if (caseItem.isKBValid === false || caseItem.isJIRAValid === false) {
        kbJiraIssuesTotal += 1;
      }

      if (caseItem.kb?.missing === true) {
        kbMissingTotal += 1;
      }

      const jiraDetails = caseItem.jira?.jiraDetails;
      if (Array.isArray(jiraDetails)) {
        const jiraKeysInCase = new Set();
        jiraDetails.forEach((jiraItem) => {
          const status = jiraItem?.status;
          const isOpen = !status || (status !== 'Resolved' && status !== 'Closed');
          if (isOpen) {
            jiraOpenTotal += 1;
          }

          const key = jiraItem?.key || jiraItem?.id || jiraItem?.jiraKey;
          if (key && isOpen) {
            jiraKeysInCase.add(key);
            const summary =
              jiraItem?.summary || jiraItem?.title || jiraItem?.description || '';
            const truncatedSummary = truncateLabel(summary, 50);
            const label = truncatedSummary ? `${key}: ${truncatedSummary}` : `${key}`;
            const existing = kbJiraCounts.get(`JIRA:${key}`) || {
              id: key,
              type: 'JIRA',
              label,
              count: 0,
            };
            existing.label = label || existing.label;
            kbJiraCounts.set(`JIRA:${key}`, existing);
          }
        });

        jiraKeysInCase.forEach((key) => {
          const entry = kbJiraCounts.get(`JIRA:${key}`);
          if (entry) {
            entry.count += 1;
          }
        });
      }

      const kbDetails = caseItem.kb?.kbDetails;
      if (Array.isArray(kbDetails)) {
        const kbKeysInCase = new Set();
        kbDetails.forEach((kbItem) => {
          const articleNumber =
            kbItem?.articleNumber ||
            kbItem?.article_number ||
            kbItem?.articleId ||
            kbItem?.id;
          const title = kbItem?.title || kbItem?.articleTitle || kbItem?.subject || '';

          if (articleNumber) {
            const id = String(articleNumber);
            kbKeysInCase.add(id);
            const label = title ? `KB-${id}: ${truncateLabel(String(title), 50)}` : `KB-${id}`;
            const existing = kbJiraCounts.get(`KB:${id}`) || {
              id,
              type: 'KB',
              label,
              count: 0,
            };
            existing.label = label || existing.label;
            kbJiraCounts.set(`KB:${id}`, existing);
          }
        });

        kbKeysInCase.forEach((id) => {
          const entry = kbJiraCounts.get(`KB:${id}`);
          if (entry) {
            entry.count += 1;
          }
        });
      }

      const closeTags =
        caseItem.tags?.closeTags ||
        caseItem.tags?.close_tags ||
        caseItem.closeTags ||
        caseItem.close_tags;

      if (Array.isArray(closeTags)) {
        closeTags.forEach((tag) => {
          if (tag) {
            closedTagsSet.add(tag);
            closedTagCounts.set(tag, (closedTagCounts.get(tag) || 0) + 1);
          }
        });
      }
    });

    const topIssues = Array.from(bucketCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((bucket, index) => ({
        id: index + 1,
        ...bucket,
      }));

    const totalCases = cases.length;
    const actionsReportId = '123';
    const report = await Report.findOne({ reportId: actionsReportId }).lean();
    const topPriorityActions = report?.reviewSummary?.actionSummary?.topPriorityActions || [];
    const actionsItems = Array.isArray(topPriorityActions)
      ? topPriorityActions.map((actionItem, index) => ({
          id: index + 1,
          title: actionItem.action,
          priority: actionItem.priority,
          category: actionItem.category,
          affectedCases: actionItem.cases ?? 0,
        }))
      : [];

    const topKBGaps = Array.from(kbJiraCounts.values())
      .map((entry) => ({
        id: entry.id,
        title: entry.type === 'KB' ? entry.label : undefined,
        label: entry.label,
        status: entry.type === 'KB' ? 'No Article' : 'Open',
        type: entry.type,
        caseCount: entry.count,
        percentage: totalCases > 0 ? Math.round((entry.count / totalCases) * 100) : 0,
      }))
      .sort((a, b) => b.caseCount - a.caseCount)
      .slice(0, 3);
    const topTags = Array.from(closedTagCounts.entries())
      .map(([name, count]) => ({
        name,
        count,
        percentage: totalCases > 0 ? Math.round((count / totalCases) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((tag, index) => ({
        id: index + 1,
        ...tag,
      }));

    res.json({
      totalCases,
      buckets: {
        total: bucketSet.size,
        topIssues,
      },
      actions: {
        total: actionsItems.length,
        items: actionsItems,
      },
      kbJiraIssues: {
        total: kbJiraIssuesTotal,
        kbMissing: kbMissingTotal,
        jiraOpen: jiraOpenTotal,
        topKBGaps,
      },
      closedTags: {
        total: closedTagsSet.size,
        topTags,
      },
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getOverview,
};
