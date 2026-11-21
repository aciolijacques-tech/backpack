# 0011 — Celular abre em qualquer navegador (HTTP na rede de casa)

**Contexto:** com só HTTPS (decisão 0010), ler o QR caía em “conexão não privada” e exigia instalar e
confiar num certificado no celular. Na prática, ninguém passava dessa tela.

**Decisão:** com “Usar no celular” ligado, abre também a porta 4324 em HTTP na rede. O QR Code e o
endereço da tela apontam para ela: lê o QR, abre e já entra. A 4323 (HTTPS) continua para quem
instalar o certificado (só ela libera o microfone no celular). Cookie separado: `backpack_lan` (sem
`Secure`) no HTTP e `backpack` no HTTPS, porque o navegador não deixa HTTP sobrescrever cookie
`Secure`. Todo o resto da 0010 vale igual para as duas portas: desligado por padrão, `Host` conferido,
8 erros = 15 min, rotas de sistema só no Mac. Se o certificado falhar, o HTTP sobe mesmo assim.

**Risco aceito:** no HTTP o tráfego entre celular e Mac não é criptografado. Alguém no mesmo Wi-Fi
com ferramenta de captura pode ver os dados e copiar o cookie. Em casa, aceitável; em Wi-Fi público
ou de escritório, deixar “Usar no celular” desligado ou usar a porta HTTPS.

**Limite fora do código:** no iPhone, navegadores que não são o Safari (Chrome etc.) precisam da
permissão “Rede Local” (Ajustes → Privacidade e Segurança → Rede Local) para abrir IP da rede de casa.
