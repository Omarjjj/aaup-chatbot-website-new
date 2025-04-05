import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import MarkdownTableDetector from './MarkdownTableDetector';

interface TypewriterEffectProps {
  text: string;
  speed?: number;
}

export const TypewriterEffect = ({ text = '', speed = 30 }: TypewriterEffectProps) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [shouldUseEnhancedTables, setShouldUseEnhancedTables] = useState(false);
  const [isArabicContent, setIsArabicContent] = useState(false);
  const [prevText, setPrevText] = useState(''); // Store previous text
  const intervalRef = useRef<any>(null);

  useEffect(() => {
    // Skip if text hasn't changed
    if (text === prevText) {
      return;
    }

    // Clean up any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    setPrevText(text);
    
    // Reset state
    setDisplayedText('');
    setIsComplete(false);
    setHasError(false);
    setIsLoading(true);

    // Check for Arabic content
    const containsArabic = /[\u0600-\u06FF]/.test(text);
    setIsArabicContent(containsArabic);

    // Check for tables to use enhanced table renderer
    const hasComparisonTable = text.includes('|') && text.match(/\|[-:\s|]+\|/);
    setShouldUseEnhancedTables(!!hasComparisonTable);

    // If there's no text, complete immediately
    if (!text) {
      setIsComplete(true);
      setIsLoading(false);
      return;
    }

    try {
      // Super simple character-by-character animation
      let index = 0;
      const fullText = text || '';
      
      // Start the animation with a consistent interval - faster speed
      intervalRef.current = setInterval(() => {
        if (index < fullText.length) {
          setDisplayedText(fullText.substring(0, index + 1));
          index++;
          
          // Accelerate animation for very long responses
          if (fullText.length > 500 && index > 100) {
            // Skip ahead more characters at once for long text
            const skipAmount = Math.min(5, Math.floor(fullText.length / 200));
            index = Math.min(index + skipAmount, fullText.length);
          }
        } else {
          // Animation complete
          clearInterval(intervalRef.current);
          setIsComplete(true);
          setIsLoading(false);
        }
      }, Math.max(1, speed / 10)); // Even faster animation speed

      // Clean up function
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    } catch (error) {
      console.error('Error in TypewriterEffect:', error);
      setHasError(true);
      setDisplayedText(text);
      setIsComplete(true);
      setIsLoading(false);
    }
  }, [text, speed]); // Only re-run if text or speed changes

  return (
    <div className={`typewriter-effect whitespace-normal ${isArabicContent ? 'rtl' : 'ltr'}`}>
      {hasError ? (
        <div className="error-message">Error rendering content. Please try again.</div>
      ) : shouldUseEnhancedTables ? (
        <MarkdownTableDetector
          markdownContent={displayedText}
          isArabic={isArabicContent}
        />
      ) : (
        <div className={`markdown-content ${isComplete ? 'opacity-100' : 'opacity-90'}`}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeKatex]}
            components={{
              a: ({ node, children, ...props }) => (
                <a 
                  {...props}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--aaup-red)] hover:text-[var(--aaup-red-dark)] 
                           underline decoration-2 decoration-red-200 
                           hover:decoration-red-500 transition-all duration-200 
                           cursor-pointer relative z-10"
                  style={{ 
                    pointerEvents: 'all',
                    position: 'relative',
                    zIndex: 10
                  }}
                >
                  {children}
                </a>
              ),
              h1: ({ node, ...props }) => (
                <h1 {...props} className="text-xl font-bold mb-2 text-gray-900" />
              ),
              h2: ({ node, ...props }) => (
                <h2 {...props} className="text-lg font-semibold mb-2 text-gray-800" />
              ),
              ul: ({ node, ...props }) => (
                <ul {...props} className="list-disc list-inside mb-3 space-y-1 text-gray-700" />
              ),
              ol: ({ node, ...props }) => (
                <ol {...props} className="list-decimal list-inside mb-2 space-y-1 text-gray-700" />
              ),
              code: ({ node, ...props }) => (
                <code {...props} className="bg-red-50 rounded px-1.5 py-0.5 text-sm font-mono text-[var(--aaup-red)]" />
              ),
              blockquote: ({ node, ...props }) => (
                <blockquote {...props} className="border-l-4 border-[var(--aaup-red-light)] pl-4 italic text-gray-600 my-2" />
              ),
              table: ({ node, ...props }) => (
                <table {...props} className="w-full mb-3 border-collapse border border-gray-300 rounded-md overflow-hidden shadow-sm" />
              ),
            }}
          >
            {displayedText}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
}; 