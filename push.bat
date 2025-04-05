@echo off
:: GitAutoCommitPush.cmd - Automates git add, commit, and push with timestamp

:: Get current date and time in YYYY-MM-DD HH:MM:SS format
for /f "tokens=1-3 delims=/ " %%a in ('date /t') do set currentDate=%%c-%%a-%%b
for /f "tokens=1-3 delims=:." %%a in ('time /t') do set currentTime=%%a:%%b:%%c

:: Stage all changes
git add .

:: Commit with timestamp
git commit -m "Commit on %currentDate% %currentTime%"

:: Push changes
git push

:: Success message
echo Changes staged, committed, and pushed successfully!
pause