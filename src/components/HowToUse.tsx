import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Link } from 'react-router-dom';

// Register the ScrollTrigger plugin
gsap.registerPlugin(ScrollTrigger);

// Add CSS for AI message styling and animations
const aiMessageStyles = `
  .ai-message {
    background: linear-gradient(to bottom right, rgba(255, 255, 255, 0.9), rgba(248, 250, 252, 0.8));
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03), 0 0 0 1px rgba(255, 255, 255, 0.2) inset;
    border: 1px solid rgba(226, 232, 240, 0.7);
    border-radius: 1rem;
    position: relative;
    overflow: hidden;
    will-change: transform, opacity;
  }

  .ai-message::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(to right, transparent, rgba(255, 255, 255, 0.8), transparent);
  }

  .ai-message::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(to right, transparent, rgba(0, 0, 0, 0.05), transparent);
  }

  @keyframes float {
    0%, 100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-5px);
    }
  }

  @keyframes shimmer {
    0% {
      background-position: -200% 0;
    }
    100% {
      background-position: 200% 0;
    }
  }
  
  @keyframes gradient-x {
    0% {
      background-position: 0% 50%;
    }
    50% {
      background-position: 100% 50%;
    }
    100% {
      background-position: 0% 50%;
    }
  }
  
  .animate-gradient-x {
    animation: gradient-x 3s ease infinite;
    background-size: 200% 200%;
    will-change: background-position;
  }
  
  /* Performance optimizations */
  .gpu-accelerated {
    transform: translateZ(0);
    backface-visibility: hidden;
    perspective: 1000px;
  }
`;

// Translations for the How to Use page
const howToUseTranslations = {
  en: {
    title: "How to Use AAUP AI ",
    subtitle: "Get the most out of your AI assistant with these tips",
    backToChat: "Back",
    chatPreview: {
      user: "User",
      assistant: "AI Assistant",
      typing: "typing...",
      placeholder: "Hover over a card to see an example"
    },
    sections: [
      {
        title: "Getting Started",
        content: "The AAUP AI Assistant is designed to help you navigate university life. Simply type your questions in the chat box and get instant answers about courses, admissions, campus facilities, and more.",
        icon: "🚀",
        exampleQuery: "How do I register for classes?",
        exampleResponse: "To register for classes, log in to the student portal, navigate to 'Course Registration', select your desired courses, and click 'Submit'. If you need help with specific courses, I can guide you through the prerequisites and availability."
      },
      {
        title: "Asking Questions",
        content: "You can ask questions in English or Arabic. Be specific for better results. For example, ask detailed questions about admission requirements, course information, or university services.",
        icon: "❓",
        exampleQuery: "my high school average is 87% but I got in physics 70% can I apply for medicine major?",
        exampleResponse: "Eligibility for Medicine Major\n\nYour application status:\n\n• High school average: 87% ✓ (meets the 85% requirement)\n\n• Physics score: 70% ✗ (below the 80% requirement)\n\nUnfortunately, you don't meet the eligibility criteria for the Medicine major at Arab American University due to your physics score being below the required 80%.\n\nFor more information, visit the university website."
      },
      {
        title: "Using Suggestions",
        content: "Not sure what to ask? Click on one of the suggestion buttons below the chat input to get started with common questions.",
        icon: "💡",
        exampleQuery: "I'm not sure what to ask",
        exampleResponse: "Here are some suggestions you might find helpful:\n- Campus facilities and locations\n- Admission requirements\n- Available scholarships\n- Course schedules\nJust click on any suggestion to get started!"
      },
      {
        title: "Switching Languages",
        content: "You can switch between English and Arabic at any time using the language switcher button at the bottom right of the screen.",
        icon: "🌐",
        exampleQuery: "Can I use Arabic instead?",
        exampleResponse: "بالتأكيد! يمكنك استخدام اللغة العربية في أي وقت. ما عليك سوى النقر على زر تبديل اللغة في الزاوية السفلية اليمنى من الشاشة للتبديل بين اللغتين الإنجليزية والعربية."
      },
      {
        title: "Starting a New Chat",
        content: "Want to start fresh? Click the 'New Chat' button to begin a new conversation while preserving your chat history.",
        icon: "🔄",
        exampleQuery: "How do I start a new conversation?",
        exampleResponse: "To start a new conversation, simply click the 'New Chat' button at the top of the interface. This will begin a fresh conversation while saving your previous chats for future reference. You can always access your chat history from the sidebar."
      },
      {
        title: "Advanced Features",
        content: "The assistant can understand context from previous messages, so you can ask follow-up questions without repeating all the details.",
        icon: "⚙️",
        exampleQuery: "what are the credit hour fees for computer science major? and what is its minimum highschool average?",
        exampleResponse: "Credit Hour Fees for Computer Science Major\n\nThe credit hour fees for the Computer Science major are:\n\n• Ramallah Campus: 235 NIS per credit hour\n• Jenin Campus: 235 NIS per credit hour\n\nFor more detailed information, you can visit the Arab American University website.\n\nComputer Science Major's Minimum High School Average\n\nThe minimum high school average for the Computer Science major is:\n\n• 65% for students applying with a Palestinian high school certificate\n\nIf you need further assistance, feel free to ask."
      }
    ]
  },
  ar: {
    title: "كيفية استخدام مساعد الذكاء الاصطناعي",
    subtitle: "احصل على أقصى استفادة من مساعدك الذكي باستخدام هذه النصائح",
    backToChat: "رجوع",
    chatPreview: {
      user: "المستخدم",
      assistant: "المساعد الذكي",
      typing: "يكتب...",
      placeholder: "حرك المؤشر فوق البطاقة لرؤية مثال"
    },
    sections: [
      {
        title: "البدء",
        content: "تم تصميم مساعد الذكاء الاصطناعي للجامعة العربية الأمريكية لمساعدتك في التنقل في الحياة الجامعية. ما عليك سوى كتابة أسئلتك في مربع الدردشة والحصول على إجابات فورية حول المساقات والقبول ومرافق الحرم الجامعي والمزيد.",
        icon: "🚀",
        exampleQuery: "كيف يمكنني التسجيل في المساقات؟",
        exampleResponse: "للتسجيل في المساقات، قم بتسجيل الدخول إلى بوابة الطالب، وانتقل إلى 'تسجيل المساقات'، واختر المساقات التي ترغب بها، ثم انقر على 'إرسال'. إذا كنت بحاجة إلى مساعدة في مساقات محددة، يمكنني إرشادك خلال المتطلبات الأساسية والتوفر."
      },
      {
        title: "طرح الأسئلة",
        content: "يمكنك طرح الأسئلة باللغة الإنجليزية أو العربية. كن محددًا للحصول على نتائج أفضل. على سبيل المثال، اسأل أسئلة مفصلة عن متطلبات القبول أو معلومات المساقات أو خدمات الجامعة.",
        icon: "❓",
        exampleQuery: "معدلي في الثانوية العامة 87% لكن حصلت في الفيزياء على 70%، هل يمكنني التقديم لتخصص الطب؟",
        exampleResponse: "أهلية القبول في تخصص الطب\n\nحالة طلبك:\n\n• معدل الثانوية العامة: 87% ✓ (يلبي متطلب 85%)\n\n• درجة الفيزياء: 70% ✗ (أقل من متطلب 80%)\n\nللأسف، أنت لا تستوفي معايير الأهلية لتخصص الطب في الجامعة العربية الأمريكية بسبب درجة الفيزياء التي تقل عن 80% المطلوبة.\n\nللمزيد من المعلومات، يمكنك زيارة موقع الجامعة."
      },
      {
        title: "استخدام الاقتراحات",
        content: "غير متأكد مما تسأل عنه؟ انقر على أحد أزرار الاقتراحات أسفل مدخل الدردشة للبدء بالأسئلة الشائعة.",
        icon: "💡",
        exampleQuery: "لست متأكدًا مما أسأل عنه",
        exampleResponse: "إليك بعض الاقتراحات التي قد تجدها مفيدة:\n- مرافق الحرم الجامعي ومواقعها\n- متطلبات القبول\n- المنح الدراسية المتاحة\n- جداول المساقات\nما عليك سوى النقر على أي اقتراح للبدء!"
      },
      {
        title: "تبديل اللغات",
        content: "يمكنك التبديل بين اللغتين الإنجليزية والعربية في أي وقت باستخدام زر تبديل اللغة في أسفل يمين الشاشة.",
        icon: "🌐",
        exampleQuery: "هل يمكنني استخدام اللغة الإنجليزية بدلاً من ذلك؟",
        exampleResponse: "Certainly! You can use English at any time. Simply click the language switch button in the bottom right corner of the screen to toggle between Arabic and English languages."
      },
      {
        title: "بدء محادثة جديدة",
        content: "هل تريد البدء من جديد؟ انقر على زر 'محادثة جديدة' لبدء محادثة جديدة مع الحفاظ على سجل الدردشة السابق.",
        icon: "🔄",
        exampleQuery: "كيف يمكنني بدء محادثة جديدة؟",
        exampleResponse: "لبدء محادثة جديدة، ما عليك سوى النقر على زر 'محادثة جديدة' في أعلى الواجهة. سيبدأ هذا محادثة جديدة مع حفظ محادثاتك السابقة للرجوع إليها في المستقبل. يمكنك دائمًا الوصول إلى سجل الدردشة الخاص بك من الشريط الجانبي."
      },
      {
        title: "ميزات متقدمة",
        content: "يمكن للمساعد فهم السياق من الرسائل السابقة، لذا يمكنك طرح أسئلة متابعة دون تكرار جميع التفاصيل.",
        icon: "⚙️",
        exampleQuery: "ما هي رسوم الساعة المعتمدة لتخصص علوم الحاسوب؟ وما هو الحد الأدنى لمعدل الثانوية العامة؟",
        exampleResponse: "رسوم الساعة المعتمدة لتخصص علوم الحاسوب\n\nرسوم الساعة المعتمدة لتخصص علوم الحاسوب هي:\n\n• حرم رام الله: 235 شيكل للساعة المعتمدة\n• حرم جنين: 235 شيكل للساعة المعتمدة\n\nلمزيد من المعلومات التفصيلية، يمكنك زيارة موقع الجامعة العربية الأمريكية.\n\nالحد الأدنى لمعدل الثانوية العامة لتخصص علوم الحاسوب\n\nالحد الأدنى لمعدل الثانوية العامة لتخصص علوم الحاسوب هو:\n\n• 65% للطلاب المتقدمين بشهادة الثانوية العامة الفلسطينية\n\nإذا كنت بحاجة إلى مساعدة إضافية، لا تتردد في السؤال."
      }
    ]
  }
};

