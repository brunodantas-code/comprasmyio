import asyncio, json, re, subprocess, sys, html
from pathlib import Path
from playwright.async_api import async_playwright

ROOT = Path('/dev-server')
FONTS = ROOT / 'src/assets/fonts'
LOGO = (ROOT / 'src/assets/myio-logo-light.svg').read_text()
import base64
F={k:base64.b64encode((FONTS/f'nunito-{k}.ttf').read_bytes()).decode() for k in ('regular','bold','extrabold')}
VERSION, DATE, DATE_LONG = 1, '08.11.2026', '08 de novembro de 2026'

def icons_for(names):
    r = subprocess.run(['bun', '/dev-server/scripts/manuals/icons.tsx', *names], cwd=ROOT, capture_output=True, text=True,
                       env={'NODE_PATH': str(ROOT / 'node_modules'), 'PATH': '/usr/bin:/bin:' + __import__('os').environ['PATH']})
    d = json.loads(r.stdout)
    def fix(v):
        tag = re.match(r'<svg[^>]*>', v).group(0)
        return '<svg width="12" height="12" ' + re.sub(r' (width|height|class)="[^"]*"', '', tag)[5:] + v[len(tag):]
    return {k: fix(v) for k, v in d.items()}

def build(data, pages=None):
    labels = sorted(set(data['labels']), key=len, reverse=True)
    iconmap = data.get('icons', {})
    svgs = icons_for(sorted(set(iconmap.values()) | {data['icon']}))
    expr = re.compile('(' + '|'.join(re.escape(html.escape(l)) for l in labels) + '|→)') if labels else None

    def txt(s):
        s = html.escape(s).replace('&lt;b&gt;', '<b>').replace('&lt;/b&gt;', '</b>')
        if not expr: return s
        def rep(m):
            t = m.group(0)
            if t == '→': return '<span class="arr">→</span>'
            raw = html.unescape(t); ic = svgs.get(iconmap.get(raw, ''), '')
            return f'<b class="lab">{"<i class=ic>"+ic+"</i>" if ic else ""}{t}</b>'
        # avoid replacing inside tags: split on tags
        parts = re.split(r'(<[^>]+>)', s)
        return ''.join(p if p.startswith('<') else expr.sub(rep, p) for p in parts)

    def title_html(t):
        return txt(t)

    app = data['app']; secs = data['sections']
    big = svgs[data['icon']].replace('width="12"', 'width="34"').replace('height="12"', 'height="34"')
    out = [f'''<section class="page cover"><div class="logo">{LOGO}</div>
<div class="ctitle"><h1>{html.escape(app)} <span class="bigic">{big}</span></h1><h2>Manual do Usuário</h2>
<p class="csub">{html.escape(data['subtitle'])}</p><p class="cver">Versão {VERSION} · {DATE_LONG}<br>Versão inicial</p></div></section>''']
    out.append('<section class="page"><h2 class="ch">Objetivo</h2>' + ''.join(f'<p>{txt(p)}</p>' for p in data['objetivo']) +
               f'<h3>Para quem</h3><p>{txt(data["para_quem"])}</p><h3>Como usar</h3><p>{txt(data["como_usar"])}</p></section>')
    rows = ''.join(f'<a class="toc" href="#c{i+1}"><span class="num">{i+1}</span><span class="tt">{title_html(s["title"])}</span><span class="pg">{(pages or {}).get(i+1, "")}</span></a>' for i, s in enumerate(secs))
    out.append(f'<section class="page" id="sumario"><h2 class="ch">Sumário</h2>{rows}<p class="tocnote">Clique no assunto para ir à página. A segunda página apresenta Objetivo, Para quem e Como usar. Os marcadores laterais do leitor de PDF também permitem navegar por capítulo.</p></section>')
    for i, s in enumerate(secs):
        body = [f'<section class="page chap" id="c{i+1}"><a class="back" href="#sumario">Sumário</a><h2 class="ch" data-c="{i+1}">{title_html(s["title"])}</h2>']
        for b in s['blocks']:
            k = b['kind']
            if k == 'h': body.append(f'<h3>{txt(b["text"])}</h3>')
            elif k == 'steps': body.append('<ol>' + ''.join(f'<li>{txt(x)}</li>' for x in b['steps']) + '</ol>')
            elif k == 'table':
                body.append('<table><thead><tr>' + ''.join(f'<th>{txt(h)}</th>' for h in b['headers']) + '</tr></thead><tbody>' +
                            ''.join('<tr>' + ''.join(f'<td>{txt(c)}</td>' for c in r) + '</tr>' for r in b['rows']) + '</tbody></table>')
            elif k == 'note': body.append(f'<div class="note">{txt(b["text"])}</div>')
            else: body.append(f'<p>{txt(b["text"])}</p>')
        body.append('</section>'); out.append(''.join(body))
    css = f'''
@font-face{{font-family:N;src:url(data:font/ttf;base64,{F['regular']});font-weight:400}}
@font-face{{font-family:N;src:url(data:font/ttf;base64,{F['bold']});font-weight:700}}
@font-face{{font-family:N;src:url(data:font/ttf;base64,{F['extrabold']});font-weight:800}}
@page{{size:A4;margin:16mm 16mm 18mm 16mm}}
body{{font-family:N;color:#1f2430;font-size:9.6pt;line-height:1.55;margin:0}}
.page{{break-after:page;position:relative}} .page:last-child{{break-after:auto}}
.cover{{height:255mm}} .logo svg{{width:46mm}} .ctitle{{position:absolute;bottom:22mm;left:0}}
.cover h1{{font-size:30pt;margin:0;color:#111;font-weight:800;display:flex;align-items:center;gap:10px}} .bigic svg{{color:#111;display:block}}
.cover h2{{font-size:18pt;color:#673ab6;margin:6px 0 18px;font-weight:700}} .csub{{font-size:11pt;color:#6b7280;margin:0 0 28px;max-width:95mm}} .cver{{font-size:8pt;color:#6b7280}}
h2.ch b,.toc b{{color:inherit}} h2.ch{{color:#673ab6;font-size:14.5pt;font-weight:700;border-bottom:1.3px solid #10c481;padding-bottom:6px;margin:4mm 0 5mm}}
h3{{font-size:10.5pt;margin:5mm 0 2mm;font-weight:700;color:#111;break-after:avoid}}
.back{{position:absolute;right:0;top:-3mm;color:#10c481;font-size:7.5pt;text-decoration:none;font-weight:700}}
p{{margin:0 0 3mm}} b{{font-weight:700;color:#111}} .lab{{white-space:nowrap}} .arr{{color:#10c481;margin:0 3px;font-weight:700}}
.ic svg{{color:#0f925a;vertical-align:-1.5px;margin-right:2px}}
ol{{padding-left:0;margin:2mm 0 4mm;counter-reset:s;list-style:none}} ol li{{counter-increment:s;position:relative;padding-left:7mm;margin-bottom:2mm;break-inside:avoid}}
ol li::before{{content:counter(s) ".";position:absolute;left:0;color:#673ab6;font-weight:700}}
table{{width:100%;border-collapse:collapse;margin:2mm 0 5mm;font-size:8.8pt}} th{{text-align:left;font-weight:400;color:#6b7280;border-bottom:1px solid #d6d9de;padding:5px 6px}}
td{{border-bottom:1px solid #e5e7eb;padding:6px;vertical-align:top}} tr{{break-inside:avoid}} td:first-child{{width:30%}}
.note{{background:#eaf8f1;border-left:3px solid #10c481;padding:3mm 4mm;font-size:8.6pt;color:#4b5563;margin:3mm 0 4mm;break-inside:avoid}}
.toc{{display:flex;align-items:center;gap:4mm;text-decoration:none;color:#111;border-bottom:1px solid #eef0f2;padding:2.1mm 0;font-weight:700;font-size:9pt}}
.num{{background:#e3f7ee;color:#0f925a;border-radius:4px;width:6mm;height:5mm;display:flex;align-items:center;justify-content:center;font-size:8pt}} .tt{{flex:1}} .pg{{font-weight:400}}
.tocnote{{color:#6b7280;font-size:8pt;margin-top:6mm}}
'''
    return f'<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>{css}</style></head><body>{"".join(out)}</body></html>'

