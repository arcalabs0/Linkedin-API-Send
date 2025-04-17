// Form filling functionality
const FormFiller = {
  // Fill a form with user profile data
  fillForm: function(profileData, formFields) {
    console.log('Filling form with profile data...');
    
    // Simple text fields
    this.fillTextField(formFields.fullName, profileData.fullName);
    this.fillTextField(formFields.email, profileData.email);
    this.fillTextField(formFields.phone, profileData.phone);
    this.fillTextField(formFields.linkedin, profileData.linkedin);
    this.fillTextField(formFields.website, profileData.website);
    this.fillTextField(formFields.summary, profileData.summary);
    
    // Handle name splitting if needed
    if (!formFields.fullName && (formFields.firstName || formFields.lastName) && profileData.fullName) {
      const nameParts = profileData.fullName.split(' ');
      if (nameParts.length >= 2) {
        this.fillTextField(formFields.firstName, nameParts[0]);
        this.fillTextField(formFields.lastName, nameParts.slice(1).join(' '));
      }
    }
    
    // Handle address fields
    if (formFields.address && profileData.location) {
      this.fillTextField(formFields.address, profileData.location);
    }
    
    // Handle skills
    if (formFields.skills && profileData.skills) {
      this.fillTextField(formFields.skills, profileData.skills);
    }
    
    // Handle work experience section
    this.fillWorkExperience(formFields, profileData);
    
    // Handle education section
    this.fillEducation(formFields, profileData);
    
    // Handle resume upload/paste
    this.handleResume(formFields);
    
    console.log('Form filling complete');
  },
  
  // Fill a text field with the given value
  fillTextField: function(field, value) {
    if (!field || !value) return;
    
    // Get the original value
    const originalValue = field.value;
    
    // Set the value
    field.value = value;
    
    // Create and dispatch input event to trigger any event listeners
    const event = new Event('input', { bubbles: true });
    field.dispatchEvent(event);
    
    // Create and dispatch change event
    const changeEvent = new Event('change', { bubbles: true });
    field.dispatchEvent(changeEvent);
    
    // Log the change
    console.log(`Filled field: ${field.name || field.id || 'unnamed'} with value: ${value}`);
  },
  
  // Fill select (dropdown) field
  fillSelectField: function(field, value) {
    if (!field || !value) return;
    
    // Try to find an option with text or value matching the desired value
    let optionFound = false;
    
    // Case insensitive search for options
    const lowerValue = value.toLowerCase();
    const options = field.querySelectorAll('option');
    
    for (const option of options) {
      const optionText = option.textContent.toLowerCase();
      const optionVal = option.value.toLowerCase();
      
      if (optionText.includes(lowerValue) || optionVal.includes(lowerValue)) {
        field.value = option.value;
        optionFound = true;
        break;
      }
    }
    
    // If no exact match, try closest match
    if (!optionFound && options.length > 0) {
      let bestMatch = null;
      let bestScore = 0;
      
      for (const option of options) {
        const optionText = option.textContent.toLowerCase();
        
        // Simple similarity score - count matching characters
        let score = 0;
        for (let i = 0; i < Math.min(optionText.length, lowerValue.length); i++) {
          if (optionText[i] === lowerValue[i]) {
            score++;
          }
        }
        
        if (score > bestScore) {
          bestScore = score;
          bestMatch = option;
        }
      }
      
      if (bestMatch && bestScore > Math.min(3, lowerValue.length / 2)) {
        field.value = bestMatch.value;
      }
    }
    
    // Dispatch change event
    const event = new Event('change', { bubbles: true });
    field.dispatchEvent(event);
  },
  
  // Fill work experience sections
  fillWorkExperience: function(formFields, profileData) {
    if (!profileData.workExperience || profileData.workExperience.length === 0) {
      return;
    }
    
    if (formFields.workExperience) {
      // Simple case: single work experience field
      const expText = profileData.workExperience.map(job => 
        `${job.title} at ${job.company} (${job.duration})\n${job.description}`
      ).join('\n\n');
      
      this.fillTextField(formFields.workExperience, expText);
      return;
    }
    
    if (formFields.workExperienceSection) {
      // Complex case: structured work experience section with multiple fields
      const sections = formFields.workExperienceSection;
      
      for (let i = 0; i < Math.min(sections.length, profileData.workExperience.length); i++) {
        const section = sections[i];
        const job = profileData.workExperience[i];
        
        // Find fields within this section
        const titleField = section.querySelector('input[name*="title" i], input[placeholder*="title" i], input[id*="title" i]');
        const companyField = section.querySelector('input[name*="company" i], input[placeholder*="company" i], input[id*="company" i]');
        const durationField = section.querySelector('input[name*="duration" i], input[name*="period" i], input[id*="duration" i]');
        const descriptionField = section.querySelector('textarea');
        
        this.fillTextField(titleField, job.title);
        this.fillTextField(companyField, job.company);
        this.fillTextField(durationField, job.duration);
        this.fillTextField(descriptionField, job.description);
      }
    }
  },
  
  // Fill education sections
  fillEducation: function(formFields, profileData) {
    if (!profileData.education || profileData.education.length === 0) {
      return;
    }
    
    if (formFields.education) {
      // Simple case: single education field
      const eduText = profileData.education.map(edu => 
        `${edu.degree} from ${edu.institution} (${edu.year})`
      ).join('\n\n');
      
      this.fillTextField(formFields.education, eduText);
      return;
    }
    
    if (formFields.educationSection) {
      // Complex case: structured education section with multiple fields
      const sections = formFields.educationSection;
      
      for (let i = 0; i < Math.min(sections.length, profileData.education.length); i++) {
        const section = sections[i];
        const edu = profileData.education[i];
        
        // Find fields within this section
        const degreeField = section.querySelector('input[name*="degree" i], input[placeholder*="degree" i], input[id*="degree" i]');
        const institutionField = section.querySelector('input[name*="institution" i], input[name*="school" i], input[name*="university" i]');
        const yearField = section.querySelector('input[name*="year" i], input[name*="graduation" i], input[id*="year" i]');
        
        this.fillTextField(degreeField, edu.degree);
        this.fillTextField(institutionField, edu.institution);
        this.fillTextField(yearField, edu.year);
      }
    }
  },
  
  // Handle resume upload or text paste
  handleResume: function(formFields) {
    if (!formFields.resume) return;
    
    const resumeField = formFields.resume;
    
    // Get resume content from settings
    chrome.storage.sync.get('appSettings', function(data) {
      if (!data.appSettings || !data.appSettings.defaultResume) {
        return;
      }
      
      const resumeContent = data.appSettings.defaultResume;
      
      // If it's a text area, paste the content
      if (resumeField.tagName === 'TEXTAREA') {
        FormFiller.fillTextField(resumeField, resumeContent);
      }
      
      // If it's a file input, we can't directly upload the file
      // But we can highlight it to alert the user
      if (resumeField.type === 'file') {
        // Add a visual indicator
        resumeField.style.boxShadow = '0 0 5px 2px #3498db';
        
        // Create a tooltip
        const tooltip = document.createElement('div');
        tooltip.textContent = 'Please manually select your resume file here';
        tooltip.style.position = 'absolute';
        tooltip.style.backgroundColor = 'rgba(52, 152, 219, 0.9)';
        tooltip.style.color = 'white';
        tooltip.style.padding = '5px 10px';
        tooltip.style.borderRadius = '3px';
        tooltip.style.fontSize = '12px';
        tooltip.style.zIndex = '10000';
        
        // Position the tooltip
        const fieldRect = resumeField.getBoundingClientRect();
        tooltip.style.left = `${fieldRect.left}px`;
        tooltip.style.top = `${fieldRect.bottom + 5}px`;
        
        document.body.appendChild(tooltip);
        
        // Remove after 5 seconds
        setTimeout(() => {
          resumeField.style.boxShadow = '';
          if (tooltip.parentNode) {
            tooltip.parentNode.removeChild(tooltip);
          }
        }, 5000);
      }
    });
  }
};
