import { ConversationContext } from '../types/chat';
import { debounce, memoize } from 'lodash';
import compromise from 'compromise';
import { useCallback } from 'react';

/**
 * A unified context service that combines the best features
 * of previous context management implementations.
 */
export class UnifiedContextService {
  private static instance: UnifiedContextService;
  private contexts: Map<string, ConversationContext> = new Map();
  private readonly sessionTimeout = 30 * 60 * 1000; // 30 minutes
  
  // Cached NLP functions with memoization for better performance - fixed to avoid recursion
  private innerDetectLanguageMemoized = memoize((message: string): string => {
    if (!message) return 'en';
    
    // Simple approach: check for Arabic Unicode range
    const arabicPattern = /[\u0600-\u06FF]/;
    const englishPattern = /[a-zA-Z]/;
    
    let arabicCount = 0;
    let englishCount = 0;
    
    for (const char of message) {
      if (arabicPattern.test(char)) arabicCount++;
      if (englishPattern.test(char)) englishCount++;
    }
    
    return arabicCount > englishCount ? 'ar' : 'en';
  });
  
  private innerDetectSubjectMemoized = memoize((message: string, language: 'en' | 'ar'): string | null => {
    let highestConfidence = 0;
    let detectedSubject: string | null = null;
    
    // Check each subject pattern
    for (const [subject, patterns] of Object.entries(this.subjectPatterns)) {
      // Check patterns based on language
      const primaryPattern = language === 'ar' ? patterns.ar : patterns.en;
      const secondaryPattern = language === 'ar' ? patterns.en : patterns.ar;
      
      if (primaryPattern.test(message)) {
        if (patterns.confidence > highestConfidence) {
          highestConfidence = patterns.confidence;
          detectedSubject = subject;
        }
      } else if (secondaryPattern.test(message)) {
        const secondaryConfidence = patterns.confidence * 0.9;
        if (secondaryConfidence > highestConfidence) {
          highestConfidence = secondaryConfidence;
          detectedSubject = subject;
        }
      }
      
      // Check keywords
      for (const keyword of patterns.keywords) {
        if (message.toLowerCase().includes(keyword.toLowerCase())) {
          const keywordConfidence = patterns.confidence * 0.8;
          if (keywordConfidence > highestConfidence) {
            highestConfidence = keywordConfidence;
            detectedSubject = subject;
          }
        }
      }
    }
    
    return detectedSubject;
  });
  
  private innerDetectTopicMemoized = memoize((message: string, language: 'en' | 'ar'): string[] => {
    const detectedTopics: string[] = [];
    
    // Check each topic dictionary
    for (const [topic, keywords] of Object.entries(this.topicDictionaries)) {
      for (const keyword of keywords) {
        if (message.toLowerCase().includes(keyword.toLowerCase())) {
          detectedTopics.push(topic);
          break;
        }
      }
    }
    
    return detectedTopics;
  });
  
  // Subjects with associated patterns and keywords
  private readonly subjectPatterns: Record<string, {
    ar: RegExp;
    en: RegExp;
    keywords: string[];
    confidence: number;
  }> = {
    'Computer Science': {
      en: /\b(?:comput(?:er|ing)\s*(?:science|engineering)|software|programming|cs|code|coding|algorithm|data\s*struct(?:ure)?s?)\b/i,
      ar: /\b(?:علوم(?:\s*الكمبيوتر|\s*الحاسوب)|برمجة|خوارزميات|البرمجيات)\b/i,
      keywords: ['programming', 'software', 'algorithm', 'coding', 'data structure', 
                'علوم الحاسوب', 'برمجة', 'خوارزميات'],
      confidence: 0.9
    },
    'Engineering': {
      en: /\b(?:engineering|mechanical|electrical|civil|electronics|chemical|industrial)\b/i,
      ar: /\b(?:هندسة|هندسية|ميكانيكا|كهرباء|مدنية|إلكترونيات|كيميائية|صناعية)\b/i,
      keywords: ['engineering', 'mechanical', 'electrical', 'civil', 'electronics',
                'هندسة', 'ميكانيكا', 'كهرباء', 'مدنية'],
      confidence: 0.85
    },
    'Business': {
      en: /\b(?:business|management|finance|accounting|marketing|economics|commerce)\b/i,
      ar: /\b(?:إدارة\s*(?:الأعمال)?|تمويل|محاسبة|تسويق|اقتصاد|تجارة)\b/i,
      keywords: ['business', 'management', 'finance', 'accounting', 'marketing',
                'إدارة الأعمال', 'تمويل', 'محاسبة', 'تسويق'],
      confidence: 0.8
    },
    'Medicine': {
      en: /\b(?:medic(?:ine|al)|doctor|surgery|physician|medical\s*school|health\s*science)\b/i,
      ar: /\b(?:طب|طبية|جراحة|طبيب|كلية\s*الطب|علوم\s*صحية)\b/i,
      keywords: ['medicine', 'medical', 'doctor', 'surgery', 'physician',
                'طب', 'طبية', 'جراحة', 'طبيب'],
      confidence: 0.9
    }
  };
  
