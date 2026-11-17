#!/bin/bash
# Backpack — abre o servidor e o navegador sem instalar. Feche esta janela para desligar.
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  osascript -e 'display alert "O Backpack precisa do Node.js" message "Instale em https://nodejs.org e tente de novo."'
  exit 1
fi
open "http://127.0.0.1:4322" &
exec node server.js
