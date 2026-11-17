// Backpack — app do Mac. É só a janela: mostra o Backpack (servidor local em 127.0.0.1:4322)
// num WKWebView, com menus do Mac, downloads para a pasta Downloads, seletor de arquivos do
// Finder e links de fora abrindo no navegador. Montado pelo "Instalar Backpack" com:
//   xcrun swiftc -swift-version 5 -O -framework Cocoa -framework WebKit -o Backpack Backpack.swift

import Cocoa
import WebKit
import AVFoundation

let PORTA = 4322
let ENDERECO = URL(string: "http://127.0.0.1:\(PORTA)/")!

// registro em data/logs/app.log (na pasta do Backpack), para achar problemas ao abrir
func registrar(_ texto: String) {
    guard let pasta = Bundle.main.object(forInfoDictionaryKey: "BackpackPasta") as? String else { return }
    let dir = URL(fileURLWithPath: pasta).appendingPathComponent("data/logs")
    try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
    let arq = dir.appendingPathComponent("app.log")
    let linha = "\(Date()) \(texto)\n"
    if let h = try? FileHandle(forWritingTo: arq) { h.seekToEndOfFile(); h.write(linha.data(using: .utf8)!); h.closeFile() }
    else { try? linha.write(to: arq, atomically: true, encoding: .utf8) }
}

// Microfone pelo próprio Mac: a janela do app (WKWebView) nem sempre libera a gravação pelo navegador,
// então a página pede aqui (window.webkit.messageHandlers.backpackMic) e recebe o áudio em m4a.
// O áudio fica num arquivo temporário e volta para a página, que transcreve no próprio Mac.
final class Microfone: NSObject, WKScriptMessageHandler {
    weak var web: WKWebView?
    var gravador: AVAudioRecorder?
    var medidor: Timer?
    let arquivo = FileManager.default.temporaryDirectory.appendingPathComponent("backpack-voz.m4a")

    func avisar(_ dados: [String: Any]) {
        guard let json = try? JSONSerialization.data(withJSONObject: dados),
              let txt = String(data: json, encoding: .utf8) else { return }
        DispatchQueue.main.async {
            self.web?.evaluateJavaScript("window.T && T.micNativo && T.micNativo(\(txt))", completionHandler: nil)
        }
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let corpo = message.body as? [String: Any], let acao = corpo["acao"] as? String else { return }
        switch acao {
        case "gravar": pedirEGravar()
        case "parar": parar(usar: true)
        default: parar(usar: false)
        }
    }

    func pedirEGravar() {
        switch AVCaptureDevice.authorizationStatus(for: .audio) {
        case .authorized:
            gravar()
        case .notDetermined:
            AVCaptureDevice.requestAccess(for: .audio) { ok in
                DispatchQueue.main.async { if ok { self.gravar() } else { self.avisar(["estado": "negado"]) } }
            }
        default:
            avisar(["estado": "negado"])
        }
    }

    func gravar() {
        parar(usar: false)
        try? FileManager.default.removeItem(at: arquivo)
        let ajustes: [String: Any] = [
            AVFormatIDKey: Int(kAudioFormatMPEG4AAC),
            AVSampleRateKey: 16000.0,
            AVNumberOfChannelsKey: 1,
            AVEncoderAudioQualityKey: AVAudioQuality.high.rawValue,
        ]
        do {
            let g = try AVAudioRecorder(url: arquivo, settings: ajustes)
            g.isMeteringEnabled = true
            if !g.record() { avisar(["estado": "erro", "msg": "O gravador do Mac não começou."]); return }
            gravador = g
            registrar("microfone: gravando")
            avisar(["estado": "gravando"])
            medidor = Timer.scheduledTimer(withTimeInterval: 0.12, repeats: true) { [weak self] _ in
                guard let self = self, let g = self.gravador else { return }
                g.updateMeters()
                let db = Double(g.averagePower(forChannel: 0)) // de -160 (silêncio) a 0
                self.avisar(["estado": "nivel", "n": max(0.0, min(1.0, (db + 50.0) / 50.0))])
            }
        } catch {
            registrar("microfone: erro \(error.localizedDescription)")
            avisar(["estado": "erro", "msg": error.localizedDescription])
        }
    }

    func parar(usar: Bool) {
        medidor?.invalidate(); medidor = nil
        guard let g = gravador else { return }
        g.stop(); gravador = nil
        guard usar else { return }
        if let dados = try? Data(contentsOf: arquivo) {
            avisar(["estado": "pronto", "b64": dados.base64EncodedString()])
        } else {
            avisar(["estado": "erro", "msg": "Não consegui ler a gravação."])
        }
        try? FileManager.default.removeItem(at: arquivo)
    }
}

