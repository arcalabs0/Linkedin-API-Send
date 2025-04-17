// Background script for handling events and actions

// Set up initial settings and data storage when extension is first installed
chrome.runtime.onInstalled.addListener(function(details) {
  if (details.reason === 'install') {
    // Set default settings
    const defaultSettings = {
      autoDetect: true,
      showNotification: true,
      oneClickSubmit: true,
      defaultResume: '',
      isFirstRun: true
    };
    
    chrome.storage.sync.set({ appSettings: defaultSettings }, function() {
      console.log('Default settings initialized');
      
      // Open onboarding page
      chrome.tabs.create({
        url: chrome.runtime.getURL('onboarding.html')
      });
    });
    
    // Initialize empty history array
    chrome.storage.sync.set({ applicationHistory: [] }, function() {
      console.log('Application history initialized');
    });
  }
});

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (message.action === 'trackApplication') {
    // Add new application to history
    chrome.storage.sync.get('applicationHistory', function(data) {
      let history = data.applicationHistory || [];
      
      // Remove oldest entries if we have too many
      if (history.length >= 100) {
        history = history.slice(-99);
      }
      
      // Add the new application entry
      history.push({
        url: message.url,
        jobTitle: message.jobTitle,
        company: message.company,
        status: message.status,
        date: new Date().toISOString()
      });
      
      // Save updated history
      chrome.storage.sync.set({ applicationHistory: history }, function() {
        sendResponse({ success: true });
      });
    });
    
    return true; // Indicates async response
  }
});

// Add context menu options
chrome.runtime.onInstalled.addListener(function() {
  chrome.contextMenus.create({
    id: 'fillCurrentForm',
    title: 'Fill job application form',
    contexts: ['page']
  });
  
  chrome.contextMenus.create({
    id: 'fillAndSubmitForm',
    title: '✓ EASY APPLY - Fill & Submit',
    contexts: ['page']
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(function(info, tab) {
  if (info.menuItemId === 'fillCurrentForm') {
    chrome.tabs.sendMessage(tab.id, { action: 'fillForm' });
  } else if (info.menuItemId === 'fillAndSubmitForm') {
    chrome.tabs.sendMessage(tab.id, { action: 'fillAndSubmit' });
  }
});
