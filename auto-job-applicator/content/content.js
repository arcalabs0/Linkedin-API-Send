// Main content script that orchestrates form detection and filling
(function () {
  console.log("Content script loaded");

  // Listen for messages from popup
  chrome.runtime.onMessage.addListener(function (
    message,
    sender,
    sendResponse
  ) {
    console.log("Received message:", message);

    switch (message.action) {
      case "fillForm":
        fillDetectedForm();
        break;
      case "fillAndSubmit":
        fetch("http://localhost:5000/start")
          .then((response) => response.json())
          .then((data) => {
            console.log("Application started:", data);
            sendResponse({ status: "success", data });
          })
          .catch((error) => {
            console.error("Error:", error);
            sendResponse({ status: "error", error: error.message });
          });
        return true; // Keep the message channel open for async response
      case "detectForms":
        detectForms();
        break;
    }

    return true; //necessary for compatibility
  });

  // Auto-detect forms when page loads
  chrome.storage.sync.get("appSettings", function (data) {
    if (!data.appSettings || data.appSettings.autoDetect !== false) {
      // Wait for page to be fully loaded
      if (document.readyState === "complete") {
        setTimeout(detectForms, 1500); // Initial detection

        // Retry detection periodically for dynamic pages that load content later
        const intervalId = setInterval(() => {
          const formInfo = FormDetector.detectJobApplicationForm();
          if (formInfo.isJobForm) {
            clearInterval(intervalId);

            // Show notification if enabled
            if (
              !data.appSettings ||
              data.appSettings.showNotification !== false
            ) {
              showFormDetectedNotification();
            }
          }
        }, 3000);

        // Stop checking after 30 seconds
        setTimeout(() => clearInterval(intervalId), 30000);
      } else {
        window.addEventListener("load", function () {
          setTimeout(detectForms, 1500);
        });
      }
    }
  });

  // Detect job application forms on the page
  function detectForms() {
    const formInfo = FormDetector.detectJobApplicationForm();

    if (formInfo.isJobForm) {
      chrome.storage.sync.get("appSettings", function (data) {
        if (!data.appSettings || data.appSettings.showNotification !== false) {
          showFormDetectedNotification();
        }
      });
    }
  }

  // Show notification when a form is detected
  function showFormDetectedNotification() {
    // Create notification container if it doesn't exist
    let notificationContainer = document.getElementById(
      "auto-applicator-notification"
    );
    if (!notificationContainer) {
      notificationContainer = document.createElement("div");
      notificationContainer.id = "auto-applicator-notification";

      // Style the notification
      Object.assign(notificationContainer.style, {
        position: "fixed",
        top: "20px",
        right: "20px",
        zIndex: "9999",
        backgroundColor: "rgba(52, 152, 219, 0.9)",
        color: "white",
        padding: "15px",
        borderRadius: "5px",
        boxShadow: "0 2px 10px rgba(0, 0, 0, 0.2)",
        maxWidth: "300px",
        fontFamily: "Arial, sans-serif",
        fontSize: "14px",
        transition: "opacity 0.3s ease",
      });

      document.body.appendChild(notificationContainer);
    }

    // Set notification content
    notificationContainer.innerHTML = `
      <div style="margin-bottom: 10px; font-weight: bold; font-size: 16px;">
        Job Application Form Detected!
      </div>
      <div style="margin-bottom: 15px;">
        Auto Job Applicator can apply for you with one click.
      </div>
      <div style="display: flex; flex-direction: column; gap: 10px;">
        <button id="fill-submit-btn" style="padding: 10px; background-color: #2ecc71; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; font-size: 15px; box-shadow: 0 2px 5px rgba(0,0,0,0.2);">✓ EASY APPLY NOW</button>
        <div style="display: flex; justify-content: space-between;">
          <button id="auto-fill-btn" style="padding: 5px 10px; background-color: white; color: #3498db; border: none; border-radius: 3px; cursor: pointer; flex: 1; margin-right: 5px;">Fill Only</button>
          <button id="ignore-btn" style="padding: 5px 10px; background-color: transparent; color: white; border: 1px solid white; border-radius: 3px; cursor: pointer; flex: 1; margin-left: 5px;">Ignore</button>
        </div>
      </div>
    `;

    // Add event listeners to buttons
    document
      .getElementById("auto-fill-btn")
      .addEventListener("click", function () {
        fillDetectedForm();
        hideNotification();
      });

    document
      .getElementById("fill-submit-btn")
      .addEventListener("click", function () {
        fillAndSubmitForm();
        hideNotification();
      });

    document
      .getElementById("ignore-btn")
      .addEventListener("click", function () {
        hideNotification();
      });

    // Auto-hide after 10 seconds
    setTimeout(hideNotification, 10000);

    function hideNotification() {
      notificationContainer.style.opacity = "0";
      setTimeout(() => {
        if (notificationContainer.parentNode) {
          notificationContainer.parentNode.removeChild(notificationContainer);
        }
      }, 300);
    }
  }

  // Fill the detected form with user profile data
  function fillDetectedForm() {
    chrome.storage.sync.get("profileData", function (data) {
      if (!data.profileData) {
        console.error("No profile data found");
        return;
      }

      const formInfo = FormDetector.detectJobApplicationForm();
      if (!formInfo.isJobForm) {
        alert("No job application form detected on this page");
        return;
      }

      FormFiller.fillForm(data.profileData, formInfo.formFields);

      // Add tracking entry (without submission)
      addHistoryEntry({
        url: window.location.href,
        jobTitle: getJobTitle(),
        company: getCompanyName(),
        status: "filled",
        date: new Date().toISOString(),
      });
    });
  }

  // Fill and submit the form -  REPLACED with edited code
  function fillAndSubmitForm() {
    chrome.runtime.sendMessage(
      { action: "submitForm", url: window.location.href },
      (response) => {
        if (response.status === "success") {
          console.log("Form submitted successfully:", response.data);
        } else {
          console.error("Error submitting form:", response.error);
        }
      }
    );
  }

  // Extract job title from page
  function getJobTitle() {
    // Common selectors for job titles
    const selectors = [
      "h1.job-title",
      "h1.jobtitle",
      "h1.posting-title",
      "h1.position-title",
      ".job-title",
      ".jobtitle",
      ".posting-title",
      'h1:contains("Job Title")',
      'h2:contains("Position")',
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        return element.textContent.trim();
      }
    }

    // Fallback: look for h1 elements with certain keywords
    const h1Elements = document.querySelectorAll("h1");
    for (const h1 of h1Elements) {
      const text = h1.textContent.toLowerCase();
      if (
        text.includes("job") ||
        text.includes("position") ||
        text.includes("career")
      ) {
        return h1.textContent.trim();
      }
    }

    // Extract from page title as last resort
    const titleParts = document.title.split(/[-|:]/);
    if (titleParts.length > 1) {
      return titleParts[0].trim();
    }

    return "Unknown Job";
  }

  // Extract company name from page
  function getCompanyName() {
    // Common selectors for company names
    const selectors = [
      ".company-name",
      ".company",
      ".employer-name",
      ".organization-name",
      'span[itemprop="hiringOrganization"]',
      '[data-testid="company-name"]',
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        return element.textContent.trim();
      }
    }

    // Check meta data
    const metaCompany = document.querySelector('meta[property="og:site_name"]');
    if (metaCompany && metaCompany.getAttribute("content")) {
      return metaCompany.getAttribute("content");
    }

    // Extract from URL (fallback)
    try {
      const hostname = new URL(window.location.href).hostname;
      const domainParts = hostname.split(".");
      if (
        domainParts.length > 1 &&
        !["com", "org", "net", "io", "co"].includes(
          domainParts[domainParts.length - 2]
        )
      ) {
        return (
          domainParts[domainParts.length - 2].charAt(0).toUpperCase() +
          domainParts[domainParts.length - 2].slice(1)
        );
      }
    } catch (e) {
      console.error("Error parsing URL:", e);
    }

    return "Unknown Company";
  }

  // Add entry to application history
  function addHistoryEntry(entry) {
    chrome.storage.sync.get("applicationHistory", function (data) {
      let history = data.applicationHistory || [];

      // Limit history size to avoid storage quota issues (keep last 100 entries)
      if (history.length >= 100) {
        history = history.slice(-99);
      }

      history.push(entry);

      chrome.storage.sync.set({ applicationHistory: history });
    });
  }

  // Notify that content script is ready
  chrome.runtime.sendMessage({ type: "CONTENT_SCRIPT_LOADED" });
})();
