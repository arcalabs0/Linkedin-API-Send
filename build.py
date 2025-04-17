
from setuptools import setup, Extension
from Cython.Build import cythonize
import sys

# List all Python files to be compiled
extensions = [
    Extension("main", ["main.py"]),
    Extension("api", ["api.py"]),
    Extension("utils", ["utils.py"]),
    Extension("job", ["job.py"]),
    Extension("gpt", ["gpt.py"]),
    Extension("strings", ["strings.py"]),
    Extension("resume", ["resume.py"]),
    Extension("linkedIn_authenticator", ["linkedIn_authenticator.py"]),
    Extension("linkedIn_bot_facade", ["linkedIn_bot_facade.py"]),
    Extension("linkedIn_easy_applier", ["linkedIn_easy_applier.py"]),
    Extension("linkedIn_job_manager", ["linkedIn_job_manager.py"])
]

if __name__ == '__main__':
    # Add build_ext command
    sys.argv.append("build_ext")
    sys.argv.append("--inplace")
    
    setup(
        name="LinkedInAIHawk",
        ext_modules=cythonize(
            extensions,
            compiler_directives={
                'language_level': "3",
                'boundscheck': False,
                'wraparound': False,
                'embedsignature': True
            }
        )
    )
