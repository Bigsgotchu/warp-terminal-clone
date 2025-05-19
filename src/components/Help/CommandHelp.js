import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { 
  Drawer, 
  Input, 
  Button, 
  Tabs, 
  List, 
  Typography, 
  Tag, 
  Divider, 
  Card, 
  Empty,
  Space,
  Collapse,
  Badge,
  Tooltip,
  Tree,
  Alert
} from 'antd';
import {
  SearchOutlined,
  BookOutlined,
  QuestionCircleOutlined,
  TagsOutlined,
  CloseOutlined,
  CodeOutlined,
  CaretRightOutlined,
  TagOutlined,
  HistoryOutlined,
  RocketOutlined,
  LaptopOutlined,
  BarsOutlined,
  InfoCircleOutlined,
  TeamOutlined,
  LinkOutlined,
  CopyOutlined,
  CheckOutlined
} from '@ant-design/icons';
import { commandReference } from './commandReference';
import { selectCommandHistory, setCurrentTerminalInput } from '../../features/ai/aiSlice';
import './CommandHelp.css';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;
const { Search } = Input;
const { Panel } = Collapse;
const { DirectoryTree } = Tree;

/**
 * CommandHelp component displays command documentation and help
 * 
 * Features:
 * - Search for commands by name, description or tags
 * - Browse commands by category
 * - View detailed command documentation
 * - Interactive examples and tutorials
 * - Integration with command history
 * 
 * @param {Object} props Component props
 * @param {boolean} [props.isVisible=false] Whether the help drawer is visible
 * @param {Function} [props.onClose] Callback to close the help drawer
 * @returns {React.ReactElement} The command help component
 */
