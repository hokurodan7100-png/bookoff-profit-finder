@echo off
chcp 65001 > nul
cd /d "%~dp0"
title BOOKOFF利益商品検索
where node > nul 2>&1
if errorlevel 1 (
  echo Node.js が見つかりません。https://nodejs.org/ja から「LTS」版（22以上）をインストールしてから、もう一度ダブルクリックしてください。
  pause
  exit /b 1
)
node -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit(a>22||(a===22&&b>=13)?0:1)"
if errorlevel 1 (
  echo Node.js のバージョンが古いです（22.13 以上が必要）。https://nodejs.org/ja から「LTS」版を入れ直してください。
  node -v
  pause
  exit /b 1
)
echo 起動しています。この画面を閉じると停止します。
start "" cmd /c "timeout /t 3 /nobreak > nul & start "" http://localhost:3000"
node --env-file-if-exists=config.env --disable-warning=ExperimentalWarning dist\main.mjs
pause
