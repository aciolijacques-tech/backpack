# Spec — Funções da versão 2

Comportamento esperado de cada função (os testes automáticos cobrem a API; os fluxos de tela foram
testados no navegador em desktop e celular).

- **Biblioteca:** grade, lista, tabela (ordena ao clicar no título da coluna) e quadro (colunas por
  status, categoria ou tipo; arrastar muda o campo). Filtros por tipo, categoria, status,
  etiqueta, favoritos e texto.
- **Item:** salva sozinho ao digitar. Item novo vazio é descartado ao fechar. Checklist com
  progresso, links, vários anexos (ver, ler, baixar, abrir no Mac, mostrar no Finder).
- **Arrastar arquivo:** na janela vira item novo; com um item aberto, vira anexo dele.
- **Tarefas:** data escrita no fim do texto ("hoje", "amanhã", "depois de amanhã", "semana que
  vem", "em 3 dias", dia da semana, "dia 20", "20/11"). Grupos: atrasadas, hoje, próximas, sem data.
- **Calendário:** mês com tarefas e itens; clicar no dia cria tarefa; arrastar remarca.
- **Lixeira:** apagar sempre passa por ela, com "Desfazer" no aviso.
- **Busca (Cmd+K ou /):** títulos, etiquetas, nomes de anexos, textos, tarefas e comandos.
- **Leitor:** .md/.txt em blocos, com botão de copiar nos códigos; HTML sempre escapado.
- **Mapa:** ligações por etiqueta, categoria (em corrente) e menção.
- **IA:** só envia texto quando a pessoa clica. Um motor por vez (Claude Code ou Codex), com troca
  automática quando o limite acaba; ver `ia-motores.md`.
  Roda numa pasta vazia, sem ferramentas. Chave fica em `data/segredos.json` (permissão 600).
- **Foco:** 15/25/45/60 min no servidor; aviso do macOS; XP resgatado ao abrir o app.
- **Jogo:** XP com teto diário por ação, nível = raiz(xp/40)+1, meta diária, sequência de dias,
  3 missões com bônus, 14 conquistas. Desligável; sons e confete também.
- **Notion/Trello/Drive:** só depois de conectar nas Configurações; Drive escreve .md por item e
  só remove o que ele mesmo criou.
- **Atualização:** ver decisão 0006.

## Riscos de segurança tratados
CSRF e DNS rebinding (cabeçalho + host + origem), XSS por anexo (tipos não seguros sempre baixam,
SVG com CSP sandbox), caminho de arquivo (basename + checagem de pasta), CSP na página.
