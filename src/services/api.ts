import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { Message, ConversationContext, AxiosConfig } from '../types/chat';
// import { contextManager } from './contextManager';
// import { enhancedContextService } from './enhancedContextService';  
import { simpleContextManager } from './simpleContextManager';  // Use our new simple context manager

// In development, we'll use the proxy
const isDevelopment = import.meta.env.DEV;
const API_BASE_URL = isDevelopment ? '' : 'https://aaup-assistant-api.onrender.com';

// Constants
const MAX_HISTORY = 6; // Keep last 3 exchanges
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

// Define supported languages
type Language = 'en' | 'ar';
const SUPPORTED_LANGUAGES: Language[] = ['en', 'ar'];

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Client-Type': 'web-app',  // Identify this as the web client
    'X-Client-Version': '1.0.0', // Version tracking
    'X-Platform': 'web'          // Platform identifier
  },
  timeout: 60000, // 60 second timeout
});

api.interceptors.response.use(undefined, async (error: AxiosError) => {
  const config = error.config as InternalAxiosRequestConfig & AxiosConfig;
  if (!config || config.retry === undefined) {
    config.retry = 0;
  }
  
  if (config.retry >= MAX_RETRIES) {
    return Promise.reject(error);
  }
  
  config.retry += 1;
  const delay = config.retry * RETRY_DELAY;
  
  await new Promise(resolve => setTimeout(resolve, delay));
  return api.request(config);
});

interface RequestPayload {
  query: string;
  client_session_id: string;
  conversation_id: string;
  top_k: number;
  language: string;
  query_type: string;
  context_id: string | null;
  conversation_history: Array<{
    text: string;
    role: string;
    timestamp: string;
    metadata: {
      currentSubject: string | null;
      [key: string]: any;
    };
  }>;
  context_history: {
    activeTopics: Array<{
      name: string;
      lastDiscussed: number;
      attributes: string[];
    }>;
    topicTransitions: Array<{
      from: string;
      to: string;
      timestamp: number;
      attributeCarryOver: string[];
    }>;
    lastDiscussedAttributes: string[];
  };
  metadata: {
    current_subject: string | null;
    is_followup: boolean;
    context_confidence: number;
    context_length: number;
    last_numbers: Record<string, number>;
    last_entities: string[];
    follow_up_count: number;
    language: string;
    previous_subject: string | null;
    active_topics: string[];
    last_discussed_attributes: string[];
    topic_transitions: number;
    query_type: string;
    original_query: string | null;
    hierarchical_context: {
      current_subject: string | null;
      current_topic: string | null;
      recent_topics: string[];
      recent_entities: string[];
    };
  };
  previous_query?: string | null;
}

// Add at the beginning of the file, near other utility functions
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0,
        v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Add this knowledge correction function above the chatService object
/**
 * Corrects known factual errors in responses from the backend
 * This is a client-side safety net for when the backend returns incorrect information
 */
const correctFactualErrors = (responseText: string, query: string): string => {
  // Basic knowledge correction for common errors
  let corrected = responseText;
  
  // Check for errors in university name
  if (query && !query.toLowerCase().includes("arab american") && !query.toLowerCase().includes("aaup")) {
    // Don't correct if the user wasn't asking about AAUP
    return corrected;
  }
  
  // Correct common naming errors - essential for university name
  corrected = corrected.replace(/Arab-American University/gi, "Arab American University");
  corrected = corrected.replace(/American Arab University/gi, "Arab American University");
  corrected = corrected.replace(/AUPP/gi, "AAUP");
  
  return corrected;
};

/**
 * Filter out debugging and analysis information from AI responses
 * This ensures that only the final formatted response is shown to users
 */
