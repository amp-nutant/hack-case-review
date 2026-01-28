import { useState, useRef, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  FlexLayout,
  FlexItem,
  Title,
  TextLabel,
  Button,
  Loader,
  StackingLayout,
  TextArea,
} from '@nutanix-ui/prism-reactjs';
import { sendChatMessage, clearChatHistory } from '../../redux/slices/analysisSlice';
import styles from './NLPChat.module.css';

const suggestedQuestions = [
  'What are the most common issues in this report?',
  'Show me cases with critical priority',
  'What patterns do you see in the data?',
  'Summarize the key findings',
  'Which cases should I prioritize?',
  'Are there any recurring problems?',
];

function NLPChat() {
  const { reportId } = useOutletContext();
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef(null);
  const dispatch = useDispatch();
  const { chatHistory, chatLoading } = useSelector((state) => state.analysis);

  // Demo chat history if empty
  const displayHistory = chatHistory.length > 0 ? chatHistory : [
    {
      role: 'assistant',
      content: 'Hello! I\'m your AI assistant for case analysis. Ask me anything about the cases in this report - I can help you identify patterns, summarize findings, and provide actionable insights.',
      timestamp: new Date().toISOString(),
    },
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [displayHistory]);

  const handleSend = async () => {
    if (!inputValue.trim() || chatLoading) return;

    const message = inputValue.trim();
    setInputValue('');

    try {
      await dispatch(sendChatMessage({ reportId, message })).unwrap();
    } catch (error) {
      console.error('Chat error:', error);
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

  return (
    <FlexLayout flexDirection="column" itemGap="L" className={styles.chatView} style={{ padding: '24px' }}>
      {/* Page Header */}
      <div className={styles.pageHeader}>
        <div className={styles.headerLeft}>
          <div className={styles.chatTitle}>
            <div className={styles.chatIcon}>
              <span role="img" aria-label="chat">💬</span>
            </div>
            <Title size="h2">NLP Chat</Title>
          </div>
          <div className={styles.messageBadge}>
            {displayHistory.length} {displayHistory.length === 1 ? 'message' : 'messages'}
          </div>
        </div>
        <button
          className={styles.clearButton}
          onClick={() => dispatch(clearChatHistory())}
        >
          <span>🗑️</span>
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
            {displayHistory.map((message, index) => (
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
                  <div className={styles.messageText}>{message.content}</div>
                </div>
              </div>
            ))}
            {chatLoading && (
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
              <textarea
                className={styles.chatInput}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask a question about your cases..."
                rows={2}
              />
            </div>
            <button
              className={styles.sendButton}
              onClick={handleSend}
              disabled={!inputValue.trim() || chatLoading}
            >
              Send
              <span className={styles.sendIcon}>→</span>
            </button>
          </div>
        </StackingLayout>
      </div>
    </FlexLayout>
  );
}

export default NLPChat;
