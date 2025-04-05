// ChatApp Component - With HMR Support
import React, { useEffect, useRef, useState } from 'react';
import { useChatStore, ChatHistory } from '../store/chatStore';
import { chatService } from '../services/api';
import { TypewriterEffect } from './TypewriterEffect';
import SuggestionPanel from './SuggestionPanel';
import { useLanguage } from '../contexts/LanguageContext';
import { useUnifiedContext } from '../contexts/UnifiedContextProvider';
import { motion, AnimatePresence } from 'framer-motion';
import { v4 as uuidv4 } from 'uuid';
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ConversationContext } from '../types/chat';
import { Link } from 'react-router-dom';
import { typoCorrectionService, CorrectionSuggestion } from '../services/typoCorrectionService';
import TypeCorrection from './TypeCorrection';
import NewChatButton from './NewChatButton';
import ChatHistorySidebar from './ChatHistorySidebar';

// Global styles for text selection and flowing patterns
const globalStyles = `
  ::selection {
    background-color: rgba(239, 68, 68, 0.2);
    color: inherit;
  }
  ::-moz-selection {
    background-color: rgba(239, 68, 68, 0.2);
    color: inherit;
  }

  /* Custom Scrollbar Styles */
  ::-webkit-scrollbar {
    width: 10px;
    height: 10px;
  }

  ::-webkit-scrollbar-track {
    background: rgba(239, 68, 68, 0.05);
    border-radius: 8px;
  }

  ::-webkit-scrollbar-thumb {
    background: linear-gradient(to bottom, rgba(239, 68, 68, 0.3), rgba(239, 68, 68, 0.5));
    border-radius: 8px;
    border: 2px solid rgba(255, 255, 255, 0.8);
  }

  ::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(to bottom, rgba(239, 68, 68, 0.5), rgba(239, 68, 68, 0.7));
  }

  /* Firefox Scrollbar Styles */
  * {
    scrollbar-width: thin;
    scrollbar-color: rgba(239, 68, 68, 0.5) rgba(239, 68, 68, 0.05);
  }

  .flowing-patterns {
    z-index: 0;
    position: fixed;
    pointer-events: none;
    width: 100vw;
    height: 100vh;
    overflow: visible;
  }

  .pattern {
    position: fixed;
    width: 28px; /* Smaller on mobile */
    height: 28px; /* Smaller on mobile */
    opacity: 0.4; /* Lower opacity on mobile */
    color: rgb(239, 68, 68);
    animation: gentle-float 15s infinite cubic-bezier(0.4, 0, 0.2, 1);
    pointer-events: auto;
    cursor: pointer;
    transition: transform 0.3s ease, opacity 0.3s ease, color 0.3s ease;
  }

  @media (min-width: 640px) {
    .pattern {
      width: 36px; /* Larger on desktop */
      height: 36px; /* Larger on desktop */
      opacity: 0.5; /* Higher opacity on desktop */
    }
  }

  .pattern:hover {
    opacity: 0.95;
    transform: scale(1.2);
    color: rgb(252, 165, 165);
    z-index: 10;
  }

  .pattern svg {
    width: 100%;
    height: 100%;
    animation: slow-pulse 8s infinite cubic-bezier(0.4, 0, 0.2, 1);
    transition: transform 0.3s ease;
  }

  .pattern:hover svg {
    animation: hover-pulse 1.5s infinite ease-in-out;
  }

  @keyframes hover-pulse {
    0%, 100% {
      transform: scale(1) rotate(0deg);
    }
    50% {
      transform: scale(1.1) rotate(5deg);
    }
  }

  @keyframes gentle-float {
    0% {
      transform: translate(0, 0) rotate(0deg) scale(1);
    }
    25% {
      transform: translate(12px, -12px) rotate(8deg) scale(1.08);
    }
    50% {
      transform: translate(0, -20px) rotate(0deg) scale(1);
    }
    75% {
      transform: translate(-12px, -12px) rotate(-8deg) scale(1.08);
    }
    100% {
      transform: translate(0, 0) rotate(0deg) scale(1);
    }
  }

  @keyframes slow-pulse {
    0%, 100% {
      transform: scale(1);
      opacity: 0.65;
    }
    50% {
      transform: scale(1.05);
      opacity: 0.8;
    }
  }

  /* Update pattern positions for mobile and desktop */
  @media (max-width: 640px) {
    /* Adjust pattern positions for mobile - fewer patterns with less motion */
    .pattern1 { top: 10%; left: 5%; animation-delay: -2s; }
    .pattern2 { top: 18%; right: 8%; animation-delay: -4s; }
    .pattern3 { top: 55%; left: 10%; animation-delay: -6s; }
    .pattern4 { top: 70%; right: 15%; animation-delay: -8s; }
    /* Hide some patterns on mobile for better performance */
    .pattern5, .pattern6, .pattern7, .pattern8, .pattern9, .pattern10 { display: none; }
  }

  @media (min-width: 641px) {
    /* Desktop pattern positions */
    .pattern1 { top: 15%; left: 10%; animation-delay: -2s; }
    .pattern2 { top: 25%; right: 15%; animation-delay: -4s; }
    .pattern3 { top: 60%; left: 20%; animation-delay: -6s; }
    .pattern4 { top: 75%; right: 25%; animation-delay: -8s; }
    .pattern5 { top: 35%; left: 40%; animation-delay: -10s; }
    .pattern6 { top: 85%; left: 55%; animation-delay: -12s; }
    .pattern7 { top: 45%; right: 30%; animation-delay: -14s; }
    .pattern8 { top: 65%; left: 70%; animation-delay: -16s; }
    .pattern9 { top: 10%; right: 45%; animation-delay: -18s; }
    .pattern10 { top: 50%; left: 85%; animation-delay: -20s; }
  }
`;

// Add style tag to document head
const styleTag = document.createElement('style');
styleTag.textContent = globalStyles;
document.head.appendChild(styleTag);

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  metadata?: Record<string, any>;
}



interface ChatStore {
  messages: Message[];
  isLoading: boolean;
  sessionId: string | null;
  conversationId: string | null;
  contextId: string | null;
  addMessage: (text: string, isUser: boolean, metadata?: Record<string, any>) => void;
  setLoading: (loading: boolean) => void;
  setSessionId: (id: string | null) => void;
  setConversationId: (id: string | null) => void;
  setContextId: (id: string | null) => void;
  updateContext: (message: string, isUser: boolean) => void;
  resetContext: (fullReset?: boolean) => void;
  initializeSession: () => void;
  startNewConversation: () => void;
  messagesCount: number;
  saveChatHistory: (caption?: string) => void;
  chatHistories: ChatHistory[];
}

