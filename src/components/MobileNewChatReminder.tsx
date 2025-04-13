import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RefreshCw } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface MobileNewChatReminderProps {
  messageCount: number;
  triggerCount?: number;
}

const MobileNewChatReminder: React.FC<MobileNewChatReminderProps> = ({ 
  messageCount, 
  triggerCount = 3 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const { language } = useLanguage();

  useEffect(() => {
    // Check if user is on mobile
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    // Initial check
    checkIfMobile();

    // Add event listener for resize
    window.addEventListener('resize', checkIfMobile);

    // Clean up
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  useEffect(() => {
    // Show notification when message count is at least the trigger count
    // but only on mobile devices
    if (messageCount >= triggerCount && isMobile) {
      setIsVisible(true);

      // Auto-hide after 15 seconds
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 15000);

      return () => clearTimeout(timer);
    }
  }, [messageCount, triggerCount, isMobile]);

  // Don't render anything if not on mobile or notification not visible
  if (!isMobile || !isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.9 }}
        transition={{ 
          type: "spring", 
          stiffness: 300, 
          damping: 20 
        }}
        className="fixed top-16 z-[9980] pointer-events-auto"
        style={{
          [language === 'ar' ? 'left' : 'right']: '8px',
          maxWidth: '160px'
        }}
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
      >
        <motion.div 
          className="relative overflow-hidden p-[1px] rounded-md shadow-sm"
          style={{
            background: 'linear-gradient(to right, rgba(252, 165, 165, 0.6), rgba(254, 205, 211, 0.6), rgba(252, 165, 165, 0.6))'
          }}
          animate={{
            boxShadow: isHovered 
              ? "0 3px 8px -2px rgba(252, 165, 165, 0.3), 0 2px 4px -1px rgba(252, 165, 165, 0.15)" 
              : "0 1px 5px -2px rgba(252, 165, 165, 0.2), 0 1px 2px -1px rgba(252, 165, 165, 0.1)"
          }}
          whileHover={{ scale: 1.02 }}
        >
          <div 
            className="bg-gradient-to-b from-white/95 to-red-50/90 backdrop-blur-sm rounded-[calc(0.375rem-1px)] p-1.5 relative overflow-hidden"
            style={{ direction: language === 'ar' ? 'rtl' : 'ltr' }}
          >
            {/* Animated background effect - lighter */}
            <motion.div
              className="absolute inset-0 opacity-15"
              style={{
                background: 'radial-gradient(circle at center, rgba(252, 165, 165, 0.15) 0%, transparent 70%)',
              }}
              animate={{
                scale: [1, 1.1, 1],
                opacity: [0.08, 0.15, 0.08],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            
            <div className="flex items-center gap-1.5">
              <div className="bg-red-50/70 p-0.5 rounded-full">
                <motion.div
                  animate={{ 
                    rotate: isHovered ? 360 : 0
                  }}
                  transition={{ 
                    duration: 1,
                    ease: "easeInOut"
                  }}
                >
                  <RefreshCw className="w-2.5 h-2.5 flex-shrink-0 text-red-300" />
                </motion.div>
              </div>
              
              <div className="flex-1">
                <p className="font-medium text-red-400 text-[10px] leading-tight">
                  {language === 'ar'
                    ? 'لتجربة أفضل، يمكنك بدء محادثة جديدة'
                    : 'For better experience, start new chat'}
                </p>
              </div>
              
              <motion.button 
                onClick={() => setIsVisible(false)}
                className="text-red-300 hover:text-red-400 p-0.5 hover:bg-red-50/50 rounded transition-colors flex-shrink-0"
                whileHover={{ rotate: 90 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                aria-label="Close"
              >
                <X size={12} />
              </motion.button>
            </div>
            
            {/* Progress bar - lighter */}
            <motion.div
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-red-200 via-red-100 to-red-200"
              initial={{ scaleX: 1, transformOrigin: "left" }}
              animate={{ scaleX: 0 }}
              transition={{ duration: 15, ease: "linear" }}
              onAnimationComplete={() => setIsVisible(false)}
              style={{
                filter: "drop-shadow(0 0 1px rgba(252, 165, 165, 0.3))"
              }}
            />
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default MobileNewChatReminder; 