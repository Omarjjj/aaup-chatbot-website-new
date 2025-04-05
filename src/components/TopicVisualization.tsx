import React, { useEffect, useRef } from 'react';
import { useChatStore } from '../store/chatStore';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';

interface Topic {
  name: string;
  confidence: number;
  lastDiscussed: number;
}

interface TopicTransition {
  from: string;
  to: string;
  timestamp: number;
  isExplicit?: boolean;
  confidenceDelta?: number;
}

const topicColors: Record<string, string> = {
  'admission': '#EF4444', // Red
  'academic': '#3B82F6', // Blue
  'financial': '#10B981', // Green
  'housing': '#8B5CF6', // Purple
  'student_life': '#F59E0B', // Amber
  'facilities': '#6366F1', // Indigo
  'general_university': '#9CA3AF', // Gray
};

const getTopicColor = (topic: string): string => {
  return topicColors[topic] || '#9CA3AF'; // Default to gray
};

const formatTimestamp = (timestamp: number): string => {
  const minutes = Math.floor((Date.now() - timestamp) / (1000 * 60));
  if (minutes < 1) return 'just now';
  if (minutes === 1) return '1 minute ago';
  if (minutes < 60) return `${minutes} minutes ago`;
  
  const hours = Math.floor(minutes / 60);
  if (hours === 1) return '1 hour ago';
  if (hours < 24) return `${hours} hours ago`;
  
  const days = Math.floor(hours / 24);
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
};

const TopicVisualization: React.FC<{
  topics: Topic[];
  transitions: TopicTransition[];
  currentTopic: string | null;
}> = ({ topics, transitions, currentTopic }) => {
  const { language } = useLanguage();
  
  // Sort topics by last discussed (most recent first)
  const sortedTopics = [...topics].sort((a, b) => b.lastDiscussed - a.lastDiscussed);
  
  // Filter to recent transitions (last 5)
  const recentTransitions = [...transitions]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 5);
  
  return (
    <div className="bg-white bg-opacity-10 backdrop-filter backdrop-blur-sm rounded-lg p-4 shadow-lg">
      <h3 className="text-lg font-semibold mb-3 text-gray-200">
        {language === 'en' ? 'Topic Analysis' : 'تحليل المواضيع'}
      </h3>
      
      {/* Current Topic */}
      {currentTopic && (
        <div className="mb-4">
          <span className="text-sm text-gray-300">
            {language === 'en' ? 'Current Topic:' : 'الموضوع الحالي:'}
          </span>
          <div className="flex items-center mt-1">
            <motion.div 
              className="h-4 w-4 rounded-full mr-2"
              style={{ backgroundColor: getTopicColor(currentTopic) }}
              initial={{ scale: 0.8 }}
              animate={{ scale: 1.2 }}
              transition={{ repeat: Infinity, repeatType: 'reverse', duration: 1 }}
            />
            <span className="text-white font-medium capitalize">
              {language === 'en' 
                ? currentTopic.replace(/_/g, ' ') 
                : translateTopic(currentTopic, 'ar')}
            </span>
          </div>
        </div>
      )}
      
      {/* Recent Topics */}
      {sortedTopics.length > 0 && (
        <div className="mb-4">
          <span className="text-sm text-gray-300 block mb-2">
            {language === 'en' ? 'Recent Topics:' : 'المواضيع الأخيرة:'}
          </span>
          <div className="flex flex-wrap gap-2">
            <AnimatePresence>
              {sortedTopics.map((topic) => (
                <motion.div
                  key={topic.name}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  whileHover={{ scale: 1.05 }}
                  className="px-2 py-1 rounded text-xs text-white flex items-center"
                  style={{ 
                    backgroundColor: getTopicColor(topic.name),
                    opacity: topic.name === currentTopic ? 1 : 0.7
                  }}
                >
                  <span className="capitalize">
                    {language === 'en' 
                      ? topic.name.replace(/_/g, ' ') 
                      : translateTopic(topic.name, 'ar')}
                  </span>
                  <span className="ml-1 text-white text-opacity-80 text-xs">
                    ({Math.round(topic.confidence * 100)}%)
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}
      
      {/* Topic Transitions */}
      {recentTransitions.length > 0 && (
        <div>
          <span className="text-sm text-gray-300 block mb-2">
            {language === 'en' ? 'Topic Transitions:' : 'انتقالات الموضوع:'}
          </span>
          <div className="space-y-2">
            {recentTransitions.map((transition, index) => (
              <motion.div
                key={`${transition.from}-${transition.to}-${transition.timestamp}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center text-xs text-gray-200"
              >
                <span className="capitalize" style={{ color: getTopicColor(transition.from) }}>
                  {language === 'en' 
                    ? transition.from.replace(/_/g, ' ') 
                    : translateTopic(transition.from, 'ar')}
                </span>
                <svg 
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24" 
                  className="h-3 w-3 mx-1 text-gray-400"
                >
                  <path 
                    fill="currentColor" 
                    d="M13.59 12l4.2-4.2c.29-.29.29-.77 0-1.06-.29-.29-.77-.29-1.06 0l-4.2 4.2-4.2-4.2c-.29-.29-.77-.29-1.06 0-.29.29-.29.77 0 1.06l4.2 4.2-4.2 4.2c-.29.29-.29.77 0 1.06.15.15.34.22.53.22s.38-.07.53-.22l4.2-4.2 4.2 4.2c.15.15.34.22.53.22s.38-.07.53-.22c.29-.29.29-.77 0-1.06l-4.2-4.2z"
                  />
                </svg>
                <span className="capitalize" style={{ color: getTopicColor(transition.to) }}>
                  {language === 'en' 
                    ? transition.to.replace(/_/g, ' ') 
                    : translateTopic(transition.to, 'ar')}
                </span>
                <span className="ml-2 text-gray-400">
                  {formatTimestamp(transition.timestamp)}
                </span>
                {transition.isExplicit && (
                  <span className="ml-1 text-yellow-400">
                    {language === 'en' ? '(explicit)' : '(صريح)'}
                  </span>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Helper to translate topic names to Arabic
function translateTopic(topic: string, targetLang: 'ar' | 'en'): string {
  if (targetLang === 'en') return topic;
  
  const translations: Record<string, string> = {
    'admission': 'القبول',
    'academic': 'الأكاديمية',
    'financial': 'المالية',
    'housing': 'السكن',
    'student_life': 'حياة الطلاب',
    'facilities': 'المرافق',
    'general_university': 'الجامعة العامة'
  };
  
  return translations[topic] || topic;
}

export default TopicVisualization; 