const filterDebugInfo = (responseText: string): string => {
  try {
    // Check for the presence of analysis sections
    if (!responseText.includes("Understanding the Query") && 
        !responseText.includes("Query Analysis") && 
        !responseText.includes("Response:")) {
      return responseText; // No debug info to filter
    }
    
    console.log('%c🔍 FILTERING DEBUG INFO FROM RESPONSE', 'background: #800080; color: white; padding: 2px 4px; border-radius: 2px;');
    
    // Find where the actual response begins - after "Response:" or just the first Markdown header
    let filteredResponse = responseText;
    
    // First check if there's a "Response:" marker
    if (responseText.includes("Response:")) {
      filteredResponse = responseText.split("Response:")[1].trim();
    } 
    // Or try to filter out "Understanding the Query" section
    else if (responseText.includes("Understanding the Query")) {
      const parts = responseText.split("Understanding the Query");
      // If there are parts after this header, check for subheaders
      if (parts.length > 1) {
        // Look for next header like "Response:" or first markdown header
        const secondPart = parts[1];
        const responseMatch = secondPart.match(/(?:Response:|(?:^|\n)#[^#])/m);
        if (responseMatch) {
          const startIndex = responseMatch.index || 0;
          filteredResponse = secondPart.substring(startIndex).trim();
          // If it starts with "Response:", remove that too
          if (filteredResponse.startsWith("Response:")) {
            filteredResponse = filteredResponse.substring("Response:".length).trim();
          }
        }
      }
    }
    
    // If the filtered response seems too short or empty, return the original
    if (filteredResponse.length < 20) {
      console.log('%c⚠️ FILTERED RESPONSE TOO SHORT, RETURNING ORIGINAL', 'background: #FFA500; color: white; padding: 2px 4px; border-radius: 2px;');
      return responseText;
    }
    
    console.log('%c✅ SUCCESSFULLY FILTERED DEBUG INFO', 'background: #008000; color: white; padding: 2px 4px; border-radius: 2px;');
    console.log('Original length:', responseText.length);
    console.log('Filtered length:', filteredResponse.length);
    
    return filteredResponse;
  } catch (error) {
    console.error('%c❌ ERROR FILTERING DEBUG INFO', 'background: #FF0000; color: white; padding: 2px 4px; border-radius: 2px;');
    console.error(error);
    // Return original text if there's any error in filtering
    return responseText;
  }
};

export const chatService = {
  async sendMessage(
    query: string, 
    sessionId: string | null,
    conversationId: string,
    contextId: string | null = null,
    previousMessages: Message[] = []
  ) {
    try {
      console.log('%c🔍 DEBUG: API REQUEST STARTING', 'background: #3a0094; color: white; padding: 2px 4px; border-radius: 2px;');
      console.log('Query:', query);
      console.log('Conversation ID:', conversationId);
      console.log('Session ID:', sessionId);
      console.log('Context ID:', contextId);
      console.log('Previous Messages Count:', previousMessages.length);
      console.log('Endpoint:', `${API_BASE_URL}/query`);
      
      // Get current context using SimpleContextManager
      const context = simpleContextManager.getOrCreateContext(conversationId);
      console.log('%c📋 CONTEXT BEFORE UPDATE', 'background: #008075; color: white; padding: 2px 4px; border-radius: 2px;');
      console.log('Current Subject:', context.currentSubject);
      console.log('Current Topic:', context.currentTopic);
      console.log('Follow-up Count:', context.followUpCount);
      console.log('Last Numbers:', Object.fromEntries(context.lastNumbers));
      
      // Check if it's a follow-up question with the simple context manager
      const { isFollowUp, confidence } = simpleContextManager.isFollowUpQuestion(query, conversationId);
      console.log('%c🔄 FOLLOW-UP DETECTION', 'background: #800057; color: white; padding: 2px 4px; border-radius: 2px;');
      console.log('Is Follow-up:', isFollowUp);
      console.log('Confidence:', confidence);
      console.log('Query:', `"${query}"`);
      
      // Improve handling for simple continuations like "okay", "and?", etc.
      const isContinuationResponse = /^(okay|ok|and\??|then\??|next\??|go on|continue|proceed|tell me more|yes|yeah|yep|sure|please do|go ahead|what else|anything else|more information|elaborate)$/i.test(query.toLowerCase().trim());
      
      // Only do a full update for non-continuation queries
      if (!isContinuationResponse) {
        // Update context BEFORE creating the request payload
        simpleContextManager.updateContext(query, true, conversationId);
      } else {
        console.log('%c🔍 CONTINUATION QUERY DETECTED', 'background: #7D3C98; color: white; padding: 2px 4px; border-radius: 2px;');
        console.log('Treating as continuation of previous conversation - preserving context');
        // For continuations, just increment follow-up count but don't update the rest of the context
        const context = simpleContextManager.getOrCreateContext(conversationId);
        context.followUpCount++;
        
        // Save the current subject/topic to ensure we maintain the same conversation focus
        const currentSubject = context.currentSubject;
        const currentTopic = context.currentTopic;
        
        // Get extracted topics from the bot's last response (if available)
        const lastResponseTopics = context.metadata.get('lastResponseTopics') || [];
        
        console.log('Maintaining conversation focus:', { 
          subject: currentSubject, 
          topic: currentTopic,
          lastResponseTopics: lastResponseTopics
        });
        
        // For continuation queries, we can use the previously extracted topics to create a more specific query
        if (lastResponseTopics && lastResponseTopics.length > 0) {
          // Create an enhanced continuation query that specifically references the last topic from the bot
          const enhancedQuery = `Continue providing information about ${lastResponseTopics[0]}. Please provide more details about what you just mentioned.`;
          
          // Replace the original query with our enhanced version
          console.log(`Enhanced continuation query: "${enhancedQuery}"`);
          // We'll update the payload query below, but we keep the original for logging
        }
      }
      
      // Get updated context after the update
      const updatedContext = simpleContextManager.getOrCreateContext(conversationId);
      console.log('%c📋 CONTEXT AFTER UPDATE', 'background: #005280; color: white; padding: 2px 4px; border-radius: 2px;');
      console.log('Current Subject:', updatedContext.currentSubject);
      console.log('Current Topic:', updatedContext.currentTopic);
      console.log('Follow-up Count:', updatedContext.followUpCount);
      console.log('Last Numbers:', Object.fromEntries(updatedContext.lastNumbers));
      
      // For continuation responses, force query_type to FOLLOW_UP with high confidence
      const queryType = isContinuationResponse ? 'FOLLOW_UP' : (isFollowUp ? 'FOLLOW_UP' : 'STANDALONE');
      const contextConfidence = isContinuationResponse ? 0.95 : confidence;
      
      // If this is a continuation query, enhance it with contextual information
      let enhancedQuery = query;
      if (isContinuationResponse) {
        // Get extracted topics from the bot's last response (if available)
        const lastResponseTopics = updatedContext.metadata.get('lastResponseTopics') || [];
        const currentSubject = updatedContext.currentSubject;
        const currentTopic = updatedContext.currentTopic;
        
        // Check if this is a possessive reference query like "what is its credit hour fees?"
        const hasPossessiveReference = updatedContext.metadata.get('possessiveReferenceDetected') === true;
        const shouldMaintainSubject = updatedContext.metadata.get('maintainSubject') === true;
        
        // For possessive references with a specific subject, create a much more explicit query
        if (hasPossessiveReference && currentSubject) {
          console.log(`Possessive reference detected - explicitly referencing subject: ${currentSubject}`);
          
          // Extract the attribute being referenced (fees, requirements, etc.)
          const referencedAttributes = updatedContext.metadata.get('referencedAttributes') as string[] || [];
          const attributeTexts = referencedAttributes.length > 0 ? 
            referencedAttributes.join(', ') : 
            'information';
          
          // Create a very explicit query that connects the subject and attributes
          enhancedQuery = `What is the ${attributeTexts} for ${currentSubject}? Please provide specific information about ${currentSubject}'s ${attributeTexts}.`;
          console.log('Enhanced possessive query:', enhancedQuery);
        }
        // Special handling for "its" queries that might be missed by the pattern matching
        else if (query.toLowerCase().includes('its ') && currentSubject) {
          // Extract what's being asked about
          const match = query.toLowerCase().match(/its\s+(.+?)(?:\?|$)/i);
          if (match && match[1]) {
            const attribute = match[1].trim();
            enhancedQuery = `What is the ${attribute} for ${currentSubject}? Please provide specific information about ${currentSubject}'s ${attribute}.`;
            console.log('Enhanced "its" query:', enhancedQuery);
          }
        }
        // Regular continuation handling with topics
        else if (lastResponseTopics && lastResponseTopics.length > 0) {
          // Use the main topic from the bot's last response
          enhancedQuery = `Continue providing information about ${lastResponseTopics[0]}. Please provide more details about what you just mentioned.`;
        } else if (currentSubject) {
          // Fall back to current subject if we don't have bot response topics
          enhancedQuery = `Tell me more about ${currentSubject}. Continue from where you left off.`;
        } else if (currentTopic) {
          // Fall back to current topic if we don't have subject or bot response topics
          enhancedQuery = `Continue explaining about ${currentTopic}. Provide additional details.`;
        } else {
          // Generic continuation if we have no specific context
          enhancedQuery = `Please continue explaining what you were discussing. Provide more details on the same topic.`;
        }
        
        console.log('Enhanced continuation query:', enhancedQuery);
      }
      
      // Build the request payload with simple context structure
      const payload = {
        query: isContinuationResponse ? enhancedQuery : query,
        client_session_id: sessionId || generateUUID(),
        conversation_id: conversationId,
        top_k: 5,
        language: updatedContext.language || 'en',
        query_type: queryType,
        context_id: contextId,
        conversation_history: previousMessages.slice(-5).map(msg => ({
          text: msg.text,
          role: msg.isUser ? 'user' : 'assistant',
          timestamp: new Date(msg.timestamp).toISOString(),
          metadata: {
            currentSubject: updatedContext.currentSubject,
            ...msg.metadata
          }
        })),
        metadata: {
          current_subject: updatedContext.currentSubject,
          is_followup: isFollowUp,
          context_confidence: contextConfidence,
          last_numbers: Object.fromEntries(updatedContext.lastNumbers || []),
          last_entities: Array.from(updatedContext.lastEntities || []),
          follow_up_count: updatedContext.followUpCount,
          language: updatedContext.language || 'en',
          previous_subject: updatedContext.metadata.get('previousSubject') || null,
          query_type: queryType,
          original_query: query,
          is_continuation: isContinuationResponse,
          maintain_topic_focus: isContinuationResponse,
          last_response_topics: updatedContext.metadata.get('lastResponseTopics') || []
        }
      };
      
      console.log('%c PAYLOAD TO BACKEND', 'background: #7d4e00; color: white; padding: 2px 4px; border-radius: 2px;');
      console.log(JSON.stringify(payload, null, 2));
      
      // Call the backend API
      console.log('Sending request to backend...');
      const response = await axios.post(`${API_BASE_URL}/query`, payload, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Client-Type': 'web-app',
          'X-Client-Version': '1.0.0',
          'X-Platform': 'web',
          'X-Request-ID': generateUUID()
        }
      });
      
      // Enhanced logging for cross-platform comparison
      console.log('%c🔄 COMPLETE REQUEST DETAILS', 'background: #A52A2A; color: white; padding: 2px 4px; border-radius: 2px;');
      console.log('Full Query:', query);
      console.log('Session ID:', sessionId);
      console.log('Request Headers:', {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Client-Type': 'web-app',
        'X-Client-Version': '1.0.0',
        'X-Platform': 'web'
      });
      console.log('Full Payload:', payload);
      
      // Process the response - check for matches like in the Kotlin implementation
      console.log('%c📥 BACKEND RESPONSE', 'background: #006128; color: white; padding: 2px 4px; border-radius: 2px;');
      console.log('Status:', response.status);
      console.log('Headers:', response.headers);
      console.log('Response Data:', response.data);
      
      // First check for extracted_data - this is what the mobile app uses
      let responseText = '';
      let responseDataSource = 'unknown';
      
      // Debug what fields are available in the response
      console.log('%c🔍 DATA STRUCTURE CHECK', 'background: #4c3000; color: white; padding: 2px 4px; border-radius: 2px;');
      console.log('Has extracted_data:', !!response.data.extracted_data);
      console.log('Has matches:', !!response.data.matches);
      console.log('Has direct response:', !!response.data.response);
      
      // Check if we have structured extracted_data 
      if (response.data.extracted_data) {
        console.log('%c📊 FOUND EXTRACTED DATA', 'background: #5a3400; color: white; padding: 2px 4px; border-radius: 2px;');
        console.log('Extracted Data:', response.data.extracted_data);
        
        // Use the structured data directly - similar to how the Android app works
        const extractedData = response.data.extracted_data;
        
        // Special handling for high school average questions
        if (query.toLowerCase().includes('minimum') && 
            query.toLowerCase().includes('high school') && 
            query.toLowerCase().includes('average')) {
          console.log('Detected HIGH SCHOOL AVERAGE query pattern');
          
          // Format response using the accurate structured data
          if (extractedData.minimum_high_school_average) {
            responseText = `The minimum high school average for ${extractedData.program || 'Computer Science'} is ${extractedData.minimum_high_school_average}%.`;
            responseDataSource = 'extracted_data.minimum_high_school_average';
            console.log('Using minimum_high_school_average:', extractedData.minimum_high_school_average);
          } 
          // Handle campus-specific information
          else if (extractedData.campuses && extractedData.campuses.length > 0) {
            responseText = `Minimum High School Average for ${extractedData.program || 'Computer Science'} Major\n\n`;
            extractedData.campuses.forEach((campus: any) => {
              responseText += `${campus.name} Campus: ${campus.minimum_high_school_average}%\n`;
            });
            responseDataSource = 'extracted_data.campuses';
            console.log('Using campuses data with averages:', extractedData.campuses.map((c: any) => `${c.name}: ${c.minimum_high_school_average}%`));
          }
        }
        // For credit hour fees
        else if (query.toLowerCase().includes('credit hour') && 
                 query.toLowerCase().includes('fee')) {
          console.log('Detected CREDIT HOUR FEES query pattern');
          if (extractedData.credit_hour_fee) {
            responseText = `For the ${extractedData.program || 'Computer Science'} major at ${extractedData.campus || 'both campuses'}, the credit hour fees are ${extractedData.credit_hour_fee} NIS.`;
            responseDataSource = 'extracted_data.credit_hour_fee';
            console.log('Using credit_hour_fee:', extractedData.credit_hour_fee);
          }
        }
        // Generic extracted data handling for follow-up questions
        else if (isFollowUp) {
          console.log('Processing FOLLOW-UP query with extracted data');
          
          // Try to detect what data to use based on subject and previous questions
          if (extractedData.program && updatedContext.currentSubject) {
            console.log('Subject detected in context:', updatedContext.currentSubject);
            console.log('Program in extracted data:', extractedData.program);
            
            // Check if we have any specific fields that might be relevant
            const relevantFields = Object.keys(extractedData).filter(k => k !== 'program' && k !== 'campuses');
            console.log('Available data fields:', relevantFields);
            
            if (relevantFields.length > 0) {
              // Try to construct a response from available fields
              responseText = `For ${extractedData.program || updatedContext.currentSubject}, `;
              relevantFields.forEach(field => {
                responseText += `${field.replace(/_/g, ' ')}: ${extractedData[field]}, `;
              });
              responseText = responseText.substring(0, responseText.length - 2) + '.';
              responseDataSource = 'extracted_data.relevant_fields';
            }
          }
        }
        
        console.log('Generated response from extracted data:', responseText || 'No response generated');
      }
      
      // If we don't have formatted extracted data yet, fall back to regular response processing
      if (!responseText) {
        console.log('No response from extracted data, trying matches...');
        // Get matches from response like in Kotlin implementation
        const matches = response.data.matches || [];
        
        if (matches && matches.length > 0) {
          console.log('%c📑 USING MATCHES', 'background: #534000; color: white; padding: 2px 4px; border-radius: 2px;');
          console.log('Match count:', matches.length);
          console.log('First match:', matches[0]);
          
          // Join match content similar to Kotlin implementation
          responseText = matches.map((match: any) => {
            console.log('Match content:', match.content);
            return match.content || "";
          }).filter(Boolean).join("\n");
          responseDataSource = 'matches';
        }
        
        // If we still don't have a response, check for direct response property
        if (!responseText && response.data.response) {
          console.log('%c📝 USING DIRECT RESPONSE', 'background: #6a0080; color: white; padding: 2px 4px; border-radius: 2px;');
          responseText = response.data.response;
          responseDataSource = 'direct_response';
        }
      }
      
      // Update context for the response
      simpleContextManager.updateContext(responseText, false, conversationId);
      
      // No data found in any of our expected paths, return the errorResponse
      console.log('%c⚠️ NO VALID RESPONSE FORMAT DETECTED', 'background: #800000; color: white; padding: 2px 4px; border-radius: 2px;');
      
      // Final context state after processing
      const finalContext = simpleContextManager.getOrCreateContext(conversationId);
      console.log('%c📋 FINAL CONTEXT STATE', 'background: #3a0094; color: white; padding: 2px 4px; border-radius: 2px;');
      console.log('Current Subject:', finalContext.currentSubject);
      console.log('Current Topic:', finalContext.currentTopic);
      console.log('Follow-up Count:', finalContext.followUpCount);
      console.log('Last Numbers:', Object.fromEntries(finalContext.lastNumbers));
      
      // Apply knowledge correction to the final response
      const correctedResponse = correctFactualErrors(responseText || 'Sorry, I received an empty response. Please try again.', query);
      
      // Filter out any debugging/analysis information
      const filteredResponse = filterDebugInfo(correctedResponse);
      
      // Log if a correction was applied
      if (correctedResponse !== responseText) {
        console.log('%c🔧 KNOWLEDGE CORRECTION APPLIED', 'background: #8B0000; color: white; padding: 2px 4px; border-radius: 2px;');
        console.log('Original:', responseText);
        console.log('Corrected:', correctedResponse);
      }
      
      console.log('%c✅ RESPONSE SUMMARY', 'background: #007100; color: white; padding: 2px 4px; border-radius: 2px;');
      console.log('Response Source:', responseDataSource);
      console.log('Response Text:', filteredResponse);
      console.log('Is Follow-up:', isFollowUp);
      
      return {
        response: filteredResponse,
        conversationId: response.data.conversation_id || conversationId,
        contextId: response.data.context_id || null,
        metadata: {
          ...response.data.metadata || {},
          responseSource: responseDataSource,
          wasFollowUp: isFollowUp
        },
        matches: response.data.matches || []
      };
      
    } catch (error) {
      console.error('%c❌ ERROR DURING API REQUEST', 'background: #800000; color: white; padding: 2px 4px; border-radius: 2px;');
      console.error('Error Details:', error);
      
      // Default error message
      let errorMessage = 'Sorry, there was an error processing your request. Please try again.';
      
      // Check if it's an Axios error with response data
      if (axios.isAxiosError(error) && error.response) {
        console.error('Server responded with error:', error.response.status, error.response.data);
        
        // Use server error message if available
        if (error.response.data && error.response.data.error) {
          errorMessage = `Error: ${error.response.data.error}`;
        }
      }
      
      // Apply knowledge correction even to error messages if they contain useful information
      const correctedErrorMessage = correctFactualErrors(errorMessage, query);
      
      return {
        response: correctedErrorMessage,
        conversationId: conversationId,
        contextId: null,
        metadata: {
          responseSource: 'error',
          wasFollowUp: false,
          error: true
        }
      };
    }
  }
};

