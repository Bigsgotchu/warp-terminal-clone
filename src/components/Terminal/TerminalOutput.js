import React, { useCallback, useRef, useEffect, memo } from 'react';
import { Typography, List } from 'antd';
import './TerminalOutput.css';

const { Text } = Typography;

/**
 * Parse ANSI color codes in terminal output and convert to styled elements
 * @param {string} text - The text containing ANSI escape sequences
 * @returns {Array} - Array of parsed text segments with style information
 */
const parseAnsiColorCodes = (text) => {
  // ANSI color code map to CSS classes
  const colorMap = {
    // Regular colors (30-37)
    '\u001b[30m': 'ansi-black',
    '\u001b[31m': 'ansi-red',
    '\u001b[32m': 'ansi-green',
    '\u001b[33m': 'ansi-yellow',
    '\u001b[34m': 'ansi-blue',
    '\u001b[35m': 'ansi-magenta',
    '\u001b[36m': 'ansi-cyan',
    '\u001b[37m': 'ansi-white',
    
    // Bright colors (90-97)
    '\u001b[90m': 'ansi-bright-black',
    '\u001b[91m': 'ansi-bright-red',
    '\u001b[92m': 'ansi-bright-green',
    '\u001b[93m': 'ansi-bright-yellow',
    '\u001b[94m': 'ansi-bright-blue',
    '\u001b[95m': 'ansi-bright-magenta',
    '\u001b[96m': 'ansi-bright-cyan',
    '\u001b[97m': 'ansi-bright-white',
    
    // Background colors (40-47)
    '\u001b[40m': 'ansi-bg-black',
    '\u001b[41m': 'ansi-bg-red',
    '\u001b[42m': 'ansi-bg-green',
    '\u001b[43m': 'ansi-bg-yellow',
    '\u001b[44m': 'ansi-bg-blue',
    '\u001b[45m': 'ansi-bg-magenta',
    '\u001b[46m': 'ansi-bg-cyan',
    '\u001b[47m': 'ansi-bg-white',
    
    // Bright background colors (100-107)
    '\u001b[100m': 'ansi-bg-bright-black',
    '\u001b[101m': 'ansi-bg-bright-red',
    '\u001b[102m': 'ansi-bg-bright-green',
    '\u001b[103m': 'ansi-bg-bright-yellow',
    '\u001b[104m': 'ansi-bg-bright-blue',
    '\u001b[105m': 'ansi-bg-bright-magenta',
    '\u001b[106m': 'ansi-bg-bright-cyan',
    '\u001b[107m': 'ansi-bg-bright-white',
    
    // Text styles
    '\u001b[1m': 'terminal-bold',
    '\u001b[3m': 'terminal-italic',
    '\u001b[4m': 'terminal-underline',
    
    // Reset
    '\u001b[0m': 'ansi-reset',
  };
  
  // Regular expression to match ANSI escape sequences
  const ansiRegex = /\u001b\[\d+m/g;
  
  // If no ANSI codes, return the original text
  if (!text.includes('\u001b[')) {
    return [{ text, className: '' }];
  }
  
  // Split the text by ANSI escape codes
  const parts = text.split(ansiRegex);
  
  // Extract all ANSI codes that were found
  const codes = text.match(ansiRegex) || [];
  
  // Start with no active styles
  let activeStyles = [];
  const result = [];
  
  // Process each part with its corresponding style
  parts.forEach((part, index) => {
    // Skip empty parts
    if (part === '') return;
    
    // Apply style from previous ANSI code
    if (index > 0 && codes[index - 1]) {
      const code = codes[index - 1];
      
      if (code === '\u001b[0m') {
        // Reset removes all active styles
        activeStyles = [];
      } else if (colorMap[code]) {
        // Add the new style class
        activeStyles.push(colorMap[code]);
      }
    }
    
    // Add this part with current active styles
    result.push({
      text: part,
      className: activeStyles.join(' ')
    });
  });
  
  return result;
};

/**
 * Process control sequences like newlines, tabs, etc.
 * @param {string} text - Raw terminal output 
 * @returns {string} - Processed text with HTML-safe replacements
 */
const processControlSequences = (text) => {
  return text
    // Replace tabs with spaces
    .replace(/\t/g, '    ')
    // Ensure carriage returns work correctly
    .replace(/\r\n/g, '\n')
    // Handle single carriage returns (move to start of line)
    .replace(/[^\n]\r/g, '\n');
};

/**
 * Terminal output component - displays output with ANSI color support
 */
const TerminalOutput = ({ output = [] }) => {
  const bottomRef = useRef(null);
  
  // Scroll to bottom whenever output changes
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'auto' });
    }
  }, [output]);
  
  // Get color for different output types
  const getOutputTypeStyle = useCallback((type) => {
    switch (type) {
      case 'stderr':
        return { color: '#ff4d4f', backgroundColor: 'rgba(255, 77, 79, 0.1)' };
      case 'command':
        return { color: '#1890ff', fontWeight: 'bold' };
      default:
        return {};
    }
  }, []);

  // Virtualized renderer for list items (performance optimization)
  const renderItem = useCallback((item, index) => {
    // For command output, render with special formatting
    if (item.type === 'command') {
      return (
        <div key={index} className="terminal-line terminal-command">
          <Text style={getOutputTypeStyle(item.type)}>
            {item.content}
          </Text>
        </div>
      );
    }
    
    // For error output, render with error styling
    if (item.type === 'stderr') {
      return (
        <div key={index} className="terminal-line terminal-error">
          <Text style={getOutputTypeStyle(item.type)}>
            {item.content}
          </Text>
        </div>
      );
    }
    
    // For standard output with ANSI color codes
    if (item.type === 'stdout' && item.content.includes('\u001b[')) {
      const processedText = processControlSequences(item.content);
      const parts = parseAnsiColorCodes(processedText);
      
      return (
        <div key={index} className="terminal-line">
          {parts.map((part, partIndex) => (
            <Text 
              key={`${index}-${partIndex}`} 
              className={part.className}
            >
              {part.text}
            </Text>
          ))}
        </div>
      );
    }
    
    // For standard output without ANSI codes
    return (
      <div key={index} className="terminal-line">
        <Text>
          {processControlSequences(item.content)}
        </Text>
      </div>
    );
  }, [getOutputTypeStyle]);

  // Use windowing for better performance with large outputs
  const renderOutput = useCallback(() => {
    // For small outputs, render directly
    if (output.length <= 1000) {
      return output.map(renderItem);
    }
    
    // For large outputs, use virtualized List
    return (
      <List
        itemLayout="horizontal"
        dataSource={output}
        renderItem={renderItem}
        virtual
        height={500}
      />
    );
  }, [output, renderItem]);

  return (
    <div className="terminal-output">
      {renderOutput()}
      <div ref={bottomRef} id="terminal-output-bottom" />
    </div>
  );
};

// Use memo for performance optimization
export default memo(TerminalOutput);

