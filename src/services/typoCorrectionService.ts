import axios from 'axios';

// OpenAI API configuration
const OPENAI_BASE_URL = "https://api.openai.com/v1/";
// Use environment variable for API key
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

// Configuration for axios
const openAI = axios.create({
  baseURL: OPENAI_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${OPENAI_API_KEY}`
  }
});

// Define the interface for the correction suggestion
export interface CorrectionSuggestion {
  original: string;      // The original full text
  corrected: string;     // The corrected full text
  originalWord: string;  // The specific word that was misspelled
  correctedWord: string; // The corrected version of the misspelled word
  confidence: number;    // Value between 0 and 1
  multipleCorrections: boolean; // Whether multiple words were corrected
}

/**
 * Checks if the only differences between two strings are capitalization
 * @param original The original text
 * @param corrected The corrected text
 * @returns True if only capitalization differs, false otherwise
 */
function isOnlyCapitalizationDifference(original: string, corrected: string): boolean {
  if (original.length !== corrected.length) {
    return false;
  }
  
  if (original.toLowerCase() !== corrected.toLowerCase()) {
    return false;
  }
  
  // If we get here, the strings are the same except for possible capitalization differences
  return true;
}

/**
 * Determines if the correction is significant enough to show
 * @param original The original text
 * @param corrected The corrected text
 * @returns True if the correction is significant, false otherwise
 */
function isSignificantCorrection(original: string, corrected: string): boolean {
  // Skip if strings are identical
  if (original === corrected) {
    return false;
  }
  
  // Skip capitalization-only differences
  if (isOnlyCapitalizationDifference(original, corrected)) {
    return false;
  }
  
  // Skip corrections for very short phrases (2-3 words) that are likely just fragments
  if (original.split(/\s+/).length <= 3 && corrected.split(/\s+/).length <= 3) {
    const originalWords = original.toLowerCase().split(/\s+/);
    const correctedWords = corrected.toLowerCase().split(/\s+/);
    
    // If it's just articles or prepositions being changed (the, a, an, is, are, etc.)
    const commonWords = ['the', 'a', 'an', 'is', 'are', 'in', 'on', 'at', 'to', 'for', 'of'];
    const isJustCommonWords = originalWords.every(word => commonWords.includes(word)) && 
                             correctedWords.every(word => commonWords.includes(word));
    
    if (isJustCommonWords) {
      return false;
    }
  }
  
  // Calculate how different the strings are
  const maxLength = Math.max(original.length, corrected.length);
  let differences = 0;
  
  for (let i = 0; i < Math.min(original.length, corrected.length); i++) {
    if (original[i].toLowerCase() !== corrected[i].toLowerCase()) {
      differences++;
    }
  }
  
  // Add the length difference to the difference count
  differences += Math.abs(original.length - corrected.length);
  
  // If the difference is minimal compared to the length, skip it
  if (differences / maxLength < 0.1) { // Less than 10% different
    return false;
  }
  
  return true;
}

/**
 * Corrects typos in text using OpenAI's API
 * @param text The text to check for typos
 * @param language The language code ('en' or 'ar')
 * @returns A promise that resolves to CorrectionSuggestion or null if no correction is needed
 */
export async function correctTypos(text: string, language: 'en' | 'ar'): Promise<CorrectionSuggestion | null> {
  // Don't bother checking very short inputs or empty strings
  if (!text.trim() || text.length < 3) {
    return null;
  }

  try {
    const languageContext = language === 'ar' 
      ? "The text is in Arabic. Pay special attention to Arabic spelling, including proper hamzas (ء,أ,إ,ئ,ؤ), taa marbouta (ة/ه), alif maqsura (ى/ي), and other common Arabic typing errors. Always keep diacritics (tashkeel) if present in the original text." 
      : "The text is in English. Provide corrections if there are obvious spelling errors.";

    const response = await openAI.post('chat/completions', {
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are a helpful assistant that corrects typos. ${languageContext} Only respond with corrections if there are obvious typos. 
Do not change the meaning of the text or correct grammatical issues unless they are clearly typos.
Do NOT suggest corrections that only capitalize the first letter of a sentence or proper nouns.
For very short phrases like "is the" or "in the" in English or their Arabic equivalents, do not suggest corrections unless there's a clear misspelling.
IMPORTANT: Always return the complete corrected sentence/phrase, not just the corrected word, even if there's only one misspelled word.
For Arabic text, pay close attention to common typing errors with similar looking letters like (س/ش), (ص/ض), (ط/ظ), etc., and letter positioning errors.
Format your response as JSON with keys: "hasTypos" (boolean), "corrected" (string with the complete corrected text), "confidence" (number between 0 and 1), "originalWord" (the misspelled word), "correctedWord" (the corrected version of the misspelled word), "numberOfCorrections" (integer representing how many words were corrected).`
        },
        {
          role: "user",
          content: text
        }
      ],
      temperature: 0.3,
      max_completion_tokens: language === 'ar' ? 150 : 100, // Allow more tokens for Arabic text
      response_format: { type: "json_object" }
    });

    // Parse the JSON response
    const result = JSON.parse(response.data.choices[0].message.content);
    
    if (!result.hasTypos) {
      return null;
    }

    // Ensure we have a complete corrected text, not just a word
    if (!result.corrected || result.corrected === result.correctedWord) {
      // If API only returned the corrected word, build a complete sentence
      const originalWords = text.toLowerCase().split(/\s+/);
      const correctedWords = [...originalWords];
      
      // Find the position of the misspelled word
      const misspelledWordIndex = originalWords.findIndex(
        word => word === result.originalWord.toLowerCase()
      );
      
      if (misspelledWordIndex >= 0) {
        // Replace the misspelled word with the correction
        correctedWords[misspelledWordIndex] = result.correctedWord;
        result.corrected = correctedWords.join(' ');
      } else {
        // Fallback if we can't find the exact position
        result.corrected = text;
      }
    }

    // Check if the correction is significant enough to show
    if (!isSignificantCorrection(text, result.corrected)) {
      return null;
    }

    // If the API didn't return the specific word that was corrected, try to find it
    const originalWord = result.originalWord || findDifference(text, result.corrected, language === 'ar');
    const correctedWord = result.correctedWord || findDifference(result.corrected, text, language === 'ar');
    
    // Determine if multiple corrections were made
    const multipleCorrections = result.numberOfCorrections > 1;
    
    // If we can't determine from the API response, make our own estimate
    if (result.numberOfCorrections === undefined) {
      // Count differing words between original and corrected text
      const originalWords = text.toLowerCase().split(/\s+/);
      const correctedWords = result.corrected.toLowerCase().split(/\s+/);
      let diffCount = 0;
      
      // Count words that differ
      const minLength = Math.min(originalWords.length, correctedWords.length);
      for (let i = 0; i < minLength; i++) {
        if (originalWords[i] !== correctedWords[i]) {
          diffCount++;
        }
      }
      
      // Add any length difference
      diffCount += Math.abs(originalWords.length - correctedWords.length);
    }

    return {
      original: text,
      corrected: result.corrected,
      originalWord: originalWord,
      correctedWord: correctedWord,
      confidence: result.confidence,
      multipleCorrections: result.numberOfCorrections > 1 || countWordDifferences(text, result.corrected, language === 'ar') > 1
    };
  } catch (error) {
    console.error('Error correcting typos:', error);
    return null;
  }
}