// Helper function to extract more specific attribute details from the original query
function getAttributeDetail(originalQuery: string | null, attribute: string, language: 'en' | 'ar'): string {
  if (!originalQuery) return attribute;
  
  // For fees, check if it mentions specific types of fees
  if (attribute === 'fees') {
    if (language === 'en') {
      if (originalQuery.toLowerCase().includes('credit hour fees')) return 'credit hour fees';
      if (originalQuery.toLowerCase().includes('tuition fees')) return 'tuition fees';
      if (originalQuery.toLowerCase().includes('application fees')) return 'application fees';
      return 'fees';
    } else {
      if (originalQuery.includes('رسوم الساعة المعتمدة')) return 'رسوم الساعة المعتمدة';
      if (originalQuery.includes('رسوم الدراسة')) return 'رسوم الدراسة';
      if (originalQuery.includes('رسوم التقديم')) return 'رسوم التقديم';
      return 'رسوم';
    }
  }
  
  // For other attributes, use default values
  const defaultLabels: Record<string, Record<'en' | 'ar', string>> = {
    requirements: {
      en: 'admission requirements',
      ar: 'متطلبات القبول'
    },
    duration: {
      en: 'program duration',
      ar: 'مدة البرنامج'
    },
    courses: {
      en: 'courses',
      ar: 'المساقات'
    },
    application: {
      en: 'application',
      ar: 'التقديم'
    }
  };
  
  return defaultLabels[attribute]?.[language] || attribute;
} 