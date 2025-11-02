@echo off
echo.
echo === UMGKL HUB Frissites Indul ===
echo.

echo [1/3] A legfrissebb kod letoltese a Git repobol...
git pull

:: Ellenorizzuk, hogy a git pull sikeres volt-e. Ha nem, leallunk.
if errorlevel 1 (
    echo.
    echo !!! HIBA: A git pull sikertelen volt. Kerlek, kezzel oldd meg a problemat. !!!
    echo.
    pause
    exit /b
)

echo.
echo [2/3] A regi kontener leallitasa es torlese...
docker compose down

echo.
echo [3/3] Az uj kontener epitese es inditasa...
docker compose up -d --build

echo.
echo === Frissites Befejezve! ===
echo.
pause