const LoadingAnimation = () => {
  const { translations, language } = useLanguage();
  
  return (
    <div className={`flex ${language === 'ar' ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className="ai-loading-container" style={{
        marginLeft: language === 'ar' ? '0' : 'auto',
        marginRight: language === 'ar' ? 'auto' : '0',
        textAlign: language === 'ar' ? 'right' : 'left'
      }}>
        <div className="flex items-center" style={{ flexDirection: language === 'ar' ? 'row-reverse' : 'row' }}>
          <div className="ai-loading-icon">
            <div className="ai-loading-circle"></div>
            <div className="ai-loading-circle"></div>
            <div className="ai-loading-circle"></div>
          </div>
          <div className="ai-loading-text" style={{ marginRight: language === 'ar' ? '1rem' : '0', marginLeft: language === 'ar' ? '0' : '1rem' }}>
            <div className="ai-loading-title">{translations.loading.thinking}</div>
            <div className="ai-loading-subtitle" style={{ flexDirection: language === 'ar' ? 'row-reverse' : 'row' }}>
              {translations.loading.processing}
              <div className="ai-loading-dots" style={{ marginRight: language === 'ar' ? '0.25rem' : '0', marginLeft: language === 'ar' ? '0' : '0.25rem' }}>
                <div className="ai-loading-dot"></div>
                <div className="ai-loading-dot"></div>
                <div className="ai-loading-dot"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ChatApp: React.FC = () => {
  const {
    messages,
    sessionId,
    isLoading,
    setLoading,
    addMessage,
    initializeSession,
    startNewConversation: storeStartNewConversation,
    conversationId,
    setConversationId,
    setContextId,
    updateContext: storeUpdateContext,
    messagesCount,
    saveChatHistory,
    chatHistories
  } = useChatStore() as ChatStore;

  const { translations, language } = useLanguage();
  const { 
    updateContext, 
    getContextForResponse, 
    conversationId: unifiedConversationId,
    startNewConversation: unifiedStartNewConversation,
    isContextReady
  } = useUnifiedContext();

  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [isFirstMessage, setIsFirstMessage] = useState(true);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [animatedItems, setAnimatedItems] = useState<string[]>([]);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [typingComplete, setTypingComplete] = useState(false);
  const [typoCorrectionSuggestion, setTypoCorrectionSuggestion] = useState<CorrectionSuggestion | null>(null);
  const subtitleRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messageCountRef = useRef<number>(0);
  const [activeTopics, setActiveTopics] = useState<Array<{name: string, confidence: number, lastDiscussed: number}>>([]);
  const [topicTransitions, setTopicTransitions] = useState<Array<{from: string, to: string, timestamp: number, isExplicit?: boolean}>>([]);
  const [currentTopic, setCurrentTopic] = useState<string | null>(null);
  const [messageHasBeenSent, setMessageHasBeenSent] = useState(false);
  const [showNewConversationAlert, setShowNewConversationAlert] = useState(true);
  
  // State for sidebar
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // New state to track screen width for button sizing
  const [screenWidth, setScreenWidth] = useState(window.innerWidth);

  // Set up the window resize listener
  useEffect(() => {
    const handleResize = () => {
      setScreenWidth(window.innerWidth);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Define welcome messages array
  const welcomeMessages = [
    { id: 'main', text: translations.welcome.subtitle },
    { id: 'discover', text: translations.welcome.message || "Discover AAUP's Academic Excellence" },
    { id: 'explore', text: translations.welcome.description || "Explore Our Programs and Services" },
    { id: 'guide', text: "Your Gateway to Higher Education" },
    { id: 'support', text: "24/7 Support for Your Academic Journey" }
  ];

  // Update suggestions when language changes
  useEffect(() => {
    setSuggestions([
      translations.suggestions.admission,
      translations.suggestions.majors,
      translations.suggestions.contact,
      translations.suggestions.fees,
      translations.suggestions.campus,
      translations.suggestions.scholarships,
    ]);
  }, [language, translations]);

  // Initialize session on mount
  useEffect(() => {
    if (!initialized) {
      initializeSession();
      setInitialized(true);
    }
  }, [initialized, initializeSession]);

  // Reset isFirstMessage when messages are loaded from chat history
  useEffect(() => {
    if (messages.length > 0) {
      setIsFirstMessage(false);
      setMessageHasBeenSent(true);
    } else {
      setIsFirstMessage(true);
      setMessageHasBeenSent(false);
    }
  }, [messages.length]);

  // GSAP animation for welcome text - title only
  useGSAP(() => {
    if (isFirstMessage && titleRef.current) {
      gsap.set(titleRef.current, { 
        opacity: 0,
        y: 30,
        filter: "blur(10px)"
      });
      
      gsap.to(titleRef.current, {
        opacity: 1,
        y: 0,
        filter: "blur(0px)",
        duration: 0.8,
        ease: "power2.out",
        delay: 0.2
      });
      
      // Ensure subtitle is also animated
      if (subtitleRef.current) {
        subtitleRef.current.classList.add('animate-in');
      }
    }
  }, [isFirstMessage]);

  // Add scroll effect handler
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      setIsScrolled(scrollPosition > 20);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    if (isFirstMessage) {
      setIsFirstMessage(false);
    }

    setShowSuggestions(false);
    setMessageHasBeenSent(true);

    const userMessage = inputValue.trim();
    setInputValue('');
    setError(null);
    
    // Process the message with our enhanced topic detection
    await processMessageWithTopicDetection(userMessage);
  };

  // Show suggestions when input is focused
  const handleInputFocus = () => {
    setShowSuggestions(true);
  };

  const handleNewChat = () => {
    // Explicitly save current chat history before starting a new one
    if (messages.length > 0) {
      saveChatHistory();
    }
    
    unifiedStartNewConversation();
    storeStartNewConversation();
    setError(null);
    setInputValue('');
    setMessageHasBeenSent(false);
  };

  // Clear any existing timeouts when component unmounts
  useEffect(() => {
    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, []);

  // Monitor changes to subtitle animation
  const handleAnimationComplete = () => {
    // Only change message after animation cycle is complete
    setCurrentMessageIndex(prev => (prev + 1) % welcomeMessages.length);
  };

  // TypewriterText component with enhanced typing indicators
  const TypewriterText = ({ text, language }: { text: string, language: string }) => {
    const isRTL = language === 'ar';
    const [displayText, setDisplayText] = useState('');
    const [animationState, setAnimationState] = useState<'typing' | 'pausing' | 'deleting' | 'complete'>('typing');
    const [prevText, setPrevText] = useState(''); // Store previous text
    
    // Reset animation when text changes, but only if actually different
    useEffect(() => {
      if (text !== prevText) {
        setPrevText(text);
        setDisplayText('');
        setAnimationState('typing');
      }
    }, [text]);
    
    // Typing animation
    useEffect(() => {
      if (animationState === 'typing') {
        let currentIndex = 0;
        
        const typingInterval = setInterval(() => {
          if (currentIndex < text.length) {
            setDisplayText(text.substring(0, currentIndex + 1));
            currentIndex++;
          } else {
            clearInterval(typingInterval);
            setAnimationState('pausing');
          }
        }, 80); // Typing speed - adjust as needed
        
        return () => clearInterval(typingInterval);
      }
    }, [text, animationState]);
    
    // Pause after typing completes
    useEffect(() => {
      if (animationState === 'pausing') {
        const pauseTimer = setTimeout(() => {
          setAnimationState('deleting');
        }, 2000); // 2 seconds pause before deleting
        
        return () => clearTimeout(pauseTimer);
      }
    }, [animationState]);
    
    // Deletion animation
    useEffect(() => {
      if (animationState === 'deleting') {
        const deletingInterval = setInterval(() => {
          setDisplayText(prev => {
            if (prev.length > 0) {
              return prev.substring(0, prev.length - 1);
            } else {
              clearInterval(deletingInterval);
              setAnimationState('complete');
              return '';
            }
          });
        }, 30); // Faster deletion speed
        
        return () => clearInterval(deletingInterval);
      }
    }, [animationState]);
    
    // Notify when animation cycle is complete
    useEffect(() => {
      if (animationState === 'complete') {
        handleAnimationComplete();
      }
    }, [animationState]);
    
    // Calculate speed
    const calculateTypingSpeed = () => {
      // Random small variation to make typing feel more human
      return Math.random() * 0.3 + 0.85; // Speed factor between 0.85 and 1.15
    };
    
    // Show typing indicator only during typing
    const showTypingIndicator = animationState === 'typing';
    
    // Randomly add small timing variance to make typing feel more human
    const getRandomDelay = () => {
      return Math.random() * 0.2;
    };
    
    const cursorStyle = {
      animationDuration: `${1 * calculateTypingSpeed()}s`,
      animationDelay: `${getRandomDelay()}s`
    };

    return (
      <div className="typing-container" dir={isRTL ? 'rtl' : 'ltr'}>
        {/* For RTL (Arabic), cursor goes on the left */}
        {isRTL && (
          <span className="typing-cursor typing-cursor-rtl" style={cursorStyle}></span>
        )}
        
        <span className="typing-text">{displayText}</span>
        
        {/* For LTR (English), cursor goes on the right */}
        {!isRTL && (
          <span className="typing-cursor typing-cursor-ltr" style={cursorStyle}></span>
        )}
        
        {showTypingIndicator && (
          <div className="typing-active-indicator">
            <div className="typing-dot"></div>
            <div className="typing-dot"></div>
            <div className="typing-dot"></div>
          </div>
        )}
      </div>
    );
  };

  /**
   * Creates an enriched query by combining a follow-up question with context from previous messages
   * This helps create self-contained queries that don't rely on the backend's context tracking
   */
  const createEnrichedQuery = async (message: string, context: any): Promise<string | null> => {
    if (!context) return null;
    
    // If it's not a follow-up or confidence is low, return original message
    if (!context.isFollowUp || context.contextConfidence < 0.3) {
      return null;
    }
    
    // Check for possessive pronouns like "its" which strongly indicate subject reference
    if (message.toLowerCase().includes('its ') && context.subject) {
      // Extract what attribute is being asked about (e.g., "its fees" -> "fees")
      const match = message.toLowerCase().match(/its\s+(.+?)(?:\?|$)/i);
      if (match && match[1]) {
        const attribute = match[1].trim();
        // Create an explicit query that maintains the subject reference
        const enhancedQuery = language === 'ar' ? 
          `ما هي ${attribute} لـ ${context.subject}؟` : 
          `What is the ${attribute} for ${context.subject}?`;
        console.log('Enhanced possessive reference query:', enhancedQuery);
        return enhancedQuery;
      }
    }
    
    // Simple enrichment for demonstrating how it works with our new context
    let enrichedQuery = message;
    
    // Add subject if available and not in the message
    if (context.subject && !message.toLowerCase().includes(context.subject.toLowerCase())) {
      const subjectPrefix = language === 'ar' ? `بخصوص ${context.subject}، ` : `Regarding ${context.subject}, `;
      enrichedQuery = subjectPrefix + message;
    }
    
    // Add topic if available and not in the message
    if (context.topic && 
        !enrichedQuery.toLowerCase().includes(context.topic.toLowerCase()) && 
        context.topic !== context.subject) {
      const topicPhrase = language === 'ar' 
        ? ` (في موضوع ${context.topic})` 
        : ` (in the context of ${context.topic})`;
      enrichedQuery += topicPhrase;
    }
    
    return enrichedQuery !== message ? enrichedQuery : null;
  };

  const processMessageWithTopicDetection = async (message: string) => {
    if (!message.trim()) return;
    
    console.log('%c🔄 PROCESSING MESSAGE', 'background: #3a56a5; color: white; padding: 2px 4px; border-radius: 2px;');
    console.log('Original user message:', message);
    
    // Define the conversation and session IDs
    const conversationIdValue = conversationId || uuidv4();
    
    if (!conversationId) {
      console.warn('No conversation ID available, creating new one');
      setConversationId(conversationIdValue);
    }
    
    // Check for continuation queries like "okay", "and?", etc.
    const isContinuationQuery = /^(okay|ok|and\??|then\??|next\??|go on|continue|proceed|tell me more|yes|yeah|yep|sure|please do|go ahead|what else|anything else|more information|elaborate)$/i.test(message.toLowerCase().trim());
    
    if (isContinuationQuery && messages.length > 0) {
      console.log('%c🔄 CONTINUATION QUERY DETECTED', 'background: #9900cc; color: white; padding: 2px 4px; border-radius: 2px;');
      console.log('Treating as explicit continuation of previous conversation');
    }
    
    // STEP 1: Update context with the user's message using unified context
    updateContext(message, true);
    
    // STEP 2: Get updated context for response
    const contextForResponse = getContextForResponse();
    
    // STEP 3: Log current context state
    console.log('%c📋 CURRENT CONTEXT', 'background: #3a7756; color: white; padding: 2px 4px; border-radius: 2px;');
    console.log('Context:', contextForResponse);
    
    // STEP 4: Check if this is a follow-up question
    // For continuation queries, always treat as follow-up with high confidence
    const isFollowUp = isContinuationQuery ? true : (contextForResponse?.isFollowUp || false);
    const contextConfidence = isContinuationQuery ? 0.95 : (contextForResponse?.contextConfidence || 0);
    
    console.log('Is follow-up question:', isFollowUp);
    console.log('Context confidence:', contextConfidence);
    
    // STEP 5: If it's a follow-up, try to resolve references
    let enhancedMessage = message;
    
    // For continuation queries, reference the last topic/subject if available
    if (isContinuationQuery && contextForResponse) {
      // Get the most recent bot message to understand what we were just talking about
      const lastBotMessage = [...messages].reverse().find(msg => !msg.isUser);
      
      if (lastBotMessage) {
        console.log('Last bot message for context:', lastBotMessage.text.substring(0, 100) + '...');
        
        // Special handling for queries with "its" or other possessive pronouns
        if (message.toLowerCase().includes('its ') && contextForResponse.subject) {
          // Extract what attribute is being asked about (e.g., "its fees" -> "fees")
          const match = message.toLowerCase().match(/its\s+(.+?)(?:\?|$)/i);
          if (match && match[1]) {
            const attribute = match[1].trim();
            // Create an explicit query that maintains the subject reference
            enhancedMessage = language === 'ar' ? 
              `ما هي ${attribute} لـ ${contextForResponse.subject}؟ الرجاء تقديم معلومات محددة حول ${attribute} لـ ${contextForResponse.subject}.` : 
              `What is the ${attribute} for ${contextForResponse.subject}? Please provide specific information about ${contextForResponse.subject}'s ${attribute}.`;
            console.log('Enhanced possessive reference query:', enhancedMessage);
          } else {
            // Generic subject maintenance for "its" queries
            enhancedMessage = language === 'ar' ? 
              `أخبرني عن ${contextForResponse.subject}` : 
              `Tell me more about ${contextForResponse.subject}`;
            console.log('Enhanced subject maintenance query:', enhancedMessage);
          }
        }
        // Check if we have extracted topics from the bot's response
        else {
          const lastResponseTopics = contextForResponse.lastResponseTopics || [];
          console.log('Last response topics:', lastResponseTopics);
          
          // Create a more intelligent continuation prompt that specifically references topics extracted from the bot's last message
          if (lastResponseTopics && lastResponseTopics.length > 0) {
            // Use the primary topic from the bot's response
            enhancedMessage = language === 'ar' ? 
              `أكمل شرحك عن ${lastResponseTopics[0]}. قدم المزيد من التفاصيل عما كنت تتحدث عنه للتو.` : 
              `Continue your explanation about ${lastResponseTopics[0]}. Provide more specific details about what you were just discussing.`;
            console.log('Enhanced continuation query with extracted topic:', enhancedMessage);
          } else if (contextForResponse.subject) {
            enhancedMessage = language === 'ar' ? 
              `أخبرني المزيد عن ${contextForResponse.subject}. تابع من حيث توقفت للتو.` : 
              `Continue providing more detailed information about ${contextForResponse.subject}. Specifically, elaborate on what you just mentioned.`;
            console.log('Enhanced continuation query with subject continuation:', enhancedMessage);
          } else if (contextForResponse.topic) {
            enhancedMessage = language === 'ar' ? 
              `أكمل حديثك عن ${contextForResponse.topic}. أعطني معلومات إضافية حول ما كنت تتحدث عنه للتو.` : 
              `Continue your explanation about ${contextForResponse.topic}. Provide additional information about what you were just discussing.`;
            console.log('Enhanced continuation query with topic continuation:', enhancedMessage);
          } else {
            // If no clear subject/topic, create a generic continuation that references the previous message
            enhancedMessage = language === 'ar' ? 
              `أكمل إجابتك السابقة وقدم المزيد من المعلومات حول نفس الموضوع.` : 
              `Continue your previous answer and provide more information about the same topic.`;
            console.log('Enhanced continuation query with generic continuation:', enhancedMessage);
          }
        }
      }
    } else if (isFollowUp) {
      const resolvedMessage = await createEnrichedQuery(message, contextForResponse);
      if (resolvedMessage) {
        enhancedMessage = resolvedMessage;
        console.log('%c✨ ENRICHED QUERY', 'background: #6b3aa5; color: white; padding: 2px 4px; border-radius: 2px;');
        console.log('Original:', message);
        console.log('Enriched:', enhancedMessage);
        
        // Update context with enhanced message
        updateContext(enhancedMessage, true);
      }
    }
    
    // Set loading state
    setLoading(true);
    
    try {
      // STEP 6: Send the message to the API
      console.log('%c📤 SENDING TO API', 'background: #8c3aa5; color: white; padding: 2px 4px; border-radius: 2px;');
      console.log('Message being sent:', enhancedMessage);
      console.log('Is follow-up:', isFollowUp);
      
      // Add the user's message to the chat history
      addMessage(message, true, {
        currentTopic: contextForResponse?.topic,
        sessionId: sessionId,
        contextId: conversationIdValue,
        previousQuery: enhancedMessage,
        contextConfidence: contextConfidence,
        isContinuationQuery: isContinuationQuery
      });
      
      // Send the message to the API
      const responseData = await chatService.sendMessage(
        enhancedMessage, 
        sessionId,
        conversationIdValue,
        null,
        messages
      );
      
      // STEP 7: Add the bot's response to chat history
      console.log('%c📥 RECEIVED RESPONSE', 'background: #006128; color: white; padding: 2px 4px; border-radius: 2px;');
      console.log('Response:', responseData.response);
      console.log('Response metadata:', responseData.metadata);
      
      addMessage(
        responseData.response,
        false,
        {
          currentTopic: contextForResponse?.topic,
          wasFollowUp: isFollowUp,
          enhancedQuery: enhancedMessage !== message ? enhancedMessage : undefined,
          ...responseData.metadata
        }
      );
      
      // Update conversation ID if provided
      if (responseData.conversationId) {
        setConversationId(responseData.conversationId);
      }
      
      // Update context ID if provided
      if (responseData.contextId) {
        setContextId(responseData.contextId);
      }
      
      // STEP 8: Update context with the response
      updateContext(responseData.response, false);
      
      // Log final context after response
      const finalContext = getContextForResponse();
      console.log('%c📋 FINAL CONTEXT', 'background: #653a00; color: white; padding: 2px 4px; border-radius: 2px;');
      console.log('Final context:', finalContext);
      
    } catch (error) {
      console.error('%c❌ ERROR PROCESSING MESSAGE', 'background: #800000; color: white; padding: 2px 4px; border-radius: 2px;');
      console.error('Error:', error);
      
      setError('Failed to get response. Please try again.');
      
      // Add error message
      addMessage(
        'Sorry, there was an error processing your message. Please try again later.',
        false,
        { isError: true }
      );
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Check for references that need resolution in the message
   * (Keep existing checkForReferenceResolution function as a backup)
   */
  const checkForReferenceResolution = async (message: string, context: ConversationContext): Promise<string | null> => {
    console.log('%c🔍 RESOLVING REFERENCES', 'background: #630065; color: white; padding: 2px 4px; border-radius: 2px;');
    console.log('Analyzing message for references:', message);
    console.log('Current context:', {
      subject: context.currentSubject,
      topic: context.currentTopic,
      followUpCount: context.followUpCount,
      numbers: Object.fromEntries(context.lastNumbers)
    });
    
    // Check if we have previous messages
    if (messages.length < 2) {
      console.log('No previous messages to reference');
      return null;
    }
    
    // Get the last bot response
    const lastBotMessage = [...messages].reverse().find(msg => !msg.isUser);
    if (!lastBotMessage) {
      console.log('No previous bot message to reference');
      return null;
    }
    
    console.log('Last bot message:', lastBotMessage.text);
    
    // Check for very short queries that could be incomplete follow-ups
    if (message.split(/\s+/).length <= 2) {
      console.log('Very short query detected, likely a follow-up');
      
      // Expand based on context
      if (context.currentSubject) {
        const expandedQuery = `${message} for ${context.currentSubject}`;
        console.log('Expanded query with subject:', expandedQuery);
        return expandedQuery;
      }
    }
    
    // Check for pronouns and references that could be ambiguous
    const pronounRef = /^(what|how|when) (is|are|about) (it|this|that|these|those|they|them)/i;
    if (pronounRef.test(message)) {
      console.log('Pronoun reference detected');
      
      // Try to expand the query with context
      if (context.currentSubject) {
        const expandedQuery = message.replace(
          pronounRef, 
          `$1 $2 ${context.currentTopic || ''} ${context.currentSubject}`
        );
        console.log('Expanded pronoun reference:', expandedQuery);
        return expandedQuery;
      }
    }
    
    // Check for number references from previous messages
    const numberRefs = /^(how much is|what is) the (\w+)$/i;
    const match = message.match(numberRefs);
    if (match && match[2]) {
      console.log(`Reference to "${match[2]}" detected`);
      
      // Check if we have subjects or previous extractions that match
      if (context.currentSubject) {
        const expandedQuery = `${match[1]} the ${match[2]} for ${context.currentSubject}`;
        console.log('Expanded number reference query:', expandedQuery);
        return expandedQuery;
      }
    }
    
    // No reference expansion needed
    return null;
  };

  /**
   * Analyzes a message to detect topics with confidence scores
   * @param message - The message to analyze
   * @returns Array of detected topics with confidence scores
   */
  const analyzeMessageForTopics = (message: string): Array<{name: string, confidence: number}> => {
    const topics: Array<{name: string, confidence: number}> = [];
    
    // Define topic patterns with both English and Arabic support
    const topicPatterns = {
      admission: {
        en: /\b(admiss|enroll|apply|register|application|acceptance|requirements|criteria|transfer|documents|deadline)\w*\b/i,
        ar: /\b(قبول|تسجيل|التحاق|تقديم|طلب|التسجيل|متطلبات|معايير|تحويل|وثائق|موعد)\b/i,
        confidence: 0.75
      },
      academic: {
        en: /\b(course|study|studies|class|grade|exam|test|assignment|curriculum|program|major|minor|research|faculty|professor|lecture|semester|credit|graduation)\w*\b/i,
        ar: /\b(مساق|دراسة|صف|علامة|امتحان|اختبار|تكليف|منهج|برنامج|تخصص|بحث|هيئة تدريس|استاذ|محاضرة|فصل|ساعة معتمدة|تخرج)\w*\b/i,
        confidence: 0.75
      },
      financial: {
        en: /\b(fee|tuition|cost|payment|scholarship|grant|financial aid|loan|discount|installment|funding|sponsorship|billing)\w*\b/i,
        ar: /\b(رسوم|تكلفة|دفع|منحة|مساعدة مالية|قرض|خصم|قسط|تمويل|كفالة|فاتورة)\w*\b/i,
        confidence: 0.75
      },
      housing: {
        en: /\b(housing|dormitory|dorm|residence|accommodation|room|apartment|student housing|living|rent|roommate)\w*\b/i,
        ar: /\b(إسكان|مساكن|سكن|إقامة|غرفة|شقة|سكن طلابي|عيش|إيجار|زميل سكن)\w*\b/i,
        confidence: 0.75
      },
      student_life: {
        en: /\b(activity|club|organization|event|sport|recreation|gym|health|counseling|career|service|volunteer|internship|workshop)\w*\b/i,
        ar: /\b(نشاط|نادي|تنظيم|فعالية|رياضة|ترفيه|صالة رياضية|صحة|استشارة|وظيفة|خدمة|تطوع|تدريب|ورشة عمل)\w*\b/i,
        confidence: 0.75
      },
      facilities: {
        en: /\b(library|lab|laboratory|facility|building|campus|parking|cafeteria|wifi|internet|computer|equipment|technology)\w*\b/i,
        ar: /\b(مكتبة|مختبر|معمل|مرفق|مبنى|حرم جامعي|موقف سيارات|كافتيريا|واي فاي|إنترنت|حاسوب|معدات|تكنولوجيا)\w*\b/i,
        confidence: 0.75
      }
    };
    
    // Check for topic matches
    Object.entries(topicPatterns).forEach(([topic, pattern]) => {
      const regex = language === 'ar' ? pattern.ar : pattern.en;
      
      if (regex.test(message)) {
        // Calculate confidence based on number of matches and pattern strength
        const matches = message.match(regex) || [];
        const matchBoost = Math.min(matches.length * 0.05, 0.2); // Max boost of 0.2 for multiple matches
        
        topics.push({
          name: topic,
          confidence: pattern.confidence + matchBoost
        });
      }
    });
    
    // If no explicit topics were detected, look for general university topics
    if (topics.length === 0) {
      const generalUniversityPattern = {
        en: /\b(university|college|school|education|study|learn|student|academic|campus)\w*\b/i,
        ar: /\b(جامعة|كلية|مدرسة|تعليم|دراسة|تعلم|طالب|أكاديمي|حرم جامعي)\w*\b/i
      };
      
      const regex = language === 'ar' ? generalUniversityPattern.ar : generalUniversityPattern.en;
      
      if (regex.test(message)) {
        topics.push({
          name: 'general_university',
          confidence: 0.5
        });
      }
    }
    
    return topics;
  };

  // Update the unified context conversation ID if available
  useEffect(() => {
    if (unifiedConversationId && unifiedConversationId !== conversationId) {
      setConversationId(unifiedConversationId);
    }
  }, [unifiedConversationId, conversationId, setConversationId]);

  // Add this effect to automatically scroll to the bottom when messages change
  useEffect(() => {
    // Scroll to the bottom of the messages
    const scrollToBottom = () => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    };
    
    // Scroll when messages change or when loading state changes
    scrollToBottom();
    
    // Also set a small timeout to ensure scroll happens after DOM updates
    const timeoutId = setTimeout(scrollToBottom, 100);
    
    return () => clearTimeout(timeoutId);
  }, [messages, isLoading]);

  // Add this effect to automatically hide the new conversation alert after a few seconds
  useEffect(() => {
    if (showNewConversationAlert) {
      const timer = setTimeout(() => {
        setShowNewConversationAlert(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showNewConversationAlert]);

  // Handle input change with typo detection
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Prevent animation restart when typing
    e.stopPropagation();
    const newValue = e.target.value;
    setInputValue(newValue);
    
    // Only check for typos if there's enough content (at least 2 characters)
    if (newValue.trim().length > 2) {
      // Skip checking for common short phrases that don't need correction
      const commonPhrases = ['is the', 'in the', 'at the', 'on the', 'for the', 'to the', 'of the'];
      if (commonPhrases.some(phrase => newValue.trim().toLowerCase() === phrase)) {
        setTypoCorrectionSuggestion(null);
        return;
      }
      
      // Use the debounced version with a shorter delay for more responsive feedback
      typoCorrectionService.debouncedCorrectTypos(newValue, language, 300)
        .then(correction => {
          // Additional validation before showing the correction
          if (correction && correction.corrected) {
            // Don't show if the correction is the same as the input
            if (correction.corrected.trim() === newValue.trim()) {
              setTypoCorrectionSuggestion(null);
              return;
            }
            
            // Don't show if the correction is a common short phrase by itself
            if (commonPhrases.some(phrase => correction.corrected.trim().toLowerCase() === phrase)) {
              setTypoCorrectionSuggestion(null);
              return;
            }
            
            setTypoCorrectionSuggestion(correction);
          } else {
            setTypoCorrectionSuggestion(null);
          }
        })
        .catch(error => {
          console.error('Error getting typo correction:', error);
          setTypoCorrectionSuggestion(null);
        });
    } else {
      // Clear any existing correction suggestion for short inputs
      setTypoCorrectionSuggestion(null);
    }
  };

  // Apply the typo correction
  const applyTypoCorrection = (correctedText: string) => {
    if (!typoCorrectionSuggestion) {
      setTypoCorrectionSuggestion(null);
      return;
    }
    
    // Always replace the entire input with the corrected text passed from the button
    // This simplified approach avoids word-by-word replacement complexity
    setInputValue(correctedText);
    
    // Clear the typo suggestion after applying
    setTypoCorrectionSuggestion(null);
  };

  // Dismiss the typo correction
  const dismissTypoCorrection = () => {
    setTypoCorrectionSuggestion(null);
  };

  // Save chat history when messages change and there are messages to save
  useEffect(() => {
    if (messages.length > 0 && !isFirstMessage) {
      saveChatHistory();
    }
  }, [messages, saveChatHistory, isFirstMessage]);

  if (!initialized || !isContextReady) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-2 sm:px-4 max-w-4xl">
      {/* Sidebar toggle button */}
      <button 
        onClick={() => setSidebarOpen(true)}
        className={`fixed top-4 ${language === 'ar' ? 'left-4' : 'right-4'} z-[1005] bg-white rounded-full p-2 shadow-md hover:bg-gray-100 transition-colors`}
        aria-label="Open chat history"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
        </svg>
      </button>
      
      {/* Chat history sidebar */}
      <ChatHistorySidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="flex flex-col h-full">
        {/* Sophisticated Header */}
        <motion.header
          className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-in-out
                     ${isScrolled ? 'bg-white/80 backdrop-blur-lg shadow-lg' : 'bg-gradient-to-b from-red-50/40 to-transparent'}`}
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
        >
          <div className="relative overflow-hidden">
            {/* Glossy overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-red-50/80 via-white/60 to-transparent pointer-events-none" />
            
            {/* Animated shine effect */}
            <motion.div
              className="absolute inset-0 opacity-50"
              animate={{
                backgroundPosition: ['200% 0', '-200% 0'],
                transition: { duration: 3, repeat: Infinity, ease: 'linear' }
              }}
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
                backgroundSize: '200% 100%'
              }}
            />
            
            <div className="container mx-auto px-3 sm:px-6 py-2 sm:py-4">
              <div className="flex items-center justify-between relative z-10">
                {/* Logo and Title Section */}
                <motion.div 
                  className="flex items-center gap-2 sm:gap-4"
                  initial={{ opacity: 0, x: language === 'ar' ? 20 : -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                >
                  {/* Logo with enhanced styling and animations */}
                  <motion.div
                    className="relative group"
                    
                    
                  >
                    
                    
                    {/* Rotating border effect */}
                    <motion.div
                      style={{
                        background: 'conic-gradient(from 0deg, transparent, rgba(239, 68, 68, 0.3), transparent)',
                      }}
                      animate={{
                        rotate: [0, 360],
                      }}
                      transition={{
                        duration: 8,
                        repeat: Infinity,
                        ease: "linear"
                      }}
                    />

                    {/* Logo container with glass effect */}
                    <motion.div
                      className="relative bg-white/80 backdrop-blur-sm rounded-full p-2 shadow-lg
                               border border-red-200/50 overflow-hidden"
                      whileHover={{
                        boxShadow: "0 0 20px rgba(239, 68, 68, 0.3)",
                        borderColor: "rgba(239, 68, 68, 0.5)",
                      }}
                    >
                      {/* Logo image */}
                      <motion.img
                        src="/src/assets/logo.png"
                        alt="AAUP Logo"
                        className="h-8 sm:h-12 w-auto object-contain relative z-10"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        drag
                        dragConstraints={{
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                        }}
                        dragElastic={0.1}
                      />
                    </motion.div>

                    {/* Interactive particles on hover */}
                    <motion.div
                      
                    >
                      {[...Array(6)].map((_, i) => (
                        <motion.div
                          key={`particle-${i}`}
                          className="absolute w-1 h-1 bg-red-400 rounded-full"
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{
                            opacity: [0, 1, 0],
                            scale: [0.5, 1.5, 0.5],
                            x: [0, (i % 2 ? 20 : -20) * Math.cos(i * 60)],
                            y: [0, 20 * Math.sin(i * 60)],
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            delay: i * 0.2,
                            ease: "easeInOut",
                          }}
                        />
                      ))}
                    </motion.div>
                  </motion.div>
                  <motion.div 
                    className={`relative text-lg sm:text-2xl font-bold overflow-hidden
                              ${language === 'ar' ? 'text-right' : 'text-left'}`}
                    initial="hidden"
                    animate="visible"
                    dir={language === 'ar' ? 'rtl' : 'ltr'}
                  >
                    {/* Gradient background that sweeps across */}
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-red-600/20 via-red-500/20 to-red-800/20"
                      animate={{
                        x: language === 'ar' ? ['100%', '-100%'] : ['-100%', '100%'],
                      }}
                      transition={{
                        duration: 1.5,
                        ease: "easeInOut",
                        delay: 0.2,
                      }}
                    />
                    
                    {/* Text container for proper Arabic rendering */}
                    <motion.div
                      className="relative"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.5 }}
                    >
                      {language === 'ar' ? (
                        // Arabic text handling
                        <motion.div
                          className="inline-block"
                          initial={{ y: 40, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          transition={{ duration: 0.4 }}
                        >
                          <motion.span className="bg-gradient-to-r from-red-600 via-red-500 to-red-800 bg-clip-text text-transparent text-sm sm:text-base md:text-lg lg:text-xl max-w-[300px] sm:max-w-full inline-block font-bold whitespace-normal header-title arabic-title">
                             مساعد الذكي للجامعة 
                          </motion.span>
                        </motion.div>
                      ) : (
                        // Latin text handling with letter animation - fixed size consistency across devices
                        <motion.div className="whitespace-nowrap text-sm sm:text-base md:text-lg lg:text-xl header-title">
                        {translations.welcome.title.split('').map((char, index) => (
                          <motion.span
                            key={index}
                            className="inline-block bg-gradient-to-r from-red-600 via-red-500 to-red-800 bg-clip-text text-transparent"
                            initial={{ y: 40, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{
                              duration: 0.4,
                              delay: index * 0.03,
                              ease: [0.4, 0, 0.2, 1],
                            }}
                            whileHover={{
                              scale: 1.1,
                              transition: { duration: 0.1 }
                            }}
                          >
                            {char === ' ' ? '\u00A0' : char}
                          </motion.span>
                        ))}
                        </motion.div>
                      )}
                    </motion.div>
                  </motion.div>
                </motion.div>

                {/* Right Section with How to Use Button and Language Switcher */}
                <motion.div
                  className={`flex items-center gap-1 sm:gap-3 ${language === 'ar' ? 'justify-start pr-12 sm:pr-10' : 'justify-end pl-12 sm:pl-10'}`}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                >
                  {/* How to Use Button - Only show if no message has been sent yet */}
                  {!messageHasBeenSent && (
                    <Link to="/how-to-use" className={`sm:m-0 ${language === 'ar' ? 'mr-8 sm:mr-8' : 'ml-8 sm:ml-8'}`}>
                      <motion.button
                        className="relative overflow-hidden group z-[100] how-to-use-button"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {/* Button background with gradient and glass effect */}
                        <motion.div
                          className="absolute inset-0 rounded-full bg-gradient-to-r from-red-500/80 to-red-600/80 backdrop-blur-sm opacity-90"
                          animate={{
                            background: [
                              'linear-gradient(135deg, rgba(239, 68, 68, 0.8), rgba(220, 38, 38, 0.8))',
                              'linear-gradient(135deg, rgba(220, 38, 38, 0.8), rgba(239, 68, 68, 0.8))',
                              'linear-gradient(135deg, rgba(239, 68, 68, 0.8), rgba(220, 38, 38, 0.8))',
                            ],
                          }}
                          transition={{
                            duration: 3,
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                        />
                        
                        {/* Button content with better responsive sizing */}
                        <div className="relative flex items-center justify-center gap-1 sm:gap-2 text-white font-medium px-2 py-0.5 sm:px-3 sm:py-0.5 md:px-4">
                          {/* Icon with consistent sizing */}
                          <svg xmlns="http://www.w3.org/2000/svg" 
                            className="w-3 h-3 sm:w-4 sm:h-4"
                            viewBox="0 0 20 20" 
                            fill="currentColor"
                          >
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                          
                          {/* Text */}
                          <span>{translations.navigation.howToUse}</span>
                        </div>
                        
                        {/* Animated border */}
                        <motion.div />
                      </motion.button>
                    </Link>
                  )}
                  
                  {/* New chat button in header (only appears after 4 messages) */}
                  <NewChatButton 
                    visible={messagesCount >= 4} 
                    onNewChat={handleNewChat}
                    inHeader={true}
                  />
                  
                  <div className="relative">
                    {/* Language switcher will be automatically positioned here */}
                  </div>
                </motion.div>
              </div>
            </div>

            {/* Bottom border with gradient */}
            <motion.div 
              className="absolute bottom-0 left-0 right-0 h-[1px]"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(239, 68, 68, 0.2), transparent)'
              }}
            />

            
          </div>
        </motion.header>

        {/* Add padding to account for fixed header */}
        <div className="pt-16 sm:pt-20">
          {/* Floating Patterns */}
          <div className="flowing-patterns fixed inset-0 w-full h-screen overflow-hidden pointer-events-none">
            {/* Reduced number of patterns - only keeping 10 instead of 20 */}
            <div className="pattern pattern1">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <div className="pattern pattern2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
            </div>
            <div className="pattern pattern3">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-7 7c0 2.38 1.19 4.47 3 5.74V17a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-2.26c1.81-1.27 3-3.36 3-5.74a7 7 0 0 0-7-7z" />
              </svg>
            </div>
            <div className="pattern pattern4">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
            </div>
            <div className="pattern pattern5">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <line x1="3" y1="9" x2="21" y2="9" />
                <path d="M12 15l2 2 4-4" />
              </svg>
            </div>
            <div className="pattern pattern6">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <div className="pattern pattern7">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
              </svg>
            </div>
            <div className="pattern pattern8">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="4" y="2" width="16" height="20" rx="2" />
                <line x1="8" y1="6" x2="16" y2="6" />
                <line x1="8" y1="10" x2="10" y2="10" />
                <line x1="14" y1="10" x2="16" y2="10" />
                <line x1="8" y1="14" x2="10" y2="14" />
                <line x1="14" y1="14" x2="16" y2="14" />
                <line x1="8" y1="18" x2="10" y2="18" />
                <line x1="14" y1="18" x2="16" y2="18" />
              </svg>
            </div>
            <div className="pattern pattern9">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 3L1 9l11 6 11-6-11-6M1 9v6l11 6 11-6V9" />
              </svg>
            </div>
            <div className="pattern pattern10">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 3v18M3 12h18M4.93 4.93l14.14 14.14M19.07 4.93L4.93 19.07" />
              </svg>
            </div>
            {/* Patterns 11-20 removed to decrease visual clutter */}
          </div>

          <div className={`flex-1 overflow-y-auto p-2 sm:p-4 space-y-4 relative`}>
            {isFirstMessage ? (
              <div className="relative flex-1 flex items-center justify-center" style={{ zIndex: 1000, minHeight: "70vh" }}>
                <div 
                  className="new-welcome-container" 
                  key={language}
                >
                  <div className="welcome-glow-effect"></div>
                  <div className="welcome-content" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                    <h1 className="welcome-title">
                      {translations.welcome.title || "Welcome to AAUP Chatbot"}
                    </h1>
                    <p className="welcome-message">
                      {translations.welcome.subtitle || "Your guide to AAUP's academic excellence. Ask any question to get started."}
                    </p>
                    <div className="welcome-decoration">
                      <div className="welcome-circle"></div>
                      <div className="welcome-line"></div>
                      <div className="welcome-circle"></div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="messages-container w-full max-w-4xl mx-auto" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.isUser && language === 'ar' ? 'justify-end' : ''} mb-4`}
                    style={{ direction: language === 'ar' ? 'rtl' : 'ltr' }}
                  >
                    <div
                      className={`max-w-[90%] sm:max-w-[80%] p-3 sm:p-4 rounded-2xl ${
                        msg.isUser
                          ? 'bg-gradient-to-br from-rose-300 to-rose-400 shadow-md shadow-rose-200/50 backdrop-blur-sm border border-rose-200/50 text-white'
                          : 'ai-message'
                      }`}
                      style={{
                        marginLeft: language === 'ar' ? (msg.isUser ? 'auto' : '0') : (msg.isUser ? '0' : 'auto'),
                        marginRight: language === 'ar' ? (msg.isUser ? '0' : 'auto') : (msg.isUser ? 'auto' : '0')
                      }}
                    >
                      {msg.isUser ? (
                        <div className="whitespace-pre-wrap" style={{ textAlign: language === 'ar' ? 'right' : 'left' }}>{msg.text}</div>
                      ) : (
                        <div className="message-content" style={{ textAlign: language === 'ar' ? 'right' : 'left' }}>
                          {msg.metadata?.isError ? (
                            <div className="text-red-500">{msg.text}</div>
                          ) : (
                            <TypewriterEffect text={msg.text || 'Sorry, I received an empty response'} speed={30} />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div style={{ direction: language === 'ar' ? 'rtl' : 'ltr' }}>
                    <LoadingAnimation />
                  </div>
                )}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* New conversation notification */}
          <AnimatePresence>
            {showNewConversationAlert && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="fixed bottom-20 sm:bottom-24 left-1/2 transform -translate-x-1/2 bg-green-100 border border-green-200 text-green-800 px-4 py-2 rounded-lg shadow-lg z-30 flex items-center gap-2 max-w-[90%] sm:max-w-md text-sm sm:text-base"
              >
                <span className="text-green-500">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
                    <path d="m9 12 2 2 4-4"/>
                  </svg>
                </span>
                <span>
                  {language === 'ar' ? 'تم بدء محادثة جديدة' : 'New conversation started'}
                </span>
                <button 
                  onClick={() => setShowNewConversationAlert(false)}
                  className="ml-2 text-green-700 hover:text-green-900"
                >
                  ✕
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {error && (
            <div className="p-4 bg-red-100/90 text-red-700 text-center backdrop-blur-sm">
              {error}
            </div>
          )}

          <div className="chat-input-container animation-isolated bg-gradient-to-t from-white via-white/95 to-transparent py-4 sm:py-6 backdrop-blur-2xl fixed bottom-0 left-0 right-0 z-40">
            {/* TypeCorrection component positioned above the input field */}
            {typoCorrectionSuggestion && (
              <TypeCorrection 
                correction={typoCorrectionSuggestion}
                onApplyCorrection={applyTypoCorrection}
                onDismiss={dismissTypoCorrection}
                className="px-2 sm:px-4 max-w-2xl mx-auto"
              />
            )}
            
            <form onSubmit={handleSubmit} className="chat-input max-w-2xl mx-auto px-2 sm:px-4">
              <input
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                onFocus={(e) => {
                  // Prevent animation restart when focusing
                  e.stopPropagation();
                  handleInputFocus();
                }}
                placeholder={translations.input.placeholder}
                className="flex-1 px-4 sm:px-8 py-3 sm:py-4 rounded-xl bg-white/80 border-[2px] border-gray-100/50 focus:outline-none focus:border-[#f87171] focus:ring-4 focus:ring-red-200/40 transition-all duration-300 ease-out text-gray-800 placeholder-gray-400 text-base sm:text-lg tracking-wide font-medium"
                dir={language === 'ar' ? 'rtl' : 'ltr'}
                disabled={isLoading}
                style={{ position: 'relative', zIndex: 41 }}
              />
              <button
                type="submit"
                disabled={isLoading}
                className="send-button glossy-button frost-effect px-3 sm:px-5 py-3 sm:py-4 rounded-xl font-bold text-sm sm:text-base transition-all duration-300 ease-out transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-red-200/50 relative overflow-hidden min-w-[60px] sm:min-w-[80px] tracking-wide hover:-translate-y-1 active:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:translate-y-0 ml-2"
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  backdropFilter: 'blur(10px)',
                  boxShadow: '0 10px 25px -3px rgba(196, 30, 58, 0.15), 0 4px 10px -2px rgba(196, 30, 58, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.2) inset',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  position: 'relative',
                  zIndex: 41
                }}
                dir={language === 'ar' ? 'rtl' : 'ltr'}
              >
                <div className="absolute inset-0 rounded-xl overflow-hidden" style={{
                  background: 'radial-gradient(circle at center, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0.1) 70%)',
                  mixBlendMode: 'overlay'
                }}></div>
                <div className="absolute inset-0 rounded-xl overflow-hidden opacity-50" style={{
                  background: 'linear-gradient(45deg, transparent, rgba(255, 255, 255, 0.4), transparent)',
                  backgroundSize: '200% 200%',
                  animation: 'shimmer 3s infinite'
                }}></div>
                <span className="relative z-10 flex items-center justify-center text-red-400 font-semibold">
                  {isLoading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </span>
                  ) : (
                    <span className="flex items-center justify-center">
                      <span className="text-sm font-semibold tracking-wide text-red-400 drop-shadow-sm px-2">
                        {translations.input.send}
                      </span>
                    </span>
                  )}
                </span>
              </button>
            </form>
            
            {showSuggestions && (
              <div className="suggestions-wrapper mt-4 px-4">
                <SuggestionPanel 
                  suggestions={suggestions} 
                  onSuggestionClick={(suggestion) => {
                    setInputValue(suggestion);
                    setShowSuggestions(false);
                    handleSubmit(new Event('submit') as any);
                  }} 
                />
              </div>
            )}
          </div>

          {/* Topic Visualization panel - temporarily hidden */}
          {/* <div className="fixed top-20 right-4 z-10 w-80 opacity-90 hover:opacity-100 transition-opacity duration-200">
            <TopicVisualization 
              topics={activeTopics}
              transitions={topicTransitions}
              currentTopic={currentTopic}
            />
          </div> */}

          {/* Context Debug Panel - removed as requested */}
          {/* <ContextDebugPanel showByDefault={false} /> */}
        </div>
      </div>
    </div>
  );
}; 