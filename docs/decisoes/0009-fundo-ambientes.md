# 0009 — Vidro mais forte com três ambientes no fundo

**Contexto:** o Jacques achou o efeito de vidro fraco e pediu três imagens em loop atrás da tela:
os ambientes onde o app é usado (casa, escritório e aula).

**Decisão:**
- Três imagens se revezam a cada 10 s (6, 10, 20 ou 30 s nas Configurações), com troca suave.
  Só a troca anima; parada a imagem não se mexe, para o desfoque do vidro não pesar no Mac.
  Pausa com a janela escondida e respeita "reduzir movimento" do macOS.
- O vidro ficou mais transparente (janela 26% de branco, cartões 70%) e ganhou brilho na borda.
- As imagens padrão são ilustrações feitas para o app (sem foto de terceiros, sem licença a
  checar). A pessoa troca cada uma por foto própria nas Configurações; as fotos ficam em
  `data/ambientes` e sobrevivem às atualizações.

**Por quê ilustração:** os bancos de foto livres (Unsplash, Pexels, Wikimedia) estão fora do
alcance desta conexão, e foto sem licença clara não pode ir para um projeto de código aberto.
