# Converts flip-fella-desk's GlyphData.cs (Roboto Condensed Bold outlines) into app/glyphs.js
import re, sys, json
src = open(sys.argv[1]).read()
upm = int(re.search(r'Upm\s*=\s*(\d+)', src).group(1))
out = {}
for ch, adv, d in re.findall(r"\{\s*'(.)',\s*new G\((\d+),\s*\"([^\"]*)\"\)\s*\}", src):
    out[ch] = [int(adv), d]
js = "// Generated from Roboto Condensed Bold (SIL Open Font License 1.1, see OFL.txt) by tools/glyphs.py\nvar GLYPH_UPM = %d;\nvar GLYPHS = %s;\n" % (upm, json.dumps(out, separators=(',', ':')))
open(sys.argv[2], 'w').write(js)
print(len(out), 'glyphs')
