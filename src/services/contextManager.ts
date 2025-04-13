import { v4 as uuidv4 } from 'uuid';
import { ConversationContext, Message } from '../types/chat';

interface MajorPattern {
  en: RegExp;
  ar: RegExp;
  keywords: string[];
  confidence: number;
}

type MajorPatterns = {
  [key: string]: MajorPattern;
}

export class ContextManager {
  private static instance: ContextManager;
  private contexts: Map<string, ConversationContext>;
  private readonly sessionTimeout = 30 * 60 * 1000; // 30 minutes
  private readonly maxContextMemory = 50; // Maximum number of contexts to store
  private readonly topicRelations: Map<string, Set<string>> = new Map([
    ['admission', new Set(['requirements', 'documents', 'transfer'])],
    ['academic', new Set(['courses', 'grades', 'schedule'])],
    ['financial', new Set(['fees', 'payments', 'scholarships'])],
    ['student_life', new Set(['activities', 'housing', 'facilities'])]
  ]);

  private topicPatterns: {
    [key: string]: {
      en: RegExp;
      ar: RegExp;
    };
  } = {
    admission: {
      en: /\b(admiss|enroll|apply|register)\w*\b/i,
      ar: /\b(قبول|تسجيل|التحاق|تقديم|جامعة|طلب|التسجيل)\b/i
    },
    academic: {
      en: /\b(course|study|grade|exam)\w*\b/i,
      ar: /\b(مساق|دراسة|علامة|امتحان|تخصص)\w*\b/i
    },
    financial: {
      en: /\b(fee|cost|pay|money)\w*\b/i,
      ar: /\b(رسوم|تكلفة|دفع|مال|سعر)\w*\b/i
    }
  };

  private readonly majorPatterns: {
    [key: string]: {
      en: RegExp;
      ar: RegExp;
      keywords: string[];
      confidence: number;
    };
  } = {
    'Computer Science': {
      en: /\b(computer science|cs|programming|software|coding)\b/i,
      ar: /\b(علوم الحاسوب|برمجة|البرمجة|الحاسوب|علم الحاسوب)\b/i,
      keywords: ['computer science', 'cs', 'programming', 'software', 'coding', 'علوم الحاسوب', 'برمجة', 'البرمجة', 'الحاسوب', 'علم الحاسوب'],
      confidence: 0.8
    },
    'Optometry': {
      en: /\b(optometry|optics|optometrist|vision science|eye care)\b/i,
      ar: /\b(بصريات|علم البصريات|البصريات|علوم البصر|رعاية العين|العيون)\b/i,
      keywords: ['optometry', 'optics', 'optometrist', 'vision', 'eye care', 'بصريات', 'علم البصريات', 'البصريات', 'علوم البصر', 'رعاية العين', 'العيون'],
      confidence: 0.8
    },
    'Engineering': {
      en: /\b(engineering|engineer)\b/i,
      ar: /\b(هندسة|الهندسة|مهندس)\b/i,
      keywords: ['engineering', 'engineer', 'هندسة', 'الهندسة', 'مهندس'],
      confidence: 0.8
    },
    'Medicine': {
      en: /\b(medicine|medical|doctor|physician)\b/i,
      ar: /\b(طب|الطب|طبيب|دكتور)\b/i,
      keywords: ['medicine', 'medical', 'doctor', 'physician', 'طب', 'الطب', 'طبيب', 'دكتور'],
      confidence: 0.8
    }
  };

  constructor() {
    this.contexts = new Map();
  }

