import { ConversationContext, Message, FollowUpPatterns } from '../types/chat';

class ContextService {
    private contexts: Map<string, ConversationContext> = new Map();
    private readonly sessionTimeout = 30 * 60 * 1000; // 30 minutes in milliseconds

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
            contextConfidence: 0
        };
    }

    getOrCreateContext(conversationId: string): ConversationContext {
        this.cleanupExpiredSessions();
        
        if (!this.contexts.has(conversationId)) {
            console.log('Creating new context for:', conversationId);
            const newContext = this.createNewContext();
            newContext.metadata.set('lastInteraction', Date.now());
            this.contexts.set(conversationId, newContext);
        }
        
        const context = this.contexts.get(conversationId)!;
        context.metadata.set('lastInteraction', Date.now());
        return context;
    }

    private cleanupExpiredSessions() {
        const now = Date.now();
        for (const [id, context] of this.contexts.entries()) {
            const lastInteraction = context.metadata.get('lastInteraction') as number;
            if (now - lastInteraction > this.sessionTimeout) {
                this.contexts.delete(id);
            }
        }
    }

    updateContext(message: string, isUser: boolean, context: ConversationContext) {
        // Update last interaction time
        context.metadata.set('lastInteraction', Date.now());

        // Extract subjects (majors, departments, etc.)
        const subjectPattern = /(?:Computer Science|Engineering|Medicine|Business|Law|Arts|Education|Information Technology|Dentistry|Pharmacy|Nursing|Architecture|علوم الحاسوب|الهندسة|الطب|إدارة الأعمال|القانون|الآداب|التربية|تكنولوجيا المعلومات|طب الأسنان|الصيدلة|التمريض|الهندسة المعمارية)/i;
        const subject = message.match(subjectPattern)?.[0];
        if (subject) {
            context.currentSubject = subject;
        }

        // Extract numbers with context
        const numberPatterns = {
            fee: /(\d+(?:\.\d+)?)\s*(?:NIS|₪)/i,
            average: /(\d+(?:\.\d+)?)\s*%/,
            credits: /(\d+)\s*credit\s*hours?/i,
            courses: /(\d+)\s*courses?/i,
            duration: /(\d+)\s*years?/i
        };

        for (const [key, pattern] of Object.entries(numberPatterns)) {
            const match = message.match(pattern);
            if (match) {
                context.lastNumbers.set(key, parseFloat(match[1]));
            }
        }

        // Extract entities (quoted text and capitalized words)
        const quotedText = message.match(/[""]([^""]+)[""]/g);
        const capitalizedWords = message.match(/\b[A-Z][a-z]{2,}\b/g);

        if (quotedText) {
            quotedText.forEach(text => context.lastEntities.add(text.replace(/[""]|[""]/g, '')));
        }
        if (capitalizedWords) {
            capitalizedWords.forEach(word => context.lastEntities.add(word));
        }

        // Track admission-related terms
        const admissionTerms = new Set([
            'admission', 'requirements', 'documents', 'high school',
            'القبول', 'متطلبات', 'وثائق', 'الثانوية'
        ]);

        if (message.toLowerCase().split(' ').some(word => admissionTerms.has(word))) {
            context.metadata.set('last_topic', 'admission');
        }

        if (isUser) {
            context.followUpCount++;
        }
    }

    isFollowUpQuestion(query: string, context: ConversationContext): { isFollowUp: boolean, confidence: number } {
        if (!context || context.followUpCount === 0) {
            return { isFollowUp: false, confidence: 0 };
        }

        let confidence = 0;
        const queryLower = query.toLowerCase();
        const words = queryLower.split(' ');

        // Check for follow-up indicators in all languages
        for (const language of Object.values(FollowUpPatterns)) {
            for (const [category, patterns] of Object.entries(language)) {
                if (patterns.some(pattern => queryLower.includes(pattern.toLowerCase()))) {
                    confidence += this.getConfidenceScore(category);
                }
            }
        }

        // Check for short queries (likely follow-ups)
        if (words.length <= 4) {
            confidence += 0.2;
        }

        // Check for entity references
        if (Array.from(context.lastEntities).some(entity => 
            queryLower.includes(entity.toLowerCase())
        )) {
            confidence += 0.2;
        }

        // Check for number references
        if (context.lastNumbers.size > 0 && 
            (queryLower.includes('it') || queryLower.includes('this') || 
             queryLower.includes('that') || queryLower.includes('هذا') || 
             queryLower.includes('ذلك'))) {
            confidence += 0.2;
        }

        return {
            isFollowUp: confidence >= 0.4,
            confidence
        };
    }

    private getConfidenceScore(category: string): number {
        switch (category) {
            case 'pronouns': return 0.4;
            case 'timeReferences': return 0.3;
            case 'questionModifiers': return 0.3;
            case 'comparisonWords': return 0.3;
            case 'connectors': return 0.2;
            case 'contextualReferences': return 0.3;
            default: return 0.2;
        }
    }

    getContextForQuery(query: string, recentMessages: Message[]): string {
        const contextBuilder: string[] = [];

        // Add the current query
        contextBuilder.push(`Current query: ${query}\n`);

        // Add recent conversation history
        if (recentMessages.length > 0) {
            contextBuilder.push('Recent conversation:');
            recentMessages.slice(-5).forEach(message => {
                contextBuilder.push(`${message.isUser ? 'User' : 'Assistant'}: ${message.text}`);
            });
        }

        return contextBuilder.join('\n');
    }

    resetContext(context: ConversationContext, fullReset: boolean = true) {
        context.lastNumbers.clear();
        context.lastEntities.clear();
        context.followUpCount = 0;
        context.contextConfidence = 0;

        if (fullReset) {
            context.currentTopic = null;
            context.currentSubject = null;
            context.metadata.clear();
        }
    }
}

export const contextService = new ContextService(); 