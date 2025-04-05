import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';

interface NewChatButtonProps {
  visible: boolean;
  onNewChat: () => void;
  inHeader?: boolean;
}

const NewChatButton: React.FC<NewChatButtonProps> = ({ visible, onNewChat, inHeader = false }) => {
  const { translations, language } = useLanguage();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
  
  // Update mobile state on resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Button with text beside it (for header)
  // Only render this on desktop
  if (inHeader && !isMobile) {
    return (
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="flex items-center"
          >
            <motion.button
              onClick={onNewChat}
              whileHover={{ scale: 1.05, y: -1 }}
              whileTap={{ scale: 0.95 }}
              className="relative overflow-hidden rounded-full flex items-center group"
              aria-label="Start new chat"
              style={{
                background: '#E63E5C',
                boxShadow: '0 5px 15px -5px rgba(196, 30, 58, 0.3)',
                padding: language === 'ar' ? '0.5rem 0.75rem' : '0.35rem 0.6rem'
              }}
            >
              <motion.div
                className="absolute opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{
                  background: 'radial-gradient(circle at center, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 70%)',
                  mixBlendMode: 'overlay',
                  top: 0,
                  bottom: 0,
                  left: 0,
                  right: 0
                }}
              />
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-3.5 w-3.5 ${language === 'ar' ? 'mr-1' : 'mr-0.5'} text-white relative z-10`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className={`text-white relative z-10 ${language === 'ar' ? 'text-xs' : 'text-[10px]'} font-medium`}>{translations.newChat.button}</span>
            </motion.button>
            <motion.span 
              className={`ml-3 text-xs text-red-600 font-medium max-w-[150px] hidden sm:block ${language === 'ar' ? 'mr-6' : ''}`}
              initial={{ opacity: 0, x: -5 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              {translations.newChat.message}
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  // Mobile-only floating button has been removed

  // If not in header or is mobile, return nothing
  return null;
};

export default NewChatButton; 