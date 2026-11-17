#!/bin/bash
# Backpack — desinstala o app e o servidor automático. Não apaga seus dados (pasta data/).
for L in com.backpack.server com.tooref.server; do
  P="$HOME/Library/LaunchAgents/$L.plist"
  launchctl unload "$P" 2>/dev/null || true
  rm -f "$P"
done
pkill -x Backpack 2>/dev/null || true
for A in "/Applications/Backpack.app" "$HOME/Applications/Backpack.app"; do [ -d "$A" ] && rm -rf "$A" && echo "Removido: $A"; done
echo "Backpack desinstalado. Seus dados em data/ continuam intactos."