FOOT = '''<div style="width:100%;font-family:Helvetica;font-size:6.5px;color:#9ca3af;padding:0 16mm;display:flex;justify-content:space-between">
<span>myio Automação Ltda • {app} • Manual do Usuário</span><span>V{v} · {d} | <span class="pageNumber"></span> / <span class="totalPages"></span></span></div>'''

async def render(data, path):
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page()
        async def go(pages):
            await pg.set_content(build(data, pages), wait_until='networkidle')
            await pg.pdf(path=path, format='A4', display_header_footer=True, header_template='<span></span>',
                         footer_template=FOOT.format(app=html.escape(data['app']), v=VERSION, d=DATE),
                         margin={'top': '16mm', 'bottom': '18mm', 'left': '16mm', 'right': '16mm'}, outline=True, tagged=True)
        await go(None)
        # locate chapter pages via text
        n = int(re.search(r'Pages:\s+(\d+)', subprocess.run(['pdfinfo', path], capture_output=True, text=True).stdout).group(1))
        pages = {}; nxt = 1
        for i in range(4, n + 1):
            t = subprocess.run(['pdftotext', '-f', str(i), '-l', str(i), '-layout', path, '-'], capture_output=True, text=True).stdout
            while nxt <= len(data['sections']):
                first = re.sub(r'<[^>]+>', '', data['sections'][nxt-1]['title'])[:25]
                head='\n'.join(t.strip().splitlines()[:3])
                if first in head: pages[nxt] = i; nxt += 1
                else: break
        await go(pages); await b.close()
        return pages, n

if __name__ == '__main__':
    src = sys.argv[1]; data = json.loads(Path(src).read_text())
    out = f"/tmp/manuals-out/manual-{data['slug']}-v{VERSION}.pdf"; Path('/tmp/manuals-out').mkdir(exist_ok=True)
    print(asyncio.run(render(data, out)), out)
