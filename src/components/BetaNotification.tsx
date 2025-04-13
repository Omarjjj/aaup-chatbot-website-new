import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { X, Sparkles, AlertCircle } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

// Define the custom event interface
interface BetaNotificationEvent extends CustomEvent {
  detail: {
    visible: boolean;
  };
}

const BetaNotification = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [showBackground, setShowBackground] = useState(false);
  const { language } = useLanguage();

  const dispatchVisibilityEvent = (visible: boolean) => {
    const event = new CustomEvent('betaNotificationChange', {
      detail: { visible },
      bubbles: true,
      cancelable: true
    });
    window.dispatchEvent(event);
  };

  useEffect(() => {
    // Show notification after a short delay
    const timer = setTimeout(() => {
      setShowBackground(true);
      setTimeout(() => {
        setIsVisible(true);
        dispatchVisibilityEvent(true);
      }, 300);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    dispatchVisibilityEvent(false);
    // Delay background removal
    setTimeout(() => setShowBackground(false), 500);
  };

  return (
    <AnimatePresence>
      {showBackground && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 bg-red-50/30 backdrop-blur-sm z-[9990]"
        />
      )}
      {isVisible && (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ 
            scale: 1, 
            opacity: 1,
            transition: {
              duration: 0.6,
              type: "spring",
              stiffness: 300,
              damping: 30
            }
          }}
          exit={{ 
            scale: 0.95, 
            opacity: 0,
            transition: {
              duration: 0.4,
              ease: "easeOut"
            }
          }}
          className="fixed inset-0 flex items-center justify-center z-[9999] p-4 pointer-events-none"
        >
          <motion.div
            className="relative overflow-hidden bg-gradient-to-r from-red-100/80 via-red-50/90 to-white/95 
                     p-[2px] rounded-2xl shadow-2xl max-w-2xl w-full pointer-events-auto"
            whileHover={{ scale: 1.02 }}
            onHoverStart={() => setIsHovered(true)}
            onHoverEnd={() => setIsHovered(false)}
          >
            <div className="relative bg-gradient-to-b from-white/90 to-red-50/80 backdrop-blur-sm rounded-[calc(1rem-1px)] p-8">
              {/* Animated background elements */}
              <motion.div
                className="absolute inset-0 opacity-30"
                style={{
                  background: 'radial-gradient(circle at center, rgba(220,38,38,0.2) 0%, transparent 70%)',
                }}
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.2, 0.3, 0.2],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
              
              <div className="relative flex flex-col items-end gap-6 text-right">
                <div className="w-full flex justify-between items-start">
                  <motion.button
                    onClick={handleClose}
                    className="text-red-400 hover:text-red-500 p-2 hover:bg-red-100/30 rounded-lg transition-colors"
                    whileHover={{ rotate: 90 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    <X size={24} />
                  </motion.button>
                  <motion.div 
                    className="flex items-center gap-3"
                    animate={{ x: isHovered ? [0, -2, 0] : 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <h3 className="font-bold text-3xl bg-gradient-to-r from-red-400 via-red-500 to-red-400 bg-clip-text text-transparent">
                      {language === 'ar' ? 'النسخة التجريبية للمساعد الذكي AAUP' : 'AAUP Smart Assistant Beta'}
                    </h3>
                    <Sparkles className="w-7 h-7 text-red-400" />
                  </motion.div>
                </div>

                <div className="space-y-4">
                  <p className="text-red-500/90 text-lg leading-relaxed font-light tracking-wide" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                    {language === 'ar' 
                      ? 'هذه نسخة تجريبية من المساعد الذكي للجامعة، وقد تواجه بعض الأخطاء أثناء استخدامها. في هذه النسخة، يفضل ان تسأل المساعد عن موضوع واحد فقط في كل محادثة. إذا أردت تغيير الموضوع، يرجى إنشاء محادثة جديدة. سيتم تحسين هذه الخاصية في التحديثات القادمة القريبة.' 
                      : 'This is a beta version of the University Smart Assistant, and you may encounter some errors during use. In this version, please ask the assistant about only one topic per conversation. If you want to change the topic, please create a new chat. This feature will be improved in upcoming updates.'}
                  </p>
                  <div className="flex items-center gap-3 bg-red-100/30 px-4 py-3 rounded-xl border border-red-200/30" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                    <AlertCircle className="w-5 h-5 text-red-400" />
                    <p className="text-red-500/90 text-base">
                      {language === 'ar' 
                        ? 'هذه نسخة تجريبية - نحن نعمل على التحسين المستمر بناءً على ملاحظات الطلاب' 
                        : 'This is a beta version - we are continuously improving based on student feedback'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <motion.div
                className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-red-400 to-red-500 shadow-lg"
                initial={{ scaleX: 1, transformOrigin: "left" }}
                animate={{ scaleX: 0 }}
                transition={{ duration: 15, ease: "linear" }}
                onAnimationComplete={handleClose}
                style={{
                  filter: "drop-shadow(0 0 8px rgba(239, 68, 68, 0.5))"
                }}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default BetaNotification; 