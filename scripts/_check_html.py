import re
from pathlib import Path
with open(Path(__file__).resolve().parent.parent / "_tmp_absalom.html", encoding="utf-8") as f:
    h = f.read()
for m in re.finditer(r'data-source="([^"]+)"', h):
    print(m.group(1))
