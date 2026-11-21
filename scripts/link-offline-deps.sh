#!/usr/bin/env bash
# ネットワーク遮断環境用：プリインストール済みのパッケージを node_modules にリンクする。
# 通常の環境では `npm install` を使うこと。
set -euo pipefail
SRC="${OFFLINE_NODE_MODULES:-/opt/npm-tools/node_modules}"
mkdir -p node_modules/@types
for p in zod esbuild tsx typescript playwright playwright-core tailwindcss; do
  [ -e "node_modules/$p" ] || ln -s "$SRC/$p" "node_modules/$p"
done
[ -e node_modules/@types/node ] || ln -s "$SRC/@types/node" node_modules/@types/node
[ -e node_modules/@esbuild ] || ln -s "$SRC/@esbuild" node_modules/@esbuild
mkdir -p node_modules/.bin
ln -sf ../typescript/bin/tsc node_modules/.bin/tsc
ln -sf ../tsx/dist/cli.mjs node_modules/.bin/tsx
echo "linked offline deps from $SRC"
