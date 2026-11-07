/* EMPORIUM  |  Copyright (c) 2026 Yannie D. Forest. All rights reserved.
   NO LICENCE IS GRANTED. See LICENCE.txt.
   Emporium's iPhone and iPad shell: taken unchanged in its working from Ingenium 6.0's
   shell (source/shells/ios), filled by GitHub's build (.github/workflows/ios.yml) with
   Emporium's page, instead of by Fabrica on a device. */

import Foundation
import WebKit

/* serves the bundled www folder at the app scheme (carpe-app, the name The Forge
   gives every app it makes: it names where the app keeps your work, so an app
   made by Fabrica keeps the work of the same app made by the Forge).
   Ingenium 6.0: a file in a folder of www (css/room.css, icons/icon-192.png) is
   served from that folder; The Forge's shell looked only at the file's name. */
final class ShellSchemeHandler: NSObject, WKURLSchemeHandler {

    static let www: URL? = Bundle.main.resourceURL?.appendingPathComponent("www", isDirectory: true)

    func webView(_ webView: WKWebView, start urlSchemeTask: WKURLSchemeTask) {
        guard let url = urlSchemeTask.request.url, let root = ShellSchemeHandler.www else {
            urlSchemeTask.didFailWithError(URLError(.badURL))
            return
        }
        let parts = url.path.split(separator: "/").map { String($0).removingPercentEncoding ?? String($0) }
        if parts.isEmpty || parts.contains("..") {
            urlSchemeTask.didFailWithError(URLError(.fileDoesNotExist))
            return
        }
        var fileURL = root
        for p in parts { fileURL.appendPathComponent(p) }
        guard let data = try? Data(contentsOf: fileURL) else {
            let missing = HTTPURLResponse(url: url, statusCode: 404, httpVersion: "HTTP/1.1", headerFields: ["Content-Type": "text/plain"])!
            urlSchemeTask.didReceive(missing)
            urlSchemeTask.didReceive(Data())
            urlSchemeTask.didFinish()
            return
        }
        let ext = fileURL.pathExtension
        let response = HTTPURLResponse(url: url, statusCode: 200, httpVersion: "HTTP/1.1",
                                       headerFields: ["Content-Type": Self.mimeType(for: ext),
                                                      "Content-Length": String(data.count),
                                                      "Cache-Control": "no-cache"])!
        urlSchemeTask.didReceive(response)
        urlSchemeTask.didReceive(data)
        urlSchemeTask.didFinish()
    }

    func webView(_ webView: WKWebView, stop urlSchemeTask: WKURLSchemeTask) {}

    static func mimeType(for ext: String) -> String {
        switch ext.lowercased() {
        case "html", "htm": return "text/html; charset=utf-8"
        case "css":         return "text/css; charset=utf-8"
        case "js", "mjs":   return "text/javascript; charset=utf-8"
        case "json", "webmanifest", "map": return "application/json"
        case "png":         return "image/png"
        case "jpg", "jpeg": return "image/jpeg"
        case "gif":         return "image/gif"
        case "webp":        return "image/webp"
        case "svg":         return "image/svg+xml"
        case "ico":         return "image/x-icon"
        case "woff":        return "font/woff"
        case "woff2":       return "font/woff2"
        case "ttf":         return "font/ttf"
        case "otf":         return "font/otf"
        case "wasm":        return "application/wasm"
        case "mp3":         return "audio/mpeg"
        case "m4a":         return "audio/mp4"
        case "wav":         return "audio/wav"
        case "mp4":         return "video/mp4"
        case "webm":        return "video/webm"
        case "txt", "md":   return "text/plain; charset=utf-8"
        case "pdf":         return "application/pdf"
        default:            return "application/octet-stream"
        }
    }
}
