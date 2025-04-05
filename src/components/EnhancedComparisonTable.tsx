import React, { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend 
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface TableData {
  headers: string[];
  rows: {
    criteria: string;
    option1: string | number;
    option2: string | number;
    isNumeric?: boolean;
  }[];
}

interface EnhancedComparisonTableProps {
  markdownTable: string;
  programNames?: string[];
  animate?: boolean;
  theme?: 'light' | 'dark';
}

const parseMarkdownTable = (markdown: string): TableData => {
  console.log("Parsing markdown table:", markdown);
  
  // Split the markdown table into lines
  const lines = markdown
    .trim()
    .split('\n')
    .filter(line => line.trim().length > 0);
  
  // Ensure we have at least a header, separator, and one row
  if (lines.length < 3) {
    console.error("Invalid markdown table format - not enough lines");
    return { headers: [], rows: [] };
  }
  
  // Extract header row and parse columns
  const headerRow = lines[0];
  const headerMatch = headerRow.match(/\|([^|]+)\|([^|]+)\|([^|]+)\|/);
  
  if (!headerMatch) {
    console.error("Failed to parse header row:", headerRow);
    return { headers: [], rows: [] };
  }
  
  // Extract headers from the match
  const headers = [
    headerMatch[1].trim(), // Criteria column
    headerMatch[2].trim(), // Option 1 column
    headerMatch[3].trim()  // Option 2 column
  ].filter(h => h.length > 0);
  
  // Parse data rows (skip header and separator rows)
  const dataRows = lines.slice(2);
  const rows: {
    criteria: string;
    option1: string | number;
    option2: string | number;
    isNumeric?: boolean;
  }[] = [];
  
  dataRows.forEach(row => {
    const cellMatch = row.match(/\|([^|]+)\|([^|]+)\|([^|]+)\|/);
    if (cellMatch) {
      // Extract and trim each cell
      const criteria = cellMatch[1].trim();
      let option1 = cellMatch[2].trim();
      let option2 = cellMatch[3].trim();
      
      // Check if we have numeric values
      const numericValueRegex = /\d+\s*(NIS|%|years|سنوات)/i;
      const isNumeric = numericValueRegex.test(option1) || numericValueRegex.test(option2);
      
      // Replace placeholders with user-friendly text
      if (
        option1 === "[Data Missing]" || 
        option1 === "[بيانات مفقودة]" || 
        option1 === "[Data Not Provided]" || 
        option1 === "Not specified" || 
        option1 === "غير محدد"
      ) {
        option1 = "Contact advisor";
      }
      
      if (
        option2 === "[Data Missing]" || 
        option2 === "[بيانات مفقودة]" || 
        option2 === "[Data Not Provided]" || 
        option2 === "Not specified" || 
        option2 === "غير محدد"
      ) {
        option2 = "Contact advisor";
      }
      
      rows.push({
        criteria,
        option1,
        option2,
        isNumeric
      });
    }
  });
  
  console.log("Parsed table data:", { headers, rows });
  return { headers, rows };
};

export const EnhancedComparisonTable: React.FC<EnhancedComparisonTableProps> = ({ 
  markdownTable, 
  programNames = ['Option 1', 'Option 2'],
  animate = true,
  theme = 'light'
}) => {
  const [tableData, setTableData] = useState<TableData>({ headers: [], rows: [] });
  const [activeTab, setActiveTab] = useState<'table' | 'chart'>('table');
  const [isRTL, setIsRTL] = useState(false);
  const [animationComplete, setAnimationComplete] = useState(!animate);
  
  useEffect(() => {
    // Parse markdown table into structured data
    console.log("EnhancedComparisonTable: Processing markdown table", {
      length: markdownTable?.length || 0,
      markdownTable: markdownTable?.substring(0, 100) + '...',
      programNames
    });
    
    try {
      const parsed = parseMarkdownTable(markdownTable);
      
      console.log("EnhancedComparisonTable: Successfully parsed table data", {
        headers: parsed.headers,
        rowCount: parsed.rows.length,
        numericRows: parsed.rows.filter(r => r.isNumeric).length,
        missingDataCount: parsed.rows.filter(r => 
          r.option1 === 'Contact advisor' || 
          r.option2 === 'Contact advisor'
        ).length
      });
      
      setTableData(parsed);
      
      // Check if the table contains Arabic text to set RTL
      const containsArabic = /[\u0600-\u06FF]/.test(markdownTable);
      setIsRTL(containsArabic);
      
      if (containsArabic) {
        console.log("EnhancedComparisonTable: Detected Arabic content, setting RTL");
      }
    } catch (error) {
      console.error("EnhancedComparisonTable: Error parsing markdown table", error);
    }
    
    // Animate the table appearing if animate is true
    if (animate) {
      setTimeout(() => setAnimationComplete(true), 500);
    }
  }, [markdownTable, animate, programNames]);
  
  // Create chart data for numeric values
  const getChartData = () => {
    try {
      const numericRows = tableData.rows.filter(row => row.isNumeric);
      console.log("EnhancedComparisonTable: Creating chart data", {
        numericRows: numericRows.length
      });
      
      return {
        labels: numericRows.map(row => row.criteria),
        datasets: [
          {
            label: programNames[0],
            data: numericRows.map(row => {
              if (typeof row.option1 === 'number') {
                return row.option1;
              }
              // Try to extract numeric value if it's a string
              if (typeof row.option1 === 'string') {
                const match = row.option1.match(/\d+(\.\d+)?/);
                if (match) {
                  return parseFloat(match[0]);
                }
              }
              return 0;
            }),
            backgroundColor: 'rgba(231, 84, 128, 0.7)',
            borderColor: 'rgba(231, 84, 128, 1)',
            borderWidth: 1,
          },
          {
            label: programNames[1],
            data: numericRows.map(row => {
              if (typeof row.option2 === 'number') {
                return row.option2;
              }
              // Try to extract numeric value if it's a string
              if (typeof row.option2 === 'string') {
                const match = row.option2.match(/\d+(\.\d+)?/);
                if (match) {
                  return parseFloat(match[0]);
                }
              }
              return 0;
            }),
            backgroundColor: 'rgba(53, 162, 235, 0.7)',
            borderColor: 'rgba(53, 162, 235, 1)',
            borderWidth: 1,
          },
        ],
      };
    } catch (error) {
      console.error("EnhancedComparisonTable: Error generating chart data", error);
      return { labels: [], datasets: [] };
    }
  };
  
  // Chart options
  const chartOptions = {
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.03)',
        },
        ticks: {
          color: '#666',
          font: {
            size: 11
          }
        }
      },
      y: {
        grid: {
          display: false
        },
        ticks: {
          color: '#666',
          font: {
            size: 11
          }
        }
      }
    },
    plugins: {
      legend: {
        position: 'top' as const,
        align: 'end' as const,
        labels: {
          boxWidth: 10,
          padding: 15,
          usePointStyle: true,
          pointStyle: 'circle',
          font: {
            size: 11,
            family: "'Inter', sans-serif"
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        titleColor: '#333',
        bodyColor: '#333',
        borderColor: 'rgba(231, 84, 128, 0.2)',
        borderWidth: 1,
        padding: 10,
        boxPadding: 5,
        cornerRadius: 6,
        titleFont: {
          size: 12,
          weight: 'bold' as const
        },
        bodyFont: {
          size: 11
        },
        callbacks: {
          label: function(context: any) {
            const label = context.dataset.label || '';
            const value = context.raw;
            return `${label}: ${value}`;
          }
        }
      }
    },
  };

  // Styles based on theme
  const themeStyles = theme === 'dark' ? {
    backgroundColor: '#1f2937',
    color: '#f3f4f6',
    borderColor: '#4b5563'
  } : {
    backgroundColor: '#ffffff',
    color: '#1f2937',
    borderColor: '#e5e7eb'
  };
  
  // Check if we have numeric data for charts
  const hasNumericData = tableData.rows.some(row => row.isNumeric);
  
  return (
    <div 
      className={`enhanced-comparison-table ${isRTL ? 'rtl' : 'ltr'} rounded-lg shadow-sm overflow-hidden transition-all duration-500 ${animationComplete ? 'opacity-100' : 'opacity-0 transform translate-y-4'}`}
      style={{ 
        ...themeStyles, 
        maxWidth: '100%',
        border: '1px solid #f0f0f0',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)'
      }}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Header with title and toggle buttons */}
      <div className="p-3 bg-[#ffd8e1] text-gray-700 flex justify-between items-center">
        <h3 className="text-base font-semibold">{programNames[0]} vs {programNames[1]} Programs</h3>
        
        {/* Toggle buttons */}
        <div className="flex space-x-1">
          <button 
            className={`px-3 py-1 text-xs rounded ${activeTab === 'table' ? 'bg-white text-gray-700 font-medium shadow-sm' : 'bg-transparent text-gray-600'}`}
            onClick={() => setActiveTab('table')}
          >
            Table
          </button>
          <button 
            className={`px-3 py-1 text-xs rounded ${activeTab === 'chart' ? 'bg-white text-gray-700 font-medium shadow-sm' : 'bg-transparent text-gray-600'}`}
            onClick={() => setActiveTab('chart')}
          >
            Chart
          </button>
        </div>
      </div>
      
      {/* Table View */}
      {activeTab === 'table' && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#f9f0f2]">
                {tableData.headers.map((header, index) => (
                  <th 
                    key={index} 
                    className="p-3 text-left font-semibold text-gray-700"
                    style={{ borderBottom: '1px solid #f0f0f0' }}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableData.rows.map((row, rowIndex) => (
                <tr 
                  key={rowIndex} 
                  className={`hover:bg-[#fcf6f8] transition-colors ${rowIndex % 2 === 0 ? 'bg-white' : 'bg-[#fcfcfc]'}`}
                >
                  <td 
                    className="p-3 font-medium text-gray-700"
                    style={{ borderBottom: '1px solid #f0f0f0' }}
                  >
                    {row.criteria}
                  </td>
                  <td 
                    className="p-3 text-gray-700"
                    style={{ borderBottom: '1px solid #f0f0f0' }}
                  >
                    <div className="flex items-center">
                      {row.isNumeric && (
                        <div 
                          className="w-2 h-2 rounded-full bg-[#e75480] mr-2"
                          style={{ boxShadow: '0 0 2px rgba(231, 84, 128, 0.4)' }}
                        />
                      )}
                      {row.option1 === 'Contact advisor' ? (
                        <div className="flex items-center text-orange-500">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Contact advisor
                        </div>
                      ) : (
                        row.option1
                      )}
                    </div>
                  </td>
                  <td 
                    className="p-3 text-gray-700"
                    style={{ borderBottom: '1px solid #f0f0f0' }}
                  >
                    <div className="flex items-center">
                      {row.isNumeric && (
                        <div 
                          className="w-2 h-2 rounded-full bg-[#35a2eb] mr-2"
                          style={{ boxShadow: '0 0 2px rgba(53, 162, 235, 0.4)' }}
                        />
                      )}
                      {row.option2 === 'Contact advisor' ? (
                        <div className="flex items-center text-orange-500">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Contact advisor
                        </div>
                      ) : (
                        row.option2
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Chart View */}
      {activeTab === 'chart' && (
        <div className="p-4 bg-white" style={{ height: '300px' }}>
          {hasNumericData ? (
            <Bar data={getChartData()} options={chartOptions} />
          ) : (
            <div className="flex h-full items-center justify-center text-gray-500">
              <div className="text-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <p className="text-sm">No numeric data available to display in chart format.</p>
                <p className="text-xs mt-2">Please refer to the table view for detailed comparison.</p>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Table Footer with Legend */}
      <div className="p-3 bg-[#f9f9f9] border-t flex justify-end items-center text-sm text-gray-500" style={{ borderTop: '1px solid #f0f0f0' }}>
        <div className="flex items-center mr-4">
          <div className="w-3 h-3 rounded-full bg-[#e75480] mr-1" />
          <span>{programNames[0]}</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 rounded-full bg-[#35a2eb] mr-1" />
          <span>{programNames[1]}</span>
        </div>
      </div>
    </div>
  );
};

export default EnhancedComparisonTable; 