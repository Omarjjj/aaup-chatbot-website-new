import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CorrectionSuggestion } from '../services/typoCorrectionService';
import { useLanguage } from '../contexts/LanguageContext';

interface TypeCorrectionProps {
  correction: CorrectionSuggestion | null;
  onApplyCorrection: (correctedText: string) => void;
  onDismiss: () => void;
  className?: string;
}

const TypeCorrection: React.FC<TypeCorrectionProps> = ({ 
  correction, 
  onApplyCorrection, 
  onDismiss,
  className = ''
}) => {
  const { language, translations } = useLanguage();
  const isRTL = language === 'ar';

  // Don't render anything if there's no correction or if the correction 
  // is identical to the original text or empty
  if (!correction || 
      !correction.corrected || 
      correction.corrected === '' || 
      correction.corrected === correction.original) {
    return null;
  }

  // Skip corrections that don't provide enough value
  const isTrivialCorrection = (original: string, corrected: string) => {
    // Skip very short corrections like "is the" by themselves
    if (corrected.split(/\s+/).length <= 2 && original.split(/\s+/).length <= 2) {
      const commonPhrases = ['is the', 'in the', 'at the', 'on the', 'for the', 'to the'];
      if (commonPhrases.includes(corrected.toLowerCase().trim())) {
        return true;
      }
    }
    return false;
  };

  if (isTrivialCorrection(correction.original, correction.corrected)) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.15 }}
        className={`typo-correction-container ${className}`}
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        <div className="typo-correction-bubble overflow-hidden text-ellipsis">
          <div className="flex items-center max-w-full">
            <div className="w-4 h-4 flex-shrink-0 mr-2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <div className="text-sm truncate">
              <span className="font-medium text-gray-800">{translations.input.typoCorrection.didYouMean} </span>
              <button 
                onClick={() => onApplyCorrection(correction.corrected)}
                className="font-semibold text-rose-500 hover:text-rose-600 underline focus:outline-none truncate"
              >
                {/* Always display the full corrected text rather than just the corrected word */}
                {correction.corrected}
              </button>
            </div>
          </div>
          <button 
            onClick={onDismiss}
            className="ml-2 text-gray-400 hover:text-gray-500 focus:outline-none flex-shrink-0"
            aria-label={translations.input.typoCorrection.dismiss}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default TypeCorrection; 