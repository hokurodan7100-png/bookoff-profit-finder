#!/bin/bash
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js が見つかりません。https://nodejs.org/ja から「LTS」版（22以上）をインストールしてください。"; read -r; exit 1
fi
if ! node -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit(a>22||(a===22&&b>=13)?0:1)"; then
  echo "Node.js のバージョンが古いです（22.13 以上が必要）：$(node -v)"; read -r; exit 1
fi
echo "起動しています。このウィンドウを閉じると停止します。"
(sleep 2; open "http://localhost:${PORT:-3000}") &
exec node --env-file-if-exists=config.env --disable-warning=ExperimentalWarning dist/main.mjs