  private calculateContextConfidence(context: ConversationContext, message: string, conversationId: string): number {
    let confidence = context.contextConfidence || 0;
    const isArabic = this.detectLanguage(message) === 'ar';
    
    // Topic continuity (30%)
    const detectedTopics = this.detectTopic(message);
    if (context.currentTopic && detectedTopics.includes(context.currentTopic)) {
      confidence = Math.max(confidence, 0.3);
    }
    
    // Subject relevance (30%)
    if (context.currentSubject) {
      const subjectPattern = isArabic 
        ? this.majorPatterns[context.currentSubject].ar 
        : this.majorPatterns[context.currentSubject].en;
      
      if (subjectPattern.test(message)) {
        confidence += 0.3;
      } else if (this.hasSubjectIndicators(message)) {
        confidence += 0.2; // Add some confidence for subject-related terms
      }
    }
    
    // Entity references (20%)
    const entityMatches = Array.from(context.lastEntities)
      .filter(entity => message.toLowerCase().includes(entity.toLowerCase())).length;
    confidence += Math.min(0.2, entityMatches * 0.1);
    
    // Language consistency (10%)
    if (this.detectLanguage(message) === context.language) {
      confidence += 0.1;
    }
    
    // Follow-up indicators (10%)
    const followUp = this.isFollowUpQuestion(message, conversationId);
    if (followUp.isFollowUp) {
      confidence += Math.min(0.1, followUp.confidence);
    }
    
    return Math.min(1, confidence);
  }

  private detectTopic(message: string): string[] {
    const topics: string[] = [];
    const isArabic = this.detectLanguage(message) === 'ar';
    
    // Check against topic patterns
    for (const [topic, patterns] of Object.entries(this.topicPatterns)) {
      const pattern = isArabic ? patterns.ar : patterns.en;
      if (pattern.test(message)) {
        topics.push(topic);
        break; // Stop after first match to ensure consistent topic assignment
      }
    }
    
    // Special case for Arabic university-related queries
    if (isArabic && message.includes('جامعة') && topics.length === 0) {
      topics.push('admission');
    }
    
    return topics;
  }

  private detectLanguage(message: string): string {
    // Simple language detection based on character sets
    const arabicPattern = /[\u0600-\u06FF]/;
    const englishPattern = /[a-zA-Z]/;
    
    const arabicCount = (message.match(arabicPattern) || []).length;
    const englishCount = (message.match(englishPattern) || []).length;
    
    return arabicCount > englishCount ? 'ar' : 'en';
  }

