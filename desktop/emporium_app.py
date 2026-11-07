#!/usr/bin/env python3
# EMPORIUM  |  Copyright (c) 2026 Yannie D. Forest. All rights reserved.
# NO LICENCE IS GRANTED. See LICENCE.txt.
"""
Emporium: the desktop program for Windows and Mac.

A thin window around the app. Everything Emporium does lives in the one page,
Emporium.html; this program only opens that page in a window of its own, with
the system's own web view (Microsoft Edge WebView2 on Windows, WebKit on Mac).
Nothing is sent anywhere: the page runs offline, and its sealed books stay in
the web view's storage in the person's own profile.

Made after the Forge's Windows program (the_forge_app.py, build 9s80), which
has been proven on GitHub's computers and on real PCs. Kept from it: one copy
at a time, a log beside the books, the start measured, a clean close
recorded, safe graphics after a bad ending, and the browser as a last resort.
Left out: the Forge's second windows and its JavaScript bridge (see "saving
files" below).
"""

import os
import re
import sys
import threading
import time

_START = time.perf_counter()
_START_WALL = time.time()

WINDOW_TITLE = "Emporium"
APP_FILE = "Emporium.html"
DATA_FOLDER = "Emporium"            # %LOCALAPPDATA%\Emporium on Windows
DEFAULT_WIDTH = 1280
DEFAULT_HEIGHT = 820
MIN_WIDTH = 380
MIN_HEIGHT = 560
DAY_COLOUR = "#F3F2F8"               # the page's own background by day
SINGLE_INSTANCE_NAME = "Local\\Emporium.windows.single"
READY_LIMIT_S = 120
READY_POLL_S = 0.25


def tell_user(text, title="Emporium"):
    """A message the person will see: a native box on Windows (the program has
    no console), the terminal elsewhere."""
    try:
        sys.stderr.write(text if text.endswith("\n") else text + "\n")
    except Exception:
        pass
    if sys.platform.startswith("win"):
        try:
            import ctypes
            ctypes.windll.user32.MessageBoxW(0, str(text), str(title), 0x40)
        except Exception:
            pass


def open_in_browser(app_html):
    """Last resort: the page is the whole app, so the browser can open it."""
    try:
        import webbrowser
        from pathlib import Path
        webbrowser.open(Path(app_html).as_uri())
        return True
    except Exception:
        return False


def resource_path(filename):
    base = getattr(sys, "_MEIPASS", None) or os.path.dirname(os.path.abspath(__file__))
    return os.path.join(base, filename)


def find_app_html():
    here = os.path.dirname(os.path.abspath(__file__))
    try:
        here_exe = os.path.dirname(os.path.abspath(sys.executable))
    except Exception:
        here_exe = here
    for path in (resource_path(APP_FILE), os.path.join(here, APP_FILE),
                 os.path.join(here, "..", "app", APP_FILE), os.path.join(here_exe, APP_FILE)):
        if path and os.path.isfile(path):
            return os.path.abspath(path)
    return None


def data_root():
    """The folder that holds the books and the log, in the person's own profile."""
    home = os.path.expanduser("~")
    if sys.platform.startswith("win"):
        base = os.environ.get("LOCALAPPDATA") or os.path.join(home, "AppData", "Local")
    elif sys.platform == "darwin":
        base = os.path.join(home, "Library", "Application Support")
    else:
        base = os.environ.get("XDG_DATA_HOME") or os.path.join(home, ".local", "share")
    return os.path.join(base, DATA_FOLDER)


def storage_dir():
    """The web view's own storage, where the sealed books live.

    pywebview runs in private mode by default, which forgets everything when
    the window closes; private_mode=False with this folder keeps the books.
    """
    path = os.path.join(data_root(), "storage")
    try:
        os.makedirs(path, exist_ok=True)
        return path
    except Exception:
        log_problem("storage_dir: could not create %r" % path)
        return None


def log_path():
    d = data_root()
    try:
        os.makedirs(d, exist_ok=True)
        return os.path.join(d, "emporium.log")
    except Exception:
        return os.path.join(os.path.expanduser("~"), "emporium.log")


