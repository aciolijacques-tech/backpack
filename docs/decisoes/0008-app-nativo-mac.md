# 0008 — App de verdade no Mac (substitui a 0003)

**Contexto:** o Jacques não quer abrir no navegador: quer instalar como software, com o ícone em
Aplicativos e no Launchpad, como qualquer app.

**Decisão:** um app nativo pequeno em Swift (`mac/Backpack.swift`): uma janela do Mac com
WKWebView que mostra o servidor local. O `Instalar Backpack` compila o app no próprio Mac
(`xcrun swiftc`), põe o ícone, assina localmente (ad-hoc) e instala em `/Applications`
(ou `~/Applications` se não tiver permissão). O app:
- liga o servidor se ele estiver desligado (`launchctl kickstart`, ou o node direto);
- manda downloads para a pasta Downloads e mostra no Finder;
- abre o seletor de arquivos do Mac nos anexos e no restaurar backup;
- abre links de fora no navegador padrão;
- tem os menus do Mac (sem o menu Editar, copiar e colar não funcionam num WKWebView).

**Motivo:** Electron/Tauri traria centenas de dependências e ~200 MB por um ganho que a janela
nativa já dá. Só a janela é nativa: todo o resto continua o mesmo código web, sem dependências.

**Custo aceito:**
- Para instalar, o Mac precisa das Ferramentas de Linha de Comando da Apple (o instalador pede).
- Mudança em `mac/Backpack.swift` só vale depois de rodar o instalador de novo.
- Sem assinatura da Apple: o macOS pede confirmação na primeira abertura do instalador.
- Para divulgar depois, o ideal é publicar o app já montado (GitHub Releases), para quem não tem
  as ferramentas da Apple. Isso exige montar num Mac a cada versão.
