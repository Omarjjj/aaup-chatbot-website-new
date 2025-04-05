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

// Define the prompt for generating captions
const generateCaptionPrompt = (conversation: { text: string; isUser: boolean }[], language: string = 'en') => {
  // With just one message, we can simplify the text
  const userMessage = conversation[0]?.text || '';
  
  const prompt = {
    en: `Generate a concise, descriptive caption (maximum 10 characters) for the following user question to a university chatbot:

"${userMessage}"

The caption should be a clear, short summary of the main topic or question.

Caption:`,
    ar: `قم بإنشاء عنوان موجز ووصفي (بحد أقصى 10 حرفًا) للسؤال التالي من المستخدم إلى روبوت دردشة الجامعة:

"${userMessage}"

يجب أن يكون العنوان ملخصًا واضحًا وقصيرًا للموضوع أو السؤال الرئيسي.

العنوان:`,
  };
  
  return prompt[language as 'en' | 'ar'] || prompt.en;
};

// Service interface for getting captions
export const captionGenerationService = {
  /**
   * Generates a caption for a conversation history
   * @param messages Array of message objects with text and isUser properties
   * @param language The language to generate the caption in ('en' or 'ar')
   * @returns The generated caption or null if generation failed
   */
  async generateCaption(messages: { text: string; isUser: boolean }[], language: string = 'en'): Promise<string | null> {
    try {
      // Filter out any empty messages
      const validMessages = messages.filter(msg => msg.text.trim().length > 0);
      
      // Ensure we have messages to work with
      if (validMessages.length === 0) {
        return null;
      }
      
      // Find the first user message
      const firstUserMessage = validMessages.find(msg => msg.isUser);
      
      if (!firstUserMessage) {
        return null;
      }
      
      // Use only the first user message
      const firstMessageOnly = [firstUserMessage];
      
      // Generate prompt based on first message only
      const prompt = generateCaptionPrompt(firstMessageOnly, language);
      
      // Call OpenAI to generate caption
      const response = await openAI.post('chat/completions', {
        model: "gpt-3.5-turbo",
        messages: [
          { 
            role: "system", 
            content: language === 'ar' 
              ? "أنت مساعد مختص في إنشاء عناوين موجزة ووصفية للمحادثات. اجعل العناوين قصيرة وواضحة ومباشرة." 
              : "You are an assistant specialized in creating concise, descriptive captions for conversations. Make captions short, clear, and direct."
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.3, // Low temperature for more predictable outputs
        max_tokens: 30 // Limit response length
      });
      
      // Extract and clean up the caption
      let generatedCaption = response.data.choices[0]?.message?.content?.trim() || null;
      
      // Remove any quotation marks that might be in the response
      if (generatedCaption) {
        generatedCaption = generatedCaption.replace(/["']/g, '');
        
        // Ensure the caption doesn't exceed 40 characters
        if (generatedCaption.length > 40) {
          generatedCaption = generatedCaption.substring(0, 37) + '...';
        }
      }
      
      return generatedCaption;
    } catch (error) {
      console.error('Error generating caption:', error);
      return null;
    }
  }
}; 