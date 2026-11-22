# 0012 — Backpack também no Windows (10 e 11)

**Contexto:** o servidor e a tela já eram Node puro e HTML/JS puros; só o app nativo (Swift), o instalador
e alguns comandos (`open`, `osascript`, `ditto`) eram do Mac.

**Decisão:** sem dependência nova e sem Electron/Tauri. No Windows a janela é o Edge (ou Chrome) em modo
app (`--app`, sem barra de endereço, perfil próprio em `%LOCALAPPDATA%\Backpack\janela`). Tudo em `windows/`:
- `instalar.ps1` (chamado por `Instalar Backpack.cmd`): confere o Node, cria o atalho em Inicializar
  (servidor liga ao entrar no Windows) e o atalho "Backpack" no Menu Iniciar e na Área de Trabalho.
- `servidor.cmd` (aberto escondido por `servidor.vbs`): faz o papel do launchd. Religa se cair; saída 0
  para; saída 75 (atualizou) religa na hora. Marca o processo com `BACKPACK_SERVICO=1`.
- `abrir.vbs`: liga o servidor se estiver desligado e abre a janela.
- `instalar.ps1` também grava `HKCU\...\Uninstall\Backpack` (nome, versão, ícone, tamanho e o
  `UninstallString` apontando para `desinstalar.ps1`), para o Backpack aparecer em Configurações →
  Aplicativos e poder ser desinstalado por lá, igual a um programa normal. `desinstalar.ps1` remove
  essa chave no fim.
- `instalar.ps1` e `desinstalar.ps1` se reabrem como administrador (um `Start-Process -Verb RunAs`
  logo no início, se ainda não estiverem elevados) só para liberar — e depois tirar — uma regra do
  Firewall do Windows nas portas do celular (4323 e 4324, rede Privada, amarrada ao `node.exe`
  encontrado). Isso evita depender da pessoa aceitar (ou não aceitar, ou nem ver) o aviso do Firewall
  no momento em que liga "Usar no celular". O resto do instalador roda igual, só que elevado.
- O que muda por sistema fica em `lib/sistema.js` (abrir arquivo/pasta, aviso nativo, serviço).
- Atualização: `tar.exe` do Windows abre o ZIP. A marca do app usa os scripts de `windows/` (mesma
  ordem no `instalar.ps1` e no `lib/atualizar.js`).
- Scripts guardados com CRLF e `-text` no `.gitattributes`; `.ps1` com BOM (PowerShell 5 lê acentos).

**Limites aceitos:**
- Microfone: sem a ponte nativa do Mac; usa o gravador do Edge (pede permissão na primeira vez).
- Celular em HTTPS precisa do `openssl`, que vem com o Git para Windows. Sem ele, o celular entra só pelo HTTP.
- Aviso nativo aparece com o nome "Windows PowerShell" (não há app registrado no Windows).
- Sem assinatura de código: o SmartScreen pode avisar na primeira vez ("Mais informações → Executar assim mesmo").
- Ainda não testado num Windows de verdade: precisa de um teste completo antes de anunciar.
