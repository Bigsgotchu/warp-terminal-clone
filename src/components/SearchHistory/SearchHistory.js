import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Input, Button, List, Tag, Slider, Checkbox, Select, Space, Typography, Empty, Spin, Alert } from 'antd';
import { SearchOutlined, FilterOutlined, HistoryOutlined, ClockCircleOutlined, DatabaseOutlined } from '@ant-design/icons';
import './SearchHistory.css';

const { Title, Text } = Typography;
const { Option } = Select;

const SearchHistory = () => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState([]);
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [minimumScore, setMinimumScore] = useState(0.5);
  const [currentDirOnly, setCurrentDirOnly] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState([]);
  
  // This would typically come from Redux store
  const commandHistory = useSelector((state) => state.terminal?.commandHistory || []);
  const currentDirectory = useSelector((state) => state.terminal?.currentDirectory || '');
  const dispatch = useDispatch();
  
  // Match type colors for different types of matches
  const matchTypeColors = {
    exact: 'green',
    semantic: 'blue',
    partial: 'orange',
    contextual: 'purple',
    workflow: 'cyan',
    pattern: 'magenta',
  };
  
  // Category options for filter
  const categoryOptions = [
    { value: 'exact', label: 'Exact Matches' },
    { value: 'semantic', label: 'Semantic Matches' },
    { value: 'partial', label: 'Partial Matches' },
    { value: 'contextual', label: 'Contextual Matches' },
    { value: 'workflow', label: 'Workflow Matches' },
    { value: 'pattern', label: 'Pattern Matches' },
  ];

  useEffect(() => {
    // This would call the search service when the query changes
    if (query.trim().length > 2) {
      searchHistory(query);
    } else if (query.trim().length === 0) {
      setResults([]);
    }
  }, [query, minimumScore, currentDirOnly, selectedCategories]);

  const searchHistory = async (searchQuery) => {
    if (!searchQuery.trim()) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Mock search implementation - replace with actual AI search service
      // In a real implementation, this would call the backend or use a service
      // to perform natural language search on command history
      setTimeout(() => {
        const filteredResults = mockSearchResults(searchQuery);
        setResults(filteredResults);
        setLoading(false);
      }, 800);
    } catch (err) {
      setError('Failed to search command history: ' + err.message);
      setLoading(false);
    }
  };

  // Mock implementation to simulate search results
  const mockSearchResults = (searchQuery) => {
    const mockResults = [
      {
        command: 'find . -type f -name "*.js" | xargs grep "SearchHistory"',
        matchType: 'exact',
        score: 0.95,
        timestamp: new Date().getTime() - 60000,
        directory: currentDirectory,
        metadata: { fileCount: 5, matchCount: 3 }
      },
      {
        command: 'git log --grep="search feature" --oneline',
        matchType: 'semantic',
        score: 0.82,
        timestamp: new Date().getTime() - 3600000,
        directory: '/home/user/projects',
        metadata: { commits: 7 }
      },
      {
        command: 'history | grep search',
        matchType: 'partial',
        score: 0.76,
        timestamp: new Date().getTime() - 86400000,
        directory: '/home/user',
        metadata: { results: 12 }
      },
      {
        command: 'locate -i *search*.js',
        matchType: 'contextual',
        score: 0.68,
        timestamp: new Date().getTime() - 259200000,
        directory: '/home/user/documents',
        metadata: { filesFound: 8 }
      },
      {
        command: 'npm search --searchopts=history',
        matchType: 'workflow',
        score: 0.60,
        timestamp: new Date().getTime() - 604800000,
        directory: currentDirectory,
        metadata: { packages: 25 }
      },
      {
        command: 'grep -r "search pattern" --include="*.ts"',
        matchType: 'pattern',
        score: 0.55,
        timestamp: new Date().getTime() - 1209600000,
        directory: '/home/user/apps',
        metadata: { matches: 17 }
      }
    ];
    
    // Apply filters
    return mockResults.filter(result => {
      // Apply minimum score filter
      if (result.score < minimumScore) return false;
      
      // Apply current directory filter
      if (currentDirOnly && result.directory !== currentDirectory) return false;
      
      // Apply category filter
      if (selectedCategories.length > 0 && !selectedCategories.includes(result.matchType)) {
        return false;
      }
      
      return true;
    });
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    
    if (diffSec < 60) return `${diffSec} seconds ago`;
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)} minutes ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} hours ago`;
    return `${Math.floor(diffSec / 86400)} days ago`;
  };

  const handleExecuteCommand = (command) => {
    // This would dispatch an action to execute the command
    console.log('Executing command:', command);
    // dispatch(executeCommand(command));
  };

  const toggleFilters = () => {
    setFiltersVisible(!filtersVisible);
  };

  const renderFilters = () => {
    return (
      <div className="search-filters">
        <div className="filter-section">
          <Text strong>Minimum Match Score</Text>
          <Slider
            value={minimumScore}
            onChange={setMinimumScore}
            min={0}
            max={1}
            step={0.05}
            marks={{ 0: '0', 0.5: '0.5', 1: '1' }}
            tooltip={{ formatter: value => `${(value * 100).toFixed(0)}%` }}
          />
        </div>
        
        <div className="filter-section">
          <Checkbox
            checked={currentDirOnly}
            onChange={(e) => setCurrentDirOnly(e.target.checked)}
          >
            Current directory only
          </Checkbox>
        </div>
        
        <div className="filter-section">
          <Text strong>Categories</Text>
          <Select
            mode="multiple"
            style={{ width: '100%' }}
            placeholder="Select match categories"
            value={selectedCategories}
            onChange={setSelectedCategories}
            optionLabelProp="label"
          >
            {categoryOptions.map(option => (
              <Option key={option.value} value={option.value} label={option.label}>
                <Space>
                  <Tag color={matchTypeColors[option.value]}>{option.value}</Tag>
                  {option.label}
                </Space>
              </Option>
            ))}
          </Select>
        </div>
      </div>
    );
  };

  const renderResults = () => {
    if (loading) {
      return (
        <div className="search-loading">
          <Spin size="large" />
          <Text>Searching command history...</Text>
        </div>
      );
    }

    if (error) {
      return (
        <Alert
          message="Search Error"
          description={error}
          type="error"
          showIcon
        />
      );
    }

    if (results.length === 0) {
      if (query.trim().length > 0) {
        return (
          <Empty
            description="No matching commands found"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        );
      }
      return (
        <div className="search-instructions">
          <HistoryOutlined style={{ fontSize: '48px', color: '#1890ff' }} />
          <Text>Enter a search term to find commands in your history</Text>
          <Text type="secondary">Try searching for tasks, tools, or goals</Text>
        </div>
      );
    }

    return (
      <List
        className="search-results-list"
        itemLayout="vertical"
        dataSource={results}
        renderItem={(item) => (
          <List.Item
            key={item.command + item.timestamp}
            actions={[
              <Button
                type="primary"
                size="small"
                onClick={() => handleExecuteCommand(item.command)}
              >
                Execute
              </Button>
            ]}
            extra={
              <div className="result-metadata">
                <div>
                  <ClockCircleOutlined /> {formatTimestamp(item.timestamp)}
                </div>
                <div>
                  <DatabaseOutlined /> {item.directory}
                </div>
                <div>
                  <Tag color={matchTypeColors[item.matchType]}>
                    {item.matchType}
                  </Tag>
                </div>
                <div>
                  Score: {(item.score * 100).toFixed(0)}%
                </div>
              </div>
            }
          >
            <div className="result-command">
              <Text code copyable>
                {item.command}
              </Text>
            </div>
            <div className="result-additional-info">
              {Object.entries(item.metadata).map(([key, value]) => (
                <Tag key={key}>
                  {key}: {value}
                </Tag>
              ))}
            </div>
          </List.Item>
        )}
      />
    );
  };

  return (
    <div className="search-history-container">
      <div className="search-header">
        <Title level={4}>
          <SearchOutlined /> Smart Command History Search
        </Title>
        <div className="search-input-container">
          <Input
            prefix={<SearchOutlined />}
            placeholder="Search your command history with natural language..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            allowClear
            size="large"
          />
          <Button
            icon={<FilterOutlined />}
            onClick={toggleFilters}
            type={filtersVisible ? "primary" : "default"}
          >
            Filters
          </Button>
        </div>
      </div>
      
      {filtersVisible && renderFilters()}
      
      <div className="search-results-container">
        {renderResults()}
      </div>
    </div>
  );
};

export default SearchHistory;

