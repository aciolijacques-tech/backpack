# 0006 — Aviso de versão nova para quem usa

**Contexto:** o Jacques quer que, a cada atualização publicada, as pessoas sejam avisadas para
atualizar.

**Decisão:** `versao.json` na raiz é a fonte. O servidor de cada pessoa confere o arquivo no
GitHub ao ligar e a cada 6 h; quando acha versão maior, mostra uma notificação do macOS (uma vez
por versão, mesmo com a janela fechada). O app também mostra um aviso com as novidades e o botão
"Atualizar agora", que baixa o ZIP do GitHub e troca só os arquivos do app (nunca `data/` nem
`.git/`) e reabre. Pastas que são repositório Git recebem a instrução de usar `git pull`.

**Para publicar:** subir `versao` e `novidades` em `versao.json`, commit e push no `master`.
Sem mudar o número, ninguém é avisado.

**Risco:** qualquer push no `master` com número novo chega a todo mundo. Só suba o número quando
a versão estiver testada (`node --test`).
