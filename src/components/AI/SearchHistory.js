import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Card,
  Input,
  Button,
  List,
  Typography,
  Tag,
  Spin,
  Empty,
  Alert,
  Space,
  Badge,
  Tooltip,
  Divider,
  Progress,
  Select,
  Slider,
  Switch,
  Radio,
  Collapse,
  Popover
} from 'antd';
import {
  SearchOutlined,
  CloseOutlined,
  HistoryOutlined,
  ClockCircleOutlined,
  FolderOutlined,
  ArrowRightOutlined,
  DownloadOutlined,
  InfoCircleOutlined,
  CloudOfflineOutlined,
  CodeOutlined,
  FilterOutlined,
  CheckCircleOutlined,
  QuestionCircleOutlined,
  SettingOutlined,
  SyncOutlined,
  CloudOutlined,
  StarOutlined,
  CalendarOutlined,
  TagsOutlined
} from '@ant-design/icons';
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import bash from 'react-syntax-highlighter/dist/esm/languages/hljs/bash';
import { atomOneDark } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import {
  searchCommandHistory,
  setSearchQuery,
  clearSearchResults,
  selectSearchHistory,
  selectIsSearching,
  selectSearchQuery,
  selectAIEnabled,
  selectAISettings,
  selectTerminalHistory
} from '../../features/ai/aiSlice';
import { SmartHistorySearch } from '../../services/ai/SmartHistorySearch';
import debounce from 'lodash/debounce';
import './SearchHistory.css';
// Register syntax highlighting for bash
SyntaxHighlighter.registerLanguage('bash', bash);

const { Title, Text, Paragraph } = Typography;
const { Search } = Input;
const { Panel } = Collapse;
const { Option } = Select;

/**
 * SearchHistory component for natural language search of command history
 * 
 * @param {Object} props Component props
 * @param {boolean} [props.isVisible=false] Whether the search panel is visible
 * @param {Function} [props.onClose] Callback to close the search panel
 * @param {Function} [props.onSelectCommand] Callback when a command is selected to run
 * @returns {React.ReactElement|null} The search history component or null if not visible
 */
