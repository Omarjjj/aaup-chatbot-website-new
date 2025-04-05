import { ConversationContext } from '../types/chat';

/**
 * SimpleContextManager - A simplified context management service modeled after the Kotlin implementation.
 * Focusing only on essential features for tracking conversation context.
 */
class SimpleContextManager {
  // Store context by conversation ID
  private contexts: Map<string, ConversationContext> = new Map();
  private readonly sessionTimeout = 30 * 60 * 1000; // 30 minutes in milliseconds

  /**
   * Create a new context object
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
   * Get or create context for a conversation
   */
  getOrCreateContext(conversationId: string): ConversationContext {
    // Clean up expired sessions first
    this.cleanupExpiredSessions();
    
    // Create new context if none exists
    if (!this.contexts.has(conversationId)) {
      console.log('Creating new context for:', conversationId);
      const newContext = this.createNewContext();
      newContext.metadata.set('lastInteraction', Date.now());
      this.contexts.set(conversationId, newContext);
    }
    
    // Update last interaction time
    const context = this.contexts.get(conversationId)!;
    context.metadata.set('lastInteraction', Date.now());
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
      }
    }
  }

  /**
   * Update context based on a message with detailed logging
   */
  updateContext(message: string, isUser: boolean, conversationId: string): void {
    if (!message) {
      console.log('Empty message, skipping context update');
      return;
    }
    
    console.log(`%c🔄 CONTEXT UPDATE (${isUser ? 'USER' : 'BOT'} MESSAGE)`, 'background: #0c4e86; color: white; padding: 2px 4px; border-radius: 2px;');
    console.log('Message:', message);
    console.log('Is User Message:', isUser);
    console.log('Conversation ID:', conversationId);
    
    // Get or create context
    const context = this.getOrCreateContext(conversationId);
    console.log('Current context state:', {
      currentSubject: context.currentSubject,
      currentTopic: context.currentTopic,
      followUpCount: context.followUpCount,
      lastNumbers: Object.fromEntries(context.lastNumbers),
      language: context.language
    });
    
    // Check if this is a continuation message like "and?", "okay", etc.
    const isContinuation = isUser && /^(okay|ok|and\??|then\??|next\??|go on|continue|proceed|tell me more|yes|yeah|yep|sure|please do|go ahead|what else|anything else|more information|elaborate)$/i.test(message.toLowerCase().trim());
    
    if (isContinuation) {
      console.log('Detected continuation message, preserving existing context and subject/topic');
      
      // Save that this is a continuation in metadata
      context.metadata.set('isContinuation', true);
      context.metadata.set('lastContinuationTime', Date.now());
      context.metadata.set('maintainSubject', true);
      
      // For continuations, increment follow-up count but don't change the subject/topic
      if (isUser) {
        context.followUpCount++;
        console.log(`Increased follow-up count to ${context.followUpCount} for continuation message`);
      }
      
      // Early return to preserve existing context
      return;
    }
    
    // Detect language (simple implementation)
    const detectedLanguage = this.detectLanguage(message);
    if (detectedLanguage) {
      const previousLanguage = context.language;
      context.language = detectedLanguage;
      console.log(`Language ${previousLanguage !== detectedLanguage ? 'changed' : 'maintained'}: ${context.language}`);
    }
    
    // Check for possessive pronouns like "its" before extracting a new subject
    const possessivePronouns = /\b(its|it's|their|his|her|the)\b\s+([a-z]+)/gi;
    const hasPossessiveReference = possessivePronouns.test(message.toLowerCase());
    
    if (hasPossessiveReference && context.currentSubject) {
      console.log(`Possessive reference detected with existing subject "${context.currentSubject}". Maintaining subject.`);
      context.metadata.set('maintainSubject', true);
      context.metadata.set('possessiveReferenceDetected', true);
      context.contextConfidence = Math.max(context.contextConfidence, 0.9); // Ensure high confidence
    }
    
    // Extract subjects only if we're not explicitly maintaining the current subject
    let shouldMaintainSubject = context.metadata.get('maintainSubject') === true;
    const normText = message.toLowerCase();
    
    // Also check for specific follow-up structures that refer to the previous subject
    if (isUser && 
        context.currentSubject && 
        (normText.includes('what is its') || 
         normText.includes('what are its') || 
         normText.includes('how much is its') ||
         normText.includes('what about its'))) {
      shouldMaintainSubject = true;
      context.metadata.set('maintainSubject', true);
      console.log(`Query directly references current subject "${context.currentSubject}" with "its". Maintaining subject.`);
    }
    
    // Only try to detect a new subject if we're not maintaining the current one
    if (!shouldMaintainSubject) {
      const subject = this.detectSubject(message, context.language as 'en' | 'ar');
      
      if (subject) {
        // Track previous subject for context carryover
        if (context.currentSubject && subject !== context.currentSubject) {
          context.metadata.set('previousSubject', context.currentSubject);
          console.log(`SUBJECT CHANGE: ${context.currentSubject} -> ${subject}`);
        }
        context.currentSubject = subject;
        console.log(`Current subject set/maintained: ${subject}`);
      } else if (context.currentSubject) {
        console.log(`Maintaining existing subject: ${context.currentSubject}`);
      }
    } else {
      console.log(`Explicitly maintaining current subject: ${context.currentSubject}`);
    }
    
    // Extract numbers with context 
    const previousNumbers = new Map(context.lastNumbers);
    const numberPatterns = {
      fee: /(\d+(?:\.\d+)?)\s*(?:NIS|₪)/i,
      average: /(\d+(?:\.\d+)?)\s*%/i,
      credits: /(\d+)\s*credit\s*hours?/i,
      courses: /(\d+)\s*courses?/i,
      duration: /(\d+)\s*years?/i
    };

    console.log('Searching for number patterns...');
    for (const [key, pattern] of Object.entries(numberPatterns)) {
      const match = message.match(pattern);
      if (match && match[1]) {
        const value = parseFloat(match[1]);
        context.lastNumbers.set(key, value);
        console.log(`EXTRACTED NUMBER: ${key} = ${value}`);
      }
    }
    
    // Compare previous and current numbers
    if (previousNumbers.size !== context.lastNumbers.size) {
      const newKeys = Array.from(context.lastNumbers.keys())
        .filter(key => !previousNumbers.has(key));
      
      if (newKeys.length > 0) {
        console.log('New number types extracted:', newKeys);
      }
    }
    
    // Track admission-related terms
    const admissionTerms = new Set([
      'admission', 'requirements', 'documents', 'high school',
      'القبول', 'متطلبات', 'وثائق', 'الثانوية'
    ]);

    const hasAdmissionTerm = message.toLowerCase().split(/\s+/).some(word => {
      const included = admissionTerms.has(word);
      if (included) console.log(`Found admission term: "${word}"`);
      return included;
    });
    
    if (hasAdmissionTerm) {
      context.metadata.set('last_topic', 'admission');
      console.log('Set last_topic to "admission"');
    }
    
    // Update follow-up count for user messages
    if (isUser) {
      context.followUpCount++;
      console.log(`Increased follow-up count to ${context.followUpCount}`);
    }
    
    // Update topic based on keywords with detailed logging
    this.updateTopic(context, message);
    
    // If it's a bot message, try to extract main topic from the response
    // This is important to know what the bot was talking about for continuation queries
    if (!isUser) {
      const extractedTopics = this.extractTopicsFromBotMessage(message);
      if (extractedTopics.length > 0) {
        // Store the extracted topics for context
        context.metadata.set('lastResponseTopics', extractedTopics);
        console.log('Extracted topics from bot response:', extractedTopics);
        
        // If we don't already have a topic and subject, use the first extracted topic
        if (!context.currentTopic && extractedTopics.length > 0) {
          context.currentTopic = extractedTopics[0];
          console.log(`Setting topic from bot response: ${context.currentTopic}`);
        }
      }
    }
    
    // Log the final context state
    console.log('%c📋 UPDATED CONTEXT STATE', 'background: #295e22; color: white; padding: 2px 4px; border-radius: 2px;');
    console.log('Subject:', context.currentSubject);
    console.log('Topic:', context.currentTopic);
    console.log('Follow-up count:', context.followUpCount);
    console.log('Numbers:', Object.fromEntries(context.lastNumbers));
    console.log('Metadata:', Object.fromEntries(context.metadata));
  }

  /**
   * Detect language of a message with improved logic and logging
   */
  private detectLanguage(text: string): 'en' | 'ar' {
    console.log('Detecting language for:', text.substring(0, 50) + (text.length > 50 ? '...' : ''));
    
    if (!text || text.trim().length === 0) {
      console.log('Empty text, defaulting to English');
      return 'en';
    }
    
    // Count Arabic vs English characters
    const arabicPattern = /[\u0600-\u06FF]/g;
    const arabicMatches = text.match(arabicPattern) || [];
    const arabicCount = arabicMatches.length;
    
    // Count Latin alphabet characters
    const latinPattern = /[a-zA-Z]/g;
    const latinMatches = text.match(latinPattern) || [];
    const latinCount = latinMatches.length;
    
    console.log(`Character count - Arabic: ${arabicCount}, Latin: ${latinCount}`);
    
    // Simple rule - if more Arabic than Latin characters, consider it Arabic
    if (arabicCount > latinCount * 0.5) {
      console.log('Detected language: Arabic');
      return 'ar';
    } else {
      console.log('Detected language: English');
      return 'en';
    }
  }

  /**
   * Update topic based on message keywords with detailed logging
   */
  private updateTopic(context: ConversationContext, message: string): void {
    console.log('%c🔍 TOPIC DETECTION', 'background: #5f2f73; color: white; padding: 2px 4px; border-radius: 2px;');
    
    const topicKeywords = {
      admission: ['admission', 'apply', 'application', 'القبول', 'التقديم'],
      fees: ['fees', 'cost', 'tuition', 'payment', 'الرسوم', 'التكلفة', 'الدفع'],
      programs: ['program', 'major', 'course', 'برنامج', 'تخصص'],
      requirements: ['requirements', 'prerequisites', 'الشروط', 'المتطلبات'],
      schedule: ['schedule', 'timetable', 'calendar', 'الجدول', 'المواعيد'],
      highschool: ['high school', 'average', 'gpa', 'grade', 'الثانوية', 'المعدل']
    };

    const lowercaseMessage = message.toLowerCase();
    console.log('Analyzing for topic keywords in:', lowercaseMessage);
    
    // Remember the previous topic
    const previousTopic = context.currentTopic;
    let topicFound = false;
    
    // Check each set of keywords
    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      console.log(`Checking for ${topic} keywords...`);
      
      // Look for matching keywords
      const foundKeywords = keywords.filter(keyword => lowercaseMessage.includes(keyword));
      
      if (foundKeywords.length > 0) {
        topicFound = true;
        context.currentTopic = topic;
        console.log(`TOPIC DETECTED: ${topic} (keywords: ${foundKeywords.join(', ')})`);
        
        // Check if topic changed
        if (previousTopic && previousTopic !== topic) {
          console.log(`Topic changed: ${previousTopic} -> ${topic}`);
        } else if (previousTopic === topic) {
          console.log(`Topic maintained: ${topic}`);
        } else {
          console.log(`New topic set: ${topic}`);
        }
        
        break;
      }
    }
    
    if (!topicFound && context.currentTopic) {
      console.log(`No new topic found, maintaining: ${context.currentTopic}`);
    } else if (!topicFound) {
      console.log('No topic keywords found in message');
    }
  }

  /**
   * Check if a message is a follow-up question with detailed analysis
   */
  isFollowUpQuestion(query: string, conversationId: string): { isFollowUp: boolean; confidence: number } {
    console.log('%c🔎 FOLLOW-UP DETECTION START', 'background: #581845; color: white; padding: 2px 4px; border-radius: 2px;');
    console.log('Analyzing query:', query);
    
    const context = this.getOrCreateContext(conversationId);
    console.log('Context state:', {
      subject: context.currentSubject,
      topic: context.currentTopic,
      followUpCount: context.followUpCount,
      numbers: Object.fromEntries(context.lastNumbers)
    });
    
    // Return false for empty strings or new conversations
    if (!query || !query.trim()) {
      console.log('Empty query, not a follow-up');
      return { isFollowUp: false, confidence: 0 };
    }
    
    if (context.followUpCount === 0) {
      console.log('First message in conversation, not a follow-up');
      return { isFollowUp: false, confidence: 0 };
    }
    
    // Normalize text for analysis
    const normalizedText = query.toLowerCase().trim();
    console.log('Normalized query:', normalizedText);
    
    // Simple scoring system
    let score = 0;
    const maxScore = 5;
    const reasons: string[] = [];

    // IMPORTANT: Check for possessive pronouns like "its" which strongly indicate continuing with the current subject
    const possessivePronounMatches = normalizedText.match(/\b(its|it's|their|his|her|the)\b\s+([a-z]+)/gi);
    if (possessivePronounMatches && possessivePronounMatches.length > 0) {
      // This is a very strong indicator of a follow-up about the current subject
      score += 3;
      
      // Special handling for subject persistence - mark that the current subject should be maintained
      context.metadata.set('maintainSubject', true);
      context.metadata.set('possessiveReferenceDetected', true);
      
      // Log the detected possessive pronouns
      const detectedAttributes = possessivePronounMatches.map(match => match.trim());
      context.metadata.set('referencedAttributes', detectedAttributes);
      
      console.log(`Detected possessive pronouns: ${detectedAttributes.join(', ')}`);
      reasons.push(`Possessive reference detected: ${detectedAttributes.join(', ')}`);
      
      // Set high confidence for subject maintenance
      context.contextConfidence = 0.9;
    }

    // NEW: Check for common continuations that should ALWAYS be treated as follow-ups
    const continuationPatterns = {
      en: [
        { pattern: /^(okay|ok|and\??|then\??|next\??|go on|continue|proceed|tell me more)$/i, description: 'Explicit continuation phrase' },
        { pattern: /^(yes|yeah|yep|sure|please do|go ahead)$/i, description: 'Affirmative continuation' },
        { pattern: /^(what else|anything else|more information|elaborate)$/i, description: 'Request for elaboration' }
      ],
      ar: [
        { pattern: /^(طيب|ماشي|و\??|ثم\??|التالي\??|استمر|أكمل)$/i, description: 'Arabic continuation phrase' },
        { pattern: /^(نعم|أجل|أكيد|تفضل)$/i, description: 'Arabic affirmative continuation' },
        { pattern: /^(ماذا أيضا|هل هناك المزيد|معلومات أكثر)$/i, description: 'Arabic request for elaboration' }
      ]
    };
    
    const language = context.language as 'en' | 'ar';
    
    // Check for exact continuations that strongly indicate follow-ups
    for (const { pattern, description } of continuationPatterns[language] || continuationPatterns.en) {
      if (pattern.test(normalizedText)) {
        // High score for these explicit continuations
        score += 4; 
        console.log(`Detected ${description}: ${normalizedText}`);
        reasons.push(`${description}: "${normalizedText}"`);
        
        // Set special metadata to indicate this is a pure continuation that should maintain previous topic
        context.metadata.set('isContinuation', true);
        context.metadata.set('continuationType', description);
        context.metadata.set('shouldMaintainTopic', true);
        context.metadata.set('maintainSubject', true);
        
        // For pure continuations, strengthen the context confidence
        context.contextConfidence = 0.95;
        
        console.log('Set continuation metadata:', {
          isContinuation: true,
          continuationType: description,
          shouldMaintainTopic: true,
          contextConfidence: context.contextConfidence
        });
      }
    }
    
    // Factor 1: Check for short queries (likely follow-ups)
    const wordCount = normalizedText.split(/\s+/).length;
    if (wordCount <= 4) {
      score += 1;
      reasons.push(`Short query (${wordCount} words)`);
      console.log(`Short query detected: ${wordCount} words`);
    }
    
    // Factor 2: Check for follow-up markers at beginning
    console.log('Language:', language);
    
    // Define markers by language
    if (language === 'ar') {
      const arabicMarkers = [
        { pattern: /^(و|ف|كما|لكن|أيضا|ماذا عن|ماذا|هل|كيف)/i, description: 'Arabic follow-up indicator' }
      ];
      
      for (const { pattern, description } of arabicMarkers) {
        if (pattern.test(normalizedText)) {
          score += 2;
          console.log(`Detected ${description}: ${normalizedText.match(pattern)?.[0]}`);
          reasons.push(`${description}: "${normalizedText.match(pattern)?.[0]}"`);
        }
      }
    } else {
      // English follow-up markers with exact patterns for better debugging
      const englishMarkers = [
        { pattern: /^(and)\b/i, description: 'Starting with "and"' },
        { pattern: /^(but)\b/i, description: 'Starting with "but"' },
        { pattern: /^(so)\b/i, description: 'Starting with "so"' },
        { pattern: /^(what about)\b/i, description: 'Starting with "what about"' },
        { pattern: /^(how about)\b/i, description: 'Starting with "how about"' },
        { pattern: /^(tell me about)\b/i, description: 'Starting with "tell me about"' },
        { pattern: /^(also)\b/i, description: 'Starting with "also"' },
        { pattern: /^(what)\b/i, description: 'Starting with "what"' },
        { pattern: /^(how)\b/i, description: 'Starting with "how"' }
      ];
      
      for (const { pattern, description } of englishMarkers) {
        if (pattern.test(normalizedText)) {
          score += 2;
          console.log(`Detected ${description}: ${normalizedText.match(pattern)?.[0]}`);
          reasons.push(description);
        }
      }
    }
    
    // Factor 3: Check for pronouns and references to previous content
    const pronounPatterns = {
      en: [
        { pattern: /\b(this|that|these|those|it|they|them|he|she|its)\b/i, description: 'English pronoun' }
      ],
      ar: [
        { pattern: /\b(هذا|ذلك|هؤلاء|تلك|هم|هي|هو)\b/i, description: 'Arabic pronoun' }
      ]
    };
    
    for (const { pattern, description } of pronounPatterns[language] || pronounPatterns.en) {
      const match = normalizedText.match(pattern);
      if (match) {
        score += 1.5;
        console.log(`Detected ${description}: ${match[0]}`);
        reasons.push(`${description}: "${match[0]}"`);
        
        // Special handling for subject persistence
        if (match[0].toLowerCase() === 'its' || match[0].toLowerCase() === 'it' || match[0].toLowerCase() === 'this') {
          context.metadata.set('maintainSubject', true);
          console.log('Subject should be maintained due to pronoun reference:', match[0]);
        }
      }
    }
    
    // Factor 4: Check if subject is maintained (no new subject mentioned)
    if (context.currentSubject) {
      const newSubject = this.detectSubject(query, language);
      if (!newSubject) {
        score += 1.5;
        console.log(`Current subject maintained: ${context.currentSubject}`);
        reasons.push(`Maintained subject: ${context.currentSubject}`);
        
        // Mark to maintain the current subject
        context.metadata.set('maintainSubject', true);
      } else if (newSubject === context.currentSubject) {
        score += 1;
        console.log(`Same subject repeated: ${context.currentSubject}`);
        reasons.push(`Repeated subject: ${context.currentSubject}`);
      } else {
        console.log(`Subject changed: ${context.currentSubject} -> ${newSubject}`);
        // Clear the maintain subject flag if a new different subject is detected
        context.metadata.delete('maintainSubject');
      }
    }
    
    // Factor 5: Check if a previous number is referenced (very strong follow-up indicator)
    if (context.lastNumbers.size > 0) {
      const numbers = Array.from(context.lastNumbers.entries());
      for (const [key, value] of numbers) {
        // Look for references to the number directly
        if (normalizedText.includes(String(value))) {
          score += 1.5;
          console.log(`Referenced previous number ${value} (${key})`);
          reasons.push(`Referenced number: ${value}`);
        }
        
        // Look for references to the type of number
        const numberTypeReferences = {
          fee: /(fees?|cost|price|amount|payment)/i,
          average: /(average|grade|score|mark|percentage)/i,
          credits: /(credits?|hours?|points?)/i
        };
        
        const typePattern = numberTypeReferences[key as keyof typeof numberTypeReferences];
        if (typePattern && typePattern.test(normalizedText)) {
          score += 1;
          console.log(`Referenced ${key} without explicit value`);
          reasons.push(`Referenced ${key} concept`);
        }
      }
    }
    
    // Extra check: Look for contextual references 
    const contextualReferencePatterns = {
      en: [
        /\b(mentioned|said|told|stated|above|previous|earlier|before)\b/i,
        /\b(again|one more time|repeat)\b/i
      ],
      ar: [
        /\b(ذكرت|قلت|أخبرتني|سابقا|قبل|أعلاه)\b/i,
        /\b(مرة أخرى|كرر|مجددا)\b/i
      ]
    };
    
    for (const pattern of contextualReferencePatterns[language] || contextualReferencePatterns.en) {
      if (pattern.test(normalizedText)) {
        score += 1;
        console.log(`Contextual reference: ${normalizedText.match(pattern)?.[0]}`);
        reasons.push(`Contextual reference: "${normalizedText.match(pattern)?.[0]}"`);
      }
    }
    
    // Factor 6: Check if query is extremely short (just 1-2 words) - strong follow-up indicator
    if (wordCount <= 2) {
      score += 1;
      console.log(`Very short query (${wordCount} words)`);
      reasons.push(`Very short query: ${wordCount} words`);
    }
    
    // Factor 7: Check for incomplete questions or phrases
    const incompletePatterns = {
      en: [
        /^(and then|for what|with what|by what|from where)\??\s*$/i,
        /^(how much|how many|when|where|why|who)\??\s*$/i
      ],
      ar: [
        /^(وماذا|كم|متى|أين|لماذا|من)\??\s*$/i
      ]
    };
    
    for (const pattern of incompletePatterns[language] || incompletePatterns.en) {
      if (pattern.test(normalizedText)) {
        score += 2;
        console.log(`Incomplete question: ${normalizedText}`);
        reasons.push(`Incomplete question: "${normalizedText}"`);
      }
    }
    
    // Simple threshold and confidence calculation
    const isFollowUp = score >= 2;
    const confidence = Math.min(score / maxScore, 1); // Cap at 1
    
    console.log('%c📊 FOLLOW-UP ANALYSIS RESULTS', 'background: #7B3F00; color: white; padding: 2px 4px; border-radius: 2px;');
    console.log(`Score: ${score.toFixed(1)}/${maxScore} (${(confidence * 100).toFixed(1)}%)`);
    console.log(`Reasons (${reasons.length}):`, reasons);
    console.log(`Is follow-up: ${isFollowUp}`);
    
    return { isFollowUp, confidence };
  }

  /**
   * Get context for a query to send to backend
   */
  getContextForQuery(query: string, conversationId: string): string {
    const context = this.getOrCreateContext(conversationId);
    const contextBuilder: string[] = [];
    
    // Add the current query
    contextBuilder.push(`Current query: ${query}\n`);
    
    // Add subject if available
    if (context.currentSubject) {
      contextBuilder.push(`Current subject: ${context.currentSubject}`);
    }
    
    // Add topic if available
    if (context.currentTopic) {
      contextBuilder.push(`Current topic: ${context.currentTopic}`);
    }
    
    // Add any extracted numbers
    if (context.lastNumbers.size > 0) {
      contextBuilder.push("Extracted values:");
      for (const [key, value] of context.lastNumbers.entries()) {
        contextBuilder.push(`- ${key}: ${value}`);
      }
    }
    
    return contextBuilder.join('\n');
  }
  
  /**
   * Reset the conversation context, optionally preserving the timestamp
   */
  resetContext(conversationId: string, fullReset: boolean = true): void {
    if (!this.contexts.has(conversationId)) {
      console.log('No context to reset for:', conversationId);
      return;
    }
    
    const existingContext = this.contexts.get(conversationId)!;
    const lastInteraction = existingContext.metadata.get('lastInteraction');
    
    // Create a fresh context
    const newContext = this.createNewContext();
    
    // Optionally preserve the last interaction timestamp
    if (!fullReset && lastInteraction) {
      newContext.metadata.set('lastInteraction', lastInteraction);
    } else {
      newContext.metadata.set('lastInteraction', Date.now());
    }
    
    // Replace the existing context
    this.contexts.set(conversationId, newContext);
    console.log(`Context reset for ${conversationId}, fullReset=${fullReset}`);
  }

  /**
   * Detect subject from a message
   */
  detectSubject(message: string, language: 'en' | 'ar'): string | null {
    console.log('Detecting subject for:', message);
    if (!message) return null;
    
    // Normalize text for cleaner pattern matching
    const normalizedText = message.toLowerCase().trim();
    
    // Subject patterns for different languages
    const subjectPatterns = {
      en: /\b(computer science|engineering|medicine|business|law|arts|education|information technology|dentistry|pharmacy|nursing|architecture|optometry)\b/i,
      ar: /\b(علوم الحاسوب|الهندسة|الطب|إدارة الأعمال|القانون|الآداب|التربية|تكنولوجيا المعلومات|طب الأسنان|الصيدلة|التمريض|الهندسة المعمارية|البصريات)\b/i
    };
    
    // Get the appropriate pattern based on language
    const pattern = subjectPatterns[language];
    
    // Find the first match
    const match = normalizedText.match(pattern);
    
    if (match) {
      const subject = this.toTitleCase(match[0]);
      console.log('Subject detected:', subject);
      return subject;
    }
    
    console.log('No subject detected');
    return null;
  }
  
  /**
   * Helper method to convert string to Title Case
   */
  private toTitleCase(str: string): string {
    return str.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Extract main topics from a bot response message
   * This helps maintain context for follow-up questions
   */
  private extractTopicsFromBotMessage(message: string): string[] {
    console.log('Extracting topics from bot message');
    
    // Check for headings which often indicate the main topic
    const headingPattern = /^#+\s*(.+?)(?:\n|$)/gm;
    const headings: string[] = [];
    let match;
    
    while ((match = headingPattern.exec(message)) !== null) {
      const heading = match[1].trim();
      headings.push(heading);
      console.log(`Found heading: "${heading}"`);
    }
    
    // If we have headings, use them as topics
    if (headings.length > 0) {
      return headings;
    }
    
    // Otherwise, look for key topic indicators
    const topics: string[] = [];
    
    // Common educational topics
    const topicPatterns = [
      { pattern: /(?:tuition|fees|cost|payment|financial)/i, topic: "fees" },
      { pattern: /(?:admission|application|enroll|register)/i, topic: "admission" },
      { pattern: /(?:program|major|curriculum|study|course)/i, topic: "programs" },
      { pattern: /(?:scholarship|grant|financial aid)/i, topic: "scholarships" },
      { pattern: /(?:campus|location|facility|building)/i, topic: "campus" },
      { pattern: /(?:credit hour|semester|academic)/i, topic: "academics" },
      { pattern: /(?:president|dean|faculty|staff|administration)/i, topic: "administration" },
      { pattern: /(?:hostel|dormitory|housing|accommodation)/i, topic: "housing" }
    ];
    
    for (const { pattern, topic } of topicPatterns) {
      if (pattern.test(message)) {
        console.log(`Detected topic in bot message: ${topic}`);
        topics.push(topic);
      }
    }
    
    return topics;
  }
}

// Export a singleton instance
export const simpleContextManager = new SimpleContextManager(); 