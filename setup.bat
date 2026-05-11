@echo off
echo ================================================
echo  MoodJournal - Setup Script
echo ================================================
echo.

echo [1/3] Installing Node.js dependencies...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: npm install failed. Make sure Node.js is installed.
    pause
    exit /b 1
)

echo.
echo [2/3] Installing Python training dependencies...
echo (Skip this if you already trained the model)
pip install -r requirements_train.txt
if %ERRORLEVEL% NEQ 0 (
    echo WARNING: pip install failed. You can train later.
)

echo.
echo [3/3] Checking for trained model...
if exist "public\model\model.json" (
    echo  Model found! The app will use it.
) else (
    echo  No trained model found yet.
    echo  Run: python train_mood_model.py
    echo  (The app will use rule-based mood detection until then)
)

echo.
echo ================================================
echo  Setup complete! Start the app with:
echo    npm run dev
echo ================================================
pause
