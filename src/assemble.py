import re, json, pathlib
R = pathlib.Path('/home/claude/gods-eye-view')
B = pathlib.Path('/home/claude/fogcity/build')
def strip(src):
    src = re.sub(r"^import .*?;\s*$", "", src, flags=re.M)
    src = src.replace("export const", "const").replace("export function", "function")
    return re.sub(r"\bmsg\(", "String(", src)
shaders = "\n".join(strip((R/f'src/styles/{n}.js').read_text()) for n in ['anime'])
flap = strip((R/'src/splitFlap.js').read_text())
css = (R/'src/ui/styles/status.css').read_text().splitlines()
start = next(i for i,l in enumerate(css) if l.startswith('.gev-flap-host.gev-flap-active'))
end = next(i for i,l in enumerate(css) if i>start and l.startswith('/* ── Toast'))
flapcss = "\n".join(css[start:end])
places = json.dumps(json.loads((B/'places.json').read_text()), ensure_ascii=False, separators=(',',':'))
page = (B/'page.html').read_text()
page = page.replace('/*@@FLAPCSS@@*/', flapcss).replace('/*@@FLAPJS@@*/', flap).replace('/*@@SHADERS@@*/', shaders)
page = page.replace('/*@@APP@@*/', (B/'app.js').read_text() + '\n' + (B/'tabs.js').read_text())
import os
ph = {}
if (B/'photos_map.json').exists():
    for k, v in json.loads((B/'photos_map.json').read_text()).items():
        local = pathlib.Path('/home/claude/fogcity/site/photos')/f"{v['file']}.jpg"
        ph[k] = {'src': f"photos/{v['file']}.jpg" if local.exists() or os.environ.get('PHOTOS_LOCAL') else v['thumb'], 'remote': v['thumb'], 'page': v.get('page'), 'author': v.get('author',''), 'license': v.get('license','')}
page = page.replace('/*@@PLACES@@*/', places)
page = page.replace('/*@@PHOTOS@@*/', json.dumps(ph, ensure_ascii=False, separators=(',',':')))
pathlib.Path('/home/claude/fogcity/site/index.html').write_text(page)
# full standalone doc for self-hosting
OG = """<meta property="og:type" content="website">
<meta property="og:title" content="Operation Fog City">
<meta property="og:description" content="Matt & Val's San Francisco week, Nov 14–20, on a 3D globe: every stop, food and hidden gems nearby, and the fog.">
<meta property="og:url" content="https://vosbek.github.io/Trip-view/">
<meta property="og:image" content="https://vosbek.github.io/Trip-view/og.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#f7f8f7">
"""
doc = '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n' + OG + page.replace('<div id="app">', '</head>\n<body>\n<div id="app">',1) + '\n</body>\n</html>\n'
pathlib.Path('/home/claude/fogcity/dist').mkdir(exist_ok=True)
pathlib.Path('/home/claude/fogcity/build/standalone.html').write_text(doc)
print(len(page)//1024, 'KB')
