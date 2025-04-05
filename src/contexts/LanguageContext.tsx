import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'ar' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  translations: typeof arabicTranslations;
}

// Translations
export const arabicTranslations = {
  welcome: {
    title: "المساعد الذكي للجامعة",
    subtitle: "دليلك الذكي في الجامعة العربية الأمريكية في فلسطين",
    beta: "نسخة تجريبية",
    message: "كيف يمكنني مساعدتك اليوم؟",
    description: "لا تتردد في سؤالي عن أي شيء "
  },
  input: {
    placeholder: "اسألني اي شيء عن الجامعة",
    placeholderChat: "اكتب رسالتك...",
    send: "إرسال",
    typoCorrection: {
      didYouMean: "هل تقصد:",
      dismiss: "إغلاق"
    }
  },
  suggestions: {
    admission: "ما هي متطلبات القبول في الجامعة؟",
    majors: "أخبرني عن التخصصات المتاحة",
    contact: "كيف يمكنني التواصل مع خدمات الطلاب؟",
    fees: "ما هي الرسوم الدراسية؟",
    campus: "أخبرني عن مرافق الحرم الجامعي",
    scholarships: "كيف يمكنني التقدم للمنح الدراسية؟",
  },
  loading: {
    thinking: "المساعد الذكي يفكر",
    processing: "يتم تحليل سؤالك",
  },
  navigation: {
    howToUse: "كيفية الاستخدام",
    backToChat: "العودة إلى المحادثة"
  },
  chatHistory: {
    title: "سجل المحادثات",
    noChats: "لا توجد محادثات محفوظة",
    delete: "حذف",
    confirmDelete: "تأكيد الحذف"
  },
  newChat: {
    button: "محادثة جديدة",
    message: "إنشاء محادثة جديدة لتجربة أفضل"
  }
};

export const englishTranslations = {
  welcome: {
    title: "AAUP AI Assistant",
    subtitle: "Your Smart Guide to the University ",
    beta: "Beta Version",
    message: "How can I assist you today?",
    description: "Feel free to ask me anything about the University"
  },
  input: {
    placeholder: "Ask me anything about AAUP...",
    placeholderChat: "Type your message...",
    send: "Send",
    typoCorrection: {
      didYouMean: "Did you mean:",
      dismiss: "Dismiss"
    }
  },
  suggestions: {
    admission: "What are AAUP's admission requirements?",
    majors: "Tell me about available majors",
    contact: "How can I contact student services?",
    fees: "What are the tuition fees?",
    campus: "Tell me about campus facilities",
    scholarships: "How do I apply for scholarships?",
  },
  loading: {
    thinking: "AI Assistant is thinking",
    processing: "Processing your request",
  },
  navigation: {
    howToUse: "How to Use",
    backToChat: "Back to Chat"
  },
  chatHistory: {
    title: "Chat History",
    noChats: "No saved chats",
    delete: "Delete",
    confirmDelete: "Confirm Delete"
  },
  newChat: {
    button: "New Chat",
    message: "Create a new chat for a better experience"
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('ar');
  const [translations, setTranslations] = useState(arabicTranslations);

  useEffect(() => {
    // Update translations when language changes
    setTranslations(language === 'ar' ? arabicTranslations : englishTranslations);
    // Update document direction
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    // Store language preference
    localStorage.setItem('preferred-language', language);
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, translations }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}; 