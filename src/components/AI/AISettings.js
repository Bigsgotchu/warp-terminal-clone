import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Card,
  Typography,
  Switch,
  Form,
  Select,
  Button,
  Tooltip,
  Slider,
  Radio,
  Divider,
  Input,
  Tag,
  Space,
  Alert,
  Collapse,
  Tabs
} from 'antd';
import {
  SettingOutlined,
  CloseOutlined,
  RobotOutlined,
  ApiOutlined,
  LockOutlined,
  CloudOutlined,
  CodeOutlined,
  DatabaseOutlined,
  QuestionCircleOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined,
  SaveOutlined
} from '@ant-design/icons';
import {
  selectAIEnabled,
  toggleAI,
  updateAISettings,
  selectAISettings,
  resetAISettings
} from '../../features/ai/aiSlice';
import './AISettings.css';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;
const { Panel } = Collapse;

/**
 * AISettings component allows users to configure AI assistant features
 * 
 * @param {Object} props Component props
 * @param {boolean} [props.isVisible=false] Whether the settings panel is visible
 * @param {Function} [props.onClose] Callback to close the settings panel
 * @returns {React.ReactElement|null} The AI settings component or null if not visible
 */
const AISettings = ({ isVisible = false, onClose }) => {
  const dispatch = useDispatch();
  const aiEnabled = useSelector(selectAIEnabled);
  const aiSettings = useSelector(selectAISettings);
  
  const [form] = Form.useForm();
  const containerRef = useRef(null);
  const [activeTab, setActiveTab] = useState('general');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Initialize form with current settings
  useEffect(() => {
    if (aiSettings) {
      form.setFieldsValue(aiSettings);
    }
  }, [aiSettings, form]);
  
  // Handle closing the settings panel
  const handleClose = useCallback(() => {
    if (hasUnsavedChanges) {
      // Confirm before closing if there are unsaved changes
      if (window.confirm('You have unsaved changes. Are you sure you want to close?')) {
        onClose?.();
      }
    } else {
      onClose?.();
    }
  }, [hasUnsavedChanges, onClose]);
  
  // Handle form field changes
  const handleFormChange = useCallback(() => {
    setHasUnsavedChanges(true);
  }, []);
  
  // Focus management - focus container when it becomes visible
  useEffect(() => {
    if (isVisible && containerRef.current) {
      containerRef.current.focus();
    }
  }, [isVisible]);
  
  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Escape key to close settings
      if (e.key === 'Escape' && isVisible) {
        handleClose();
      }
      
      // Tab key navigation between settings sections
      if (e.key === '1' && e.altKey) {
        setActiveTab('general');
      } else if (e.key === '2' && e.altKey) {
        setActiveTab('context');
      } else if (e.key === '3' && e.altKey) {
        setActiveTab('model');
      } else if (e.key === '4' && e.altKey) {
        setActiveTab('privacy');
      }
      
      // Ctrl+S to save settings
      if (e.key === 's' && e.ctrlKey && isVisible) {
        e.preventDefault();
        handleSaveSettings();
      }
    };
    
    if (isVisible) {
      window.addEventListener('keydown', handleKeyDown);
    }
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isVisible, handleClose, hasUnsavedChanges]);
  
  // If not visible, don't render anything
  if (!isVisible) {
    return null;
  }
  
  // Handle AI toggle
  const handleAIToggle = (checked) => {
    dispatch(toggleAI(checked));
  };
  
  // Handle saving settings
  const handleSaveSettings = async () => {
    try {
      // Validate form fields
      const values = await form.validateFields();
      
      // Dispatch update action
      dispatch(updateAISettings(values));
      
      // Clear unsaved changes flag
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };
  
  // Handle resetting settings to defaults
  const handleResetSettings = () => {
    if (window.confirm('Are you sure you want to reset all AI settings to defaults?')) {
      dispatch(resetAISettings());
      form.resetFields();
      setHasUnsavedChanges(false);
    }
  };
  
  return (
    <div 
      className="ai-settings-container" 
      ref={containerRef}
      tabIndex={0}
      role="dialog"
      aria-labelledby="ai-settings-title"
      aria-describedby="ai-settings-desc"
    >
      <Card
        title={
          <div className="settings-header" id="ai-settings-title">
            <SettingOutlined />
            <span>AI Assistant Settings</span>
            <Button 
              type="text" 
              icon={<CloseOutlined />} 
              onClick={handleClose}
              aria-label="Close settings"
              className="close-button"
            />
          </div>
        }
        className="settings-card"
        id="ai-settings-desc"
      >
        <div className="settings-global-toggle">
          <div className="ai-toggle-label">
            <RobotOutlined />
            <Text strong>Enable AI Assistant</Text>
          </div>
          <Switch 
            checked={aiEnabled} 
            onChange={handleAIToggle}
            aria-label="Enable AI Assistant"
          />
        </div>
        
        {aiEnabled ? (
          <>
            <Form
              form={form}
              layout="vertical"
              onValuesChange={handleFormChange}
              className="ai-settings-form"
            >
              <Tabs 
                activeKey={activeTab}
                onChange={setActiveTab}
                className="settings-tabs"
              >
                {/* General Settings Tab */}
                <TabPane 
                  tab={
                    <span>
                      <SettingOutlined /> General
                    </span>
                  } 
                  key="general"
                >
                  <Form.Item
                    name="assistantName"
                    label="Assistant Name"
                    tooltip="Customize the name of your AI assistant"
                  >
                    <Input placeholder="Terminal Assistant" />
                  </Form.Item>
                  
                  <Form.Item
                    name="commandSuggestions"
                    label="Command Suggestions"
                    tooltip="Enable AI to suggest commands based on your history"
                  >
                    <Switch defaultChecked />
                  </Form.Item>
                  
                  <Form.Item
                    name="autoComplete"
                    label="Intelligent Auto-Complete"
                    tooltip="Use AI to power smarter auto-completion"
                  >
                    <Switch defaultChecked />
                  </Form.Item>
                  
                  <Form.Item
                    name="commandExplanations"
                    label="Command Explanations"
                    tooltip="Show explanations for complex commands"
                  >
                    <Radio.Group>
                      <Radio value="always">Always</Radio>
                      <Radio value="onRequest">On Request</Radio>
                      <Radio value="never">Never</Radio>
                    </Radio.Group>
                  </Form.Item>
                  
                  <Form.Item
                    name="historyAnalysis"
                    label="Command History Analysis"
                    tooltip="Allow AI to analyze command patterns in history"
                  >
                    <Switch defaultChecked />
                  </Form.Item>
                </TabPane>
                
                {/* Context Settings Tab */}
                <TabPane 
                  tab={
                    <span>
                      <DatabaseOutlined /> Context
                    </span>
                  } 
                  key="context"
                >
                  <Form.Item
                    name="contextWindow"
                    label="Context Window Size"
                    tooltip="Number of recent commands to include in context"
                  >
                    <Slider
                      min={10}
                      max={100}
                      marks={{
                        10: '10',
                        50: '50',
                        100: '100'
                      }}
                    />
                  </Form.Item>
                  
                  <Form.Item
                    name="environmentContext"
                    label="Include Environment Variables"
                    tooltip="Add environment variables to AI context"
                  >
                    <Switch defaultChecked />
                  </Form.Item>
                  
                  <Form.Item
                    name="fileSystemContext"
                    label="File System Context"
                    tooltip="Allow AI to access current directory structure"
                  >
                    <Select defaultValue="currentDirOnly">
                      <Option value="none">None</Option>
                      <Option value="currentDirOnly">Current Directory Only</Option>
                      <Option value="fullAccess">Full Access (All Directories)</Option>
                    </Select>
                  </Form.Item>
                  
                  <Form.Item
                    name="persistContext"
                    label="Persist Context Between Sessions"
                    tooltip="Save context when terminal is closed"
                  >
                    <Switch defaultChecked />
                  </Form.Item>
                  
                  <Form.Item
                    name="contextSharing"
                    label="Context Sharing Between Tabs"
                    tooltip="Share context between multiple terminal tabs"
                  >
                    <Radio.Group>
                      <Radio value="none">None</Radio>
                      <Radio value="manual">Manual</Radio>
                      <Radio value="automatic">Automatic</Radio>
                    </Radio.Group>
                  </Form.Item>
                </TabPane>
                
                {/* Model Settings Tab */}
                <TabPane 
                  tab={
                    <span>
                      <ApiOutlined /> Model
                    </span>
                  } 
                  key="model"
                >
                  <Form.Item
                    name="modelProvider"
                    label="AI Model Provider"
                    tooltip="Choose which AI service to use"
                  >
                    <Select defaultValue="openai">
                      <Option value="openai">OpenAI</Option>
                      <Option value="anthropic">Anthropic</Option>
                      <Option value="local">Local Model</Option>
                      <Option value="custom">Custom API</Option>
                    </Select>
                  </Form.Item>
                  
                  <Form.Item
                    name="modelName"
                    label="Model Name"
                    tooltip="Select specific model to use"
                    dependencies={['modelProvider']}
                  >
                    <Select defaultValue="gpt-4">
                      <Option value="gpt-4">GPT-4</Option>
                      <Option value="gpt-3.5-turbo">GPT-3.5 Turbo</Option>
                      <Option value="claude-2">Claude 2</Option>
                      <Option value="llama2">Llama 2</Option>
                    </Select>
                  </Form.Item>
                  
                  <Form.Item
                    name="apiKey"
                    label="API Key"
                    tooltip="Your API key (stored securely)"
                    dependencies={['modelProvider']}
                  >
                    <Input.Password placeholder="Enter API key" />
                  </Form.Item>
                  
                  <Form.Item
                    name="temperature"
                    label="Temperature"
                    tooltip="Controls randomness (0 = deterministic, 1 = creative)"
                  >
                    <Slider
                      min={0}
                      max={1}
                      step={0.1}
                      marks={{
                        0: '0',
                        0.5: '0.5',
                        1: '1'
                      }}
                    />
                  </Form.Item>
                  
                  <Form.Item
                    name="customEndpoint"
                    label="Custom API Endpoint"
                    tooltip="URL for custom API endpoint"
                    dependencies={['modelProvider']}
                  >
                    <Input placeholder="https://api.example.com/v1" />
                  </Form.Item>
                </TabPane>
                
                {/* Privacy Settings Tab */}
                <TabPane 
                  tab={
                    <span>
                      <LockOutlined /> Privacy
                    </span>
                  } 
                  key="privacy"
                >
                  <Alert
                    message="Privacy Information"
                    description="These settings control what data is collected and sent to AI models. More restrictive settings may reduce AI effectiveness."
                    type="info"
                    showIcon
                    icon={<InfoCircleOutlined />}
                    style={{ marginBottom: '16px' }}
                  />
                  
                  <Form.Item
                    name="offlineMode"
                    label="Offline Mode"
                    tooltip="Use only local models without internet connectivity"
                  >
                    <Switch />
                  </Form.Item>
                  
                  <Form.Item
                    name="dataSharingLevel"
                    label="Data Sharing Level"
                    tooltip="Control what data is shared with AI provider"
                  >
                    <Radio.Group>
                      <Radio value="minimal">Minimal (Commands Only)</Radio>
                      <Radio value="standard">Standard (Commands + Context)</Radio>
                      <Radio value="full">Full (All Terminal Data)</Radio>
                      <Radio value="none">None (Offline Only)</Radio>
                    </Radio.Group>
                  </Form.Item>
                  
                  <Form.Item
                    name="anonymizeData"
                    label="Anonymize Sensitive Data"
                    tooltip="Automatically redact usernames, paths, IPs, and other sensitive information"
                  >
                    <Switch defaultChecked />
                  </Form.Item>
                  
                  <Form.Item
                    name="excludePatterns"
                    label="Exclude Patterns"
                    tooltip="Commands matching these patterns will never be sent to AI"
                  >
                    <Input.TextArea 
                      placeholder="ssh*, *password*, aws*, *token*"
                      autoSize={{ minRows: 2, maxRows: 4 }}
                    />
                  </Form.Item>
                  
                  <Collapse ghost>
                    <Panel header="Advanced Privacy Settings" key="advanced-privacy">
                      <Form.Item
                        name="dataRetentionPeriod"
                        label="Data Retention Period"
                        tooltip="How long to store AI interaction data"
                      >
                        <Select>
                          <Option value="session">Current Session Only</Option>
                          <Option value="day">24 Hours</Option>
                          <Option value="week">1 Week</Option>
                          <Option value="month">1 Month</Option>
                          <Option value="indefinite">Indefinite</Option>
                        </Select>
                      </Form.Item>
                      
                      <Form.Item
                        name="allowTelemetry"
                        label="Allow Anonymous Usage Statistics"
                        tooltip="Help improve AI assistant by sharing anonymous usage data"
                      >
                        <Switch />
                      </Form.Item>
                    </Panel>
                  </Collapse>
                </TabPane>
              </Tabs>
              
              <div className="settings-action-buttons">
                <Button onClick={handleResetSettings}>
                  Reset to Defaults
                </Button>
                <Button 
                  type="primary" 
                  onClick={handleSaveSettings}
                  disabled={!hasUnsavedChanges}
                  icon={<SaveOutlined />}
                >
                  Save Settings
                </Button>
              </div>
            </Form>
          </>
        ) : (
          <Alert
            message="AI Assistant is Disabled"
            description="Enable the AI Assistant to access settings."
            type="info"
            showIcon
          />
        )}
      </Card>
    </div>
  );
};

export default AISettings;
