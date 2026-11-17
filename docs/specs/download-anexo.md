# Spec — Download de anexo

## Objetivo
Todo item com anexo (PDF ou qualquer arquivo) pode ser baixado a qualquer momento.

## Comportamento
- Card com anexo mostra botão **⬇ Baixar** (não abre o modal ao clicar).
- Dentro do item (modal de edição): nome do arquivo + botões **Abrir** (visualiza no app) e **Baixar**.
- O download sai com o nome original do arquivo, não com o nome interno (que leva o id na frente).
- `GET /api/anexos/<arquivo>` → abre (inline). `?download=1` → força download.

## Casos-limite
- Arquivo apagado do disco → 404, botão continua visível (o item guarda a referência).
- Nome com acento/espaço → enviado em `filename*` (UTF-8), funciona no Chrome e Safari.

## Segurança
- Mantém a proteção contra path traversal (`path.basename` + checagem de pasta).
