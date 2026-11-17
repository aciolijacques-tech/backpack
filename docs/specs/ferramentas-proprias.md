# Spec — Ferramentas próprias

## Objetivo
Na página Ferramentas, a pessoa adiciona os sites que usa sempre, além da lista que vem com o app.

## Comportamento
- Botão "Nova ferramenta" no topo e um cartão "+" no fim da grade abrem a janela: nome, site,
  para que serve (opcional) e grupo (IA, imagem e design, vídeo e áudio, organização, outras).
- Site sem "https://" ganha o prefixo; precisa ter domínio (ex: photopea.com).
- As ferramentas da pessoa aparecem primeiro, com a etiqueta "sua" e um lápis para editar.
  Filtro "Minhas" mostra só elas. Clique direito: abrir, editar, remover (com Desfazer).
- "Guardar" funciona igual às outras: vira um item do tipo Link na Biblioteca.

## Dados
`db.ferramentas: [{ id, nome, descricao, url, grupo, criadoEm }]`. O servidor descarta qualquer
link que não seja http(s) (bloqueia `javascript:` e afins) e põe grupo desconhecido em "outras".

## Riscos
Link malicioso no campo site: barrado no navegador e no servidor (só http/https).
