# 0003 — Sensação de app no Mac sem virar app nativo

> Substituída pela decisão 0008 (app nativo).

**Contexto:** o Tooref abria como aba de navegador (URL `127.0.0.1`), sem cara de app. O Jacques
quer ícone no Dock e janela sem barra de endereço.

**Decisão:** instalar como app pelo próprio navegador (Chrome "Instalar página como app" ou
Safari "Adicionar ao Dock"), com `manifest.json` e ícone próprio. O servidor passa a iniciar
sozinho no login via LaunchAgent do macOS (app `Instalar Tooref` / `Desinstalar.command`).

**Motivo:** entrega 90% da sensação de app nativo sem quebrar a decisão de zero dependências.
Electron/Tauri foi descartado por agora: build, assinatura e atualização de binário são escopo
grande demais pra o ganho.

**Custo aceito:** o servidor fica rodando em segundo plano (consumo baixo, Node ocioso). Se a
pasta do Tooref mudar de lugar, é preciso rodar o app `Instalar Tooref` de novo.