/**
 * Finds the main difference between two strings (helps identify the misspelled word)
 * @param source The source string
 * @param target The target string to compare with
 * @param isArabic Optional boolean indicating if the text is Arabic
 * @returns The most likely word that differs between the strings
 */
function findDifference(source: string, target: string, isArabic?: boolean): string {
  // Split into words, handling Arabic text properly
  // Arabic text needs special handling as some words might have connected letters
  const sourceWords = source.split(/\s+/);
  const targetWords = target.split(/\s+/);
  
  // Find the first word that differs
  for (let i = 0; i < Math.min(sourceWords.length, targetWords.length); i++) {
    if (sourceWords[i].toLowerCase() !== targetWords[i].toLowerCase()) {
      return sourceWords[i];
    }
  }
  
  // Special handling for Arabic text - check if the difference might be in a partial word
  // like a missing diacritical mark or a letter substitution
  if (isArabic && source.length === target.length) {
    for (let i = 0; i < source.length; i++) {
      if (source[i] !== target[i]) {
        // Find the word containing this character
        const wordStart = source.lastIndexOf(' ', i) + 1;
        const wordEnd = source.indexOf(' ', i);
        const end = wordEnd === -1 ? source.length : wordEnd;
        return source.substring(wordStart, end);
      }
    }
  }
  
  // If we couldn't find a clear difference, return the last word of the shorter string
  return sourceWords[sourceWords.length - 1];
}

