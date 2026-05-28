@echo off
title Zetalog - Automacao Logistica de XML NF-e
cls

echo ======================================================================
echo           ZETALOG - AUTOMACAO LOGISTICA DE XML NF-e
echo ======================================================================
echo.

:: 1. Verificar Node.js
echo [1/4] Verificando se o Node.js esta instalado...
node -v >nul 2>&1
if errorlevel 1 goto NoNode
echo [OK] Node.js detectado.
echo.

:: 2. Verificar .env
echo [2/4] Verificando variaveis de ambiente (.env)...
if exist .env goto EnvExists
if not exist .env.example goto NoEnvExample
echo [INFO] Criando arquivo .env a partir de .env.example...
copy .env.example .env > nul
echo [!] ATENCAO: Edite o arquivo .env e configure sua GEMINI_API_KEY!
goto EnvDone

:EnvExists
echo [OK] Arquivo .env encontrado.
goto EnvDone

:NoEnvExample
echo [AVISO] Arquivo .env ou .env.example nao encontrado.

:EnvDone
echo.

:: 3. Verificar dependencias
echo [3/4] Verificando dependencias (node_modules)...
if exist node_modules goto DepsExists
echo [INFO] Dependencias nao encontradas. Instalando (npm install)...
call npm install
if errorlevel 1 goto DepsError
echo [OK] Dependencias instaladas com sucesso.
goto DepsDone

:DepsExists
echo [OK] Dependencias ja instaladas.

:DepsDone
echo.

:: 4. Iniciar Servidor
echo [4/4] Iniciando o servidor de desenvolvimento...
echo [INFO] O navegador sera aberto em: http://localhost:3000
echo.

:: Abre o navegador de forma assincrona
start "" http://localhost:3000

:: Inicia o servidor
call npm run dev
if errorlevel 1 goto RunError

goto End

:NoNode
echo [ERRO] O Node.js nao foi encontrado no sistema!
echo Por favor, instale o Node.js em: https://nodejs.org/
echo.
pause
exit /b 1

:DepsError
echo [ERRO] Falha ao instalar as dependencias com "npm install".
echo.
pause
exit /b 1

:RunError
echo [ERRO] Falha ao rodar o comando "npm run dev".
echo.
pause
exit /b 1

:End
echo.
echo Servidor finalizado.
pause
