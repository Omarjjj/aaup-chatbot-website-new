import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
// import { enhancedContextService } from '../services/enhancedContextService';
import { simpleContextManager } from '../services/simpleContextManager';
import { Message, ConversationContext } from '../types/chat';
import { generateUUID } from '../utils/cryptoPolyfill';
import { captionGenerationService } from '../services/captionGenerationService';

export interface ChatHistory {
  id: string;
  caption: string;
  createdAt: string;
  firstMessage: string;
  messages: Message[];
  language?: string;
}

interface ChatStore {
  messages: Message[];
  isLoading: boolean;
  sessionId: string | null;
  conversationId: string | null;
  currentTopic: string | null;
  contextId: string | null;
  context: ConversationContext;
  clientContextId: string;
  previousQuery: string | null;
  chatHistories: ChatHistory[];
  messagesCount: number;
  addMessage: (text: string, isUser: boolean, metadata?: Record<string, any>) => void;
  setLoading: (loading: boolean) => void;
  setSessionId: (id: string | null) => void;
  setConversationId: (id: string | null) => void;
  setCurrentTopic: (topic: string | null) => void;
  setContextId: (id: string | null) => void;
  updateContext: (message: string, isUser: boolean) => void;
  resetContext: (fullReset?: boolean) => void;
  initializeSession: () => void;
  startNewConversation: () => void;
  setPreviousQuery: (query: string | null) => void;
  saveChatHistory: (caption?: string) => Promise<void>;
  loadChatHistory: (id: string) => void;
  deleteChatHistory: (id: string) => void;
  incrementMessagesCount: () => void;
  resetMessagesCount: () => void;
}

