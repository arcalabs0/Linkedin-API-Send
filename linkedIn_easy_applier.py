import base64
import os
import random
import tempfile
import time
import traceback
from datetime import date
from typing import List, Optional, Any, Tuple
import uuid
from httpcore import TimeoutException
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from selenium.common.exceptions import NoSuchElementException
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.remote.webelement import WebElement
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import Select, WebDriverWait
import tempfile
import time
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
import io
import time
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from xhtml2pdf import pisa

import utils    

class LinkedInEasyApplier:
    def __init__(self, driver: Any, resume_dir: Optional[str], set_old_answers: List[Tuple[str, str, str]], gpt_answerer: Any):
        if resume_dir is None or not os.path.exists(resume_dir):
            resume_dir = None
        self.driver = driver
        self.resume_dir = resume_dir
        self.set_old_answers = set_old_answers
        self.gpt_answerer = gpt_answerer

    def job_apply(self, job: Any):
        self.driver.get(job.link)
        # time.sleep(random.uniform(1.3, 2.5))
        try:
            easy_apply_button = self._find_easy_apply_button()
            job_description = self._get_job_description()
            job.set_job_description(job_description)
            easy_apply_button.click()
            self.gpt_answerer.set_job(job)
            self._fill_application_form()
        except Exception:
            tb_str = traceback.format_exc()
            self._discard_application()
            raise Exception(f"Failed to apply to job! Original exception: \nTraceback:\n{tb_str}")


    def _find_easy_apply_button(self) -> WebElement:
        buttons = WebDriverWait(self.driver, 5).until(
            EC.presence_of_all_elements_located(
                (By.XPATH, '//button[contains(@class, "jobs-apply-button") and contains(., "Easy Apply")]')
            )
        )
        for index, button in enumerate(buttons):
            try:
                return WebDriverWait(self.driver, 5).until(
                    EC.element_to_be_clickable(
                        (By.XPATH, f'(//button[contains(@class, "jobs-apply-button") and contains(., "Easy Apply")])[{index + 1}]')
                    )
                )
            except Exception as e:
                pass
        raise Exception("No clickable 'Easy Apply' button found")

    def _get_job_description(self) -> str:
        try:
            # Wait for either of these elements to be present
            description_selectors = [
                '.jobs-description__content',
                '.jobs-unified-top-card__job-details',
                '.jobs-search-results-list',
                '.jobs-description',
                '[data-member-id]',
                '.job-details-jobs-unified-top-card__primary-description-container'
            ]
            
            # Wait for any of the selectors to be present
            for selector in description_selectors:
                try:
                    WebDriverWait(self.driver, 3).until(
                        EC.presence_of_element_located((By.CSS_SELECTOR, selector))
                    )
                    break
                except:
                    continue
            
            time.sleep(1)  # Allow dynamic content to load

            # Try to find and click "see more" button if it exists
            see_more_selectors = [
                '//*[contains(@aria-label, "Click to see more")]',
                '//button[contains(@class, "show-more-less-html__button")]',
                '//button[contains(text(), "more")]',
                '//button[contains(text(), "See more")]'
            ]
            
            for selector in see_more_selectors:
                try:
                    buttons = self.driver.find_elements(By.XPATH, selector)
                    if buttons:
                        buttons[0].click()
                        time.sleep(0.5)
                        break
                except:
                    continue

            # Updated list of description selectors
            content_selectors = [
                '.jobs-description__content span',
                '.jobs-box__html-content',
                '.jobs-unified-top-card__job-details',
                '.jobs-description',
                '.jobs-description-content__text',
                '.job-details-jobs-unified-top-card__primary-description-container',
                '.jobs-unified-top-card__job-details p',
                '.jobs-description__content div'
            ]

            full_description = []
            for selector in content_selectors:
                try:
                    elements = self.driver.find_elements(By.CSS_SELECTOR, selector)
                    for element in elements:
                        text = element.text.strip()
                        if text:
                            full_description.append(text)
                except:
                    continue

            if full_description:
                return '\n'.join(full_description)

            raise Exception("Could not find job description with any selector")
        except Exception as e:
            tb_str = traceback.format_exc()
            raise Exception(f"Error getting Job description: {str(e)}\nTraceback:\n{tb_str}")

    def _scroll_page(self) -> None:
        scrollable_element = self.driver.find_element(By.TAG_NAME, 'html')
        utils.scroll_slow(self.driver, scrollable_element, step=300, reverse=False)
        utils.scroll_slow(self.driver, scrollable_element, step=300, reverse=True)

    def _fill_application_form(self):
        while True:
            self.fill_up()
            if self._next_or_submit():
                break

    def _next_or_submit(self):
        next_button = self.driver.find_element(By.CSS_SELECTOR, ".artdeco-button--primary")
        button_text = next_button.text.lower()
        if 'submit application' in button_text:
            self._unfollow_company()
            time.sleep(random.uniform(0.3, 0.7))  # Reduced from 0.5-1.0
            next_button.click()
            time.sleep(random.uniform(0.5, 0.9))  # Reduced from 0.8-1.2
            return True
        time.sleep(random.uniform(0.2, 0.5))  # Reduced from 0.3-0.7
        next_button.click()
        time.sleep(random.uniform(0.5, 0.9))  # Reduced from 0.8-1.2

        # time.sleep(random.uniform(3.0, 5.0))
        self._check_for_errors()


    def _unfollow_company(self) -> None:
        try:
            follow_checkbox = self.driver.find_element(
                By.XPATH, "//label[contains(.,'to stay up to date with their page.')]")
            follow_checkbox.click()
        except Exception as e:
            pass

    def _check_for_errors(self) -> None:
        error_elements = self.driver.find_elements(By.CSS_SELECTOR, '.artdeco-inline-feedback--error')
        if error_elements:
            raise Exception(f"Failed answering or file upload. {str([e.text for e in error_elements])}")

    def _discard_application(self) -> None:
        try:
            self.driver.find_element(By.CSS_SELECTOR, '.artdeco-modal__dismiss').click()
            time.sleep(random.uniform(3, 5))
            self.driver.find_elements(By.CSS_SELECTOR, '.artdeco-modal__confirm-dialog-btn')[0].click()
            time.sleep(random.uniform(3, 5))
        except Exception as e:
            pass

    def fill_up(self) -> None:
        try:
            easy_apply_content = self.driver.find_element(By.CSS_SELECTOR, '.jobs-easy-apply-content')
            pb4_elements = easy_apply_content.find_elements(By.CSS_SELECTOR, '.pb4')
            for element in pb4_elements:
                self._process_form_element(element)
        except Exception as e:
            pass

    def _process_form_element(self, element: WebElement) -> None:
        try:
            if self._is_upload_field(element):
                self._handle_upload_fields(element)
            else:
                # Try multiple selectors for finding questions
                question_selectors = [
                    '.jobs-easy-apply-form-element',
                    '.fb-dash-form-element',
                    'div[data-test-single-line-text-form-component]',
                    '.artdeco-text-input',
                    '.ember-view'
                ]
                
                additional_questions = []
                for selector in question_selectors:
                    questions = element.find_elements(By.CSS_SELECTOR, selector)
                    if questions:
                        additional_questions.extend(questions)
                        break
                        
                if additional_questions:
                    for question in additional_questions:
                        try:
                            question_label = question.find_element(By.TAG_NAME, 'label').text.strip()
                            if question_label:
                                # Handle different types of inputs
                                if self._has_text_input(question):
                                    self._handle_textbox_question(question)
                                elif self._has_radio_buttons(question):
                                    self._handle_radio_question(question)
                                elif self._has_dropdown(question):
                                    self._handle_dropdown_question(question)
                                elif self._has_date_picker(question):
                                    self._handle_date_question(question)
                        except Exception as e:
                            utils.printred(f"Error processing question: {str(e)}")
                            continue
        except Exception as e:
            utils.printred(f"Error in form element processing: {str(e)}")
            pass

    def _has_text_input(self, element: WebElement) -> bool:
        try:
            return bool(element.find_elements(By.CSS_SELECTOR, 'input[type="text"], textarea, input[type="number"]'))
        except:
            return False

    def _has_radio_buttons(self, element: WebElement) -> bool:
        try:
            return bool(element.find_elements(By.CSS_SELECTOR, '.fb-text-selectable__option'))
        except:
            return False

    def _has_dropdown(self, element: WebElement) -> bool:
        try:
            return bool(element.find_elements(By.TAG_NAME, 'select'))
        except:
            return False

    def _has_date_picker(self, element: WebElement) -> bool:
        try:
            return bool(element.find_elements(By.CSS_SELECTOR, '.artdeco-datepicker__input'))
        except:
            return False

    def _is_upload_field(self, element: WebElement) -> bool:
        try:
            element.find_element(By.XPATH, ".//input[@type='file']")
            return True
        except NoSuchElementException:
            return False

    def _handle_upload_fields(self, element: WebElement) -> None:
        file_upload_elements = self.driver.find_elements(By.XPATH, "//input[@type='file']")
        for element in file_upload_elements:
            parent = element.find_element(By.XPATH, "..")
            self.driver.execute_script("arguments[0].classList.remove('hidden')", element)
            if 'resume' in parent.text.lower():
                if self.resume_dir != None:
                    resume_path = self.resume_dir.resolve()
                if self.resume_dir != None and resume_path.exists() and resume_path.is_file():
                    element.send_keys(str(resume_path))
                else:
                    self._create_and_upload_resume(element)
            elif 'cover' in parent.text.lower():
                self._create_and_upload_cover_letter(element)

    def _create_and_upload_resume(self, element):
        max_retries = 3
        retry_delay = 1
        folder_path = 'generated_cv'

        if not os.path.exists(folder_path):
            os.makedirs(folder_path)
        for attempt in range(max_retries):
            try:
                # html_string = self.gpt_answerer.get_resume_html()
                # with tempfile.NamedTemporaryFile(delete=False, suffix='.html', mode='w', encoding='utf-8') as temp_html_file:
                #     temp_html_file.write(html_string)
                #     file_name_HTML = temp_html_file.name

                # file_name_pdf = f"resume_{uuid.uuid4().hex}.pdf"
                # file_path_pdf = os.path.join(folder_path, file_name_pdf)

                # with open(file_path_pdf, "wb") as f:
                #     f.write(base64.b64decode(utils.HTML_to_PDF(file_name_HTML)))

                # element.send_keys(os.path.abspath(file_path_pdf))
                # time.sleep(2)  # Give some time for the upload process
                # os.remove(file_name_HTML)
                return True
            except Exception:
                if attempt < max_retries - 1:
                    time.sleep(retry_delay)
                else:
                    tb_str = traceback.format_exc()
                    raise Exception(f"Max retries reached. Upload failed: \nTraceback:\n{tb_str}")

    def _upload_resume(self, element: WebElement) -> None:
        element.send_keys(str(self.resume_dir))

    def _create_and_upload_cover_letter(self, element: WebElement) -> None:
        cover_letter = self.gpt_answerer.answer_question_textual_wide_range("Write a cover letter")
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as temp_pdf_file:
            letter_path = temp_pdf_file.name
            c = canvas.Canvas(letter_path, pagesize=letter)
            width, height = letter
            text_object = c.beginText(100, height - 100)
            text_object.setFont("Helvetica", 12)
            text_object.textLines(cover_letter)
            c.drawText(text_object)
            c.save()
            element.send_keys(letter_path)

    def _fill_additional_questions(self) -> None:
        form_sections = self.driver.find_elements(By.CSS_SELECTOR, '.jobs-easy-apply-form-section__grouping')
        for section in form_sections:
            self._process_question(section)

    def _process_question(self, section: WebElement) -> None:
        if self._handle_terms_of_service(section):
            return
        self._handle_radio_question(section)
        self._handle_textbox_question(section)
        self._handle_date_question(section)
        self._handle_dropdown_question(section)

    def _handle_terms_of_service(self, element: WebElement) -> bool:
        try:
            question = element.find_element(By.CSS_SELECTOR, '.jobs-easy-apply-form-element')
            checkbox = question.find_element(By.TAG_NAME, 'label')
            question_text = question.text.lower()
            if 'terms of service' in question_text or 'privacy policy' in question_text or 'terms of use' in question_text:
                checkbox.click()
                return True
        except NoSuchElementException:
            pass
        return False

    def _handle_radio_question(self, element: WebElement) -> None:
        try:
            # Try multiple selectors for finding radio groups
            radio_selectors = [
                '.jobs-easy-apply-form-element',
                '.fb-dash-form-element',
                '.ember-view'
            ]
            
            question = None
            for selector in radio_selectors:
                try:
                    question = element.find_element(By.CSS_SELECTOR, selector)
                    if question:
                        break
                except:
                    continue
                    
            if not question:
                return

            radios = question.find_elements(By.CSS_SELECTOR, '.fb-text-selectable__option, input[type="radio"]')
            if not radios:
                return

            # Check if already answered
            if any(radio.get_attribute('aria-checked') == 'true' for radio in radios):
                return

            question_text = question.text.lower()
            if not question_text:
                try:
                    label = question.find_element(By.TAG_NAME, 'label')
                    question_text = label.text.lower()
                except:
                    pass

            options = [radio.text.lower() for radio in radios if radio.text.strip()]
            if not options:
                options = [radio.get_attribute('value').lower() for radio in radios if radio.get_attribute('value')]

            if question_text and options:
                answer = self._get_answer_from_set('radio', question_text, options)
                if not answer:
                    answer = self.gpt_answerer.answer_question_from_options(question_text, options)
                    
                if answer:
                    self._select_radio(radios, answer)
                    time.sleep(random.uniform(0.3, 0.7))
                    
        except Exception as e:
            utils.printred(f"Error handling radio question: {str(e)}")

    def _handle_textbox_question(self, element: WebElement) -> None:
        max_retries = 3
        try:
            # Try different label selectors
            label_selectors = [
                'label.artdeco-text-input--label',
                'label[for]',
                'label',
                '.artdeco-text-input--label'
            ]
            
            question_text = None
            for selector in label_selectors:
                try:
                    label_elem = element.find_element(By.CSS_SELECTOR, selector)
                    question_text = label_elem.text.strip()
                    if question_text:
                        break
                except:
                    continue
                    
            if not question_text:
                utils.printred("Could not find question text. Skipping...")
                return

            # Try different input field selectors
            input_selectors = [
                'input.artdeco-text-input--input',
                'input[type="text"]',
                'input[type="number"]',
                'textarea',
                '.artdeco-text-input--input'
            ]
            
            text_field = None
            for selector in input_selectors:
                try:
                    text_field = element.find_element(By.CSS_SELECTOR, selector)
                    if text_field.is_displayed():
                        break
                except:
                    continue

            if not text_field:
                utils.printred("Textbox element not found. Skipping...")
                return
                
            if text_field.get_attribute('value').strip():
                utils.printyellow("Textbox already filled. Skipping...")
                return

            utils.printyellow(f"Attempting to answer question: {question_text}")
            
            # Extract any hints or requirements from the question container
            try:
                hint_elements = element.find_elements(By.CSS_SELECTOR, '.fb-form-element-hint, .hint-text, .form-hint')
                hints = ' '.join([hint.text for hint in hint_elements if hint.text.strip()])
                if hints:
                    question_text = f"{question_text} (Hint: {hints})"
            except:
                pass

            # Determine field type and constraints
            is_numeric = self._is_numeric_field(text_field)
            field_type = 'numeric' if is_numeric else 'text'
            
            # Check for character limits
            max_length = text_field.get_attribute('maxlength')
            if max_length:
                question_text = f"{question_text} (Max length: {max_length} characters)"
            
            for attempt in range(max_retries):
                try:
                    # First try to get answer from previous responses
                    answer = self._get_answer_from_set(field_type, question_text)
                    
                    if not answer:
                        # If no previous answer, get new one from GPT
                        if is_numeric:
                            answer = self.gpt_answerer.answer_question_numeric(question_text)
                        else:
                            # Pass context about the job to get more relevant answers
                            job_context = self.gpt_answerer.job.formatted_job_information()
                            answer = self.gpt_answerer.answer_question_textual_wide_range(
                                f"Job Context:\n{job_context}\n\nQuestion: {question_text}"
                            )
                    
                    # Validate answer length if maxlength exists
                    max_length = text_field.get_attribute('maxlength')
                    if max_length and len(str(answer)) > int(max_length):
                        answer = str(answer)[:int(max_length)]
                    
                    # Clear and enter text
                    text_field.clear()
                    text_field.send_keys(answer)
                    time.sleep(0.5)
                    
                    # Check if the answer was accepted (no error messages)
                    error_elements = element.find_elements(By.CSS_SELECTOR, '.artdeco-inline-feedback--error, .error-message, .validation-error')
                    if not any(error.is_displayed() for error in error_elements):
                        utils.printyellow(f"Successfully answered: {question_text}")
                        return
                    
                    # Check for validation errors
                    error_elements = element.find_elements(By.CSS_SELECTOR, '.artdeco-inline-feedback--error')
                    if not error_elements:
                        print(f"Successfully filled {question_text} with {answer}")
                        return
                    
                    error_text = error_elements[0].text.lower()
                    if 'valid' in error_text:
                        print(f"Invalid answer format for {question_text}, retrying...")
                        if attempt < max_retries - 1:
                            # Get a new answer for next attempt, explicitly telling GPT about the error
                            answer = self.gpt_answerer.try_fix_answer(question_text, answer, error_text)
                            continue
                    
                    raise Exception(f"Failed to provide valid answer for {question_text}: {error_text}")
                    
                except Exception as e:
                    if attempt == max_retries - 1:
                        raise Exception(f"Max retries reached for {question_text}: {str(e)}")
                    print(f"Attempt {attempt + 1} failed: {str(e)}")
                    time.sleep(1)
                    
        except NoSuchElementException:
            print("Textbox element not found.")
        except Exception as e:
            print(f"An error occurred while handling textbox question: {str(e)}")
            raise


    def _handle_date_question(self, element: WebElement) -> None:
        try:
            date_picker = element.find_element(By.CSS_SELECTOR, '.artdeco-datepicker__input')
            if not date_picker:
                print("Date picker element not found(early).")
                return

            # Check if the date picker is already filled
            if date_picker.get_attribute('value').strip():
                print("Date already selected. Skipping...")
                return  # Early exit if the date is already filled

            date_picker.clear()
            date_picker.send_keys(date.today().strftime("%m/%d/%y"))
            date_picker.send_keys(Keys.RETURN)
        except NoSuchElementException:
            print("Date picker element not found.")
        except Exception as e:
            print(f"An error occurred: {e}")

    def _handle_dropdown_question(self, element: WebElement) -> None:
        try:
            dropdown_selectors = [
                '.jobs-easy-apply-form-element select',
                '.fb-dash-form-element select',
                'select.artdeco-dropdown__input',
                'select'
            ]
            
            dropdown = None
            for selector in dropdown_selectors:
                try:
                    dropdown = element.find_element(By.CSS_SELECTOR, selector)
                    if dropdown and dropdown.is_displayed():
                        break
                except:
                    continue

            if not dropdown:
                return

            select = Select(dropdown)
            time.sleep(random.uniform(0.3, 0.7))

            # Check if already selected
            selected_option = select.first_selected_option.text.strip()
            if selected_option and selected_option != 'Select an option' and selected_option != '--':
                return

            # Get question text
            question_text = ''
            try:
                label = element.find_element(By.TAG_NAME, 'label')
                question_text = label.text.lower()
            except:
                try:
                    # Try getting text from parent
                    question_text = element.text.lower()
                except:
                    pass

            if not question_text:
                return

            # Get options excluding placeholder
            options = [option.text for option in select.options 
                      if option.text.strip() and option.text not in ['Select an option', '--']]

            if options:
                answer = self._get_answer_from_set('dropdown', question_text, options)
                if not answer:
                    answer = self.gpt_answerer.answer_question_from_options(question_text, options)

                if answer:
                    self._select_dropdown(dropdown, answer)
                    time.sleep(random.uniform(0.3, 0.7))

        except Exception as e:
            utils.printred(f"Error handling dropdown: {str(e)}")

    def _get_answer_from_set(self, question_type: str, question_text: str, options: Optional[List[str]] = None) -> Optional[str]:
        for entry in self.set_old_answers:
            if isinstance(entry, tuple) and len(entry) == 3:
                if entry[0] == question_type and question_text in entry[1].lower():
                    answer = entry[2]
                    return answer if options is None or answer in options else None
        return None

    def _find_text_field(self, question: WebElement) -> WebElement:
        try:
            return question.find_element(By.TAG_NAME, 'input')
        except NoSuchElementException:
            return question.find_element(By.TAG_NAME, 'textarea')

    def _is_numeric_field(self, field: WebElement) -> bool:
        field_type = field.get_attribute('type').lower()
        if 'numeric' in field_type:
            return True
        class_attribute = field.get_attribute("id")
        return class_attribute and 'numeric' in class_attribute

    def _enter_text(self, element: WebElement, text: str) -> None:
        element.clear()
        element.send_keys(text)
        time.sleep(0.5)  # Allow the dropdown to appear, if any

        # Check for any dropdowns or autocomplete suggestions
        try:
            # Locate the first dropdown suggestion and click it
            dropdown = WebDriverWait(self.driver, 2).until(
                EC.visibility_of_element_located((By.CSS_SELECTOR, '.search-typeahead-v2__hit'))
            )
            dropdown.click()
            time.sleep(0.5)  # Wait to ensure the selection is made
        except (NoSuchElementException, TimeoutException):
            pass  # If no dropdown, continue as normal


    def _select_dropdown(self, element: WebElement, text: str) -> None:
        select = Select(element)
        select.select_by_visible_text(text)

    def _select_radio(self, radios: List[WebElement], answer: str) -> None:
        for radio in radios:
            if answer in radio.text.lower():
                radio.find_element(By.TAG_NAME, 'label').click()
                return
        radios[-1].find_element(By.TAG_NAME, 'label').click()

    def _handle_form_errors(self, element: WebElement, question_text: str, answer: str, text_field: WebElement) -> None:
        try:
            error = element.find_element(By.CSS_SELECTOR, '.artdeco-inline-feedback--error')
            error_text = error.text.lower()
            new_answer = self.gpt_answerer.try_fix_answer(question_text, answer, error_text)
            self._enter_text(text_field, new_answer)
        except NoSuchElementException:
            pass