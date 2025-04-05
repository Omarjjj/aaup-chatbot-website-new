import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { unifiedContextService } from '../services/unifiedContextService';
import { ConversationContext } from '../types/chat';
import { generateUUID } from '../utils/cryptoPolyfill';

// Define the context type
interface UnifiedContextProviderType {
  currentContext: ConversationContext | null;
  conversationId: string | null;
  updateContext: (message: string, isUser: boolean) => void;
  resetContext: (fullReset?: boolean) => void;
  startNewConversation: () => void;
  loadConversation: (convId: string) => void;
  getContextForResponse: () => any;
  isContextReady: boolean;
}

// Create the context
const UnifiedContextContext = createContext<UnifiedContextProviderType | undefined>(undefined);

// Provider component
export const UnifiedContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [currentContext, setCurrentContext] = useState<ConversationContext | null>(null);
  const [isContextReady, setIsContextReady] = useState(false);

  // Function to clear all context from localStorage
  const clearAllContextFromStorage = useCallback(() => {
    // Get all keys from localStorage
    const keys = Object.keys(localStorage);
    
    // Remove all context-related items
    keys.forEach(key => {
      if (key.startsWith('context_')) {
        localStorage.removeItem(key);
      }
    });
    
    // Remove conversation ID
    localStorage.removeItem('aaup_conversation_id');
  }, []);

  // Initialize with a fresh context on every page load
  useEffect(() => {
    // Clear all previous context
    clearAllContextFromStorage();
    
    // Generate a new conversation ID
    const newConvId = generateUUID();
    localStorage.setItem('aaup_conversation_id', newConvId);
    setConversationId(newConvId);
    
    // Set a session storage flag to track page refreshes
    sessionStorage.setItem('context_initialized', 'true');
    
    console.log('Context reset on page load, new conversation ID:', newConvId);
  }, [clearAllContextFromStorage]);

  // Load the context when conversation ID changes
  useEffect(() => {
    if (conversationId) {
      const context = unifiedContextService.getOrCreateContext(conversationId);
      setCurrentContext(context);
      setIsContextReady(true);
    }
  }, [conversationId]);

  // Function to update context
  const updateContext = useCallback((message: string, isUser: boolean) => {
    if (!conversationId) return;
    
    // Update context and get the updated version
    unifiedContextService.updateContext(message, isUser, conversationId);
    const updatedContext = unifiedContextService.getOrCreateContext(conversationId);
    setCurrentContext(updatedContext);
  }, [conversationId]);

  // Function to reset context
  const resetContext = useCallback((fullReset: boolean = true) => {
    if (!conversationId) return;
    
    unifiedContextService.resetContext(conversationId, fullReset);
    const resetContext = unifiedContextService.getOrCreateContext(conversationId);
    setCurrentContext(resetContext);
  }, [conversationId]);

  // Function to start a new conversation
  const startNewConversation = useCallback(() => {
    // Clear existing context
    clearAllContextFromStorage();
    
    // Generate a new conversation ID
    const newConvId = generateUUID();
    localStorage.setItem('aaup_conversation_id', newConvId);
    setConversationId(newConvId);
    
    // Reset context data for this new conversation
    setIsContextReady(false);
    setTimeout(() => {
      const newContext = unifiedContextService.getOrCreateContext(newConvId);
      setCurrentContext(newContext);
      setIsContextReady(true);
    }, 100);
  }, [clearAllContextFromStorage]);

  // Function to load an existing conversation
  const loadConversation = useCallback((convId: string) => {
    if (!convId) return;
    
    // Set the conversation ID
    localStorage.setItem('aaup_conversation_id', convId);
    setConversationId(convId);
    
    // Reset context data for this conversation
    setIsContextReady(false);
    
    // Load or create the context for this conversation
    setTimeout(() => {
      const loadedContext = unifiedContextService.getOrCreateContext(convId);
      setCurrentContext(loadedContext);
      setIsContextReady(true);
      console.log('Loaded conversation context for ID:', convId);
    }, 100);
  }, []);

  // Function to get context for response generation
  const getContextForResponse = useCallback(() => {
    if (!conversationId) return null;
    return unifiedContextService.getContextForResponse(conversationId);
  }, [conversationId]);

  // Provide the context value
  const contextValue: UnifiedContextProviderType = {
    currentContext,
    conversationId,
    updateContext,
    resetContext,
    startNewConversation,
    loadConversation,
    getContextForResponse,
    isContextReady
  };

  return (
    <UnifiedContextContext.Provider value={contextValue}>
      {children}
    </UnifiedContextContext.Provider>
  );
};

// Hook for using the context
export const useUnifiedContext = () => {
  const context = useContext(UnifiedContextContext);
  if (context === undefined) {
    throw new Error('useUnifiedContext must be used within a UnifiedContextProvider');
  }
  return context;
}; 