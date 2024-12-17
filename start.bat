@echo off
cd /d "%~dp0"
start http://localhost:3000
npm run dev -- -p 3000 