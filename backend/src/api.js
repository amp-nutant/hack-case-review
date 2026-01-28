import axios from 'axios';

const { JIRA_API_URL, JIRA_ACCESS_TOKEN } = process.env;

export const getJIRADetails = async (jiraKeys) => {
  if (!jiraKeys || jiraKeys.length === 0) {
    return [];
  }

  // Build JQL query: key in (ENG-123, ENG-456, ENG-789)
  const jql = `key in (${jiraKeys})`;

  try {
    const response = await axios.get(
      `${JIRA_API_URL}/search`,
      {
        params: {
          jql,
          fields: 'summary,description,resolution,customfield_11165,labels,components,status,issuetype,priority,fixVersions,versions',
        },
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${JIRA_ACCESS_TOKEN}`,
        },
      }
    );
    
    return response.data?.issues || []; // Array of JIRA issues
  } catch (err) {
    console.error(`Error getting JIRA details for keys:`, jiraKeys, err);
    throw new Error(`Failed to get JIRA details: ${err.message}`);
  }
};