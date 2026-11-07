# EMPORIUM  |  Copyright (c) 2026 Yannie D. Forest. All rights reserved.
# NO LICENCE IS GRANTED. See LICENCE.txt.
# -*- mode: python ; coding: utf-8 -*-
#
# Lakay for Windows, built as a PROGRAM FOLDER that the installer
# (emporium.iss) puts in place. Built on GitHub by .github/workflows/windows.yml;
# you do not run this file yourself.
#
# The same recipe as the Forge's Windows program (the_forge.spec, 9s80) and
# Inkwell's: windowed, one folder, PyInstaller's standard starter, no UPX, the
# quiet console hook, and pywebview, clr_loader and pythonnet collected whole.
# The page is the one committed in app/Lakay.html, checked byte for byte
# by the workflow after the build.

import json
import os

from PyInstaller.utils.hooks import collect_all

APP_NAME = 'Lakay'
ROOT = os.path.abspath(os.path.join(SPECPATH, '..', '..'))

try:
    with open(os.path.join(ROOT, 'build.json'), encoding='utf-8') as fh:
        _build = int(json.load(fh).get('build', 0))
except Exception:
    _build = 0
VERSION_NUMBERS = (1, 0, min(_build, 65535), 0)
VERSION_DOTTED = '.'.join(str(n) for n in VERSION_NUMBERS)
VERSION_LABEL = 'Build %d' % _build


def _version_resource():
    try:
        from PyInstaller.utils.win32.versioninfo import (
            VSVersionInfo, FixedFileInfo, StringFileInfo, StringTable,
            StringStruct, VarFileInfo, VarStruct)
    except Exception as _e:
        print('emporium: no version details on this system (%s)' % _e)
        return None
    return VSVersionInfo(
        ffi=FixedFileInfo(filevers=VERSION_NUMBERS, prodvers=VERSION_NUMBERS),
        kids=[
            StringFileInfo([StringTable('040904B0', [
                StringStruct('CompanyName', 'Yannie D. Forest'),
                StringStruct('FileDescription', APP_NAME),
                StringStruct('FileVersion', VERSION_DOTTED),
                StringStruct('InternalName', 'emporium'),
                StringStruct('LegalCopyright', 'Copyright (c) 2026 Yannie D. Forest. All rights reserved.'),
                StringStruct('OriginalFilename', APP_NAME + '.exe'),
                StringStruct('ProductName', APP_NAME),
                StringStruct('ProductVersion', VERSION_LABEL),
            ])]),
            VarFileInfo([VarStruct('Translation', [1033, 1200])]),
        ])


extra_datas, extra_binaries, extra_hidden = [], [], []
for _pkg in ('webview', 'clr_loader', 'pythonnet'):
    try:
        _d, _b, _h = collect_all(_pkg)
        extra_datas += _d
        extra_binaries += _b
        extra_hidden += _h
    except Exception as _e:
        print('emporium: nothing collected for %s (%s)' % (_pkg, _e))

a = Analysis(
    [os.path.join(ROOT, 'desktop', 'emporium_app.py')],
    pathex=[],
    binaries=extra_binaries,
    datas=[(os.path.join(ROOT, 'app', 'Lakay.html'), '.'),
           (os.path.join(SPECPATH, 'emporium.ico'), '.')] + extra_datas,
    hiddenimports=['webview.platforms.winforms', 'webview.platforms.edgechromium', 'clr'] + extra_hidden,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[os.path.join(SPECPATH, 'quiet_console.py')],
    excludes=[],
    noarchive=False,
)

pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name=APP_NAME,
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=os.path.join(SPECPATH, 'emporium.ico'),
    version=_version_resource(),
)
coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=False,
    upx_exclude=[],
    name=APP_NAME,
)
