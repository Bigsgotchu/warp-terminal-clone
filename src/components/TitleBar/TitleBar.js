import React from 'react';
import { Button, Tabs, Dropdown, Menu, Tooltip } from 'antd';
import { 
  CloseOutlined, PlusOutlined, SettingOutlined,
  MinusOutlined, FullscreenOutlined,
  FullscreenExitOutlined, BarChartOutlined,
  DatabaseOutlined
} from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import { 
  addTab, 
  closeTab, 
  setActiveTab, 
  selectTabs, 
  selectActiveTabId
} from '../../features/terminalSlice';
import './TitleBar.css';

const TitleBar = ({ 
  onToggleStats, 
  onToggleContext, 
  isStatsVisible, 
  isContextVisible 
}) => {
  const dispatch = useDispatch();
  const tabs = useSelector(selectTabs);
  const activeTabId = useSelector(selectActiveTabId);
  const [isMaximized, setIsMaximized] = React.useState(false);

  // Handle window control operations
  const handleMinimize = () => {
    if (window.windowControl) {
      window.windowControl.minimize();
    }
  };

  const handleMaximize = () => {
    if (window.windowControl) {
      window.windowControl.maximize();
      setIsMaximized(!isMaximized);
    }
  };

  const handleClose = () => {
    if (window.windowControl) {
      window.windowControl.close();
    }
  };

  // Handle tab operations
  const handleAddTab = () => {
    dispatch(addTab());
  };

  const handleCloseTab = (tabId) => {
    dispatch(closeTab(tabId));
  };

  const handleTabChange = (tabId) => {
    dispatch(setActiveTab(tabId));
  };

  const settingsMenu = (
    <Menu
      items={[
        {
          key: '1',
          label: 'Theme Settings',
        },
        {
          key: '2',
          label: 'Font Settings',
        },
        {
          key: '3',
          label: 'Shell Configuration',
        },
        {
          key: '4',
          label: 'Keyboard Shortcuts',
        },
      ]}
    />
  );

  return (
    <div className="title-bar">
      <div className="window-controls">
        <Button 
          type="text" 
          icon={<MinusOutlined />} 
          onClick={handleMinimize} 
          className="window-control-button minimize"
        />
        <Button 
          type="text" 
          icon={isMaximized ? <FullscreenExitOutlined /> : <FullscreenOutlined />} 
          onClick={handleMaximize} 
          className="window-control-button maximize"
        />
        <Button 
          type="text" 
          icon={<CloseOutlined />} 
          onClick={handleClose} 
          className="window-control-button close"
        />
      </div>
      
      <div className="tab-container">
        <Tabs
          hideAdd
          type="editable-card"
          onChange={handleTabChange}
          activeKey={activeTabId}
          onEdit={(targetKey, action) => {
            if (action === 'remove') {
              handleCloseTab(targetKey);
            }
          }}
          items={tabs.map(tab => ({
            key: tab.id,
            label: tab.title,
            closable: tabs.length > 1,
          }))}
        />
        <Button 
          type="text" 
          icon={<PlusOutlined />} 
          onClick={handleAddTab} 
          className="add-tab-button"
        />
      </div>
      
      <div className="title-actions">
        <Tooltip title="Command Statistics (Ctrl+Alt+S)">
          <Button 
            type="text" 
            icon={<BarChartOutlined />} 
            onClick={onToggleStats}
            className={`feature-button ${isStatsVisible ? 'active' : ''}`}
          />
        </Tooltip>
        <Tooltip title="Context Visualizer (Ctrl+Alt+C)">
          <Button 
            type="text" 
            icon={<DatabaseOutlined />} 
            onClick={onToggleContext}
            className={`feature-button ${isContextVisible ? 'active' : ''}`}
          />
        </Tooltip>
        <Dropdown overlay={settingsMenu} placement="bottomRight">
          <Button 
            type="text" 
            icon={<SettingOutlined />} 
            className="settings-button"
          />
        </Dropdown>
      </div>
    </div>
  );
};

export default TitleBar;

