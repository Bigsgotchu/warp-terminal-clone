import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  Card, 
  Switch, 
  Form, 
  Input, 
  Select, 
  Slider, 
  Button, 
  Divider, 
  Typography, 
  Tooltip,
  Space,
  Alert
} from 'antd';
import { 
  InfoCircleOutlined, 
  ApiOutlined, 
  RobotOutlined,
  SettingOutlined,
  CloudOffOutlined,
  CloudOutlined  
} from '@ant-design/icons';

import { 
  toggleAI, 
  updateSettings, 
  selectAIEnabled, 
  selectAISettings,
  resetAIState
} from '../../features/ai/aiSlice';

import './AISettings.css';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

/**
 * AI Settings panel component
 * Provides controls for configuring AI features
 */
const AISettings = () => {
  const dispatch = useDispatch();
  const aiEnabled = useSelector(selectAIEnabled);
  const settings = useSelector(selectAISettings);
  
  // Local state for form values
  const [apiKey, setApiKey] = useState('');
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [resetConfirmVisible, setResetConfirmVisible] = useState(false);
  
  /**
   * Toggle AI features on/off
   */
  const handleToggleAI = () => {
    dispatch(toggleAI());
  };
  
  /**
   * Update a specific setting
   */
  const updateSetting = (key, value) => {
    dispatch(updateSettings({ [key]: value }));
  };
  
  /**
   * Save API key
   */
  const handleSaveApiKey = () => {
    if (apiKey) {
      // In a real app, you might want to store this securely
      dispatch(updateSettings({ apiKey }));
      setApiKey('');
      setShowApiKeyInput(false);
    }
  };
  
  /**
   * Reset all AI data
   */
  const handleResetAI = () => {
    dispatch(resetAIState());
    setResetConfirmVisible(false);
  };

  return (
    <Card 
      className="ai-settings-card" 
      title={
        <Space>
          <RobotOutlined />
          <span>AI Terminal Features</span>
        </Space>
      }
    >
      {/* Master toggle for AI features */}
      <div className="ai-master-toggle">
        <Space align="center" size="large">
          <Switch 
            checked={aiEnabled} 
            onChange={handleToggleAI}
            className="ai-toggle-switch"
          />
          <span className="toggle-label">
            {aiEnabled ? 'AI features enabled' : 'AI features disabled'}
          </span>
        </Space>
      </div>
      
      <Divider />
      
      {/* AI features configuration */}
      <Form layout="vertical" disabled={!aiEnabled}>
        {/* Feature toggles */}
        <Title level={5}>
          <SettingOutlined /> Feature Settings
        </Title>
        
        <Form.Item 
          label="Command suggestions"
          tooltip="Show real-time suggestions as you type"
        >
          <Switch 
            checked={settings.enabled}
            onChange={(checked) => updateSetting('enabled', checked)}
          />
        </Form.Item>
        
        <Form.Item 
          label="Command explanations"
          tooltip="Explain commands when requested (Ctrl+/)"
        >
          <Switch 
            checked={settings.showExplanations}
            onChange={(checked) => updateSetting('showExplanations', checked)}
          />
        </Form.Item>
        
        <Form.Item 
          label="Suggestion threshold"
          tooltip="Minimum characters before showing suggestions"
        >
          <Slider 
            min={1} 
            max={5} 
            value={settings.suggestionThreshold}
            onChange={(value) => updateSetting('suggestionThreshold', value)}
            marks={{ 1: '1', 3: '3', 5: '5' }}
          />
        </Form.Item>
        
        <Form.Item 
          label="Maximum suggestions"
          tooltip="Number of suggestions to show at once"
        >
          <Slider 
            min={1} 
            max={10} 
            value={settings.maxSuggestions}
            onChange={(value) => updateSetting('maxSuggestions', value)}
            marks={{ 1: '1', 5: '5', 10: '10' }}
          />
        </Form.Item>
        
        <Form.Item 
          label="Context depth"
          tooltip="Number of recent commands to consider for context"
        >
          <Slider 
            min={1} 
            max={10} 
            value={settings.contextDepth}
            onChange={(value) => updateSetting('contextDepth', value)}
            marks={{ 1: '1', 5: '5', 10: '10' }}
          />
        </Form.Item>
        
        <Divider />
        
        {/* API settings */}
        <Title level={5}>
          <ApiOutlined /> API Configuration
        </Title>
        
        <Form.Item 
          label="AI model"
          tooltip="Select the AI model to use for suggestions"
        >
          <Select 
            value={settings.apiModel}
            onChange={(value) => updateSetting('apiModel', value)}
          >
            <Option value="gpt-3.5-turbo">GPT-3.5 Turbo (Faster)</Option>
            <Option value="gpt-4">GPT-4 (More accurate)</Option>
            <Option value="offline">Local model (Limited features)</Option>
          </Select>
        </Form.Item>
        
        <Form.Item 
          label="Offline mode"
          tooltip="Run with limited features without API connection"
        >
          <Switch 
            checked={settings.offlineMode}
            onChange={(checked) => updateSetting('offlineMode', checked)}
            checkedChildren={<CloudOffOutlined />}
            unCheckedChildren={<CloudOutlined />}
          />
          {settings.offlineMode && (
            <Alert 
              message="Offline mode active" 
              description="Limited AI functionality available without API connection" 
              type="info" 
              showIcon 
              style={{ marginTop: 8 }}
            />
          )}
        </Form.Item>
        
        {/* API Key section */}
        <Form.Item label="API Key">
          {showApiKeyInput ? (
            <Space direction="vertical" style={{ width: '100%' }}>
              <Input.Password 
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter API key"
              />
              <Space>
                <Button type="primary" onClick={handleSaveApiKey}>
                  Save Key
                </Button>
                <Button onClick={() => setShowApiKeyInput(false)}>
                  Cancel
                </Button>
              </Space>
            </Space>
          ) : (
            <Button onClick={() => setShowApiKeyInput(true)}>
              {settings.apiKey ? 'Update API Key' : 'Add API Key'}
            </Button>
          )}
        </Form.Item>
        
        <Form.Item 
          label="API Endpoint"
          tooltip="Custom API endpoint URL (advanced)"
        >
          <Input 
            value={settings.apiEndpoint}
            onChange={(e) => updateSetting('apiEndpoint', e.target.value)}
            placeholder="https://api.example.com/v1"
          />
        </Form.Item>
        
        <Divider />
        
        {/* Reset section */}
        <Form.Item>
          {resetConfirmVisible ? (
            <Alert
              message="Reset AI data?"
              description="This will clear all AI data, including suggestions, history analysis, and settings."
              type="warning"
              showIcon
              action={
                <Space>
                  <Button onClick={handleResetAI} danger>
                    Reset
                  </Button>
                  <Button onClick={() => setResetConfirmVisible(false)}>
                    Cancel
                  </Button>
                </Space>
              }
            />
          ) : (
            <Button 
              danger 
              onClick={() => setResetConfirmVisible(true)}
            >
              Reset AI Data
            </Button>
          )}
        </Form.Item>
      </Form>
      
      {/* Help information */}
      <Divider />
      <Paragraph type="secondary">
        <InfoCircleOutlined /> AI features enhance your terminal experience with smart suggestions,
        command explanations, and context-aware assistance. Your commands are processed
        locally or via API depending on configuration.
      </Paragraph>
    </Card>
  );
};

export default AISettings;

