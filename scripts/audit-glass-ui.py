"""Read-only rendered UI evidence using the installed websocket-client package.

Alternate Python transport records evidence independently of Node/Undici.
Run with --stage before or after; no dependencies are installed by this script.
"""
import argparse
import base64
import json
import os
from pathlib import Path
import subprocess
import tempfile
import time
import urllib.request

import websocket

parser = argparse.ArgumentParser()
parser.add_argument('--stage', choices=['before', 'after'], required=True)
parser.add_argument('--base', default='http://127.0.0.1:5173')
parser.add_argument('--software-rendering', action='store_true')
parser.add_argument('--browser', choices=['auto', 'chrome', 'edge'], default='auto')
parser.add_argument('--output', default=None)
args = parser.parse_args()
output = Path(args.output) if args.output else Path('docs/qa-results/glass-ui') / args.stage
output.mkdir(parents=True, exist_ok=True)
profile = Path(tempfile.mkdtemp(prefix='travel-eye-glass-ui-'))
candidates = {'chrome': Path(r'C:\Program Files\Google\Chrome\Application\chrome.exe'),
              'edge': Path(r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe')}
browser = next((p for name, p in candidates.items() if p.exists() and args.browser in ['auto', name]), None)
report = {'stage': args.stage, 'browser': args.browser, 'softwareRendering': args.software_rendering, 'checks': [], 'events': [], 'status': 'BLOCKED',
          'requestedWidths': [320, 375, 430, 768, 1024, 1440, 1920], 'themes': ['light', 'dark'],
          'acceptance': 'NEEDS MANUAL VERIFICATION until rendered checks complete'}
child = None
socket = None
sequence = 0
session = None


def send(method, params=None):
    global sequence
    sequence += 1
    command = {'id': sequence, 'method': method, 'params': params or {}}
    if session:
        command['sessionId'] = session
    socket.send(json.dumps(command))
    while True:
        message = json.loads(socket.recv())
        if message.get('id') == sequence:
            if 'error' in message:
                raise RuntimeError(str(message['error']))
            return message.get('result', {})
        if message.get('method') in ['Runtime.exceptionThrown', 'Log.entryAdded']:
            report['events'].append(message)


def evaluate(expression):
    result = send('Runtime.evaluate', {'expression': expression, 'awaitPromise': True, 'returnByValue': True})
    if 'exceptionDetails' in result:
        raise RuntimeError(str(result['exceptionDetails']))
    return result.get('result', {}).get('value')


try:
    if not browser:
        raise RuntimeError('No installed browser found')
    child = subprocess.Popen([browser, '--headless=new', '--no-first-run', '--no-default-browser-check',
                              '--disable-extensions', '--remote-debugging-port=0', f'--user-data-dir={profile}',
                              *(['--use-gl=angle', '--use-angle=swiftshader'] if args.software_rendering else []),
                              'about:blank'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                             creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0)
    deadline = time.time() + 30
    portfile = profile / 'DevToolsActivePort'
    while not portfile.exists() and time.time() < deadline:
        time.sleep(.1)
    port, endpoint = portfile.read_text().splitlines()[:2]
    socket = websocket.create_connection(f'ws://127.0.0.1:{port}{endpoint}', timeout=20, suppress_origin=True)
    target = send('Target.createTarget', {'url': 'about:blank'})['targetId']
    session = send('Target.attachToTarget', {'targetId': target, 'flatten': True})['sessionId']
    send('Page.enable')
    send('Runtime.enable')
    send('Log.enable')
    content = json.load(urllib.request.urlopen(args.base + '/api/content'))
    routes = ['/', '/explore', '/destinations', '/experiences', '/tours', '/about', '/about#contact', '/plan', '/journal', '/photo-credits', '/missing-route']
    if args.stage == 'after':
        for key, prefix in [('destinations', 'destinations'), ('featuredExperiences', 'experiences'), ('tours', 'tours'), ('articles', 'journal')]:
            routes += [f'/{prefix}/{row["id"]}' for row in content[key]]
    widths = [375, 1440] if args.stage == 'before' else [320, 375, 430, 768, 1024, 1440, 1920]
    for route in routes:
        for width in widths:
            send('Emulation.setDeviceMetricsOverride', {'width': width, 'height': 1000, 'deviceScaleFactor': 1, 'mobile': width < 768})
            send('Page.navigate', {'url': args.base + route})
            deadline = time.time() + 15
            while not evaluate('Boolean(document.querySelector("main h1"))'):
                if time.time() > deadline:
                    raise RuntimeError('Heading did not load: ' + route)
                time.sleep(.1)
            evaluate('''(async()=>{await document.fonts.ready; await new Promise(r=>setTimeout(r,350));
              const style=document.createElement('style');style.textContent='[data-reveal]{opacity:1!important;transform:none!important}*{animation:none!important;transition:none!important}';document.head.append(style);})()''')
            for theme in ['light', 'dark']:
                evaluate(f'document.documentElement.dataset.theme="{theme}"')
                metrics = evaluate('''(async()=>{await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
                  const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom}};
                  const hero=document.querySelector('main .te-page-hero-copy, main .te-hero-copy');const nav=document.querySelector('.te-nav');
                  return {heading:document.querySelector('main h1')?.textContent,overflow:document.documentElement.scrollWidth>innerWidth+1,
                    homeSections:location.pathname==='/'?document.querySelectorAll('main>section').length:null,
                    customCursorCount:document.querySelectorAll('.te-cursor,.te-cursor-ring,.te-cursor-dot').length,
                    heroBounds:document.querySelector('main>section')?rect(document.querySelector('main>section')):null,
                    hero:hero?rect(hero):null,navbar:nav?rect(nav):null,
                    filter:hero?getComputedStyle(hero).backdropFilter:null,
                    heroSurface:hero?(()=>{const s=getComputedStyle(hero);return {background:s.backgroundColor,backgroundImage:s.backgroundImage,shadow:s.boxShadow,border:s.borderTopWidth,before:getComputedStyle(hero,'::before').content,after:getComputedStyle(hero,'::after').content}})():null,
                    activeNavigation:[...document.querySelectorAll('.te-nav a[data-active="true"]')].map(e=>({label:e.textContent,href:e.getAttribute('href'),current:e.getAttribute('aria-current')})),
                    buttons:[...document.querySelectorAll('.te-button')].map(e=>({text:e.textContent,rect:rect(e),color:getComputedStyle(e).color,background:getComputedStyle(e).backgroundColor,href:e.getAttribute('href')})),
                    brokenImages:[...document.images].filter(i=>i.dataset.imageState==='failed'||i.complete&&!i.naturalWidth&&i.currentSrc).map(i=>i.currentSrc)};})()''')
                report['checks'].append({'route': route, 'width': width, 'theme': theme, **metrics})
                if route in ['/', '/explore', '/destinations', '/tours', '/journal', '/experiences', '/plan', '/about', '/about#contact'] and width in [375, 1440]:
                    name = (route.strip('/').replace('#', '-') or 'home') + f'-{theme}-{width}.png'
                    shot = send('Page.captureScreenshot', {'format': 'png'})
                    (output / name).write_bytes(base64.b64decode(shot['data']))
    report['status'] = 'COMPLETED'
except Exception as error:
    report['reason'] = str(error)
    print('Browser evidence blocked: ' + str(error))
finally:
    if socket:
        try:
            session = None
            send('Browser.close')
        except Exception:
            pass
        socket.close()
    if child:
        try:
            child.wait(timeout=5)
        except subprocess.TimeoutExpired:
            child.terminate()
    # Preserve the temporary profile on failure for diagnosis; no recursive deletion.
    (output / 'report.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    print(f'{args.stage}: {len(report["checks"])} rendered checks; {report["status"]}')
    if report['status'] != 'COMPLETED':
        raise SystemExit(1)
