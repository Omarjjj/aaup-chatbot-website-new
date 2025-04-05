// Import Natural.js properly for ES modules
import * as natural from 'natural';

// Initialize NLP tools with fallback
let tokenizer: any;
let NGrams: any;
let TfIdf: any;
let tfidf: any;
let stemmer: any;
let classifier: any;

try {
  // Initialize Natural.js components with proper error handling
  tokenizer = {
    tokenize: (text: string): string[] => text.split(/\s+/)
  };
  NGrams = {
    bigrams: (tokens: string[]): string[][] => 
      tokens.slice(0, -1).map((token, i) => [token, tokens[i + 1]]),
    trigrams: (tokens: string[]): string[][] => 
      tokens.slice(0, -2).map((token, i) => [token, tokens[i + 1], tokens[i + 2]])
  };
  TfIdf = class {
    constructor() {}
    addDocument() {}
    tfidfs() { return []; }
  };
  tfidf = new TfIdf();
  stemmer = {
    stem: (word: string): string => word.toLowerCase()
  };
  classifier = {
    getClassifications: (text: string): Array<{ label: string; value: number }> => {
      // Simple keyword matching for basic functionality
      const subjects = ['Computer Science', 'Engineering', 'Optometry'];
      const keywords = {
        'Computer Science': ['computer', 'programming', 'software', 'code'],
        'Engineering': ['engineering', 'mechanical', 'electrical'],
        'Optometry': ['optometry', 'vision', 'eye']
      };
      
      return subjects.map(subject => ({
        label: subject,
        value: keywords[subject as keyof typeof keywords].some(keyword => 
          text.toLowerCase().includes(keyword)) ? 0.8 : 0.2
      }));
    },
    addDocument: (text: string, label: string): void => {},
    train: (): void => {}
  };
} catch (error) {
  console.error('Failed to initialize NLP tools:', error);
  // Use the same fallback implementations as defined above
}

interface NLPAnalysis {
  tokens: string[];
  ngrams: string[][];
  stems: string[];
  subjectProbabilities: { subject: string; probability: number }[];
  entities: {
    name: string;
    type: string;
    confidence: number;
    position: number;
  }[];
}

type Language = 'en' | 'ar';


interface LanguagePatterns {
  en: RegExp;
  ar: RegExp;
}

interface SubjectPatterns {
  [key: string]: LanguagePatterns;
}

interface FollowUpPatterns {
  en: RegExp[];
  ar: RegExp[];
}

interface ContextState {
  currentState: 'initial' | 'subject_selected' | 'topic_focused' | 'follow_up' | 'clarification';
  confidence: number;
  transitions: {
    timestamp: number;
    from: string;
    to: string;
    trigger: string;
  }[];
}

interface HierarchicalContext {
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
}

interface TopicState {
  name: string;
  lastDiscussed: number;
  attributes: Set<string>;
  relatedQueries: string[];
}

interface TopicTransition {
  from: string;
  to: string;
  timestamp: number;
  attributeCarryOver: string[];
}

interface ConversationContext {
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
  state: ContextState;
  hierarchy: HierarchicalContext;
  activeTopics: TopicState[];
  topicTransitions: TopicTransition[];
  lastDiscussedAttributes: Set<string>;
  attributeCarryover?: {
    active: boolean;
    previousSubject: string | null;
    newSubject: string;
    attributes: string[];
    timestamp: number;
    originalMessage: string | null;
  };
}

interface ConversationMetadata {
  isFollowUp: boolean;
  queryType: 'FOLLOW_UP' | 'STANDALONE';
  previousQuery?: string;
  previousResponse?: string;
  lastInteraction: number;
  currentSubject?: string;
  previousSubject?: string;
}

interface Topic {
  name: string;
  confidence: number;
  keywords: string[];
}

class EnhancedContextService {
  private contexts: Map<string, ConversationContext> = new Map();
  private readonly sessionTimeout = 30 * 60 * 1000;

  private subjectPatterns: SubjectPatterns = {
    optometry: {
      en: /\b(?:optometry|vision\s*(?:science|care)|eye\s*(?:care|health)|optical\s*(?:science|studies)|visual\s*science)\b/i,
      ar: /\b(?:بصريات|علوم\s*البصر|رعاية\s*العين|صحة\s*العين|علوم\s*البصريات)\b/i
    },
    computerScience: {
      en: /\b(?:computer\s*science(?:\s*major)?|cs\s*major)\b/i,
      ar: /\b(?:علوم\s*(?:الحاسوب|الكمبيوتر))\b/i
    },
    engineering: {
      en: /\b(?:civil|mechanical|electrical|electronic|chemical|industrial|architectural|biomedical|environmental|aerospace|automotive|robotics|mechatronics|telecommunications|materials|manufacturing)\s*engineering\b/i,
      ar: /\b(?:هندسة|الهندسة)\s*(?:مدنية|ميكانيكية|كهربائية|إلكترونية|كيميائية|صناعية|معمارية|طبية|بيئية|طيران|سيارات|روبوتات|اتصالات|مواد|تصنيع)\b/i
    },
    science: {
      en: /(?:physics|chemistry|biology|mathematics|statistics|geology|astronomy|environmental\s*science|life\s*sciences|natural\s*sciences|applied\s*sciences|earth\s*sciences|marine\s*biology|biotechnology|biochemistry|biophysics|genetics|microbiology|neuroscience|quantum\s*physics|organic\s*chemistry|molecular\s*biology)/i,
      ar: /(?:فيزياء|كيمياء|أحياء|رياضيات|إحصاء|جيولوجيا|فلك|علوم\s*(?:البيئة|الحياة|الطبيعة|الأرض|البحار)|تكنولوجيا\s*حيوية|كيمياء\s*حيوية|وراثة|أحياء\s*دقيقة|علم\s*الأعصاب|فيزياء\s*الكم|كيمياء\s*عضوية|بيولوجيا\s*جزيئية)/i
    },
    
    // Health Sciences
    medicine: {
      en: /(?:medicine|medical|health\s*sciences|pharmacy|nursing|dentistry|physiotherapy|occupational\s*therapy|nutrition|public\s*health|veterinary|emergency\s*medicine|radiology|surgery|pediatrics|cardiology|neurology|oncology|psychiatry|dermatology|anesthesiology|orthopedics|ophthalmology|pathology|immunology)/i,
      ar: /(?:الطب|العلوم\s*الصحية|الصيدلة|التمريض|طب\s*الأسنان|العلاج\s*الطبيعي|العلاج\s*الوظيفي|التغذية|الصحة\s*العامة|الطب\s*البيطري|طب\s*الطوارئ|الأشعة|الجراحة|طب\s*الأطفال|أمراض\s*القلب|طب\s*الأعصاب|الأورام|الطب\s*النفسي|الجلدية|التخدير|العظام|العيون|علم\s*الأمراض|المناعة)/i
    },
    
    // Business & Economics
    business: {
      en: /(?:business|commerce|management|administration|accounting|finance|marketing|economics|entrepreneurship|international\s*business|banking|investment|real\s*estate|human\s*resources|HR|supply\s*chain|logistics|project\s*management|business\s*analytics|digital\s*marketing|e-commerce|retail\s*management|risk\s*management|strategic\s*management|operations\s*management)/i,
      ar: /(?:إدارة\s*(?:الأعمال|التجارة)|تجارة|محاسبة|تمويل|تسويق|اقتصاد|ريادة\s*الأعمال|الأعمال\s*الدولية|مصارف|استثمار|عقارات|موارد\s*بشرية|سلاسل\s*التوريد|لوجستيات|إدارة\s*(?:المشاريع|المخاطر|الاستراتيجية|العمليات)|تحليل\s*الأعمال|التسويق\s*الرقمي|التجارة\s*الإلكترونية)/i
    },
    
    // Humanities & Social Sciences
    humanities: {
      en: /(?:languages?|linguistics|translation|literature|philosophy|history|archaeology|anthropology|sociology|psychology|political\s*science|international\s*relations|journalism|media|communication|cultural\s*studies|religious\s*studies|ethics|gender\s*studies|social\s*work|library\s*science|museum\s*studies)/i,
      ar: /(?:لغات|لغويات|ترجمة|أدب|فلسفة|تاريخ|آثار|علم\s*(?:الإنسان|الاجتماع|النفس)|علوم\s*سياسية|علاقات\s*دولية|صحافة|إعلام|اتصال|دراسات\s*(?:ثقافية|دينية)|أخلاق|دراسات\s*(?:جندرية|نسوية)|خدمة\s*اجتماعية|علم\s*المكتبات|دراسات\s*متحفية)/i
    },
    
    // Arts & Design
    arts: {
      en: /(?:fine\s*arts|visual\s*arts|performing\s*arts|design|graphic\s*design|interior\s*design|fashion\s*design|industrial\s*design|architecture|music|theater|drama|dance|film|animation|photography|digital\s*arts|multimedia|game\s*design|art\s*history|ceramics|sculpture|painting|drawing)/i,
      ar: /(?:فنون\s*(?:جميلة|بصرية|أدائية)|تصميم|تصميم\s*(?:جرافيك|داخلي|أزياء|صناعي)|عمارة|موسيقى|مسرح|دراما|رقص|سينما|رسوم\s*متحركة|تصوير|فنون\s*رقمية|وسائط\s*متعددة|تصميم\s*ألعاب|تاريخ\s*الفن|خزف|نحت|رسم)/i
    },
    
    // Education
    education: {
      en: /(?:education|teaching|pedagogy|curriculum|educational\s*(?:technology|psychology|leadership|administration)|special\s*education|early\s*childhood\s*education|elementary\s*education|secondary\s*education|higher\s*education|adult\s*education|vocational\s*education|teacher\s*training|educational\s*counseling|instructional\s*design|distance\s*learning|e-learning)/i,
      ar: /(?:تربية|تعليم|علوم\s*تربوية|مناهج|تكنولوجيا\s*التعليم|علم\s*النفس\s*التربوي|قيادة\s*تربوية|إدارة\s*تعليمية|تربية\s*خاصة|تعليم\s*(?:مبكر|ابتدائي|ثانوي|عالي|كبار)|تعليم\s*مهني|تدريب\s*معلمين|إرشاد\s*تربوي|تصميم\s*تعليمي|تعلم\s*عن\s*بعد|تعليم\s*إلكتروني)/i
    },
    
    // Law & Legal Studies
    law: {
      en: /(?:law|legal\s*studies|jurisprudence|criminal\s*law|civil\s*law|international\s*law|business\s*law|constitutional\s*law|human\s*rights\s*law|environmental\s*law|intellectual\s*property\s*law|maritime\s*law|tax\s*law|labor\s*law|family\s*law|commercial\s*law|public\s*law|private\s*law)/i,
      ar: /(?:قانون|دراسات\s*قانونية|فقه|قانون\s*(?:جنائي|مدني|دولي|الأعمال|دستوري|حقوق\s*الإنسان|البيئة|الملكية\s*الفكرية|بحري|ضريبي|العمل|الأسرة|تجاري)|قانون\s*(?:عام|خاص))/i
    },
    
    // Professional Studies
    professional: {
      en: /(?:image.png|vision\s*science|eye\s*care|dental\s*hygiene|medical\s*laboratory|radiography|speech\s*therapy|audiology|occupational\s*health|sports\s*science|tourism|hospitality|culinary\s*arts|aviation|maritime\s*studies|agricultural\s*science|food\s*science|environmental\s*management|urban\s*planning|surveying|quality\s*management|safety\s*management)/i,
      ar: /(?:بصريات|علوم\s*البصر|رعاية\s*العيون|صحة\s*الأسنان|مختبرات\s*طبية|تصوير\s*إشعاعي|علاج\s*النطق|سمعيات|صحة\s*مهنية|علوم\s*رياضية|سياحة|ضيافة|فنون\s*طهي|طيران|دراسات\s*بحرية|علوم\s*زراعية|علوم\s*الأغذية|إدارة\s*بيئية|تخطيط\s*عمراني|مساحة|إدارة\s*الجودة|إدارة\s*السلامة)/i
    }
  };