const CommandHelp = ({ isVisible = false, onClose }) => {
  const dispatch = useDispatch();
  const commandHistory = useSelector(selectCommandHistory);
  
  // State for search and filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredCommands, setFilteredCommands] = useState([]);
  const [activeTab, setActiveTab] = useState('search');
  const [selectedCommand, setSelectedCommand] = useState(null);
  const [categories, setCategories] = useState([]);
  const [recentCommands, setRecentCommands] = useState([]);
  const [copied, setCopied] = useState('');

  // Ref for scrolling
  const searchResultsRef = useRef(null);
  
  // Generate categories from command reference data
  useEffect(() => {
    if (Object.keys(commandReference).length > 0) {
      const categoryMap = {};
      
      // Build category map
      Object.entries(commandReference).forEach(([cmdKey, cmdData]) => {
        const category = cmdData.category || 'Uncategorized';
        if (!categoryMap[category]) {
          categoryMap[category] = [];
        }
        categoryMap[category].push({
          key: cmdKey,
          title: cmdKey,
          ...cmdData
        });
      });
      
      // Convert to array for rendering
      const categoriesArray = Object.entries(categoryMap).map(([category, commands]) => ({
        category,
        commands: commands.sort((a, b) => a.key.localeCompare(b.key))
      }));
      
      setCategories(categoriesArray.sort((a, b) => a.category.localeCompare(b.category)));
    }
  }, []);
  
  // Generate list of recent commands from history
  useEffect(() => {
    if (commandHistory.length > 0) {
      // Extract unique base commands from history
      const commandSet = new Set();
      const recent = [];
      
      // Process from most recent to oldest
      [...commandHistory].reverse().forEach(cmd => {
        const baseCmd = cmd.trim().split(' ')[0];
        
        // Only add if it exists in our command reference and hasn't been added yet
        if (commandReference[baseCmd] && !commandSet.has(baseCmd)) {
          commandSet.add(baseCmd);
          recent.push({
            key: baseCmd,
            title: baseCmd,
            ...commandReference[baseCmd]
          });
        }
      });
      
      setRecentCommands(recent.slice(0, 10)); // Limit to 10 most recent
    }
  }, [commandHistory]);
  
  // Handle search input change
  const handleSearch = (value) => {
    setSearchQuery(value);
    
    if (!value.trim()) {
      setFilteredCommands([]);
      return;
    }
    
    // Search in commands
    const results = Object.entries(commandReference)
      .filter(([cmdKey, cmdData]) => {
        const searchIn = [
          cmdKey,
          cmdData.description || '',
          cmdData.category || '',
          ...(cmdData.tags || [])
        ].join(' ').toLowerCase();
        
        return searchIn.includes(value.toLowerCase());
      })
      .map(([cmdKey, cmdData]) => ({
        key: cmdKey,
        title: cmdKey,
        ...cmdData
      }));
    
    setFilteredCommands(results);
    
    // If we have results, select first one and show details
    if (results.length > 0 && activeTab === 'search') {
      setSelectedCommand(results[0]);
    }
  };
  
  // Handle command selection
  const handleCommandSelect = (command) => {
    setSelectedCommand(command);
  };
  
  // Apply command to terminal
  const applyCommand = (command) => {
    dispatch(setCurrentTerminalInput(command));
    if (onClose) onClose();
  };
  
  // Copy command to clipboard
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(''), 2000);
  };
  
  // Generate tree data for category browsing
  const getCategoryTreeData = () => {
    return categories.map(category => ({
      title: (
        <span>
          <TagsOutlined /> {category.category} 
          <Badge count={category.commands.length} style={{ marginLeft: 8 }} />
        </span>
      ),
      key: `category-${category.category}`,
      children: category.commands.map(cmd => ({
        title: cmd.key,
        key: `cmd-${cmd.key}`,
        isLeaf: true,
        icon: <CodeOutlined />,
        command: cmd
      }))
    }));
  };
  
  // Handle tree select
  const handleTreeSelect = (selectedKeys, info) => {
    if (info.node.command) {
      handleCommandSelect(info.node.command);
    }
  };
  
  // Render command details section
  const renderCommandDetails = () => {
    if (!selectedCommand) {
      return (
        <Empty 
          description="Select a command to view details" 
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      );
    }
    
    const { key, description, syntax, options, examples, tips, tags } = selectedCommand;
    
    return (
      <div className="command-details">
        <Card 
          title={
            <Space>
              <CodeOutlined />
              <Text code>{key}</Text>
              {tags && tags.map(tag => (
                <Tag key={tag} color="blue">
                  <TagOutlined /> {tag}
                </Tag>
              ))}
            </Space>
          }
          extra={
            <Space>
              <Tooltip title="Copy command">
                <Button 
                  type="text" 
                  icon={copied === key ? <CheckOutlined /> : <CopyOutlined />}
                  onClick={() => copyToClipboard(key)}
                />
              </Tooltip>
              <Tooltip title="Use this command">
                <Button 
                  type="primary"
                  icon={<CaretRightOutlined />}
                  onClick={() => applyCommand(key)}
                >
                  Use
                </Button>
              </Tooltip>
            </Space>
          }
          className="command-card"
        >
          <Paragraph>{description}</Paragraph>
          
          {syntax && (
            <>
              <Divider orientation="left">Syntax</Divider>
              <div className="command-syntax">
                <Text code>{syntax}</Text>
              </div>
            </>
          )}
          
          {options && Object.keys(options).length > 0 && (
            <>
              <Divider orientation="left">Options</Divider>
              <List
                dataSource={Object.entries(options)}
                renderItem={([option, description]) => (
                  <List.Item>
                    <List.Item.Meta
                      title={<Text code>{option}</Text>}
                      description={description}
                    />
                  </List.Item>
                )}
                size="small"
                className="options-list"
              />
            </>
          )}
          
          {examples && examples.length > 0 && (
            <>
              <Divider orientation="left">Examples</Divider>
              <List
                dataSource={examples}
                renderItem={(example) => (
                  <List.Item
                    actions={[
                      <Tooltip title="Copy example">
                        <Button 
                          type="text" 
                          icon={copied === example.command ? <CheckOutlined /> : <CopyOutlined />}
                          onClick={() => copyToClipboard(example.command)}
                        />
                      </Tooltip>,
                      <Tooltip title="Use this example">
                        <Button 
                          type="primary" 
                          size="small"
                          onClick={() => applyCommand(example.command)}
                        >
                          Use
                        </Button>
                      </Tooltip>
                    ]}
                  >
                    <List.Item.Meta
                      title={<Text code>{example.command}</Text>}
                      description={example.description}
                    />
                  </List.Item>
                )}
                className="examples-list"
              />
            </>
          )}
          
          {tips && tips.length > 0 && (
            <>
              <Divider orientation="left">Tips</Divider>
              <List
                dataSource={tips}
                renderItem={(tip) => (
                  <List.Item>
                    <Text>
                      <InfoCircleOutlined style={{ marginRight: 8 }} /> 
                      {tip}
                    </Text>
                  </List.Item>
                )}
                size="small"
                className="tips-list"
              />
            </>
          )}
        </Card>
      </div>
    );
  };
  
  // Interactive tutorials section
  const renderTutorials = () => {
    // Sample tutorial data
    const tutorials = [
      {
        title: "Git Basics",
        description: "Learn the essential Git commands for version control",
        commands: ["git init", "git status", "git add", "git commit", "git push", "git pull"],
        level: "Beginner"
      },
      {
        title: "File Navigation Mastery",
        description: "Master navigating the file system with terminal commands",
        commands: ["cd", "ls", "pwd", "find"],
        level: "Beginner"
      },
      {
        title: "Text Processing with Terminal",
        description: "Learn powerful text processing commands",
        commands: ["grep", "sed", "awk", "cat", "less"],
        level: "Intermediate"
      },
      {
        title: "Docker Container Management",
        description: "Essential commands for working with Docker containers",
        commands: ["docker ps", "docker run", "docker build"],
        level: "Intermediate"
      }
    ];
    
    return (
      <div className="tutorials-container">
        <Paragraph>
          Interactive tutorials to help you learn command patterns and improve your terminal skills:
        </Paragraph>
        
        <List
          dataSource={tutorials}
          renderItem={(tutorial) => (
            <List.Item>
              <Card 
                title={tutorial.title}
                extra={<Tag color="green">{tutorial.level}</Tag>}
                style={{ width: '100%' }}
              >
                <Paragraph>{tutorial.description}</Paragraph>
                <div className="tutorial-commands">
                  {tutorial.commands.map(cmd => (
                    <Tag 
                      key={cmd} 
                      color="blue" 
                      style={{ cursor: 'pointer', margin: '4px' }}
                      onClick={() => handleCommandSelect(commandReference[cmd] ? {
                        key: cmd,
                        ...commandReference[cmd]
                      } : null)}
                    >
                      <CodeOutlined /> {cmd}
                    </Tag>
                  ))}
                </div>
                <div style={{ marginTop: 16 }}>
                  <Button type="primary" icon={<RocketOutlined />}>
                    Start Tutorial
                  </Button>
                </div>
              </Card>
            </List.Item>
          )}
        />
      </div>
    );
  };
  
  return (
    <Drawer
      title={
        <div className="help-header">
          <BookOutlined />
          <span style={{ marginLeft: 8 }}>Command Help</span>
        </div>
      }
      placement="right"
      closable={true}
      onClose={onClose}
      visible={isVisible}
      width={800}
      className="command-help-drawer"
      bodyStyle={{ padding: 0, display: 'flex', flexDirection: 'column' }}
      headerStyle={{ padding: '16px 24px' }}
      closeIcon={<CloseOutlined />}
    >
      <Tabs 
        defaultActiveKey="search" 
        activeKey={activeTab}
        onChange={setActiveTab}
        className="help-tabs"
        tabBarStyle={{ padding: '0 16px', margin: '0' }}
      >
        {/* Search Tab */}
        <TabPane 
          tab={<span><SearchOutlined />Search</span>} 
          key="search"
        >
          <div className="help-search-container">
            <div className="search-panel">
              <Search
                placeholder="Search commands, categories, or tags..."
                allowClear
                enterButton
                size="large"
                onSearch={handleSearch}
                onChange={(e) => setSearchQuery(e.target.value)}
                value={searchQuery}
                style={{ margin: '16px 16px 8px' }}
              />
              
              <div className="search-results" ref={searchResultsRef}>
                {filteredCommands.length > 0 ? (
                  <List
                    dataSource={filteredCommands}
                    renderItem={(item) => (
                      <List.Item 
                        onClick={() => handleCommandSelect(item)}
                        className={`command-

import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useSelector, useDispatch } from 'react-redux';
import {
  Drawer,
  Tabs,
  List,
  Button,
  Input,
  Typography,
  Tag,
  Card,
  Tooltip,
  Empty,
  Divider,
  Steps,
  Space,
  Alert
} from 'antd';
import {
  SearchOutlined,
  BookOutlined,
  HistoryOutlined,
  StarOutlined,
  LightbulbOutlined,
  CloseOutlined,
  CopyOutlined,
  RightOutlined,
  CodeOutlined
} from '@ant-design/icons';
import { selectActiveTabContext } from '../../features/terminal/tabContextSlice';
import { selectCommandPatterns } from '../../features/ai/aiSlice';
import { commandReference } from './commandReference';
import './CommandHelp.css';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;
const { Step } = Steps;

/**
 * CommandHelp component provides integrated documentation and contextual help
 * for terminal commands.
 * 
 * Features:
 * - Quick command reference
 * - Contextual help based on current terminal state
 * - Interactive tutorials for learning commands
 * - Command discovery for new users
 * - Command history insights and patterns
 */
const CommandHelp = ({ visible, onClose, currentCommand = '' }) => {
  const dispatch = useDispatch();
  const activeContext = useSelector(selectActiveTabContext);
  const commandPatterns = useSelector(selectCommandPatterns);
  
  // Local state
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('reference');
  const [selectedCommand, setSelectedCommand] = useState(null);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [tutorialActive, setTutorialActive] = useState(false);
  const [activeTutorial, setActiveTutorial] = useState(null);
  
  // Set the initial selected command based on the current command
  useEffect(() => {
    if (currentCommand && commandReference[currentCommand]) {
      setSelectedCommand(currentCommand);
      setActiveTab('reference');
    } else if (currentCommand) {
      // Try to find by partial match
      const commandName = Object.keys(commandReference).find(cmd => 
        currentCommand.startsWith(`${cmd} `)
      );
      
      if (commandName) {
        setSelectedCommand(commandName);
        setActiveTab('reference');
      }
    }
  }, [currentCommand]);
  
  /**
   * Filter commands based on search term
   * @returns {Array} Filtered command list
   */
  const getFilteredCommands = () => {
    if (!searchTerm) {
      return Object.entries(commandReference).map(([name, data]) => ({
        name,
        ...data
      }));
    }
    
    const term = searchTerm.toLowerCase();
    return Object.entries(commandReference)
      .filter(([name, data]) => 
        name.toLowerCase().includes(term) || 
        data.description.toLowerCase().includes(term) ||
        data.category.toLowerCase().includes(term) ||
        (data.tags && data.tags.some(tag => tag.toLowerCase().includes(term)))
      )
      .map(([name, data]) => ({
        name,
        ...data
      }));
  };
  
  /**
   * Get history insights based on command patterns
   * @returns {Array} Command insights
   */
  const getHistoryInsights = () => {
    if (!activeContext) return [];
    
    const commandHistory = activeContext.commandHistory || [];
    const recentCommands = commandHistory.slice(0, 20);
    
    // Count command usage
    const commandCounts = {};
    recentCommands.forEach(cmd => {
      const mainCommand = cmd.split(' ')[0];
      commandCounts[mainCommand] = (commandCounts[mainCommand] || 0) + 1;
    });
    
    // Convert to sorted array
    const commandUsage = Object.entries(commandCounts)
      .map(([cmd, count]) => ({ command: cmd, count }))
      .sort((a, b) => b.count - a.count);
    
    return commandUsage;
  };
  
  /**
   * Get command examples for a specific command
   * @param {string} command - Command name
   * @returns {Array} Command examples
   */
  const getCommandExamples = (command) => {
    if (!command || !commandReference[command]) return [];
    
    return commandReference[command].examples || [];
  };
  
  /**
   * Copy command to clipboard
   * @param {string} command - Command to copy
   */
  const copyCommand = (command) => {
    navigator.clipboard.writeText(command);
    // Could add a notification or feedback here
  };
  
  /**
   * Start a tutorial
   * @param {string} tutorialId - Tutorial ID
   */
  const startTutorial = (tutorialId) => {
    const tutorial = tutorials.find(t => t.id === tutorialId);
    if (tutorial) {
      setActiveTutorial(tutorial);
      setTutorialStep(0);
      setTutorialActive(true);
      setActiveTab('learn');
    }
  };
  
  /**
   * Execute a command as part of tutorial
   * @param {string} command - Command to execute
   */
  const executeCommand = (command) => {
    // Here we would typically dispatch an action to execute the command
    // For example: dispatch(executeCommand(command));
    
    // For tutorial purposes, we'll just advance to the next step
    if (tutorialActive && activeTutorial) {
      setTutorialStep(prevStep => {
        const nextStep = prevStep + 1;
        
        // End tutorial if we've reached the end
        if (nextStep >= activeTutorial.steps.length) {
          setTutorialActive(false);
          return 0;
        }
        
        return nextStep;
      });
    }
    
    // Close drawer if requested
    if (!tutorialActive) {
      onClose();
    }
  };
  
  // List of available tutorials
  const tutorials = [
    {
      id: 'basic-navigation',
      title: 'Basic Terminal Navigation',
      description: 'Learn to navigate the file system using basic commands',
      icon: 'folder',
      steps: [
        {
          title: 'Check Current Directory',
          content: 'First, let\'s check your current directory with the "pwd" command.',
          command: 'pwd',
          explanation: 'The pwd command stands for "print working directory" and shows your current location in the file system.'
        },
        {
          title: 'List Files',
          content: 'Now, let\'s see what files are in this directory with the "ls" command.',
          command: 'ls',
          explanation: 'The ls command lists the files and directories in your current location.'
        },
        {
          title: 'List Files with Details',
          content: 'Let\'s see more details about the files with "ls -l".',
          command: 'ls -l',
          explanation: 'The -l flag shows the long format, including permissions, owner, size, and modification date.'
        },
        {
          title: 'Navigate to a Directory',
          content: 'Try changing to another directory with "cd" followed by the directory name.',
          command: 'cd Documents',
          explanation: 'The cd command changes your current directory to the specified path.'
        },
        {
          title: 'Go Back Up',
          content: 'To go back to the parent directory, use "cd .."',
          command: 'cd ..',
          explanation: 'The .. represents the parent directory, one level up from your current location.'
        }
      ]
    },
    {
      id: 'git-basics',
      title: 'Git Version Control Basics',
      description: 'Learn the essential Git commands for version control',
      icon: 'branch',
      steps: [
        {
          title: 'Check Git Status',
          content: 'First, check the status of your repository with "git status".',
          command: 'git status',
          explanation: 'This shows the current state of your git repository, including modified files and branch information.'
        },
        {
          title: 'Add Files to Staging',
          content: 'Add modified files to the staging area with "git add".',
          command: 'git add .',
          explanation: 'The git add command prepares files for commit. The dot (.) adds all changed files.'
        },
        {
          title: 'Commit Changes',
          content: 'Commit your staged changes with a message using "git commit -m".',
          command: 'git commit -m "Update files"',
          explanation: 'This creates a commit with your changes and a descriptive message.'
        },
        {
          title: 'Check Commit History',
          content: 'View the commit history with "git log".',
          command: 'git log',
          explanation: 'This shows the history of commits, including commit messages, authors, and timestamps.'
        },
        {
          title: 'Push Changes',
          content: 'Push your local commits to the remote repository with "git push".',
          command: 'git push',
          explanation: 'This uploads your local commits to the remote repository, making them available to others.'
        }
      ]
    }
  ];
  
  // Render the command reference section
  const renderCommandReference = () => {
    const filteredCommands = getFilteredCommands();
    
    return (
      <div className="command-reference">
        <div className="command-search">
          <Input
            placeholder="Search commands..."
            prefix={<SearchOutlined />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            allowClear
          />
        </div>
        
        <div className="command-list-container">
          {filteredCommands.length > 0 ? (
            <List
              className="command-list"
              dataSource={filteredCommands}
              renderItem={(item) => (
                <List.Item
                  className={`command-list-item ${selectedCommand === item.name ? 'selected' : ''}`}
                  onClick={() => setSelectedCommand(item.name)}
                >
                  <div className="command-list-item-content">
                    <div className="command-name">{item.name}</div>
                    <div className="command-description">{item.description}</div>
                    {item.category && (
                      <Tag color="blue">{item.category}</Tag>
                    )}
                  </div>
                </List.Item>
              )}
            />
          ) : (
            <Empty description="No commands found" />
          )}
        </div>
        
        {selectedCommand && commandReference[selectedCommand] && (
          <div className="command-details">
            <Title level={4}>{selectedCommand}</Title>
            <Paragraph>{commandReference[selectedCommand].description}</Paragraph>
            
            <Divider orientation="left">Syntax</Divider>
            <div className="command-syntax">
              <Text code>{commandReference[selectedCommand].syntax}</Text>
            </div>
            
            {commandReference[selectedCommand].options && (
              <>
                <Divider orientation="left">Options</Divider>
                <List
                  className="command-options"
                  dataSource={Object.entries(commandReference[selectedCommand].options)}
                  renderItem={([option, description]) => (
                    <List.Item>
                      <div className="option-name">{option}</div>
                      <div className="option-description">{description}</div>
                    </List.Item>
                  )}
                />
              </>
            )}
            
            {commandReference[selectedCommand].examples && (
              <>
                <Divider orientation="left">Examples</Divider>
                <List
                  className="command-examples"
                  dataSource={commandReference[selectedCommand].examples}
                  renderItem={(example) => (
                    <List.Item
                      actions={[
                        <Tooltip title="Execute this command">
                          <Button
                            type="primary"
                            size="small"
                            icon={<RightOutlined />}
                            onClick={() => executeCommand(example.command)}
                          />
                        </Tooltip>,
                        <Tooltip title="Copy to clipboard">
                          <Button
                            size="small"
                            icon={<CopyOutlined />}
                            onClick={() => copyCommand(example.command)}
                          />
                        </Tooltip>
                      ]}
                    >
                      <List.Item.Meta
                        title={<Text code>{example.command}</Text>}
                        description={example.description}
                      />
                    </List.Item>
                  )}
                />
              </>
            )}
            
            {commandReference[selectedCommand].tips && (
              <>
                <Divider orientation="left">Tips</Divider>
                <List
                  className="command-tips"
                  dataSource={commandReference[selectedCommand].tips}
                  renderItem={(tip) => (
                    <List.Item>
                      <Alert
                        message={tip}
                        type="info"
                        showIcon
                      />
                    </List.Item>
                  )}
                />
              </>
            )}
          </div>
        )}
      </div>
    );
  };
  
  // Render the discover section
  const renderDiscoverSection = () => {
    const categories = [
      'File Operations',
      'Navigation',
      'System',
      'Text Processing',
      'Network',
      'Package Management',
      'Version Control',
      'Process Management'
    ];
    
    return (
      <div className="command-discover">
        <Title level={4}>Discover Commands</Title>
        <Paragraph>
          Explore commands by category to learn new terminal skills.
        </Paragraph>
        
        <div className="category-grid">
          {categories.map((category) => {
            const categoryCommands = Object.entries(commandReference)
              .filter(([_, data]) => data.category === category)
              .map(([name, data]) => ({
                name,
                ...data
              }));
            
            return (
              <Card
                key={category}
                title={category}
                size="small"
                className="category-card"
                extra={<Text type="secondary">{categoryCommands.length}</Text>}
              >
                <ul className="category-commands">
                  {categoryCommands.slice(0, 5).map((cmd) => (
                    <li key={cmd.name}>
                      <Button
                        type="link"
                        onClick={() => {
                          setSelectedCommand(cmd.name);
                          setActiveTab('reference');
                        }}
                      >
                        {cmd.name}
                      </Button>
                    </li>
                  ))}
                  {categoryCommands.length > 5 && (
                    <li>
                      <Button
                        type="link"
                        onClick={() => {
                          setSearchTerm(category);
                          setActiveTab('reference');
                        }}
                        See all {categoryCommands.length} commands...
                      </Button>
                    </li>
                  )}
                </ul>
              </Card>
            );
          })}
        </div>
      </div>
    );
  };
  
  // Render the learn section with tutorials
  const renderLearnSection = () => {
    return (
      <div className="command-learn">
        {tutorialActive ? (
          <div className="active-tutorial">
            <Steps current={tutorialStep}>
              {activeTutorial.steps.map((step, index) => (
                <Step key={index} title={step.title} />
              ))}
            </Steps>
            <div className="tutorial-content">
              {/* Current step content */}
              <Card className="step-card">
                <Alert
                  message={activeTutorial.steps[tutorialStep].content}
                  type="info"
                  showIcon
                />
                <Paragraph className="step-explanation">
                  {activeTutorial.steps[tutorialStep].explanation}
                </Paragraph>
                <Space>
                  <Button
                    type="primary"
                    onClick={() => executeCommand(activeTutorial.steps[tutorialStep].command)}
                  >
                    Execute Command
                  </Button>
                  <Button onClick={() => setTutorialActive(false)}>
                    Exit Tutorial
                  </Button>
                </Space>
              </Card>
            </div>
          </div>
        ) : (
          <div className="tutorial-list">
            <Title level={4}>Interactive Tutorials</Title>
            <List
              dataSource={tutorials}
              renderItem={tutorial => (
                <List.Item>
                  <Card
                    hoverable
                    onClick={() => startTutorial(tutorial.id)}
                  >
                    <Title level={5}>{tutorial.title}</Title>
                    <Text>{tutorial.description}</Text>
                  </Card>
                </List.Item>
              )}
            />
          </div>
        )}
      </div>
    );
  };
  
  // Render insights section based on command history
  const renderInsightsSection = () => {
    const historyInsights = getHistoryInsights();
    
    return (
      <div className="command-insights">
        <Title level={4}>Command Usage Insights</Title>
        <Paragraph>
          Analyze your command history to improve your terminal workflow.
        </Paragraph>
        
        {historyInsights.length > 0 ? (
          <>
            <Card title="Most Used Commands" className="insights-card">
              <List
                dataSource={historyInsights.slice(0, 10)}
                renderItem={item => (
                  <List.Item
                    actions={[
                      <Button
                        type="link"
                        onClick={() => {
                          setSelectedCommand(item.command);
                          setActiveTab('reference');
                        }}
                      >
                        View Reference
                      </Button>
                    ]}
                  >
                    <List.Item.Meta
                      title={item.command}
                      description={`Used ${item.count} times`}
                    />
                  </List.Item>
                )}
              />
            </Card>
            
            {commandPatterns && commandPatterns.length > 0 && (
              <Card title="Command Patterns" className="insights-card">
                <List
                  dataSource={commandPatterns}
                  renderItem={pattern => (
                    <List.Item>
                      <List.Item.Meta
                        title={pattern.pattern}
                        description={
                          <>
                            <Text>Suggestion: </Text>
                            <Text code>{pattern.suggestion}</Text>
                            <div>{pattern.description}</div>
                          </>
                        }
                      />
                    </List.Item>
                  )}
                />
              </Card>
            )}
          </>
        ) : (
          <Empty description="No command history available" />
        )}
      </div>
    );
  };
  
  // Main render
  return (
    <Drawer
      title={
        <Space>
          <BookOutlined />
          <span>Command Help & Documentation</span>
        </Space>
      }
      placement="right"
      width={600}
      visible={visible}
      onClose={onClose}
      className="command-help-drawer"
    >
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane
          tab={<span><BookOutlined />Reference</span>}
          key="reference"
        >
          {renderCommandReference()}
        </TabPane>
        <TabPane
          tab={<span><LightbulbOutlined />Discover</span>}
          key="discover"
        >
          {renderDiscoverSection()}
        </TabPane>
        <TabPane
          tab={<span><CodeOutlined />Learn</span>}
          key="learn"
        >
          {renderLearnSection()}
        </TabPane>
        <TabPane
          tab={<span><HistoryOutlined />Insights</span>}
          key="insights"
        >
          {renderInsightsSection()}
        </TabPane>
      </Tabs>
    </Drawer>
  );
};

CommandHelp.propTypes = {
  visible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  currentCommand: PropTypes.string
};

export default CommandHelp;