  private detectSubject(message: string): { subject: string | null; confidence: number } {
    const isArabic = this.detectLanguage(message) === 'ar';
    let highestConfidence = 0;
    let detectedSubject: string | null = null;
    
    // Special case for Arabic study declarations
    if (isArabic) {
      const arabicStudyIndicators = ['تخصص', 'طالب', 'طالبة', 'ادرس', 'أدرس', 'دراسة', 'كلية', 'قسم'];
      // Add Palestinian dialect indicators
      const palestinianStudyIndicators = ['بدرس', 'بدي ادرس', 'بدي اتخصص', 'تخصصي', 'بدرس في', 'عم ادرس', 'عندي محاضرات', 'بتخصص'];
      const allIndicators = [...arabicStudyIndicators, ...palestinianStudyIndicators];
      
      for (const indicator of allIndicators) {
        if (message.includes(indicator)) {
          const parts = message.split(indicator);
          const relevantPart = parts[1] || parts[0];
          
          for (const [major, patterns] of Object.entries(this.majorPatterns)) {
            // Check Arabic patterns first with more flexible matching
            const arabicPattern = patterns.ar.source.replace(/\\b/g, '');
            const flexiblePattern = new RegExp(arabicPattern, 'i');
            if (flexiblePattern.test(relevantPart)) {
              return { subject: major, confidence: patterns.confidence };
            }
            
            // Then check Arabic keywords with more flexible matching
            const arabicKeywords = patterns.keywords.filter(k => /[\u0600-\u06FF]/.test(k));
            for (const keyword of arabicKeywords) {
              if (relevantPart.includes(keyword)) {
                return { subject: major, confidence: patterns.confidence };
              }
            }
          }
        }
      }
      
      // Check for common Palestinian dialect patterns about studying
      const palestinianPatterns = [
        { regex: /شو بدي ادرس/i, confidence: 0.7 },
        { regex: /وين احسن اتخصص/i, confidence: 0.7 },
        { regex: /شو رأيك في تخصص/i, confidence: 0.75 },
        { regex: /شو بتنصحني ادرس/i, confidence: 0.8 },
        { regex: /حابب\s?\/\s?حابة ادرس/i, confidence: 0.7 },
        { regex: /افضل تخصص/i, confidence: 0.7 },
        { regex: /احسن تخصص/i, confidence: 0.7 },
        { regex: /تخصص الي\s?\/\s?يلي مطلوب/i, confidence: 0.75 }
      ];
      
      for (const pattern of palestinianPatterns) {
        if (pattern.regex.test(message)) {
          // Extract the program name from the message
          for (const [major, patterns] of Object.entries(this.majorPatterns)) {
            const arabicKeywords = patterns.keywords.filter(k => /[\u0600-\u06FF]/.test(k));
            for (const keyword of arabicKeywords) {
              if (message.includes(keyword)) {
                return { subject: major, confidence: pattern.confidence + 0.1 };
              }
            }
          }
        }
      }
    }
    
    // Check for explicit major mentions in both languages
    for (const [major, patterns] of Object.entries(this.majorPatterns)) {
      // Check patterns based on language
      const primaryPattern = isArabic ? patterns.ar : patterns.en;
      const secondaryPattern = isArabic ? patterns.en : patterns.ar;
      
      if (primaryPattern.test(message)) {
        const confidence = patterns.confidence;
        if (confidence > highestConfidence) {
          highestConfidence = confidence;
          detectedSubject = major;
        }
      } else if (secondaryPattern.test(message)) {
        const confidence = patterns.confidence * 0.9; // Slightly lower confidence for secondary language
        if (confidence > highestConfidence) {
          highestConfidence = confidence;
          detectedSubject = major;
        }
      }

      // Check keywords with appropriate language priority
      const primaryKeywords = isArabic 
        ? patterns.keywords.filter(k => /[\u0600-\u06FF]/.test(k))
        : patterns.keywords.filter(k => !/[\u0600-\u06FF]/.test(k));
      
      for (const keyword of primaryKeywords) {
        if (message.includes(keyword)) {
          const confidence = patterns.confidence * 0.95; // High confidence for exact keyword matches
          if (confidence > highestConfidence) {
            highestConfidence = confidence;
            detectedSubject = major;
          }
        }
      }
    }

    // If no explicit matches, check for study-related phrases with major keywords
    if (!detectedSubject) {
      const studyingPattern = isArabic 
        ? /\b(أدرس|ادرس|تخصص|طالب|طالبة|دراسة|كلية|تخصصي|أتخصص|قسم)\b/i
        : /\b(study|studying|student|major|program|faculty|department)\b/i;

      if (studyingPattern.test(message)) {
        for (const [major, patterns] of Object.entries(this.majorPatterns)) {
          const relevantKeywords = isArabic 
            ? patterns.keywords.filter(k => /[\u0600-\u06FF]/.test(k))
            : patterns.keywords.filter(k => !/[\u0600-\u06FF]/.test(k));
          
          for (const keyword of relevantKeywords) {
            if (message.includes(keyword)) {
              const confidence = patterns.confidence * 0.9;
              if (confidence > highestConfidence) {
                highestConfidence = confidence;
                detectedSubject = major;
              }
            }
          }
        }
      }
    }

    return { 
      subject: highestConfidence >= 0.4 ? detectedSubject : null,
      confidence: highestConfidence 
    };
  }

  static getInstance(): ContextManager {
    if (!ContextManager.instance) {
      ContextManager.instance = new ContextManager();
    }
    return ContextManager.instance;
  }

  createNewContext(): ConversationContext {
    return {
      currentTopic: null,
      currentSubject: null,
      lastNumbers: new Map(),
      lastEntities: new Set(),
      followUpCount: 0,
      metadata: new Map(),
      topics: [],
      entities: {},
      language: 'en',
      contextConfidence: 0,
      state: {
        currentState: 'initial',
        confidence: 0,
        transitions: []
      },
      hierarchy: {
        level: 0,
        path: [],
        entities: [],
        temporalContext: {
          recentTopics: [],
          recentEntities: [],
          topicTransitions: []
        }
      }
    };
  }

