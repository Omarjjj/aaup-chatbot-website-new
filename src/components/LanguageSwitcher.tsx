import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';

// Animation variants for the page transition
const pageTransition = {
  initial: { 
    opacity: 0,
    scale: 0.98,
    filter: 'blur(8px)',
  },
  animate: { 
    opacity: 1,
    scale: 1,
    filter: 'blur(0px)',
    transition: {
      duration: 0.5,
      ease: [0.4, 0, 0.2, 1]
    }
  },
  exit: { 
    opacity: 0,
    scale: 1.02,
    filter: 'blur(8px)',
    transition: {
      duration: 0.4,
      ease: [0.4, 0, 1, 1]
    }
  }
};

// Animation variants for the text
const textVariants = {
  initial: { 
    y: 20,
    opacity: 0,
    filter: 'blur(8px)'
  },
  animate: { 
    y: 0,
    opacity: 1,
    filter: 'blur(0px)',
    transition: {
      duration: 0.4,
      ease: [0.4, 0, 0.2, 1]
    }
  },
  exit: {
    y: -20,
    opacity: 0,
    filter: 'blur(8px)',
    transition: {
      duration: 0.3,
      ease: [0.4, 0, 1, 1]
    }
  }
};

export const LanguageSwitcher: React.FC = () => {
  const { language, setLanguage } = useLanguage();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);

  // Update mobile state on resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Button variants with access to language
  const buttonVariants = {
    rest: {
      scale: 1,
      rotate: 0,
      background: "linear-gradient(135deg, rgba(255,240,240,0.9), rgba(255,220,220,0.9))"
    },
    hover: {
      scale: 1.05,
      rotate: language === 'ar' ? -5 : 5,
      background: "linear-gradient(135deg, rgba(255,220,220,1), rgba(255,200,200,1))",
      transition: {
        duration: 0.3,
        ease: [0.4, 0, 0.2, 1]
      }
    },
    tap: {
      scale: 0.95,
      rotate: language === 'ar' ? 5 : -5,
      transition: {
        duration: 0.1
      }
    }
  };

  const toggleLanguage = () => {
    // Create a ripple effect on the entire page
    const ripple = document.createElement('div');
    ripple.style.position = 'fixed';
    ripple.style.inset = '0';
    ripple.style.backgroundColor = 'rgba(255, 220, 220, 0.2)';
    ripple.style.zIndex = '100';
    ripple.style.opacity = '0';
    ripple.style.transition = 'all 0.5s ease-out';
    document.body.appendChild(ripple);

    // Trigger the ripple animation
    requestAnimationFrame(() => {
      ripple.style.opacity = '1';
      setTimeout(() => {
        ripple.style.opacity = '0';
        setTimeout(() => ripple.remove(), 500);
      }, 100);
    });

    setLanguage(language === 'ar' ? 'en' : 'ar');
  };

  // Mobile-specific switcher
  if (isMobile) {
    return (
      <motion.div
        className={`fixed bottom-[160px] ${language === 'ar' ? 'left-[8px]' : 'right-[8px]'} z-[1500]`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        style={{
          visibility: "visible",
          display: "block"
        }}
      >
        <motion.button
          onClick={toggleLanguage}
          variants={buttonVariants}
          initial="rest"
          whileHover="hover"
          whileTap="tap"
          className="relative overflow-hidden rounded-full shadow-lg backdrop-blur-sm
                   border border-red-200/50 hover:border-red-300/70 
                   h-12 w-12 flex items-center justify-center group"
          style={{
            boxShadow: '0 4px 20px -8px rgba(196, 30, 58, 0.5)',
            backgroundColor: 'rgba(255, 255, 255, 0.9)'
          }}
        >
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-red-50/80 to-rose-50/80"
            animate={{
              background: [
                'linear-gradient(135deg, rgba(255,240,240,0.9), rgba(255,220,220,0.9))',
                'linear-gradient(135deg, rgba(255,220,220,0.9), rgba(255,200,200,0.9))',
                'linear-gradient(135deg, rgba(255,240,240,0.9), rgba(255,220,220,0.9))',
              ],
            }}
            
          />

          <motion.div
            className="relative w-5 h-5 flex items-center justify-center"
            animate={{ 
              rotate: language === 'ar' ? [0, 360] : [360, 0],
            }}
            transition={{
              duration: 0.6,
              ease: [0.4, 0, 0.2, 1]
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-red-700 transform transition-transform group-hover:scale-110 w-6 h-6 z-20"
              style={{
                filter: "drop-shadow(0 0 1px rgba(0,0,0,0.2))",
                visibility: "visible",
                display: "block"
              }}
            >
              <path d="M12 2a10 10 0 1 0 0 20 10 10 0 1 0 0-20z" />
              <path d="M2 12h20" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
          </motion.div>

          {/* Animated rings effect */}
          <motion.div
            className="absolute inset-0 rounded-full pointer-events-none"
            animate={{
              boxShadow: [
                '0 0 0 0px rgba(196, 30, 58, 0.2)',
                '0 0 0 8px rgba(196, 30, 58, 0)',
              ],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeOut"
            }}
          />
        </motion.button>
      </motion.div>
    );
  }

  // Desktop version
  return (
    <motion.div
      className="fixed bottom-5 md:bottom-6 right-5 md:right-6 z-[1500]"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      <motion.button
        onClick={toggleLanguage}
        variants={buttonVariants}
        initial="rest"
        whileHover="hover"
        whileTap="tap"
        className="relative overflow-hidden rounded-full shadow-lg backdrop-blur-sm
                   border border-red-200/50 hover:border-red-300/70 
                   p-3 flex items-center justify-center gap-2 group"
        style={{
          boxShadow: '0 4px 20px -8px rgba(196, 30, 58, 0.5)',
        }}
      >
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-red-50/80 to-rose-50/80"
          animate={{
            background: [
              'linear-gradient(135deg, rgba(255,240,240,0.9), rgba(255,220,220,0.9))',
              'linear-gradient(135deg, rgba(255,220,220,0.9), rgba(255,200,200,0.9))',
              'linear-gradient(135deg, rgba(255,240,240,0.9), rgba(255,220,220,0.9))',
            ],
          }}
          
        />

        <AnimatePresence mode="wait">
          <motion.span
            key={language}
            variants={textVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="relative text-red-700/90 font-medium text-sm"
          >
            {language === 'ar' ? 'English' : 'العربية'}
          </motion.span>
        </AnimatePresence>

        <motion.div
          className="relative w-5 h-5 flex items-center justify-center"
          animate={{ 
            rotate: language === 'ar' ? [0, 360] : [360, 0],
          }}
          transition={{
            duration: 0.6,
            ease: [0.4, 0, 0.2, 1]
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-red-700 transform transition-transform group-hover:scale-110 w-6 h-6 z-20"
            style={{
              filter: "drop-shadow(0 0 1px rgba(0,0,0,0.2))",
              visibility: "visible",
              display: "block"
            }}
          >
            <path d="M12 2a10 10 0 1 0 0 20 10 10 0 1 0 0-20z" />
            <path d="M2 12h20" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
        </motion.div>

        {/* Animated rings effect */}
        <motion.div
          className="absolute inset-0 rounded-full pointer-events-none"
          animate={{
            boxShadow: [
              '0 0 0 0px rgba(196, 30, 58, 0.2)',
              '0 0 0 8px rgba(196, 30, 58, 0)',
            ],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeOut"
          }}
        />
      </motion.button>
    </motion.div>
  );
}; 