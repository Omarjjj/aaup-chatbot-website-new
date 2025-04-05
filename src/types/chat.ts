export interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface ConversationContext {
  currentTopic: string | null;
  currentSubject: string | null;
  lastNumbers: Map<string, number>;
  lastEntities: Set<string>;
  followUpCount: number;
  metadata: Map<string, any>;
  topics: string[];
  entities: Record<string, string>;
  language: string;
  contextConfidence: number;
  lastResponseTopics?: string[];
  state: {
    currentState: 'initial' | 'subject_selected' | 'topic_focused' | 'follow_up' | 'clarification';
    confidence: number;
    transitions: {
      timestamp: number;
      from: string;
      to: string;
      trigger: string;
    }[];
  };
  hierarchy: {
    level: number;
    path: string[];
    subject?: {
      name: string;
      confidence: number;
      subtopics: string[];
      relatedTopics: string[];
      lastMentioned: number;
    };
    topic?: {
      name: string;
      confidence: number;
      keywords: string[];
      lastMentioned: number;
    };
    entities: {
      name: string;
      type: string;
      confidence: number;
      mentions: number;
      lastMentioned: number;
    }[];
    temporalContext: {
      recentTopics: string[];
      recentEntities: string[];
      topicTransitions: { from: string; to: string; timestamp: number }[];
    };
  };
}

export interface ChatResponse {
  response: string;
  conversationId: string | null;
  contextId: string | null;
  currentTopic?: string | null;
  metadata: {
    contextConfidence: number;
    isFollowUp: boolean;
    currentSubject?: string | null;
    lastNumbers?: Record<string, number>;
    lastEntities?: string[];
    topics?: string[];
    entities?: Record<string, string>;
    language?: string;
  };
}

export interface ChatError {
  message: string;
  code?: string;
  details?: Record<string, any>;
}

export type ChatResult = ChatResponse | ChatError;

export interface AxiosConfig extends Record<string, any> {
  retry?: number;
}

export const FollowUpPatterns = {
  english: {
    pronouns: ['it', 'this', 'that', 'these', 'those', 'they', 'them'],
    timeReferences: ['then', 'after', 'before', 'previous', 'mentioned', 'earlier'],
    questionModifiers: ['how about', 'what about', 'and', 'or', 'but', 'so'],
    comparisonWords: ['same', 'similar', 'like', 'such', 'related', 'regarding']
  },
  arabic: {
    pronouns: ['هو', 'هي', 'هذا', 'هذه', 'ذلك', 'تلك', 'هؤلاء'],
    timeReferences: ['ثم', 'بعد', 'قبل', 'السابق', 'المذكور', 'سابقا'],
    questionModifiers: ['ماذا عن', 'كيف عن', 'و', 'أو', 'لكن', 'إذن'],
    comparisonWords: ['نفس', 'مثل', 'مماثل', 'مشابه', 'متعلق', 'بخصوص']
  },
  palestinianArabic: {
    pronouns: ['هاد', 'هاي', 'هدول', 'هديك', 'هداك', 'إحنا', 'إنتو', 'هم', 'إياه', 'إياها', 'إياهم', 'حالو', 'حالها', 'تبعو', 'تبعها', 'تبعهم', 'تبعي', 'تبعنا'],
    questionWords: ['شو', 'كيف', 'وين', 'ليش', 'قديش', 'امتى', 'مين', 'شلون', 'لوين', 'منين', 'عشو', 'لشو'],
    connectors: ['يعني', 'طيب', 'خلص', 'طب', 'بس', 'لانو', 'عشان', 'مشان', 'علشان', 'قصدي', 'بالزبط', 'صح', 'مزبوط', 'اه', 'ايوا', 'لأ', 'ولا', 'ولّا'],
    contextualReferences: ['المهم', 'القصة', 'الموضوع', 'الشغلة', 'السالفة', 'الحكي', 'على فكرة', 'اصلا', 'مش هيك'],
    timeReferences: ['هلأ', 'هلقيت', 'لسا', 'توا', 'بعدين', 'قبل شوي', 'من شوي', 'بكرا', 'مبارح', 'اول امبارح', 'هسا', 'عبكرا', 'عالليل', 'عالصبح'],
    comparisonWords: ['زي', 'متل', 'نفس', 'هيك', 'هيكي', 'كمان', 'برضو', 'برضك', 'كثير', 'شوي', 'اشوي', 'اكم', 'كام', 'قد ايش', 'قداه'],
    educationalTerms: ['دراسة', 'جامعة', 'كلية', 'تخصص', 'مساق', 'امتحان', 'دكتور', 'استاذ', 'علامة', 'ساعة معتمدة', 'محاضرة', 'تسجيل', 'فصل', 'سمستر']
  }
}; 