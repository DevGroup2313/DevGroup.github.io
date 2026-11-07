/*
   EMPORIUM  |  Copyright (c) 2026 Yannie D. Forest. All rights reserved.
   NO LICENCE IS GRANTED. See LICENCE.txt.
   Emporium's Fire tablet shell: Ingenium 6.0's Android shell (source/shells/android), with its
   package renamed, built by GitHub (.github/workflows/fire.yml) with Emporium's page in assets/.
*/
/*
   INGENIUM  |  Copyright (c) 2026 Yannie D. Forest. All rights reserved.
   NO LICENCE IS GRANTED. See LICENCE.txt.

   THE ANDROID SHELL THAT FABRICA FILLS (Ingenium 6.0).
   One compiled activity serves every app Fabrica ships as an APK: Fabrica
   writes the app's own page into assets/, names it in assets/shell.json, writes
   the manifest (the app's id, name, version and icon) and signs the package on
   the device. Nothing here is particular to one app, so this file is compiled
   once (build_dex.sh) and the same classes.dex rides inside Ingenium's page.

   Taken from the Forge's Fire shell (forge-fire, MainActivity.java), which has
   run on the owner's Fire tablet, with three changes:
   - SAVING, ONE AT A TIME. The Forge kept a single pending file: five saves
     asked for at once each overwrote the one before while Android stacked five
     Save dialogs, so names and contents crossed. Here each save waits in a
     queue and the next dialog opens only when the one before has closed.
   - The page is served from assets/ at https://appassets.androidplatform.net,
     the Forge's own address (so an app made here keeps the work of an app made
     by the Forge or GitHub), by this file alone, without androidx.
   - Which page, which colour and which bridges come from assets/shell.json.
*/
package app.emporium.shell;

import android.Manifest;
import android.app.Activity;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.Base64;
import android.util.Log;
import android.view.Window;
import android.webkit.ConsoleMessage;
import android.webkit.DownloadListener;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

public class ShellActivity extends Activity {
    static final String HOST = "appassets.androidplatform.net";
    static final String PREFIX = "/assets/";
    static final String TAG = "EmporiumShell";

    private WebView web;
    private String page = "index.html";
    private int background = Color.WHITE;
    private final ArrayList<String> bridges = new ArrayList<String>();

    private ValueCallback<Uri[]> filePathCallback;
    private static final int FILE_CHOOSER_REQUEST = 4711;
    private static final int SAVE_FILE_REQUEST = 4712;
    private static final int MIC_REQUEST = 4713;
    private PermissionRequest pendingMic;

    /* the saves waiting their turn: {name, mime, base64}; the first one is the one whose dialog is open */
    private final ArrayList<String[]> saves = new ArrayList<String[]>();
    private boolean saveOpen = false;

    private static final long CLIPBOARD_WAIT_MS = 1000;
    private boolean pageTest = false;
    private boolean pageTestSent = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        readConfig();
        pageTest = getIntent() != null && getIntent().getBooleanExtra("emporium_pagetest", false);
        try {
            Window w = getWindow();
            if (Build.VERSION.SDK_INT >= 21) w.setStatusBarColor(background);
        } catch (Throwable ignored) {
        }

        web = new WebView(this);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(false);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setTextZoom(100);
        web.setBackgroundColor(background);

