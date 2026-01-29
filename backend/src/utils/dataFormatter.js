/**
 * Extract only the "Actions Taken" section from closure summary
 * Filters out greetings, signatures, and boilerplate text
 * 
 * @param {string} closureSummary - Full closure summary text
 * @returns {Object} Extracted actions and metadata
 */
export function extractActionsTaken(closureSummary) {
  if (!closureSummary) {
    return { actions: [], rawText: '', hasActions: false };
  }

  const text = closureSummary.trim();
  
  // Common section headers to look for (case-insensitive)
  const actionHeaders = [
    /actions?\s*taken:?/i,
    /troubleshooting\s*steps:?/i,
    /steps\s*taken:?/i,
    /what\s*was\s*done:?/i,
    /resolution\s*steps:?/i,
    /work\s*performed:?/i,
  ];

  // Signature/footer patterns to stop at
  const signaturePatterns = [
    /^thank\s*you,?\s*$/i,
    /^thanks,?\s*$/i,
    /^best\s*regards,?/i,
    /^regards,?/i,
    /^sincerely,?/i,
    /^cheers,?/i,
    /nutanix\s*support/i,
    /systems?\s*reliability\s*engineer/i,
    /customer\s*support\s*portal/i,
    /business\s*hours:/i,
    /^thread::/i,
    /^\s*[-_]{3,}\s*$/,  // Horizontal lines
  ];

  // Find the start of actions section
  let startIndex = -1;
  let sectionHeader = '';
  
  for (const pattern of actionHeaders) {
    const match = text.match(pattern);
    if (match) {
      startIndex = match.index + match[0].length;
      sectionHeader = match[0];
      break;
    }
  }

  if (startIndex === -1) {
    // No explicit actions section found - try to extract action-like lines
    const actionLines = extractActionLines(text, signaturePatterns);
    return {
      actions: actionLines,
      rawText: actionLines.join('\n'),
      hasActions: actionLines.length > 0,
      sectionFound: false,
    };
  }

  // Extract text after the header until signature
  const afterHeader = text.substring(startIndex);
  const lines = afterHeader.split('\n');
  const actions = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Stop if we hit a signature pattern
    if (signaturePatterns.some(pattern => pattern.test(trimmed))) {
      break;
    }
    
    // Skip empty lines
    if (!trimmed) continue;
    
    // Extract action items (lines starting with +, -, •, *, or numbered)
    if (/^[+\-•*]\s*/.test(trimmed)) {
      const action = trimmed.replace(/^[+\-•*]\s*/, '').trim();
      if (action) actions.push(action);
    } else if (/^\d+[.)]\s*/.test(trimmed)) {
      const action = trimmed.replace(/^\d+[.)]\s*/, '').trim();
      if (action) actions.push(action);
    } else if (trimmed && actions.length === 0) {
      // First non-empty line after header might be an action without bullet
      actions.push(trimmed);
    } else if (trimmed && !trimmed.includes('@') && !trimmed.includes('http')) {
      // Continuation of actions (not email or URL)
      actions.push(trimmed);
    }
  }

  return {
    actions,
    rawText: actions.join('\n'),
    hasActions: actions.length > 0,
    sectionFound: true,
    sectionHeader: sectionHeader.trim(),
  };
}

/**
 * Extract lines that look like actions even without explicit header
 */
function extractActionLines(text, signaturePatterns) {
  const lines = text.split('\n');
  const actions = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Stop at signature
    if (signaturePatterns.some(pattern => pattern.test(trimmed))) {
      break;
    }
    
    // Look for bullet-style action items
    if (/^[+\-•*]\s*.+/.test(trimmed)) {
      const action = trimmed.replace(/^[+\-•*]\s*/, '').trim();
      if (action && action.length > 5) { // Skip very short items
        actions.push(action);
      }
    }
  }
  
  return actions;
}

/**
 * Format extracted actions for LLM prompt
 * 
 * @param {string} closureSummary - Full closure summary
 * @returns {string} Formatted actions for LLM
 */
export function formatActionsForLLM(closureSummary) {
  const { actions, hasActions } = extractActionsTaken(closureSummary);
  
  if (!hasActions) {
    return 'No specific actions documented.';
  }
  
  return actions.map((action, i) => `${i + 1}. ${action}`).join('\n');
}

export function cleanHtmlForLLM(html) {
  if (!html) return '';
  
  // 1. Remove script and style tags entirely
  let cleaned = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  
  // 2. Remove HTML comments
  cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '');
  
  // 3. Remove all attributes except href (for links context)
  cleaned = cleaned.replace(/<(\w+)\s+[^>]*?(href="[^"]*")?[^>]*>/gi, (match, tag, href) => {
    return href ? `<${tag} ${href}>` : `<${tag}>`;
  });
  
  // 4. Convert to readable text while keeping structure
  cleaned = cleaned
    // Headers → Markdown-style
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '\n# $1\n')
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '\n## $1\n')
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '\n### $1\n')
    // Lists
    .replace(/<li[^>]*>(.*?)<\/li>/gi, '• $1\n')
    .replace(/<\/?(ul|ol)[^>]*>/gi, '\n')
    // Paragraphs and line breaks
    .replace(/<p[^>]*>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    // Bold/Strong
    .replace(/<(strong|b)[^>]*>(.*?)<\/\1>/gi, '**$2**')
    // Italic/Emphasis
    .replace(/<(em|i)[^>]*>(.*?)<\/\1>/gi, '_$2_')
    // Code blocks
    .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
    .replace(/<pre[^>]*>(.*?)<\/pre>/gis, '\n```\n$1\n```\n')
    // Links - keep URL for context
    .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '$2 ($1)')
    // Tables - simplified
    .replace(/<tr[^>]*>/gi, '\n')
    .replace(/<td[^>]*>(.*?)<\/td>/gi, '$1 | ')
    .replace(/<th[^>]*>(.*?)<\/th>/gi, '**$1** | ')
    // Remove remaining tags
    .replace(/<[^>]+>/g, '')
    // Decode HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    // Clean up whitespace
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .trim();
  
  return cleaned;
}