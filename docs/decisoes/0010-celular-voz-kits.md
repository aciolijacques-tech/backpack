# 0010 — Celular por HTTPS, voz e kits

**Contexto:** a versão 1.0 traz o que faltava do MyLoot 2.9.2. Duas funções mexem no fixo.

**Decisão:**
1. **Celular só por HTTPS.** O Mac continua em HTTP só em 127.0.0.1:4322 (nunca na rede). Com
   "Usar no celular" ligado, abre a porta 4323 em 0.0.0.0, só HTTPS. O certificado é feito no Mac
   com o `openssl` do macOS: uma autoridade própria (dura 10 anos, o celular confia uma vez) assina o
   certificado do servidor (397 dias, refeito quando o IP muda). Arquivos em `data/tls`. Quem não é o próprio Mac precisa do cookie `backpack` (QR com token ou código de
   6 números). Rotas de sistema (desligar, abrir arquivos, chaves, restaurar, conexões, rede,
   atualizar) recusam o celular. O `Host` aceito passa a incluir os IPs do Mac e `*.local`/`*.ts.net`
   só na porta HTTPS e com o celular ligado. Cookie com `Secure`.
2. **Voz com Whisper no próprio app.** No app do Mac a gravação é feita pelo próprio Mac
   (AVAudioRecorder em Swift, ponte `backpackMic`), porque a janela WKWebView não libera o gravador
   do navegador. Transcrição (Transformers.js 3.7.1 + `onnx-community/whisper-base`,
   baixados do jsDelivr/Hugging Face uma vez). A CSP da página continua fechada; só o
   `voz-worker.js` recebe uma CSP que libera esses dois endereços e WebAssembly. O app nativo
   pede o microfone (NSMicrophoneUsageDescription) e só libera para 127.0.0.1:4322.
3. **Sem dependência de npm.** ZIP, criptografia (AES-256-GCM + scrypt) e QR Code feitos com
   módulos nativos ou código próprio (QR copiado do MyLoot, MIT, com crédito no arquivo).
4. **Kits**: os 23 kits do MyLoot servem de texto-base (MIT). O Backpack tem os seus, sem a marca
   da Prestes Design, com PDFs no visual do Backpack (`ferramentas/gerar_kits.py`). Contratos levam
   aviso de "modelo de referência, revise com um advogado". Crédito no README.

**Por quê:** é o que a pessoa pediu ("tudo o que não tem"), mantendo zero dependências e os dados
no Mac. Na primeira vez o celular avisa que o certificado não é de uma empresa; a tela explica como instalar.
