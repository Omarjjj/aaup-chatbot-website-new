import React from 'react';
import { useChatStore } from '../store/chatStore';
import { contextManager } from '../services/contextManager';

export const DevTools: React.FC = () => {
  const store = useChatStore();

  const clearStorage = () => {
    localStorage.clear();
    window.location.reload();
  };

  const debugInfo = {
    conversationId: store.conversationId,
    sessionId: store.sessionId,
    contextId: store.contextId,
    messageCount: store.messages.length,
    currentTopic: store.currentTopic,
    currentSubject: store.context.currentSubject,
    language: store.context.language,
    followUpCount: store.context.followUpCount,
    lastEntities: Array.from(store.context.lastEntities),
    context: store.context
  };

  if (process.env.NODE_ENV !== 'development') return null;

  return (
    <div className="fixed bottom-4 right-4 bg-gray-800 text-white p-4 rounded-lg shadow-lg opacity-75 hover:opacity-100 transition-opacity max-w-md">
      <div className="flex justify-between items-center mb-2">
        <div className="text-sm font-bold">Debug Info:</div>
        <div className="flex gap-2">
          <button
            onClick={clearStorage}
            className="text-xs bg-red-500 px-2 py-1 rounded hover:bg-red-600"
          >
            Clear Storage
          </button>
          <button
            onClick={() => console.log('Full Store:', store)}
            className="text-xs bg-blue-500 px-2 py-1 rounded hover:bg-blue-600"
          >
            Log Store
          </button>
        </div>
      </div>
      <div className="text-xs space-y-1 max-h-60 overflow-auto">
        <div>Session ID: {debugInfo.sessionId}</div>
        <div>Conversation ID: {debugInfo.conversationId}</div>
        <div>Context ID: {debugInfo.contextId}</div>
        <div>Messages: {debugInfo.messageCount}</div>
        <div>Current Topic: {debugInfo.currentTopic || 'None'}</div>
        <div>Current Subject: {debugInfo.currentSubject || 'None'}</div>
        <div>Language: {debugInfo.language}</div>
        <div>Follow-up Count: {debugInfo.followUpCount}</div>
        <div>Last Entities: {debugInfo.lastEntities.join(', ') || 'None'}</div>
      </div>
    </div>
  );
}; 