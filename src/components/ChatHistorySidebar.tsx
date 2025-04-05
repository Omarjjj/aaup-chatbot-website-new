import React, { useState, useEffect } from 'react';
import { useChatStore, ChatHistory } from '../store/chatStore';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';
import { useUnifiedContext } from '../contexts/UnifiedContextProvider';
import NewChatButton from './NewChatButton';

interface ChatHistorySidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const ChatHistorySidebar: React.FC<ChatHistorySidebarProps> = ({ isOpen, onClose }) => {
  const { chatHistories, loadChatHistory, deleteChatHistory, saveChatHistory, messages } = useChatStore();
  const { translations, language } = useLanguage();
  const { loadConversation } = useUnifiedContext();
  const [deleteConfirmation, setDeleteConfirmation] = useState<string | null>(null);
  const [localHistories, setLocalHistories] = useState<ChatHistory[]>([]);

  // Force save the current chat when the sidebar opens
  useEffect(() => {
    if (isOpen && messages.length > 0) {
      console.log('Sidebar opened, saving current chat history');
      saveChatHistory().catch(err => {
        console.error('Error saving chat history:', err);
      });
    }
  }, [isOpen, saveChatHistory, messages]);

  // Update local histories when chatHistories change or when sidebar opens
  useEffect(() => {
    console.log('Chat histories in store:', chatHistories?.length || 0);
    setLocalHistories(chatHistories || []);

    // Try to retrieve from localStorage directly as a fallback
    if ((!chatHistories || chatHistories.length === 0) && isOpen) {
      try {
        const storedData = localStorage.getItem('chat-store');
        if (storedData) {
          const parsed = JSON.parse(storedData);
          if (parsed.state?.chatHistories && parsed.state.chatHistories.length > 0) {
            console.log('Found chat histories in localStorage:', parsed.state.chatHistories.length);
            setLocalHistories(parsed.state.chatHistories);
          }
        }
      } catch (error) {
        console.error('Error parsing chat histories from localStorage:', error);
      }
    }
  }, [chatHistories, isOpen]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleChatSelect = async (id: string) => {
    console.log('Selecting chat history:', id);
    
    // First save the current chat if there are messages
    if (messages.length > 0) {
      await saveChatHistory();
    }
    
    // Load the selected chat history in store
    loadChatHistory(id);
    
    // Also load the conversation in the unified context
    loadConversation(id);
    
    // Close the sidebar
    onClose();
  };

  const handleDelete = (id: string) => {
    if (deleteConfirmation === id) {
      deleteChatHistory(id);
      setDeleteConfirmation(null);
    } else {
      setDeleteConfirmation(id);
    }
  };

  const handleNewChat = async () => {
    // Save current chat if needed
    if (messages.length > 0) {
      await saveChatHistory();
    }
    
    // Start a new conversation instead of clearing messages
    useChatStore.getState().startNewConversation();
    
    // Close the sidebar
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm z-[1010]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          
          <motion.div
            className={`fixed top-0 ${language === 'ar' ? 'left-0' : 'right-0'} bottom-0 w-80 bg-white shadow-xl z-[1020] flex flex-col border-l border-red-200`}
            initial={{ x: language === 'ar' ? '-100%' : '100%' }}
            animate={{ x: 0 }}
            exit={{ x: language === 'ar' ? '-100%' : '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            <div className="p-4 border-b border-red-200 flex items-center justify-between bg-red-50">
              <h2 className="text-lg font-semibold text-red-600">
                {translations.chatHistory?.title || "Chat History"}
              </h2>
              <button 
                onClick={onClose}
                className="p-2 rounded-full hover:bg-red-100 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* New Chat Button */}
            <div className="p-4 border-b border-red-100 bg-white">
              <button
                onClick={handleNewChat}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-red-300 hover:bg-red-400 text-white rounded-lg transition-colors shadow-sm"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>
                  {translations.newChat?.button || "New Chat"}
                </span>
              </button>
            </div>
            
            {/* Debug button to force save current chat */}
            {messages.length > 0 && (
              <button
                onClick={async () => {
                  console.log('Force saving current chat');
                  await saveChatHistory();
                  // Wait for state to update
                  setTimeout(() => {
                    try {
                      const storedData = localStorage.getItem('chat-store');
                      if (storedData) {
                        const parsed = JSON.parse(storedData);
                        console.log('Chat histories in localStorage:', parsed.state?.chatHistories?.length || 0);
                        if (parsed.state?.chatHistories) {
                          setLocalHistories(parsed.state.chatHistories);
                        }
                      }
                    } catch (error) {
                      console.error('Error checking localStorage:', error);
                    }
                  }, 500);
                }}
                className="m-2 p-2 bg-red-100 text-red-600 rounded text-sm hover:bg-red-200 transition-colors"
              >
                Save Current Chat
              </button>
            )}
            
            <div className="flex-1 overflow-y-auto p-2">
              {localHistories.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  {translations.chatHistory?.noChats || "No saved chats"}
                </div>
              ) : (
                <div className="space-y-2">
                  {localHistories.map((chat: ChatHistory) => (
                    <div 
                      key={chat.id}
                      className="border border-red-100 rounded-lg overflow-hidden bg-white hover:shadow-md transition-shadow group"
                    >
                      <div 
                        className="p-3 cursor-pointer"
                        onClick={() => handleChatSelect(chat.id)}
                      >
                        <div className="font-medium text-sm text-gray-800 line-clamp-1">
                          {chat.caption}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {formatDate(chat.createdAt)}
                        </div>
                      </div>
                      <div className="px-3 py-2 bg-red-50 flex justify-end border-t border-red-100">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(chat.id);
                          }}
                          className={`text-xs ${deleteConfirmation === chat.id ? 'text-red-600' : 'text-gray-500'} hover:text-red-600 transition-colors`}
                        >
                          {deleteConfirmation === chat.id ? 
                            (translations.chatHistory?.confirmDelete || "Confirm Delete") : 
                            (translations.chatHistory?.delete || "Delete")}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ChatHistorySidebar; 