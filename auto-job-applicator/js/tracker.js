// Application tracking functionality
const ApplicationTracker = {
  // Track a new application
  trackApplication: function(applicationData) {
    return new Promise((resolve, reject) => {
      if (!applicationData.url) {
        applicationData.url = window.location.href;
      }
      
      if (!applicationData.date) {
        applicationData.date = new Date().toISOString();
      }
      
      // Add to Chrome storage
      Storage.addApplicationToHistory(applicationData).then(resolve).catch(reject);
      
      // Also notify the background script for potential additional processing
      chrome.runtime.sendMessage({
        action: 'trackApplication',
        ...applicationData
      });
    });
  },
  
  // Get all tracked applications
  getApplications: function() {
    return Storage.getApplicationHistory();
  },
  
  // Search for applications by keyword
  searchApplications: function(keyword) {
    return new Promise((resolve, reject) => {
      this.getApplications().then(applications => {
        if (!keyword) {
          resolve(applications);
          return;
        }
        
        const lowerKeyword = keyword.toLowerCase();
        const filtered = applications.filter(app => {
          const jobTitle = (app.jobTitle || '').toLowerCase();
          const company = (app.company || '').toLowerCase();
          const url = (app.url || '').toLowerCase();
          
          return jobTitle.includes(lowerKeyword) || 
                 company.includes(lowerKeyword) || 
                 url.includes(lowerKeyword);
        });
        
        resolve(filtered);
      }).catch(reject);
    });
  },
  
  // Get applications by status
  getApplicationsByStatus: function(status) {
    return new Promise((resolve, reject) => {
      this.getApplications().then(applications => {
        const filtered = applications.filter(app => app.status === status);
        resolve(filtered);
      }).catch(reject);
    });
  },
  
  // Get applications by date range
  getApplicationsByDateRange: function(startDate, endDate) {
    return new Promise((resolve, reject) => {
      this.getApplications().then(applications => {
        const start = new Date(startDate).getTime();
        const end = new Date(endDate).getTime();
        
        const filtered = applications.filter(app => {
          const appDate = new Date(app.date).getTime();
          return appDate >= start && appDate <= end;
        });
        
        resolve(filtered);
      }).catch(reject);
    });
  },
  
  // Get application statistics
  getStatistics: function() {
    return new Promise((resolve, reject) => {
      this.getApplications().then(applications => {
        const stats = {
          total: applications.length,
          successful: 0,
          failed: 0,
          byDate: {},
          byCompany: {}
        };
        
        applications.forEach(app => {
          // Count by status
          if (app.status === 'success') {
            stats.successful++;
          } else if (app.status === 'error') {
            stats.failed++;
          }
          
          // Group by date (just the day part)
          const dateStr = app.date.split('T')[0];
          stats.byDate[dateStr] = (stats.byDate[dateStr] || 0) + 1;
          
          // Group by company
          const company = app.company || 'Unknown';
          stats.byCompany[company] = (stats.byCompany[company] || 0) + 1;
        });
        
        resolve(stats);
      }).catch(reject);
    });
  },
  
  // Delete an application from history
  deleteApplication: function(applicationId) {
    return new Promise((resolve, reject) => {
      this.getApplications().then(applications => {
        const updatedApplications = applications.filter(app => {
          // Create a unique ID from date and URL if one isn't provided
          const appId = applicationId || `${app.date}-${app.url}`;
          const currentAppId = `${app.date}-${app.url}`;
          return currentAppId !== appId;
        });
        
        chrome.storage.sync.set({ applicationHistory: updatedApplications }, function() {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve();
          }
        });
      }).catch(reject);
    });
  },
  
  // Clear all application history
  clearApplicationHistory: function() {
    return new Promise((resolve, reject) => {
      chrome.storage.sync.set({ applicationHistory: [] }, function() {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  }
};
