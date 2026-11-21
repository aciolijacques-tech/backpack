// Backpack — o que muda de um sistema para outro (macOS e Windows): abrir arquivo ou pasta no
// programa do computador e mostrar aviso nativo. O resto do servidor é igual nos dois.
'use strict';
const cp = require('child_process');

const WIN = process.platform === 'win32';
const MAC = process.platform === 'darwin';
// ligado pelo serviço do sistema (launchd no Mac, servidor.cmd no Windows): sair com erro faz religar
const SERVICO = !!(process.env.BACKPACK_LAUNCHD || process.env.BACKPACK_SERVICO);
const NOME = MAC ? 'Mac' : WIN ? 'Windows' : 'computador';

const solto = (bin, args, extra = {}) => cp.spawn(bin, args, { detached: true, stdio: 'ignore', ...extra }).unref();

// abre o arquivo/pasta no programa padrão; com revelar, mostra o arquivo selecionado na pasta
function abrir(alvo, revelar) {
  if (MAC) return solto('open', revelar ? ['-R', alvo] : [alvo]);
  if (WIN) {
    // o Explorer tem regra própria de aspas: o caminho vai entre aspas e sem a conversão do Node
    const arg = revelar ? `/select,"${alvo}"` : `"${alvo}"`;
    return solto('explorer.exe', [arg], { windowsVerbatimArguments: true });
  }
  return solto('xdg-open', [revelar ? require('path').dirname(alvo) : alvo]);
}

// aviso nativo: Central de Notificações no Mac, notificação do Windows (10 e 11)
function avisar(titulo, texto) {
  if (process.env.BACKPACK_SEM_AVISO) return;
  try {
    if (MAC) {
      const q = (s) => String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      solto('osascript', ['-e', `display notification "${q(texto)}" with title "${q(titulo)}" sound name "Glass"`]);
    } else if (WIN) {
      const x = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
      const xml = `<toast><visual><binding template="ToastGeneric"><text>${x(titulo)}</text><text>${x(texto)}</text></binding></visual></toast>`;
      const ps = [
        '[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] > $null',
        '[Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] > $null',
        '$x = New-Object Windows.Data.Xml.Dom.XmlDocument',
        `$x.LoadXml('${xml.replace(/'/g, "''")}')`,
        '$t = [Windows.UI.Notifications.ToastNotification]::new($x)',
        "[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\\WindowsPowerShell\\v1.0\\powershell.exe').Show($t)",
      ].join('\n');
      // -EncodedCommand evita qualquer problema de aspas e acentos
      solto('powershell.exe', ['-NoProfile', '-NonInteractive', '-WindowStyle', 'Hidden', '-EncodedCommand', Buffer.from(ps, 'utf16le').toString('base64')], { windowsHide: true });
    }
  } catch (_) {}
}

module.exports = { WIN, MAC, SERVICO, NOME, abrir, avisar };
