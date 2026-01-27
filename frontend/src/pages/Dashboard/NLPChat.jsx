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
  DashboardWidgetLayout,
  DashboardWidgetHeader,
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
    <StackingLayout itemSpacing="16px" className={styles.chatView}>
      <FlexLayout justifyContent="space-between" alignItems="center">
        <FlexLayout flexDirection="column" itemSpacing="4px">
          <Title size="h3">NLP Chat</Title>
          <TextLabel type="secondary">
            Ask questions about your case data in natural language
          </TextLabel>
        </FlexLayout>
        <Button
          type="borderless"
          onClick={() => dispatch(clearChatHistory())}
        >
          Clear Chat
        </Button>
      </FlexLayout>

      <DashboardWidgetLayout
        className={styles.chatContainer}
        header={
          <DashboardWidgetHeader
            title="AI Assistant"
            showCloseIcon={false}
          />
        }
        bodyContent={
          <StackingLayout itemSpacing="0px" className={styles.chatBody}>
            {/* Messages */}
            <div className={styles.messagesContainer}>
              {displayHistory.map((message, index) => (
                <FlexLayout
                  key={index}
                  className={`${styles.message} ${styles[message.role]}`}
                  itemSpacing="12px"
                >
                  <div className={styles.messageAvatar}>
                    {message.role === 'assistant' ? '🤖' : '👤'}
                  </div>
                  <FlexLayout flexDirection="column" itemSpacing="4px" className={styles.messageContent}>
                    <FlexLayout itemSpacing="8px" alignItems="center">
                      <TextLabel className={styles.messageSender}>
                        {message.role === 'assistant' ? 'AI Assistant' : 'You'}
                      </TextLabel>
                      <TextLabel type="secondary" className={styles.messageTime}>
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </TextLabel>
                    </FlexLayout>
                    <div className={styles.messageText}>{message.content}</div>
                  </FlexLayout>
                </FlexLayout>
              ))}
              {chatLoading && (
                <FlexLayout className={`${styles.message} ${styles.assistant}`} itemSpacing="12px">
                  <div className={styles.messageAvatar}>🤖</div>
                  <FlexLayout alignItems="center" itemSpacing="8px">
                    <Loader size="small" />
                    <TextLabel>Analyzing...</TextLabel>
                  </FlexLayout>
                </FlexLayout>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Suggestions */}
            <div className={styles.suggestionsContainer}>
              <TextLabel type="secondary" className={styles.suggestionsLabel}>
                Suggested questions:
              </TextLabel>
              <FlexLayout itemSpacing="8px" flexWrap="wrap">
                {suggestedQuestions.map((question, index) => (
                  <Button
                    key={index}
                    type="secondary"
                    size="small"
                    onClick={() => handleSuggestedQuestion(question)}
                  >
                    {question}
                  </Button>
                ))}
              </FlexLayout>
            </div>

            {/* Input */}
            <FlexLayout className={styles.inputContainer} itemSpacing="12px" alignItems="flex-end">
              <FlexItem flexGrow="1">
                <TextArea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask a question about your cases..."
                  rows={2}
                />
              </FlexItem>
              <Button
                type="primary"
                onClick={handleSend}
                disabled={!inputValue.trim() || chatLoading}
              >
                Send
              </Button>
            </FlexLayout>
          </StackingLayout>
        }
      />
    </StackingLayout>
  );
}

export default NLPChat;
