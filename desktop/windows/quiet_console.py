# EMPORIUM  |  Copyright (c) 2026 Yannie D. Forest. All rights reserved.
# NO LICENCE IS GRANTED. See LICENCE.txt.
#
# PyInstaller runtime hook (named in emporium.spec): a windowed program has
# no console, so Python gives it no standard output. Anything printed goes
# nowhere instead of stopping the program. The same hook as the Forge's and
# Inkwell's. You do not run this file yourself.
import os
import sys

if sys.stdout is None:
    sys.stdout = open(os.devnull, "w")
if sys.stderr is None:
    sys.stderr = open(os.devnull, "w")