  private academicTerms = {
    en: [
      // Academic Program Terms
      'program', 'major', 'minor', 'specialization', 'concentration', 'track', 'stream',
      'department', 'faculty', 'school', 'college', 'institute', 'center', 'academy',
      
      // Course-related Terms
      'course', 'subject', 'module', 'unit', 'credit', 'hour', 'semester', 'year',
      'lecture', 'lab', 'workshop', 'seminar', 'tutorial', 'practicum', 'internship',
      
      // Academic Requirements
      'prerequisite', 'corequisite', 'requirement', 'elective', 'mandatory', 'optional',
      'core', 'foundation', 'advanced', 'intermediate', 'beginner', 'introductory',
      
      // Assessment Terms
      'grade', 'score', 'mark', 'GPA', 'assessment', 'evaluation', 'examination', 'test',
      'quiz', 'assignment', 'project', 'thesis', 'dissertation', 'research', 'study',
      
      // Administrative Terms
      'admission', 'enrollment', 'registration', 'application', 'deadline', 'schedule',
      'timetable', 'calendar', 'semester', 'term', 'academic year', 'session',
      
      // Financial Terms
      'fee', 'tuition', 'scholarship', 'grant', 'aid', 'funding', 'payment', 'discount',
      'installment', 'refund', 'deposit', 'balance', 'cost', 'expense',
      
      // Qualification Terms
      'degree', 'diploma', 'certificate', 'qualification', 'accreditation', 'license',
      'bachelor', 'master', 'doctorate', 'PhD', 'postgraduate', 'undergraduate',
      
      // Career-related Terms
      'career', 'job', 'profession', 'occupation', 'industry', 'sector', 'field',
      'position', 'role', 'opportunity', 'employment', 'placement', 'training'
    ],
    ar: [
      // Academic Program Terms
      'برنامج', 'تخصص', 'تخصص فرعي', 'مسار', 'شعبة', 'قسم', 'كلية', 'معهد', 'مركز', 'أكاديمية',
      
      // Course-related Terms
      'مساق', 'مادة', 'وحدة', 'ساعة', 'معتمدة', 'فصل', 'سنة', 'محاضرة', 'مختبر',
      'ورشة', 'ندوة', 'تدريب', 'تطبيق عملي', 'تدريب ميداني',
      
      // Academic Requirements
      'متطلب', 'شرط', 'إجباري', 'اختياري', 'أساسي', 'تأسيسي', 'متقدم', 'متوسط', 'مبتدئ',
      
      // Assessment Terms
      'علامة', 'درجة', 'معدل', 'تقييم', 'امتحان', 'اختبار', 'وظيفة', 'مشروع',
      'رسالة', 'أطروحة', 'بحث', 'دراسة',
      
      // Administrative Terms
      'قبول', 'تسجيل', 'التحاق', 'طلب', 'موعد', 'جدول', 'تقويم', 'فصل دراسي', 'سنة دراسية',
      
      // Financial Terms
      'رسوم', 'منحة', 'مساعدة', 'تمويل', 'دفعة', 'خصم', 'قسط', 'استرداد', 'تكلفة', 'مصاريف',
      
      // Qualification Terms
      'شهادة', 'دبلوم', 'مؤهل', 'اعتماد', 'ترخيص', 'بكالوريوس', 'ماجستير', 'دكتوراه',
      'دراسات عليا', 'دراسات جامعية',
      
      // Career-related Terms
      'مهنة', 'وظيفة', 'مجال', 'قطاع', 'فرصة', 'توظيف', 'تدريب', 'تأهيل'
    ]
  };

  private followUpPatterns: FollowUpPatterns = {
    en: [
      // Pronouns and references - expanded significantly
      /\b(?:it|its|this|that|these|those|they|them|their|he|she|his|her|hers|theirs|such|same|one|ones)\b/i,
      // Question starters that typically indicate follow-ups
      /^(?:and|but|so|or|also|then|how about|what about|why|how|is there|are there)\b/i,
      // Time and sequence references
      /\b(?:then|after|before|previously|earlier|last time|the last|the previous|already mentioned|again|now|still|yet)\b/i,
      // Continuity and elaboration markers
      /\b(?:also|as well|too|furthermore|moreover|additionally|in addition|besides|still|again|more|further|another|else)\b/i,
      // Comparative and topic references
      /\b(?:same|similar|like that|such as|related|regarding|concerning|about that|on that topic|mentioned|stated|noted|discussed)\b/i,
      // Ellipsis and partial questions
      /^(?:\.\.\.|\?|!|and\?|but\?|so\?)/,
      // Clarification requests
      /^(?:could you clarify|please explain|what do you mean|can you elaborate|tell me more|i want to know more|give me details)/i,
      // Follow-up question patterns
      /(?:what is the|how much is the|tell me the|what are the|how many|when is|where is|who is|which is|why is|can I|is it|are they)/i
    ],
    ar: [
      // Arabic pronouns and references - expanded
      /\b(?:هو|هي|هم|هن|هذا|هذه|ذلك|تلك|هؤلاء|أولئك|له|لها|لهم|لهن|به|بها|بهم|بهن|منه|منها|منهم|منهن)\b/i,
      // Arabic question starters
      /^(?:و|ف|ثم|لكن|إذن|أو|أيضا|كذلك|ماذا عن|ماذا|هل|كيف)/i,
      // Arabic time and sequence references
      /\b(?:ثم|بعد|قبل|سابقا|مؤخرا|آنفا|في السابق|في المرة الماضية|الماضي|السابق|مجددا|الآن|لا يزال|بعد)\b/i,
      // Arabic continuity and elaboration markers
      /\b(?:أيضا|كذلك|بالإضافة|علاوة على ذلك|كما|مرة أخرى|لا يزال|ما زال|المزيد|أكثر|آخر|غير ذلك)\b/i,
      // Arabic comparative and topic references
      /\b(?:نفس|مشابه|مثل ذلك|مثل|متعلق ب|بخصوص|بشأن|حول ذلك|في هذا الموضوع|ذكر|قال|أشار|ناقش)\b/i,
      // Arabic ellipsis and partial questions
      /^(?:\.\.\.|\?|!|و\?|لكن\?|إذن\?)/,
      // Arabic clarification requests
      /^(?:هل يمكنك التوضيح|الرجاء الشرح|ماذا تقصد|هل يمكنك التفصيل|أخبرني أكثر|أريد أن أعرف المزيد|أعطني التفاصيل)/i,
      // Palestinian Arabic dialect markers
      /\b(?:يعني|طيب|خلص|طب|بس|لانو|هاد|هاي|هدول|هيك|معناتو|بدنا|فيه|منشان|زي|قديش)\b/i,
      // Enhanced Palestinian dialect markers
      /\b(?:شو|وين|ليش|امتى|مين|كيفك|شلونك|شخبارك|إحنا|إنتو|هم|إياه|إياها|إياهم|حالو|حالها|تبعو|تبعها|تبعهم|تبعي|تبعنا)\b/i,
      // Palestinian dialect question starters
      /^(?:شو|وين|ليش|قديش|امتى|مين|لوين|منين|عشو|لشو|زي ما|زي ايش|اشي)\b/i,
      // Palestinian dialect time references
      /\b(?:هلأ|هلقيت|لسا|توا|بعدين|قبل شوي|من شوي|بكرا|مبارح|اول امبارح|هسا)\b/i,
      // Palestinian dialect expressions
      /\b(?:معلش|عشان|مشان|علشان|قصدي|بالزبط|صح|مزبوط|اه|ايوا|لأ|ولا|ولّا|المهم|على فكرة|اصلا|مش هيك)\b/i,
      // Arabic follow-up question patterns
      /(?:ما هو|كم هو|أخبرني عن|ما هي|كم عدد|متى|أين|من هو|أي|لماذا|هل يمكنني|هل هو|هل هم)/i
    ]
  };

