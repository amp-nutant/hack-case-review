import { useState, useRef, useEffect } from 'react';
import {
  FlexLayout,
  Title,
  TextLabel,
  StackingLayout,
  UploadIcon,
  PlusCircleIcon,
  RemoveIcon,
  CloudIcon
} from '@nutanix-ui/prism-reactjs';
import styles from './NLPChat.module.css';

// Enhanced markdown renderer component
const FormattedMessage = ({ content }) => {
  // Process inline formatting (bold, italic, code, links, line breaks)
  const processInline = (text) => {
    if (!text) return text;
    
    // First, handle <br> tags by converting to actual line breaks
    // Replace all variations of <br> tags with a placeholder, then split
    const brPattern = /<br\s*\/?>/gi;
    if (typeof text === 'string' && brPattern.test(text)) {
      const parts = text.split(brPattern);
      return parts.flatMap((part, idx) => {
        const processed = processInlinePatterns(part);
        if (idx < parts.length - 1) {
          // Add line break after each part except the last
          return [...(Array.isArray(processed) ? processed : [processed]), <br key={`br-${idx}`} />];
        }
        return Array.isArray(processed) ? processed : [processed];
      });
    }
    
    return processInlinePatterns(text);
  };
  
  // Helper function for inline pattern processing
  const processInlinePatterns = (text) => {
    if (!text) return text;
    
    // Split by various inline patterns
    const patterns = [
      // Code (must come first to prevent other formatting inside code)
      { regex: /(`[^`]+`)/g, render: (match, i) => (
        <code key={`code-${i}`} className={styles.inlineCode}>{match.slice(1, -1)}</code>
      )},
      // Bold
      { regex: /(\*\*[^*]+\*\*)/g, render: (match, i) => (
        <strong key={`bold-${i}`}>{match.slice(2, -2)}</strong>
      )},
      // Italic
      { regex: /(\*[^*]+\*)/g, render: (match, i) => (
        <em key={`italic-${i}`}>{match.slice(1, -1)}</em>
      )},
    ];
    
    let result = [text];
    
    patterns.forEach(({ regex, render }) => {
      result = result.flatMap((part, partIndex) => {
        if (typeof part !== 'string') return [part];
        
        const matches = part.split(regex);
        return matches.map((segment, i) => {
          if (regex.test(segment)) {
            return render(segment, `${partIndex}-${i}`);
          }
          return segment;
        }).filter(s => s !== '');
      });
    });
    
    return result;
  };

  // Parse code block
  const parseCodeBlock = (text) => {
    const lines = text.split('\n');
    const firstLine = lines[0].replace('```', '').trim();
    const language = firstLine || 'text';
    const code = lines.slice(1, -1).join('\n');
    return { language, code };
  };

  // Process a single line
  const processLine = (line, index) => {
    // Headers
    if (line.startsWith('#### ')) {
      return <h5 key={index} className={styles.messageH5}>{processInline(line.substring(5))}</h5>;
    }
    if (line.startsWith('### ')) {
      return <h4 key={index} className={styles.messageH4}>{processInline(line.substring(4))}</h4>;
    }
    if (line.startsWith('## ')) {
      return <h3 key={index} className={styles.messageH3}>{processInline(line.substring(3))}</h3>;
    }
    if (line.startsWith('# ')) {
      return <h2 key={index} className={styles.messageH2}>{processInline(line.substring(2))}</h2>;
    }
    
    // Horizontal rule
    if (line.match(/^(-{3,}|_{3,}|\*{3,})$/)) {
      return <hr key={index} className={styles.horizontalRule} />;
    }
    
    // Checkboxes
    if (line.startsWith('- [ ] ')) {
      return (
        <div key={index} className={styles.checkboxItem}>
          <span className={styles.checkbox}>☐</span>
          <span>{processInline(line.substring(6))}</span>
        </div>
      );
    }
    if (line.startsWith('- [x] ') || line.startsWith('- [X] ')) {
      return (
        <div key={index} className={styles.checkboxItem}>
          <span className={styles.checkboxChecked}>☑</span>
          <span>{processInline(line.substring(6))}</span>
        </div>
      );
    }
    
    // Bullet points (-, *, •)
    if (line.match(/^[-*•]\s/)) {
      const content = line.substring(2);
      // Check for nested bullet
      const isNested = content.startsWith('  ');
      return (
        <div key={index} className={isNested ? styles.nestedBulletItem : styles.bulletItem}>
          <span className={styles.bullet}>•</span>
          <span>{processInline(isNested ? content.trim() : content)}</span>
        </div>
      );
    }
    
    // Numbered lists
    const numberedMatch = line.match(/^(\d+\.)\s(.*)$/);
    if (numberedMatch) {
      return (
        <div key={index} className={styles.numberedItem}>
          <span className={styles.number}>{numberedMatch[1]}</span>
          <span>{processInline(numberedMatch[2])}</span>
        </div>
      );
    }
    
    // Indented lines (sub-items)
    if (line.startsWith('   ') || line.startsWith('\t')) {
      return (
        <div key={index} className={styles.indentedLine}>
          {processInline(line.trim())}
        </div>
      );
    }
    
    // Status indicators (checkmarks and X marks)
    let processedLine = line;
    if (processedLine.includes('✓') || processedLine.includes('✗')) {
      const parts = processedLine.split(/(✓|✗)/g);
      return (
        <div key={index} className={styles.statusLine}>
          {parts.map((part, i) => {
            if (part === '✓') return <span key={i} className={styles.checkmark}>✓</span>;
            if (part === '✗') return <span key={i} className={styles.crossmark}>✗</span>;
            return <span key={i}>{processInline(part)}</span>;
          })}
        </div>
      );
    }
    
    // Regular line
    if (line.trim() === '') {
      return <div key={index} className={styles.emptyLine} />;
    }
    
    return <div key={index}>{processInline(line)}</div>;
  };

  const formatText = (text) => {
    if (!text) return null;
    
    const elements = [];
    const lines = text.split('\n');
    let i = 0;
    
    while (i < lines.length) {
      const line = lines[i];
      
      // Check for code block start
      if (line.startsWith('```')) {
        // Find code block end
        let codeBlockEnd = i + 1;
        while (codeBlockEnd < lines.length && !lines[codeBlockEnd].startsWith('```')) {
          codeBlockEnd++;
        }
        
        const codeLines = lines.slice(i, codeBlockEnd + 1);
        const { language, code } = parseCodeBlock(codeLines.join('\n'));
        
        elements.push(
          <div key={`code-block-${i}`} className={styles.codeBlock}>
            <div className={styles.codeHeader}>
              <span className={styles.codeLanguage}>{language}</span>
              <button 
                className={styles.copyButton}
                onClick={() => navigator.clipboard.writeText(code)}
                title="Copy code"
              >
                📋
              </button>
            </div>
            <pre className={styles.codeContent}>
              <code>{code}</code>
            </pre>
          </div>
        );
        
        i = codeBlockEnd + 1;
        continue;
      }
      
      // Check for table (lines starting with |)
      if (line.startsWith('|')) {
        const tableLines = [];
        let j = i;
        while (j < lines.length && lines[j].startsWith('|')) {
          tableLines.push(lines[j]);
          j++;
        }
        
        if (tableLines.length >= 2) {
          const rows = tableLines
            .filter(l => !l.match(/^\|[\s\-:]+\|$/)) // Filter out separator rows
            .map(l => l.split('|').filter(cell => cell.trim() !== ''));
          
          elements.push(
            <div key={`table-${i}`} className={styles.tableWrapper}>
              <table className={styles.markdownTable}>
                <thead>
                  <tr>
                    {rows[0]?.map((cell, ci) => (
                      <th key={ci}>{processInline(cell.trim())}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(1).map((row, ri) => (
                    <tr key={ri}>
                      {row.map((cell, ci) => (
                        <td key={ci}>{processInline(cell.trim())}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
          
          i = j;
          continue;
        }
      }
      
      // Regular line processing
      elements.push(processLine(line, i));
      i++;
    }
    
    return elements;
  };
  
  return <div className={styles.formattedContent}>{formatText(content)}</div>;
};

const suggestedQuestions = [
  'What are the top issue categories?',
  'Show me critical priority cases',
  // 'Give me a summary of all cases',
  'Show cases with validation issues',
  // 'What are the Prism Central issues?',
  'Tell me about case #02106340',
];

// Mock AI responses based on question keywords
const getMockResponse = (question) => {
  const q = question.toLowerCase();
  
  if (q.includes('common issues') || q.includes('most common')) {
    return "Based on my analysis of the cases, the most common issues are:\n\n1. **Prism Central Configuration** - 23% of cases relate to PC sizing and configuration\n2. **Storage Performance** - 18% involve storage latency or capacity issues\n3. **Network Connectivity** - 15% are related to network configuration problems\n4. **Upgrade Issues** - 12% involve AOS or PC upgrade complications\n\nI recommend focusing on proactive monitoring for these areas.";
  }
  
  if (q.includes('critical') || q.includes('priority')) {
    return "I found **8 cases** with critical priority that need immediate attention:\n\n• Case #02108891 - Production cluster down\n• Case #02107234 - Data loss risk identified\n• Case #02106890 - Security vulnerability detected\n\nThese cases have been open for an average of 3.2 days. Would you like me to provide more details on any specific case?";
  }
  
  if (q.includes('patterns')) {
    return "I've identified several interesting patterns in the data:\n\n📈 **Trend Analysis:**\n- Cases spike on Mondays (32% higher than average)\n- Storage-related issues increased 15% this month\n- Average resolution time: 4.5 days\n\n🔄 **Recurring Issues:**\n- 12 cases share similar root causes in network configuration\n- 8 cases are related to the same product version bug\n\nWould you like me to drill down into any of these patterns?";
  }
  
  if (q.includes('summarize') || q.includes('key findings')) {
    return "## Summary of Key Findings\n\n**Total Cases:** 186\n**Open:** 42 | **Closed:** 144\n\n**Priority Distribution:**\n- P1 (Critical): 8 cases\n- P2 (High): 24 cases\n- P3 (Normal): 112 cases\n- P4 (Low): 42 cases\n\n**Top Recommendations:**\n1. Address the 8 critical cases immediately\n2. Review recurring network configuration issues\n3. Consider proactive monitoring for storage systems";
  }
  
  if (q.includes('prioritize')) {
    return "Based on impact and urgency, here's my recommended prioritization:\n\n🔴 **Immediate Action (Today):**\n1. Case #02108891 - Production impact\n2. Case #02107234 - Data at risk\n\n🟠 **High Priority (This Week):**\n3. Case #02106890 - Security concern\n4. Case #02106540 - Multiple users affected\n\n🟡 **Normal Priority:**\n5-15. Various configuration and performance cases\n\nShall I create a detailed action plan for any of these?";
  }
  
  if (q.includes('recurring')) {
    return "Yes, I've identified **3 recurring problem patterns**:\n\n1. **Prism Central Memory Issues** (12 cases)\n   - Root cause: Undersized PC deployments\n   - Recommendation: Review sizing guidelines\n\n2. **Storage Latency Spikes** (8 cases)\n   - Root cause: Snapshot accumulation\n   - Recommendation: Implement snapshot policies\n\n3. **Network Timeout Errors** (6 cases)\n   - Root cause: MTU mismatch\n   - Recommendation: Standardize network config\n\nAddressing these patterns could prevent ~26 future cases.";
  }
  
  return "Thank you for your question! Based on my analysis of the 186 cases in this report, I can help you with:\n\n• Identifying trends and patterns\n• Prioritizing cases by impact\n• Finding recurring issues\n• Summarizing key findings\n\nCould you please be more specific about what aspect you'd like me to analyze?";
};

function NLPChat() {
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hello! I\'m your AI assistant for case analysis. Ask me anything about the cases in this report - I can help you identify patterns, summarize findings, and provide actionable insights.',
      timestamp: new Date().toISOString(),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = {
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date().toISOString(),
    };

    // Add user message immediately
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Call the real API with AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout
      
      const response = await fetch('/api/llm/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: userMessage.content,
          history: messages.slice(-10), // Send last 10 messages for context
        }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      const aiResponse = {
        role: 'assistant',
        content: data.content || 'Sorry, I could not process your request.',
        timestamp: new Date().toISOString(),
      };
      
      setMessages(prev => [...prev, aiResponse]);
    } catch (error) {
      console.error('Chat error:', error);
      
      let errorMessage = 'Sorry, there was an error processing your request. ';
      if (error.name === 'AbortError') {
        errorMessage += 'The request timed out. Please try again.';
      } else if (error.message) {
        errorMessage += error.message;
      } else {
        // Fallback to mock response if API fails
        errorMessage = getMockResponse(userMessage.content);
      }
      
      const aiResponse = {
        role: 'assistant',
        content: errorMessage,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, aiResponse]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestedQuestion = (question) => {
    setInputValue(question);
  };

  const handleClearChat = () => {
    setMessages([
      {
        role: 'assistant',
        content: 'Hello! I\'m your AI assistant for case analysis. Ask me anything about the cases in this report - I can help you identify patterns, summarize findings, and provide actionable insights.',
        timestamp: new Date().toISOString(),
      },
    ]);
  };

  return (
    <FlexLayout flexDirection="column" itemGap="L" className={styles.chatView} style={{ padding: '24px' }}>
      {/* Page Header */}
      <div className={styles.pageHeader}>
        <div className={styles.headerLeft}>
          <div className={styles.chatTitle}>
            <div className={styles.chatIcon}>
              <CloudIcon style={{ color: 'white' ,width: '20px', height: '20px' }} />
            </div>
            <Title size="h2">NLP Chat</Title>
          </div>
          <div className={styles.messageBadge}>
            {messages.length} {messages.length === 1 ? 'message' : 'messages'}
          </div>
        </div>
        <button
          className={styles.clearButton}
          onClick={handleClearChat}
        >
          <RemoveIcon />
          Clear Chat
        </button>
      </div>

      {/* Main Chat Container */}
      <div className={styles.chatContainer}>
        {/* Custom Header */}
        <div className={styles.widgetHeader}>
          <div className={styles.widgetHeaderContent}>
            <div className={styles.assistantAvatar}>
              <span role="img" aria-label="AI">🤖</span>
            </div>
            <div className={styles.assistantInfo}>
              <h3>AI Assistant</h3>
              <div className={styles.statusIndicator}>
                <span className={styles.statusDot}></span>
                Online & Ready to Help
              </div>
            </div>
          </div>
        </div>

        <StackingLayout itemSpacing="0px" className={styles.chatBody}>
          {/* Messages */}
          <div className={styles.messagesContainer}>
            {messages.map((message, index) => (
              <div
                key={index}
                className={`${styles.message} ${styles[message.role]}`}
              >
                <div className={styles.messageAvatar}>
                  {message.role === 'assistant' ? '🤖' : '👤'}
                </div>
                <div className={styles.messageContent}>
                  <div className={styles.messageHeader}>
                    <span className={styles.messageSender}>
                      {message.role === 'assistant' ? 'AI Assistant' : 'You'}
                    </span>
                    <span className={styles.messageTime}>
                      {new Date(message.timestamp).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                  </div>
                  <div className={styles.messageText}>
                    {message.role === 'assistant' ? (
                      <FormattedMessage content={message.content} />
                    ) : (
                      message.content
                    )}
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className={`${styles.message} ${styles.assistant}`}>
                <div className={styles.messageAvatar}>🤖</div>
                <div className={styles.loadingMessage}>
                  <div className={styles.typingIndicator}>
                    <span className={styles.typingDot}></span>
                    <span className={styles.typingDot}></span>
                    <span className={styles.typingDot}></span>
                  </div>
                  <TextLabel>AI is thinking...</TextLabel>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggestions */}
          <div className={styles.suggestionsContainer}>
            <div className={styles.suggestionsLabel}>
              Suggested questions
            </div>
            <div className={styles.suggestionsGrid}>
              {suggestedQuestions.map((question, index) => (
                <button
                  key={index}
                  className={styles.suggestionChip}
                  onClick={() => handleSuggestedQuestion(question)}
                >
                  {question}
                </button>
              ))}
            </div>
          </div>

          {/* Input */}
          <div className={styles.inputContainer}>
            <div className={styles.inputWrapper}>
              <button className={styles.addButton} aria-label="Add attachment">
                <PlusCircleIcon />
              </button>
              <textarea
                className={styles.chatInput}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask a question about your cases..."
                rows={1}
              />
              <button
                className={`${styles.sendButton} ${inputValue.trim() ? styles.sendButtonActive : ''}`}
                onClick={handleSend}
                disabled={!inputValue.trim() || isLoading}
                aria-label="Send message"
              >
                <UploadIcon />
              </button>
            </div>
          </div>
        </StackingLayout>
      </div>
    </FlexLayout>
  );
}

export default NLPChat;
