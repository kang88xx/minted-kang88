# -*- coding: utf-8 -*-
# Builds the outside copy of the site: the same page with every amount of money taken out of the files themselves
# (not just hidden), so nothing shows in the page source either. It is deployed as its own Vercel project.
#
# Usage: python3 tools/build-share.py <output dir>
#        then: cd <output dir> && vercel deploy --prod --yes
#
# What comes out: no subtotal in the summary row, the budget table keeps items and quantities only, amounts in
# pop-up text are reworded, zone costs are emptied, and the caterer's price menu PDF is neither linked nor copied.
# The build stops if any amount is still found.
import os, re, shutil, sys

src = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
out = os.path.abspath(sys.argv[1])
MONEY = re.compile(r'[0-9][0-9,]*\s*(?:만\s*)?원|KRW\s*[0-9]')

def load(name): return open(os.path.join(src, name), encoding='utf-8').read()
def save(name, text): open(os.path.join(out, name), 'w', encoding='utf-8').write(text)
def once(s, pattern, new, flags=0):
    s, n = re.subn(pattern, new, s, flags=flags)
    assert n == 1, (pattern[:60], n)
    return s

os.makedirs(out, exist_ok=True)

# ---------- index.html ----------
s = load('index.html')
s = once(s, r'<meta charset="utf-8">', '<meta charset="utf-8"><meta name="robots" content="noindex,nofollow">')
s = once(s, r'<div class="metric"><small>금액을 넣은 항목 소계[^<]*</small><span>[^<]*</span></div>', '')
s = once(s, r'<summary>운영 항목과 예산</summary>', '<summary>운영 항목</summary>')
s = once(s, r'금액은 모두 부가세 별도입니다\..*?-로 두었습니다\. ', '')
s = once(s, r'<th scope="col">단가</th><th scope="col">금액 \(부가세 별도\)</th>', '')
s = once(s, r'<tfoot>.*?</tfoot>', '', re.S)
a = s.index('<details id="budget">'); b = s.index('</table>', a)
table, n = re.subn(r'(<tr><th scope="row">.*?</th><td>.*?</td>)<td>.*?</td><td>.*?</td></tr>', r'\1</tr>', s[a:b], flags=re.S)
assert n >= 20, n
s = s[:a] + table + s[b:]
s = once(s, r' · <a href="catering-menu\.pdf"[^>]*>메뉴 PDF ↗</a>', '')
s = once(s, r'이번 대관료 3,000만 원에 포함했습니다\.', '이번 대관에 포함했습니다.')
s = once(s, r'\(대관료 3,000만 원에 포함\)', '(이번 대관에 포함)')
s = once(s, r'배너는 출력, 개당 약 40,000원 추정 · ', '배너는 출력 · ')
save('index.html', s)

# ---------- plan.js ----------
p = load('plan.js')
p = once(p, r'const costs = \{.*?\n\};\n', 'const costs = {};\n', re.S)
p = once(p, r"  buffet:\{label:'케이터링 메뉴 PDF ↗', href:'catering-menu\.pdf'\},\n", '')
p = once(p, r' at KRW 25,000 per person', '')
save('plan.js', p)

# ---------- unchanged files ----------
css = load('style.css') + '\n/* Outside copy: three summary figures instead of four */\n.metrics {grid-template-columns:repeat(3,1fr);}\n@media(max-width:800px){.metrics {grid-template-columns:repeat(2,minmax(0,1fr));}}\n'
save('style.css', css)
for name in ['model.js', 'venue-signage.pdf', 'venue-furniture.pdf']:
    shutil.copyfile(os.path.join(src, name), os.path.join(out, name))
save('vercel.json', '{\n  "headers": [{ "source": "/(.*)", "headers": [{ "key": "X-Robots-Tag", "value": "noindex, nofollow" }] }]\n}\n')
stale = os.path.join(out, 'catering-menu.pdf')
if os.path.exists(stale): os.remove(stale)

# ---------- nothing with an amount may be left ----------
left = []
for name in ['index.html', 'plan.js', 'model.js', 'style.css']:
    text = open(os.path.join(out, name), encoding='utf-8').read()
    left += [name + ': ' + text[max(0, m.start() - 30):m.end() + 10].replace('\n', ' ') for m in MONEY.finditer(text)]
    assert 'catering-menu' not in text, name + ' still links the price menu'
if left:
    print('\n'.join(left)); sys.exit('amounts left in the outside copy')
print('built', out, sorted(os.listdir(out)))
