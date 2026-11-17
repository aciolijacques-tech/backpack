# Spec — Biblioteca (núcleo da v1)

## Objetivo
Guardar e achar itens pessoais rápido: Estudo/PDF, Prompt, Instrução, Comando, Link, Nota.

## Comportamento
- Listar itens em grade, mais recente primeiro.
- Criar/editar item: tipo, título, texto/conteúdo, tags (livres), data opcional (vira tarefa).
- Busca (`Ctrl+K`) filtra por título, texto e tags, em tempo real, no cliente.
- Filtro por tipo na barra lateral, com contagem por tipo.
- Anexo: 1 arquivo por item, enviado como base64 (sem lib de multipart — mantém server zero-dep).
  Limite de 20MB por anexo nesta v1 (documentado, não é ideal pra vídeo).
- Excluir item = soft delete (`apagadoEm` preenchido, some da listagem, mas fica no db.json).
  Sem lixeira na UI ainda — recuperação é manual editando o JSON. Risco aceito e documentado.
- Item com data vira "tarefa": aparece destacado quando a data é hoje ou já passou.

## Dados
`data/db.json`: `{ itens: [ { id, tipo, titulo, texto, tags[], data, anexo: {nome, caminho} | null,
criadoEm, atualizadoEm, apagadoEm | null } ] }`

## Casos-limite
- DB vazio na primeira execução → criar `{ itens: [] }`.
- Anexo maior que o limite → 413, mensagem clara no front.
- Item sem título → bloqueado no front (obrigatório).
- Dois processos escrevendo ao mesmo tempo → escrita atômica (tmp + rename) evita arquivo corrompido,
  mas não resolve condição de corrida entre duas abas abertas (risco aceito: uso é de uma pessoa só).

## Riscos de segurança
- Servidor só escuta em `127.0.0.1` — não exposto à rede.
- Nome de arquivo do anexo é sanitizado (sem `..`, sem caminho) antes de gravar em `data/anexos/`.
- Sem autenticação — aceitável por ser local e mono-usuário; documentar no README que não deve
  ser exposto na rede sem adicionar auth.