def log_problem(tag, exc_info=None):
    import datetime
    import traceback
    try:
        with open(log_path(), "a", encoding="utf-8") as fh:
            fh.write("\n=== %s  %s ===\n" % (datetime.datetime.now().isoformat(timespec="seconds"), tag))
            if exc_info:
                traceback.print_exception(exc_info[0], exc_info[1], exc_info[2], file=fh)
            else:
                traceback.print_exc(file=fh)
    except Exception:
        pass


def log_note(tag):
    import datetime
    try:
        with open(log_path(), "a", encoding="utf-8") as fh:
            fh.write("\n=== %s  %s ===\n" % (datetime.datetime.now().isoformat(timespec="seconds"), tag))
    except Exception:
        pass


def _seconds():
    return time.perf_counter() - _START


# ---------------------------------------------------------------- saving files
# Emporium's page forbids code made from text (its Content Security Policy has
# no 'unsafe-eval'). pywebview builds its JavaScript bridge with new Function
# and reads values back with eval, so the bridge is not offered at all: no
# js_api. The page then saves a file the way it does in a browser, as a
# download, and pywebview answers every download with the Windows "Save as"
# dialog (ALLOW_DOWNLOADS, set in main). The page is never weakened for this.


# ---------------------------------------------------------------- a clean ending
def _session_flag():
    d = storage_dir() or os.path.expanduser("~")
    return os.path.join(d, "emporium_session.flag")


def _begin_session():
    """Mark that a run began; return how many earlier runs never ended cleanly.

    A crash inside the web view's graphics takes the whole program with it,
    with nothing for Python to catch. The mark left behind is how the next
    start knows, and switches safe graphics on for that computer.
    """
    prior = 0
    path = _session_flag()
    try:
        if os.path.isfile(path):
            with open(path, "r", encoding="utf-8") as fh:
                prior = int((fh.read() or "0").strip() or "0") or 1
    except Exception:
        prior = 1
    try:
        with open(path, "w", encoding="utf-8") as fh:
            fh.write(str(prior + 1))
    except Exception:
        log_problem("could not write the session mark")
    return prior


def _end_session():
    try:
        os.remove(_session_flag())
    except Exception:
        pass


def _closing_is_clean():
    """The window is closing on purpose (its close button, Alt+F4, a shutdown)."""
    _end_session()


_loaded_once = []
_shown_once = []


def _page_loaded():
    if not _loaded_once:
        _loaded_once.append(1)
        log_note("start: the page has loaded after %.1f s" % _seconds())


def _window_shown():
    if not _shown_once:
        _shown_once.append(1)
        log_note("start: window shown after %.1f s" % _seconds())


# Asked of the page until it is ready: how far it has loaded, whether its door
# or its rooms are drawn (a door with buttons, or the shell), its background
# colour, and the build it says it is.
_READY_JS = (
    "(function(){var d=document,a=d.getElementById('app'),bg='',b='';"
    "try{bg=getComputedStyle(d.body).backgroundColor;}catch(e){}"
    "try{var m=d.querySelector('meta[name=\"emporium-build\"]');b=m?m.getAttribute('content'):'';}catch(e){}"
    "return [d.readyState,a?a.childElementCount:0,!!d.querySelector('.door button, .shell'),bg,b];})()"
)

_RGB_RE = re.compile(r"rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)")
_HEX_RE = re.compile(r"^#[0-9A-Fa-f]{6}$")


def _colour_file():
    d = storage_dir()
    return os.path.join(d, "emporium_window_colour.txt") if d else None


def _remembered_colour():
    try:
        path = _colour_file()
        if path and os.path.isfile(path):
            with open(path, "r", encoding="utf-8") as fh:
                c = fh.read().strip()
            if _HEX_RE.match(c):
                return c.upper()
    except Exception:
        pass
    return DAY_COLOUR


def _remember_colour(css):
    """Keep the page's background colour, so the next window opens in it."""
    try:
        m = _RGB_RE.search(str(css or ""))
        if not m:
            return
        c = "#%02X%02X%02X" % tuple(int(x) for x in m.groups())
        path = _colour_file()
        if path and c != _remembered_colour():
            with open(path, "w", encoding="utf-8") as fh:
                fh.write(c + "\n")
    except Exception:
        pass


