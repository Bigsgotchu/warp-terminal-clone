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
  Divider,
  Select,
  Input,
  DatePicker,
  Modal,
  Radio
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
  CodeOutlined,
  ExportOutlined,
  FilterOutlined,
  SearchOutlined,
  PieChartOutlined,
  LineChartOutlined,
  CalendarOutlined,
  SaveOutlined
} from '@ant-design/icons';
import {
  selectCommandHistory,
  selectCommandPatterns,
  selectAIEnabled,
  analyzeCommandPatterns,
  clearCommandStats,
  setCurrentTerminalInput
} from '../../features/ai/aiSlice';
import { Chart, registerables } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import './CommandStats.css';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;
const { RangePicker } = DatePicker;

// Register Chart.js components
Chart.register(...registerables);

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
  
  // New state variables for enhanced features
  const [timeFilter, setTimeFilter] = useState('all'); // all, week, month
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredStats, setFilteredStats] = useState([]);
  const [filteredPatterns, setFilteredPatterns] = useState([]);
  const [filteredOptimizations, setFilteredOptimizations] = useState([]);
  const [isExportModalVisible, setIsExportModalVisible] = useState(false);
  const [exportFormat, setExportFormat] = useState('json');
  const [chartType, setChartType] = useState('pie'); // pie, bar
  
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
  
  // Apply filtering when filter settings or command data changes
  useEffect(() => {
    // Apply time filter
    let timeFilteredHistory = [...commandHistory];
    const now = new Date();
    
    if (timeFilter === 'week') {
      // Filter to last 7 days
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      timeFilteredHistory = commandHistory.filter(cmd => {
        // Assuming command history items have a timestamp property
        const cmdDate = new Date(cmd.timestamp || now);
        return cmdDate >= weekAgo;
      });
    } else if (timeFilter === 'month') {
      // Filter to last 30 days
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      timeFilteredHistory = commandHistory.filter(cmd => {
        const cmdDate = new Date(cmd.timestamp || now);
        return cmdDate >= monthAgo;
      });
    }
    
    // Apply search filter to the time-filtered data
    const applySearchFilter = (items, getSearchableText) => {
      if (!searchQuery) return items;
      return items.filter(item => 
        getSearchableText(item).toLowerCase().includes(searchQuery.toLowerCase())
      );
    };
    
    // Filter stats
    const filteredStatsData = applySearchFilter(
      commandStats, 
      item => item.command
    );
    setFilteredStats(filteredStatsData);
    
    // Filter patterns
    const filteredPatternsData = applySearchFilter(
      commandPatterns, 
      pattern => `${pattern.pattern} ${pattern.suggestion} ${pattern.description}`
    );
    setFilteredPatterns(filteredPatternsData);
    
    // Filter optimizations
    const filteredOptimizationsData = applySearchFilter(
      optimizations, 
      opt => `${opt.original} ${opt.optimized} ${opt.explanation} ${opt.category}`
    );
    setFilteredOptimizations(filteredOptimizationsData);
    
  }, [timeFilter, searchQuery, commandHistory, commandStats, commandPatterns, optimizations]);
  
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
    // Update the terminal input with the suggested command
    dispatch(setCurrentTerminalInput(command));
    
    // Optionally close the stats panel
    handleClose();
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
  
  /**
   * Handle exporting command statistics
   */
  const handleExport = () => {
    setIsExportModalVisible(true);
  };
  
  /**
   * Export the command statistics in the selected format
   */
  const performExport = () => {
    let exportData;
    let fileName;
    let fileContent;
    
    // Prepare export data based on active tab
    switch (activeTab) {
      case 'usage':
        exportData = commandStats;
        fileName = 'command-usage-stats';
        break;
      case 'patterns':
        exportData = commandPatterns;
        fileName = 'command-patterns';
        break;
      case 'optimizations':
        exportData = optimizations;
        fileName = 'command-optimizations';
        break;
      default:
        exportData = {
          usage: commandStats,
          patterns: commandPatterns,
          optimizations: optimizations
        };
        fileName = 'command-stats-all';
    }
    
    // Format based on selected export format
    switch (exportFormat) {
      case 'json':
        fileContent = JSON.stringify(exportData, null, 2);
        fileName += '.json';
        break;
      case 'csv':
        // Simple CSV conversion - can be enhanced for more complex data
        const headers = Object.keys(exportData[0] || {}).join(',');
        const rows = exportData.map(item => 
          Object.values(item).map(val => 
            typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val
          ).join(',')
        );
        fileContent = [headers, ...rows].join('\n');
        fileName += '.csv';
        break;
      case 'txt':
        // Simple text format
        fileContent = exportData.map(item => 
          Object.entries(item)
            .map(([key, val]) => `${key}: ${val}`)
            .join('\n')
        ).join('\n\n');
        fileName += '.txt';
        break;
      default:
        fileContent = JSON.stringify(exportData);
        fileName += '.json';
    }
    
    // Create and trigger download
    const blob = new Blob([fileContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
    
    // Close modal
    setIsExportModalVisible(false);
  };
  
  /**
   * Prepare chart data for visualization
   */
  const getChartData = () => {
    const stats = filteredStats.length > 0 ? filteredStats : commandStats;
    
    // Generate colors
    const generateColors = (count) => {
      const baseColors = [
        'rgba(54, 162, 235, 0.8)',
        'rgba(255, 99, 132, 0.8)',
        'rgba(255, 206, 86, 0.8)',
        'rgba(75, 192, 192, 0.8)',
        'rgba(153, 102, 255, 0.8)',
        'rgba(255, 159, 64, 0.8)',
        'rgba(199, 199, 199, 0.8)',
        'rgba(83, 102, 255, 0.8)',
        'rgba(40, 159, 64, 0.8)',
        'rgba(210, 199, 199, 0.8)',
      ];
      
      // If we need more colors than in our base set, generate them
      if (count > baseColors.length) {
        for (let i = baseColors.length; i < count; i++) {
          const r = Math.floor(Math.random() * 255);
          const g = Math.floor(Math.random() * 255);
          const b = Math.floor(Math.random() * 255);
          baseColors.push(`rgba(${r}, ${g}, ${b}, 0.8)`);
        }
      }
      
      return baseColors.slice(0, count);
    };
    
    const backgroundColor = generateColors(stats.length);
    const borderColor = backgroundColor.map(color => color.replace('0.8', '1'));
    
    return {
      labels: stats.map(item => item.command),
      datasets: [
        {
          label: 'Command Usage',
          data: stats.map(item => item.count),
          backgroundColor,
          borderColor,
          borderWidth: 1,
        },
      ],
    };
  };
  
  /**
   * Get chart options based on chart type
   */
  const getChartOptions = () => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            color: 'rgba(255, 255, 255, 0.8)'
          }
        },
        title: {
          display: true,
          text: 'Command Usage Distribution',
          color: 'rgba(255, 255, 255, 0.9)',
          font: {
            size: 16
          }
        }
      }
    };
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
        
        {/* Search and filter controls */}
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

