#!/usr/bin/env python3
"""Inline pieces/*.js into index.html -> dist/godzilla-nights.html (one self-contained file)."""
import re
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
s = (ROOT / 'index.html').read_text()
def inline(m):
    src = (ROOT / m.group(1)).read_text()
    return '<script>\n' + src.replace('</script', '<\\/script') + '\n</script>'
s = re.sub(r'<script src="([^"]+)"></script>', inline, s)
(ROOT / 'dist').mkdir(exist_ok=True)
out = ROOT / 'dist' / 'godzilla-nights.html'; out.write_text(s)
print(out, len(s), 'bytes')
