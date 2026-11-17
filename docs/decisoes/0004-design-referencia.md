# 0004 — Visual da referência: vidro claro sobre ambiente quente

**Contexto:** o primeiro visual era escuro e chapado, longe da referência que o Jacques deixou na
pasta (dashboard em vidro claro com indicadores, calendário e agenda). Ele pediu para aplicar a
referência.

**Decisão:** trocar o design system (FIXO) para vidro claro sobre fundo quente desfocado, com
barra de topo e trilho lateral flutuantes. A estrutura da referência foi mapeada para dados reais
do Tooref: os indicadores contam itens, tarefas de hoje, atrasadas e anexos; o calendário marca os
dias com tarefas; a agenda lista as próximas. A foto da referência não foi usada; o fundo é só
gradiente.

**Motivo:** o pedido foi explícito e a mudança é só de apresentação. As rotas da API e o formato
dos dados não mudaram. O painel só lê os itens (evento `tooref:itens`), sem escrever nada.

**Junto:** corrigido bug de fuso. "Hoje" era calculado em UTC, então depois das 21h no Brasil as
tarefas do dia apareciam como atrasadas. Agora usa a data local (`Tooref.dataLocalISO`).
