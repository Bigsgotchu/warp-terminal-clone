import React, { useEffect, useRef, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { 
  Card, 
  Typography, 
  Tabs, 
  Progress, 
  List, 
  Button, 
  Tooltip, 
  Tag, 
  Empty,
  Space,
  Badge,
  Divider
} from 'antd';
import {
  BarChartOutlined,
  ClockCircleOutlined,
  BulbOutlined,
  CloseOutlined,
  ThunderboltOutlined,
  ToolOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  ArrowRightOutlined,
  CodeOutlined
} from '@ant-design/icons';
import {
  selectCommandHistory,
  selectCommandPatterns,
  selectAIEnabled,
  analyzeCommandPatterns,
  clearCommandStats
} from '../../features/ai/aiSlice';
import './CommandStats.css';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

/**
 * @typedef {Object} CommandStat
 * @property {string} command - Command text
 * @property {number} count - Usage count
 * @property {number} percentage - Percentage of total commands
 * @property {string[]} [contexts] - Usage contexts
 */

/**
 * @typedef {Object} CommandPattern
 * @property {string} pattern - Pattern name/type
 * @property {string} suggestion - Suggested command
 * @property {string} description - Pattern description
 */

/**
 * @typedef {Object} CommandOptimization
 * @property {string} original - Original command
 * @property {string} optimized - Optimized version
 * @property {string} explanation - Explanation of the optimization
 * @property {string} [category] - Optimization category
 */

/**
 * CommandStats component displays command usage statistics and patterns
 * 
 * @param {Object} props Component props
 * @param {boolean} [props.isVisible=false] Whether the stats panel is visible
 * @param {Function} [props.onClose] Callback to close the stats panel
 * @returns {React.ReactElement|null} The command stats component or null if not visible
 */
const CommandStats = ({ isVisible = false, onClose }) => {
  const dispatch = useDispatch();
  const commandHistory = useSelector(selectCommandHistory);
  const commandPatterns = useSelector(selectCommandPatterns);
  const aiEnabled = useSelector(selectAIEnabled);
  
  const containerRef = useRef(null);
  const [activeTab, setActiveTab] = useState('usage');
  const [commandStats, setCommandStats] = useState([]);
  const [optimizations, setOptimizations] = useState([]);
  
  // Focus management - focus container when it becomes visible
  useEffect(() => {
    if (isVisible && containerRef.current) {
      containerRef.current.focus();
    }
  }, [isVisible]);
  
  // Generate command statistics when history changes
  useEffect(() => {
    if (commandHistory.length > 0) {
      // Calculate command frequencies
      const counts = {};
      let total = 0;
      
      commandHistory.forEach(cmd => {
        // Extract the base command (first word)
        const baseCmd = cmd.split(' ')[0];
        counts[baseCmd] = (counts[baseCmd] || 0) + 1;
        total++;
      });
      
      // Convert to array and sort by frequency
      const statsArray = Object.entries(counts).map(([command, count]) => ({
        command,
        count,
        percentage: Math.round((count / total) * 100)
      })).sort((a, b) => b.count - a.count);
      
      setCommandStats(statsArray.slice(0, 10)); // Top 10 commands
      
      // Trigger pattern analysis if patterns are empty
      if (commandPatterns.length === 0) {
        dispatch(analyzeCommandPatterns());
      }
    }
  }, [commandHistory, commandPatterns, dispatch]);
  
  // Generate optimization suggestions based on command history and patterns
  useEffect(() => {
    if (commandHistory.length > 0 && commandPatterns.length > 0) {
      // Sample optimization suggestions based on patterns
      const suggestions = [
        ...commandPatterns.map(pattern => ({
          original: pattern.pattern,
          optimized: pattern.suggestion,
          explanation: pattern.description,
          category: 'pattern'
        })),
        // Add more optimization types if available in your data model
      ];
      
      // Only keep unique optimizations
      const uniqueOptimizations = [];
      const seenOptimizations = new Set();
      
      suggestions.forEach(opt => {
        const key = `${opt.original}-${opt.optimized}`;
        if (!seenOptimizations.has(key)) {
          seenOptimizations.add(key);
          uniqueOptimizations.push(opt);
        }
      });
      
      setOptimizations(uniqueOptimizations);
    }
  }, [commandHistory, commandPatterns]);
  
  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Escape key to close stats
      if (e.key === 'Escape' && isVisible) {
        onClose?.();
      }
      
      // Tab key navigation between stats sections
      if (e.key === '1' && e.ctrlKey) {
        setActiveTab('usage');
      } else if (e.key === '2' && e.ctrlKey) {
        setActiveTab('patterns');
      } else if (e.key === '3' && e.ctrlKey) {
        setActiveTab('optimizations');
      }
    };
    
    if (isVisible) {
      window.addEventListener('keydown', handleKeyDown);
    }
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isVisible, onClose]);
  
  // Early return if not visible or AI is disabled
  if (!isVisible || !aiEnabled) {
    return null;
  }
  
  /**
   * Apply suggestion to current terminal input
   * @param {string} command Command to apply
   */
  const applySuggestion = (command) => {
    // This would be integrated with the terminal input
    // For now, just log the action
    console.log('Applying suggestion:', command);
    // In a real implementation, this would likely call a callback
    // that was passed in as a prop to update the terminal input
  };
  
  /**
   * Handle clearing stats data
   */
  const handleClearStats = () => {
    dispatch(clearCommandStats());
  };
  
  /**
   * Close the stats panel
   */
  const handleClose = () => {
    onClose?.();
  };
  
  return (
    <div 
      className="command-stats-container" 
      ref={containerRef}
      tabIndex={0}
      role="dialog"
      aria-labelledby="command-stats-title"
      aria-describedby="command-stats-desc"
    >
      <Card
        title={
          <div className="stats-header" id="command-stats-title">
            <BarChartOutlined />
            <span>Command Statistics</span>
            <Button 
              type="text" 
              icon={<CloseOutlined />} 
              onClick={handleClose}
              aria-label="Close stats"
              className="close-button"
            />
          </div>
        }
        className="stats-card"
        id="command-stats-desc"
      >
        <Paragraph className="stats-desc">
          Analysis of your command usage patterns and suggestions for optimization.
        </Paragraph>
        
        <Tabs 
          activeKey={activeTab}
          onChange={setActiveTab}
          className="stats-tabs"
        >
          {/* Usage Statistics Tab */}
          <TabPane 
            tab={
              <span>
                <BarChartOutlined /> Usage
              </span>
            } 
            key="usage"
          >
            <div className="command-usage-stats">
              {commandStats.length > 0 ? (
                <List
                  dataSource={commandStats}
                  renderItem={(item) => (
                    <List.Item className="usage-list-item">
                      <div className="command-usage-item">
                        <div className="command-name">
                          <CodeOutlined />
                          <Text code>{item.command}</Text>
                        </div>
                        <div className="usage-stats">
                          <div className="usage-count">
                            <Badge count={item.count} showZero style={{ backgroundColor: '#1890ff' }} />
                            <Text type="secondary">uses</Text>
                          </div>
                          <Progress 
                            percent={item.percentage} 
                            size="small" 
                            strokeColor="#1890ff"
                            showInfo={false}
                            className="usage-progress"
                          />
                          <Text className="usage-percent">{item.percentage}%</Text>
                        </div>
                      </div>
                    </List.Item>
                  )}
                />
              ) : (
                <Empty 
                  description="Not enough command history to generate statistics" 
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              )}
            </div>
          </TabPane>
          
          {/* Command Patterns Tab */}
          <TabPane 
            tab={
              <span>
                <ClockCircleOutlined /> Patterns
              </span>
            } 
            key="patterns"
          >
            <div className="command-patterns">
              {commandPatterns.length > 0 ? (
                <List
                  dataSource={commandPatterns}
                  renderItem={(pattern) => (
                    <List.Item className="pattern-list-item">
                      <div className="pattern-item">
                        <div className="pattern-header">
                          <Badge 
                            status="processing" 
                            text={pattern.pattern} 
                            className="pattern-badge"
                          />
                        </div>
                        <div className="pattern-content">
                          <div className="pattern-suggestion">
                            <Text code>{pattern.suggestion}</Text>
                            <Tooltip title="Apply this suggestion">
                              <Button 
                                type="text" 
                                size="small"
                                icon={<ArrowRightOutlined />}
                                onClick={() => applySuggestion(pattern.suggestion)}
                                aria-label={`Apply suggestion: ${pattern.suggestion}`}
                              />
                            </Tooltip>
                          </div>
                          <div className="pattern-description">
                            <Text type="secondary">{pattern.description}</Text>
                          </div>
                        </div>
                      </div>
                    </List.Item>
                  )}
                />
              ) : (
                <Empty 
                  description="No command patterns detected yet" 
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              )}
            </div>
          </TabPane>
          
          {/* Optimizations Tab */}
          <TabPane 
            tab={
              <span>
                <BulbOutlined /> Optimizations
              </span>
            } 
            key="optimizations"
          >
            <div className="command-optimizations">
              {optimizations.length > 0 ? (
                <List
                  dataSource={optimizations}
                  renderItem={(opt) => (
                    <List.Item className="optimization-list-item">
                      <div className="optimization-item">
                        <div className="optimization-header">
                          <Tag color="blue">{opt.category}</Tag>
                        </div>
                        <div className="optimization-content">
                          <div className="optimization-commands">
                            <div className="original-command">
                              <Text type="secondary">Original:</Text>
                              <Text code delete>{opt.original}</Text>
                            </div>
                            <ArrowRightOutlined className="optimization-arrow" />
                            <div className="optimized-command">
                              <Text type="secondary">Optimized:</Text>
                              <Text code>{opt.optimized}</Text>
                              <Tooltip title="Apply this optimization">
                                <Button 
                                  type="text" 
                                  size="small"
                                  icon={<CheckCircleOutlined />}
                                  onClick={() => applySuggestion(opt.optimized)}
                                  aria-label={`Apply optimization: ${opt.optimized}`}
                                />
                              </Tooltip>
                            </div>
                          </div>
                          <div className="optimization-explanation">
                            <BulbOutlined className="explanation-icon" />
                            <Text>{opt.explanation}</Text>
                          </div>
                        </div>
                      </div>
                    </List.Item>
                  )}
                />
              ) : (
                <Empty 
                  description="No optimization suggestions available" 
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              )}
            </div>
          </TabPane>
        </Tabs>
        
        <Divider />
        
        {/* Bottom action area */}
        <div className="stats-actions">
          <Button 
            onClick={handleClearStats}
            icon={<ToolOutlined />}
          >
            Reset Statistics
          </Button>
          
          {/* Keyboard shortcut hints */}
          <div className="keyboard-hint">
            <Tooltip title="Switch to Usage tab">
              <Tag color="default">Ctrl+1</Tag>
            </Tooltip>
            <Tooltip title="Switch to Patterns tab">
              <Tag color="default">Ctrl+2</Tag>
            </Tooltip>
            <Tooltip title="Switch to Optimizations tab">
              <Tag color="default">Ctrl+3</Tag>
            </Tooltip>
            <Tooltip title="Close stats">
              <Tag color="default">ESC</Tag>
            </Tooltip>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default React.memo(CommandStats);