        // only the app's own page, served from inside the package, can reach these
        ShellBridge bridge = new ShellBridge();
        for (int i = 0; i < bridges.size(); i++) web.addJavascriptInterface(bridge, bridges.get(i));

        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(new Runnable() {
                    @Override public void run() {
                        boolean wantsMic = false;
                        for (String r : request.getResources()) {
                            if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(r)) wantsMic = true;
                        }
                        if (wantsMic && Build.VERSION.SDK_INT >= 23
                                && checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
                            if (pendingMic != null) { try { pendingMic.deny(); } catch (Exception e) { } }
                            pendingMic = request;
                            requestPermissions(new String[]{ Manifest.permission.RECORD_AUDIO }, MIC_REQUEST);
                            return;
                        }
                        request.grant(request.getResources());
                    }
                });
            }

            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (filePathCallback != null) filePathCallback.onReceiveValue(null);
                filePathCallback = callback;
                try {
                    Intent intent = params.createIntent();
                    intent.addCategory(Intent.CATEGORY_OPENABLE);
                    startActivityForResult(intent, FILE_CHOOSER_REQUEST);
                } catch (Exception e) {
                    filePathCallback = null;
                    return false;
                }
                return true;
            }

            @Override
            public boolean onConsoleMessage(ConsoleMessage m) {
                String line = m.message();
                if (line != null && line.startsWith("INGENIUM_SELFTEST")) Log.i("IngeniumPage", line);
                else Log.i(TAG, m.messageLevel() + " " + line + " (" + m.lineNumber() + ")");
                return true;
            }
        });

        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri u = request.getUrl();
                if (u == null || !HOST.equals(u.getHost())) return null;
                return asset(u.getPath());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri u = request.getUrl();
                if (u == null) return false;
                if (HOST.equals(u.getHost())) return false;
                String scheme = u.getScheme() == null ? "" : u.getScheme().toLowerCase();
                if (scheme.equals("http") || scheme.equals("https") || scheme.equals("mailto") || scheme.equals("tel")) {
                    // other sites open in the device's browser, never inside the app
                    try { startActivity(new Intent(Intent.ACTION_VIEW, u)); } catch (Exception ignored) { }
                    return true;
                }
                return false;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                if (pageTest && !pageTestSent) {
                    pageTestSent = true;
                    new Handler(Looper.getMainLooper()).postDelayed(new Runnable() {
                        @Override public void run() { web.evaluateJavascript(PAGE_TEST_JS, null); }
                    }, 6000);
                }
            }
        });

        // an <a download> of a blob or data address: its bytes are read in the page and saved here
        web.setDownloadListener(new DownloadListener() {
            @Override
            public void onDownloadStart(String url, String userAgent, String disposition, String mime, long length) {
                if (url == null) return;
                String name = guessName(disposition, url, mime);
                if (url.startsWith("data:")) {
                    int comma = url.indexOf(',');
                    if (comma < 0) return;
                    String head = url.substring(5, comma);
                    String body = url.substring(comma + 1);
                    String b64;
                    if (head.endsWith(";base64")) b64 = body;
                    else {
                        try { b64 = Base64.encodeToString(Uri.decode(body).getBytes("UTF-8"), Base64.NO_WRAP); }
                        catch (Exception e) { return; }
                    }
                    queueSave(name, mime, b64);
                } else if (url.startsWith("blob:")) {
                    String js = "(function(){fetch(" + JSONObject.quote(url) + ").then(function(r){return r.blob();}).then(function(b){"
                        + "var f=new FileReader();f.onload=function(){var s=String(f.result);var i=s.indexOf(',');"
                        + "window." + firstBridge() + ".saveFile(" + JSONObject.quote(name) + "," + JSONObject.quote(mime == null ? "" : mime)
                        + ",s.slice(i+1));};f.readAsDataURL(b);});})();";
                    web.evaluateJavascript(js, null);
                } else {
                    try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url))); } catch (Exception ignored) { }
                }
            }
        });

        web.loadUrl("https://" + HOST + PREFIX + page);
        setContentView(web);
    }

    /* ------------------------------------------------------------ the page */

    private void readConfig() {
        bridges.add("ShellNative");
        try {
            InputStream in = getAssets().open("shell.json");
            JSONObject o = new JSONObject(new String(readAll(in), "UTF-8"));
            in.close();
            page = o.optString("page", page);
            String bg = o.optString("background", "");
            if (bg.length() > 0) { try { background = Color.parseColor(bg); } catch (Exception ignored) { } }
            JSONArray b = o.optJSONArray("bridges");
            if (b != null) {
                for (int i = 0; i < b.length(); i++) {
                    String n = b.optString(i, "");
                    if (n.matches("[A-Za-z_][A-Za-z0-9_]*") && !bridges.contains(n)) bridges.add(n);
                }
            }
        } catch (Exception e) {
            Log.w(TAG, "shell.json: " + e);
        }
    }

    private String firstBridge() {
        return bridges.get(0);
    }

    private WebResourceResponse asset(String path) {
        if (path == null || !path.startsWith(PREFIX)) return notFound();
        String rel = Uri.decode(path.substring(PREFIX.length()));
        if (rel.length() == 0 || rel.contains("..")) return notFound();
        try {
            InputStream in = getAssets().open(rel);
            String mime = mimeOf(rel);
            Map<String, String> headers = new HashMap<String, String>();
            headers.put("Cache-Control", "no-cache");
            boolean text = mime.startsWith("text/") || mime.endsWith("json") || mime.endsWith("javascript") || mime.endsWith("xml");
            return new WebResourceResponse(mime, text ? "utf-8" : null, 200, "OK", headers, in);
        } catch (Exception e) {
            return notFound();
        }
    }

    private static WebResourceResponse notFound() {
        return new WebResourceResponse("text/plain", "utf-8", 404, "Not Found",
                new HashMap<String, String>(), new ByteArrayInputStream(new byte[0]));
    }

    static String mimeOf(String name) {
        String n = name.toLowerCase();
        int dot = n.lastIndexOf('.');
        String ext = dot < 0 ? "" : n.substring(dot + 1);
        if (ext.equals("html") || ext.equals("htm")) return "text/html";
        if (ext.equals("js") || ext.equals("mjs")) return "text/javascript";
        if (ext.equals("css")) return "text/css";
        if (ext.equals("json") || ext.equals("webmanifest") || ext.equals("map")) return "application/json";
        if (ext.equals("svg")) return "image/svg+xml";
        if (ext.equals("png")) return "image/png";
        if (ext.equals("jpg") || ext.equals("jpeg")) return "image/jpeg";
        if (ext.equals("gif")) return "image/gif";
        if (ext.equals("webp")) return "image/webp";
        if (ext.equals("avif")) return "image/avif";
        if (ext.equals("ico")) return "image/x-icon";
        if (ext.equals("woff")) return "font/woff";
        if (ext.equals("woff2")) return "font/woff2";
        if (ext.equals("ttf")) return "font/ttf";
        if (ext.equals("otf")) return "font/otf";
        if (ext.equals("wasm")) return "application/wasm";
        if (ext.equals("mp3")) return "audio/mpeg";
        if (ext.equals("wav")) return "audio/wav";
        if (ext.equals("ogg")) return "audio/ogg";
        if (ext.equals("m4a")) return "audio/mp4";
        if (ext.equals("mp4")) return "video/mp4";
        if (ext.equals("webm")) return "video/webm";
        if (ext.equals("txt") || ext.equals("md")) return "text/plain";
        if (ext.equals("xml")) return "application/xml";
        if (ext.equals("pdf")) return "application/pdf";
        return "application/octet-stream";
    }

    static byte[] readAll(InputStream in) throws java.io.IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        byte[] buf = new byte[65536];
        int n;
        while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
        return out.toByteArray();
    }

    static String guessName(String disposition, String url, String mime) {
        if (disposition != null) {
            java.util.regex.Matcher m = java.util.regex.Pattern.compile("filename\\*?=(?:UTF-8'')?\"?([^\";]+)\"?").matcher(disposition);
            if (m.find()) return Uri.decode(m.group(1));
        }
        String ext = "bin";
        if (mime != null) {
            if (mime.contains("html")) ext = "html";
            else if (mime.contains("zip")) ext = "zip";
            else if (mime.contains("json")) ext = "json";
            else if (mime.contains("pdf")) ext = "pdf";
            else if (mime.startsWith("text/")) ext = "txt";
            else if (mime.contains("png")) ext = "png";
        }
        return "download." + ext;
    }

    /* the page's report in the cloud build's emulator check */
    static final String PAGE_TEST_JS =
        "(function(){var b=document.body,e=window.__shellErrors||[];"
        + "var r={title:document.title,text:((b&&b.innerText)||'').length,errors:e.length,"
        + "storage:(function(){try{localStorage.setItem('__s','1');var ok=localStorage.getItem('__s')==='1';localStorage.removeItem('__s');return ok;}catch(x){return false;}})(),"
        + "bridge:!!(window.ShellNative&&window.ShellNative.saveFile)};"
        + "console.log('INGENIUM_SELFTEST PAGE '+JSON.stringify(r));})();";

    /* ----------------------------------------------------------- saving */

    private void queueSave(String name, String mime, String b64) {
        synchronized (saves) {
            saves.add(new String[]{ name == null || name.length() == 0 ? "download" : name,
                    mime == null || mime.length() == 0 ? "application/octet-stream" : mime, b64 });
        }
        runOnUiThread(new Runnable() { @Override public void run() { nextSave(); } });
    }

    /* on the UI thread: opens the Save dialog for the first file waiting, if none is open */
    private void nextSave() {
        String[] s;
        synchronized (saves) {
            if (saveOpen || saves.isEmpty()) return;
            saveOpen = true;
            s = saves.get(0);
        }
        try {
            Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
            intent.addCategory(Intent.CATEGORY_OPENABLE);
            intent.setType(s[1]);
            intent.putExtra(Intent.EXTRA_TITLE, s[0]);
            startActivityForResult(intent, SAVE_FILE_REQUEST);
        } catch (Exception e) {
            synchronized (saves) { saves.remove(0); saveOpen = false; }
            nextSave();
        }
    }

    public class ShellBridge {
        /* window.<bridge>.saveFile(name, mime, base64): true when the Save dialog will open (now or after the ones before it) */
        @JavascriptInterface
        public boolean saveFile(String name, String mime, String b64) {
            if (b64 == null) return false;
            queueSave(name, mime, b64);
            return true;
        }

        @JavascriptInterface
        public String readClipboard() {
            final String[] answer = new String[1];
            if (!onUiThread(new Runnable() { @Override public void run() { answer[0] = readClipboardNow(); } })) return null;
            return answer[0];
        }

        @JavascriptInterface
        public boolean writeClipboard(final String text, final String html) {
            final boolean[] answer = new boolean[1];
            if (!onUiThread(new Runnable() { @Override public void run() { answer[0] = writeClipboardNow(text, html); } })) return false;
            return answer[0];
        }

        @JavascriptInterface
        public boolean writeClipboard(String text) {
            return writeClipboard(text, null);
        }

        /* Carpe Diem 1048's names for the same two */
        @JavascriptInterface
        public String clipboardRead() {
            String j = readClipboard();
            if (j == null) return null;
            try { return new JSONObject(j).optString("text", ""); } catch (JSONException e) { return null; }
        }

        @JavascriptInterface
        public boolean clipboardWrite(String text) {
            return writeClipboard(text, null);
        }
    }

    private boolean onUiThread(final Runnable work) {
        final CountDownLatch done = new CountDownLatch(1);
        runOnUiThread(new Runnable() {
            @Override public void run() {
                try { work.run(); } catch (Throwable ignored) { } finally { done.countDown(); }
            }
        });
        try {
            return done.await(CLIPBOARD_WAIT_MS, TimeUnit.MILLISECONDS);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return false;
        }
    }

    private String readClipboardNow() {
        if (Build.VERSION.SDK_INT >= 29 && !hasWindowFocus()) return null;
        ClipboardManager board = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
        if (board == null) return null;
        StringBuilder text = new StringBuilder();
        String html = "";
        ClipData clip = board.getPrimaryClip();
        if (clip != null) {
            int count = clip.getItemCount();
            for (int i = 0; i < count; i++) {
                ClipData.Item item = clip.getItemAt(i);
                CharSequence t = item.coerceToText(this);
                if (t != null && t.length() > 0) {
                    if (text.length() > 0) text.append('\n');
                    text.append(t);
                }
                if (count == 1 && item.getHtmlText() != null) html = item.getHtmlText();
            }
        }
        try {
            JSONObject answer = new JSONObject();
            answer.put("text", text.toString());
            answer.put("html", html);
            return answer.toString();
        } catch (JSONException e) {
            return null;
        }
    }

    private boolean writeClipboardNow(String text, String html) {
        ClipboardManager board = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
        if (board == null) return false;
        String t = text == null ? "" : text;
        boolean rich = html != null && html.length() > 0 && !"undefined".equals(html);
        board.setPrimaryClip(rich ? ClipData.newHtmlText("app", t, html) : ClipData.newPlainText("app", t));
        return true;
    }

    /* ------------------------------------------------- answers from Android */

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == FILE_CHOOSER_REQUEST) {
            if (filePathCallback != null) {
                filePathCallback.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(resultCode, data));
                filePathCallback = null;
            }
            return;
        }
        if (requestCode == SAVE_FILE_REQUEST) {
            String[] s = null;
            synchronized (saves) { if (!saves.isEmpty()) s = saves.remove(0); saveOpen = false; }
            OutputStream os = null;
            try {
                if (s != null && resultCode == RESULT_OK && data != null && data.getData() != null) {
                    byte[] bytes = Base64.decode(s[2], Base64.DEFAULT);
                    os = getContentResolver().openOutputStream(data.getData());
                    if (os != null) { os.write(bytes); os.flush(); }
                }
            } catch (Exception e) {
                Log.w(TAG, "save: " + e);
            } finally {
                try { if (os != null) os.close(); } catch (Exception e) { }
            }
            nextSave();
            return;
        }
        super.onActivityResult(requestCode, resultCode, data);
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        if (requestCode == MIC_REQUEST) {
            PermissionRequest req = pendingMic;
            pendingMic = null;
            if (req == null) return;
            boolean ok = grantResults != null && grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED;
            try { if (ok) req.grant(req.getResources()); else req.deny(); } catch (Exception e) { }
            return;
        }
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
    }

    @Override
    public void onBackPressed() {
        if (web != null && web.canGoBack()) web.goBack(); else super.onBackPressed();
    }
}
