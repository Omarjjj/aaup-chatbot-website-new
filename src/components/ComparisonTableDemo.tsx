import React, { useState } from 'react';
import EnhancedComparisonTable from './EnhancedComparisonTable';

const sampleMarkdownTable = `| Criteria | Computer Science | Information Technology |
|---------|-----------------|------------------------|
| Credit Hour Fees | 120 NIS | 110 NIS |
| Program Duration | 4 years | 3 years |
| Min. High School Average | 80% | 75% |
| Career Opportunities | Software Engineer, Data Scientist | System Admin, IT Support |
| Special Features | Research Focus | Practical Training |`;

const sampleArabicTable = `| المعيار | هندسة الحاسوب | نظم المعلومات |
|---------|-----------------|------------------------|
| رسوم الساعة المعتمدة | 120 شيكل | 110 شيكل |
| مدة البرنامج | 4 سنوات | 3 سنوات |
| الحد الأدنى لمعدل الثانوية | 80% | 75% |
| فرص العمل | مهندس برمجيات | مدير أنظمة |
| ميزات خاصة | التركيز على البحث | التدريب العملي |`;

export const ComparisonTableDemo: React.FC = () => {
  const [language, setLanguage] = useState<'en' | 'ar'>('en');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Enhanced Comparison Table Demo</h1>
      
      <div className="flex space-x-4 mb-6">
        <button 
          className={`px-4 py-2 rounded ${language === 'en' ? 'bg-[var(--aaup-red)] text-white' : 'bg-gray-200 text-gray-700'}`}
          onClick={() => setLanguage('en')}
        >
          English
        </button>
        <button 
          className={`px-4 py-2 rounded ${language === 'ar' ? 'bg-[var(--aaup-red)] text-white' : 'bg-gray-200 text-gray-700'}`}
          onClick={() => setLanguage('ar')}
        >
          Arabic
        </button>
        
        <div className="ml-auto">
          <button 
            className={`px-4 py-2 rounded ${theme === 'light' ? 'bg-[var(--aaup-red)] text-white' : 'bg-gray-200 text-gray-700'}`}
            onClick={() => setTheme('light')}
          >
            Light Theme
          </button>
          <button 
            className={`px-4 py-2 rounded ml-2 ${theme === 'dark' ? 'bg-[var(--aaup-red)] text-white' : 'bg-gray-200 text-gray-700'}`}
            onClick={() => setTheme('dark')}
          >
            Dark Theme
          </button>
        </div>
      </div>
      
      <div className={theme === 'dark' ? 'bg-gray-800 p-6 rounded-lg' : 'bg-white p-6 rounded-lg shadow'}>
        {language === 'en' ? (
          <EnhancedComparisonTable 
            markdownTable={sampleMarkdownTable}
            programNames={['Computer Science', 'Information Technology']}
            animate={true}
            theme={theme}
          />
        ) : (
          <div dir="rtl">
            <EnhancedComparisonTable 
              markdownTable={sampleArabicTable}
              programNames={['هندسة الحاسوب', 'نظم المعلومات']}
              animate={true}
              theme={theme}
            />
          </div>
        )}
      </div>
      
      <div className="mt-8 bg-gray-100 p-4 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Implementation Notes:</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>The table parses the markdown format and extracts structured data</li>
          <li>Numeric values (like fees, years, percentages) are detected automatically for visualization</li>
          <li>The chart view displays a comparison of all numeric values</li>
          <li>Tables automatically detect Right-to-Left content for Arabic</li>
          <li>Theming support allows for light/dark mode integration</li>
          <li>Responsive design works on mobile devices</li>
        </ul>
      </div>
    </div>
  );
};

export default ComparisonTableDemo; 