/**
 * Counts how many words differ between two strings
 * @param original Original text
 * @param corrected Corrected text
 * @param isArabic Optional boolean indicating if the text is Arabic
 * @returns Number of words that differ
 */
function countWordDifferences(original: string, corrected: string, isArabic?: boolean): number {
  const originalWords = original.toLowerCase().split(/\s+/);
  const correctedWords = corrected.toLowerCase().split(/\s+/);
  let diffCount = 0;
  
  // Count words that differ
  const minLength = Math.min(originalWords.length, correctedWords.length);
  for (let i = 0; i < minLength; i++) {
    // For Arabic, we need more sophisticated comparison due to subtle differences
    // like hamzas, diacritics, etc.
    if (isArabic) {
      // Simple but less strict comparison for Arabic to catch subtle differences
      if (originalWords[i] !== correctedWords[i]) {
        // Check for similar-looking Arabic characters that might be mistyped
        const similarCharPairs = [
          ['أ', 'ا', 'إ', 'آ'], // alif variations
          ['ة', 'ه'],          // taa marbouta and haa
          ['ي', 'ى'],          // yaa and alif maqsura
          ['و', 'ؤ'],          // waw and waw with hamza
        ];
        
        // If the words only differ by these similar characters, consider them less different
        let normalizedOriginal = originalWords[i];
        let normalizedCorrected = correctedWords[i];
        
        similarCharPairs.forEach(charGroup => {
          const replaceWithFirst = (char: string) => charGroup.includes(char) ? charGroup[0] : char;
          normalizedOriginal = [...normalizedOriginal].map(replaceWithFirst).join('');
          normalizedCorrected = [...normalizedCorrected].map(replaceWithFirst).join('');
        });
        
        if (normalizedOriginal !== normalizedCorrected) {
          diffCount++;
        } else {
          // The words differ only by similar-looking characters,
          // count as a partial difference (0.5 instead of 1)
          diffCount += 0.5;
        }
      }
    } else {
      // For non-Arabic, use the original simple comparison
      if (originalWords[i] !== correctedWords[i]) {
        diffCount++;
      }
    }
  }
  
  // Add any length difference
  diffCount += Math.abs(originalWords.length - correctedWords.length);
  
  return Math.ceil(diffCount); // Round up partial differences
}

/**
 * Debounced version of correctTypos
 * @param text The text to check for typos
 * @param language The language code ('en' or 'ar')
 * @param delay The debounce delay in milliseconds
 * @returns A promise that resolves to CorrectionSuggestion or null
 */
let debounceTimeout: ReturnType<typeof setTimeout> | null = null;
let lastProcessedText = '';

export function debouncedCorrectTypos(text: string, language: 'en' | 'ar', delay = 300): Promise<CorrectionSuggestion | null> {
  if (debounceTimeout) {
    clearTimeout(debounceTimeout);
  }

  // Skip processing if the text hasn't changed enough
  if (lastProcessedText === text) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    debounceTimeout = setTimeout(async () => {
      // Save the current text to avoid duplicate processing
      lastProcessedText = text;
      
      const correction = await correctTypos(text, language);
      resolve(correction);
    }, delay);
  });
}

// Export the typo correction service as a singleton
export const typoCorrectionService = {
  correctTypos,
  debouncedCorrectTypos
};

export default typoCorrectionService; 