def _watch_start(window):
    """Write down how long the page took to be ready (its door or its rooms
    drawn). Runs on its own thread and only ever asks the page that question."""
    try:
        limit = time.perf_counter() + READY_LIMIT_S
        last = None
        while time.perf_counter() < limit:
            try:
                if window.events.closing.is_set():
                    log_note("start: the window was closed before the page was ready (%.1f s)" % _seconds())
                    return
            except Exception:
                pass
            state = None
            try:
                if window.events.loaded.is_set():
                    # run_js, not evaluate_js: evaluate_js wraps the script in
                    # eval, which the page's security policy refuses.
                    state = window.run_js(_READY_JS)
            except Exception:
                state = None
            if isinstance(state, (list, tuple)) and len(state) >= 5:
                last = state
                if state[0] == "complete" and state[2]:
                    log_note("start: page ready in %.1f s (the door or the rooms are drawn)" % _seconds())
                    _remember_colour(state[3])
                    return
            time.sleep(READY_POLL_S)
        log_note("start: page NOT ready after %d s (last answer: %r)" % (READY_LIMIT_S, last))
    except Exception as exc:
        log_note("start: the ready watch stopped (%s)" % (exc,))


# ---------------------------------------------------------------- one copy at a time
_single_instance = []


def _another_copy_is_open():
    """True when Emporium is already open in this sign-in. Its window is then
    brought forward and this copy ends. A named mutex (CreateMutexW) tells; it
    disappears with the process that holds it, so a crash never leaves it."""
    if not sys.platform.startswith("win"):
        return False
    try:
        import ctypes
        from ctypes import wintypes
        kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
        kernel32.CreateMutexW.argtypes = (ctypes.c_void_p, wintypes.BOOL, wintypes.LPCWSTR)
        kernel32.CreateMutexW.restype = wintypes.HANDLE
        handle = kernel32.CreateMutexW(None, False, SINGLE_INSTANCE_NAME)
        err = ctypes.get_last_error()
        if not handle:
            log_note("single copy: no guard on this PC (error %d); opening as usual" % err)
            return False
        if err == 183:   # ERROR_ALREADY_EXISTS
            try:
                kernel32.CloseHandle.argtypes = (wintypes.HANDLE,)
                kernel32.CloseHandle(handle)
            except Exception:
                pass
        else:
            _single_instance.append(handle)
            return False
    except Exception as exc:
        log_note("single copy: no guard on this PC (%s); opening as usual" % (exc,))
        return False
    try:
        if _bring_window_forward():
            log_note("start: already open; brought its window forward")
        else:
            log_note("start: already open, but its window has not appeared yet")
            tell_user("Emporium is still opening.\n\nIts window will appear in a moment.")
    except Exception as exc:
        log_note("start: already open; its window could not be brought forward (%s)" % (exc,))
    return True


def _bring_window_forward(wait_s=30.0):
    import ctypes
    from ctypes import wintypes
    user32 = ctypes.WinDLL("user32", use_last_error=True)
    user32.FindWindowExW.argtypes = (wintypes.HWND, wintypes.HWND, wintypes.LPCWSTR, wintypes.LPCWSTR)
    user32.FindWindowExW.restype = wintypes.HWND
    user32.GetClassNameW.argtypes = (wintypes.HWND, wintypes.LPWSTR, ctypes.c_int)
    user32.GetClassNameW.restype = ctypes.c_int
    user32.IsIconic.argtypes = (wintypes.HWND,)
    user32.IsIconic.restype = wintypes.BOOL
    user32.ShowWindow.argtypes = (wintypes.HWND, ctypes.c_int)
    user32.ShowWindow.restype = wintypes.BOOL
    user32.SetForegroundWindow.argtypes = (wintypes.HWND,)
    user32.SetForegroundWindow.restype = wintypes.BOOL

    def find():
        after = None
        for _ in range(64):
            hwnd = user32.FindWindowExW(None, after, None, WINDOW_TITLE)
            if not hwnd:
                return None
            name = ctypes.create_unicode_buffer(256)
            user32.GetClassNameW(hwnd, name, 256)
            if name.value.startswith("WindowsForms") or name.value == "#32770":
                return hwnd
            after = hwnd
        return None

    end = time.monotonic() + wait_s
    hwnd = find()
    while not hwnd and time.monotonic() < end:
        time.sleep(0.25)
        hwnd = find()
    if not hwnd:
        return False
    user32.ShowWindow(hwnd, 9 if user32.IsIconic(hwnd) else 5)   # SW_RESTORE or SW_SHOW
    user32.SetForegroundWindow(hwnd)
    return True


