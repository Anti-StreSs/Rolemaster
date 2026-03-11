@echo off
REM Script pour analyser CPR093.exe avec Ghidra Headless
echo Starting Ghidra headless analysis of CPR093.exe...

set GHIDRA_PATH=B:\Ghidra\ghidra_11.3.1_PUBLIC_20250219
set PROJECT_PATH=B:\IA_WORKS\2025-01-17_CPR_Rolemaster_Reverse\ghidra_project
set PROJECT_NAME=CPR093_Analysis
set FILE_PATH=B:\IA_WORKS\2025-01-17_CPR_Rolemaster_Reverse\cpr093.exe
set OUTPUT_PATH=B:\IA_WORKS\2025-01-17_CPR_Rolemaster_Reverse\outputs

REM Create output directory
if not exist "%OUTPUT_PATH%" mkdir "%OUTPUT_PATH%"

echo.
echo Trying analysis with x86:LE:16:Real Mode (DOS 16-bit)...
"%GHIDRA_PATH%\support\analyzeHeadless.bat" "%PROJECT_PATH%" "%PROJECT_NAME%" -import "%FILE_PATH%" -processor "x86:LE:16:Real Mode" -log "%OUTPUT_PATH%\analysis_16bit.log" -overwrite

echo.
echo Analysis complete. Check logs in %OUTPUT_PATH%
pause
