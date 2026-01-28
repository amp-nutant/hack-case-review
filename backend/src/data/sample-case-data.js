export const sampleCaseData = {
  "_id": {
    "$oid": "6979c35413441aada261a839"
  },
  "caseNumber": "02110474",
  "__v": 0,
  "caseInfo": {
    "caseNumber": "02110474",
    "caseId": "500VO00000pIlbRYAS",
    "subject": "New PC and recently updated in <3 months being prompted for Admin password soon to expire",
    "description": "We recently installed, migrated and updated to a new PC (Version pc.2024.3.1.7, NCC Version: 5.2.0.1, LCM Version: 3.2.1) in the last 3 months or less.  We are now being prompted that our Admin password in PC is about to expire.  I am very confused as to why this is happening so quickly after our recent work with PC.  This seems very unusual and strange to me, as we had been running a slightly older version and for 18 months (and possibly longer) we never received any notification like this.\n\nAlert UID\tSeverity\tTimeStamp\tCluster Name\tNode Id\tBlock Id\tDescription\nA6227\tWarning\tTue Nov 4 16:26:34 2025\tprismcentral01\tN/A\tN/A\tAdmin user password will expire soon. Please change the admin password.",
    "status": "Closed",
    "priority": "P4 - Low",
    "type": "Question",
    "origin": "Web",
    "isClosed": true,
    "createdDate": {
      "$date": "2025-11-05T10:12:08.000Z"
    },
    "closedDate": {
      "$date": "2025-11-07T17:14:06.000Z"
    },
    "caseAgeDays": "2.3000000000",
    "complexity": "Low - L1",
    "product": "Prism Central",
    "nosVersion": null,
    "serialNumber": null,
    "clusterId": null,
    "skill": "Prism Central",
    "supportLevel": null,
    "jiraCase": null,
    "kbArticle": "000004676"
  },
  "conversation": [
    {
      "sequence": 1,
      "type": "email",
      "id": "02sVO00000j9EBWYA2",
      "timestamp": {
        "$date": "2025-11-05T12:47:08.000Z"
      },
      "subject": "02110474 | Account: First American Bank Corporation (del) | Subject: New PC and recently updated in <3 months being prompted for Admin password soon to expire | thread::UZHsrt4cfiGSjrSyJCiiLi4::",
      "from": {
        "name": "Nutanix Support",
        "address": "support_case@nutanix.com"
      },
      "to": "jwietecha@firstambank.com",
      "cc": "mitchell.barber@nutanix.com",
      "content": "Hi Jeremy,\n\nMy name is Mitch and I've taken ownership of this case.\n\nBy default, the newer PCs have the admin password expiring every 60 days.\nThis is part of an overall enhanced product security profile.\nMore info can be found here:\n\nModify Prism admin user password expiration days\nhttps://portal.nutanix.com/kb/4676\n\nHowever, the expiration can be manually set for a greater period or even to never expire.\n\nSSH to the PC VM and provide me the following:\n\nsudo chage -l admin\n\nAmongst other info, it will report the \"Maximum number of days between password change\" which =60 days by default.\n\nIf you wish to change it to never expire, you could run:\n\nsudo chage -M 99999 admin\n\nLet me know if this resolves your issue or if you would like to jump on a Zoom to discuss further.\n\nThanks\n\n\nRegards,\nMitchell Barber\nSystem Reliability Engineer | Nutanix | +1 (408)565-8845 | mitchell.barber@nutanix.com\nWorking hours:  Mon-Fri 8am-4pm EST\nCustomer Support Portal: http://portal.nutanix.com/\nFor immediate assistance on a case if I am out of the office or unavailable,\nplease call into Nutanix Support Hotline 1-855-NUTANIX, option 3.\n\nWant higher up time and Predictive Support - Try Insights - https://www.nutanix.com/products/insights",
      "contentPreview": "Hi Jeremy,\n\nMy name is Mitch and I've taken ownership of this case.\n\nBy default, the newer PCs have the admin password expiring every 60 days.\nThis is part of an overall enhanced product security profile.\nMore info can be found here:\n\nModify Prism admin user password expiration days\nhttps://portal.nutanix.com/kb/4676\n\nHowever, the expiration can be manually set for a greater period or even to never expire.\n\nSSH to the PC VM and provide me the following:\n\nsudo chage -l admin\n\nAmongst other info, ...",
      "hasAttachment": false,
      "direction": "outbound",
      "isCustomer": false,
      "timeSincePreviousHours": null
    },
    {
      "sequence": 2,
      "type": "comment",
      "id": "a1ZVO00000LWlED2A1",
      "timestamp": "2025-11-05 20:19:42Z",
      "author": "Mitchell Barber",
      "authorId": "0030e00002GwOBuAAN",
      "isPublic": true,
      "content": "PROBLEM DESCRIPTION\n------------------------------------\nWe recently installed, migrated and updated to a new PC (Version pc.2024.3.1.7, NCC Version: 5.2.0.1, LCM Version: 3.2.1) in the last 3 months or less. We are now being prompted that our Admin password in PC is about to expire. I am very confused as to why this is happening so quickly after our recent work with PC. This seems very unusual and strange to me, as we had been running a slightly older version and for 18 months (and possibly longer) we never received any notification like this.\n\nAlert UID Severity TimeStamp Cluster Name Node Id Block Id Description\nA6227 Warning Tue Nov 4 16:26:34 2025 prismcentral01 N/A N/A Admin user password will expire soon. Please change the admin password.\n\nPRIOR ACTIONS\n------------------------------------\n+NCC health check\n+provided Nutanix docs and explanation of PC password policy\n+provided commands to resolve issue\n\nACTION PLAN\n------------------------------------\n+awaiting customer to update case\n\nACTION PLAN OWNER\n------------------------------------\nCustomer\n\nCURRENT STATUS\n------------------------------------\n+customer seeing NCC alert for expiring admin password in PC\n\nCUSTOMER'S REPORTED BUSINESS IMPACT\n------------------------------------\nnone reported\n\nNEXT TOUCH DATE\n------------------------------------",
      "direction": "outbound",
      "isCustomer": false,
      "timeSincePreviousHours": 7.54
    },
    {
      "sequence": 3,
      "type": "email",
      "id": "02sVO00000jFeuVYAS",
      "timestamp": {
        "$date": "2025-11-06T15:35:04.000Z"
      },
      "subject": "02110474 | Account: First American Bank Corporation (del) | Subject: New PC and recently updated in <3 months being prompted for Admin password soon to expire | thread::UZHsrt4cfiGSjrSyJCiiLi4::",
      "from": {
        "name": "Nutanix Support",
        "address": "support_case@nutanix.com"
      },
      "to": "jwietecha@firstambank.com",
      "cc": "mitchell.barber@nutanix.com",
      "content": "Hi Jeremy,\n\nLet me know if you need further assistance or if the case can be closed.\n\nThanks\n\n\nRegards,\nMitchell Barber\nSystem Reliability Engineer | Nutanix | +1 (408)565-8845 | mitchell.barber@nutanix.com\nWorking hours:  Mon-Fri 8am-4pm EST\nCustomer Support Portal: http://portal.nutanix.com/\nFor immediate assistance on a case if I am out of the office or unavailable,\nplease call into Nutanix Support Hotline 1-855-NUTANIX, option 3.\n\nWant higher up time and Predictive Support - Try Insights - https://www.nutanix.com/products/insights",
      "contentPreview": "Hi Jeremy,\n\nLet me know if you need further assistance or if the case can be closed.\n\nThanks\n\n\nRegards,\nMitchell Barber\nSystem Reliability Engineer | Nutanix | +1 (408)565-8845 | mitchell.barber@nutanix.com\nWorking hours:  Mon-Fri 8am-4pm EST\nCustomer Support Portal: http://portal.nutanix.com/\nFor immediate assistance on a case if I am out of the office or unavailable,\nplease call into Nutanix Support Hotline 1-855-NUTANIX, option 3.\n\nWant higher up time and Predictive Support - Try Insights - h...",
      "hasAttachment": false,
      "direction": "outbound",
      "isCustomer": false,
      "timeSincePreviousHours": 19.26
    },
    {
      "sequence": 4,
      "type": "email",
      "id": "02sVO00000jILk6YAG",
      "timestamp": {
        "$date": "2025-11-07T08:36:05.000Z"
      },
      "subject": "02110474 | Account: First American Bank Corporation (del) | Subject: New PC and recently updated in <3 months being prompted for Admin password soon to expire | thread::UZHsrt4cfiGSjrSyJCiiLi4::",
      "from": {
        "name": "Nutanix Support",
        "address": "support_case@nutanix.com"
      },
      "to": "jwietecha@firstambank.com",
      "cc": "mitchell.barber@nutanix.com",
      "content": "Hi Jeremy,\n\nI hope the info I seat earlier helped explain/resolve the PC password question.\n\nIf I don't hear back by the end of the day, I'll assume you have no further questions and close the case.\n\nThanks and have a Great Weekend!\n\n\nRegards,\nMitchell Barber\nSystem Reliability Engineer | Nutanix | +1 (408)565-8845 | mitchell.barber@nutanix.com\nWorking hours:  Mon-Fri 8am-4pm EST\nCustomer Support Portal: http://portal.nutanix.com/\nFor immediate assistance on a case if I am out of the office or unavailable,\nplease call into Nutanix Support Hotline 1-855-NUTANIX, option 3.\n\nWant higher up time and Predictive Support - Try Insights - https://www.nutanix.com/products/insights",
      "contentPreview": "Hi Jeremy,\n\nI hope the info I seat earlier helped explain/resolve the PC password question.\n\nIf I don't hear back by the end of the day, I'll assume you have no further questions and close the case.\n\nThanks and have a Great Weekend!\n\n\nRegards,\nMitchell Barber\nSystem Reliability Engineer | Nutanix | +1 (408)565-8845 | mitchell.barber@nutanix.com\nWorking hours:  Mon-Fri 8am-4pm EST\nCustomer Support Portal: http://portal.nutanix.com/\nFor immediate assistance on a case if I am out of the office or u...",
      "hasAttachment": false,
      "direction": "outbound",
      "isCustomer": false,
      "timeSincePreviousHours": 17.02
    },
    {
      "sequence": 5,
      "type": "email",
      "id": "02sVO00000jILVWYA4",
      "timestamp": {
        "$date": "2025-11-07T08:43:16.000Z"
      },
      "subject": "Re: External: 02110474 | Account: First American Bank Corporation (del) | Subject: New PC and recently updated in <3 months being prompted for Admin password soon to expire | thread::UZHsrt4cfiGSjrSyJCiiLi4::",
      "from": {
        "name": "Jeremy S. Wietecha",
        "address": "jwietecha@firstambank.com"
      },
      "to": "support_case@nutanix.com",
      "cc": "mitchell.barber@nutanix.com; jwietecha@firstambank.com",
      "content": "Hello, the information you provided is sufficient.\nI am OK to close the case.\n\n\nThank you,\nJeremy Wietecha\n\n\nFirst American Bank\n\n700 Busse Rd.\n\nElk Grove Village, IL 60007\n\nOffice/Fax: (847) 586-2583\n\n\n\n \nFirst American Bank\nP.O. Box 0794\nElk Grove Village, IL 60009\nEqual Housing Lender Member FDIC\nhttps://urldefense.proofpoint.com/v2/url?u=http-3A__www.firstambank.com&d=DwIFAg&c=s883GpUCOChKOHiocYtGcg&r=Vb_G-NyjEWHi-ESC7cC3g_8HKo9dQWOoPeqtvCBgpFQ&m=1Ya9PsmtOpjpk_o7nUYPkXG_Aj9yuyBfuOQkHkBsl73iefnVpPr4l2pIwIc37jzb&s=KNUuGFr7WUCFtoClaYDx1XwRjLweT9MrYLlCX50vx2s&e= \n    \n\n\nIMPORTANT INFORMATION\nYour privacy and security is important to us. Please view our privacy and security information on our website at https://urldefense.proofpoint.com/v2/url?u=https-3A__www.firstambank.com_About_Explore_Policies-2Dand-2DNotices_Privacy-2Dand-2DSecurity&d=DwIFAg&c=s883GpUCOChKOHiocYtGcg&r=Vb_G-NyjEWHi-ESC7cC3g_8HKo9dQWOoPeqtvCBgpFQ&m=1Ya9PsmtOpjpk_o7nUYPkXG_Aj9yuyBfuOQkHkBsl73iefnVpPr4l2pIwIc37jzb&s=r4g3dkZZm0R0ds_VSiHWd2rV0-rOZG6rRcukprfh9S8&e= \n\n________________________________\nFrom: Nutanix Support <support_case@nutanix.com>\nSent: Friday, November 7, 2025 8:06 AM\nTo: Jeremy S. Wietecha <JWietecha@firstambank.com>\nCc: mitchell.barber@nutanix.com <mitchell.barber@nutanix.com>\nSubject: External: 02110474 | Account: First American Bank Corporation (del) | Subject: New PC and recently updated in <3 months being prompted for Admin password soon to expire | thread::UZHsrt4cfiGSjrSyJCiiLi4::\n\nHi Jeremy,\n\nI hope the info I seat earlier helped explain/resolve the PC password question.\n\nIf I don't hear back by the end of the day, I'll assume you have no further questions and close the case.\n\nThanks and have a Great Weekend!\n\n      FAB Security Alert External email, please review source prior to clicking links or attachments\n\n\n\nRegards,\nMitchell Barber\nSystem Reliability Engineer | Nutanix | +1 (408)565-8845 | mitchell.barber@nutanix.com\nWorking hours: Mon-Fri 8am-4pm EST\nCustomer Support Portal: http://portal.nutanix.com/ <https://urldefense.com/v3/__http://portal.nutanix.com/__;!!II7WptknKQ!WXoMXa4EZT4RrSHQG7DOdgVVW_jqpKHdg2JwFwsFel5D-HYL13gKop7I2lRqMPS7rzNaBKo_dze8BNgC1QEJzrfKLZs0$ >\nFor immediate assistance on a case if I am out of the office or unavailable,\nplease call into Nutanix Support Hotline 1-855-NUTANIX, option 3.\n\nWant higher up time and Predictive Support - Try Insights - https://www.nutanix.com/products/insights <https://urldefense.com/v3/__https://www.nutanix.com/products/insights__;!!II7WptknKQ!WXoMXa4EZT4RrSHQG7DOdgVVW_jqpKHdg2JwFwsFel5D-HYL13gKop7I2lRqMPS7rzNaBKo_dze8BNgC1QEJzp_BFNT9$ >",
      "contentPreview": "Hello, the information you provided is sufficient.\nI am OK to close the case.\n\n\nThank you,\nJeremy Wietecha\n\n\nFirst American Bank\n\n700 Busse Rd.\n\nElk Grove Village, IL 60007\n\nOffice/Fax: (847) 586-2583\n\n\n\n \nFirst American Bank\nP.O. Box 0794\nElk Grove Village, IL 60009\nEqual Housing Lender Member FDIC\nhttps://urldefense.proofpoint.com/v2/url?u=http-3A__www.firstambank.com&d=DwIFAg&c=s883GpUCOChKOHiocYtGcg&r=Vb_G-NyjEWHi-ESC7cC3g_8HKo9dQWOoPeqtvCBgpFQ&m=1Ya9PsmtOpjpk_o7nUYPkXG_Aj9yuyBfuOQkHkBsl73ie...",
      "hasAttachment": true,
      "direction": "inbound",
      "isCustomer": true,
      "timeSincePreviousHours": 0.12
    }
  ],
  "createdAt": {
    "$date": "2026-01-28T08:05:40.516Z"
  },
  "customer": {
    "accountName": "First American Bank Corporation (del)",
    "contactName": "Jeremy Wietecha",
    "contactEmail": "jwietecha@firstambank.com",
    "accountId": "0010e00001JRpluAAD",
    "contactId": "0037V00002X8QZWQA3"
  },
  "escalation": {
    "isEscalated": false,
    "escalatedDate": null,
    "escalationStatus": null,
    "escalationTemperature": null,
    "portalEscalationReason": null,
    "portalEscalationComments": null,
    "escalationIssueSummary": null,
    "escalationInformation": null,
    "previousActions": null,
    "deEscalationCriteria": null,
    "latestUpdate": null
  },
  "importedAt": {
    "$date": "2026-01-28T08:05:40.516Z"
  },
  "ownership": {
    "currentOwner": "Mitchell Barber",
    "ownerId": "0050e000006SH8WAAW",
    "threadId": "ref:00D60000000IUGi.500VO00000pIlbR:ref"
  },
  "resolution": {
    "resolutionNotes": "questions only about PC password policy",
    "firstResponseProvided": {
      "$date": "2025-11-05T12:47:08.000Z"
    },
    "reliefProvided": {
      "$date": "2025-11-06T15:35:19.000Z"
    }
  },
  "responseMetrics": {
    "avgResponseTimeHours": null,
    "medianResponseTimeHours": null,
    "minResponseTimeHours": null,
    "maxResponseTimeHours": null,
    "totalCustomerMessages": 1,
    "totalSupportResponses": 4,
    "totalResponsesCounted": 0,
    "responseTimesHours": [],
    "responseDetails": []
  },
  "source": "postgresql",
  "tags": {
    "openTags": [
      "Prism Central (Opentags)"
    ],
    "closeTags": [
      "Prism Central - PC Management"
    ]
  },
  "timeline": {
    "events": [
      {
        "id": "aJDVO000004mLo04AE",
        "name": "A-13116309",
        "type": "Case Creation",
        "category": "lifecycle",
        "timestamp": {
          "$date": "2025-11-05T10:12:13.000Z"
        },
        "status": "Unassigned",
        "priority": "P4 - Low",
        "escalated": false,
        "escalationStatus": null,
        "owner": "Unassigned",
        "details": null
      },
      {
        "id": "aJDVO000004mNpq4AE",
        "name": "A-13117025",
        "type": "Owner Change",
        "category": "ownership",
        "timestamp": {
          "$date": "2025-11-05T11:31:20.000Z"
        },
        "status": "Support Agent Assigned",
        "priority": "P4 - Low",
        "escalated": false,
        "escalationStatus": null,
        "owner": "Mitchell Barber",
        "details": null
      },
      {
        "id": "aJDVO000004mPWT4A2",
        "name": "A-13117695",
        "type": "Stale Case Reset",
        "category": "lifecycle",
        "timestamp": {
          "$date": "2025-11-05T12:47:13.000Z"
        },
        "status": "Support Agent Working",
        "priority": "P4 - Low",
        "escalated": false,
        "escalationStatus": null,
        "owner": "Mitchell Barber",
        "details": null
      },
      {
        "id": "aJDVO000004mRVA4A2",
        "name": "A-13118617",
        "type": "Stale Case Reset",
        "category": "lifecycle",
        "timestamp": {
          "$date": "2025-11-05T14:49:46.000Z"
        },
        "status": "Waiting for Customer",
        "priority": "P4 - Low",
        "escalated": false,
        "escalationStatus": null,
        "owner": "Mitchell Barber",
        "details": null
      },
      {
        "id": "aJDVO000004mtpZ4AQ",
        "name": "A-13129584",
        "type": "Stale Case Reset",
        "category": "lifecycle",
        "timestamp": {
          "$date": "2025-11-06T15:35:08.000Z"
        },
        "status": "Waiting for Customer",
        "priority": "P4 - Low",
        "escalated": false,
        "escalationStatus": null,
        "owner": "Mitchell Barber",
        "details": null
      },
      {
        "id": "aJDVO000004nFoY4AU",
        "name": "A-13136501",
        "type": "Stale Case Reset",
        "category": "lifecycle",
        "timestamp": {
          "$date": "2025-11-07T08:36:09.000Z"
        },
        "status": "Resolved - Waiting for Customer Approval",
        "priority": "P4 - Low",
        "escalated": false,
        "escalationStatus": null,
        "owner": "Mitchell Barber",
        "details": null
      },
      {
        "id": "aJDVO000004nPWC4A2",
        "name": "A-13140520",
        "type": "Case Closure",
        "category": "lifecycle",
        "timestamp": {
          "$date": "2025-11-07T17:14:10.000Z"
        },
        "status": "Closed",
        "priority": "P4 - Low",
        "escalated": false,
        "escalationStatus": null,
        "owner": "Mitchell Barber",
        "details": null
      }
    ],
    "categorized": {
      "lifecycle": [
        {
          "type": "Case Creation",
          "timestamp": {
            "$date": "2025-11-05T10:12:13.000Z"
          },
          "status": "Unassigned",
          "owner": "Unassigned"
        },
        {
          "type": "Stale Case Reset",
          "timestamp": {
            "$date": "2025-11-05T12:47:13.000Z"
          },
          "status": "Support Agent Working",
          "owner": "Mitchell Barber"
        },
        {
          "type": "Stale Case Reset",
          "timestamp": {
            "$date": "2025-11-05T14:49:46.000Z"
          },
          "status": "Waiting for Customer",
          "owner": "Mitchell Barber"
        },
        {
          "type": "Stale Case Reset",
          "timestamp": {
            "$date": "2025-11-06T15:35:08.000Z"
          },
          "status": "Waiting for Customer",
          "owner": "Mitchell Barber"
        },
        {
          "type": "Stale Case Reset",
          "timestamp": {
            "$date": "2025-11-07T08:36:09.000Z"
          },
          "status": "Resolved - Waiting for Customer Approval",
          "owner": "Mitchell Barber"
        },
        {
          "type": "Case Closure",
          "timestamp": {
            "$date": "2025-11-07T17:14:10.000Z"
          },
          "status": "Closed",
          "owner": "Mitchell Barber"
        }
      ],
      "ownership": [
        {
          "type": "Owner Change",
          "timestamp": {
            "$date": "2025-11-05T11:31:20.000Z"
          },
          "status": "Support Agent Assigned",
          "owner": "Mitchell Barber"
        }
      ],
      "escalation": [],
      "automation": [],
      "exceptions": [],
      "attachments": [],
      "other": []
    },
    "totalEvents": 7
  },
  "updatedAt": {
    "$date": "2026-01-28T08:05:40.516Z"
  }
};