# ---------------------------------------------------------------- Windows graphics
WEBVIEW2_CLIENT_KEY = r"Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}"
SAFE_GRAPHICS_ARGS = "--disable-gpu-compositing --disable-features=CalculateNativeWinOcclusion"


def _webview2_runtime():
    """Where the Edge WebView2 Runtime was found, or "" when it was not
    (Microsoft's documented registry test, then Program Files)."""
    try:
        import winreg
        for root, kind, sub in (
                (winreg.HKEY_LOCAL_MACHINE, "per machine", "SOFTWARE\\WOW6432Node\\" + WEBVIEW2_CLIENT_KEY),
                (winreg.HKEY_CURRENT_USER, "per user", "Software\\" + WEBVIEW2_CLIENT_KEY)):
            try:
                with winreg.OpenKey(root, sub) as key:
                    pv = str(winreg.QueryValueEx(key, "pv")[0] or "").strip()
            except FileNotFoundError:
                continue
            if pv and pv != "0.0.0.0":
                return "version %s (registry, %s)" % (pv, kind)
    except Exception as exc:
        return "assumed present (the registry could not be read: %s)" % (exc,)
    try:
        import glob as _glob
        for _p in (os.environ.get("ProgramFiles(x86)"), os.environ.get("ProgramFiles"),
                   r"C:\Program Files (x86)", r"C:\Program Files"):
            if _p:
                hits = _glob.glob(os.path.join(_p, "Microsoft", "EdgeWebView", "Application", "*", "msedgewebview2.exe"))
                if hits:
                    return "found under Program Files (%s)" % hits[0]
    except Exception as exc:
        return "assumed present (%s)" % (exc,)
    return ""


def _safe_graphics_file():
    d = storage_dir() or os.path.expanduser("~")
    return os.path.join(d, "emporium_safe_graphics.txt")


def _prepare_windows_graphics(prior_failures):
    """Full graphics by default. After a run that did not end cleanly, safe
    graphics (no compositing on the graphics chip) are switched on for this
    PC and remembered in a small note; deleting the note tries full graphics
    again. These arguments must be set before the web view is made."""
    if not sys.platform.startswith("win"):
        return
    existing = os.environ.get("WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS", "").strip()
    path = _safe_graphics_file()
    remembered = os.path.isfile(path)
    if not remembered and prior_failures < 1:
        log_note("graphics: full (the graphics chip helps draw the window)")
        return
    if not remembered:
        try:
            with open(path, "w", encoding="utf-8") as fh:
                fh.write("Safe graphics are on for Emporium on this PC, because a run did not end\n"
                         "cleanly. The window is drawn without the graphics chip's help.\n\n"
                         "To try full graphics again: close Emporium, delete this file, and open\n"
                         "Emporium. If its window ever closes by itself again, safe graphics\n"
                         "switch back on by themselves.\n")
        except Exception as exc:
            log_note("graphics: safe graphics could not be remembered (%s)" % (exc,))
    args = (existing + " " + SAFE_GRAPHICS_ARGS).strip()
    os.environ["WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS"] = args
    log_note("graphics: safe, after a run that did not end cleanly (%s); delete %s to try full graphics" % (args, path))


