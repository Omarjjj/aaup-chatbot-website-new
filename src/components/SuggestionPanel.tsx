import { motion, AnimatePresence } from 'framer-motion';
import { useState, useRef } from 'react';
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

  const containerVariants = {
    hidden: { 
      opacity: 0, 
      y: 10,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.3,
        when: "beforeChildren",
        staggerChildren: 0.05,
      }
    },
    exit: {
      opacity: 0,
      y: -10,
      transition: {
        duration: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { 
      opacity: 0, 
      scale: 0.95
    },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 20
      }
    },
    exit: { 
      opacity: 0, 
      scale: 0.95
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
            drag="x"
            dragConstraints={containerRef}
            onDragStart={() => setIsDragging(true)}
            onDragEnd={() => setIsDragging(false)}
            style={{
              cursor: isDragging ? 'grabbing' : 'grab'
            }}
          >
            {suggestions.map((suggestion) => (
              <motion.button
                key={suggestion}
                variants={itemVariants}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
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