// Define section type for TypeScript
interface Section {
  title: string;
  content: string;
  icon: string;
  exampleQuery: string;
  exampleResponse: string;
}

// Define chat preview type
interface ChatPreview {
  user: string;
  assistant: string;
  typing: string;
  placeholder: string;
}

// Define translations type
interface HowToUseTranslation {
  title: string;
  subtitle: string;
  backToChat: string;
  chatPreview: ChatPreview;
  sections: Section[];
}

const HowToUse: React.FC = () => {
  const { language, translations } = useLanguage();
  const localTranslations: HowToUseTranslation = language === 'ar' ? howToUseTranslations.ar : howToUseTranslations.en;
  const [activeSection, setActiveSection] = useState<number | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [displayedResponse, setDisplayedResponse] = useState('');
  const [fullResponse, setFullResponse] = useState('');
  // Additional state for Advanced Features card
  const [isTypingSecond, setIsTypingSecond] = useState(false);
  const [displayedContextResponse, setDisplayedContextResponse] = useState('');
  const [showFollowupQuestion, setShowFollowupQuestion] = useState(false);
  // Add isMobile state detection
  const [isMobile, setIsMobile] = useState(false);
  
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initialDelayRef = useRef<NodeJS.Timeout | null>(null);
  const contextTypingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const contextInitialDelayRef = useRef<NodeJS.Timeout | null>(null);
  
  // Simple translation helper function for UI text
  const t = (key: string) => {
    if (key === 'clickToSeeExample') {
      return language === 'ar' ? 'انقر للمثال' : 'Click for example';
    }
    if (key === 'clickToSeeMoreExample') {
      return language === 'ar' ? 'انقر لمشاهدة المثال التفاعلي' : 'Click to see interactive example';
    }
    return key;
  };
  
  // Mobile detection on component mount
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Initial check
    checkMobile();
    
    // Add listener for window resize
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);
  
  // Set document title when component mounts
  useEffect(() => {
    document.title = localTranslations.title;
    return () => {
      document.title = language === 'ar' ? 'مساعد الذكاء الاصطناعي للجامعة' : 'AAUP AI Assistant';
    };
  }, [language, localTranslations.title]);

  // Handle typewriter effect for chat responses
  useEffect(() => {
    // Clear any existing timeouts
    const clearAllTimeouts = () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      if (initialDelayRef.current) {
        clearTimeout(initialDelayRef.current);
        initialDelayRef.current = null;
      }
      if (contextTypingTimeoutRef.current) {
        clearTimeout(contextTypingTimeoutRef.current);
        contextTypingTimeoutRef.current = null;
      }
      if (contextInitialDelayRef.current) {
        clearTimeout(contextInitialDelayRef.current);
        contextInitialDelayRef.current = null;
      }
    };

    clearAllTimeouts();
    
    // Reset state when section changes
    setDisplayedResponse('');
    setDisplayedContextResponse('');
    setIsTyping(false);
    setIsTypingSecond(false);
    setShowFollowupQuestion(false);
    
    if (activeSection !== null) {
      // On mobile, display the whole response with minimal animation
      if (isMobile) {
        if (activeSection === 5) {
          // First message - just show it quickly
          const firstResponse = language === 'ar' 
            ? "رسوم الساعة المعتمدة لتخصص علوم الحاسوب\n\nرسوم الساعة المعتمدة لتخصص علوم الحاسوب هي:\n\n• حرم رام الله: 235 شيكل للساعة المعتمدة\n• حرم جنين: 235 شيكل للساعة المعتمدة\n\nلمزيد من المعلومات التفصيلية، يمكنك زيارة موقع الجامعة العربية الأمريكية.\n\nإذا كنت بحاجة إلى مساعدة إضافية، لا تتردد في السؤال."
            : "Credit Hour Fees for Computer Science Major\n\nThe credit hour fees for the Computer Science major are:\n\n• Ramallah Campus: 235 NIS per credit hour\n• Jenin Campus: 235 NIS per credit hour\n\nFor more detailed information, you can visit the Arab American University website.\n\nIf you need further assistance, feel free to ask.";

          setIsTyping(true);
          
          // Simulate typing with just three steps for mobile
          setTimeout(() => {
            setDisplayedResponse(firstResponse.substring(0, Math.floor(firstResponse.length / 3)));
            setTimeout(() => {
              setDisplayedResponse(firstResponse.substring(0, Math.floor(firstResponse.length * 2 / 3)));
              setTimeout(() => {
                setDisplayedResponse(firstResponse);
                setIsTyping(false);
                
                // Show follow-up question
                setTimeout(() => {
                  setShowFollowupQuestion(true);
                  
                  // Second message - process quickly
                  setTimeout(() => {
                    const secondResponse = language === 'ar' 
                      ? "الحد الأدنى لمعدل الثانوية العامة لتخصص علوم الحاسوب\n\nالحد الأدنى لمعدل الثانوية العامة لتخصص علوم الحاسوب هو:\n\n• 65% للطلاب المتقدمين بشهادة الثانوية العامة الفلسطينية\n\nإذا كنت بحاجة إلى مساعدة إضافية، لا تتردد في السؤال."
                      : "Computer Science Major's Minimum High School Average\n\nThe minimum high school average for the Computer Science major is:\n\n• 65% for students applying with a Palestinian high school certificate\n\nIf you need further assistance, feel free to ask.";
                    
                    setIsTypingSecond(true);
                    
                    // Simulate quick typing with just two steps for mobile
                    setTimeout(() => {
                      setDisplayedContextResponse(secondResponse.substring(0, Math.floor(secondResponse.length / 2)));
                      setTimeout(() => {
                        setDisplayedContextResponse(secondResponse);
                        setIsTypingSecond(false);
                      }, 200);
                    }, 100);
                  }, 300);
                }, 300);
              }, 150);
            }, 150);
          }, 100);
        } else {
          // For other cards, simulate minimal typing animation on mobile
          const response = localTranslations.sections[activeSection].exampleResponse;
          
          setIsTyping(true);
          
          // Just use 2 steps for mobile animation
          setTimeout(() => {
            setDisplayedResponse(response.substring(0, Math.floor(response.length / 2)));
            setTimeout(() => {
              setDisplayedResponse(response);
              setIsTyping(false);
            }, 200);
          }, 100);
        }
      } else {
        // For desktop: Use the existing animation with original pacing
        // For Advanced Features (context-aware) card
        if (activeSection === 5) {
          // First message animation
          const firstResponse = language === 'ar' 
            ? "رسوم الساعة المعتمدة لتخصص علوم الحاسوب\n\nرسوم الساعة المعتمدة لتخصص علوم الحاسوب هي:\n\n• حرم رام الله: 235 شيكل للساعة المعتمدة\n• حرم جنين: 235 شيكل للساعة المعتمدة\n\nلمزيد من المعلومات التفصيلية، يمكنك زيارة موقع الجامعة العربية الأمريكية.\n\nإذا كنت بحاجة إلى مساعدة إضافية، لا تتردد في السؤال."
            : "Credit Hour Fees for Computer Science Major\n\nThe credit hour fees for the Computer Science major are:\n\n• Ramallah Campus: 235 NIS per credit hour\n• Jenin Campus: 235 NIS per credit hour\n\nFor more detailed information, you can visit the Arab American University website.\n\nIf you need further assistance, feel free to ask.";
            
          setIsTyping(true);
          
          // Optimized implementation for first message
          // Use a single function with a chunk size to reduce DOM updates
          let i = 0;
          const chunkSize = 5; // Increased chunk size for better performance
          
          const typeText = () => {
            if (i < firstResponse.length) {
              const end = Math.min(i + chunkSize, firstResponse.length);
              setDisplayedResponse(firstResponse.substring(0, end));
              i = end;
              
              // Adaptive timing based on content type
              const nextChunk = firstResponse.substring(i, Math.min(i + chunkSize, firstResponse.length));
              const hasNewline = nextChunk.includes('\n');
              const hasPunctuation = /[.,!?;:]/.test(nextChunk);
              
              // Slow down for newlines and punctuation, speed up for regular text
              const delay = hasNewline ? 30 : (hasPunctuation ? 20 : 5);
              
              typingTimeoutRef.current = setTimeout(typeText, delay);
            } else {
              setIsTyping(false);
              // Show follow-up question after first response is complete
              setTimeout(() => {
                setShowFollowupQuestion(true);
                
                // Start second message animation after a delay
                setTimeout(() => {
                  const secondResponse = language === 'ar' 
                    ? "الحد الأدنى لمعدل الثانوية العامة لتخصص علوم الحاسوب\n\nالحد الأدنى لمعدل الثانوية العامة لتخصص علوم الحاسوب هو:\n\n• 65% للطلاب المتقدمين بشهادة الثانوية العامة الفلسطينية\n\nإذا كنت بحاجة إلى مساعدة إضافية، لا تتردد في السؤال."
                    : "Computer Science Major's Minimum High School Average\n\nThe minimum high school average for the Computer Science major is:\n\n• 65% for students applying with a Palestinian high school certificate\n\nIf you need further assistance, feel free to ask.";
                  
                  setIsTypingSecond(true);
                  
                  // Type second message with optimized chunking
                  let j = 0;
                  const typeContextText = () => {
                    if (j < secondResponse.length) {
                      const end = Math.min(j + chunkSize, secondResponse.length);
                      setDisplayedContextResponse(secondResponse.substring(0, end));
                      j = end;
                      
                      // Adaptive timing for second message
                      const nextChunk = secondResponse.substring(j, Math.min(j + chunkSize, secondResponse.length));
                      const hasNewline = nextChunk.includes('\n');
                      const hasPunctuation = /[.,!?;:]/.test(nextChunk);
                      
                      // Slow down for newlines and punctuation, speed up for regular text
                      const delay = hasNewline ? 30 : (hasPunctuation ? 20 : 5);
                      
                      contextTypingTimeoutRef.current = setTimeout(typeContextText, delay);
                    } else {
                      setIsTypingSecond(false);
                    }
                  };
                  
                  contextTypingTimeoutRef.current = setTimeout(typeContextText, 10);
                }, 800);
              }, 1000);
            }
          };
          
          // Start typing after a short delay
          initialDelayRef.current = setTimeout(typeText, 300);
        } else {
          // For all other cards, use the optimized implementation
          const response = localTranslations.sections[activeSection].exampleResponse;
          
          setIsTyping(true);
          
          // Optimized implementation with chunking
          let i = 0;
          const chunkSize = 5; // Increased chunk size for better performance
          
          const typeText = () => {
            if (i < response.length) {
              const end = Math.min(i + chunkSize, response.length);
              setDisplayedResponse(response.substring(0, end));
              i = end;
              
              // Adaptive timing based on content type
              const nextChunk = response.substring(i, Math.min(i + chunkSize, response.length));
              const hasNewline = nextChunk.includes('\n');
              const hasPunctuation = /[.,!?;:]/.test(nextChunk);
              
              // Slow down for newlines and punctuation, speed up for regular text
              const delay = hasNewline ? 30 : (hasPunctuation ? 20 : 5);
              
              typingTimeoutRef.current = setTimeout(typeText, delay);
            } else {
              setIsTyping(false);
            }
          };
          
          // Start typing after a short delay
          initialDelayRef.current = setTimeout(typeText, 300);
        }
      }
    }
    
    // Cleanup function
    return clearAllTimeouts;
  }, [activeSection, language, localTranslations, isMobile]);

  // Initialize GSAP animations
  useEffect(() => {
    // Skip or simplify animations on mobile
    if (isMobile) {
      // Use simpler animations on mobile
      const sections = sectionRefs.current;
      sections.forEach((section, index) => {
        if (section) {
          gsap.fromTo(
            section,
            { 
              y: 20, // Reduced movement on mobile
              opacity: 0 
            },
            { 
              y: 0, 
              opacity: 1, 
              duration: 0.4, // Faster animations on mobile
              ease: "power2.out", // Simpler easing function
              scrollTrigger: {
                trigger: section,
                start: "top bottom-=50", // Smaller offset
                toggleActions: "play none none none"
              }
            }
          );
        }
      });
    } else {
      // Full animations on desktop
      const sections = sectionRefs.current;
      sections.forEach((section, index) => {
        if (section) {
          gsap.fromTo(
            section,
            { 
              y: 50, 
              opacity: 0 
            },
            { 
              y: 0, 
              opacity: 1, 
              duration: 0.8, 
              ease: "power3.out",
              scrollTrigger: {
                trigger: section,
                start: "top bottom-=100",
                toggleActions: "play none none none"
              }
            }
          );
        }
      });
    }
  }, [isMobile]);

  // Animation variants based on mobile state
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: isMobile ? 0.05 : 0.1, // Faster staggered animations on mobile
        delayChildren: isMobile ? 0.1 : 0.3 // Reduced delay on mobile
      }
    }
  };

  const itemVariants = {
    hidden: { y: isMobile ? 10 : 20, opacity: 0 }, // Reduced movement on mobile
    visible: {
      y: 0,
      opacity: 1,
      transition: { 
        duration: isMobile ? 0.3 : 0.5, // Faster animations on mobile
        ease: [0.4, 0, 0.2, 1] 
      }
    }
  };

  const chatPreviewVariants = React.useMemo(() => ({
    hidden: { 
      opacity: 0, 
      y: isMobile ? 10 : 20, // Reduced movement on mobile
      scale: isMobile ? 0.9 : 0.8, // Reduced scale effect on mobile
      rotateX: isMobile ? 5 : 10 // Reduced 3D effect on mobile
    },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      rotateX: 0,
      transition: { 
        duration: isMobile ? 0.4 : 0.7, // Faster animations on mobile
        ease: [0.16, 1, 0.3, 1],
        scale: { 
          duration: isMobile ? 0.4 : 0.7, // Faster animations on mobile
          ease: [0.34, 1.56, 0.64, 1] 
        }
      }
    },
    exit: { 
      opacity: 0, 
      scale: 0.9,
      y: isMobile ? -10 : -20, // Reduced movement on mobile
      rotateX: isMobile ? -5 : -10, // Reduced 3D effect on mobile
      transition: { 
        duration: isMobile ? 0.3 : 0.5, // Faster animations on mobile
        ease: [0.4, 0, 0.2, 1] 
      }
    }
  }), [isMobile]);

  const overlayVariants = React.useMemo(() => ({
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { duration: isMobile ? 0.2 : 0.3 } // Faster animations on mobile
    },
    exit: { 
      opacity: 0,
      transition: { 
        duration: isMobile ? 0.2 : 0.3, // Faster animations on mobile
        delay: isMobile ? 0 : 0.1 // No delay on mobile
      }
    }
  }), [isMobile]);

  const particleVariants = React.useMemo(() => ({
    hidden: { opacity: 0, scale: 0.8 },
    visible: { 
      opacity: isMobile ? 0.7 : 1, // Reduced opacity on mobile
      scale: 1,
      transition: { 
        duration: isMobile ? 0.3 : 0.5, // Faster animations on mobile
        delay: isMobile ? 0.1 : 0.2 // Reduced delay on mobile
      }
    },
    exit: { 
      opacity: 0,
      scale: 0.8,
      transition: { duration: isMobile ? 0.2 : 0.3 } // Faster animations on mobile
    }
  }), [isMobile]);

  // Handle card click to show example chat
  const handleCardClick = useCallback((index: number) => {
    setActiveSection(index);
  }, []);
  
  // Handle modal click to prevent closing
  const handleModalClick = useCallback((e: React.MouseEvent) => {
    // Prevent clicks inside the modal from closing it
    e.stopPropagation();
  }, []);
  
  // Close the modal
  const closeModal = useCallback(() => {
    setActiveSection(null);
  }, []);

  const handleBackToChat = () => {
    window.history.back();
  };

  // Function to get animated SVG icons based on emoji
  const getAnimatedIcon = (emoji: string, index: number) => {
    // Map of emojis to animated SVG icons
    switch (emoji) {
      case '🚀':
        return (
          <motion.svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <motion.path 
              d="M4.5 16.5L3 22.5L9 21L15 15L9 9L3 15L4.5 16.5Z" 
              fill="#f43f5e"
              animate={{ 
                fillOpacity: [0.7, 1, 0.7],
              }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <motion.path 
              d="M15 15L21 21L22.5 9L9 22.5L15 15Z" 
              fill="#fb7185"
              animate={{ 
                fillOpacity: [0.8, 1, 0.8],
              }}
              transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
            />
            <motion.path 
              d="M15 9L9 3L22.5 4.5L9 9Z" 
              fill="#fda4af"
              animate={{ 
                fillOpacity: [0.9, 1, 0.9],
              }}
              transition={{ duration: 2, repeat: Infinity, delay: 0.6 }}
            />
            <motion.path 
              d="M9 9L3 3L1.5 15L9 9Z" 
              fill="#fecdd3"
              animate={{ 
                fillOpacity: [0.7, 1, 0.7],
              }}
              transition={{ duration: 2, repeat: Infinity, delay: 0.9 }}
            />
          </motion.svg>
        );
      case '❓':
        return (
          <motion.svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <motion.circle 
              cx="12" 
              cy="12" 
              r="10" 
              stroke="#f43f5e" 
              strokeWidth="2"
              animate={{ 
                scale: [1, 1.05, 1],
                strokeWidth: [2, 2.5, 2]
              }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <motion.path 
              d="M12 17H12.01" 
              stroke="#f43f5e" 
              strokeWidth="2" 
              strokeLinecap="round"
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.8, 1, 0.8]
              }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
            />
            <motion.path 
              d="M9.09 9.00002C9.3251 8.33169 9.78915 7.76813 10.4 7.40914C11.0108 7.05016 11.7289 6.91894 12.4272 7.03872C13.1255 7.15851 13.7588 7.52154 14.2151 8.06353C14.6713 8.60553 14.9211 9.29152 14.92 10C14.92 12 11.92 13 11.92 13" 
              stroke="#f43f5e" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              animate={{ 
                pathLength: [0, 1, 0],
                opacity: [0.7, 1, 0.7]
              }}
              transition={{ duration: 3, repeat: Infinity }}
            />
          </motion.svg>
        );
      case '💡':
        return (
          <motion.svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <motion.path 
              d="M9 21H15" 
              stroke="#f43f5e" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              animate={{ 
                scale: [1, 1.1, 1],
                opacity: [0.7, 1, 0.7]
              }}
              transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
            />
            <motion.path 
              d="M10 17H14" 
              stroke="#f43f5e" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              animate={{ 
                scale: [1, 1.1, 1],
                opacity: [0.7, 1, 0.7]
              }}
              transition={{ duration: 2, repeat: Infinity, delay: 0.7 }}
            />
            <motion.path 
              d="M12 3C8.68629 3 6 5.68629 6 9C6 11.2208 7.21497 13.1599 9 14.1973V17H15V14.1973C16.785 13.1599 18 11.2208 18 9C18 5.68629 15.3137 3 12 3Z" 
              fill="#fda4af"
              animate={{ 
                fill: ['#fda4af', '#fb7185', '#fda4af'],
                scale: [1, 1.05, 1]
              }}
              transition={{ duration: 3, repeat: Infinity }}
            />
            <motion.circle 
              cx="12" 
              cy="9" 
              r="2" 
              fill="#fff"
              animate={{ 
                opacity: [0.5, 1, 0.5],
                scale: [0.8, 1, 0.8]
              }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </motion.svg>
        );
      case '🌐':
        return (
          <motion.svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <motion.circle 
              cx="12" 
              cy="12" 
              r="10" 
              stroke="#f43f5e" 
              strokeWidth="2"
              animate={{ rotate: 360 }}
              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            />
            <motion.path 
              d="M2 12H22" 
              stroke="#f43f5e" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 3, repeat: Infinity }}
            />
            <motion.path 
              d="M12 2C14.5013 4.73835 15.9228 8.29203 16 12C15.9228 15.708 14.5013 19.2616 12 22C9.49872 19.2616 8.07725 15.708 8 12C8.07725 8.29203 9.49872 4.73835 12 2Z" 
              stroke="#f43f5e" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 3, repeat: Infinity, delay: 1.5 }}
            />
          </motion.svg>
        );
      case '🔄':
        return (
          <motion.svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <motion.path 
              d="M20 4V8H16" 
              stroke="#f43f5e" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.path 
              d="M4 20V16H8" 
              stroke="#f43f5e" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
            />
            <motion.path 
              d="M4.93 4.93L9.17 9.17" 
              stroke="#f43f5e" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              animate={{ pathLength: [0, 1, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
            />
            <motion.path 
              d="M14.83 14.83L19.07 19.07" 
              stroke="#f43f5e" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              animate={{ pathLength: [0, 1, 0] }}
              transition={{ duration: 3, repeat: Infinity, delay: 1.5 }}
            />
            <motion.path 
              d="M16.39 7.87C14.71 6.69 12.64 6 10.5 6C5.81 6 2 9.81 2 14.5" 
              stroke="#f43f5e" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              animate={{ pathLength: [0, 1, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
            />
            <motion.path 
              d="M22 14.5C22 12.36 21.31 10.29 20.13 8.61" 
              stroke="#f43f5e" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              animate={{ pathLength: [0, 1, 0] }}
              transition={{ duration: 3, repeat: Infinity, delay: 1.5 }}
            />
          </motion.svg>
        );
      case '⚙️':
        return (
          <motion.svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <motion.path 
              d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" 
              stroke="#f43f5e" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            />
            <motion.path 
              d="M19.4 15C19.2669 15.3016 19.2272 15.6362 19.286 15.9606C19.3448 16.285 19.4995 16.5843 19.73 16.82L19.79 16.88C19.976 17.0657 20.1235 17.2863 20.2241 17.5291C20.3248 17.7719 20.3766 18.0322 20.3766 18.295C20.3766 18.5578 20.3248 18.8181 20.2241 19.0609C20.1235 19.3037 19.976 19.5243 19.79 19.71C19.6043 19.896 19.3837 20.0435 19.1409 20.1441C18.8981 20.2448 18.6378 20.2966 18.375 20.2966C18.1122 20.2966 17.8519 20.2448 17.6091 20.1441C17.3663 20.0435 17.1457 19.896 16.96 19.71L16.9 19.65C16.6643 19.4195 16.365 19.2648 16.0406 19.206C15.7162 19.1472 15.3816 19.1869 15.08 19.32C14.7842 19.4468 14.532 19.6572 14.3543 19.9255C14.1766 20.1938 14.0813 20.5082 14.08 20.83V21C14.08 21.5304 13.8693 22.0391 13.4942 22.4142C13.1191 22.7893 12.6104 23 12.08 23C11.5496 23 11.0409 22.7893 10.6658 22.4142C10.2907 22.0391 10.08 21.5304 10.08 21V20.91C10.0723 20.579 9.96512 20.258 9.77251 19.9887C9.5799 19.7194 9.31074 19.5143 9 19.4C8.69838 19.2669 8.36381 19.2272 8.03941 19.286C7.71502 19.3448 7.41568 19.4995 7.18 19.73L7.12 19.79C6.93425 19.976 6.71368 20.1235 6.47088 20.2241C6.22808 20.3248 5.96783 20.3766 5.705 20.3766C5.44217 20.3766 5.18192 20.3248 4.93912 20.2241C4.69632 20.1235 4.47575 19.976 4.29 19.79C4.10405 19.6043 3.95653 19.3837 3.85588 19.1409C3.75523 18.8981 3.70343 18.6378 3.70343 18.375C3.70343 18.1122 3.75523 17.8519 3.85588 17.6091C3.95653 17.3663 4.10405 17.1457 4.29 16.96L4.35 16.9C4.58054 16.6643 4.73519 16.365 4.794 16.0406C4.85282 15.7162 4.81312 15.3816 4.68 15.08C4.55324 14.7842 4.34276 14.532 4.07447 14.3543C3.80618 14.1766 3.49179 14.0813 3.17 14.08H3C2.46957 14.08 1.96086 13.8693 1.58579 13.4942C1.21071 13.1191 1 12.6104 1 12.08C1 11.5496 1.21071 11.0409 1.58579 10.6658C1.96086 10.2907 2.46957 10.08 3 10.08H3.09C3.42099 10.0723 3.742 9.96512 4.0113 9.77251C4.28059 9.5799 4.48572 9.31074 4.6 9C4.73312 8.69838 4.77282 8.36381 4.714 8.03941C4.65519 7.71502 4.50054 7.41568 4.27 7.18L4.21 7.12C4.02405 6.93425 3.87653 6.71368 3.77588 6.47088C3.67523 6.22808 3.62343 5.96783 3.62343 5.705C3.62343 5.44217 3.67523 5.18192 3.77588 4.93912C3.87653 4.69632 4.02405 4.47575 4.21 4.29C4.39575 4.10405 4.61632 3.95653 4.85912 3.85588C5.10192 3.75523 5.36217 3.70343 5.625 3.70343C5.88783 3.70343 6.14808 3.75523 6.39088 3.85588C6.63368 3.95653 6.85425 4.10405 7.04 4.29L7.1 4.35C7.33568 4.58054 7.63502 4.73519 7.95941 4.794C8.28381 4.85282 8.61838 4.81312 8.92 4.68H9C9.29577 4.55324 9.54802 4.34276 9.72569 4.07447C9.90337 3.80618 9.99872 3.49179 10 3.17V3C10 2.46957 10.2107 1.96086 10.5858 1.58579C10.9609 1.21071 11.4696 1 12 1C12.5304 1 13.0391 1.21071 13.4142 1.58579C13.7893 1.96086 14 2.46957 14 3V3.09C14.0013 3.41179 14.0966 3.72618 14.2743 3.99447C14.452 4.26276 14.7042 4.47324 15 4.6C15.3016 4.73312 15.6362 4.77282 15.9606 4.714C16.285 4.65519 16.5843 4.50054 16.82 4.27L16.88 4.21C17.0657 4.02405 17.2863 3.87653 17.5291 3.77588C17.7719 3.67523 18.0322 3.62343 18.295 3.62343C18.5578 3.62343 18.8181 3.67523 19.0609 3.77588C19.3037 3.87653 19.5243 4.02405 19.71 4.21C19.896 4.39575 20.0435 4.61632 20.1441 4.85912C20.2448 5.10192 20.2966 5.36217 20.2966 5.625C20.2966 5.88783 20.2448 6.14808 20.1441 6.39088C20.0435 6.63368 19.896 6.85425 19.71 7.04L19.65 7.1C19.4195 7.33568 19.2648 7.63502 19.206 7.95941C19.1472 8.28381 19.1869 8.61838 19.32 8.92V9C19.4468 9.29577 19.6572 9.54802 19.9255 9.72569C20.1938 9.90337 20.5082 9.99872 20.83 10H21C21.5304 10 22.0391 10.2107 22.4142 10.5858C22.7893 10.9609 23 11.4696 23 12C23 12.5304 22.7893 13.0391 22.4142 13.4142C22.0391 13.7893 21.5304 14 21 14H20.91C20.5882 14.0013 20.2738 14.0966 20.0055 14.2743C19.7372 14.452 19.5268 14.7042 19.4 15Z" 
              stroke="#f43f5e" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            />
          </motion.svg>
        );
      default:
        return emoji;
    }
  };

  // Memoize the typing indicator to prevent unnecessary re-renders
  const TypingIndicator = React.useMemo(() => {
    return (
      <motion.span
        className="inline-block text-gray-500"
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
      >
        {localTranslations.chatPreview.typing}
      </motion.span>
    );
  }, [localTranslations.chatPreview.typing]);

  return (
    <div className={`min-h-screen bg-gradient-to-b from-rose-50 via-white to-red-50/30 ${language === 'ar' ? 'rtl' : 'ltr'}`}>
      {/* Add style tag for AI message styling */}
      <style dangerouslySetInnerHTML={{ __html: aiMessageStyles }} />
      
      {/* Adding responsive styles for mobile devices */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width: 640px) {
          .how-to-use-title {
            font-size: 1.1rem;
            line-height: 1.3;
            padding: 0 0.5rem;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            text-align: center;
            width: 70%;
            margin: 0 auto;
          }
          .how-to-use-subtitle {
            font-size: 0.9rem;
            line-height: 1.3;
            padding: 0 0.5rem;
          }
          .back-button {
            padding: 0.4rem 0.6rem;
            font-size: 0.75rem;
            position: absolute;
            z-index: 10;
            top: 50%;
            transform: translateY(-50%);
          }
          
          /* Language-specific adjustments for back button on mobile */
          .rtl .back-button {
            left: auto;
            right: 2.5rem;
          }
          
          .ltr .back-button {
            left: 2.5rem;
            right: auto;
          }
          
          /* Container for proper positioning */
          .header-container {
            position: relative;
            display: flex;
            justify-content: center;
            align-items: center;
            width: 100%;
            min-height: 2.5rem;
          }
        }
        
        /* Desktop styles */
        @media (min-width: 641px) {
          .header-container {
            display: flex;
            justify-content: space-between;
            align-items: center;
            width: 100%;
          }
          
          .how-to-use-title {
            text-align: center;
            flex-grow: 1;
          }
          
          .back-button-container {
            min-width: 100px;
          }
          
          .empty-space {
            min-width: 100px;
          }
        }

        /* Enhanced styling for sophisticated look */
        .card-enhanced {
          position: relative;
          transition: all 0.3s ease;
          border-width: 1px;
          overflow: hidden;
        }
        
        .card-enhanced::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(to right, #f87171, #fda4af, #f87171);
          opacity: 0.8;
          z-index: 1;
        }
        
        .card-enhanced::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          height: 30%;
          background: linear-gradient(to top, rgba(254, 242, 242, 0.4), transparent);
          z-index: 0;
        }
        
        .card-enhanced:hover {
          transform: translateY(-5px);
          box-shadow: 0 15px 30px -10px rgba(244, 63, 94, 0.2), 0 5px 15px -5px rgba(244, 63, 94, 0.15);
        }
        
        .advanced-card {
          background: linear-gradient(135deg, #fff5f5, #fecdd3, #fff5f5);
          border-color: #fda4af;
        }
        
        .section-title {
          font-weight: 700;
          background: linear-gradient(90deg, #f43f5e, #f87171);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          text-fill-color: transparent;
        }
        
        /* Custom scrollbar for chat messages */
        .chat-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        
        .chat-scrollbar::-webkit-scrollbar-track {
          background: rgba(244, 63, 94, 0.05);
          border-radius: 10px;
        }
        
        .chat-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(244, 63, 94, 0.3);
          border-radius: 10px;
        }
        
        .chat-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(244, 63, 94, 0.5);
        }
      `}} />

      <div className="min-h-screen w-full">
        {/* Enhanced header with subtle pattern and shadow */}
        <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md shadow-sm border-b border-rose-200/70">
          <div className="container mx-auto px-3 py-3">
            {/* Responsive layout with proper spacing */}
            <div className="header-container">
              {/* Back button */}
              <div className="back-button-container">
                <Link to="/" className="back-button">
                  <motion.button
                    className="rounded-full bg-gradient-to-r from-rose-500 to-rose-400 text-white px-3 py-0.5 sm:px-4 sm:py-0.5 text-sm sm:text-base flex items-center gap-1 sm:gap-2 shadow-md hover:from-rose-600 hover:to-rose-500 transition-all how-to-use-button"
                    whileTap={{ scale: 0.95 }}
                    style={{ direction: language === 'ar' ? 'rtl' : 'ltr' }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M7.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
                    </svg>
                    {localTranslations.backToChat}
                  </motion.button>
                </Link>
              </div>
              
              {/* Title with enhanced styling */}
              <div className="how-to-use-title font-bold text-lg sm:text-xl md:text-2xl header-title bg-gradient-to-r from-rose-600 via-rose-500 to-rose-600 bg-clip-text text-transparent">
                {localTranslations.title}
              </div>
              
              {/* Empty space to balance layout on desktop */}
              <div className="empty-space"></div>
            </div>
          </div>
        </header>
        
        <main className="container mx-auto px-4 py-6 sm:py-10 max-w-4xl">
          {/* Enhanced subtitle with gradient */}
          <h2 className="how-to-use-subtitle text-center text-lg sm:text-xl md:text-2xl font-light mb-8 text-rose-500">
            <span className="inline-block bg-gradient-to-r from-rose-500 via-rose-400 to-rose-500 bg-clip-text text-transparent pb-1">
              {localTranslations.subtitle}
            </span>
          </h2>
          
          {/* Chat preview modal - enhanced styling */}
          <AnimatePresence>
            {activeSection !== null && (
              <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
                {/* Enhanced overlay with blur - more transparent without reddish tint */}
                <div 
                  className="absolute inset-0 bg-slate-900/20 backdrop-blur-md"
                  onClick={closeModal}
                />
                
                {/* Modal content with enhanced styling - more transparent */}
                <div 
                  className="relative w-full max-w-lg bg-white/80 backdrop-blur-lg rounded-xl shadow-xl overflow-hidden border border-slate-200/50 z-10 max-h-[80vh]"
                  onClick={handleModalClick}
                >
                  {/* Enhanced header - neutral gradient */}
                  <div className="bg-gradient-to-r from-slate-500 to-slate-400 p-3 text-white">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">
                        {activeSection !== null && localTranslations.sections[activeSection].title}
                      </h3>
                      <button
                        className="p-1 rounded-full hover:bg-white/20 transition-colors"
                        onClick={closeModal}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  {/* Chat messages with custom scrollbar */}
                  <div 
                    className="p-4 max-h-[calc(80vh-64px)] overflow-y-auto chat-scrollbar"
                    dir={language === 'ar' ? 'rtl' : 'ltr'}
                    style={{ WebkitOverflowScrolling: 'touch' }}
                  >
                    {/* User message with enhanced styling - neutral gradient */}
                    <div className={`flex ${language === 'ar' ? 'justify-end' : ''} mb-4`}>
                      <div 
                        className="bg-gradient-to-r from-slate-500 to-slate-400 text-white p-3 rounded-lg max-w-[90%] shadow-sm"
                        style={{
                          marginLeft: language === 'ar' ? 'auto' : '0',
                          marginRight: language === 'ar' ? '0' : 'auto'
                        }}
                      >
                        <div style={{ textAlign: language === 'ar' ? 'right' : 'left' }}>
                          {activeSection === 5 ? 
                            (language === 'ar' ? 'ما هي رسوم الساعة المعتمدة لتخصص علوم الحاسوب؟' : 'what are the credit hour fees for computer science major?') : 
                            (activeSection !== null && localTranslations.sections[activeSection].exampleQuery)
                          }
                        </div>
                      </div>
                    </div>
                    
                    {/* AI response with enhanced styling - more transparent */}
                    <div className={`flex ${language === 'ar' ? '' : ''} mb-4`}>
                      <div 
                        className="bg-white/60 p-3 rounded-lg max-w-[90%] shadow-sm border border-slate-200/50"
                        style={{
                          marginLeft: language === 'ar' ? '0' : 'auto',
                          marginRight: language === 'ar' ? 'auto' : '0'
                        }}
                      >
                        <div className="text-gray-800" style={{ textAlign: language === 'ar' ? 'right' : 'left' }}>
                          <div className="whitespace-pre-line">
                            {displayedResponse}
                            {isTyping && TypingIndicator}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Follow-up question for Advanced Features with enhanced styling - neutral gradient */}
                    {activeSection === 5 && showFollowupQuestion && (
                      <div className={`flex ${language === 'ar' ? 'justify-end' : ''} mb-4`}>
                        <div 
                          className="bg-gradient-to-r from-slate-500 to-slate-400 text-white p-3 rounded-lg max-w-[90%] shadow-sm"
                          style={{
                            marginLeft: language === 'ar' ? 'auto' : '0',
                            marginRight: language === 'ar' ? '0' : 'auto'
                          }}
                        >
                          <div style={{ textAlign: language === 'ar' ? 'right' : 'left' }}>
                            {language === 'ar' ? 'وما هو الحد الأدنى لمعدل الثانوية العامة؟' : 'and what is its minimum highschool average?'}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Second AI response with enhanced styling - more transparent */}
                    {activeSection === 5 && showFollowupQuestion && (
                      <div className={`flex ${language === 'ar' ? '' : ''} mb-4`}>
                        <div 
                          className="bg-white/60 p-3 rounded-lg max-w-[90%] shadow-sm border border-slate-200/50"
                          style={{
                            marginLeft: language === 'ar' ? '0' : 'auto',
                            marginRight: language === 'ar' ? 'auto' : '0'
                          }}
                        >
                          <div className="text-gray-800" style={{ textAlign: language === 'ar' ? 'right' : 'left' }}>
                            <div className="whitespace-pre-line">
                              {displayedContextResponse}
                              {isTypingSecond && TypingIndicator}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </AnimatePresence>
          
          {/* Tutorial sections with reordered cards - advanced features first */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 md:gap-8"
          >
            {[
              // Advanced Features Card (moved to first position)
              localTranslations.sections[5],
              // All other cards in their original order (except index 5)
              ...localTranslations.sections.slice(0, 5)
            ].map((section, index) => (
              <motion.div
                key={index}
                ref={el => { 
                  // Update the reference to match the original array for proper animations
                  if (index === 0) {
                    sectionRefs.current[5] = el; // Advanced Features card (was index 5)
                  } else {
                    sectionRefs.current[index - 1] = el; // Other cards offset by 1
                  }
                }}
                variants={itemVariants}
                className={`card-enhanced bg-white/90 backdrop-blur-sm rounded-2xl ${isMobile ? 'p-4' : 'p-6'} shadow-lg border ${index === 0 ? 'advanced-card' : 'border-rose-100'} hover:border-rose-200 transition-all relative overflow-hidden cursor-pointer gpu-accelerated`}
                onClick={() => handleCardClick(index === 0 ? 5 : index - 1)}
                whileHover={isMobile ? { scale: 1.02 } : { scale: 1.05 }} // Reduced hover effects on mobile
                style={{
                  boxShadow: index === 0 
                    ? '0 10px 40px -10px rgba(244, 63, 94, 0.15), 0 5px 20px -10px rgba(244, 63, 94, 0.2)' 
                    : '0 10px 40px -10px rgba(244, 63, 94, 0.1), 0 5px 20px -10px rgba(244, 63, 94, 0.15)',
                }}
              >
                {/* Card background with enhanced gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-white via-white/95 to-rose-50/50 pointer-events-none" />
                
                {/* Icon and content container */}
                <div className="relative z-10">
                  {/* Icon with enhanced animations */}
                  <div className="flex justify-center mb-4 sm:mb-6">
                    <motion.div 
                      className={`relative ${isMobile ? 'text-3xl' : 'text-4xl'} leading-none`}
                      whileHover={isMobile ? {} : { scale: 1.1 }} // Remove hover on mobile
                    >
                      <div className="relative z-10">
                        {getAnimatedIcon(section.icon, index === 0 ? 5 : index - 1)}
                      </div>
                    </motion.div>
                  </div>
                  
                  {/* Title with enhanced styling */}
                  <h3 className={`section-title text-center mb-3 ${isMobile ? 'text-lg' : 'text-xl'}`}>{section.title}</h3>
                  
                  {/* Content text with enhanced styling */}
                  <p className={`text-gray-600 mb-4 ${isMobile ? 'text-sm' : 'text-base'}`}>{section.content}</p>
                  
                  {/* Example hint with enhanced styling */}
                  <div className="text-center text-rose-400 text-xs sm:text-sm italic font-light">
                    {isMobile ? t('clickToSeeExample') : t('clickToSeeMoreExample')}
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </main>
      </div>
    </div>
  );
};

// Use React.memo to prevent unnecessary re-renders of the entire component
export default React.memo(HowToUse); 