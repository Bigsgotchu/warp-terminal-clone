import React, { useState } from 'react';
import { Tabs, Button, Input, Modal, Dropdown, Menu } from 'antd';
import { 
  PlusOutlined, 
  CloseOutlined, 
  EditOutlined, 
  SettingOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import { 
  addTab, 
  closeTab, 
  setActiveTab, 
  renameTab,
  selectTabs, 
  selectActiveTabId 
} from '../../features/terminalSlice';
import './TabManager.css';

const { TabPane } = Tabs;
const { confirm } = Modal;

const TabManager = () => {
  const dispatch = useDispatch();
  const tabs = useSelector(selectTabs);
  const activeTabId = useSelector(selectActiveTabId);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editTabId, setEditTabId] = useState(null);
  const [newTabTitle, setNewTabTitle] = useState('');

  // Handle adding a new tab
  const handleAddTab = () => {
    dispatch(addTab());
  };

  // Handle closing a tab
  const handleCloseTab = (tabId) => {
    // Show confirmation dialog if it's the only tab or has content
    const tab = tabs.find(tab => tab.id === tabId);
    if (tabs.length === 1 || (tab && tab.output.length > 0)) {
      confirm({
        title: 'Are you sure you want to close this tab?',
        icon: <ExclamationCircleOutlined />,
        content: tabs.length === 1 
          ? 'This is the only tab. The application will remain open with a new empty tab.' 
          : 'Any unsaved work in this tab will be lost.',
        onOk() {
          dispatch(closeTab(tabId));
        },
      });
    } else {
      dispatch(closeTab(tabId));
    }
  };

  // Handle tab change
  const handleTabChange = (activeKey) => {
    dispatch(setActiveTab(activeKey));
  };

  // Open rename modal
  const openRenameModal = (tabId) => {
    const tab = tabs.find(tab => tab.id === tabId);
    if (tab) {
      setEditTabId(tabId);
      setNewTabTitle(tab.title);
      setEditModalVisible(true);
    }
  };

  // Handle tab rename
  const handleRenameTab = () => {
    if (editTabId && newTabTitle.trim()) {
      dispatch(renameTab({ 
        tabId: editTabId, 
        title: newTabTitle.trim() 
      }));
      setEditModalVisible(false);
      setEditTabId(null);
      setNewTabTitle('');
    }
  };

  // Handle edit tab operations (context menu)
  const getTabMenu = (tabId) => (
    <Menu>
      <Menu.Item key="rename" icon={<EditOutlined />} onClick={() => openRenameModal(tabId)}>
        Rename Tab
      </Menu.Item>
      <Menu.Item 
        key="close" 
        icon={<CloseOutlined />} 
        onClick={() => handleCloseTab(tabId)}
        disabled={tabs.length === 1}
      >
        Close Tab
      </Menu.Item>
    </Menu>
  );

  // Custom tab bar with add button
  const renderTabBar = (props, DefaultTabBar) => (
    <div className="tab-bar-container">
      <DefaultTabBar {...props} className="custom-tab-bar" />
      <Button 
        icon={<PlusOutlined />} 
        className="add-tab-button" 
        onClick={handleAddTab}
        type="text"
      />
    </div>
  );

  return (
    <div className="tab-manager">
      <Tabs
        hideAdd
        type="editable-card"
        activeKey={activeTabId}
        onChange={handleTabChange}
        onEdit={(targetKey, action) => {
          if (action === 'remove') {
            handleCloseTab(targetKey);
          }
        }}
        renderTabBar={renderTabBar}
      >
        {tabs.map(tab => (
          <TabPane
            tab={
              <Dropdown overlay={getTabMenu(tab.id)} trigger={['contextMenu']}>
                <span className="tab-title">
                  {tab.title}
                  {tab.isProcessing && <span className="tab-processing-indicator" />}
                </span>
              </Dropdown>
            }
            key={tab.id}
            closable={tabs.length > 1}
          />
        ))}
      </Tabs>

      {/* Rename Tab Modal */}
      <Modal
        title="Rename Tab"
        visible={editModalVisible}
        onOk={handleRenameTab}
        onCancel={() => setEditModalVisible(false)}
        okButtonProps={{ disabled: !newTabTitle.trim() }}
      >
        <Input
          placeholder="Enter tab name"
          value={newTabTitle}
          onChange={(e) => setNewTabTitle(e.target.value)}
          autoFocus
          onPressEnter={handleRenameTab}
        />
      </Modal>
    </div>
  );
};

export default TabManager;

