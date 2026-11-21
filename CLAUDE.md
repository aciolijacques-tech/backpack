# Backpack — regras fixas

## O que é
Inventário pessoal para Mac e Windows: PDFs/estudos, prompts, instruções, comandos, links e notas, com tarefas,
calendário, mapa de conexões, IA, foco e gamificação. Mesmo objetivo do MyLoot
(github.com/edirsooo/myloot), com código, visual e arquitetura próprios. Antes se chamava Tooref
(repositório no GitHub: `aciolijacques-tech/backpack`).

## Stack (fixo — não mudar sem registrar decisão em docs/decisoes/)
- Servidor: Node.js puro (só módulos nativos), zero dependências. Escuta em `127.0.0.1:4322` (HTTP, só o
  Mac); com "Usar no celular" ligado, também em `0.0.0.0:4323` só HTTPS (decisão 0010).
  `server.js` (rotas) + `lib/` (dados, foco, ia, integracoes, drive, atualizar, exportar, conexoes,
  rede, lembretes).
- Front: HTML + CSS + JS puros em `public/`, sem build e sem framework. Objeto global `T`.
- Dados: `data/db.json` (formato de dados 2, ver `lib/dados.js`; não é a versão do app), gravação atômica, campo `rev` contra
  uma janela apagar a outra (409). Backup diário em `data/backups/` (20 mais novos; os antigos vão
  para `_antigos`, nada é apagado). Anexos em `data/anexos/`. Chaves em `data/segredos.json`.
- Visual: vidro fosco sobre ambiente quente desfocado (claro e escuro). Ver `DESIGN.md`.
- Mac: app nativo `mac/Backpack.swift` (janela WKWebView), compilado e instalado em Aplicativos
  pelo `Instalar Backpack.app`, que também liga o servidor pelo launchd (`com.backpack.server`).
  Registro da instalação em `data/logs/instalacao.log`.
- Windows (decisão 0012): `windows/` com `instalar.ps1` (atalhos no Menu Iniciar, Área de Trabalho e
  Inicializar), `servidor.cmd` (religa se cair, faz o papel do launchd) e `abrir.vbs` (Edge em modo app).
  Diferenças entre sistemas só em `lib/sistema.js`. Scripts do Windows com CRLF (`.gitattributes`).
  Ao mudar um script de `windows/`, a lista de arquivos da marca tem que bater em `instalar.ps1` e
  `lib/atualizar.js`.

## Segurança (fixo)
- Toda escrita na API exige o cabeçalho `X-Backpack: 1` e origem aceita; `Host` precisa ser
  `127.0.0.1:4322` ou `localhost:4322` (com o celular ligado, também os IPs do Mac). Isso bloqueia
  sites de fora (CSRF e DNS rebinding).
- Celular: só com o cookie `backpack` (QR ou código de 6 números). Rotas de sistema (`SO_MAC` no
  `server.js`) recusam quem não é o próprio Mac.
- Conexões (`/api/entrada`): só do próprio Mac e com o código do programa (`X-Backpack-Conexao`).
- CSP fechada na página; só o `voz-worker.js` libera jsDelivr/Hugging Face (modelo de voz).
- Anexos que não são PDF/imagem/mídia/texto sempre baixam (nunca abrem como página do app).
- `data/` nunca vai para o Git, o backup em .json ou o Drive inclui só o db, nunca `segredos.json`.

## Nunca fazer
- Não adicionar dependência de npm sem decisão registrada.
- Não mexer em `data/` nas atualizações do app.
- Não publicar versão nova sem subir o número em `versao.json` (é isso que avisa os usuários).
- Não implementar função nova sem spec em `docs/specs/`.

## Vídeos de divulgação (diretrizes de edição)
- Ao criar ou editar vídeo do Backpack (demo, Reels, Shorts), siga o pacote em
  `docs/video/referencia-edicao/`: leia `prompt-de-recriacao.txt` primeiro, depois
  `receita-visual.json` (regras R01–R12) e `referencia-de-edicao.md`; `mapa-de-cenas.csv` é a evidência.
- O pacote descreve a linguagem de edição de um vídeo de terceiro. Use só a gramática visual: nada de
  falas, voz, nome, endereço, promessas ou motivo de fundo da referência. Identidade e paleta vêm do
  `DESIGN.md`; conteúdo e voz são do Backpack.
- Os tempos da referência são evidência, não timeline: recalcule pela fala do vídeo do Backpack.
- O vídeo de referência fica fora do repositório (Downloads) e nunca entra no Git.

## Comandos
- Rodar: `node server.js` (ou `Abrir.command`)
- Testes: `node --test` (sobe servidores com dados temporários; nunca toca em `data/`)
- Publicar versão: subir `versao` e `novidades` em `versao.json`, commit e `git push`.
