# 0002 — Plataforma e distribuição (confirmado pelo Jacques em 2026-11-16)

**Contexto:** MyLoot é Windows-only (.bat/.vbs). O Jacques está no macOS.

**Decisão:** v1 roda em macOS, iniciada por um script `.command` (duplo clique, equivalente ao
`Instalar.bat` do MyLoot). Suporte a Windows/Linux fica para quando houver motivo real de uso em
outra máquina.

**Distribuição:** uso pessoal agora, mas com o objetivo declarado de abrir para outras pessoas
mais pra frente, em código aberto. Isso muda o padrão de capricho em relação a "só pessoal":
- Nada de caminho, nome de usuário ou dado hardcoded do ambiente do Jacques no código.
- README e script de instalação já escritos para alguém de fora conseguir rodar sozinho, não só
  para o Jacques lembrar como funciona.
- Sem essa pressão ainda: tradução pra inglês, telemetria de erros, onboarding guiado ou suporte
  a múltiplos usuários — isso só entra se e quando o projeto for de fato publicado.

**Nome "Tooref":** renomeado de "Toolbar" (nome genérico demais) a pedido do Jacques em 2026-11-16.
Vale checar disponibilidade no GitHub/npm antes de divulgar publicamente, mas não bloqueia a v1.
