import csv
import os
import random
import time
import traceback
from itertools import product
from pathlib import Path
from selenium.common.exceptions import NoSuchElementException, TimeoutException
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import utils
from job import Job
from linkedIn_easy_applier import LinkedInEasyApplier


class EnvironmentKeys:
    def __init__(self):
        self.skip_apply = self._read_env_key_bool("SKIP_APPLY")
        self.disable_description_filter = self._read_env_key_bool("DISABLE_DESCRIPTION_FILTER")

    @staticmethod
    def _read_env_key(key: str) -> str:
        return os.getenv(key, "")

    @staticmethod
    def _read_env_key_bool(key: str) -> bool:
        return os.getenv(key) == "True"

class LinkedInJobManager:
    def __init__(self, driver):
        self.driver = driver
        self.set_old_answers = set()
        self.easy_applier_component = None

    def set_parameters(self, parameters):
        self.company_blacklist = parameters.get('companyBlacklist', []) or []
        self.title_blacklist = parameters.get('titleBlacklist', []) or []
        self.positions = parameters.get('positions', [])
        self.locations = parameters.get('locations', [])
        self.base_search_url = self.get_base_search_url(parameters)
        self.seen_jobs = []
        resume_path = parameters.get('uploads', {}).get('resume', None)
        if resume_path is not None and Path(resume_path).exists():
            self.resume_dir = Path(resume_path)
        else:
            self.resume_dir = None
        self.output_file_directory = Path(parameters['outputFileDirectory'])
        self.env_config = EnvironmentKeys()
        self.old_question()

    def set_gpt_answerer(self, gpt_answerer):
        self.gpt_answerer = gpt_answerer

    def old_question(self):
        """
        Load old answers from a CSV file into a dictionary.
        """
        self.set_old_answers = {}
        file_path = 'data_folder/output/old_Questions.csv'
        if os.path.exists(file_path):
            with open(file_path, 'r', newline='', encoding='utf-8', errors='ignore') as file:
                csv_reader = csv.reader(file, delimiter=',', quotechar='"')
                for row in csv_reader:
                    if len(row) == 3:
                        answer_type, question_text, answer = row
                        self.set_old_answers[(answer_type.lower(), question_text.lower())] = answer


    def start_applying(self):
        self.easy_applier_component = LinkedInEasyApplier(
            self.driver, self.resume_dir, self.set_old_answers, self.gpt_answerer
        )
        searches = list(product(self.positions, self.locations))
        random.shuffle(searches)
        page_sleep = 0
        minimum_time = 3 * 3
        minimum_page_time = time.time() + minimum_time

        for position, location in searches:
            location_url = "&location=" + location
            job_page_number = -1
            utils.printyellow(f"Starting the search for {position} in {location}.")

            try:
                while True:
                    page_sleep += 1
                    job_page_number += 1
                    utils.printyellow(f"Going to job page {job_page_number}")
                    self.next_job_page(position, location_url, job_page_number)
                    time.sleep(random.uniform(0.2, 1))
                    utils.printyellow("Starting the application process for this page...")
                    self.apply_jobs()
                    utils.printyellow("Applying to jobs on this page has been completed!")

                    time_left = minimum_page_time - time.time()
                    if time_left > 0:
                        # utils.printyellow(f"Sleeping for {time_left} seconds.")
                        # time.sleep(time_left)
                        minimum_page_time = time.time() + minimum_time
                    if page_sleep % 5 == 0:
                        # sleep_time = random.randint(5, 34)
                        # utils.printyellow(f"Sleeping for {sleep_time / 60} minutes.")
                        # time.sleep(sleep_time)
                        page_sleep += 1
            except Exception:
                traceback.format_exc()
                pass
            time_left = minimum_page_time - time.time()
            if time_left > 0:
                # utils.printyellow(f"Sleeping for {time_left} seconds.")
                # time.sleep(time_left)
                minimum_page_time = time.time() + minimum_time
            if page_sleep % 5 == 0:
                # sleep_time = random.randint(50, 90)
                # utils.printyellow(f"Sleeping for {sleep_time / 60} minutes.")
                # time.sleep(sleep_time)
                page_sleep += 1

    def apply_jobs(self):
        try:
            # Constants for retry logic
            max_retries = 5
            base_timeout = 15
            retry_delay = 3

            def wait_for_page_load():
                try:
                    WebDriverWait(self.driver, base_timeout).until(
                        lambda d: d.execute_script('return document.readyState') == 'complete'
                    )
                    time.sleep(2)  # Additional buffer for dynamic content
                    return True
                except:
                    return False

            def check_for_no_results():
                try:
                    no_results = self.driver.find_elements(By.CSS_SELECTOR, 
                        '.jobs-search-no-results-banner, .jobs-search-two-pane__no-results-banner, .jobs-search-results__zero-results')
                    return any(elem.is_displayed() for elem in no_results if elem.text.strip())
                except:
                    return False

            # Wait for initial page load
            if not wait_for_page_load():
                utils.printred("Page failed to load completely")
                raise Exception("Page load timeout")

            # Check for "No results" message
            if check_for_no_results():
                utils.printyellow("No jobs found on this page")
                return

            # List of possible job container selectors
            container_selectors = [
                '.jobs-search-results-list',
                '.jobs-search__job-card-list',
                '.jobs-search-results__list',
                'div[data-job-id]',
                '.job-card-container--clickable'
            ]

            job_container = None
            for attempt in range(max_retries):
                utils.printyellow(f"Attempt {attempt + 1} to find job listings...")
                
                # Try each selector
                for selector in container_selectors:
                    try:
                        job_container = WebDriverWait(self.driver, base_timeout).until(
                            EC.presence_of_element_located((By.CSS_SELECTOR, selector))
                        )
                        if job_container and job_container.is_displayed():
                            utils.printyellow(f"Found jobs container with selector: {selector}")
                            break
                    except:
                        continue
                
                if job_container:
                    break
                    
                if attempt < max_retries - 1:
                    utils.printyellow("Refreshing page and waiting...")
                    self.driver.refresh()
                    wait_for_page_load()
                    time.sleep(retry_delay)

            if not element:
                utils.printred("Could not find job listings after multiple attempts")
                self.driver.save_screenshot("debug_screenshot.png")
                raise Exception("Failed to find job listings container")

            # Check for no results with expanded selector set
            no_jobs_elements = self.driver.find_elements(By.CSS_SELECTOR, '.jobs-search-no-results-banner, .jobs-search-two-pane__no-results-banner')
            if no_jobs_elements:
                for element in no_jobs_elements:
                    if any(msg in element.text.lower() for msg in ['no matching jobs', 'no results', 'unfortunately']):
                        raise Exception("No more jobs on this page")

            # Try multiple possible selectors for job results
            job_results = None
            for selector in [".jobs-search-results-list", ".jobs-search-results__list"]:
                try:
                    job_results = WebDriverWait(self.driver, 5).until(
                        EC.presence_of_element_located((By.CSS_SELECTOR, selector))
                    )
                    break
                except TimeoutException:
                    continue

            if not job_results:
                raise Exception("Could not find job results list")

            utils.scroll_slow(self.driver, job_results)
            utils.scroll_slow(self.driver, job_results, step=300, reverse=True)

            job_list_elements = self.driver.find_elements(By.CLASS_NAME, 'jobs-search-results__list-item')

            if not job_list_elements:
                raise Exception("No job class elements found on page")

            for job_element in job_list_elements:
                job_info = self.extract_job_information_from_tile(job_element)
                if not any(info is None for info in job_info):
                    job = Job(*job_info)

                    if self.is_blacklisted(job.title, job.company, job.link):
                        utils.printyellow(f"Blacklisted {job.title} at {job.company}, skipping...")
                        self.write_to_file(job.company, job.location, job.title, job.link, "skipped")
                        continue

                    try:
                        if job.apply_method in {"Easy Apply", "Apply"}:
                            utils.printyellow(f"Attempting to apply for {job.title} at {job.company}...")
                            self.easy_applier_component.job_apply(job)
                            utils.printyellow(f"Successfully applied to {job.title} at {job.company}")
                            self.write_to_file(job.company, job.location, job.title, job.link, "success")
                        else:
                            utils.printyellow(f"Skipping {job.title} - not an Easy Apply job")
                            self.write_to_file(job.company, job.location, job.title, job.link, "skipped")
                    except Exception as e:
                        utils.printred(f"Failed to apply for {job.title} at {job.company}: {str(e)}")
                        utils.printred(traceback.format_exc())
                        self.write_to_file(job.company, job.location, job.title, job.link, "failed")

        except Exception as e:
            utils.printred(f"Error in apply_jobs: {str(e)}")
            utils.printred(traceback.format_exc())
            raise e


    def write_to_file(self, company, job_title, link, job_location, file_name):
        to_write = [company, job_title, link, job_location]
        file_path = self.output_file_directory / f"{file_name}.csv"
        with open(file_path, 'a', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(to_write)

    def record_gpt_answer(self, answer_type, question_text, gpt_response):
        to_write = [answer_type, question_text, gpt_response]
        file_path = self.output_file_directory / "registered_jobs.csv"
        try:
            with open(file_path, 'a', newline='', encoding='utf-8') as f:
                writer = csv.writer(f)
                writer.writerow(to_write)
        except Exception as e:
            utils.printred(f"Error writing registered job: {e}")
            utils.printred(f"Details: Answer type: {answer_type}, Question: {question_text}")

    def get_base_search_url(self, parameters):
        url_parts = []
        if parameters['remote']:
            url_parts.append("f_CF=f_WRA")
        experience_levels = [str(i+1) for i, v in enumerate(parameters.get('experienceLevel', [])) if v]
        if experience_levels:
            url_parts.append(f"f_E={','.join(experience_levels)}")
        url_parts.append(f"distance={parameters['distance']}")
        job_types = [key[0].upper() for key, value in parameters.get('jobTypes', {}).items() if value]
        if job_types:
            url_parts.append(f"f_JT={','.join(job_types)}")
        date_mapping = {
            "all time": "",
            "month": "&f_TPR=r2592000",
            "week": "&f_TPR=r604800",
            "24 hours": "&f_TPR=r86400"
        }
        date_param = next((v for k, v in date_mapping.items() if parameters.get('date', {}).get(k)), "")
        url_parts.append("f_LF=f_AL")  # Easy Apply
        base_url = "&".join(url_parts)
        return f"?{base_url}{date_param}"

    def next_job_page(self, position, location, job_page):
        self.driver.get(f"https://www.linkedin.com/jobs/search/{self.base_search_url}&keywords={position}{location}&start={job_page * 25}")

    def extract_job_information_from_tile(self, job_tile):
        job_title, company, job_location, apply_method, link = "", "", "", "", ""
        try:
            # Multiple selectors for job title
            title_selectors = [
                '.job-card-list__title',
                '.job-card-container__link',
                'a[data-control-name="job_card_title"]',
                '.jobs-search-results__list-item-title'
            ]
            
            # Try each title selector
            title_element = None
            for selector in title_selectors:
                try:
                    title_element = job_tile.find_element(By.CSS_SELECTOR, selector)
                    if title_element.is_displayed():
                        break
                except:
                    continue
                    
            if not title_element:
                raise Exception("Could not find job title element")
                
            job_title = title_element.text.strip()
            link = title_element.get_attribute('href')
            if link:
                link = link.split('?')[0]
            
            # Multiple selectors for company name
            company_selectors = [
                '.job-card-container__primary-description',
                '.job-card-container__company-name',
                'a[data-control-name="company_link"]',
                '.job-card-container__company-link'
            ]
            
            # Try each company selector
            for selector in company_selectors:
                try:
                    company_element = job_tile.find_element(By.CSS_SELECTOR, selector)
                    if company_element.is_displayed():
                        company = company_element.text.strip()
                        break
                except:
                    continue
                    
            # Multiple selectors for location
            location_selectors = [
                '.job-card-container__metadata-item',
                '.job-card-container__location',
                '.job-card-container__location-text'
            ]
            
            # Try each location selector
            for selector in location_selectors:
                try:
                    location_element = job_tile.find_element(By.CSS_SELECTOR, selector)
                    if location_element.is_displayed():
                        job_location = location_element.text.strip()
                        break
                except:
                    continue

            # Get apply method - look for "Easy Apply" button specifically
            try:
                apply_button = job_tile.find_element(By.CSS_SELECTOR, '.jobs-apply-button.artdeco-button--primary')
                apply_method = apply_button.text.strip()
            except:
                try:
                    # Fallback to general apply method
                    apply_method = job_tile.find_element(By.CSS_SELECTOR, '.job-card-container__apply-method').text.strip()
                except:
                    apply_method = "Apply"

            if not all([job_title, company, link]):
                utils.printred(f"Missing critical job information: Title={job_title}, Company={company}, Link={link}")
                return None, None, None, None, None

            return job_title, company, job_location, link, apply_method

        except Exception as e:
            utils.printred(f"Error extracting job information: {str(e)}")
            return None, None, None, None, None

    def is_blacklisted(self, job_title, company, link):
        job_title_words = job_title.lower().split(' ')
        title_blacklisted = any(word in job_title_words for word in self.title_blacklist)
        company_blacklisted = company.strip().lower() in (word.strip().lower() for word in self.company_blacklist)
        link_seen = link in self.seen_jobs
        return title_blacklisted or company_blacklisted or link_seen