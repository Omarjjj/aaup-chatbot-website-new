/// <reference types="jest" />

import { ContextManager } from '../services/contextManager';
import { v4 as uuidv4 } from 'uuid';

describe('ContextManager Tests', () => {
  let contextManager: ContextManager;
  let conversationId: string;

  beforeEach(() => {
    contextManager = new ContextManager();
    conversationId = uuidv4();
  });

  describe('Topic Detection', () => {
    test('should detect topics in English', () => {
      const context = contextManager.getOrCreateContext(conversationId);
      contextManager.updateContext('I want to apply for admission', true, conversationId);
      expect(context.currentTopic).toBe('admission');
    });

    test('should detect topics in Arabic', () => {
      const context = contextManager.getOrCreateContext(conversationId);
      contextManager.updateContext('أريد التسجيل في الجامعة', true, conversationId);
      expect(context.currentTopic).toBe('admission');
    });
  });

  describe('Context Confidence', () => {
    test('should maintain high confidence for related topics', () => {
      const context = contextManager.getOrCreateContext(conversationId);
      
      // Initial topic
      contextManager.updateContext('What are the admission requirements?', true, conversationId);
      const initialConfidence = context.contextConfidence;
      
      // Related follow-up
      contextManager.updateContext('What documents do I need for admission?', true, conversationId);
      expect(context.contextConfidence).toBeGreaterThanOrEqual(initialConfidence);
    });

    test('should reduce confidence for unrelated topics', () => {
      const context = contextManager.getOrCreateContext(conversationId);
      
      // Initial topic
      contextManager.updateContext('What are the admission requirements?', true, conversationId);
      const initialConfidence = context.contextConfidence;
      
      // Unrelated topic
      contextManager.updateContext('How much are the course fees?', true, conversationId);
      expect(context.contextConfidence).toBeLessThan(initialConfidence);
    });
  });

  describe('Language Detection', () => {
    test('should detect and maintain language context', () => {
      const context = contextManager.getOrCreateContext(conversationId);
      
      // English message
      contextManager.updateContext('What are the fees?', true, conversationId);
      expect(context.language).toBe('en');
      
      // Arabic message
      contextManager.updateContext('كم التكلفة؟', true, conversationId);
      expect(context.language).toBe('ar');
    });
  });

  describe('Entity Recognition', () => {
    test('should extract various entities', () => {
      const context = contextManager.getOrCreateContext(conversationId);
      
      contextManager.updateContext(
        'My email is test@example.com and I need to pay 1500 NIS by 15/09/2024',
        true,
        conversationId
      );

      expect(Array.from(context.lastEntities)).toEqual(
        expect.arrayContaining(['test@example.com', '1500', '15/09/2024'])
      );
    });
  });

  describe('Context Memory Management', () => {
    test('should cleanup old contexts', async () => {
      // Create maximum number of contexts
      const createdIds: string[] = [];
      
      // First create exactly maxContextMemory contexts
      for (let i = 0; i < 50; i++) {
        const tempConversationId = uuidv4();
        contextManager.getOrCreateContext(tempConversationId);
        createdIds.push(tempConversationId);
        await new Promise(resolve => setTimeout(resolve, 1));
      }

      // Verify we have exactly maxContextMemory contexts
      expect(contextManager.getContextCount()).toBe(50);

      // Add 5 more contexts to trigger cleanup
      for (let i = 0; i < 5; i++) {
        const tempConversationId = uuidv4();
        contextManager.getOrCreateContext(tempConversationId);
        createdIds.push(tempConversationId);
        await new Promise(resolve => setTimeout(resolve, 1));
      }

      // Verify cleanup happened and we're back at maxContextMemory
      expect(contextManager.getContextCount()).toBe(50);

      // Verify the most recent contexts are kept
      const lastId = createdIds[createdIds.length - 1];
      const lastContext = contextManager.getOrCreateContext(lastId);
      expect(lastContext.metadata.get('lastInteraction')).toBeDefined();

      // Verify one of the oldest contexts was removed
      const oldestContext = contextManager.getOrCreateContext(createdIds[0]);
      expect(oldestContext.metadata.get('lastInteraction')).toBeDefined();
      expect(oldestContext.contextConfidence).toBe(0); // Should be a new context
    });
  });

  describe('Major Detection', () => {
    test('should detect and maintain major context', () => {
      const context = contextManager.getOrCreateContext(conversationId);
      
      // Set initial major context
      contextManager.updateContext('I am studying Optometry', true, conversationId);
      expect(context.currentSubject).toBe('Optometry');

      // Follow-up about grades
      contextManager.updateContext('What is the grading system?', true, conversationId);
      expect(context.currentSubject).toBe('Optometry');
    });

    test('should detect major in Arabic', () => {
      const context = contextManager.getOrCreateContext(conversationId);
      
      // Set initial major context in Arabic
      contextManager.updateContext('أدرس تخصص البصريات', true, conversationId);
      expect(context.currentSubject).toBe('Optometry');

      // Follow-up about grades in Arabic
      contextManager.updateContext('ما هو نظام العلامات؟', true, conversationId);
      expect(context.currentSubject).toBe('Optometry');
    });

    test('should handle major changes', () => {
      const context = contextManager.getOrCreateContext(conversationId);
      
      // Set initial major
      contextManager.updateContext('I am studying Computer Science', true, conversationId);
      expect(context.currentSubject).toBe('Computer Science');

      // Change major
      contextManager.updateContext('Tell me about Optometry program', true, conversationId);
      expect(context.currentSubject).toBe('Optometry');
    });

    test('should maintain major context across topic changes', () => {
      const context = contextManager.getOrCreateContext(conversationId);
      
      // Set major and ask about grades
      contextManager.updateContext('I am an Optometry student', true, conversationId);
      contextManager.updateContext('What is the grading system?', true, conversationId);
      expect(context.currentSubject).toBe('Optometry');

      // Ask about fees
      contextManager.updateContext('How much are the fees?', true, conversationId);
      expect(context.currentSubject).toBe('Optometry');
    });

    test('should not default to Computer Science for general queries', () => {
      const context = contextManager.getOrCreateContext(conversationId);
      
      // General academic queries
      contextManager.updateContext('What is the grading system?', true, conversationId);
      expect(context.currentSubject).toBeNull();

      contextManager.updateContext('How much are the fees?', true, conversationId);
      expect(context.currentSubject).toBeNull();

      contextManager.updateContext('Tell me about admission requirements', true, conversationId);
      expect(context.currentSubject).toBeNull();
    });

    test('should not default to Computer Science for Arabic queries', () => {
      const context = contextManager.getOrCreateContext(conversationId);
      
      // General academic queries in Arabic
      contextManager.updateContext('ما هو نظام العلامات؟', true, conversationId);
      expect(context.currentSubject).toBeNull();

      contextManager.updateContext('كم تكلفة الدراسة؟', true, conversationId);
      expect(context.currentSubject).toBeNull();

      contextManager.updateContext('ما هي متطلبات القبول؟', true, conversationId);
      expect(context.currentSubject).toBeNull();
    });

    test('should only set major when explicitly mentioned', () => {
      const context = contextManager.getOrCreateContext(conversationId);
      
      // General academic terms shouldn't set major
      contextManager.updateContext('I want to study at the university', true, conversationId);
      expect(context.currentSubject).toBeNull();

      // Even with study-related terms
      contextManager.updateContext('I am a student', true, conversationId);
      expect(context.currentSubject).toBeNull();

      // Only when major is explicitly mentioned
      contextManager.updateContext('I want to study Computer Science', true, conversationId);
      expect(context.currentSubject).toBe('Computer Science');
    });

    test('should handle follow-up questions for different majors correctly', () => {
      const context = contextManager.getOrCreateContext(conversationId);
      
      // Ask about Optometry fees
      contextManager.updateContext('What are the fees for Optometry?', true, conversationId);
      expect(context.currentSubject).toBe('Optometry');
      
      // Follow-up question should maintain Optometry context
      contextManager.updateContext('What about the payment schedule?', true, conversationId);
      expect(context.currentSubject).toBe('Optometry');

      // Ask about Engineering fees
      contextManager.updateContext('How much does Engineering cost?', true, conversationId);
      expect(context.currentSubject).toBe('Engineering');
      
      // Follow-up should maintain Engineering context
      contextManager.updateContext('Is there a discount?', true, conversationId);
      expect(context.currentSubject).toBe('Engineering');
    });

    test('should handle follow-up questions for majors in Arabic', () => {
      const context = contextManager.getOrCreateContext(conversationId);
      
      // Ask about Optometry fees in Arabic
      contextManager.updateContext('كم تكلفة تخصص البصريات؟', true, conversationId);
      expect(context.currentSubject).toBe('Optometry');
      
      // Follow-up in Arabic should maintain Optometry context
      contextManager.updateContext('هل هناك خصم؟', true, conversationId);
      expect(context.currentSubject).toBe('Optometry');

      // Ask about Engineering in Arabic
      contextManager.updateContext('كم رسوم تخصص الهندسة؟', true, conversationId);
      expect(context.currentSubject).toBe('Engineering');
      
      // Follow-up should maintain Engineering context
      contextManager.updateContext('متى موعد الدفع؟', true, conversationId);
      expect(context.currentSubject).toBe('Engineering');
    });

    test('should maintain correct major context when switching between topics', () => {
      const context = contextManager.getOrCreateContext(conversationId);
      
      // Start with Optometry fees
      contextManager.updateContext('What are the fees for Optometry program?', true, conversationId);
      expect(context.currentSubject).toBe('Optometry');
      
      // Ask about admission for same major
      contextManager.updateContext('What are the admission requirements?', true, conversationId);
      expect(context.currentSubject).toBe('Optometry');

      // Switch to Engineering
      contextManager.updateContext('Tell me about Engineering program fees', true, conversationId);
      expect(context.currentSubject).toBe('Engineering');
      
      // Follow-up about Engineering
      contextManager.updateContext('When is the payment deadline?', true, conversationId);
      expect(context.currentSubject).toBe('Engineering');
    });

    test('should handle mixed language conversations about majors', () => {
      const context = contextManager.getOrCreateContext(conversationId);
      
      // Start with Arabic question about Optometry
      contextManager.updateContext('كم تكلفة دراسة البصريات؟', true, conversationId);
      expect(context.currentSubject).toBe('Optometry');
      
      // Follow-up in English
      contextManager.updateContext('What about the payment plan?', true, conversationId);
      expect(context.currentSubject).toBe('Optometry');

      // Switch to Engineering in English
      contextManager.updateContext('How much is the Engineering program?', true, conversationId);
      expect(context.currentSubject).toBe('Engineering');
      
      // Follow-up in Arabic
      contextManager.updateContext('هل يمكن التقسيط؟', true, conversationId);
      expect(context.currentSubject).toBe('Engineering');
    });
  });
}); 