export const clearAllStorage = () => {
  localStorage.removeItem('aaup-chatbot-storage');
  sessionStorage.removeItem('aaup-chatbot-session');
  localStorage.removeItem('aaup_conversation_id');
  localStorage.removeItem('aaup-chatbot-context');
  
  console.log('All chat storage cleared');
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      messages: [],
      isLoading: false,
      sessionId: null,
      conversationId: null,
      currentTopic: null,
      contextId: null,
      clientContextId: uuidv4(),
      previousQuery: null,
      context: simpleContextManager.getOrCreateContext(uuidv4()), // Create initial context
      chatHistories: [],
      messagesCount: 0,
      
      addMessage: (text, isUser, metadata = {}) => {
        const state = get();
        if (!state.conversationId) return;

        // Update context first
        simpleContextManager.updateContext(text, isUser, state.conversationId);
        
        // Update previous query if it's a user message
        if (isUser) {
          set({ previousQuery: text });
          // Increment messages count only when user sends messages
          get().incrementMessagesCount();
        }
        
        // Then add message
        set((state) => ({
          messages: [
            ...state.messages,
            {
              id: generateUUID(),
              text,
              isUser,
              timestamp: new Date(),
              metadata: {
                ...metadata,
                sessionId: state.sessionId,
                contextId: state.clientContextId,
                currentTopic: state.currentTopic,
                previousQuery: state.previousQuery
              }
            }
          ],
          // Update local context from service
          context: simpleContextManager.getOrCreateContext(state.conversationId!)
        }));
      },
      
      setLoading: (loading) => set({ isLoading: loading }),
      setSessionId: (id) => set({ sessionId: id }),
      setConversationId: (id) => set({ conversationId: id }),
      setCurrentTopic: (topic) => set({ currentTopic: topic }),
      setContextId: (id) => set({ contextId: id }),
      
      updateContext: (message: string, isUser: boolean) => {
        const state = get();
        if (!state.conversationId) return;

        simpleContextManager.updateContext(message, isUser, state.conversationId);
        set({ context: simpleContextManager.getOrCreateContext(state.conversationId) });
      },
      
      setPreviousQuery: (query) => set({ previousQuery: query }),
      
      resetContext: (fullReset = true) => {
        if (fullReset) {
          const newId = uuidv4();
          localStorage.setItem('aaup_conversation_id', newId);
          
          set({
            messages: [],
            sessionId: uuidv4(),
            conversationId: newId,
            contextId: null,
            currentTopic: null,
            isLoading: false,
            clientContextId: uuidv4(),
            previousQuery: null,
            context: simpleContextManager.getOrCreateContext(newId),
            messagesCount: 0
          });
          
          console.log('Reset context with new conversation:', newId);
        } else {
          const state = get();
          if (state.conversationId) {
            simpleContextManager.resetContext(state.conversationId, false);
            set({ context: simpleContextManager.getOrCreateContext(state.conversationId) });
          }
        }
      },
      
      initializeSession: () => {
        const newSessionId = uuidv4();
        const savedConvId = localStorage.getItem('aaup_conversation_id') || uuidv4();
        
        set({
          sessionId: newSessionId,
          conversationId: savedConvId,
          messages: [],
          contextId: null,
          currentTopic: null,
          context: simpleContextManager.getOrCreateContext(savedConvId),
          messagesCount: 0
        });

        localStorage.setItem('aaup_conversation_id', savedConvId);
      },
      
      startNewConversation: () => {
        // Save current chat history before starting a new one
        const state = get();
        if (state.messages.length > 0) {
          get().saveChatHistory();
        }
        
        const newId = uuidv4();
        localStorage.setItem('aaup_conversation_id', newId);
        
        set({
          messages: [],
          conversationId: newId,
          contextId: null,
          currentTopic: null,
          context: simpleContextManager.getOrCreateContext(newId),
          messagesCount: 0
        });

        console.log('New conversation started:', newId);
      },
      
      saveChatHistory: async (caption?: string) => {
        const state = get();
        if (state.messages.length === 0) return;
        
        // Find the first user message
        const firstUserMessage = state.messages.find(msg => msg.isUser);
        
        if (!firstUserMessage) return;
        
        // If no caption is provided, try to generate one using AI
        let chatCaption = caption;
        if (!chatCaption) {
          try {
            // Get language from context or default to English
            const language = state.context?.language || 'en';
            
            // Try to generate a caption from the first user message
            const generatedCaption = await captionGenerationService.generateCaption(
              [firstUserMessage].map(msg => ({ 
                text: msg.text, 
                isUser: msg.isUser 
              })),
              language
            );
            
            // Use generated caption if available, otherwise fall back to first message
            chatCaption = generatedCaption || firstUserMessage.text.substring(0, 50) + (firstUserMessage.text.length > 50 ? '...' : '');
            
            console.log('Generated caption for chat history:', chatCaption);
          } catch (error) {
            console.error('Error generating caption:', error);
            // Fall back to first message if error
            chatCaption = firstUserMessage.text.substring(0, 50) + (firstUserMessage.text.length > 50 ? '...' : '');
          }
        }
        
        const chatHistory: ChatHistory = {
          id: state.conversationId || uuidv4(),
          caption: chatCaption,
          createdAt: new Date().toISOString(),
          firstMessage: firstUserMessage.text,
          messages: state.messages.map(msg => ({
            ...msg,
            timestamp: msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp)
          })),
          language: state.context?.language || 'en'
        };
        
        // Debug logging
        console.log('Saving chat history:', chatHistory.id, chatHistory.caption);
        console.log('Current chatHistories length:', state.chatHistories.length);
        
        // Update chatHistories state with the new or updated chat history
        const updatedHistories = [
          chatHistory, 
          ...state.chatHistories.filter(h => h.id !== chatHistory.id)
        ];
        
        set({ chatHistories: updatedHistories });
        console.log('Updated chatHistories length:', updatedHistories.length);
        
        // Manually save to localStorage as a fallback
        try {
          const storageData = {
            state: {
              messages: state.messages.map(msg => ({
                ...msg,
                timestamp: msg.timestamp instanceof Date ? msg.timestamp.toISOString() : msg.timestamp
              })),
              conversationId: state.conversationId,
              sessionId: state.sessionId,
              chatHistories: updatedHistories.map(h => ({
                ...h,
                messages: h.messages.map(msg => ({
                  ...msg,
                  timestamp: msg.timestamp instanceof Date ? msg.timestamp.toISOString() : msg.timestamp
                }))
              }))
            },
            version: 1
          };
          localStorage.setItem('chat-store', JSON.stringify(storageData));
        } catch (error) {
          console.error('Error manually saving to localStorage:', error);
        }
      },
      
      loadChatHistory: (id) => {
        const state = get();
        const history = state.chatHistories.find(h => h.id === id);
        
        if (!history) return;
        
        console.log('Loading chat history:', history.id, history.caption);
        
        // First reset the context to avoid any conflicts
        if (state.conversationId) {
          simpleContextManager.resetContext(state.conversationId, true);
        }
        
        // Set the basic chat state
        set({
          messages: history.messages.map(msg => ({
            ...msg,
            timestamp: msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp)
          })),
          conversationId: history.id,
          contextId: history.id,
          messagesCount: history.messages.filter(msg => msg.isUser).length,
          previousQuery: history.messages.find(msg => msg.isUser)?.text || null
        });
        
        // Update context based on the loaded message history
        try {
          // Create new context for the loaded conversation
          simpleContextManager.getOrCreateContext(history.id);
          
          // Add each message to the context in order
          history.messages.forEach(msg => {
            simpleContextManager.updateContext(msg.text, msg.isUser, history.id);
          });
          
          // Update the context in state
          set({
            context: simpleContextManager.getOrCreateContext(history.id)
          });
          
          console.log('Context restored for loaded chat');
        } catch (error) {
          console.error('Error restoring context for loaded chat:', error);
        }
        
        // Force update localStorage to ensure changes persist
        localStorage.setItem('aaup_conversation_id', history.id);
      },
      
      deleteChatHistory: (id) => {
        set((state) => ({
          chatHistories: state.chatHistories.filter(h => h.id !== id)
        }));
      },
      
      incrementMessagesCount: () => {
        set((state) => ({ messagesCount: state.messagesCount + 1 }));
      },
      
      resetMessagesCount: () => set({ messagesCount: 0 })
    }),
    {
      name: 'chat-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        messages: state.messages.map(msg => ({
          ...msg,
          timestamp: msg.timestamp instanceof Date ? msg.timestamp.toISOString() : msg.timestamp
        })),
        conversationId: state.conversationId,
        sessionId: state.sessionId,
        chatHistories: state.chatHistories.map(history => ({
          ...history,
          messages: history.messages.map(msg => ({
            ...msg,
            timestamp: msg.timestamp instanceof Date ? msg.timestamp.toISOString() : msg.timestamp
          }))
        }))
      }),
      version: 1
    }
  )
); 