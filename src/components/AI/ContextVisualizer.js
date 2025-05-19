import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Card,
  Tabs,
  Typography,
  Button,
  Table,
  Tag,
  Tooltip,
  Divider,
  Select,
  Space,
  Modal,
  Empty,
  Statistic,
  Row,
  Col,
  Radio,
  Switch,
  Upload,
  message,
  Alert,
  Spin,
  Checkbox
} from 'antd';
import {
  DatabaseOutlined,
  ShareAltOutlined,
  CloseOutlined,
  SyncOutlined,
  InfoCircleOutlined,
  PlusOutlined,
  MinusOutlined,
  HistoryOutlined,
  CodeOutlined,
  EnvironmentOutlined,
  ClusterOutlined,
  BarChartOutlined,
  UploadOutlined,
  InboxOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';
import {
  selectTabContexts,
  selectActiveTabId,
  selectSharedContexts,
  selectTabContextById,
  selectTabsSharedWith,
  selectAllSharedContexts,
  selectContextStatistics,
  selectTabContextStatistics,
  shareContext,
  unshareContext,
  clearTabContext,
  importContexts,
  updateGlobalContext
} from '../../features/terminal/tabContextSlice';
import './ContextVisualizer.css';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;

/**
 * ContextVisualizer component displays and manages terminal tab contexts
 * 
 * @param {Object} props Component props
 * @param {boolean} [props.isVisible=false] Whether the context visualizer is visible
 * @param {Function} [props.onClose] Callback to close the visualizer
 * @returns {React.ReactElement|null} The context visualizer component or null if not visible
 */
const ContextVisualizer = ({ isVisible = false, onClose }) => {
  const dispatch = useDispatch();
  const contexts = useSelector(selectTabContexts);
  const activeTabId = useSelector(selectActiveTabId);
  const sharedContexts = useSelector(selectSharedContexts);
  const allSharedContexts = useSelector(selectAllSharedContexts);
  const statistics = useSelector(selectContextStatistics);
  
  // Get selected tab context and stats
  const selectedContext = selectedTabId ? useSelector(state => selectTabContextById(state, selectedTabId)) : null;
  const selectedTabStats = selectedTabId ? useSelector(state => selectTabContextStatistics(state, selectedTabId)) : null;
  
  const [activeView, setActiveView] = useState('overview');
  const [selectedTabId, setSelectedTabId] = useState(null);
  const [sharingModalVisible, setSharingModalVisible] = useState(false);
  const [selectedTabs, setSelectedTabs] = useState([]);
  const [sourceTab, setSourceTab] = useState(null);
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState(null);
  const [importSuccess, setImportSuccess] = useState(false);
  const fileInputRef = useRef(null);
  
  // Set active tab as selected when component mounts or active tab changes
  useEffect(() => {
    if (activeTabId && contexts[activeTabId]) {
      setSelectedTabId(activeTabId);
    } else if (Object.keys(contexts).length > 0) {
      setSelectedTabId(Object.keys(contexts)[0]);
    }
  }, [activeTabId, contexts]);
  
  // Close handler
  const handleClose = useCallback(() => {
    onClose?.();
  }, [onClose]);
  
  // Define handler functions with useCallback
  const handleOpenSharingModal = useCallback(() => {
    setSourceTab(selectedTabId);
    setSharingModalVisible(true);
    setSelectedTabs([]);
  }, [selectedTabId]);
    setSourceTab(selectedTabId);
    setSharingModalVisible(true);
    setSelectedTabs([]);
  }, [selectedTabId]);

  const handleExportContexts = useCallback(() => {
    try {
      const exportData = {
        contexts,
        activeTabId,
        sharedContexts,
        timestamp: new Date().toISOString(),
        version: '1.0'
      };
      
      // Create file data and trigger download
      const fileData = JSON.stringify(exportData, null, 2);
      const blob = new Blob([fileData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `terminal-contexts-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the URL
      setTimeout(() => URL.revokeObjectURL(url), 100);
      
      // Show success notification
      Modal.success({
        title: 'Contexts Exported',
        content: 'Terminal contexts were successfully exported to a JSON file.'
      });
    } catch (error) {
      console.error('Error exporting contexts:', error);
      Modal.error({
        title: 'Export Failed',
        content: `Failed to export contexts: ${error.message}`
      });
    }
  }, [contexts, activeTabId, sharedContexts]);

  const handleImportContexts = useCallback(() => {
    // Validate imported JSON structure
    const validateImportData = (data) => {
      // Check if data is properly formatted
      if (!data || typeof data !== 'object') {
        return { valid: false, error: 'Invalid data format. Expected a JSON object.' };
      }

      // Check if contexts property exists and is an object
      if (!data.contexts || typeof data.contexts !== 'object') {
        return { valid: false, error: 'Missing or invalid contexts property.' };
      }

      // Check if each context has the required structure
      for (const [tabId, context] of Object.entries(data.contexts)) {
        if (!context.commandHistory || !Array.isArray(context.commandHistory)) {
          return { valid: false, error: `Tab ${tabId} is missing commandHistory array.` };
        }
        if (!context.currentDirectory || typeof context.currentDirectory !== 'string') {
          return { valid: false, error: `Tab ${tabId} is missing currentDirectory.` };
        }
        if (!context.environment || !Array.isArray(context.environment)) {
          return { valid: false, error: `Tab ${tabId} is missing environment array.` };
        }
        if (!Array.isArray(context.commandPatterns)) {
          return { valid: false, error: `Tab ${tabId} has invalid commandPatterns.` };
        }
        if (typeof context.isShared !== 'boolean') {
          return { valid: false, error: `Tab ${tabId} has invalid isShared property.` };
        }
        if (!Array.isArray(context.sharedWith)) {
          return { valid: false, error: `Tab ${tabId} has invalid sharedWith array.` };
        }
      }

      // Check if activeTabId is a string (if provided)
      if (data.activeTabId && typeof data.activeTabId !== 'string') {
        return { valid: false, error: 'Invalid activeTabId.' };
      }

      // Check if sharedContexts is an object (if provided)
      if (data.sharedContexts && typeof data.sharedContexts !== 'object') {
        return { valid: false, error: 'Invalid sharedContexts format.' };
      }

      return { valid: true };
    };

    // Handle file selection
    const handleFileSelect = async (file) => {
      // Check if file is JSON
      if (file.type !== 'application/json') {
        setImportError('Please upload a JSON file.');
        return false;
      }

      setImporting(true);
      setImportError(null);
      setImportSuccess(false);

      try {
        // Read file content
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const content = e.target.result;
            const importData = JSON.parse(content);
            
            // Validate the imported data
            const validation = validateImportData(importData);
            
            if (!validation.valid) {
              setImportError(validation.error);
              setImporting(false);
              return;
            }

            // Import the contexts
            dispatch(importContexts({
              contexts: importData.contexts,
              activeTabId: importData.activeTabId,
              sharedContexts: importData.sharedContexts
            }));

            setImportSuccess(true);
            setImporting(false);
            
            // Auto-close modal after successful import
            setTimeout(() => {
              setImportModalVisible(false);
              message.success('Contexts imported successfully!');
            }, 1500);
          } catch (error) {
            console.error('Error parsing JSON:', error);
            setImportError(`Failed to parse JSON: ${error.message}`);
            setImporting(false);
          }
        };
        
        reader.onerror = () => {
          setImportError('Error reading file.');
          setImporting(false);
        };
        
        reader.readAsText(file);
      } catch (error) {
        console.error('Error importing contexts:', error);
        setImportError(`Error importing contexts: ${error.message}`);
        setImporting(false);
      }
      
      // Prevent default upload behavior
      return false;
    };

    // File upload properties
    const uploadProps = {
      name: 'file',
      multiple: false,
      accept: '.json',
      showUploadList: false,
      beforeUpload: handleFileSelect,
      fileList: [],
    };

    Modal.confirm({
      title: 'Import Terminal Contexts',
      width: 600,
      className: 'context-import-modal',
      icon: <UploadOutlined />,
      content: (
        <div className="import-contexts-container">
          <Paragraph>
            Import previously exported terminal contexts. This will replace your current contexts.
          </Paragraph>
          
          {importError && (
            <Alert
              message="Import Error"
              description={importError}
              type="error"
              showIcon
              style={{ marginBottom: '16px' }}
            />
          )}
          
          {importSuccess && (
            <Alert
              message="Import Successful"
              description="Terminal contexts were successfully imported."
              type="success"
              showIcon
              style={{ marginBottom: '16px' }}
            />
          )}
          
          {importing ? (
            <div className="import-loading">
              <Spin size="large" />
              <div style={{ marginTop: '16px' }}>Importing contexts...</div>
            </div>
          ) : (
            <Upload.Dragger {...uploadProps} disabled={importing || importSuccess}>
              <p className="ant-upload-drag-icon">
                <InboxOutlined />
              </p>
              <p className="ant-upload-text">Click or drag file to this area to upload</p>
              <p className="ant-upload-hint">
                Support for .json files only. Please upload a valid terminal contexts export file.
              </p>
            </Upload.Dragger>
          )}
          
          <div style={{ marginTop: '16px' }}>
            <Text type="secondary">
              <InfoCircleOutlined /> Importing contexts will replace your current contexts configuration.
              Make sure to export your current contexts first if you want to keep them.
            </Text>
          </div>
        </div>
      ),
      okText: importing ? 'Importing...' : (importSuccess ? 'Done' : 'Import'),
      cancelText: 'Cancel',
      okButtonProps: { 
        disabled: importing,
        icon: importSuccess ? <CheckCircleOutlined /> : undefined
      },
      onOk: () => {
        if (importSuccess) {
          return Promise.resolve();
        }
        
        // Trigger file input click if no file has been selected yet
        if (fileInputRef.current && !importing && !importSuccess) {
          fileInputRef.current.click();
          return Promise.reject(); // Prevent modal from closing
        }
        
        return Promise.resolve();
      }
    });
  };

  // Add keyboard shortcut handlers
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isVisible) return;
      
      // ESC to close visualizer
      if (e.key === 'Escape') {
        handleClose();
      }
      
      // Ctrl+O for overview
      if (e.key === 'o' && e.ctrlKey) {
        e.preventDefault();
        setActiveView('overview');
      }
      
      // Ctrl+D for details
      if (e.key === 'd' && e.ctrlKey) {
        e.preventDefault();
        setActiveView('details');
      }
      
      // Ctrl+E for export
      if (e.key === 'e' && e.ctrlKey) {
        e.preventDefault();
        handleExportContexts();
      }
      
      // Ctrl+I for import
      if (e.key === 'i' && e.ctrlKey) {
        e.preventDefault();
        handleImportContexts();
      }
      
      // Ctrl+S for sharing
      if (e.key === 's' && e.ctrlKey && selectedTabId) {
        e.preventDefault();
        handleOpenSharingModal();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isVisible, handleClose, selectedTabId, handleExportContexts, handleImportContexts, handleOpenSharingModal]);
  
  // Early return if not visible
  if (!isVisible) {
    return null;
  }
  
  // Handle tab selection
  const handleTabSelect = (tabId) => {
    setSelectedTabId(tabId);
    setActiveView('details');
  };
  
  /* 
   * Note: handleOpenSharingModal is already defined as a useCallback function 
   * above, so this duplicate definition is commented out
   */
  /*
  const handleOpenSharingModal = () => {
    setSourceTab(selectedTabId);
    setSharingModalVisible(true);
    setSelectedTabs([]);
411
  
  // Share context between tabs
  const handleShareContext = () => {
    if (sourceTab && selectedTabs.length > 0) {
      dispatch(shareContext({ 
        sourceTabId: sourceTab, 
        targetTabIds: selectedTabs 
      }));
      setSharingModalVisible(false);
    }
  };
  
  // Unshare context
  const handleUnshareContext = (sourceTabId, targetTabId) => {
    dispatch(unshareContext({
      sourceTabId,
      targetTabIds: [targetTabId]
    }));
  };
  
  // Clear tab context
  const handleClearContext = () => {
    if (selectedTabId) {
      Modal.confirm({
        title: 'Clear Context',
        content: 'Are you sure you want to clear this tab\'s context? This will reset command history, patterns, and environment variables.',
        onOk: () => {
          dispatch(clearTabContext({ tabId: selectedTabId }));
        }
      });
    }
  };
  
  // Render tab list
  const renderTabList = () => {
    const tabList = Object.entries(contexts).map(([id, context]) => {
      const isActive = id === activeTabId;
      const isShared = context.isShared;
      const sharedWith = context.sharedWith.length;
      
      return (
        <div 
          key={id}
          className={`context-tab-item ${isActive ? 'active' : ''} ${selectedTabId === id ? 'selected' : ''}`}
          onClick={() => handleTabSelect(id)}
        >
          <div className="tab-name">
            <CodeOutlined />
            <Text>{context.metadata?.name || `Tab ${id}`}</Text>
          </div>
          <div className="tab-indicators">
            {isActive && <Tag color="green">Active</Tag>}
            {isShared && (
              <Tooltip title={`Shared with ${sharedWith} tab${sharedWith !== 1 ? 's' : ''}`}>
                <Tag color="blue" icon={<ShareAltOutlined />}>{sharedWith}</Tag>
              </Tooltip>
            )}
            <Tag>{context.currentDirectory}</Tag>
          </div>
        </div>
      );
    });
    
    return (
      <div className="context-tab-list">
        {tabList.length > 0 ? tabList : (
          <Empty description="No tabs found" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        )}
      </div>
    );
  };
  
  // Render tab details
  const renderTabDetails = () => {
    if (!selectedContext) {
      return (
        <Empty description="Select a tab to view details" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      );
    }
    
    return (
      <div className="tab-details">
        <div className="tab-details-header">
          <Title level={4}>
            {selectedContext.metadata?.name || `Tab ${selectedTabId}`}
          </Title>
          <div className="tab-details-actions">
            <Button 
              icon={<ShareAltOutlined />} 
              onClick={handleOpenSharingModal}
            >
              Share Context
            </Button>
            <Button 
              icon={<CloseOutlined />} 
              onClick={handleClearContext}
              danger
            >
              Clear Context
            </Button>
          </div>
        </div>
        
        <Tabs defaultActiveKey="history">
          <TabPane 
            tab={<span><HistoryOutlined /> Command History</span>} 
            key="history"
          >
            {selectedContext.commandHistory.length > 0 ? (
              <div className="command-history-container">
                <Table 
                  dataSource={selectedContext.commandHistory.map((cmd, idx) => ({
                    key: idx,
                    command: cmd,
                    index: idx + 1
                  }))}
                  columns={[
                    {
                      title: '#',
                      dataIndex: 'index',
                      key: 'index',
                      width: 60
                    },
                    {
                      title: 'Command',
                      dataIndex: 'command',
                      key: 'command',
                      render: text => <Text code>{text}</Text>
                    },
                    {
                      title: 'Action',
                      key: 'action',
                      width: 100,
                      render: (_, record) => (
                        <Button 
                          type="text" 
                          size="small"
                          icon={<CodeOutlined />}
                          title="Execute command"
                        >
                          Run
                        </Button>
                      )
                    }
                  ]}
                  size="small"
                  pagination={{ pageSize: 10 }}
                />
              </div>
            ) : (
              <Empty description="No command history found" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </TabPane>
          
          <TabPane 
            tab={<span><EnvironmentOutlined /> Environment</span>} 
            key="environment"
          >
            <div className="environment-variables-container">
              {selectedContext.environment.length > 0 ? (
                <>
                  <div className="environment-header">
                    <Text strong>Environment Variables</Text>
                    <Button 
                      type="primary" 
                      size="small"
                      icon={<PlusOutlined />}
                      onClick={() => Modal.info({
                        title: 'Add Environment Variable',
                        content: 'This feature will be implemented in a future version.'
                      })}
                    >
                      Add Variable
                    </Button>
                  </div>
                  <Table 
                    dataSource={selectedContext.environment.map((env, idx) => ({
                      key: idx,
                      name: env.name,
                      value: env.value,
                      exported: env.isExported
                    }))}
                    columns={[
                      {
                        title: 'Name',
                        dataIndex: 'name',
                        key: 'name',
                        render: text => <Text strong>{text}</Text>
                      },
                      {
                        title: 'Value',
                        dataIndex: 'value',
                        key: 'value',
                        ellipsis: true
                      },
                      {
                        title: 'Exported',
                        dataIndex: 'exported',
                        key: 'exported',
                        width: 100,
                        render: exported => exported ? 
                          <Tag color="green">Yes</Tag> : 
                          <Tag color="default">No</Tag>
                      },
                      {
                        title: 'Action',
                        key: 'action',
                        width: 120,
                        render: (_, record) => (
                          <Space>
                            <Button 
                              type="text" 
                              size="small"
                              icon={<CodeOutlined />}
                              title="Edit variable"
                            />
                            <Button 
                              type="text" 
                              size="small"
                              icon={<CloseOutlined />}
                              danger
                              title="Remove variable"
                            />
                          </Space>
                        )
                      }
                    ]}
                    size="small"
                    pagination={{ pageSize: 10 }}
                  />
                </>
              ) : (
                <Empty description="No environment variables found" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              )}
            </div>
          </TabPane>
          
          <TabPane 
            tab={<span><ClusterOutlined /> Patterns</span>} 
            key="patterns"
          >
            <div className="command-patterns-container">
              {selectedContext.commandPatterns.length > 0 ? (
                <Table 
                  dataSource={selectedContext.commandPatterns.map((pattern, idx) => ({
                    key: idx,
                    pattern: pattern.pattern,
                    suggestion: pattern.suggestion,
                    description: pattern.description
                  }))}
                  columns={[
                    {
                      title: 'Pattern',
                      dataIndex: 'pattern',
                      key: 'pattern',
                      render: text => (
                        <Tag color="blue">{text}</Tag>
                      )
                    },
                    {
                      title: 'Suggestion',
                      dataIndex: 'suggestion',
                      key: 'suggestion',
                      render: text => <Text code>{text}</Text>
                    },
                    {
                      title: 'Description',
                      dataIndex: 'description',
                      key: 'description',
                      ellipsis: true
                    },
                    {
                      title: 'Action',
                      key: 'action',
                      width: 100,
                      render: (_, record) => (
                        <Button 
                          type="text" 
                          size="small"
                          icon={<CloseOutlined />}
                          danger
                          title="Remove pattern"
                        />
                      )
                    }
                  ]}
                  size="small"
                  pagination={{ pageSize: 5 }}
                />
              ) : (
                <Empty description="No command patterns detected" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              )}
            </div>
          </TabPane>
          
          <TabPane 
            tab={<span><ShareAltOutlined /> Sharing</span>} 
            key="sharing"
          >
            <div className="context-sharing-container">
              {selectedContext.isShared ? (
                <div className="shared-context-info">
                  <div className="sharing-header">
                    <Text strong>This tab is sharing its context with:</Text>
                  </div>
                  
                  <Table 
                    dataSource={selectedContext.sharedWith
                      .filter(id => contexts[id])
                      .map((id, idx) => ({
                        key: idx,
                        id,
                        name: contexts[id].metadata?.name || `Tab ${id}`,
                        directory: contexts[id].currentDirectory,
                        active: id === activeTabId
                      }))}
                    columns={[
                      {
                        title: 'Tab',
                        dataIndex: 'name',
                        key: 'name',
                        render: (text, record) => (
                          <Space>
                            <Text>{text}</Text>
                            {record.active && <Tag color="green">Active</Tag>}
                          </Space>
                        )
                      },
                      {
                        title: 'Directory',
                        dataIndex: 'directory',
                        key: 'directory'
                      },
                      {
                        title: 'Action',
                        key: 'action',
                        width: 100,
                        render: (_, record) => (
                          <Button 
                            type="text" 
                            size="small"
                            icon={<MinusOutlined />}
                            danger
                            title="Stop sharing with this tab"
                            onClick={() => handleUnshareContext(selectedTabId, record.id)}
                          >
                            Unshare
                          </Button>
                        )
                      }
                    ]}
                    size="small"
                    pagination={false}
                  />
                </div>
              ) : (
                <>
                  <Paragraph>
                    This tab is not sharing its context with any other tabs.
                  </Paragraph>
                  <Button 
                    type="primary" 
                    icon={<ShareAltOutlined />}
                    onClick={handleOpenSharingModal}
                  >
                    Share Context
                  </Button>
                </>
              )}
              
              {/* Shared contexts from other tabs */}
              {allSharedContexts.length > 0 && (
                <div className="other-shared-contexts">
                  <Divider orientation="left">Other Shared Contexts</Divider>
                  
                  <Table 
                    dataSource={allSharedContexts
                      .filter(ctx => ctx.sourceId !== selectedTabId)
                      .map((ctx, idx) => ({
                        key: idx,
                        ...ctx,
                        isSharedWithCurrent: ctx.sharedWith.includes(selectedTabId)
                      }))}
                    columns={[
                      {
                        title: 'Source Tab',
                        dataIndex: 'sourceName',
                        key: 'sourceName'
                      },
                      {
                        title: 'Directory',
                        dataIndex: 'sourceDirectory',
                        key: 'sourceDirectory'
                      },
                      {
                        title: 'Shared With',
                        key: 'sharedCount',
                        render: (_, record) => (
                          <Tag color="blue">{record.sharedWith.length} tabs</Tag>
                        )
                      },
                      {
                        title: 'Status',
                        key: 'status',
                        render: (_, record) => (
                          record.isSharedWithCurrent ? 
                            <Tag color="green">Shared with this tab</Tag> : 
                            <Tag color="default">Not shared with this tab</Tag>
                        )
                      }
                    ]}
                    size="small"
                    pagination={false}
                  />
                </div>
              )}
            </div>
          </TabPane>
          
          <TabPane 
            tab={<span><BarChartOutlined /> Statistics</span>} 
            key="statistics"
          >
            <div className="context-statistics-container">
              {selectedTabStats && (
                <>
                  <Title level={5}>Tab Context Statistics</Title>
                  <Row gutter={[16, 16]}>
                    <Col span={6}>
                      <Statistic 
                        title="Commands" 
                        value={selectedTabStats.commandCount} 
                        prefix={<HistoryOutlined />}
                      />
                    </Col>
                    <Col span={6}>
                      <Statistic 
                        title="Patterns" 
                        value={selectedTabStats.patternCount} 
                        prefix={<ClusterOutlined />}
                      />
                    </Col>
                    <Col span={6}>
                      <Statistic 
                        title="Environment Vars" 
                        value={selectedTabStats.envVarCount} 
                        prefix={<EnvironmentOutlined />}
                      />
                    </Col>
                    <Col span={6}>
                      <Statistic 
                        title="Outputs" 
                        value={selectedTabStats.outputCount} 
                        prefix={<CodeOutlined />}
                      />
                    </Col>
                  </Row>
                  
                  <Row gutter={[16, 16]}>
                    <Col span={6}>
                      <Statistic 
                        title="Unique Commands" 
                        value={statistics.uniqueCommandCount} 
                        prefix={<CodeOutlined />}
                      />
                    </Col>
                    <Col span={6}>
                      <Statistic 
                        title="Command Patterns" 
                        value={statistics.uniquePatternCount} 
                        prefix={<ClusterOutlined />}
                      />
                    </Col>
                  </Row>
                  
                  <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
                    <Col span={8}>
                      <Statistic 
                        title="Total Commands" 
                        value={statistics.totalCommandCount} 
                        prefix={<HistoryOutlined />}
                      />
                    </Col>
                    <Col span={8}>
                      <Statistic 
                        title="Environment Variables" 
                        value={statistics.uniqueEnvVarCount} 
                        prefix={<EnvironmentOutlined />}
                      />
                    </Col>
                    <Col span={8}>
                      <Statistic 
                        title="Command Outputs" 
                        value={statistics.totalOutputCount} 
                        prefix={<CodeOutlined />}
                      />
                    </Col>
                  </Row>
                </>
              )}
            </div>
          </TabPane>
        </Tabs>
      </div>
    );
  };
  
  // Render the main view
  const renderMainView = () => {
    switch (activeView) {
      case 'details':
        return renderTabDetails();
      case 'overview':
      default:
        return (
          <div className="context-overview">
            <div className="context-overview-header">
              <Title level={4}>Terminal Contexts</Title>
              <div className="overview-actions">
                <Button 
                  icon={<DatabaseOutlined />} 
                  onClick={() => handleExportContexts()}
                >
                  Export Contexts
                </Button>
                <Button 
                  icon={<UploadOutlined />} 
                  onClick={() => handleImportContexts()}
                >
                  Import Contexts
                </Button>
                <Button 
                  icon={<SyncOutlined />} 
                  onClick={() => setActiveView('details')}
                  disabled={!selectedTabId}
                >
                  View Details
                </Button>
              </div>
            </div>
            
            <div className="context-stats-summary">
              <Row gutter={[16, 16]}>
                <Col span={6}>
                  <Statistic 
                    title="Total Tabs" 
                    value={statistics.tabCount} 
                    prefix={<DatabaseOutlined />}
                  />
                </Col>
                <Col span={6}>
                  <Statistic 
                    title="Shared Contexts" 
                    value={statistics.sharedContextCount} 
                    prefix={<ShareAltOutlined />}
                  />
                </Col>
                <Col span={6}>
                  <Statistic 
                    title="Commands History" 
                    value={statistics.uniqueCommandCount} 
                    prefix={<HistoryOutlined />}
                  />
                </Col>
                <Col span={6}>
                  <Statistic 
                    title="Patterns" 
                    value={statistics.uniquePatternCount} 
                    prefix={<ClusterOutlined />}
                  />
                </Col>
              </Row>
            </div>
            
            <Divider orientation="left">Available Tabs</Divider>
            {renderTabList()}
          </div>
        );
    }
  };
  
  // Handle export contexts to JSON
  const handleExportContexts = () => {
    try {
      const exportData = {
        contexts,
        activeTabId,
        sharedContexts,
        timestamp: new Date().toISOString(),
        version: '1.0'
      };
      
      // Create file data and trigger download
      const fileData = JSON.stringify(exportData, null, 2);
      const blob = new Blob([fileData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `terminal-contexts-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the URL
      setTimeout(() => URL.revokeObjectURL(url), 100);
      
      // Show success notification
      Modal.success({
        title: 'Contexts Exported',
        content: 'Terminal contexts were successfully exported to a JSON file.'
      });
    } catch (error) {
      console.error('Error exporting contexts:', error);
      Modal.error({
        title: 'Export Failed',
        content: `Failed to export contexts: ${error.message}`
      });
    }
  };
  
  /* 
   * Note: The duplicate handleImportContexts implementation is removed
   * as it's already defined earlier in the file and now completed with proper closure
   */
  
  // [The useEffect hook has been moved before the early return]
  // Render the sharing modal
  const renderSharingModal = () => {
    // Get tabs that can be selected for sharing
    const availableTabs = Object.entries(contexts)
      .filter(([id]) => id !== sourceTab)
      .map(([id, context]) => ({
        id,
        name: context.metadata?.name || `Tab ${id}`,
        directory: context.currentDirectory,
        isActive: id === activeTabId
      }));
    
    return (
      <Modal
        title="Share Context with Tabs"
        visible={sharingModalVisible}
        onOk={handleShareContext}
        onCancel={() => setSharingModalVisible(false)}
        okText="Share"
        okButtonProps={{ disabled: selectedTabs.length === 0 }}
        width={600}
      >
        <div className="sharing-modal-content">
          <Paragraph>
            Select tabs to share context with. Shared tabs will receive:
          </Paragraph>
          <ul>
            <li>Current directory</li>
            <li>Environment variables</li>
            <li>Command patterns</li>
          </ul>
          
          {availableTabs.length > 0 ? (
            <>
              <div className="select-tabs-header">
                <Text strong>Available Tabs:</Text>
                <div className="select-actions">
                  <Button 
                    size="small" 
                    onClick={() => setSelectedTabs(availableTabs.map(tab => tab.id))}
                  >
                    Select All
                  </Button>
                  <Button 
                    size="small" 
                    onClick={() => setSelectedTabs([])}
                  >
                    Clear
                  </Button>
                </div>
              </div>
              
              <div className="select-tabs-list">
                {availableTabs.map(tab => (
                  <div 
                    key={tab.id} 
                    className={`select-tab-item ${selectedTabs.includes(tab.id) ? 'selected' : ''}`}
                    onClick={() => {
                      if (selectedTabs.includes(tab.id)) {
                        setSelectedTabs(selectedTabs.filter(id => id !== tab.id));
                      } else {
                        setSelectedTabs([...selectedTabs, tab.id]);
                      }
                    }}
                  >
                    <div className="tab-details">
                      <div className="tab-name">
                        <Text>{tab.name}</Text>
                        {tab.isActive && <Tag color="green">Active</Tag>}
                      </div>
                      <Text type="secondary">{tab.directory}</Text>
                    </div>
                    <Checkbox checked={selectedTabs.includes(tab.id)} />
                  </div>
                ))}
              </div>
            </>
          ) : (
            <Empty description="No other tabs available" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          )}
        </div>
      </Modal>
    );
  };
  
  return (
    <div className="context-visualizer-container">
      <Card 
        className="context-visualizer-card"
        title={
          <div className="visualizer-header">
            <DatabaseOutlined />
            <span>Terminal Context Visualizer</span>
            <div className="visualizer-tabs">
              <Radio.Group 
                value={activeView} 
                onChange={e => setActiveView(e.target.value)}
                buttonStyle="solid"
                size="small"
              >
                <Radio.Button value="overview">Overview</Radio.Button>
                <Radio.Button value="details" disabled={!selectedTabId}>Details</Radio.Button>
              </Radio.Group>
            </div>
            <Button 
              type="text" 
              icon={<CloseOutlined />} 
              onClick={handleClose}
              aria-label="Close visualizer"
              className="close-button"
            />
          </div>
        }
      >
        {renderMainView()}
        
        {/* Keyboard shortcuts hints */}
        <div className="keyboard-hint">
          <Tooltip title="Overview">
            <Tag color="default">Ctrl+O</Tag>
          </Tooltip>
          <Tooltip title="Tab Details">
            <Tag color="default">Ctrl+D</Tag>
          </Tooltip>
          <Tooltip title="Export Contexts">
            <Tag color="default">Ctrl+E</Tag>
          </Tooltip>
          <Tooltip title="Share Context">
            <Tag color="default">Ctrl+S</Tag>
          </Tooltip>
          <Tooltip title="Import Contexts">
            <Tag color="default">Ctrl+I</Tag>
          </Tooltip>
          <Tooltip title="Close">
            <Tag color="default">ESC</Tag>
          </Tooltip>
        </div>
      </Card>
      
      {/* Render modals */}
      {renderSharingModal()}
    </div>
  );
};

export default React.memo(ContextVisualizer);