  getOrCreateContext(conversationId: string): ConversationContext {
    // Cleanup expired sessions first
    this.cleanupExpiredSessions();
    
    // Get existing context if available
    const existingContext = this.contexts.get(conversationId);
    if (existingContext) {
      existingContext.metadata.set('lastInteraction', Date.now());
      return existingContext;
    }

    // If we're at the limit, cleanup before creating new context
    if (this.contexts.size >= this.maxContextMemory) {
      this.cleanupOldContexts();
    }
    
    // Create new context
      console.log('Creating new context for:', conversationId);
      const newContext = this.createNewContext();
      newContext.metadata.set('lastInteraction', Date.now());
      this.contexts.set(conversationId, newContext);
      this.persistContext(conversationId, newContext);
    
    return newContext;
  }

  updateContext(message: string, isUser: boolean, conversationId: string): void {
    const context = this.getOrCreateContext(conversationId);
    
    // Update language if it changes
    const detectedLanguage = this.detectLanguage(message);
    if (detectedLanguage !== context.language) {
      context.language = detectedLanguage;
    }
    
    // Check if this is a follow-up question
    const followUp = this.isFollowUpQuestion(message, conversationId);
    
    // Detect and update subject/major with confidence
    const { subject: detectedSubject, confidence: subjectConfidence } = this.detectSubject(message);
    
    // Update subject based on confidence and current context
    if (detectedSubject) {
      // If we detect a new subject with high confidence, update it
      if (subjectConfidence >= 0.6) {
        context.currentSubject = detectedSubject;
        context.followUpCount = 0; // Reset follow-up count for new subject
      }
      // If we detect a different subject with medium confidence and no current subject
      else if (subjectConfidence >= 0.4 && !context.currentSubject) {
        context.currentSubject = detectedSubject;
        context.followUpCount = 0;
      }
      // If we detect the same subject as current with any confidence, maintain it
      else if (detectedSubject === context.currentSubject) {
        // Keep the current subject and increment follow-up count
        context.followUpCount++;
      }
      // If we detect a different subject with medium confidence
      else if (subjectConfidence >= 0.4) {
        context.currentSubject = detectedSubject;
        context.followUpCount = 0;
      }
    } else if (followUp.isFollowUp && context.currentSubject) {
      // If it's a follow-up question and we have a current subject, maintain it
      context.followUpCount++;
    } else if (this.hasStudyRelatedPhrase(message) && context.currentSubject) {
      // If we have a study-related phrase and a current subject, maintain it
      context.followUpCount++;
    } else if (!followUp.isFollowUp && !this.hasSubjectIndicators(message) && !this.hasStudyRelatedPhrase(message)) {
      // Only clear subject if it's definitely not a follow-up, has no subject indicators, and no study-related phrases
      context.currentSubject = null;
      context.followUpCount = 0;
    }

    // Detect and update topics
    const detectedTopics = this.detectTopic(message);
    if (detectedTopics.length > 0) {
      const newTopic = detectedTopics[0];
      const previousTopic = context.currentTopic;
      context.currentTopic = newTopic;
      context.topics.push(newTopic);

      // Calculate initial confidence based on topic relationship
      if (previousTopic) {
        const relatedTopics = this.topicRelations.get(previousTopic);
        if (previousTopic === newTopic) {
          context.contextConfidence = Math.max(context.contextConfidence, 0.7); // Same topic
        } else if (relatedTopics?.has(newTopic)) {
          context.contextConfidence = Math.max(context.contextConfidence, 0.4); // Related topic
        } else {
          context.contextConfidence = Math.min(context.contextConfidence, 0.3); // Reduced confidence for unrelated topic
        }

        // If we have a current subject and switch to a related topic, maintain the subject
        if (context.currentSubject && relatedTopics?.has(newTopic)) {
          context.followUpCount++;
        }
      } else {
        context.contextConfidence = 0.4; // First topic in conversation
      }
    }

    // Extract and update entities
    this.updateEntities(context, message);

    // Update context confidence based on other factors
    const newConfidence = this.calculateContextConfidence(context, message, conversationId);
    context.contextConfidence = Math.min(context.contextConfidence, newConfidence);

    // Manage context memory
    if (this.contexts.size > this.maxContextMemory) {
      this.cleanupOldContexts();
    }
    
    // Persist context
    this.persistContext(conversationId, context);
  }

