@echo off
setlocal
cls

:: A szkript atnavigal a szulo mappaba, ahol a docker-compose.yml-t kezelni kell
cd /d "%~dp0.."

echo.
echo === UMGKL HUB Adatbazis Szerviz Mod ===
echo.

:: Ellenorizzuk, hogy a sablonfajlok leteznek-e a 'tools' mappaban
if not exist tools\docker-compose.secure.yml (
    echo HIBA: A 'tools\docker-compose.secure.yml' sablonfajl nem talalhato!
    pause
    exit /b
)
if not exist tools\docker-compose.service.yml (
    echo HIBA: A 'tools\docker-compose.service.yml' sablonfajl nem talalhato!
    pause
    exit /b
)

echo [1/4] Az alkalmazas leallitasa...
docker compose down

echo [2/4] A 'docker-compose.yml' csereje a szerviz verzioval...
:: Most mar a 'tools' mappabol masolunk
copy tools\docker-compose.service.yml docker-compose.yml > nul

echo [3/4] Az alkalmazas inditasa szerviz modban (nyitott porttal)...
docker compose up -d

echo.
echo ======================================================================
echo   A RENDSZER SZERVIZ MODBAN ELINDULT!
echo   Most a DBeaver programmal csatlakozhatsz a localhost:5432 cimen.
echo.
echo   MIUTAN ELMENTETTED A VALTOZTATASOKAT ES BEZARTAD A DBEAVERT,
echo   gyere vissza ide, es nyomj meg egy gombot a normal mod visszaallitasahoz...
echo ======================================================================
echo.
pause > nul

echo.
echo [4/4] A rendszer visszaallitasa normal, biztonsagos modba...
docker compose down
copy tools\docker-compose.secure.yml docker-compose.yml > nul
docker compose up -d

echo.
echo === Muvelet Befejezve! Az adatbazis portja bezarva. ===
echo.
pause