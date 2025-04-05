import React from 'react';
import { useChatStore } from '../store/chatStore';

interface DebugOverlayProps {
  visible?: boolean;
}

export const DebugOverlay: React.FC<DebugOverlayProps> = ({ visible = true }) => {
  const { sessionId, conversationId, context } = useChatStore();

  if (!visible || !import.meta.env.DEV) return null;

  return (
    <div className="fixed bottom-4 right-4 p-4 bg-gray-800 text-white rounded-lg opacity-75 hover:opacity-100 transition-opacity max-w-md overflow-auto max-h-96 text-xs">
      <h3 className="font-bold mb-2">Debug Info</h3>
      <div className="space-y-2">
        <div>
          <strong>Session ID:</strong> {sessionId || 'None'}
        </div>
        <div>
          <strong>Conversation ID:</strong> {conversationId || 'None'}
        </div>
        <div>
          <strong>Current Topic:</strong> {context.currentTopic || 'None'}
        </div>
        <div>
          <strong>Current Subject:</strong> {context.currentSubject || 'None'}
        </div>
        <div>
          <strong>Language:</strong> {context.language}
        </div>
        <div>
          <strong>Follow-up Count:</strong> {context.followUpCount}
        </div>
        <div>
          <strong>Context Confidence:</strong>{' '}
          {(context.contextConfidence * 100).toFixed(1)}%
        </div>
        <div>
          <strong>Topics:</strong>
          <pre className="mt-1 text-xs">
            {JSON.stringify(context.topics, null, 2)}
          </pre>
        </div>
        <div>
          <strong>Entities:</strong>
          <pre className="mt-1 text-xs">
            {JSON.stringify(context.entities, null, 2)}
          </pre>
        </div>
        <div>
          <strong>Last Numbers:</strong>
          <pre className="mt-1 text-xs">
            {JSON.stringify(Object.fromEntries(context.lastNumbers), null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}; 