# ---------------------------------------------------------------- the window
def main():
    if _another_copy_is_open():
        return

    app_html = find_app_html()
    if not app_html:
        tell_user("Emporium could not find its page, Emporium.html.\n\n"
                  "Install Emporium again with its installer from the Releases page.")
        sys.exit(1)

    prior = _begin_session()
    _prepare_windows_graphics(prior)
    log_note("start: locating the window component")
    try:
        import webview
    except BaseException:
        log_problem("import webview failed", sys.exc_info())
        if open_in_browser(app_html):
            _end_session()
            tell_user("Emporium has opened in your browser, because the part that draws its own\n"
                      "window would not start on this computer. Everything works the same there,\n"
                      "offline. Details are in:\n  %s" % log_path())
            return
        tell_user("Emporium could not open. Details are in:\n  %s" % log_path())
        sys.exit(1)

    try:
        webview.settings["ALLOW_DOWNLOADS"] = True
    except Exception:
        pass

    try:
        import platform
        log_note("start: python %s on %s %s | pywebview %s | page %s" % (
            platform.python_version(), platform.system(), platform.release(),
            getattr(webview, "__version__", "unknown"), app_html))
    except Exception:
        pass

    if sys.platform.startswith("win"):
        rt = ""
        try:
            rt = _webview2_runtime()
        except Exception:
            rt = "assumed present"
        if not rt:
            log_note("webview2 runtime: not found")
            if open_in_browser(app_html):
                _end_session()
                tell_user("Emporium has opened in your browser.\n\n"
                          "Its own window needs Microsoft Edge WebView2, a free part of Windows\n"
                          "that is missing on this PC. Once it is installed, Emporium opens in its\n"
                          "own window.\n\n"
                          "Note: the books kept in the browser and the books kept in Emporium's own\n"
                          "window are separate. A sealed backup moves a store from one to the other.")
                return
        else:
            log_note("webview2 runtime: %s" % rt)

    from pathlib import Path
    app_url = Path(app_html).as_uri()
    try:
        window = webview.create_window(
            WINDOW_TITLE, url=app_url, width=DEFAULT_WIDTH, height=DEFAULT_HEIGHT,
            min_size=(MIN_WIDTH, MIN_HEIGHT), background_color=_remembered_colour(),
            confirm_close=False, text_select=True)
    except BaseException:
        log_problem("create_window failed", sys.exc_info())
        if open_in_browser(app_html):
            _end_session()
            tell_user("Emporium could not open its own window on this computer, so it has opened\n"
                      "in your browser instead. Details are in:\n  %s" % log_path())
            return
        sys.exit(1)
    try:
        window.events.closing += _closing_is_clean
    except Exception:
        log_problem("could not watch the window closing")
    try:
        window.events.loaded += _page_loaded
        window.events.shown += _window_shown
    except Exception:
        pass

    def _hook(exc_type, exc, tb):
        log_problem("uncaught", (exc_type, exc, tb))
    sys.excepthook = _hook
    try:
        threading.excepthook = lambda a: log_problem("uncaught in thread", (a.exc_type, a.exc_value, a.exc_traceback))
    except Exception:
        pass

    # The window is only ever opened WITH lasting storage. A window without it
    # would lose the books when it closes, so if this attempt fails the page
    # opens in the browser instead, which keeps its storage.
    store = storage_dir()
    if not store:
        tell_user("Emporium could not make its folder for the books:\n  %s\n\n"
                  "Nothing was opened, so nothing can be lost." % os.path.join(data_root(), "storage"))
        _end_session()
        sys.exit(1)
    threading.Thread(target=_watch_start, args=(window,), name="start-watch", daemon=True).start()
    kw = {"debug": False, "private_mode": False, "storage_path": store}
    if sys.platform.startswith("win"):
        kw["gui"] = "edgechromium"
    try:
        log_note("start attempt: gui=%r storage=%s" % (kw.get("gui"), store))
        webview.start(**kw)
        _end_session()
        return
    except Exception:
        log_problem("webview.start failed", sys.exc_info())
    if open_in_browser(app_html):
        _end_session()
        tell_user("Emporium could not open its own window, so it has opened in your browser.\n"
                  "Details are in:\n  %s" % log_path())


if __name__ == "__main__":
    try:
        main()
    except SystemExit:
        raise
    except Exception:
        log_problem("fatal")
        tell_user("Emporium stopped unexpectedly.\n\nDetails are in:\n  %s" % log_path())
        sys.exit(1)
