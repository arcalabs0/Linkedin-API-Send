// Form detection functionality
const FormDetector = {
  // Detect if the current page contains a job application form
  detectJobApplicationForm: function() {
    console.log('Detecting job application form...');
    
    const result = {
      isJobForm: false,
      formFields: {},
      submitButton: null
    };
    
    // Find possible application forms
    const forms = this.findPotentialApplicationForms();
    if (!forms || forms.length === 0) {
      console.log('No potential application forms found');
      return result;
    }
    
    // Determine which form is most likely to be a job application
    const mainForm = this.identifyMainApplicationForm(forms);
    if (!mainForm) {
      console.log('Could not identify main application form');
      return result;
    }
    
    // Map form fields to profile data fields
    result.formFields = this.mapFormFields(mainForm);
    
    // Find submit button
    result.submitButton = this.findSubmitButton(mainForm);
    
    // If we found mappable fields, consider it a job form
    result.isJobForm = Object.keys(result.formFields).length > 0;
    
    console.log('Form detection result:', result);
    return result;
  },
  
  // Find all potential forms that could be job applications
  findPotentialApplicationForms: function() {
    let forms = Array.from(document.forms);
    
    // If no formal forms, look for div containers that might act as forms
    if (forms.length === 0) {
      const formContainers = document.querySelectorAll('.application-form, .job-form, .apply-form, form-container, [role="form"]');
      if (formContainers.length > 0) {
        return Array.from(formContainers);
      }
      
      // If no forms were found and the page has few input fields, consider the body as a form
      const inputs = document.querySelectorAll('input[type="text"], input[type="email"], textarea');
      if (inputs.length > 0 && inputs.length < 20) {
        return [document.body];
      }
      
      return [];
    }
    
    // Filter out forms that are likely not job applications
    return forms.filter(form => {
      // Skip tiny forms (likely search or login)
      const formInputs = form.querySelectorAll('input, textarea, select');
      if (formInputs.length < 3) {
        return false;
      }
      
      // Check for form characteristics that suggest a job application
      const hasNameField = form.querySelector('input[name*="name" i], input[placeholder*="name" i], input[id*="name" i]');
      const hasEmailField = form.querySelector('input[type="email"], input[name*="email" i], input[placeholder*="email" i]');
      const hasSubmitButton = form.querySelector('button[type="submit"], input[type="submit"], [role="button"]');
      
      return hasNameField && hasEmailField && hasSubmitButton;
    });
  },
  
  // Identify which form is the main job application form
  identifyMainApplicationForm: function(forms) {
    if (forms.length === 1) {
      return forms[0];
    }
    
    // Score each form based on characteristics of job applications
    const formScores = forms.map(form => {
      let score = 0;
      
      // Score based on input fields typically found in job applications
      const fieldMatches = {
        name: /name|full.?name|first.?name|last.?name/i,
        email: /email/i,
        phone: /phone|tel|mobile/i,
        address: /address|location|city|state|country|zip/i,
        education: /education|degree|university|college|school/i,
        experience: /experience|work|employment|job/i,
        skills: /skills|qualification/i,
        resume: /resume|cv|curriculum/i
      };
      
      // Check inputs, textareas, and selects
      const fields = Array.from(form.querySelectorAll('input, textarea, select'));
      
      // Score based on field matches
      for (const field of fields) {
        const fieldName = field.name || field.id || field.placeholder || '';
        const labelText = this.findLabelForField(field)?.textContent?.toLowerCase() || '';
        
        // Combine field attributes and label text for better matching
        const fieldIdentifiers = fieldName + ' ' + labelText;
        
        for (const [category, pattern] of Object.entries(fieldMatches)) {
          if (pattern.test(fieldIdentifiers)) {
            score += 2;
            break;
          }
        }
      }
      
      // Check for common job application keywords in form or nearest container
      const formText = form.innerText.toLowerCase();
      const jobAppKeywords = [
        'apply', 'application', 'job', 'position', 'candidate', 'resume', 'cv', 
        'cover letter', 'submit', 'career', 'employment', 'hire', 'recruitment',
        'opportunity', 'work with us', 'join our team', 'quick apply', 'easy apply'
      ];
      
      jobAppKeywords.forEach(keyword => {
        if (formText.includes(keyword)) {
          score += 1;
          
          // Higher score for "easy apply" or "quick apply" keywords
          if (keyword === 'easy apply' || keyword === 'quick apply') {
            score += 3;
          }
        }
      });
      
      // Check for file upload (often used for resumes)
      if (form.querySelector('input[type="file"]')) {
        score += 3;
      }
      
      // Check for text areas (often used for cover letters or additional information)
      if (form.querySelectorAll('textarea').length > 0) {
        score += 2;
      }
      
      // Check form size - job apps tend to be larger
      score += Math.min(fields.length / 2, 5); // Cap at 5 points
      
      // Check for submit button with application-related text
      const submitBtns = form.querySelectorAll('button[type="submit"], input[type="submit"], [role="button"], .btn');
      for (const btn of submitBtns) {
        const btnText = btn.textContent.toLowerCase() || btn.value?.toLowerCase() || '';
        if (/apply|submit|send|continue|next|finish/.test(btnText)) {
          score += 2;
          if (/apply now|easy apply|quick apply/.test(btnText)) {
            score += 3; // Extra points for explicit apply buttons
          }
        }
      }
      
      // Check if form is in a main content area
      let parent = form.parentElement;
      while (parent) {
        if (parent.tagName === 'MAIN' || parent.id === 'main' || parent.className.includes('main')) {
          score += 2;
          break;
        }
        parent = parent.parentElement;
      }
      
      return { form, score };
    });
    
    // Sort by score (descending) and return the highest scoring form
    formScores.sort((a, b) => b.score - a.score);
    console.log('Form scores:', formScores.map(f => f.score));
    
    // Lowered threshold to capture more forms
    return formScores[0]?.score > 3 ? formScores[0].form : null;
  },
  
  // Map form fields to profile data fields
  mapFormFields: function(form) {
    const formFields = {};
    
    // Define patterns to match field types
    const fieldPatterns = {
      fullName: /full.?name|name/i,
      firstName: /first.?name|fname|given.?name/i,
      lastName: /last.?name|lname|family.?name|surname/i,
      email: /email|e-mail/i,
      phone: /phone|telephone|mobile|cell/i,
      address: /address|street/i,
      city: /city|town/i,
      state: /state|province|region/i,
      zip: /zip|postal|post.?code/i,
      country: /country|nation/i,
      linkedin: /linkedin|linked.in/i,
      website: /website|portfolio|personal.?site/i,
      github: /github|git.?hub/i,
      summary: /summary|about|profile|bio|about.?me/i,
      workExperience: /experience|work.?history|employment/i,
      education: /education|academic|university|college|school/i,
      skills: /skills|abilities|expertise|proficiency/i,
      resume: /resume|cv|curriculum|upload/i,
      coverLetter: /cover.?letter|letter.?of.?interest|motivation/i
    };
    
    // Get all input, textarea, and select elements
    const fields = Array.from(form.querySelectorAll('input, textarea, select'));
    
    // Analyze each field
    for (const field of fields) {
      // Skip hidden, submit, button, and empty fields
      if (field.type === 'hidden' || field.type === 'submit' || field.type === 'button' || field.style.display === 'none') {
        continue;
      }
      
      // Get field identifiers (name, id, placeholder, label text)
      const fieldName = field.name || '';
      const fieldId = field.id || '';
      const placeholder = field.placeholder || '';
      const label = this.findLabelForField(field);
      const labelText = label ? label.textContent.trim() : '';
      
      // Combine all identifiers for matching
      const combinedIdentifiers = `${fieldName} ${fieldId} ${placeholder} ${labelText}`.toLowerCase();
      
      // Match field to profile data
      for (const [profileField, pattern] of Object.entries(fieldPatterns)) {
        if (pattern.test(combinedIdentifiers)) {
          formFields[profileField] = field;
          break;
        }
      }
    }
    
    // Special case for work experience and education sections
    this.detectStructuredSections(form, formFields);
    
    return formFields;
  },
  
  // Find the label associated with a form field
  findLabelForField: function(field) {
    // Check for label with matching 'for' attribute
    if (field.id) {
      const label = document.querySelector(`label[for="${field.id}"]`);
      if (label) {
        return label;
      }
    }
    
    // Check if field is inside a label
    let parent = field.parentElement;
    while (parent) {
      if (parent.tagName === 'LABEL') {
        return parent;
      }
      parent = parent.parentElement;
    }
    
    // Check for adjacent label
    let sibling = field.previousElementSibling;
    while (sibling) {
      if (sibling.tagName === 'LABEL') {
        return sibling;
      }
      sibling = sibling.previousElementSibling;
    }
    
    // Look for aria-labelledby
    if (field.getAttribute('aria-labelledby')) {
      const labelId = field.getAttribute('aria-labelledby');
      const ariaLabel = document.getElementById(labelId);
      if (ariaLabel) {
        return ariaLabel;
      }
    }
    
    return null;
  },
  
  // Detect structured sections for work experience and education
  detectStructuredSections: function(form, formFields) {
    // Look for work experience sections
    const experienceSections = Array.from(form.querySelectorAll('.experience, .work-history, .employment'));
    if (experienceSections.length > 0) {
      formFields.workExperienceSection = experienceSections;
    }
    
    // Look for education sections
    const educationSections = Array.from(form.querySelectorAll('.education, .academic-history, .qualifications'));
    if (educationSections.length > 0) {
      formFields.educationSection = educationSections;
    }
  },
  
  // Find the submit button for the form
  findSubmitButton: function(form) {
    // Look for formal submit buttons
    let submitButton = form.querySelector('button[type="submit"], input[type="submit"]');
    if (submitButton) {
      return submitButton;
    }
    
    // Look for buttons with submit-related text (prioritize "apply" buttons)
    const applyKeywords = ['apply now', 'easy apply', 'quick apply', 'apply', 'submit application'];
    const otherSubmitKeywords = ['submit', 'send', 'continue', 'next', 'save', 'finish'];
    const allKeywords = [...applyKeywords, ...otherSubmitKeywords];
    
    // First try exact match with "apply" related keywords
    for (const keyword of applyKeywords) {
      const buttons = Array.from(form.querySelectorAll('button, .button, [role="button"], a.btn, input[type="button"]'));
      
      for (const button of buttons) {
        const buttonText = (button.textContent || button.value || '').toLowerCase().trim();
        if (buttonText === keyword) {
          return button; // Exact match with high priority keyword
        }
      }
    }
    
    // Then try partial match with all keywords
    for (const keyword of allKeywords) {
      const buttons = Array.from(form.querySelectorAll('button, .button, [role="button"], a.btn, input[type="button"]'));
      
      for (const button of buttons) {
        const buttonText = (button.textContent || button.value || '').toLowerCase();
        if (buttonText.includes(keyword)) {
          return button;
        }
      }
    }
    
    // Look for buttons that have apply-related classes
    const applyClassButtons = Array.from(form.querySelectorAll('.apply, .submit, .apply-btn, .submit-btn, .application-submit'));
    if (applyClassButtons.length > 0) {
      return applyClassButtons[0];
    }
    
    // Look for the last button in the form - often it's the submit
    const allButtons = Array.from(form.querySelectorAll('button, .button, [role="button"], a.btn, input[type="button"]'));
    if (allButtons.length > 0) {
      // Assume the last button is for submission
      return allButtons[allButtons.length - 1];
    }
    
    // Look outside the form if nothing found (some forms use external submit buttons)
    if (form.id) {
      // Look for buttons that reference this form
      const externalButtons = Array.from(document.querySelectorAll(`button[form="${form.id}"], input[form="${form.id}"]`));
      if (externalButtons.length > 0) {
        return externalButtons[0];
      }
    }
    
    return null;
  }
};
