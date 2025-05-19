import React, { useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Spin, Card, Tag, Typography, Button, Tooltip } from 'antd';
import {
  CloseOutlined,
  InfoCircleOutlined,
  CodeOutlined,
  WarningOutlined
} from '@ant-design/icons';
import {
  selectCommandExplanation,
  selectIsExplaining,
  selectError,
  selectAIEnabled,
  clearExplanation
} from '../../features/ai/aiSlice';
import './CommandExplanation.css';

const { Title, Text, Paragraph } = Typography;

/**
 * CommandExplanation component displays AI-powered explanations of terminal commands
 * 
 * @typedef {Object} ExplanationExample
 * @property {string} command - Example command
 * @property {string} [description] - Description of the example
 * 
 * @typedef {Object} StructuredExplanation
 * @property {string} command - The command being explained
 * @property {string} purpose - Purpose of the command
 * @property {Object.<string, string>} [options] - Map of options/flags to their descriptions
 * @property {Array<ExplanationExample|string>} [examples] - List of example commands
 * @property {string} [warnings] - Optional warnings about the command
 * 
 * Supports both simple text explanations and structured explanations with:
 * - command details
 * - purpose
 * - options
 * - examples
 * 
 * @returns {React.ReactElement|null} The command explanation component or null if nothing to show
 */
const CommandExplanation = () => {
  const explanation = useSelector(selectCommandExplanation);
  const isExplaining = useSelector(selectIsExplaining);
  const aiEnabled = useSelector(selectAIEnabled);
  const error = useSelector(selectError);
  const dispatch = useDispatch();
  const containerRef = useRef(null);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Escape key to close explanation
      if (e.key === 'Escape' && explanation) {
        dispatch(clearExplanation());
      }
      
      // Ctrl+/ to toggle explanation (already handled elsewhere)
      if (e.key === '/' && e.ctrlKey) {
        e.preventDefault(); // Prevent browser's find function
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dispatch, explanation]);

  // Focus management - focus container when explanation appears
  useEffect(() => {
    if (explanation && containerRef.current) {
      containerRef.current.focus();
    }
  }, [explanation]);

  // Early return if nothing to show or AI is disabled
  if ((!explanation && !isExplaining && !error) || !aiEnabled) {
    return null;
  }

  /**
   * Handle closing the explanation
   */
  const handleClose = () => {
    dispatch(clearExplanation());
  };

  return (
    <div 
      className="command-explanation-container" 
      ref={containerRef}
      tabIndex={0}
      role="region"
      aria-label="Command explanation"
    >
      <Card 
        className="explanation-card"
        title={
          <div className="explanation-header">
            <InfoCircleOutlined />
            <span>Command Explanation</span>
            <Button 
              type="text" 
              icon={<CloseOutlined />} 
              onClick={handleClose}
              aria-label="Close explanation"
              className="close-button"
            />
          </div>
        }
        size="small"
      >
        {isExplaining ? (
          <div className="explanation-loading" aria-live="polite" aria-busy="true">
            <Spin size="small" />
            <Text>Generating explanation...</Text>
          </div>
        ) : error ? (
          <div className="explanation-error" role="alert">
            <WarningOutlined />
            <Text type="danger">Error: {error}</Text>
          </div>
        ) : (
          <div className="explanation-content">
            {typeof explanation === 'string' ? (
              /* Simple text explanation */
              <Paragraph>{explanation}</Paragraph>
            ) : (
              /* Structured explanation */
              <div className="structured-explanation">
                {/* Command */}
                <div className="command-section">
                  <Title level={5}>Command</Title>
                  <div className="command-code">
                    <CodeOutlined />
                    <Text code>{explanation.command}</Text>
                  </div>
                </div>
                
                {/* Purpose */}
                <div className="purpose-section">
                  <Title level={5}>Purpose</Title>
                  <Paragraph>{explanation.purpose}</Paragraph>
                </div>
                
                {/* Options - if present */}
                {explanation.options && Object.keys(explanation.options).length > 0 && (
                  <div className="options-section">
                    <Title level={5}>Options</Title>
                    <ul className="options-list">
                      {Object.entries(explanation.options).map(([option, desc], index) => (
                        <li key={index} className="option-item">
                          <Tag color="blue">{option}</Tag>
                          <Text>{desc}</Text>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {/* Examples - if present */}
                {explanation.examples && explanation.examples.length > 0 && (
                  <div className="examples-section">
                    <Title level={5}>Examples</Title>
                    <ul className="examples-list">
                      {explanation.examples.map((example, index) => (
                        <li key={index} className="example-item">
                          <Text code>{example.command || example}</Text>
                          {example.description && (
                            <Text type="secondary"> - {example.description}</Text>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
            
            {/* Keyboard shortcut hint */}
            <div className="keyboard-hint">
              <Tooltip title="Close explanation">
                <Tag color="default">ESC</Tag>
              </Tooltip>
              <Tooltip title="Show/hide explanation">
                <Tag color="default">Ctrl+/</Tag>
              </Tooltip>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default React.memo(CommandExplanation);
