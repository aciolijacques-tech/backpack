# 0005 — Todas as funções do MyLoot, dados v2 e proteção da API

**Contexto:** a v1 tinha só a Biblioteca. O Jacques pediu todas as funções do MyLoot.

**Decisão:**
- Dados passam para o formato v2 (categorias, status, checklist, links, vários anexos, tarefas
  separadas, lixeira, configurações, jogo). A migração do v1 é automática e não perde nada:
  itens apagados vão para a lixeira.
- O navegador guarda o estado e salva o db inteiro (`PUT /api/db`), com o número `rev`. Se outra
  janela salvou antes, o servidor responde 409 e a tela recarrega com aviso.
- Anexo sobe como arquivo puro (sem base64): limite de 1 GB.
- A API passa a exigir cabeçalho próprio e origem/host locais.
- Funções: 4 visões com arrastar no quadro, menu de clique direito, editor com checklist/links/
  anexos/pré-visualização, arrastar arquivo para a janela, tarefas com data escrita no texto,
  calendário com arrastar, lixeira, busca Cmd+K com comandos, leitor de .md/.txt, mapa de
  conexões, IA (Claude Code, Codex ou chave), foco com aviso do macOS, XP/níveis/missões/
  conquistas/sons/confete, Notion, Trello, Google Drive, tema claro/escuro, backup/restaurar.
- Fica de fora: os 5 guias em PDF e a lista de 42 ferramentas do MyLoot (conteúdo de terceiros
  com preços e afirmações que não dá para verificar). A página Ferramentas tem uma lista curta de
  ferramentas conhecidas, só com o site oficial, sem preços.

**Motivo:** pedido explícito. Escrita do zero (sem copiar o código do MyLoot), seguindo o visual
de vidro e a regra de zero dependências.

**Custo aceito:** salvar o db inteiro fica pesado com dezenas de milhares de itens. Para uso
pessoal está longe disso; se crescer, troca-se por salvamento por item.
