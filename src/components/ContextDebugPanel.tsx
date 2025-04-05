import React, { useState, useEffect } from 'react';
import { useUnifiedContext } from '../contexts/UnifiedContextProvider';
import { motion, AnimatePresence } from 'framer-motion';

interface ContextDebugPanelProps {
  showByDefault?: boolean;
}

export const ContextDebugPanel: React.FC<ContextDebugPanelProps> = ({ showByDefault = false }) => {
  const [isExpanded, setIsExpanded] = useState(showByDefault);
  const { conversationId, getContextForResponse } = useUnifiedContext();
  const [contextData, setContextData] = useState<any>(null);
  const [updateCounter, setUpdateCounter] = useState(0);
  const [showResetBadge, setShowResetBadge] = useState(true);

  // Show a reset notification when component first mounts
  useEffect(() => {
    setShowResetBadge(true);
    const timer = setTimeout(() => {
      setShowResetBadge(false);
    }, 5000); // Hide after 5 seconds
    
    return () => clearTimeout(timer);
  }, [conversationId]);

  // Fetch context data every second to show real-time updates
  useEffect(() => {
    const intervalId = setInterval(() => {
      if (conversationId) {
        // Make sure conversationId is passed to getContextForResponse
        const contextData = getContextForResponse();
        if (contextData) {
          setContextData(contextData);
          setUpdateCounter(prev => prev + 1);
        }
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [conversationId, getContextForResponse]);

  // If there's no conversation ID or context data, don't render
  if (!conversationId || !contextData) {
    return null;
  }

  return (
    <div className="fixed bottom-20 right-4 z-50">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="bg-gray-800 text-white p-2 rounded-full shadow-lg hover:bg-gray-700 transition-colors relative"
        title="Toggle Context Debug Panel"
      >
        {isExpanded ? '✕' : '🔍'}
        {showResetBadge && (
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-2 -right-2 bg-green-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center"
            title="Context has been reset"
          >
            ✓
          </motion.div>
        )}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-12 right-0 w-80 bg-white/90 backdrop-blur-md rounded-lg shadow-xl border border-gray-200 overflow-hidden"
          >
            <div className="bg-gray-800 text-white px-4 py-2 font-medium flex justify-between items-center">
              <span>
                Context Debug {updateCounter > 0 && `(${updateCounter})`}
                {showResetBadge && (
                  <span className="ml-2 bg-green-600 text-white text-xs px-2 py-0.5 rounded-full">
                    Reset
                  </span>
                )}
              </span>
              <span className="text-xs bg-gray-700 rounded px-2 py-1">{conversationId.slice(0, 8)}</span>
            </div>
            
            <div className="p-4 max-h-96 overflow-y-auto space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-blue-50 p-2 rounded">
                  <div className="font-medium text-blue-800">Subject</div>
                  <div className="mt-1">{contextData.subject || 'None'}</div>
                </div>
                <div className="bg-purple-50 p-2 rounded">
                  <div className="font-medium text-purple-800">Topic</div>
                  <div className="mt-1">{contextData.topic || 'None'}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-green-50 p-2 rounded">
                  <div className="font-medium text-green-800">Follow-up</div>
                  <div className="mt-1">{contextData.isFollowUp ? 'Yes' : 'No'}</div>
                </div>
                <div className="bg-amber-50 p-2 rounded">
                  <div className="font-medium text-amber-800">Confidence</div>
                  <div className="mt-1">{(contextData.contextConfidence * 100).toFixed(0)}%</div>
                </div>
              </div>
              
              <div className="bg-indigo-50 p-2 rounded">
                <div className="font-medium text-indigo-800">State</div>
                <div className="mt-1">{contextData.state || 'initial'}</div>
              </div>
              
              {contextData.relevantEntities && contextData.relevantEntities.length > 0 && (
                <div className="bg-rose-50 p-2 rounded">
                  <div className="font-medium text-rose-800">Entities</div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {contextData.relevantEntities.map((entity: string, index: number) => (
                      <span key={index} className="bg-white px-2 py-1 rounded text-xs">
                        {entity}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}; 