  // Topic dictionaries for better topic detection
  private readonly topicDictionaries: Record<string, string[]> = {
    'admissions': ['admission', 'apply', 'application', 'enroll', 'enrollment', 'register', 'registration', 
                  'قبول', 'تسجيل', 'التسجيل', 'الالتحاق', 'الالتحاق بالجامعة'],
    'courses': ['course', 'class', 'subject', 'lecture', 'module', 'curriculum', 'syllabus',
               'مساق', 'مادة', 'محاضرة', 'منهاج', 'مقرر', 'المواد الدراسية'],
    'fees': ['fee', 'tuition', 'cost', 'payment', 'expense', 'financial', 'scholarship', 'discount',
            'رسوم', 'تكلفة', 'دفع', 'مصاريف', 'مالية', 'منحة', 'خصم'],
    'faculty': ['professor', 'instructor', 'teacher', 'faculty', 'lecturer', 'staff', 'department',
               'أستاذ', 'مدرس', 'معلم', 'هيئة تدريس', 'محاضر', 'موظفين', 'قسم'],
    'campus': ['campus', 'building', 'facility', 'location', 'accommodation', 'housing', 'dorm',
              'حرم جامعي', 'مبنى', 'مرفق', 'موقع', 'سكن', 'إقامة', 'مسكن طلابي'],
    'graduation': ['graduate', 'graduation', 'degree', 'diploma', 'certificate', 'thesis', 'dissertation',
                  'تخرج', 'شهادة', 'درجة', 'دبلوم', 'أطروحة', 'رسالة']
  };
  
  // Topic relationship map
  private readonly topicRelations: Map<string, Set<string>> = new Map([
    ['admissions', new Set(['fees', 'courses', 'campus'])],
    ['courses', new Set(['faculty', 'graduation', 'fees'])],
    ['fees', new Set(['admissions', 'courses', 'campus'])],
    ['faculty', new Set(['courses', 'graduation'])],
    ['campus', new Set(['admissions', 'fees'])],
    ['graduation', new Set(['courses', 'faculty'])]
  ]);
  
  // Private constructor to enforce singleton
  private constructor() {
    // Initialize NLP plugins
    try {
      // Add custom plugins for Arabic language support if available
      console.log('NLP library initialized');
    } catch (e) {
      console.error('Error initializing NLP library:', e);
    }
    
    // Set up batch processing for context updates
    setInterval(() => this.processBatchedContextUpdates(), 500);
  }
  
  /**
   * Get the singleton instance of the context service
   */
  public static getInstance(): UnifiedContextService {
    if (!UnifiedContextService.instance) {
      UnifiedContextService.instance = new UnifiedContextService();
    }
    return UnifiedContextService.instance;
  }
  
