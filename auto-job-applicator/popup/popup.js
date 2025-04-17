document.addEventListener("DOMContentLoaded", function () {
  // Setup form listeners
  setupFormListeners();

  // Load saved data
  loadConfigData();
});

// Tab Navigation (Removed - replaced with simplified config)
//function setupTabs() { ... }

// Load saved profile data from storage (Removed - replaced with loadConfigData)
//function loadProfileData() { ... }

// Load application settings (Removed - replaced with loadConfigData)
//function loadSettings() { ... }

// Load application history (Removed)
//function loadApplicationHistory() { ... }

function loadConfigData() {
  chrome.storage.sync.get("configData", function (data) {
    if (data.configData) {
      const config = data.configData;

      // Set checkbox values
      document.getElementById("remote").checked = config.remote;

      // Set experience levels
      Object.entries(config.experienceLevel || {}).forEach(
        ([level, checked]) => {
          const checkbox = document.querySelector(
            `input[name="experienceLevel"][value="${level}"]`
          );
          if (checkbox) checkbox.checked = checked;
        }
      );

      // Set job types
      Object.entries(config.jobTypes || {}).forEach(([type, checked]) => {
        const checkbox = document.querySelector(
          `input[name="jobTypes"][value="${type}"]`
        );
        if (checkbox) checkbox.checked = checked;
      });

      // Set date filters
      Object.entries(config.date || {}).forEach(([filter, checked]) => {
        const checkbox = document.querySelector(
          `input[name="date"][value="${filter}"]`
        );
        if (checkbox) checkbox.checked = checked;
      });

      // Set text inputs
      document.getElementById("positions").value =
        config.positions?.join(", ") || "";
      document.getElementById("locations").value =
        config.locations?.join(", ") || "";
      document.getElementById("distance").value = config.distance || 100;
      document.getElementById("companyBlacklist").value =
        config.companyBlacklist?.join(", ") || "";
      document.getElementById("titleBlacklist").value =
        config.titleBlacklist?.join(", ") || "";
    }
  });
}

// Setup form listeners (modified)
function setupFormListeners() {
  // Config form submission and start
  document
    .getElementById("configForm")
    .addEventListener("submit", async function (e) {
      e.preventDefault();
      try {
        const configResponse = await fetch("http://localhost:5000/api/config", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            remote: document.getElementById("remote").checked,
            experienceLevel: Object.fromEntries(
              Array.from(
                document.querySelectorAll('input[name="experienceLevel"]')
              ).map((checkbox) => [checkbox.value, checkbox.checked])
            ),
            jobTypes: Object.fromEntries(
              Array.from(
                document.querySelectorAll('input[name="jobTypes"]')
              ).map((checkbox) => [checkbox.value, checkbox.checked])
            ),
            date: Object.fromEntries(
              Array.from(document.querySelectorAll('input[name="date"]')).map(
                (checkbox) => [checkbox.value, checkbox.checked]
              )
            ),
            positions: document
              .getElementById("positions")
              .value.split(",")
              .map((s) => s.trim()),
            locations: document
              .getElementById("locations")
              .value.split(",")
              .map((s) => s.trim()),
            distance: parseInt(document.getElementById("distance").value),
            companyBlacklist: document
              .getElementById("companyBlacklist")
              .value.split(",")
              .map((s) => s.trim()),
            titleBlacklist: document.getElementById("titleBlacklist").value
              ? document
                  .getElementById("titleBlacklist")
                  .value.split(",")
                  .map((s) => s.trim())
              : [],
          }),
        });

        if (configResponse.ok) {
          // Save to Chrome storage
          chrome.storage.sync.set({
            configData: await configResponse.json(),
          });

          // Start the application
          const startResponse = await fetch("http://localhost:5000/start", {
            method: "GET",
            headers: {
              Accept: "application/json",
            },
          });

          const data = await startResponse.json();
          if (data.status === "completed") {
            showNotification(
              "Configuration saved and application started successfully!"
            );
          } else {
            showNotification("Failed to start application", true);
          }
        } else {
          showNotification("Failed to save configuration", true);
        }
      } catch (error) {
        console.error("Error:", error);
        showNotification("Failed to connect to the server", true);
      }
    });
}

//removed functions: createWorkExperienceEntry, createEducationEntry, saveProfileData, saveSettings, setupButtonListeners, executeContentScript, formatDate, exportData, importData, clearAllData

function saveConfigData() {
  // Collect checkbox values for experience level
  const experienceLevel = {};
  document
    .querySelectorAll('input[name="experienceLevel"]')
    .forEach((checkbox) => {
      experienceLevel[checkbox.value] = checkbox.checked;
    });

  // Collect checkbox values for job types
  const jobTypes = {};
  document.querySelectorAll('input[name="jobTypes"]').forEach((checkbox) => {
    jobTypes[checkbox.value] = checkbox.checked;
  });

  // Collect checkbox values for date
  const date = {};
  document.querySelectorAll('input[name="date"]').forEach((checkbox) => {
    date[checkbox.value] = checkbox.checked;
  });

  const config = {
    remote: document.getElementById("remote").checked,
    experienceLevel,
    jobTypes,
    date,
    positions: document
      .getElementById("positions")
      .value.split(",")
      .map((s) => s.trim()),
    locations: document
      .getElementById("locations")
      .value.split(",")
      .map((s) => s.trim()),
    distance: parseInt(document.getElementById("distance").value),
    companyBlacklist: document
      .getElementById("companyBlacklist")
      .value.split(",")
      .map((s) => s.trim()),
    titleBlacklist: document.getElementById("titleBlacklist").value
      ? document
          .getElementById("titleBlacklist")
          .value.split(",")
          .map((s) => s.trim())
      : [],
  };

  // Send config to API
  fetch("http://localhost:5000/api/config", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(config),
  })
    .then((response) => response.json())
    .then((data) => {
      showNotification("Configuration saved successfully!");
      // Save to Chrome storage
      chrome.storage.sync.set({ configData: config });
    })
    .catch((error) => {
      showNotification("Error saving configuration", true);
    });
}

function showNotification(message, isError = false) {
  // Create notification element if it doesn't exist
  let notification = document.querySelector(".notification");
  if (!notification) {
    notification = document.createElement("div");
    notification.className = "notification";
    document.body.appendChild(notification);
  }

  // Set notification content and style
  notification.textContent = message;
  notification.className = "notification " + (isError ? "error" : "success");

  // Show notification
  notification.style.display = "block";

  // Hide after 3 seconds
  setTimeout(() => {
    notification.style.display = "none";
  }, 3000);
}
