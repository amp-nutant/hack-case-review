import { query } from '../config/postgres.js';

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