final class Delegado: NSObject, NSApplicationDelegate, NSWindowDelegate, WKNavigationDelegate, WKUIDelegate, WKDownloadDelegate {
    var janela: NSWindow!
    var web: WKWebView!
    var destinos: [ObjectIdentifier: URL] = [:]
    var conferindo = false
    let microfone = Microfone()

    // MARK: - inicialização

    func applicationDidFinishLaunching(_ notification: Notification) {
        registrar("app abriu (versão \((Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String) ?? "?"))")
        montarMenu()

        let conf = WKWebViewConfiguration()
        conf.applicationNameForUserAgent = "BackpackApp/1.0"
        conf.userContentController.add(microfone, name: "backpackMic")
        web = WKWebView(frame: NSRect(x: 0, y: 0, width: 1320, height: 860), configuration: conf)
        microfone.web = web
        web.navigationDelegate = self
        web.uiDelegate = self
        web.allowsBackForwardNavigationGestures = false
        web.autoresizingMask = [.width, .height]

        janela = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 1320, height: 860),
                          styleMask: [.titled, .closable, .miniaturizable, .resizable],
                          backing: .buffered, defer: false)
        janela.title = "Backpack"
        janela.titlebarAppearsTransparent = true
        janela.backgroundColor = NSColor(calibratedRed: 0.62, green: 0.55, blue: 0.48, alpha: 1)
        janela.minSize = NSSize(width: 900, height: 600)
        janela.contentView = web
        janela.delegate = self
        janela.center()
        janela.setFrameAutosaveName("BackpackJanela")
        janela.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)

        mostrarAviso("Abrindo o Backpack…", detalhe: "")
        conferirServidor(tentativa: 0)
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { true }

    func applicationShouldHandleReopen(_ sender: NSApplication, hasVisibleWindows flag: Bool) -> Bool {
        if !flag { janela.makeKeyAndOrderFront(nil) }
        return true
    }

    // MARK: - servidor local

    // espera o servidor responder; se não responder, tenta ligar (serviço do macOS ou node direto)
    func conferirServidor(tentativa: Int) {
        if tentativa == 0 { if conferindo { return }; conferindo = true }
        var req = URLRequest(url: URL(string: "http://127.0.0.1:\(PORTA)/api/ping")!)
        req.timeoutInterval = 1.5
        req.cachePolicy = .reloadIgnoringLocalCacheData
        URLSession.shared.dataTask(with: req) { _, resposta, _ in
            let ok = (resposta as? HTTPURLResponse)?.statusCode == 200
            DispatchQueue.main.async {
                if ok {
                    registrar("servidor respondeu (tentativa \(tentativa)); carregando a página")
                    self.conferindo = false
                    self.web.load(URLRequest(url: ENDERECO))
                    return
                }
                if tentativa == 0 { registrar("servidor não respondeu; tentando ligar"); self.ligarServidor() }
                if tentativa >= 60 {
                    registrar("desisti: servidor não respondeu em 30 s")
                    self.conferindo = false
                    self.mostrarAviso("Não consegui abrir o Backpack.",
                                      detalhe: "Abra o “Instalar Backpack”, na pasta do Backpack, para ligar o servidor de novo.")
                    return
                }
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { self.conferirServidor(tentativa: tentativa + 1) }
            }
        }.resume()
    }

    func ligarServidor() {
        let p = Process()
        p.executableURL = URL(fileURLWithPath: "/bin/launchctl")
        p.arguments = ["kickstart", "gui/\(getuid())/com.backpack.server"]
        p.standardOutput = FileHandle.nullDevice
        p.standardError = FileHandle.nullDevice
        var codigo: Int32 = -1
        do { try p.run(); p.waitUntilExit(); codigo = p.terminationStatus } catch { registrar("launchctl falhou: \(error)") }
        registrar("launchctl kickstart: código \(codigo)")
        if codigo == 0 { return }
        // sem o serviço instalado: roda o servidor direto da pasta do Backpack
        guard let pasta = Bundle.main.object(forInfoDictionaryKey: "BackpackPasta") as? String,
              let node = Bundle.main.object(forInfoDictionaryKey: "BackpackNode") as? String,
              FileManager.default.fileExists(atPath: pasta + "/server.js") else { return }
        let n = Process()
        n.executableURL = URL(fileURLWithPath: node)
        n.arguments = ["server.js"]
        n.currentDirectoryURL = URL(fileURLWithPath: pasta)
        n.standardOutput = FileHandle.nullDevice
        n.standardError = FileHandle.nullDevice
        do { try n.run(); registrar("servidor ligado direto pelo node") } catch { registrar("não consegui rodar o node: \(error)") }
    }

    func mostrarAviso(_ titulo: String, detalhe: String) {
        let html = """
        <!doctype html><meta charset="utf-8"><style>
        html,body{height:100%;margin:0}
        body{display:grid;place-items:center;font:15px -apple-system,system-ui,sans-serif;color:#1c1d21;
          background:radial-gradient(60% 40% at 50% 0%,#f1e6d6,transparent),linear-gradient(180deg,#8a7564,#d8cfc5 55%,#a08c7a)}
        div{padding:28px 36px;border-radius:26px;background:rgba(240,236,231,.6);border:1px solid rgba(255,255,255,.6);
          -webkit-backdrop-filter:blur(20px);text-align:center;max-width:420px;box-shadow:0 20px 60px rgba(40,25,10,.25)}
        b{display:block;font-size:17px;margin-bottom:6px} span{color:#5d6068}
        </style><div><b>\(titulo)</b><span>\(detalhe)</span></div>
        """
        web.loadHTMLString(html, baseURL: nil)
    }

    // MARK: - navegação

    func interno(_ u: URL) -> Bool {
        return (u.host == "127.0.0.1" || u.host == "localhost") && u.port == PORTA
    }

    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction,
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = navigationAction.request.url else { decisionHandler(.allow); return }
        if navigationAction.shouldPerformDownload { decisionHandler(.download); return }
        let esquema = url.scheme ?? ""
        if interno(url) || esquema == "about" || esquema == "data" || esquema == "blob" { decisionHandler(.allow); return }
        // link de fora: abre no navegador padrão
        if esquema == "http" || esquema == "https" || esquema == "mailto" { NSWorkspace.shared.open(url) }
        decisionHandler(.cancel)
    }

    func webView(_ webView: WKWebView, decidePolicyFor navigationResponse: WKNavigationResponse,
                 decisionHandler: @escaping (WKNavigationResponsePolicy) -> Void) {
        if let h = navigationResponse.response as? HTTPURLResponse,
           let cd = h.value(forHTTPHeaderField: "Content-Disposition"),
           cd.lowercased().hasPrefix("attachment") {
            decisionHandler(.download); return
        }
        decisionHandler(navigationResponse.canShowMIMEType ? .allow : .download)
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        // só reage quando o servidor não responde (download e cancelamento também "falham" aqui)
        let e = error as NSError
        registrar("falha ao carregar: \(e.domain) \(e.code) \(e.localizedDescription)")
        let semServidor = [NSURLErrorCannotConnectToHost, NSURLErrorNetworkConnectionLost, NSURLErrorTimedOut]
        guard e.domain == NSURLErrorDomain, semServidor.contains(e.code) else { return }
        mostrarAviso("Reconectando ao Backpack…", detalhe: "")
        conferirServidor(tentativa: 0)
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        if let u = webView.url, interno(u) { registrar("página carregada: \(u.absoluteString)") }
    }

    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        registrar("o processo da página caiu; recarregando")
        webView.reload()
    }

    // MARK: - downloads (vão para a pasta Downloads e aparecem no Finder)

    func webView(_ webView: WKWebView, navigationAction: WKNavigationAction, didBecome download: WKDownload) {
        download.delegate = self
    }

    func webView(_ webView: WKWebView, navigationResponse: WKNavigationResponse, didBecome download: WKDownload) {
        download.delegate = self
    }

    func download(_ download: WKDownload, decideDestinationUsing response: URLResponse, suggestedFilename: String,
                  completionHandler: @escaping (URL?) -> Void) {
        let pasta = FileManager.default.urls(for: .downloadsDirectory, in: .userDomainMask)[0]
        let nome = suggestedFilename.isEmpty ? "arquivo" : suggestedFilename
        let base = (nome as NSString).deletingPathExtension
        let ext = (nome as NSString).pathExtension
        var alvo = pasta.appendingPathComponent(nome)
        var n = 2
        while FileManager.default.fileExists(atPath: alvo.path) {
            alvo = pasta.appendingPathComponent(ext.isEmpty ? "\(base) \(n)" : "\(base) \(n).\(ext)")
            n += 1
        }
        destinos[ObjectIdentifier(download)] = alvo
        completionHandler(alvo)
    }

    func downloadDidFinish(_ download: WKDownload) {
        if let u = destinos.removeValue(forKey: ObjectIdentifier(download)) {
            NSWorkspace.shared.activateFileViewerSelecting([u])
        }
    }

    func download(_ download: WKDownload, didFailWithError error: Error, resumeData: Data?) {
        destinos.removeValue(forKey: ObjectIdentifier(download))
        let a = NSAlert()
        a.messageText = "Não consegui baixar o arquivo"
        a.informativeText = error.localizedDescription
        a.runModal()
    }

    // MARK: - janelas novas, seletor de arquivos e alertas

    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration,
                 for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        // target=_blank e window.open: abre no navegador padrão
        if let u = navigationAction.request.url { NSWorkspace.shared.open(u) }
        return nil
    }

    func webView(_ webView: WKWebView, runOpenPanelWith parameters: WKOpenPanelParameters,
                 initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping ([URL]?) -> Void) {
        let painel = NSOpenPanel()
        painel.allowsMultipleSelection = parameters.allowsMultipleSelection
        painel.canChooseFiles = true
        painel.canChooseDirectories = false
        painel.beginSheetModal(for: janela) { r in completionHandler(r == .OK ? painel.urls : nil) }
    }

    func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String,
                 initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
        let a = NSAlert(); a.messageText = message; a.runModal(); completionHandler()
    }

    func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String,
                 initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
        let a = NSAlert(); a.messageText = message
        a.addButton(withTitle: "OK"); a.addButton(withTitle: "Cancelar")
        completionHandler(a.runModal() == .alertFirstButtonReturn)
    }

    // microfone para a voz (ditar e criar por voz): só para a página do próprio Backpack.
    // O macOS ainda pergunta uma vez (Ajustes → Privacidade e Segurança → Microfone).
    @available(macOS 12.0, *)
    func webView(_ webView: WKWebView, requestMediaCapturePermissionFor origin: WKSecurityOrigin,
                 initiatedByFrame frame: WKFrameInfo, type: WKMediaCaptureType,
                 decisionHandler: @escaping (WKPermissionDecision) -> Void) {
        let local = (origin.host == "127.0.0.1" || origin.host == "localhost") && origin.port == 4322
        decisionHandler(local && type == .microphone ? .grant : .deny)
    }

    // MARK: - menus (sem o menu Editar, copiar e colar não funcionam no Mac)

    @objc func recarregar(_ sender: Any?) { web.reload() }

    func montarMenu() {
        func item(_ t: String, _ s: Selector?, _ k: String, _ m: NSEvent.ModifierFlags = [.command]) -> NSMenuItem {
            let i = NSMenuItem(title: t, action: s, keyEquivalent: k)
            i.keyEquivalentModifierMask = m
            return i
        }
        let barra = NSMenu()

        let app = NSMenu(title: "Backpack")
        app.addItem(item("Sobre o Backpack", #selector(NSApplication.orderFrontStandardAboutPanel(_:)), ""))
        app.addItem(.separator())
        app.addItem(item("Ocultar o Backpack", #selector(NSApplication.hide(_:)), "h"))
        app.addItem(item("Ocultar os outros", #selector(NSApplication.hideOtherApplications(_:)), "h", [.command, .option]))
        app.addItem(item("Mostrar todos", #selector(NSApplication.unhideAllApplications(_:)), ""))
        app.addItem(.separator())
        app.addItem(item("Sair do Backpack", #selector(NSApplication.terminate(_:)), "q"))

        let editar = NSMenu(title: "Editar")
        editar.addItem(item("Desfazer", Selector(("undo:")), "z"))
        editar.addItem(item("Refazer", Selector(("redo:")), "z", [.command, .shift]))
        editar.addItem(.separator())
        editar.addItem(item("Recortar", #selector(NSText.cut(_:)), "x"))
        editar.addItem(item("Copiar", #selector(NSText.copy(_:)), "c"))
        editar.addItem(item("Colar", #selector(NSText.paste(_:)), "v"))
        editar.addItem(item("Selecionar tudo", #selector(NSText.selectAll(_:)), "a"))

        let ver = NSMenu(title: "Visualizar")
        let rec = item("Recarregar", #selector(recarregar(_:)), "r")
        rec.target = self
        ver.addItem(rec)
        ver.addItem(item("Tela cheia", #selector(NSWindow.toggleFullScreen(_:)), "f", [.command, .control]))

        let jan = NSMenu(title: "Janela")
        jan.addItem(item("Minimizar", #selector(NSWindow.performMiniaturize(_:)), "m"))
        jan.addItem(item("Zoom", #selector(NSWindow.performZoom(_:)), ""))
        jan.addItem(item("Fechar", #selector(NSWindow.performClose(_:)), "w"))

        for (titulo, menu) in [("Backpack", app), ("Editar", editar), ("Visualizar", ver), ("Janela", jan)] {
            let i = NSMenuItem(title: titulo, action: nil, keyEquivalent: "")
            i.submenu = menu
            barra.addItem(i)
        }
        NSApp.mainMenu = barra
        NSApp.windowsMenu = jan
    }
}

let aplicativo = NSApplication.shared
let delegado = Delegado()
aplicativo.delegate = delegado
aplicativo.setActivationPolicy(.regular)
aplicativo.run()