  private updateEntities(context: ConversationContext, message: string) {
    // Enhanced entity extraction
    const entityPatterns = {
      numbers: /\d+(?:\.\d+)?/g,
      dates: /\d{1,2}[-/]\d{1,2}[-/]\d{2,4}/g,
      emails: /\b[\w\.-]+@[\w\.-]+\.\w+\b/g,
      urls: /https?:\/\/[^\s]+/g,
      properNouns: /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g
    };

    for (const [type, pattern] of Object.entries(entityPatterns)) {
      const matches = message.match(pattern) || [];
      matches.forEach(match => {
        const cleanMatch = (match as string).trim();
        if (cleanMatch) {
          context.lastEntities.add(cleanMatch);
          context.entities[`${type}_${Date.now()}`] = cleanMatch;
        }
      });
    }
  }

  private cleanupOldContexts() {
    const sortedContexts = Array.from(this.contexts.entries())
      .sort(([, a], [, b]) => {
        const aTime = a.metadata.get('lastInteraction') as number || 0;
        const bTime = b.metadata.get('lastInteraction') as number || 0;
        return bTime - aTime; // Most recent first
      });
    
    // Keep only the most recent maxContextMemory-1 contexts (to make room for the new one)
    const contextsToKeep = sortedContexts.slice(0, this.maxContextMemory - 1);
    
    // Create new Map with only the contexts to keep
    const newContexts = new Map<string, ConversationContext>();
    for (const [id, context] of contextsToKeep) {
      newContexts.set(id, context);
    }
    
    // Remove from localStorage and clear old contexts
    for (const [id] of this.contexts.entries()) {
      if (!newContexts.has(id)) {
        localStorage.removeItem(`context_${id}`);
      }
    }
    
    // Replace the contexts map
    this.contexts = newContexts;
  }

  private persistContext(conversationId: string, context: ConversationContext): void {
    try {
      const serializedContext = {
        ...context,
        lastNumbers: Array.from(context.lastNumbers.entries()),
        lastEntities: Array.from(context.lastEntities),
        metadata: Array.from(context.metadata.entries())
      };
      localStorage.setItem(`context_${conversationId}`, JSON.stringify(serializedContext));
    } catch (error) {
      console.error('Error persisting context:', error);
    }
  }

  private hydrateContext(conversationId: string): ConversationContext | null {
    try {
      const stored = localStorage.getItem(`context_${conversationId}`);
      if (!stored) return null;

      const parsed = JSON.parse(stored);
      return {
        ...parsed,
        lastNumbers: new Map(parsed.lastNumbers),
        lastEntities: new Set(parsed.lastEntities),
        metadata: new Map(parsed.metadata)
      };
    } catch (error) {
      console.error('Error hydrating context:', error);
      return null;
    }
  }

  private cleanupExpiredSessions(): void {
    const now = Date.now();
    for (const [id, context] of this.contexts.entries()) {
      const lastInteraction = context.metadata.get('lastInteraction') as number;
      if (now - lastInteraction > this.sessionTimeout) {
        this.contexts.delete(id);
        localStorage.removeItem(`context_${id}`);
      }
    }
  }

