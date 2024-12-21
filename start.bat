@echo off
cd /d "%~dp0"
nvm use 22.12.0
start http://localhost:3000
npm run dev -- -p 3000 