  /**
   * Creates a new conversation context with initial values
   */
  private createNewContext(): ConversationContext {
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
  
  /**
   * Gets or creates a context for a conversation
   */
  public getOrCreateContext(conversationId: string): ConversationContext {
    this.cleanupExpiredSessions();
    
    if (!this.contexts.has(conversationId)) {
      console.log('Creating new context for:', conversationId);
      const newContext = this.createNewContext();
      newContext.metadata.set('lastInteraction', Date.now());
      
      // We're not restoring context from localStorage anymore to ensure
      // context is reset on page reload - as requested
      
      this.contexts.set(conversationId, newContext);
    }
    
    // Update last interaction time
    const context = this.contexts.get(conversationId)!;
    context.metadata.set('lastInteraction', Date.now());
    
    // Save context to storage for persistence within the same session
    this.persistContext(conversationId, context);
    
    return context;
  }
  
  /**
   * Remove expired contexts
   */
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
  
  /**
   * Persist context to localStorage with error handling
   */
  private persistContext(conversationId: string, context: ConversationContext): void {
    try {
      // Convert Maps and Sets to serializable format
      const serialized = JSON.stringify(context, (key, value) => {
        if (value instanceof Map) {
          return {
            dataType: 'Map',
            value: Array.from(value.entries()),
          };
        } else if (value instanceof Set) {
          return {
            dataType: 'Set',
            value: Array.from(value),
          };
        }
        return value;
      });
      
      localStorage.setItem(`context_${conversationId}`, serialized);
    } catch (error) {
      console.error('Error persisting context:', error);
    }
  }
  
  /**
   * Hydrate context from serialized state
   */
  private hydrateContext(serialized: any): ConversationContext | null {
    try {
      const context = JSON.parse(JSON.stringify(serialized), (key, value) => {
        // Handle Map data type
        if (value && typeof value === 'object' && value.dataType === 'Map') {
          return new Map(value.value);
        }
        // Handle Set data type
        if (value && typeof value === 'object' && value.dataType === 'Set') {
          return new Set(value.value);
        }
        return value;
      });
      
      return context;
    } catch (error) {
      console.error('Error hydrating context:', error);
      return null;
    }
  }
  
  // Pending context updates for batch processing
  private pendingContextUpdates: Array<{
    conversationId: string;
    message: string;
    isUser: boolean;
  }> = [];
  
  /**
   * Add a context update to the batch
   */
  public batchContextUpdate(conversationId: string, message: string, isUser: boolean): void {
    this.pendingContextUpdates.push({
      conversationId,
      message,
      isUser
    });
  }
  
  /**
   * Process all batched context updates
   */
  private processBatchedContextUpdates(): void {
    if (this.pendingContextUpdates.length === 0) return;
    
    console.log(`Processing ${this.pendingContextUpdates.length} batched context updates`);
    
    // Process updates in FIFO order
    const updates = [...this.pendingContextUpdates];
    this.pendingContextUpdates = [];
    
    for (const update of updates) {
      this.updateContext(update.message, update.isUser, update.conversationId);
    }
  }
  
  /**
   * Update context based on a message with optimized processing
   */
  public updateContext(message: string, isUser: boolean, conversationId: string): void {
    if (!message) {
      console.log('Empty message, skipping context update');
      return;
    }
    
    console.log(`Context update: ${conversationId} (${isUser ? 'user' : 'bot'})`);
    
    // Get or create context
    const context = this.getOrCreateContext(conversationId);
    
    // Run heavy operations in parallel for better performance
    Promise.all([
      this.detectLanguage(message),
      this.detectSubject(message, context.language as 'en' | 'ar'),
      this.detectTopic(message, context.language as 'en' | 'ar'),
      this.extractEntities(message),
      this.detectNumbers(message)
    ]).then(([
      language,
      subject,
      topics,
      entities,
      numbers
    ]) => {
      // Update language if detected
      if (language) {
        context.language = language;
      }
      
      // Update subject if detected with confidence
      if (subject) {
        // Track previous subject for context carryover
        if (context.currentSubject && subject !== context.currentSubject) {
          context.metadata.set('previousSubject', context.currentSubject);
        }
        context.currentSubject = subject;
      }
      
      // Update topics
      if (topics && topics.length > 0) {
        const newTopic = topics[0];
        if (context.currentTopic && newTopic !== context.currentTopic) {
          // Record topic transition for context awareness
          if (!context.state.transitions) {
            context.state.transitions = [];
          }
          
          context.state.transitions.push({
            from: context.currentTopic,
            to: newTopic,
            timestamp: Date.now(),
            trigger: message
          });
        }
        
        context.currentTopic = newTopic;
        
        // Keep track of all topics mentioned
        if (!context.topics.includes(newTopic)) {
          context.topics.push(newTopic);
        }
      }
      
      // Update entities
      if (entities && entities.length > 0) {
        entities.forEach(entity => context.lastEntities.add(entity));
      }
      
      // Update numbers
      if (numbers) {
        for (const [key, value] of Object.entries(numbers)) {
          context.lastNumbers.set(key, value);
        }
      }
      
      // Update follow-up count if it's a user message
      if (isUser) {
        context.followUpCount++;
      }
      
      // Check if this is a follow-up question
      const isFollowUp = this.isFollowUpQuestion(message, context);
      context.metadata.set('isFollowUp', isFollowUp.isFollowUp);
      
      // Calculate overall context confidence
      const confidenceScore = this.calculateContextConfidence(context, message);
      context.contextConfidence = confidenceScore;
      
      // Update the context state
      this.updateContextState(context, message, isFollowUp.isFollowUp);
      
      // Persist updated context
      this.persistContext(conversationId, context);
    });
  }
  
  /**
   * Calculate context confidence score
   */
  private calculateContextConfidence(context: ConversationContext, message: string): number {
    let confidence = 0;
    
    // Subject continuity (40%)
    if (context.currentSubject) {
      confidence += 0.4;
    }
    
    // Topic relevance (30%)
    if (context.currentTopic) {
      confidence += 0.3;
    }
    
    // Entity references (20%)
    const entityMentions = Array.from(context.lastEntities)
      .filter(entity => message.toLowerCase().includes(entity.toLowerCase())).length;
    if (entityMentions > 0) {
      confidence += Math.min(0.2, entityMentions * 0.05);
    }
    
    // Follow-up indicators (10%)
    if (context.metadata.get('isFollowUp')) {
      confidence += 0.1;
    }
    
    return Math.min(1, confidence);
  }
  
  /**
   * Detect the language of a message (optimized)
   */
  private detectLanguage(message: string): string {
    // Use the memoized implementation directly
    return this.innerDetectLanguageMemoized(message);
  }
  
  /**
   * Detect subject from message with language support
   */
  private detectSubject(message: string, language: 'en' | 'ar'): string | null {
    // Use the memoized implementation directly
    return this.innerDetectSubjectMemoized(message, language);
  }
  
  /**
   * Detect topics from a message with language support
   */
  private detectTopic(message: string, language: 'en' | 'ar'): string[] {
    // Use the memoized implementation directly
    return this.innerDetectTopicMemoized(message, language);
  }
  
  /**
   * Extract entities from a message
   */
  private extractEntities(message: string): string[] {
    const entities: string[] = [];
    
    // Extract quoted text
    const quotedText = message.match(/[""]([^""]+)[""]/g);
    if (quotedText) {
      quotedText.forEach(text => entities.push(text.replace(/[""]|[""]/g, '')));
    }
    
    // Extract capitalized words in English
    const capitalizedWords = message.match(/\b[A-Z][a-z]{2,}\b/g);
    if (capitalizedWords) {
      capitalizedWords.forEach(word => entities.push(word));
    }
    
    // Use NLP for entity extraction
    try {
      const doc = compromise(message);
      const people = doc.people().out('array') as string[];
      const places = doc.places().out('array') as string[];
      const organizations = doc.organizations().out('array') as string[];
      
      entities.push(...people, ...places, ...organizations);
    } catch (e) {
      console.warn('NLP entity extraction failed:', e);
    }
    
    return [...new Set(entities)]; // Remove duplicates
  }
  
  /**
   * Extract numbers with context from a message
   */
  private detectNumbers(message: string): Record<string, number> {
    const numbers: Record<string, number> = {};
    
    const numberPatterns = {
      fee: /(\d+(?:\.\d+)?)\s*(?:NIS|₪|dollars?|JD)/i,
      average: /(\d+(?:\.\d+)?)\s*%/,
      credits: /(\d+)\s*credit\s*hours?/i,
      courses: /(\d+)\s*courses?/i,
      duration: /(\d+)\s*years?/i
    };
    
    for (const [key, pattern] of Object.entries(numberPatterns)) {
      const match = message.match(pattern);
      if (match) {
        numbers[key] = parseFloat(match[1]);
      }
    }
    
    return numbers;
  }
  
  /**
   * Check if a message is likely a follow-up question
   */
  private isFollowUpQuestion(message: string, context: ConversationContext): { isFollowUp: boolean; confidence: number } {
    if (!message || context.followUpCount === 0) {
      return { isFollowUp: false, confidence: 0 };
    }
    
    let confidence = 0;
    const isArabic = context.language === 'ar';
    
    // Common follow-up indicators (English)
    const englishFollowUpPatterns = [
      /^(?:and|but|so|what about|how about|what if|is there|are there|can you|do you)/i,
      /\b(?:also|too|as well|another|more|further)\b/i,
      /\?$/,
      /^(?:why|how|when|where|who|which)/i
    ];
    
    // Common follow-up indicators (Arabic)
    const arabicFollowUpPatterns = [
      /^(?:و|لكن|ماذا عن|ماذا لو|هل هناك|هل يمكنك)/i,
      /\b(?:أيضاً|أيضا|كذلك|آخر|المزيد)\b/i,
      /\?$/,
      /^(?:لماذا|كيف|متى|أين|من|أي)/i
    ];
    
    // Check message for follow-up indicators
    const patterns = isArabic ? arabicFollowUpPatterns : englishFollowUpPatterns;
    
    for (const pattern of patterns) {
      if (pattern.test(message)) {
        confidence += 0.25; // 25% for each pattern matched
      }
    }
    
    // Check for pronouns indicating reference to previous context
    const pronounPatterns = isArabic 
      ? /\b(?:هو|هي|هم|ذلك|تلك|هؤلاء|هذا|هذه)\b/i
      : /\b(?:it|they|them|that|this|those|these)\b/i;
      
    if (pronounPatterns.test(message)) {
      confidence += 0.3;
    }
    
    // Check for mentions of entities from previous context
    const entityMentions = Array.from(context.lastEntities)
      .filter(entity => message.toLowerCase().includes(entity.toLowerCase())).length;
    
    if (entityMentions > 0) {
      confidence += Math.min(0.3, entityMentions * 0.1);
    }
    
    // Recent interaction factor
    const lastInteraction = context.metadata.get('lastInteraction');
    if (lastInteraction) {
      const timeSinceLastInteraction = Date.now() - lastInteraction;
      // If less than 3 minutes, it's likely a follow-up
      if (timeSinceLastInteraction < 3 * 60 * 1000) {
        confidence += 0.2;
      }
    }
    
    // Cap confidence at 1.0
    confidence = Math.min(1, confidence);
    
    return {
      isFollowUp: confidence >= 0.5,
      confidence
    };
  }
  
  /**
   * Update the context state based on the message and current context
   */
  private updateContextState(context: ConversationContext, message: string, isFollowUp: boolean): void {
    const currentState = context.state.currentState;
    let newState = currentState;
    
    // State transition logic
    switch (currentState) {
      case 'initial':
        if (context.currentSubject) {
          newState = 'subject_selected';
        }
        break;
        
      case 'subject_selected':
        if (context.currentTopic) {
          newState = 'topic_focused';
        } else if (isFollowUp) {
          newState = 'follow_up';
        }
        break;
        
      case 'topic_focused':
        if (isFollowUp) {
          newState = 'follow_up';
        } else if (!context.currentTopic) {
          // Topic has been lost/changed
          if (context.currentSubject) {
            newState = 'subject_selected';
          } else {
            newState = 'initial';
          }
        }
        break;
        
      case 'follow_up':
        if (!isFollowUp) {
          // No longer a follow-up, check what state to transition to
          if (context.currentTopic) {
            newState = 'topic_focused';
          } else if (context.currentSubject) {
            newState = 'subject_selected';
          } else {
            newState = 'initial';
          }
        }
        break;
        
      case 'clarification':
        if (context.contextConfidence > 0.6) {
          // We have high confidence, no longer in clarification mode
          if (context.currentTopic) {
            newState = 'topic_focused';
          } else if (context.currentSubject) {
            newState = 'subject_selected';
          } else {
            newState = 'initial';
          }
        }
        break;
    }
    
    // Only record transition if state changed
    if (newState !== currentState) {
      context.state.transitions.push({
        from: currentState,
        to: newState,
        timestamp: Date.now(),
        trigger: message
      });
      
      context.state.currentState = newState;
    }
  }
  
  /**
   * Reset the conversation context with options
   */
  public resetContext(conversationId: string, fullReset: boolean = true): void {
    if (!this.contexts.has(conversationId)) {
      console.log('No context to reset for:', conversationId);
      return;
    }
    
    const existingContext = this.contexts.get(conversationId)!;
    const lastInteraction = existingContext.metadata.get('lastInteraction');
    
    if (fullReset) {
      // Create a completely fresh context
      const newContext = this.createNewContext();
      newContext.metadata.set('lastInteraction', Date.now());
      this.contexts.set(conversationId, newContext);
      
      // Clear persisted context
      localStorage.removeItem(`context_${conversationId}`);
    } else {
      // Partial reset - keep some contextual data
      const newContext = this.createNewContext();
      
      // Preserve language and lastInteraction if available
      if (existingContext.language) {
        newContext.language = existingContext.language;
      }
      
      if (lastInteraction) {
        newContext.metadata.set('lastInteraction', lastInteraction);
      } else {
        newContext.metadata.set('lastInteraction', Date.now());
      }
      
      this.contexts.set(conversationId, newContext);
      this.persistContext(conversationId, newContext);
    }
    
    console.log(`Context reset for ${conversationId}, fullReset=${fullReset}`);
  }
  
  /**
   * Get context information for generating a response
   */
  public getContextForResponse(conversationId: string): {
    subject: string | null;
    topic: string | null;
    isFollowUp: boolean;
    contextConfidence: number;
    language: string;
    relevantEntities: string[];
    state: string;
  } {
    const context = this.getOrCreateContext(conversationId);
    
    return {
      subject: context.currentSubject,
      topic: context.currentTopic,
      isFollowUp: context.metadata.get('isFollowUp') || false,
      contextConfidence: context.contextConfidence,
      language: context.language,
      relevantEntities: Array.from(context.lastEntities).slice(0, 5),
      state: context.state.currentState
    };
  }
  
  /**
   * Get the full context for debugging purposes
   */
  public getDebugContext(conversationId: string): any {
    const context = this.getOrCreateContext(conversationId);
    
    // Create a serializable version of the context
    return {
      currentSubject: context.currentSubject,
      currentTopic: context.currentTopic,
      language: context.language,
      followUpCount: context.followUpCount,
      contextConfidence: context.contextConfidence,
      state: context.state.currentState,
      lastEntities: Array.from(context.lastEntities),
      lastNumbers: Object.fromEntries(context.lastNumbers),
      topics: context.topics,
      stateTransitions: context.state.transitions,
      isFollowUp: context.metadata.get('isFollowUp') || false
    };
  }
}

// Export a singleton instance
export const unifiedContextService = UnifiedContextService.getInstance();

// React hook for using the context in components
export const useUnifiedContext = () => {
  const updateContext = useCallback((message: string, isUser: boolean, conversationId: string) => {
    unifiedContextService.updateContext(message, isUser, conversationId);
  }, []);
  
  const getContext = useCallback((conversationId: string) => {
    return unifiedContextService.getOrCreateContext(conversationId);
  }, []);
  
  const resetContext = useCallback((conversationId: string, fullReset: boolean = true) => {
    unifiedContextService.resetContext(conversationId, fullReset);
  }, []);
  
  const getContextForResponse = useCallback((conversationId: string) => {
    return unifiedContextService.getContextForResponse(conversationId);
  }, []);
  
  return {
    updateContext,
    getContext,
    resetContext,
    getContextForResponse
  };
}; 