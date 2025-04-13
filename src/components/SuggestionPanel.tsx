import { motion, AnimatePresence } from 'framer-motion';
import { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

interface SuggestionPanelProps {
  suggestions: string[];
  onSuggestionClick: (suggestion: string) => void;
}

const SuggestionPanel: React.FC<SuggestionPanelProps> = ({ suggestions, onSuggestionClick }) => {
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const [isMobile, setIsMobile] = useState(false);
  const [isLowPerfDevice, setIsLowPerfDevice] = useState(false);
  const [renderedSuggestions, setRenderedSuggestions] = useState<string[]>([]);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    // Detect low performance device (older mobile devices)
    // Using RAM as a proxy for device performance
    const memory: any = (navigator as any).deviceMemory;
    if (memory && memory < 4) {
      setIsLowPerfDevice(true);
    }
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Optimize rendering for mobile by only rendering visible suggestions
  useEffect(() => {
    setRenderedSuggestions(suggestions);
  }, [suggestions]);

  // Simplified container variants for mobile
  const containerVariants = {
    hidden: { 
      opacity: 0, 
      y: isMobile ? 5 : 10, // Smaller animation distance on mobile
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: isMobile ? 0.2 : 0.3, // Faster animation on mobile
        when: "beforeChildren",
        staggerChildren: isMobile ? 0.03 : 0.05, // Less stagger on mobile
      }
    },
    exit: {
      opacity: 0,
      y: isMobile ? -5 : -10,
      transition: {
        duration: isMobile ? 0.15 : 0.2 // Faster exit on mobile
      }
    }
  };

  // Simplified item variants for mobile
  const itemVariants = {
    hidden: { 
      opacity: 0, 
      scale: isMobile ? 0.98 : 0.95 // Less scale change on mobile
    },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: {
        type: "spring",
        stiffness: isMobile ? 200 : 300, // Less bouncy on mobile
        damping: isMobile ? 25 : 20 // More dampening on mobile
      }
    },
    exit: { 
      opacity: 0, 
      scale: isMobile ? 0.98 : 0.95
    }
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={language}
        initial="hidden"
        animate="visible"
        exit="exit"
        variants={containerVariants}
        className="w-full max-w-4xl mx-auto"
      >
        <div 
          ref={containerRef}
          className="overflow-x-auto pb-2 hide-scrollbar"
          dir={isRTL ? 'rtl' : 'ltr'}
        >
          <motion.div 
            className="flex gap-2 items-center whitespace-nowrap min-w-min"
            drag={isMobile && isLowPerfDevice ? false : "x"} // Disable drag on low-perf mobile
            dragConstraints={containerRef}
            dragElastic={isMobile ? 0.1 : 0.2} // Reduce elasticity on mobile
            dragTransition={{ 
              power: isMobile ? 0.2 : 0.5, // Less movement power on mobile
              timeConstant: isMobile ? 200 : 350, // Faster on mobile
              modifyTarget: (target) => Math.round(target * 0.1) / 0.1 // Snap to multiples of 0.1
            }}
            onDragStart={() => setIsDragging(true)}
            onDragEnd={() => setIsDragging(false)}
            style={{
              cursor: isDragging ? 'grabbing' : 'grab',
              // Optimize GPU usage on mobile
              ...(isMobile ? { 
                willChange: 'transform',
                backfaceVisibility: 'hidden'
              } : {})
            }}
          >
            {renderedSuggestions.map((suggestion) => (
              <motion.button
                key={suggestion}
                variants={itemVariants}
                whileHover={isMobile ? undefined : { scale: 1.02 }} // No hover animation on mobile
                whileTap={isMobile ? { scale: 0.98 } : { scale: 0.98 }}
                onClick={() => !isDragging && onSuggestionClick(suggestion)}
                className={`
                  flex-shrink-0 px-4 py-2.5 rounded-lg
                  bg-white/80 backdrop-blur-sm
                  border border-gray-200
                  shadow-sm hover:shadow-md
                  transition-all duration-200
                  text-sm font-medium text-gray-700 hover:text-[#f87171]
                  hover:border-[#fca5a5] hover:bg-white
                  focus:outline-none focus:ring-2 focus:ring-[#fca5a5] focus:border-[#f87171]
                `}
                dir={isRTL ? 'rtl' : 'ltr'}
                style={isMobile ? { 
                  // Optimize rendering on mobile
                  contain: 'content',
                  willChange: 'transform, opacity',
                  transformStyle: 'preserve-3d'
                } : {}}
              >
                {suggestion}
              </motion.button>
            ))}
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SuggestionPanel; 