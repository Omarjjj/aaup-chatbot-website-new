import React, { useState } from 'react';
import { useChatStore } from '../store/chatStore';
import { contextManager } from '../services/contextManager';
import { chatService } from '../services/api';

interface TestExpectation {
  subject?: string;
  language?: string;
  isFollowUp?: boolean;
  entities?: string[];
}

interface TestStep {
  message: string;
  expected: TestExpectation;
}

interface TestScenario {
  name: string;
  steps: TestStep[];
}

const TEST_SCENARIOS: TestScenario[] = [
  {
    name: 'Initial Conversation',
    steps: [
      { message: 'What are the fees for Computer Science?', expected: { subject: 'Computer Science' } },
      { message: 'How many credit hours?', expected: { isFollowUp: true } },
    ]
  },
  {
    name: 'Arabic Context',
    steps: [
      { message: 'ما هي رسوم علوم الحاسوب؟', expected: { language: 'ar', subject: 'علوم الحاسوب' } },
      { message: 'كم عدد الساعات؟', expected: { isFollowUp: true, language: 'ar' } },
    ]
  },
  {
    name: 'Entity Tracking',
    steps: [
      { message: 'Tell me about "Software Engineering" program', expected: { entities: ['Software Engineering'] } },
      { message: 'What are its requirements?', expected: { isFollowUp: true } },
    ]
  }
];

export const ContextTester: React.FC = () => {
  const [currentScenario, setCurrentScenario] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [results, setResults] = useState<Array<{ pass: boolean; details: string }>>([]);
  const [isRunning, setIsRunning] = useState(false);
  const store = useChatStore();

  const runTest = async () => {
    if (isRunning) return;
    setIsRunning(true);

    const scenario = TEST_SCENARIOS[currentScenario];
    const step = scenario.steps[currentStep];
    
    try {
      // Clear context if it's the first step
      if (currentStep === 0) {
        store.startNewConversation();
        await new Promise(resolve => setTimeout(resolve, 100)); // Give time for state to update
      }

      const state = useChatStore.getState();
      const verifiedConvId = state.conversationId;
      
      if (!verifiedConvId) {
        throw new Error('No conversation ID available');
      }

      // First update the context with the message
      contextManager.updateContext(step.message, true, verifiedConvId);

      // Then simulate sending the message through the API
      const response = await chatService.sendMessage(
        step.message,
        state.sessionId,
        verifiedConvId,
        state.contextId,
        state.messages
      );

      // Update context with response
      if (response.metadata?.contextUpdated) {
        contextManager.updateContext(response.response, false, verifiedConvId);
      }

      // Get updated context after API response
      const context = contextManager.getOrCreateContext(verifiedConvId);
      
      // Verify expectations
      const testResults: Array<{ pass: boolean; details: string }> = [];
      
      if (step.expected.subject) {
        const actualSubject = context.currentSubject?.toLowerCase();
        const expectedSubject = step.expected.subject.toLowerCase();
        testResults.push({
          pass: actualSubject === expectedSubject,
          details: `Subject: Expected ${step.expected.subject}, got ${context.currentSubject || 'null'}`
        });
      }
      
      if (step.expected.language) {
        testResults.push({
          pass: context.language === step.expected.language,
          details: `Language: Expected ${step.expected.language}, got ${context.language}`
        });
      }
      
      if (step.expected.isFollowUp) {
        const { isFollowUp } = contextManager.isFollowUpQuestion(step.message, verifiedConvId);
        testResults.push({
          pass: isFollowUp === true,
          details: `Follow-up detection: Expected true, got ${isFollowUp}`
        });
      }
      
      if (step.expected.entities) {
        const hasAllEntities = step.expected.entities.every(entity => 
          Array.from(context.lastEntities).some(e => e.toLowerCase().includes(entity.toLowerCase()))
        );
        testResults.push({
          pass: hasAllEntities,
          details: `Entities: Expected ${step.expected.entities.join(', ')}, got ${Array.from(context.lastEntities).join(', ')}`
        });
      }

      setResults(prev => [...prev, ...testResults]);

      // Move to next step or scenario
      if (currentStep < scenario.steps.length - 1) {
        setCurrentStep(prev => prev + 1);
      } else if (currentScenario < TEST_SCENARIOS.length - 1) {
        setCurrentScenario(prev => prev + 1);
        setCurrentStep(0);
      }

    } catch (error) {
      console.error('Test error:', error);
      setResults(prev => [...prev, { 
        pass: false, 
        details: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }]);
    } finally {
      setIsRunning(false);
    }
  };

  const resetTests = () => {
    setCurrentScenario(0);
    setCurrentStep(0);
    setResults([]);
    store.startNewConversation();
  };

  return (
    <div className="fixed top-4 left-4 bg-gray-800 text-white p-4 rounded-lg shadow-lg opacity-90 max-w-md">
      <h2 className="text-lg font-bold mb-2">Context Testing Utility</h2>
      
      <div className="mb-4">
        <div className="text-sm">
          Scenario: {TEST_SCENARIOS[currentScenario]?.name} ({currentStep + 1}/{TEST_SCENARIOS[currentScenario]?.steps.length})
        </div>
        <div className="text-xs text-gray-400">
          Next message: {TEST_SCENARIOS[currentScenario]?.steps[currentStep]?.message}
        </div>
      </div>

      <div className="mb-4 max-h-60 overflow-auto">
        {results.map((result, idx) => (
          <div 
            key={idx}
            className={`text-xs mb-1 p-1 rounded ${
              result.pass ? 'bg-green-800' : 'bg-red-800'
            }`}
          >
            {result.details}
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          onClick={runTest}
          disabled={isRunning}
          className={`px-3 py-1 rounded text-sm ${
            isRunning 
              ? 'bg-gray-600 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isRunning ? 'Running...' : 'Run Next Test'}
        </button>
        <button
          onClick={resetTests}
          disabled={isRunning}
          className={`px-3 py-1 rounded text-sm ${
            isRunning 
              ? 'bg-gray-600 cursor-not-allowed'
              : 'bg-red-600 hover:bg-red-700'
          }`}
        >
          Reset Tests
        </button>
      </div>
    </div>
  );
}; 