const SearchHistory = ({ isVisible = false, onClose, onSelectCommand }) => {
  const dispatch = useDispatch();
  const searchHistory = useSelector(selectSearchHistory);
  const isSearching = useSelector(selectIsSearching);
  const searchQuery = useSelector(selectSearchQuery);
  const aiEnabled = useSelector(selectAIEnabled);
  const aiSettings = useSelector(selectAISettings);
  const terminalHistory = useSelector(selectTerminalHistory);
  
  // New state variables for enhanced search
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [filters, setFilters] = useState({
    timeframe: 'all',
    categories: [],
    currentDirOnly: false,
    minScore: 0.2
  });
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [localSearch, setLocalSearch] = useState(false);
  
  // References
  const searchInputRef = useRef(null);
  const resultsContainerRef = useRef(null);
  const smartHistorySearch = useRef(new SmartHistorySearch());
  
  // Focus search input when component becomes visible
  useEffect(() => {
    if (isVisible && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current.focus();
      }, 100);
    }
  }, [isVisible]);
  
  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(-1);
  }, [searchHistory.results]);
  
  // Apply filters to results
  useEffect(() => {
    if (!searchHistory.results || searchHistory.results.length === 0) {
      setSearchResults([]);
      return;
    }
    
    let filteredResults = [...searchHistory.results];
    
    // Apply timeframe filter
    if (filters.timeframe !== 'all') {
      const now = Date.now();
      const timeframeMap = {
        'today': 24 * 60 * 60 * 1000,
        'week': 7 * 24 * 60 * 60 * 1000,
        'month': 30 * 24 * 60 * 60 * 1000
      };
      
      const timeLimit = now - timeframeMap[filters.timeframe];
      filteredResults = filteredResults.filter(item => 
        item.metadata && item.metadata.timestamp && item.metadata.timestamp > timeLimit
      );
    }
    
    // Apply category filters
    if (filters.categories && filters.categories.length > 0) {
      filteredResults = filteredResults.filter(item => 
        filters.categories.includes(item.matchType)
      );
    }
    
    // Apply current directory filter
    if (filters.currentDirOnly) {
      const currentDir = window.terminalState?.currentDirectory || '~';
      filteredResults = filteredResults.filter(item => 
        item.metadata && item.metadata.directory === currentDir
      );
    }
    
    // Apply minimum score filter
    filteredResults = filteredResults.filter(item => 
      item.score >= filters.minScore
    );
    
    setSearchResults(filteredResults);
  }, [searchHistory.results, filters]);
  
  // Create debounced search function
  const debouncedSearch = useCallback(
    debounce((query) => {
      if (!query || query.trim() === '') {
        dispatch(clearSearchResults());
        return;
      }
      
      dispatch(searchCommandHistory(query));
    }, 300),
    [dispatch]
  );
  
  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isVisible) return;
      
      switch (e.key) {
        case 'Escape':
          onClose?.();
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (searchHistory.results.length > 0) {
            setSelectedIndex((prevIndex) => {
              const newIndex = Math.min(prevIndex + 1, searchHistory.results.length - 1);
              scrollToResult(newIndex);
              return newIndex;
            });
          }
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (searchHistory.results.length > 0) {
            setSelectedIndex((prevIndex) => {
              const newIndex = Math.max(prevIndex - 1, -1);
              scrollToResult(newIndex);
              return newIndex;
            });
          }
          break;
        case 'Enter':
          if (selectedIndex >= 0 && searchResults[selectedIndex]) {
            handleSelectCommand(searchResults[selectedIndex].command);
          }
          break;
        default:
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isVisible, searchResults, selectedIndex, onClose]);
  
  // Scroll to selected result
  const scrollToResult = (index) => {
    if (
      index >= 0 &&
      resultsContainerRef.current && 
      resultsContainerRef.current.children[index]
    ) {
      resultsContainerRef.current.children[index].scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      });
    }
  };
  
  // Handle search submission
  const handleSearch = (value) => {
    if (!value || value.trim() === '') {
      dispatch(clearSearchResults());
      return;
    }
    
    dispatch(searchCommandHistory(value));
  };
  
  // Handle real-time search input change
  const handleInputChange = (e) => {
    const value = e.target.value;
    dispatch(setSearchQuery(value));
    debouncedSearch(value);
  };
  
  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };
  
  // Toggle filters visibility
  const toggleFilters = () => {
    setFiltersVisible(!filtersVisible);
  };
  
  // Handle command selection
  const handleSelectCommand = (command) => {
    onSelectCommand?.(command);
    onClose?.();
  };
  
  // Handle clearing search
  const handleClearSearch = () => {
    dispatch(clearSearchResults());
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };
  
  // Early return if not visible
  if (!isVisible) {
    return null;
  }
  
  // Early return if AI is disabled
  if (!aiEnabled) {
    return (
      <div className="search-history-container">
        <Card
          title={
            <div className="search-header">
              <SearchOutlined />
              <span>Command History Search</span>
              <Button 
                type="text" 
                icon={<CloseOutlined />} 
                onClick={onClose}
                aria-label="Close search"
                className="close-button"
              />
            </div>
          }
          className="search-card"
        >
          <Alert
            message="AI Features Disabled"
            description="Enable AI features in settings to use natural language search."
            type="info"
            showIcon
          />
        </Card>
      </div>
    );
  }
  
  // Format timestamp for display
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + 
      ' ' + date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };
  
  // Format relevance score as percentage
  const formatScore = (score) => {
    return Math.round(score * 100) + '%';
  };
  
  // Render search results
  // Render command with syntax highlighting
  const renderCommand = (command) => {
    return (
      <SyntaxHighlighter
        language="bash"
        style={atomOneDark}
        customStyle={{
          padding: '8px',
          borderRadius: '4px',
          fontSize: '13px',
          margin: '0',
          backgroundColor: 'rgba(30, 30, 30, 0.6)'
        }}
      >
        {command}
      </SyntaxHighlighter>
    );
  };
  
  // Get badge color based on score
  const getScoreColor = (score) => {
    if (score >= 0.8) return '#52c41a';
    if (score >= 0.5) return '#1890ff';
    if (score >= 0.3) return '#faad14';
    return '#d9d9d9';
  };
  
  // Get match type badge color
  const getMatchTypeColor = (matchType) => {
    const typeColors = {
      'exact': '#52c41a',
      'prefix': '#1890ff',
      'substring': '#2db7f5',
      'semantic': '#722ed1',
      'git': '#f56a00',
      'network': '#108ee9',
      'filesystem': '#87d068',
      'process': '#f50',
      'docker': '#1890ff',
      'package': '#fa8c16'
    };
    
    return typeColors[matchType] || '#d9d9d9';
  };
  
  // Render filters panel
  const renderFilters = () => {
    return (
      <div className={`search-filters ${filtersVisible ? 'visible' : ''}`}>
        <div className="filters-header">
          <Text strong>Filter Results</Text>
          <Button
            type="text"
            size="small"
            icon={<CloseOutlined />}
            onClick={toggleFilters}
          />
        </div>
        
        <div className="filter-group">
          <Text>Time Period</Text>
          <Radio.Group
            value={filters.timeframe}
            onChange={e => handleFilterChange('timeframe', e.target.value)}
            className="filter-radio-group"
          >
            <Radio.Button value="all">All Time</Radio.Button>
            <Radio.Button value="today">Today</Radio.Button>
            <Radio.Button value="week">This Week</Radio.Button>
            <Radio.Button value="month">This Month</Radio.Button>
          </Radio.Group>
        </div>
        
        <div className="filter-group">
          <Text>Command Categories</Text>
          <Select
            mode="multiple"
            placeholder="Select categories"
            value={filters.categories}
            onChange={value =>
      if (searchQuery && searchQuery.trim() !== '') {
        return (
          <Empty 
            description="No matching commands found" 
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        );
      }
      
      return (
        <div className="search-instructions">
          <HistoryOutlined className="search-icon" />
          <Title level={4}>Search Your Command History</Title>
          <Paragraph>
            Use natural language to search for commands you've used before.
            Try searching for:
          </Paragraph>
          <ul className="search-examples">
            <li>File operations from last week</li>
            <li>Network commands I used</li>
            <li>Git commands in the project directory</li>
            <li>Docker commands with volume mounts</li>
          </ul>
        </div>
      );
    }
    
    return (
      <List
        className="search-results-list"
        itemLayout="vertical"
        dataSource={searchHistory.results}
        renderItem={(item, index) => (
          <List.Item
            key={`${item.command}-${index}`}
            className={`search-result-item ${selectedIndex === index ? 'selected' : ''}`}
            onClick={() => handleSelectCommand(item.command)}
            onMouseEnter={() => setSelectedIndex(index)}
          >
            <div className="result-content">
              <div className="result-command">
                <CodeOutlined className="command-icon" />
                <Text code>{item.command}</Text>
              </div>
              
              <div className="result-metadata">
                <div className="metadata-item">
                  <Tooltip title="Relevance Score">
                    <Progress 
                      percent={Math.round(item.score * 100)} 
                      size="small" 
                      showInfo={false}
                      className="relevance-score"
                    />
                    <Badge 
                      count={formatScore(item.score)} 
                      style={{ backgroundColor: '#52c41a' }}
                    />
                  </Tooltip>
                </div>
                
                {item.metadata?.timestamp && (
                  <div className="metadata-item">
                    <ClockCircleOutlined />
                    <Text type="secondary">{formatTimestamp(item.metadata.timestamp)}</Text>
                  </div>
                )}
                
                {item.metadata?.directory && (
                  <div className="metadata-item">
                    <FolderOutlined />
                    <Text type="secondary">{item.metadata.directory}</Text>
                  </div>
                )}
                
                {item.matchType && (
                  <Tag color="blue">{item.matchType}</Tag>
                )}
              </div>
              
              <div className="result-action">
                <Button 
                  type="link" 
                  icon={<ArrowRightOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectCommand(item.command);
                  }}
                >
                  Run
                </Button>
              </div>
            </div>
          </List.Item>
        )}
      />
    );
  };
  
  return (
    <div className="search-history-container">
      <Card
        title={
          <div className="search-header">
            <SearchOutlined />
            <span>Command History Search</span>
            <Button 
              type="text" 
              icon={<CloseOutlined />} 
              onClick={onClose}
              aria-label="Close search"
              className="close-button"
            />
          </div>
        }
        className="search-card"
      >
        <div className="search-content">
          <div className="search-input-container">
            <Search
              ref={searchInputRef}
              placeholder="Search command history using natural language..."
              allowClear
              enterButton={<SearchOutlined />}
              size="large"
              value={searchQuery}
              onChange={handleInputChange}
              onSearch={handleSearch}
              loading={isSearching}
              className="search-input"
              disabled={!aiEnabled}
            />
            
            {searchHistory.results.length > 0 && (
              <Button 
                type="link" 
                className="clear-results-button"
                onClick={handleClearSearch}
              >
                Clear Results
              </Button>
            )}
          </div>
          
          {aiSettings.offlineMode && searchHistory.results.length > 0 && (
            <Alert
              message="Offline Mode"
              description="Using basic keyword matching in offline mode. Enable network connection for more intelligent search."
              type="warning"
              showIcon
              icon={<CloudOfflineOutlined />}
              className="offline-alert"
            />
          )}
          
          <div 
            className="search-results-container"
            ref={resultsContainerRef}
          >
            {renderResults()}
          </div>
        </div>
        
        <Divider />
        
        <div className="keyboard-hint">
          <Space>
            <Tooltip title="Navigate results">
              <Tag color="default">↑↓</Tag>
            </Tooltip>
            <Tooltip title="Select command">
              <Tag color="default">Enter</Tag>
            </Tooltip>
            <Tooltip title="Close search">
              <Tag color="default">ESC</Tag>
            </Tooltip>
          </Space>
        </div>
      </Card>
    </div>
  );
};

export default React.memo(SearchHistory);

