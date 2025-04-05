// Define supported languages
export const SUPPORTED_LANGUAGES = ['en', 'ar'] as const;

// Language type from supported languages
export type Language = (typeof SUPPORTED_LANGUAGES)[number];

// Pattern interface for language-specific patterns
export interface LanguagePatterns {
    [key: string]: RegExp;
}

// Re-export for easier imports
export default {
    SUPPORTED_LANGUAGES,
    Language: null as unknown as Language, // Type-only export
    LanguagePatterns: {} as LanguagePatterns // Type-only export
}; 