  private topicAttributes = {
    fees: {
      en: ['cost', 'tuition', 'payment', 'financial', 'credit hour fees', 'credit hour', 'fees', 'price', 'charge', 'expense', 'dollars', 'scholarship', 'aid'],
      ar: ['تكلفة', 'رسوم', 'دفع', 'مالي', 'رسوم الساعة المعتمدة', 'ساعة معتمدة', 'سعر', 'مصاريف', 'منحة', 'مساعدة مالية']
    },
    requirements: {
      en: ['minimum', 'average', 'grade', 'admission', 'gpa', 'prerequisite', 'required', 'need', 'criteria', 'qualification', 'eligible'],
      ar: ['حد أدنى', 'متوسط', 'درجة', 'قبول', 'معدل', 'شرط مسبق', 'مطلوب', 'يحتاج', 'معايير', 'مؤهل']
    },
    duration: {
      en: ['years', 'semesters', 'time', 'length', 'period', 'duration', 'long', 'take', 'finish', 'complete', 'graduate'],
      ar: ['سنوات', 'فصول', 'وقت', 'مدة', 'فترة', 'طول', 'يستغرق', 'ينهي', 'يكمل', 'يتخرج']
    },
    courses: {
      en: ['subjects', 'classes', 'curriculum', 'study', 'material', 'learn', 'lecture', 'course', 'credit', 'hour', 'syllabus', 'program', 'content'],
      ar: ['مواضيع', 'صفوف', 'منهج', 'دراسة', 'مادة', 'تعلم', 'محاضرة', 'مساق', 'ساعة', 'معتمدة', 'برنامج', 'محتوى']
    },
    application: {
      en: ['apply', 'application', 'register', 'registration', 'submit', 'form', 'deadline', 'date', 'when', 'how'],
      ar: ['تقديم', 'طلب', 'تسجيل', 'تقديم', 'استمارة', 'موعد نهائي', 'تاريخ', 'متى', 'كيف']
    },
    location: {
      en: ['where', 'location', 'building', 'campus', 'address', 'place', 'city', 'room', 'office'],
      ar: ['أين', 'موقع', 'مبنى', 'حرم جامعي', 'عنوان', 'مكان', 'مدينة', 'غرفة', 'مكتب']
    },
    contact: {
      en: ['contact', 'email', 'phone', 'call', 'reach', 'talk', 'speak', 'ask', 'inquire', 'information'],
      ar: ['اتصال', 'بريد إلكتروني', 'هاتف', 'يتصل', 'يصل', 'يتحدث', 'يسأل', 'استفسار', 'معلومات']
    }
  };

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
        entities: [],
        temporalContext: {
          recentTopics: [],
          recentEntities: [],
          topicTransitions: []
        }
      },
      activeTopics: [],
      topicTransitions: [],
      lastDiscussedAttributes: new Set(),
    };
  }

  detectLanguage(text: string): string {
    const arabicPattern = /[\u0600-\u06FF]/;
    return arabicPattern.test(text) ? 'ar' : 'en';
  }

  extractEntities(text: string): string[] {
    const entities = new Set<string>();
    
    // Extract quoted text - improved to handle different quote types
    const quotedText = text.match(/["'""'']([^"'""'']+)["'""'']/g);
    if (quotedText) {
      quotedText.forEach(text => {
        const cleaned = text.replace(/["'""'']/g, '').trim();
        if (cleaned.length > 1) {
          entities.add(cleaned);
        }
      });
    }

    // Extract capitalized terms and multi-word terms more thoroughly
    const capitalizedPhrases = text.match(/\b[A-Z][a-z0-9]+(?:[-\s]+[A-Z][a-z0-9]+)*\b/g);
    if (capitalizedPhrases) {
      capitalizedPhrases.forEach(phrase => {
        if (phrase.length > 2 && !['I', 'A', 'An', 'The'].includes(phrase)) {
          entities.add(phrase);
        }
      });
    }

    // Detect language for further processing
    const language = this.detectLanguage(text) as Language;
    
    // Extract academic terms with more comprehensive patterns
    const academicTermsSets = {
      en: [
        // Programs and degrees
        /\b(?:Bachelor|Master|PhD|Doctorate|BSc|BA|MSc|MA|Diploma|Certificate|Degree|Undergrad|Graduate|Postgrad)\s*(?:of|in|'?s)?\s*(?:[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)?/gi,
        
        // Academic processes
        /\b(?:Admission|Application|Registration|Enrollment|Transfer|Credit|Accreditation|Thesis|Dissertation|Research|Project|Internship|Practicum)/gi,
        
        // Academic periods
        /\b(?:Semester|Term|Academic\s+Year|Fall|Spring|Summer|Winter|Quarter|Session|Course|Class|Lecture|Lab|Workshop|Seminar)/gi,
        
        // Administrative concepts
        /\b(?:Department|Faculty|College|School|Institute|Center|Program|Curriculum|Syllabus|Course\s+Description|Prerequisite|Corequisite)/gi,
        
        // Assessment terms
        /\b(?:GPA|Grade|Exam|Test|Quiz|Assignment|Project|Presentation|Assessment|Evaluation|Transcript|Record)/gi,
        
        // Academic majors and fields (expanded)
        /\b(?:Computer Science|Information Technology|Engineering|Business|Management|Economics|Finance|Accounting|Marketing|Psychology|Sociology|Law|Medicine|Dentistry|Pharmacy|Nursing|Optometry|Architecture|Art|Design|Education|Language|Literature|History|Philosophy|Mathematics|Physics|Chemistry|Biology|Geology|Geography|Political Science|International Relations|Communications|Media|Journalism)\s*(?:major|program|department|field|discipline|study|course)?\b/gi,
        
        // Credit hour fees pattern (specific to the question example)
        /\b(?:credit\s+hour\s+fees|tuition\s+fee|credit\s+fees|credit\s+hour\s+cost|credit\s+cost|tuition\s+cost|tuition\s+per\s+credit|cost\s+per\s+credit|fee\s+per\s+credit)\b/gi,
        
        // Comparison-specific terms
        /\b(?:comparison|compare|difference|similarities|versus|vs\.?|alike|contrast|differ|same as)\b/gi,
      ],
      ar: [
        // Arabic programs and degrees
        /\b(?:بكالوريوس|ماجستير|دكتوراه|دبلوم|شهادة|درجة|مرحلة جامعية|دراسات عليا)\s*(?:في|ال)?\s*(?:[ء-ي]+(?:\s+[ء-ي]+)*)?/gi,
        
        // Arabic academic processes
        /\b(?:قبول|تسجيل|التحاق|تحويل|الساعات المعتمدة|الاعتماد|أطروحة|رسالة|بحث|مشروع|تدريب|تطبيق عملي)/gi,
        
        // Arabic academic periods
        /\b(?:فصل دراسي|ترم|سنة أكاديمية|خريف|ربيع|صيف|شتاء|محاضرة|مختبر|ورشة عمل|ندوة)/gi,
        
        // Arabic administrative concepts
        /\b(?:قسم|كلية|معهد|مركز|برنامج|منهج|مقرر|وصف المساق|متطلب سابق|متطلب مرافق)/gi,
        
        // Arabic assessment terms
        /\b(?:معدل تراكمي|درجة|امتحان|اختبار|مشروع|عرض تقديمي|تقييم|كشف علامات|سجل)/gi,
        
        // Arabic academic majors and fields (expanded)
        /\b(?:علوم الحاسوب|تكنولوجيا المعلومات|الهندسة|إدارة الأعمال|الاقتصاد|التمويل|المحاسبة|التسويق|علم النفس|علم الاجتماع|القانون|الطب|طب الأسنان|الصيدلة|التمريض|البصريات|العمارة|الفن|التصميم|التعليم|اللغة|الأدب|التاريخ|الفلسفة|الرياضيات|الفيزياء|الكيمياء|الأحياء|الجيولوجيا|الجغرافيا|العلوم السياسية|العلاقات الدولية|الاتصالات|الإعلام|الصحافة)\s*(?:تخصص|برنامج|قسم|مجال|دراسة|مساق)?\b/gi,
        
        // Arabic credit hour fees pattern
        /\b(?:رسوم الساعة المعتمدة|رسوم الساعات|تكلفة الساعة|تكلفة الساعة المعتمدة|رسوم الدراسة|التكلفة للساعة|رسوم للساعة)\b/gi,
        
        // Arabic comparison-specific terms
        /\b(?:مقارنة|قارن|الفرق|التشابه|مقابل|ضد|مثل|اختلاف|نفس|مشابه)\b/gi,
      ]
    };

    const termsToExtract = academicTermsSets[language];
    termsToExtract.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(term => {
          // Add all found terms to entities
          entities.add(term.trim());
          
          // Special case for academic majors: extract them without the word "major" for better contextual reference
          if (/\b(?:major|program|department|field|discipline|study|course|تخصص|برنامج|قسم|مجال|دراسة|مساق)\b/i.test(term)) {
            // Extract the major name without the qualifier
            const majorName = term.replace(/\s+(?:major|program|department|field|discipline|study|course|تخصص|برنامج|قسم|مجال|دراسة|مساق)\b/i, '').trim();
            if (majorName && majorName.length > 3) {
              entities.add(majorName);
            }
          }
        });
      }
    });

    // Extract subjects mentioned in the text with better match handling
    const subjects = Object.keys(this.subjectPatterns);
    for (const subject of subjects) {
      const pattern = this.subjectPatterns[subject][language];
      if (pattern.test(text)) {
        entities.add(subject);
        
        // Also add related subcategories if they're mentioned
        const subCategories = {
          'Computer Science': ['Programming', 'Algorithms', 'Data Science', 'Artificial Intelligence', 'Software Development'],
          'Engineering': ['Civil', 'Mechanical', 'Electrical', 'Computer', 'Software', 'Industrial'],
          'Medicine': ['Medical', 'Health Sciences', 'Pharmacy', 'Nursing'],
          'Business': ['Accounting', 'Management', 'Marketing', 'Finance', 'Economics']
        };
        
        if (subject in subCategories) {
          const subs = subCategories[subject as keyof typeof subCategories];
          for (const sub of subs) {
            if (text.toLowerCase().includes(sub.toLowerCase())) {
              entities.add(`${subject}: ${sub}`);
            }
          }
        }
      }
    }

    // Enhanced extraction of key educational concepts
    const educationalPatterns = {
      en: [
        // Administrative patterns
        /\b(?:credit\s+hours?|tuition|fees?|scholarship|financial\s+aid|grades?|admission|requirements?|curriculum|programs?|semesters?|academic\s+years?|courses?|majors?|facult(?:y|ies)|departments?)\b/i,
        
        // Degree patterns
        /\b(?:bachelors?|masters?|doctorates?|PhD|certificates?|diplomas?|degrees?|undergraduate|graduate|postgraduate)\b/i,
        
        // Pre-university and application patterns
        /\b(?:high\s+school|tawjihi|secondary\s+education|transcripts?|GPA|averages?|minimums?|maximums?|deadlines?|applications?|entries?)\b/i,
        
        // Special programs
        /\b(?:honors|exchange|study\s+abroad|internship|co-op|volunteer|service\s+learning|dual\s+degree|joint\s+program)\b/i,
        
        // University facilities
        /\b(?:librar(?:y|ies)|labs?|dormitor(?:y|ies)|housing|cafeteria|gymnasium|student\s+center|campus)\b/i
      ],
      ar: [
        // Administrative patterns in Arabic
        /\b(?:ساعة\s+معتمدة|ساعات\s+معتمدة|رسوم|منحة|مساعدة\s+مالية|علامات?|قبول|متطلبات?|منهاج|برامج|فصول\s+دراسية|سنوات\s+دراسية|مساقات|تخصصات|كليات|أقسام)\b/i,
        
        // Degree patterns in Arabic
        /\b(?:بكالوريوس|ماجستير|دكتوراه|شهادات|دبلوم|درجات|دراسات\s+جامعية|دراسات\s+عليا)\b/i,
        
        // Pre-university and application patterns in Arabic
        /\b(?:ثانوية\s+عامة|توجيهي|تعليم\s+ثانوي|كشوف\s+علامات|معدل|حد\s+أدنى|حد\s+أقصى|مواعيد\s+نهائية|طلبات|قبول|تسجيل)\b/i,
        
        // Special programs in Arabic
        /\b(?:برنامج\s+شرف|تبادل\s+طلابي|دراسة\s+بالخارج|تدريب|تطوع|خدمة\s+تعليمية|درجة\s+مزدوجة|برنامج\s+مشترك)\b/i,
        
        // University facilities in Arabic
        /\b(?:مكتبة|مكتبات|مختبرات?|سكن\s+طلابي|سكن|كافتيريا|صالة\s+رياضية|مركز\s+طلابي|حرم\s+جامعي)\b/i
      ]
    };
    
    for (const pattern of educationalPatterns[language]) {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(match => entities.add(match.trim()));
      }
    }

    // Enhanced extraction of educational programs and majors
    const majorPatterns = {
      en: [
        // Common academic fields
        /\b(?:Computer\s+Science|Engineering|Optometry|Medicine|Business|Law|Arts|Education|Science|Nursing|Mathematics|Physics|Chemistry|Biology|Psychology|Sociology|Literature|History|Philosophy)\b/i,
        
        // Specific engineering disciplines
        /\b(?:Computer\s+Engineering|Software\s+Engineering|Civil\s+Engineering|Mechanical\s+Engineering|Electrical\s+Engineering|Chemical\s+Engineering|Industrial\s+Engineering|Environmental\s+Engineering)\b/i,
        
        // Business specializations
        /\b(?:Business\s+Administration|Marketing|Finance|Accounting|Economics|Management|International\s+Business|Human\s+Resources)\b/i,
        
        // Health specializations
        /\b(?:Medicine|Pharmacy|Nursing|Dentistry|Physiotherapy|Nutrition|Public\s+Health|Optometry|Veterinary\s+Medicine)\b/i
      ],
      ar: [
        // Common academic fields in Arabic
        /\b(?:علوم\s+الحاسوب|هندسة|بصريات|طب|أعمال|قانون|فنون|تعليم|علوم|تمريض|رياضيات|فيزياء|كيمياء|أحياء|علم\s+النفس|علم\s+الاجتماع|أدب|تاريخ|فلسفة)\b/i,
        
        // Specific engineering disciplines in Arabic
        /\b(?:هندسة\s+الحاسوب|هندسة\s+البرمجيات|هندسة\s+مدنية|هندسة\s+ميكانيكية|هندسة\s+كهربائية|هندسة\s+كيميائية|هندسة\s+صناعية|هندسة\s+بيئية)\b/i,
        
        // Business specializations in Arabic
        /\b(?:إدارة\s+الأعمال|تسويق|تمويل|محاسبة|اقتصاد|إدارة|أعمال\s+دولية|موارد\s+بشرية)\b/i,
        
        // Health specializations in Arabic
        /\b(?:الطب|صيدلة|تمريض|طب\s+أسنان|علاج\s+طبيعي|تغذية|صحة\s+عامة|بصريات|طب\s+بيطري)\b/i
      ]
    };
    
    for (const pattern of majorPatterns[language]) {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(match => entities.add(match.trim()));
      }
    }

    // Enhanced extraction of numbers with better context
    const numberPatterns = {
      tuition_fee: /(\d+(?:,\d+)?(?:\.\d+)?)\s*(?:NIS|₪|شيكل|دينار|JOD|USD|\$)/i,
      percentage: /(\d+(?:\.\d+)?)\s*(?:percent|%|في\s+المئة|بالمئة)/i,
      credits: /(\d+)\s*(?:credit\s*hours?|ساعة\s*معتمدة|ساعات\s*معتمدة)/i,
      duration_years: /(\d+(?:\.\d+)?)\s*(?:years?|سن(?:ة|وات)|عام)/i,
      duration_semesters: /(\d+)\s*(?:semesters?|terms?|فصول|فصل)/i,
      average: /(\d+(?:\.\d+)?)\s*(?:average|معدل|GPA)/i,
      minimum: /(?:minimum|حد\s+أدنى|at\s+least)\s*(\d+(?:\.\d+)?)/i,
      maximum: /(?:maximum|حد\s+أقصى|at\s+most)\s*(\d+(?:\.\d+)?)/i,
      deadline: /(?:deadline|موعد\s+نهائي|due)\s*(?:on|by|في|بتاريخ)?\s*(\d{1,2}[-/\.]\d{1,2}(?:[-/\.]\d{2,4})?)/i
    };

    Object.entries(numberPatterns).forEach(([key, pattern]) => {
      const match = text.match(pattern);
      if (match && match[1]) {
        entities.add(`${key}: ${match[1]}`);
      }
    });

    // Add specific checks for educational terminology and subjects
    if (language === 'en') {
      // Admission requirements recognition
      if (/\b(?:minimum|average|high school|grade|admission|requirement|tawjihi|secondary|prerequisite)\b/i.test(text)) {
        entities.add('admission requirements');
        
        // More specific admission requirements
        if (/\b(?:average|GPA|grade|score|marks?)\b/i.test(text)) {
          entities.add('grade requirements');
        }
        if (/\b(?:high school|tawjihi|secondary)\b/i.test(text)) {
          entities.add('high school certificate');
        }
        if (/\b(?:documents?|papers?|certificates?|upload|submit|provide)\b/i.test(text)) {
          entities.add('required documents');
        }
      }
      
      // Financial information recognition
      if (/\b(?:cost|fee|tuition|financial|payment|scholarship|discount|installment|money)\b/i.test(text)) {
        entities.add('tuition fees');
        
        // More specific financial entities
        if (/\b(?:scholarship|financial aid|grant|award)\b/i.test(text)) {
          entities.add('scholarships');
        }
        if (/\b(?:installment|payment plan|monthly|semester payment)\b/i.test(text)) {
          entities.add('payment options');
        }
        if (/\b(?:discount|reduction|special rate)\b/i.test(text)) {
          entities.add('tuition discounts');
        }
      }
      
      // Program information recognition
      if (/\b(?:duration|years|semesters|time|length|period|how long|when|start|end)\b/i.test(text)) {
        entities.add('program duration');
        
        // More specific duration entities
        if (/\b(?:start|begin|commence|opening)\b/i.test(text)) {
          entities.add('program start dates');
        }
        if (/\b(?:end|finish|graduate|completion)\b/i.test(text)) {
          entities.add('graduation timeline');
        }
        if (/\b(?:full-time|part-time|evening|weekend|online|distance)\b/i.test(text)) {
          entities.add('study modes');
        }
      }
    } else { // Arabic context recognition
      // Admission requirements recognition in Arabic
      if (/\b(?:حد أدنى|معدل|ثانوية عامة|علامة|قبول|متطلب|توجيهي|ثانوي|شرط مسبق)\b/i.test(text)) {
        entities.add('متطلبات القبول');
        
        // More specific admission requirements in Arabic
        if (/\b(?:معدل|علامة|درجة|مجموع)\b/i.test(text)) {
          entities.add('متطلبات العلامات');
        }
        if (/\b(?:ثانوية عامة|توجيهي|شهادة ثانوية)\b/i.test(text)) {
          entities.add('شهادة الثانوية العامة');
        }
        if (/\b(?:وثائق|أوراق|شهادات|تحميل|تقديم|توفير)\b/i.test(text)) {
          entities.add('الوثائق المطلوبة');
        }
      }
      
      // Financial information recognition in Arabic
      if (/\b(?:تكلفة|رسوم|منحة|مالية|دفع|تقسيط|خصم|مصاريف)\b/i.test(text)) {
        entities.add('الرسوم الدراسية');
        
        // More specific financial entities in Arabic
        if (/\b(?:منحة|مساعدة مالية|جائزة)\b/i.test(text)) {
          entities.add('المنح الدراسية');
        }
        if (/\b(?:تقسيط|خطة دفع|شهري|دفعة فصلية)\b/i.test(text)) {
          entities.add('خيارات الدفع');
        }
        if (/\b(?:خصم|تخفيض|سعر خاص)\b/i.test(text)) {
          entities.add('خصومات الرسوم');
        }
      }
      
      // Program information recognition in Arabic
      if (/\b(?:مدة|سنوات|فصول|وقت|طول|فترة|كم المدة|متى|بداية|نهاية)\b/i.test(text)) {
        entities.add('مدة البرنامج');
        
        // More specific duration entities in Arabic
        if (/\b(?:بداية|بدء|افتتاح)\b/i.test(text)) {
          entities.add('مواعيد بدء البرنامج');
        }
        if (/\b(?:نهاية|انتهاء|تخرج|إتمام)\b/i.test(text)) {
          entities.add('جدول التخرج');
        }
        if (/\b(?:دوام كامل|دوام جزئي|مسائي|عطلة نهاية الأسبوع|عبر الإنترنت|تعليم عن بعد)\b/i.test(text)) {
          entities.add('أنماط الدراسة');
        }
      }
    }

    return Array.from(entities);
  }

  extractNumbers(message: string): Map<string, number> {
    const results = new Map<string, number>();
    if (!message) return results;
    
    const normalizedText = message.toLowerCase();
    
    // Define regex patterns for different types of numerical data
    const patterns = {
      fee: /(\d+(?:\.\d+)?)\s*(?:NIS|₪)/i,
      average: /(\d+(?:\.\d+)?)\s*%/i,
      credits: /(\d+)\s*credit\s*hours?/i,
      courses: /(\d+)\s*courses?/i,
      duration: /(\d+)\s*years?/i
    };
    
    // Apply each pattern and collect results
    for (const [key, pattern] of Object.entries(patterns)) {
      const match = normalizedText.match(pattern);
      if (match && match[1]) {
        const value = parseFloat(match[1]);
        results.set(key, value);
        console.log(`Extracted number for ${key}: ${value}`);
      }
    }
    
    return results;
  }

  analyzeText(text: string): NLPAnalysis {
    // Tokenization
    const tokens = tokenizer.tokenize(text);
    
    // N-grams for phrase detection
    const bigrams = NGrams.bigrams(tokens);
    const trigrams = NGrams.trigrams(tokens);
    
    // Stemming for better word matching
    const stems = tokens.map((token: string) => stemmer.stem(token));
    
    // Subject classification with probabilities
    const classifications = classifier.getClassifications(text);
    const subjectProbabilities = classifications.map((c: { label: string; value: number }) => ({
      subject: c.label,
      probability: c.value
    }));

    // Enhanced entity recognition
    const entities = this.extractEntitiesWithNLP(text, tokens, bigrams, trigrams);

    return {
      tokens,
      ngrams: [...bigrams, ...trigrams],
      stems,
      subjectProbabilities,
      entities
    };
  }

  private extractEntitiesWithNLP(
    text: string,
    tokens: string[],
    bigrams: string[][],
    trigrams: string[][]
  ): NLPAnalysis['entities'] {
    const entities: NLPAnalysis['entities'] = [];
    const language = this.detectLanguage(text);

    // Academic terms detection using n-grams
    const academicPhrases = {
      en: {
        programs: ['degree program', 'major in', 'specialization in'],
        courses: ['credit hours', 'prerequisite course', 'required course'],
        requirements: ['admission requirements', 'minimum grade', 'high school'],
        fees: ['tuition fees', 'payment plan', 'scholarship']
      },
      ar: {
        programs: ['برنامج دراسي', 'تخصص في', 'مسار في'],
        courses: ['ساعات معتمدة', 'متطلب سابق', 'مساق إجباري'],
        requirements: ['متطلبات القبول', 'الحد الأدنى', 'الثانوية العامة'],
        fees: ['رسوم دراسية', 'خطة دفع', 'منحة دراسية']
      }
    };

    // Check for academic phrases
    [...bigrams, ...trigrams].forEach((ngram, index) => {
      const phrase = ngram.join(' ').toLowerCase();
      Object.entries(academicPhrases[language as 'en' | 'ar']).forEach(([type, phrases]) => {
        if (phrases.some(p => phrase.includes(p.toLowerCase()))) {
          entities.push({
            name: ngram.join(' '),
            type: type,
            confidence: 0.8,
            position: index
          });
        }
      });
    });

    // Number and currency detection with context
    const numberPatterns = [
      { 
        pattern: /(\d+(?:\.\d+)?)\s*(?:NIS|₪|شيكل)/i,
        type: 'currency',
        confidence: 0.9
      },
      { 
        pattern: /(\d+(?:\.\d+)?)\s*%/,
        type: 'percentage',
        confidence: 0.9
      },
      { 
        pattern: /(\d+)\s*(?:credit\s*hours?|ساعة\s*معتمدة)/i,
        type: 'credits',
        confidence: 0.9
      },
      { 
        pattern: /(\d+)\s*(?:years?|سنوات)/i,
        type: 'duration',
        confidence: 0.8
      }
    ];

    numberPatterns.forEach(({ pattern, type, confidence }) => {
      const matches = text.matchAll(new RegExp(pattern, 'g'));
      for (const match of matches) {
        entities.push({
          name: match[0],
          type,
          confidence,
          position: match.index || 0
        });
      }
    });

    return entities;
  }

  detectSubject(message: string, language: Language): string | null {
    if (!message) return null;
    
    // Normalize text for cleaner pattern matching
    const normalizedText = message.toLowerCase().trim();
    
    // Updated regex pattern to match the Android app's behavior and capture more specific majors
    const subjectPatterns = {
      en: /\b(computer science|engineering|medicine|business|law|arts|education|information technology|dentistry|pharmacy|nursing|architecture|optometry)\b/i,
      ar: /\b(علوم الحاسوب|الهندسة|الطب|إدارة الأعمال|القانون|الآداب|التربية|تكنولوجيا المعلومات|طب الأسنان|الصيدلة|التمريض|الهندسة المعمارية|البصريات)\b/i
    };
    
    // Get pattern based on language
    const pattern = subjectPatterns[language] || subjectPatterns.en;
    
    // Find the first match
    const match = normalizedText.match(pattern);
    
    if (match) {
      // Convert to title case for consistency
      return this.toTitleCase(match[0]);
    }
    
    return null;
  }

  // Helper method to convert string to Title Case (like in the Kotlin app)
  private toTitleCase(str: string): string {
    return str.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  updateContext(message: string | null, isUser: boolean, conversationId: string): void {
    if (!message) return;
    
    // Get or create context
    const context = this.getOrCreateContext(conversationId);
    
    // Always update the last interaction time
    context.metadata.set('lastInteraction', Date.now());
    
    // Detect language
    const detectedLanguage = this.detectLanguage(message);
    if (detectedLanguage) {
      context.language = detectedLanguage;
    }
    
    // First check if it's a follow-up question
    const language = context.language as Language;
    const { isFollowUp } = this.isFollowUpQuestion(message, conversationId);
    
    // Extract subject from the message - similar to Kotlin implementation
    const subject = this.detectSubject(message, language);
    
    // Only update subject if one is found and it's not a follow-up
    // Or if it's explicitly mentioned in a follow-up
    if (subject) {
      // Store previous subject for context carryover
      if (context.currentSubject && subject !== context.currentSubject) {
        context.metadata.set('previousSubject', context.currentSubject);
        console.log(`Subject transition: ${context.currentSubject} -> ${subject}`);
      }
      context.currentSubject = subject;
    } else if (isFollowUp && context.currentSubject) {
      // Maintain subject for follow-up questions (critical for correct context)
      console.log(`Maintaining subject for follow-up: ${context.currentSubject}`);
    }
    
    // Extract numbers with context
    const numberPatterns = this.extractNumbers(message);
    numberPatterns.forEach((value, key) => context.lastNumbers.set(key, value));
    
    // Extract entities
    const quotedText = message.match(/["']([^"']+)["']/g);
    if (quotedText) {
      quotedText.forEach(text => {
        const cleanText = text.replace(/["']/g, '');
        context.lastEntities.add(cleanText);
      });
    }
    
    // Update follow-up count for user messages only
    if (isUser) {
      context.followUpCount++;
      console.log(`Increased follow-up count to ${context.followUpCount}`);
    }
    
    // Simple topic tracking
    this.simpleTopicTracking(context, message);
  }

  // Simplified topic tracking to match Kotlin implementation
  private simpleTopicTracking(context: ConversationContext, message: string): void {
    const topicKeywords = {
      admission: ['admission', 'apply', 'application', 'القبول', 'التقديم'],
      fees: ['fees', 'cost', 'tuition', 'payment', 'الرسوم', 'التكلفة', 'الدفع'],
      programs: ['program', 'major', 'course', 'برنامج', 'تخصص'],
      requirements: ['requirements', 'prerequisites', 'الشروط', 'المتطلبات'],
      schedule: ['schedule', 'timetable', 'calendar', 'الجدول', 'المواعيد']
    };

    const lowercaseMessage = message.toLowerCase();
    
    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      if (keywords.some(keyword => lowercaseMessage.includes(keyword))) {
        context.currentTopic = topic;
        // Add to active topics if not already there
        const existingTopic = context.activeTopics.find(t => t.name === topic);
        if (!existingTopic) {
          context.activeTopics.push({
            name: topic,
            lastDiscussed: Date.now(),
            attributes: new Set<string>(),
            relatedQueries: [message]
          });
        } else {
          existingTopic.lastDiscussed = Date.now();
          existingTopic.relatedQueries.push(message);
        }
        
        console.log(`Set current topic to: ${topic}`);
        break;
      }
    }
  }

  // New helper method to keep context data manageable
  private pruneContextData(context: ConversationContext): void {
    // Keep only the last 20 entities
    if (context.lastEntities.size > 20) {
      const entitiesToKeep = Array.from(context.lastEntities).slice(-20);
      context.lastEntities = new Set(entitiesToKeep);
    }
    
    // Keep only the last 10 active topics
    if (context.activeTopics.length > 10) {
      context.activeTopics = context.activeTopics.slice(-10);
    }
    
    // Keep only the last 15 topic transitions
    if (context.topicTransitions.length > 15) {
      context.topicTransitions = context.topicTransitions.slice(-15);
    }
    
    // Keep only the last 10 state transitions
    if (context.state.transitions.length > 10) {
      context.state.transitions = context.state.transitions.slice(-10);
    }
  }

  getOrCreateContext(conversationId: string): ConversationContext {
    this.cleanupExpiredSessions();
    
    if (!this.contexts.has(conversationId)) {
      const newContext = this.createNewContext();
      this.contexts.set(conversationId, newContext);
    }
    
    return this.contexts.get(conversationId)!;
  }

  private cleanupExpiredSessions(): void {
    const now = Date.now();
    for (const [id, context] of this.contexts.entries()) {
      const lastInteraction = context.metadata.get('lastInteraction') as number;
      if (now - lastInteraction > this.sessionTimeout) {
        this.contexts.delete(id);
      }
    }
  }

  isFollowUpQuestion(text: string, conversationId: string): { isFollowUp: boolean; confidence: number } {
    // Get the context
    const context = this.getOrCreateContext(conversationId);
    
    // Immediately return false for empty strings or new conversations
    if (!text || !text.trim() || context.followUpCount === 0) {
      return { isFollowUp: false, confidence: 0 };
    }
    
    // Normalize text for analysis
    const normalizedText = text.toLowerCase().trim();
    
    // Simplified scoring system that aligns with the Kotlin app
    let score = 0;
    let maxScore = 5; // Total possible points
    
    // 1. Check for explicit follow-up indicators
    const language = context.language as 'en' | 'ar';
    
    // Short query (likely follow-up)
    if (normalizedText.split(/\s+/).length <= 4) {
      score += 1;
      console.log('Short query detected (likely follow-up)');
    }
    
    // Check for follow-up indicators at beginning of text
    if (language === 'ar') {
      if (/^(و|ف|كما|لكن|أيضا|ماذا عن|ماذا|هل|كيف)/i.test(normalizedText)) {
        score += 2;
        console.log('Arabic follow-up indicator detected at start of message');
      }
    } else {
      if (/^(and|what about|tell me about|how about|also|but|so|what|how)/i.test(normalizedText)) {
        score += 2;
        console.log('English follow-up indicator detected at start of message');
      }
    }
    
    // Check for pronouns and references to previous content
    const contextualRefs = language === 'ar' ? 
      /(هذا|ذلك|هؤلاء|تلك|هم|هي|هو)/i :
      /(this|that|these|those|it|they|them|he|she)/i;
    
    if (contextualRefs.test(normalizedText)) {
      score += 1.5;
      console.log('Contextual reference detected');
    }
    
    // Check if current subject is maintained
    if (context.currentSubject && !this.detectSubject(text, language)) {
      score += 1.5;
      console.log('Current subject maintained (no new subject mentioned)');
    }
    
    // Simple formula similar to Kotlin implementation
    const isFollowUp = score >= 2; // Threshold for follow-up
    const confidence = score / maxScore;
    
    console.log(`Follow-up analysis: score=${score}, isFollowUp=${isFollowUp}, confidence=${confidence.toFixed(2)}`);
    
    return { isFollowUp, confidence };
  }

  private updateContextState(context: ConversationContext, message: string): void {
    const prevState = context.state.currentState;
    const hasSubject = !!context.currentSubject;
    const { isFollowUp, confidence } = this.isFollowUpQuestion(message, context.currentSubject || '');

    // Determine new state based on current conditions
    let newState: ContextState['currentState'] = 'initial';
    
    if (isFollowUp && hasSubject) {
      newState = 'follow_up';
    } else if (this.detectClarificationIntent(message)) {
      newState = 'clarification';
    } else if (hasSubject) {
      newState = 'subject_selected';
    } else if (context.currentTopic) {
      newState = 'topic_focused';
    }

    // Record state transition
    if (prevState !== newState) {
      context.state.transitions.push({
        timestamp: Date.now(),
        from: prevState,
        to: newState,
        trigger: message
      });
    }

    context.state.currentState = newState;
    context.state.confidence = confidence;
  }

  private detectClarificationIntent(message: string): boolean {
    const clarificationPatterns = {
      en: /\b(?:what do you mean|could you explain|please clarify|i don't understand|what is|what are)\b/i,
      ar: /\b(?:ماذا تقصد|هل يمكنك التوضيح|من فضلك وضح|لا أفهم|ما هو|ما هي)\b/i
    };

    const language = this.detectLanguage(message);
    return clarificationPatterns[language as 'en' | 'ar'].test(message);
  }

  private updateHierarchicalContext(context: ConversationContext, message: string): void {
    // Extract current subject if available
    const detectedSubject = this.detectSubject(message, context.language as Language);

    // Subject handling
    if (detectedSubject) {
      // Check if the subject is an academic major
      const academicMajorPatterns = {
        en: /\b(?:computer science|information technology|engineering|business|management|economics|finance|accounting|marketing|psychology|sociology|law|medicine|dentistry|pharmacy|nursing|optometry|architecture|art|design|education|language|literature|history|philosophy|mathematics|physics|chemistry|biology|geology|geography|political science|international relations|communications|media|journalism)\b/i,
        ar: /\b(?:علوم الحاسوب|تكنولوجيا المعلومات|الهندسة|إدارة الأعمال|الاقتصاد|التمويل|المحاسبة|التسويق|علم النفس|علم الاجتماع|القانون|الطب|طب الأسنان|الصيدلة|التمريض|البصريات|العمارة|الفن|التصميم|التعليم|اللغة|الأدب|التاريخ|الفلسفة|الرياضيات|الفيزياء|الكيمياء|الأحياء|الجيولوجيا|الجغرافيا|العلوم السياسية|العلاقات الدولية|الاتصالات|الإعلام|الصحافة)\b/i
      };
      
      const isMajor = academicMajorPatterns[context.language as 'en' | 'ar'].test(detectedSubject);
      
      if (isMajor) {
        // For academic majors, we increase confidence and retain the subject longer
        console.log(`Academic major detected as subject: "${detectedSubject}" - Setting higher confidence`);
        
        // Set a higher initial confidence for academic majors
        const initialConfidence = 0.9;
        
        // Update or set the subject in the hierarchy
        if (context.hierarchy.subject && context.hierarchy.subject.name !== detectedSubject) {
          // Store previous subject before updating
          context.metadata.set('previousSubject', context.hierarchy.subject.name);
          
          // Keep track of recent topics in temporal context
          if (context.hierarchy.temporalContext.recentTopics.indexOf(context.hierarchy.subject.name) === -1) {
            context.hierarchy.temporalContext.recentTopics.unshift(context.hierarchy.subject.name);
            
            // Trim to keep only last 5 topics
            if (context.hierarchy.temporalContext.recentTopics.length > 5) {
              context.hierarchy.temporalContext.recentTopics.pop();
            }
          }
          
          // Record topic transition
          context.hierarchy.temporalContext.topicTransitions.push({
            from: context.hierarchy.subject.name,
            to: detectedSubject,
            timestamp: Date.now()
          });
          
      context.hierarchy.subject = {
        name: detectedSubject,
            confidence: initialConfidence,
        subtopics: this.getSubtopicsForSubject(detectedSubject),
        relatedTopics: this.getRelatedTopicsForSubject(detectedSubject),
            lastMentioned: Date.now()
          };
        } else if (!context.hierarchy.subject) {
          context.hierarchy.subject = {
            name: detectedSubject,
            confidence: initialConfidence,
            subtopics: this.getSubtopicsForSubject(detectedSubject),
            relatedTopics: this.getRelatedTopicsForSubject(detectedSubject),
            lastMentioned: Date.now()
          };
        } else {
          // Update timestamp and maintain high confidence for existing subject
          context.hierarchy.subject.lastMentioned = Date.now();
          context.hierarchy.subject.confidence = Math.min(context.hierarchy.subject.confidence + 0.1, 1.0);
        }
        
        // Update current subject in the context
        context.currentSubject = detectedSubject;
      } else {
        // Regular subject handling
        if (!context.hierarchy.subject || context.hierarchy.subject.name !== detectedSubject) {
          // If we have an existing subject, store it before updating
          if (context.hierarchy.subject) {
            context.metadata.set('previousSubject', context.hierarchy.subject.name);
            
            // Keep track of recent topics in temporal context
            if (context.hierarchy.temporalContext.recentTopics.indexOf(context.hierarchy.subject.name) === -1) {
              context.hierarchy.temporalContext.recentTopics.unshift(context.hierarchy.subject.name);
              
              // Trim to keep only last 5 topics
              if (context.hierarchy.temporalContext.recentTopics.length > 5) {
                context.hierarchy.temporalContext.recentTopics.pop();
              }
            }
            
            // Record topic transition
            context.hierarchy.temporalContext.topicTransitions.push({
              from: context.hierarchy.subject.name,
              to: detectedSubject,
              timestamp: Date.now()
            });
          }
          
          // Set the new subject with initial confidence
          context.hierarchy.subject = {
            name: detectedSubject,
            confidence: 0.7, // Standard initial confidence
            subtopics: this.getSubtopicsForSubject(detectedSubject),
            relatedTopics: this.getRelatedTopicsForSubject(detectedSubject),
            lastMentioned: Date.now()
          };
          
          // Update currentSubject in the context
          context.currentSubject = detectedSubject;
        } else {
          // Just update the timestamp for an existing subject
          context.hierarchy.subject.lastMentioned = Date.now();
          context.hierarchy.subject.confidence = Math.min(context.hierarchy.subject.confidence + 0.05, 1.0);
        }
      }
    }
    
    // Topic tracking
    const detectedTopic = this.detectTopic(message);
    if (detectedTopic) {
      // Update topic in hierarchy
      if (!context.hierarchy.topic || context.hierarchy.topic.name !== detectedTopic) {
        // Store the previous topic if it exists
        if (context.hierarchy.topic) {
          // Keep track of recent topics
          if (context.hierarchy.temporalContext.recentTopics.indexOf(context.hierarchy.topic.name) === -1) {
            context.hierarchy.temporalContext.recentTopics.unshift(context.hierarchy.topic.name);
            
            // Trim to keep only last 5 topics
            if (context.hierarchy.temporalContext.recentTopics.length > 5) {
              context.hierarchy.temporalContext.recentTopics.pop();
            }
          }
        }
        
        // Set new topic
      context.hierarchy.topic = {
        name: detectedTopic,
          confidence: 0.7, // Initial confidence
        keywords: this.getKeywordsForTopic(detectedTopic),
          lastMentioned: Date.now()
        };
      } else {
        // Update existing topic's timestamp and confidence
        if (context.hierarchy.topic) {
          context.hierarchy.topic.lastMentioned = Date.now();
          context.hierarchy.topic.confidence = Math.min(1.0, context.hierarchy.topic.confidence + 0.05);
        }
      }
    }
    
    // Entity tracking
    const entities = this.extractEntities(message);
    
    if (entities.length > 0) {
      for (const entity of entities) {
        let exists = false;
        
        // Update existing entities or add new ones
        for (let i = 0; i < context.hierarchy.entities.length; i++) {
          const existingEntity = context.hierarchy.entities[i];
          
          if (existingEntity.name.toLowerCase() === entity.toLowerCase()) {
            // Update existing entity
            existingEntity.mentions += 1;
            existingEntity.lastMentioned = Date.now();
            existingEntity.confidence = Math.min(1.0, existingEntity.confidence + 0.1);
            exists = true;
            break;
          }
        }
        
        // Add new entity if not found
        if (!exists) {
        context.hierarchy.entities.push({
          name: entity,
          type: this.detectEntityType(entity),
            confidence: 0.6, // Initial confidence
          mentions: 1,
            lastMentioned: Date.now()
          });
          
          // Also add to recent entities
          context.hierarchy.temporalContext.recentEntities.unshift(entity);
          
          // Trim to keep only last 10 entities
          if (context.hierarchy.temporalContext.recentEntities.length > 10) {
            context.hierarchy.temporalContext.recentEntities.pop();
          }
        }
      }
    }
    
    // Clean up old entities (older than 30 minutes)
    const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000;
    context.hierarchy.entities = context.hierarchy.entities.filter(
      entity => entity.lastMentioned > thirtyMinutesAgo || entity.mentions > 3
    );
  }

  private getSubtopicsForSubject(subject: string): string[] {
    // Add subject-specific subtopics mapping
    const subtopicsMap: Record<string, string[]> = {
      'Computer Science': ['Programming', 'Algorithms', 'Data Structures', 'Databases', 'Networks'],
      'Engineering': ['Design', 'Analysis', 'Implementation', 'Testing', 'Maintenance'],
      'Optometry': ['Vision Care', 'Eye Health', 'Clinical Practice', 'Optical Devices']
    };
    return subtopicsMap[subject] || [];
  }

  private getRelatedTopicsForSubject(subject: string): string[] {
    // Add subject-specific related topics mapping
    const relatedTopicsMap: Record<string, string[]> = {
      'Computer Science': ['Software Engineering', 'Information Technology', 'Artificial Intelligence'],
      'Engineering': ['Mathematics', 'Physics', 'Computer Science'],
      'Optometry': ['Medicine', 'Biology', 'Physics']
    };
    return relatedTopicsMap[subject] || [];
  }

  private getKeywordsForTopic(topic: string): string[] {
    // Add topic-specific keywords mapping
    const keywordsMap: Record<string, string[]> = {
      'Programming': ['coding', 'development', 'software', 'languages'],
      'Databases': ['SQL', 'data', 'storage', 'management'],
      'Networks': ['protocols', 'communication', 'internet', 'security']
    };
    return keywordsMap[topic] || [];
  }

  private detectEntityType(entity: string): string {
    // Add entity type detection logic
    if (/\d+(?:\.\d+)?\s*(?:NIS|₪)/.test(entity)) return 'currency';
    if (/\d+(?:\.\d+)?%/.test(entity)) return 'percentage';
    if (/\d+\s*(?:credit|hour)/.test(entity)) return 'academic_unit';
    if (/\b(?:spring|fall|summer|winter)\s*\d{4}\b/i.test(entity)) return 'semester';
    return 'general';
  }

  private detectTopic(message: string): string | null {
    const topicPatterns = {
      fees: /\b(?:fees?|tuition|cost|payment|scholarship|financial)\b/i,
      admission: /\b(?:admission|enroll|apply|application|requirements|prerequisites)\b/i,
      courses: /\b(?:courses?|subjects?|curriculum|study plan|schedule|classes)\b/i,
      grades: /\b(?:grades?|marks?|assessment|evaluation|exam|test|quiz)\b/i,
      career: /\b(?:career|job|employment|work|profession|industry|opportunity)\b/i
    };

    for (const [topic, pattern] of Object.entries(topicPatterns)) {
      if (pattern.test(message)) {
        return topic;
      }
    }

    return null;
  }

  private updateTopicContext(context: ConversationContext, message: string, newSubject: string | null): void {
    // Log for debugging
    console.log('Updating topic context', { message, newSubject });
    
    // Detect topics from the message
    const detectedTopics = this.detectTopicsFromMessage(message, context.language as Language);
    console.log('Detected topics:', detectedTopics);
    
    // Detect attributes (like fees, requirements, etc.)
    const detectedAttributes = this.detectTopicAttributes(message, context.language as Language);
    console.log('Detected attributes:', [...detectedAttributes]);

    // Store the last message for context
    if (!context.metadata.has('lastMessages')) {
      context.metadata.set('lastMessages', []);
    }
    const lastMessages = context.metadata.get('lastMessages');
    lastMessages.unshift({ text: message, timestamp: Date.now() });
    if (lastMessages.length > 5) lastMessages.pop();
    context.metadata.set('lastMessages', lastMessages);
    
    // If there are detected attributes, save them for potential carryover
    if (detectedAttributes.size > 0) {
      context.lastDiscussedAttributes = detectedAttributes;
      // Also store in metadata for easier access
      context.metadata.set('lastDiscussedAttributes', [...detectedAttributes]);
      console.log('Stored attributes for carryover:', [...detectedAttributes]);
    }
    
    // Handle the case of an attribute-focused question without explicit mention of subject
    // Example: "what about optometry?" after asking about CS credit hour fees
    const isSubjectReferenceQuestion = this.checkForSubjectReference(message, context.language as Language);
    
    if (isSubjectReferenceQuestion) {
      console.log('Subject reference question detected');
      
      // Extract the referenced subject
      const referencedSubject = this.extractReferencedSubject(message, context.language as Language);
      console.log('Referenced subject:', referencedSubject);
      
      if (referencedSubject) {
        // Get the previously discussed attributes - either from this message or from context
        const attributesToCarryOver = detectedAttributes.size > 0 
          ? detectedAttributes 
          : context.lastDiscussedAttributes || new Set<string>();
        
        console.log('Attributes to carry over:', [...attributesToCarryOver]);
        
        if (attributesToCarryOver.size > 0) {
          // This is our key case - a subject reference with attributes to carry over
          console.log(`Subject reference with attribute carryover: ${referencedSubject}, attributes: ${[...attributesToCarryOver].join(', ')}`);
          
          // Update the subject while maintaining attributes
          const previousSubject = context.currentSubject;
          context.currentSubject = referencedSubject;
          
          // Create transition with attribute carryover
          context.topicTransitions.push({
            from: previousSubject || 'none',
            to: referencedSubject,
            timestamp: Date.now(),
            attributeCarryOver: [...attributesToCarryOver]
          });
          
          // CRITICAL: Store explicit carryover info for response generation
          context.metadata.set('attributeCarryover', {
            active: true,
            previousSubject: previousSubject,
            newSubject: referencedSubject,
            attributes: [...attributesToCarryOver],
            timestamp: Date.now(),
            originalMessage: lastMessages.length > 1 ? lastMessages[1].text : null
          });
          
          console.log('Set attributeCarryover in metadata:', context.metadata.get('attributeCarryover'));
          
          // Don't reset the attributes when transitioning subjects
          context.lastDiscussedAttributes = attributesToCarryOver;
          
          // Don't change the current topic if we're carrying attributes over
          // This ensures we don't lose the topical context
          return;
        }
      }
    }
    
    // If new subject is mentioned, it's a subject transition
    if (newSubject && newSubject !== context.currentSubject) {
      console.log(`Subject transition from ${context.currentSubject} to ${newSubject}`);
      
      // Track the subject transition
    const now = Date.now();
      
      // Carry over attributes from previous questions when switching subjects
      // This is the key enhancement for the credit hour fees scenario
      if (context.lastDiscussedAttributes && context.lastDiscussedAttributes.size > 0) {
        // Create attribute carryover during subject transition
        const attributeCarryOver = [...context.lastDiscussedAttributes];
        context.topicTransitions.push({
          from: context.currentSubject || 'none',
          to: newSubject,
          timestamp: now,
          attributeCarryOver: attributeCarryOver
        });
        
        console.log(`Carrying over attributes during subject transition: ${attributeCarryOver.join(', ')}`);
        
        // CRITICAL: Store explicit carryover info for response generation
        context.metadata.set('attributeCarryover', {
          active: true,
          previousSubject: context.currentSubject,
          newSubject: newSubject,
          attributes: attributeCarryOver,
          timestamp: now,
          originalMessage: lastMessages.length > 1 ? lastMessages[1].text : null
        });
        
        console.log('Set attributeCarryover in metadata:', context.metadata.get('attributeCarryover'));
      } else {
        context.topicTransitions.push({
          from: context.currentSubject || 'none',
          to: newSubject,
          timestamp: now,
          attributeCarryOver: []
        });
        
        // Clear any existing attribute carryover
        if (context.metadata.has('attributeCarryover')) {
          const carryover = context.metadata.get('attributeCarryover');
          carryover.active = false;
          context.metadata.set('attributeCarryover', carryover);
        }
      }
      
      // Update the current subject
      context.currentSubject = newSubject;
      
      // Check if any topics detected have high confidence and update current topic
      const highConfidenceTopic = detectedTopics.find(t => t.confidence > 0.7);
      if (highConfidenceTopic) {
        context.currentTopic = highConfidenceTopic.name;
      } else if (detectedAttributes.size > 0) {
        // If attributes are detected but no clear topic, set the attribute as the topic
        // This is common in questions about fees, requirements, etc.
        context.currentTopic = [...detectedAttributes][0];
      }
      
      // Update hierarchy
      this.updateHierarchicalContext(context, message);
      return;
    }
    
    // Standard topic updates for non-subject transition cases
    if (detectedTopics.length > 0) {
      // Sort by confidence
      detectedTopics.sort((a, b) => b.confidence - a.confidence);
      
      // Update current topic if confidence is high enough
      if (detectedTopics[0].confidence > 0.4) {
        const previousTopic = context.currentTopic;
        context.currentTopic = detectedTopics[0].name;
        
        // Track topic transition
        if (previousTopic !== context.currentTopic) {
          context.topicTransitions.push({
            from: previousTopic || 'none',
            to: context.currentTopic,
            timestamp: Date.now(),
            attributeCarryOver: [...(context.lastDiscussedAttributes || new Set())]
          });
        }
      }
      
      // Add topics to active topics
      for (const topic of detectedTopics) {
        if (topic.confidence > 0.3) {
          const existingTopicIndex = context.activeTopics.findIndex(t => t.name === topic.name);
          
        if (existingTopicIndex >= 0) {
            // Update existing topic
            context.activeTopics[existingTopicIndex].lastDiscussed = Date.now();
            // Merge attributes if any
            if (detectedAttributes.size > 0) {
              detectedAttributes.forEach(attr => 
                context.activeTopics[existingTopicIndex].attributes.add(attr)
              );
        }
      } else {
            // Add new topic
          context.activeTopics.push({
              name: topic.name,
              lastDiscussed: Date.now(),
              attributes: detectedAttributes,
            relatedQueries: [message]
          });
          }
        }
      }
    }
  }

  /**
   * NEW: Detect potential topics from a message
   */
  private detectTopicsFromMessage(message: string, language: Language): Array<{name: string, confidence: number, keywords?: string[]}> {
    const topicMap: Record<string, number> = {};
    const results: Array<{name: string, confidence: number, keywords?: string[]}> = [];
    
    // Define topic categories with keywords and phrases for detection
    const topicCategories: Record<string, Record<string, {keywords: string[], phrases: string[]}>> = {
      en: {
        'Admission Requirements': {
          keywords: ['admission', 'requirements', 'application', 'apply', 'minimum', 'average', 'criteria', 'qualifications', 'eligible', 'high school', 'tawjihi', 'secondary'],
          phrases: ['how to apply', 'admission process', 'admission requirements', 'application deadline']
        },
        'Tuition & Fees': {
          keywords: ['tuition', 'fees', 'cost', 'payment', 'price', 'financial', 'scholarship', 'discount', 'installment', 'credit hour', 'NIS', 'dollar', 'dinar'],
          phrases: ['how much does it cost', 'tuition fees', 'credit hour fees', 'payment plan', 'financial aid']
        },
        'Program Structure': {
          keywords: ['program', 'structure', 'curriculum', 'courses', 'subjects', 'syllabus', 'credit', 'hours', 'requirements', 'electives', 'mandatory'],
          phrases: ['what courses', 'program structure', 'curriculum details', 'credit hours']
        },
        'Duration & Schedule': {
          keywords: ['duration', 'years', 'semesters', 'time', 'schedule', 'calendar', 'start', 'begin', 'finish', 'graduate', 'part-time', 'full-time'],
          phrases: ['how long does it take', 'program duration', 'academic calendar', 'start date']
        },
        'Career Prospects': {
          keywords: ['career', 'job', 'opportunity', 'employment', 'prospects', 'market', 'salary', 'positions', 'industry', 'field', 'work'],
          phrases: ['job opportunities', 'career path', 'job market', 'employment prospects']
        },
        'Faculty & Staff': {
          keywords: ['faculty', 'staff', 'professors', 'instructors', 'teachers', 'academics', 'researchers', 'department head', 'dean'],
          phrases: ['who teaches', 'faculty members', 'department staff', 'teaching staff']
        },
        'Campus Facilities': {
          keywords: ['campus', 'facilities', 'labs', 'library', 'accommodation', 'housing', 'dorms', 'cafeteria', 'buildings', 'rooms', 'centers'],
          phrases: ['campus facilities', 'student housing', 'computer labs', 'libraries']
        },
        'Accreditation & Ranking': {
          keywords: ['accreditation', 'accredited', 'recognition', 'ranking', 'status', 'quality', 'standards', 'approved'],
          phrases: ['is it accredited', 'ministry approval', 'program ranking', 'accreditation status']
        },
        'Internships & Practical Training': {
          keywords: ['internship', 'practical', 'training', 'placement', 'field', 'experience', 'hands-on', 'industry', 'practice', 'apprenticeship'],
          phrases: ['internship opportunities', 'practical training', 'field experience', 'industry placement']
        },
        'Admission Status': {
          keywords: ['status', 'application', 'accepted', 'rejected', 'admission', 'decision', 'confirmed', 'waitlist', 'pending'],
          phrases: ['application status', 'admission decision', 'acceptance letter', 'when will I know']
        }
      },
      ar: {
        'متطلبات القبول': {
          keywords: ['قبول', 'متطلبات', 'تقديم', 'طلب', 'الحد الأدنى', 'معدل', 'شروط', 'مؤهلات', 'ثانوية عامة', 'توجيهي'],
          phrases: ['كيفية التقديم', 'عملية القبول', 'متطلبات القبول', 'موعد التقديم']
        },
        'الرسوم الدراسية': {
          keywords: ['رسوم', 'تكلفة', 'دفع', 'سعر', 'مالي', 'منحة', 'خصم', 'تقسيط', 'ساعة معتمدة', 'شيكل', 'دولار', 'دينار'],
          phrases: ['كم التكلفة', 'الرسوم الدراسية', 'رسوم الساعة المعتمدة', 'خطة الدفع', 'المساعدة المالية']
        },
        'هيكل البرنامج': {
          keywords: ['برنامج', 'هيكل', 'منهج', 'مساقات', 'مواد', 'خطة', 'ساعات', 'متطلبات', 'اختياري', 'إجباري'],
          phrases: ['ما هي المساقات', 'هيكل البرنامج', 'تفاصيل المنهج', 'الساعات المعتمدة']
        },
        'المدة والجدول': {
          keywords: ['مدة', 'سنوات', 'فصول', 'وقت', 'جدول', 'تقويم', 'بداية', 'نهاية', 'تخرج', 'دوام جزئي', 'دوام كامل'],
          phrases: ['كم المدة', 'مدة البرنامج', 'التقويم الأكاديمي', 'تاريخ البدء']
        },
        'فرص العمل': {
          keywords: ['مهنة', 'وظيفة', 'فرصة', 'توظيف', 'آفاق', 'سوق', 'راتب', 'مناصب', 'صناعة', 'مجال', 'عمل'],
          phrases: ['فرص العمل', 'المسار الوظيفي', 'سوق العمل', 'آفاق التوظيف']
        }
      }
    };
    
    // Normalized message
    const normalizedMessage = message.toLowerCase();
    
    // Get the appropriate language categories
    const categories = topicCategories[language] || topicCategories.en;
    
    // Score each topic category
    Object.entries(categories).forEach(([topic, data]) => {
      let score = 0;
      
      // Check for keywords
      data.keywords.forEach(keyword => {
        const regex = new RegExp(`\\b${keyword}\\b`, 'i');
        if (regex.test(normalizedMessage)) {
          score += 1;
        }
      });
      
      // Check for phrases (higher weight)
      data.phrases.forEach(phrase => {
        if (normalizedMessage.includes(phrase.toLowerCase())) {
          score += 2;
        }
      });
      
      // Store score if relevant
      if (score > 0) {
        topicMap[topic] = score;
      }
    });
    
    // Convert scores to confidence values
    const totalKeywords = Math.max(...Object.values(topicMap), 1);
    Object.entries(topicMap).forEach(([topic, score]) => {
      // Calculate confidence between 0 and 1
      const confidence = Math.min(score / totalKeywords, 1);
      
      // Only include topics with reasonable confidence
      if (confidence >= 0.3) {
        // Safely access the topic data with type check
        const topicData = categories[topic];
        results.push({
          name: topic,
          confidence: confidence,
          keywords: topicData?.keywords || []
        });
      }
    });
    
    return results;
  }

  private detectTopicAttributes(message: string, language: Language = 'en'): Set<string> {
    const detectedAttributes = new Set<string>();
    const lowerMessage = message.toLowerCase();
    
    // Check for each attribute type
    for (const [attribute, terms] of Object.entries(this.topicAttributes)) {
      const relevantTerms = terms[language] || terms['en']; // fallback to English if language not found
      
      if (relevantTerms.some(term => lowerMessage.includes(term.toLowerCase()))) {
        detectedAttributes.add(attribute);
      }
    }
    
    // Special case for credit hour fees detection
    if (language === 'en') {
      if (lowerMessage.includes('credit hour') && 
          (lowerMessage.includes('fee') || lowerMessage.includes('cost') || lowerMessage.includes('price'))) {
        detectedAttributes.add('fees');
      }
    } else if (language === 'ar') {
      if (lowerMessage.includes('ساعة معتمدة') && 
          (lowerMessage.includes('رسوم') || lowerMessage.includes('تكلفة') || lowerMessage.includes('سعر'))) {
        detectedAttributes.add('fees');
      }
    }
    
    return detectedAttributes;
  }

  // Helper method to check if a message is asking about a different subject
  public checkForSubjectReference(message: string, language: Language): boolean {
    const patterns: Record<Language, RegExp[]> = {
      en: [
        /what about (.+?)(\?|$)/i,
        /how about (.+?)(\?|$)/i,
        /and (.+?)(\?|$)/i,
        /for (.+?)(\?|$)/i,
        /is it different for (.+?)(\?|$)/i,
        /in (.+?)(\?|$)/i
      ],
      ar: [
        /ماذا عن (.+?)(\؟|$)/i,
        /وماذا عن (.+?)(\؟|$)/i,
        /و (.+?)(\؟|$)/i,
        /ل (.+?)(\؟|$)/i,
        /هل هو مختلف ل (.+?)(\؟|$)/i,
        /في (.+?)(\؟|$)/i
      ]
    };
    
    return patterns[language].some(pattern => pattern.test(message));
  }

  // Helper method to extract the referenced subject from a message
  private extractReferencedSubject(message: string, language: Language): string | null {
    const patterns: Record<Language, RegExp[]> = {
      en: [
        /what about (.+?)(\?|$)/i,
        /how about (.+?)(\?|$)/i,
        /and (.+?)(\?|$)/i,
        /for (.+?)(\?|$)/i,
        /is it different for (.+?)(\?|$)/i,
        /in (.+?)(\?|$)/i
      ],
      ar: [
        /ماذا عن (.+?)(\؟|$)/i,
        /وماذا عن (.+?)(\؟|$)/i,
        /و (.+?)(\؟|$)/i,
        /ل (.+?)(\؟|$)/i,
        /هل هو مختلف ل (.+?)(\؟|$)/i,
        /في (.+?)(\؟|$)/i
      ]
    };
    
    for (const pattern of patterns[language]) {
      const match = message.match(pattern);
      if (match && match[1]) {
        // Check if the extracted term is a valid subject/major
        const extractedTerm = match[1].trim().toLowerCase();
        // You would need to compare with a list of majors/subjects
        // For now, we'll assume it's valid
        return extractedTerm;
      }
    }
    
    return null;
  }

  private isAttributeQuestion(message: string, language: Language = 'en'): boolean {
    // Check if the message is querying about a specific attribute without mentioning it directly
    const attributeQuestionPatterns: Record<Language, RegExp[]> = {
      en: [
        /^what about/i,
        /^how about/i,
        /^and (the|for)/i,
        /^what are the/i,
        /^how much/i,
        /^is it different/i
      ],
      ar: [
        /^ماذا عن/i,
        /^وماذا عن/i,
        /^و (ال|ل)/i,
        /^كم/i,
        /^هل هو مختلف/i
      ]
    };
    
    return attributeQuestionPatterns[language].some(pattern => pattern.test(message.trim()));
  }

  // Add this method to help with response generation
  public getContextForResponse(conversationId: string): {
    subject: string | null;
    topic: string | null;
    isFollowUp: boolean;
    carriedAttributes: string[];
    previousSubject: string | null;
    attributeCarryover: boolean;
    originalQuery: string | null;
  } {
    const context = this.getOrCreateContext(conversationId);
    
    // Get carried attributes if any
    let carriedAttributes: string[] = [];
    let previousSubject: string | null = null;
    let attributeCarryover = false;
    let originalQuery: string | null = null;
    
    // Check if we have explicit attribute carryover
    if (context.metadata.has('attributeCarryover')) {
      const carryover = context.metadata.get('attributeCarryover');
      if (carryover.active && carryover.attributes && carryover.attributes.length > 0) {
        carriedAttributes = carryover.attributes;
        previousSubject = carryover.previousSubject;
        attributeCarryover = true;
        originalQuery = carryover.originalMessage;
        console.log('Found explicit attribute carryover for response:', carriedAttributes);
      }
    }
    
    // If no explicit carryover but we have lastDiscussedAttributes, use those
    if (carriedAttributes.length === 0 && context.lastDiscussedAttributes && context.lastDiscussedAttributes.size > 0) {
      carriedAttributes = [...context.lastDiscussedAttributes];
    }
    
    // Check for follow-up status
    const isFollowUp = context.state.currentState === 'follow_up' || 
                      (context.metadata.has('isFollowUp') && context.metadata.get('isFollowUp'));
    
    return {
      subject: context.currentSubject,
      topic: context.currentTopic,
      isFollowUp,
      carriedAttributes,
      previousSubject,
      attributeCarryover,
      originalQuery
    };
  }

  /**
   * Intelligently manages topic transitions based on detected topics and confidence scores
   * @param conversationId - The unique conversation identifier
   * @param message - The user's message
   * @param detectedTopics - Array of topics detected in the message with confidence scores
   * @returns The updated conversation context
   */
  public handleDynamicTopicSwitching(
    conversationId: string,
    message: string,
    detectedTopics: Array<{name: string, confidence: number}>
  ): ConversationContext {
    const context = this.getContextForSession(conversationId);
    const currentTopic = context.currentTopic;
    
    // Sort topics by confidence score (highest first)
    const sortedTopics = [...detectedTopics].sort((a, b) => b.confidence - a.confidence);
    
    // If no current topic, simply use the highest confidence topic
    if (!currentTopic && sortedTopics.length > 0) {
      const newTopic = sortedTopics[0].name;
      return this.switchToTopic(conversationId, newTopic, message);
    }
    
    // Topic stickiness: require higher confidence to switch away from current topic
    const TOPIC_STICKINESS = 0.2; // Configurable stickiness factor
    const MINIMUM_CONFIDENCE_FOR_SWITCH = 0.6; // Minimum confidence to trigger a switch
    
    // Check if we should switch topics
    if (currentTopic && sortedTopics.length > 0) {
      const highestConfidenceTopic = sortedTopics[0];
      
      // If the highest confidence topic is different from current topic
      if (highestConfidenceTopic.name !== currentTopic) {
        const currentTopicMatch = sortedTopics.find(t => t.name === currentTopic);
        const currentTopicConfidence = currentTopicMatch ? currentTopicMatch.confidence : 0;
        
        // Only switch if new topic has significantly higher confidence than current topic
        if (highestConfidenceTopic.confidence > currentTopicConfidence + TOPIC_STICKINESS &&
            highestConfidenceTopic.confidence >= MINIMUM_CONFIDENCE_FOR_SWITCH) {
          
          // Before switching, check for explicit topic change indicators
          const hasExplicitChangeIndicator = this.detectExplicitTopicChangeIntent(message);
          
          // Log the transition for analytics
          const transition = {
            from: currentTopic,
            to: highestConfidenceTopic.name,
            timestamp: Date.now(),
            isExplicit: hasExplicitChangeIndicator,
            confidenceDelta: highestConfidenceTopic.confidence - currentTopicConfidence
          };
          
          console.log('Topic transition:', transition);
          
          // Perform the actual topic switch
          return this.switchToTopic(conversationId, highestConfidenceTopic.name, message);
        }
      }
    }
    
    return context;
  }
  
  /**
   * Detects explicit indications that the user wants to change topics
   * @param message - The user's message
   * @returns Whether an explicit topic change intent was detected
   */
  private detectExplicitTopicChangeIntent(message: string): boolean {
    // Language-aware detection of topic change intent
    const englishPatterns = [
      /let('s| us) (talk|speak|discuss) about/i,
      /change (the subject|topic)/i,
      /switch to/i,
      /moving on to/i,
      /regarding/i,
      /with respect to/i,
      /as for/i,
      /how about/i
    ];
    
    const arabicPatterns = [
      /دعنا نتحدث عن/i,
      /انتقل إلى/i,
      /بخصوص/i,
      /فيما يتعلق ب/i,
      /بالنسبة ل/i,
      /ماذا عن/i
    ];
    
    // Check English patterns
    for (const pattern of englishPatterns) {
      if (pattern.test(message)) {
        return true;
      }
    }
    
    // Check Arabic patterns
    for (const pattern of arabicPatterns) {
      if (pattern.test(message)) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Performs a topic switch while preserving relevant context
   * @param conversationId - The unique conversation identifier
   * @param newTopic - The new topic to switch to
   * @param message - The user's message that triggered the switch
   * @returns The updated conversation context
   */
  private switchToTopic(
    conversationId: string,
    newTopic: string,
    message: string
  ): ConversationContext {
    const context = this.getContextForSession(conversationId);
    const oldTopic = context.currentTopic;
    
    // Find attributes that should carry over between topics
    const relevantAttributes = this.identifyRelevantAttributes(oldTopic, newTopic, context);
    
    // Update the context with the new topic
    context.currentTopic = newTopic;
    context.contextConfidence = 0.8; // Reset confidence high for the new topic
    
    // Add to topic transitions history
    if (oldTopic && oldTopic !== newTopic) {
      if (!context.topicTransitions) {
        context.topicTransitions = [];
      }
      
      context.topicTransitions.push({
        from: oldTopic,
        to: newTopic,
        timestamp: Date.now(),
        attributeCarryOver: Array.from(relevantAttributes)
      });
      
      // Setup attribute carryover
      context.attributeCarryover = {
        active: true,
        previousSubject: context.currentSubject,
        newSubject: context.currentSubject || '',
        attributes: Array.from(relevantAttributes),
        timestamp: Date.now(),
        originalMessage: message
      };
    }
    
    // Update active topics
    if (!context.activeTopics) {
      context.activeTopics = [];
    }
    
    // Update or add the new topic to active topics
    const existingTopicIndex = context.activeTopics.findIndex((t: TopicState) => t.name === newTopic);
    if (existingTopicIndex >= 0) {
      context.activeTopics[existingTopicIndex].lastDiscussed = Date.now();
    } else {
      context.activeTopics.push({
        name: newTopic,
        lastDiscussed: Date.now(),
        attributes: new Set<string>(),
        relatedQueries: [message]
      });
    }
    
    // Save the updated context
    this.contexts.set(conversationId, context);
    
    return context;
  }
  
  /**
   * Identifies attributes that should carry over between topics
   * @param oldTopic - The previous topic
   * @param newTopic - The new topic
   * @param context - The current conversation context
   * @returns A set of attributes to carry over
   */
  private identifyRelevantAttributes(
    oldTopic: string | null,
    newTopic: string,
    context: ConversationContext
  ): Set<string> {
    // If no previous topic, there are no attributes to carry over
    if (!oldTopic) {
      return new Set<string>();
    }
    
    const relevantAttributes = new Set<string>();
    
    // Find the old topic in active topics
    const oldTopicState = context.activeTopics?.find(t => t.name === oldTopic);
    if (!oldTopicState) {
      return new Set<string>();
    }
    
    // Universal attributes that should always carry over (if present)
    const universalAttributes = [
      'university', 'student_id', 'program', 'year', 'semester',
      'جامعة', 'معرف_الطالب', 'برنامج', 'سنة', 'فصل_دراسي'
    ];
    
    // Add universal attributes that exist in the old topic
    universalAttributes.forEach(attr => {
      if (oldTopicState.attributes.has(attr)) {
        relevantAttributes.add(attr);
      }
    });
    
    // Topic-specific attribute carryover rules
    const topicRelationships: Record<string, Record<string, string[]>> = {
      'admission': {
        'academic': ['program', 'major', 'requirements'],
        'financial': ['fees', 'payment_schedule'],
      },
      'academic': {
        'admission': ['program', 'major', 'student_id'],
        'financial': ['scholarships', 'academic_standing'],
      },
      'financial': {
        'admission': ['fees', 'payment_method'],
        'academic': ['scholarships', 'program'],
      }
    };
    
    // Add topic-specific attribute carryover if relationship exists
    if (topicRelationships[oldTopic] && topicRelationships[oldTopic][newTopic]) {
      const attributesToCarry = topicRelationships[oldTopic][newTopic];
      attributesToCarry.forEach(attr => {
        if (oldTopicState.attributes.has(attr)) {
          relevantAttributes.add(attr);
        }
      });
    }
    
    return relevantAttributes;
  }

  /**
   * Gets or creates a context for a conversation session
   * @param conversationId - The unique conversation identifier
   * @returns The conversation context
   */
  public getContextForSession(conversationId: string): ConversationContext {
    if (!this.contexts.has(conversationId)) {
      // Initialize a new context
      const newContext: ConversationContext = {
        currentTopic: null,
        currentSubject: null,
        lastNumbers: new Map<string, number>(),
        lastEntities: new Set<string>(),
        followUpCount: 0,
        metadata: new Map<string, any>(),
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
          subject: undefined,
          topic: undefined,
          entities: [],
          temporalContext: {
            recentTopics: [],
            recentEntities: [],
            topicTransitions: []
          }
        },
        activeTopics: [],
        topicTransitions: [],
        lastDiscussedAttributes: new Set<string>()
      };
      this.contexts.set(conversationId, newContext);
    }
    
    return this.contexts.get(conversationId)!;
  }
}

export const enhancedContextService = new EnhancedContextService(); 