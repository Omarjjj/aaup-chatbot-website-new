import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import EnhancedComparisonTable from './EnhancedComparisonTable';

interface MarkdownTableDetectorProps {
  markdownContent: string;
  isArabic?: boolean;
}

export const MarkdownTableDetector: React.FC<MarkdownTableDetectorProps> = ({ 
  markdownContent,
  isArabic = false
}) => {
  const [processedContent, setProcessedContent] = useState<React.ReactNode[]>([]);
  
  useEffect(() => {
    // Function to process the markdown content and extract tables
    const processMarkdown = () => {
      try {
        console.log("Processing markdown content for tables");
        
        // Improved regex to find markdown tables (any table structure)
        // This handles various table formats with different column counts
        const tableRegex = /(\|.+\|\r?\n\|[-:\s|]+\|\r?\n(?:\|.+\|\r?\n)+)/g;
        
        // Split the content by tables
        const parts = markdownContent.split(tableRegex);
        
        const result: React.ReactNode[] = [];
        
        // Process each part
        parts.forEach((part, index) => {
          // Check if the part is a table by testing the regex pattern again
          if (part.match(/^\|.+\|\r?\n\|[-:\s|]+\|/m)) {
            console.log("Found table in content, extracting...");
            
            // Extract program names from the context
            // Look for standard comparison headers or Arabic equivalents with improved patterns
            const programNameRegex = /(?:#\s*(?:Comparison|مقارنة)(?:\s*Between|\s*بين)?(?:\s*:|:)?\s*([^#]+?)\s*(?:and|vs|versus|و)\s*([^#\n.]+))|(?:Digital\s+Marketing\s+(?:vs|versus)\s+Computer\s+Science)/i;
            const programNamesMatch = markdownContent.match(programNameRegex);
            
            let programNames = ['Digital Marketing', 'Computer Science'];
            if (programNamesMatch && programNamesMatch.length >= 3) {
              programNames = [
                programNamesMatch[1].trim(),
                programNamesMatch[2].trim()
              ];
              console.log("Extracted program names:", programNames);
            } else if (programNamesMatch && programNamesMatch[0].includes("Digital Marketing vs Computer Science")) {
              programNames = ['Digital Marketing', 'Computer Science'];
              console.log("Using default program names for Digital Marketing vs Computer Science");
            } else {
              // Try alternative approaches to find program names
              // Look for the first section title that might contain program names
              const titleRegex = /#\s*([^#\n]+)/;
              const titleMatch = markdownContent.match(titleRegex);
              
              if (titleMatch && titleMatch[1]) {
                const title = titleMatch[1].trim();
                // Check if title contains "vs" or similar comparison words
                if (/\bvs\.?\b|\bversus\b|\band\b|\bو\b/i.test(title)) {
                  const parts = title.split(/\bvs\.?\b|\bversus\b|\band\b|\bو\b/i);
                  if (parts.length >= 2) {
                    programNames = [parts[0].trim(), parts[1].trim().replace('Programs', '').trim()];
                    console.log("Extracted program names from title:", programNames);
                  }
                }
              }
            }
            
            // Render table using EnhancedComparisonTable
            try {
              result.push(
                <EnhancedComparisonTable 
                  key={`table-${index}`}
                  markdownTable={part}
                  programNames={programNames}
                  animate={true}
                  theme="light"
                />
              );
            } catch (error) {
              console.error("Error rendering enhanced table:", error);
              // Fallback to regular markdown rendering for this table
              result.push(
                <div key={`fallback-table-${index}`} className={`markdown-regular ${isArabic ? 'rtl' : 'ltr'}`}>
                  <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
                    {part}
                  </ReactMarkdown>
                </div>
              );
            }
          } else if (part.trim()) {
            // Render regular markdown content
            result.push(
              <div key={`content-${index}`} className={`markdown-regular ${isArabic ? 'rtl' : 'ltr'}`}>
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
                                 hover:decoration-red-500 transition-all duration-200"
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
                      <ol {...props} className="list-decimal list-inside mb-3 space-y-1 text-gray-700" />
                    ),
                    code: ({ node, ...props }) => (
                      <code {...props} className="bg-red-50 rounded px-1.5 py-0.5 text-sm font-mono text-[var(--aaup-red)]" />
                    ),
                    blockquote: ({ node, ...props }) => (
                      <blockquote {...props} className="border-l-4 border-[var(--aaup-red-light)] pl-4 italic text-gray-600 my-2" />
                    ),
                  }}
                >
                  {part}
                </ReactMarkdown>
              </div>
            );
          }
        });
        
        setProcessedContent(result);
      } catch (error) {
        console.error("Error processing markdown content:", error);
        // Fallback to rendering the entire content as regular markdown
        setProcessedContent([
          <div key="fallback" className={`markdown-regular ${isArabic ? 'rtl' : 'ltr'}`}>
            <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
              {markdownContent}
            </ReactMarkdown>
          </div>
        ]);
      }
    };
    
    processMarkdown();
  }, [markdownContent, isArabic]);
  
  return (
    <div className="markdown-content-container">
      {processedContent.length > 0 ? 
        processedContent : 
        <div className="text-center text-gray-500 italic py-4">Processing content...</div>
      }
    </div>
  );
};

export default MarkdownTableDetector; 