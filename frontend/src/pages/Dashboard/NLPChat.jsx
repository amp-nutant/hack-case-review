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

// Simple markdown renderer component
const FormattedMessage = ({ content }) => {
  const formatText = (text) => {
    // Split by double newlines for paragraphs
    const paragraphs = text.split('\n\n');
    
    return paragraphs.map((paragraph, pIndex) => {
      // Check if it's a header (## )
      if (paragraph.startsWith('## ')) {
        return (
          <h3 key={pIndex} className={styles.messageH3}>
            {paragraph.substring(3)}
          </h3>
        );
      }
      
      // Process lines within paragraph
      const lines = paragraph.split('\n');
      const processedLines = lines.map((line, lIndex) => {
        // Check for list items (• or - or numbered)
        const isBullet = line.startsWith('• ') || line.startsWith('- ');
        const isNumbered = /^\d+\.\s/.test(line);
        const isIndented = line.startsWith('   ');
        
        // Process inline formatting (bold **)
        const processInline = (text) => {
          const parts = text.split(/(\*\*[^*]+\*\*)/g);
          return parts.map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={i}>{part.slice(2, -2)}</strong>;
            }
            return part;
          });
        };
        
        if (isBullet) {
          return (
            <div key={lIndex} className={styles.bulletItem}>
              <span className={styles.bullet}>•</span>
              <span>{processInline(line.substring(2))}</span>
            </div>
          );
        }
        
        if (isNumbered) {
          const match = line.match(/^(\d+\.)\s(.*)$/);
          return (
            <div key={lIndex} className={styles.numberedItem}>
              <span className={styles.number}>{match[1]}</span>
              <span>{processInline(match[2])}</span>
            </div>
          );
        }
        
        if (isIndented) {
          return (
            <div key={lIndex} className={styles.indentedLine}>
              {processInline(line.trim())}
            </div>
          );
        }
        
        return (
          <div key={lIndex}>
            {processInline(line)}
          </div>
        );
      });
      
      return (
        <div key={pIndex} className={styles.messageParagraph}>
          {processedLines}
        </div>
      );
    });
  };
  
  return <div className={styles.formattedContent}>{formatText(content)}</div>;
};

const suggestedQuestions = [
  'What are the most common issues in this report?',
  'Show me cases with critical priority',
  'What patterns do you see in the data?',
  'Summarize the key findings',
  'Which cases should I prioritize?',
  'Are there any recurring problems?',
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

    // Simulate AI thinking delay
    setTimeout(() => {
      const aiResponse = {
        role: 'assistant',
        content: getMockResponse(userMessage.content),
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, aiResponse]);
      setIsLoading(false);
    }, 1000 + Math.random() * 1000); // Random delay between 1-2 seconds
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
