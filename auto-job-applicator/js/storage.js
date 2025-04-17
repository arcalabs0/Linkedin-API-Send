// Storage handling functionality
const Storage = {
  // Save profile data to Chrome sync storage
  saveProfileData: function(profileData) {
    return new Promise((resolve, reject) => {
      chrome.storage.sync.set({ profileData }, function() {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  },
  
  // Get profile data from Chrome sync storage
  getProfileData: function() {
    return new Promise((resolve, reject) => {
      chrome.storage.sync.get('profileData', function(data) {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(data.profileData || null);
        }
      });
    });
  },
  
  // Save application settings to Chrome sync storage
  saveSettings: function(settings) {
    return new Promise((resolve, reject) => {
      chrome.storage.sync.set({ appSettings: settings }, function() {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  },
  
  // Get application settings from Chrome sync storage
  getSettings: function() {
    return new Promise((resolve, reject) => {
      chrome.storage.sync.get('appSettings', function(data) {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(data.appSettings || {
            autoDetect: true,
            showNotification: true,
            oneClickSubmit: true,
            defaultResume: ''
          });
        }
      });
    });
  },
  
  // Add an application to history
  addApplicationToHistory: function(applicationData) {
    return new Promise((resolve, reject) => {
      this.getApplicationHistory().then(history => {
        // Create a new history array if one doesn't exist
        if (!history) {
          history = [];
        }
        
        // Limit history size to avoid storage quota issues
        if (history.length >= 100) {
          history = history.slice(-99);
        }
        
        // Add new entry
        history.push({
          ...applicationData,
          date: new Date().toISOString()
        });
        
        // Save updated history
        chrome.storage.sync.set({ applicationHistory: history }, function() {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve();
          }
        });
      }).catch(reject);
    });
  },
  
  // Get application history from Chrome sync storage
  getApplicationHistory: function() {
    return new Promise((resolve, reject) => {
      chrome.storage.sync.get('applicationHistory', function(data) {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(data.applicationHistory || []);
        }
      });
    });
  },
  
  // Clear all stored data
  clearAllData: function() {
    return new Promise((resolve, reject) => {
      chrome.storage.sync.clear(function() {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  },
  
  // Export all user data as JSON
  exportData: function() {
    return new Promise((resolve, reject) => {
      chrome.storage.sync.get(null, function(data) {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          const exportData = JSON.stringify(data, null, 2);
          resolve(exportData);
        }
      });
    });
  },
  
  // Import user data from JSON
  importData: function(jsonData) {
    return new Promise((resolve, reject) => {
      try {
        const data = JSON.parse(jsonData);
        
        // Validate imported data structure
        if (!data.profileData && !data.appSettings && !data.applicationHistory) {
          reject(new Error('Invalid data format'));
          return;
        }
        
        // Clear existing data first
        this.clearAllData().then(() => {
          // Set the imported data
          chrome.storage.sync.set(data, function() {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve();
            }
          });
        }).catch(reject);
      } catch (error) {
        reject(error);
      }
    });
  }
};