  isFollowUpQuestion(query: string | null, conversationId: string): { isFollowUp: boolean; confidence: number } {
    const context = this.getOrCreateContext(conversationId);
    
    if (!query) {
      return { isFollowUp: false, confidence: 0 };
    }

    let confidence = 0;
    const queryLower = query.toLowerCase();
    const isArabic = this.detectLanguage(query) === 'ar';

    // Check for pronouns and references
    const pronouns = isArabic 
      ? ['هذا', 'ذلك', 'هؤلاء', 'ها', 'به', 'عنه', 'له', 'عن', 'في', 'على']
      : ['it', 'this', 'that', 'these', 'those', 'them', 'its', 'about', 'for', 'regarding'];
    if (pronouns.some(p => queryLower.includes(p))) {
      confidence += 0.3;
    }

    // Check for short queries
    if (queryLower.split(' ').length <= 4) {
      confidence += 0.2;
    }

    // Check for entity references from current context
    if (Array.from(context.lastEntities).some(entity => 
      queryLower.includes(entity.toLowerCase())
    )) {
      confidence += 0.3;
    }

    // Check for subject-specific references
    const subjectReferences = isArabic
      ? ['التخصص', 'البرنامج', 'القسم', 'الكلية', 'الدراسة', 'الرسوم', 'التكلفة', 'الدفع']
      : ['program', 'major', 'department', 'study', 'course', 'fees', 'cost', 'payment'];
    
    if (subjectReferences.some(ref => queryLower.includes(ref))) {
      confidence += 0.2;
    }

    // Check if the query mentions the current subject
    if (context.currentSubject && !queryLower.includes(context.currentSubject.toLowerCase())) {
      // If query doesn't mention the current subject but has follow-up indicators,
      // it's likely a follow-up about the current subject
      confidence += 0.2;
    }

    // Consider the follow-up count in the confidence calculation
    if (context.followUpCount > 0) {
      confidence += Math.min(0.2, context.followUpCount * 0.1);
    }

    // Add confidence for topic continuity
    if (context.currentTopic) {
      const topicPattern = this.topicPatterns[context.currentTopic];
      if (topicPattern) {
        const pattern = isArabic ? topicPattern.ar : topicPattern.en;
        if (pattern.test(queryLower)) {
          confidence += 0.2;
        }
      }
    }

    return {
      isFollowUp: confidence >= 0.4,
      confidence
    };
  }

  getSerializedContext(conversationId: string) {
    const context = this.getOrCreateContext(conversationId);
    return {
      currentTopic: context.currentTopic,
      currentSubject: context.currentSubject,
      lastNumbers: Object.fromEntries(context.lastNumbers),
      lastEntities: Array.from(context.lastEntities),
      followUpCount: context.followUpCount,
      topics: context.topics,
      entities: context.entities,
      language: context.language,
      contextConfidence: context.contextConfidence
    };
  }

  // Add method to get context count for testing
  getContextCount(): number {
    return this.contexts.size;
  }

  private hasStudyRelatedPhrase(message: string): boolean {
    const isArabic = this.detectLanguage(message) === 'ar';
    
    const studyPattern = isArabic
      ? /\b(دراسة|تخصص|كلية|قسم|برنامج|مساق|علامات|درجات|امتحان|محاضرة|نظام|متطلبات|رسوم|تكلفة|طالب|طالبة|ادرس|أدرس|بدرس|بتخصص|عم ادرس|بدي ادرس|محاضرات)\b/i
      : /\b(study|major|program|course|grade|exam|lecture|class|system|requirements|fees|cost|student|studying)\b/i;
    
    return studyPattern.test(message);
  }

  private hasSubjectIndicators(message: string): boolean {
    const isArabic = this.detectLanguage(message) === 'ar';
    
    const subjectTerms = isArabic
      ? /\b(تخصص|دراسة|كلية|قسم|برنامج|مساق|علامات|درجات|امتحان|محاضرة|نظام|متطلبات|رسوم|تكلفة|طالب|طالبة|ادرس|أدرس|بدرس|بتخصص|عم ادرس|بدي ادرس|محاضرات)\b/i
      : /\b(major|program|faculty|department|course|grade|exam|lecture|class|system|requirements|fees|cost|student|studying)\b/i;
    
    return subjectTerms.test(message);
  }
}

export const contextManager = ContextManager.getInstance(); 