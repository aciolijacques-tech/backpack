# Spec — Backpack no Windows

**Objetivo:** mesma experiência do Mac no Windows 10 e 11: instalar com dois cliques, abrir pelo
Menu Iniciar numa janela própria, servidor ligado sozinho, avisos e atualização automática.

**Precisa de:** Windows 10 (1803+) ou 11 e Node.js LTS. Edge (já vem no Windows) ou Chrome.

**Funciona igual:** tudo que roda no servidor e na tela. Abrir anexo, mostrar na pasta e abrir pasta do
cliente usam o Explorer. Lembretes e fim do foco viram notificação do Windows. IA acha o `claude`/`codex`
instalados pelo npm. Google Drive: unidade do "Google Drive para computador" (ex.: `G:\Meu Drive`).

**Critérios de aceite (testar num Windows de verdade):**
1. `Instalar Backpack.cmd` com Node instalado → atalho no Menu Iniciar e na Área de Trabalho, janela abre.
2. Reiniciar o Windows → o servidor liga sozinho; o atalho abre a janela sem demora.
3. Botão "Desligar" → servidor para e não volta até abrir o atalho ou reiniciar.
4. Anexo: Abrir e Mostrar na pasta abrem no Explorer (inclusive com espaço e acento no caminho).
5. Teste do aviso do foco mostra a notificação do Windows.
6. Atualização: baixa, troca os arquivos e o servidor volta com a versão nova.
7. `Desinstalar Backpack.cmd` remove atalhos e para o servidor; `data\` fica intacta.
8. Depois de instalar, "Backpack" aparece em Configurações → Aplicativos (e no Painel de Controle →
   Programas e Recursos), com o botão "Desinstalar" rodando o mesmo `desinstalar.ps1`.
9. "Usar no celular" ligado: o QR Code (link padrão em HTTP) abre e sincroniza no celular mesmo sem
   o Git para Windows instalado (sem `openssl`, só o modo seguro/HTTPS para microfone fica de fora).
