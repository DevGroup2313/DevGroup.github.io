# EMPORIUM  |  Copyright (c) 2026 Yannie D. Forest. All rights reserved.
# NO LICENCE IS GRANTED. See LICENCE.txt.
# -*- mode: python ; coding: utf-8 -*-
#
# Lakay for the Mac (Apple silicon and Intel): the same window program as on
# Windows (desktop/emporium_app.py), opened in the Mac's own web view (WebKit).
# Built on GitHub's Macs by .github/workflows/mac.yml; you do not run this file.
# Made after Ingenium's Mac recipe (ingenium.spec): pywebview and PyObjC
# collected whole, the page beside the program, one .app per kind of Mac.

import json
import os
import sys

from PyInstaller.utils.hooks import collect_all

APP_NAME = 'Lakay'
APP_ID = 'com.yannieforest.emporium'
ROOT = os.path.abspath(os.path.join(SPECPATH, '..', '..'))

try:
    with open(os.path.join(ROOT, 'build.json'), encoding='utf-8') as fh:
        _build = int(json.load(fh).get('build', 0))
except Exception:
    _build = 0
APP_VERSION = '1.0.%d' % _build

extra_datas, extra_binaries, extra_hidden = [], [], []
for _pkg in ('webview', 'proxy_tools', 'bottle', 'objc', 'Foundation', 'AppKit', 'WebKit',
             'PyObjCTools', 'Quartz', 'Security', 'UniformTypeIdentifiers'):
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
    datas=[(os.path.join(ROOT, 'app', 'Lakay.html'), '.')] + extra_datas,
    hiddenimports=['webview.platforms.cocoa'] + extra_hidden,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
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
    icon=os.path.join(SPECPATH, 'emporium.icns'),
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

if sys.platform == 'darwin':
    app = BUNDLE(
        coll,
        name=APP_NAME + '.app',
        icon=os.path.join(SPECPATH, 'emporium.icns'),
        bundle_identifier=APP_ID,
        info_plist={
            'CFBundleName': APP_NAME,
            'CFBundleDisplayName': APP_NAME,
            'CFBundleShortVersionString': APP_VERSION,
            'CFBundleVersion': str(_build),
            'NSHighResolutionCapable': True,
            'LSMinimumSystemVersion': '11.0',
            'LSApplicationCategoryType': 'public.app-category.business',
        },
    )
