// SEAS-AI-AGENT desktop app (Electron). It shows YOUR SEAS website in its own window and adds PC control: no bridge, no token, nothing to pair.
// The brain, search, voice and tools run on your Cloudflare server; this app only adds the things a browser cannot do.
const { app, BrowserWindow, ipcMain, shell, session, desktopCapturer } = require('electron');
const fs = require('fs'), path = require('path'), os = require('os'), cp = require('child_process');
const WIN = process.platform === 'win32', MAC = process.platform === 'darwin', HOME = os.homedir();
if (process.argv.includes('--safe')) app.disableHardwareAcceleration();
const log = m => { try { fs.appendFileSync(path.join(app.getPath('userData'), 'nexa.log'), new Date().toISOString() + ' ' + m + '\n'); } catch {} };

/* ---------- PC control (the same code the Node PC app uses) ---------- */
const ROOTS = [];
for (const b of [HOME, path.join(HOME, 'OneDrive')]) for (const d of ['Desktop', 'Documents', 'Downloads', 'Music', 'Videos', 'Pictures']) { try { const p = path.join(b, d); if (fs.statSync(p).isDirectory()) ROOTS.push(fs.realpathSync(p)); } catch {} }
const FILES = path.join(HOME, 'Nexa_Files'); fs.mkdirSync(FILES, { recursive: true }); ROOTS.push(fs.realpathSync(FILES));
const fail = (m, c = 400) => Object.assign(new Error(m), { code: c });
const inside = p => { let rp; try { rp = fs.realpathSync(path.resolve(String(p).replace(/^~/, HOME))); } catch { return [false, '']; } return [ROOTS.some(r => rp === r || rp.startsWith(r + path.sep)), rp]; };
const run = (f, a, ms = 15000) => new Promise(res => cp.execFile(f, a, { windowsHide: true, timeout: ms }, (e, o, er) => res((o || er || '').trim().slice(0, 300))));
const clean = s => String(s).replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&nbsp;/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim();
const PRIV = /^(localhost|.*\.local|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|0\.|::1|f[cd]|fe80)/i;

/* ---------- PC control ---------- */
const APPS = { notepad: 'notepad', calculator: 'calc', calc: 'calc', paint: 'mspaint', chrome: 'chrome', edge: 'msedge', firefox: 'firefox', explorer: 'explorer', files: 'explorer', vscode: 'code', code: 'code', word: 'winword', excel: 'excel', powerpoint: 'powerpnt', spotify: 'spotify', whatsapp: 'whatsapp:', telegram: 'telegram', discord: 'discord', vlc: 'vlc', cmd: 'cmd', settings: 'ms-settings:', 'task manager': 'taskmgr', camera: 'microsoft.windows.camera:', 'snipping tool': 'snippingtool', clock: 'ms-clock:', store: 'ms-windows-store:' };
const KILL = { chrome: 'chrome.exe', edge: 'msedge.exe', firefox: 'firefox.exe', notepad: 'notepad.exe', calculator: 'CalculatorApp.exe', calc: 'CalculatorApp.exe', spotify: 'Spotify.exe', whatsapp: 'WhatsApp.exe', telegram: 'Telegram.exe', discord: 'Discord.exe', vlc: 'vlc.exe', word: 'WINWORD.EXE', excel: 'EXCEL.EXE', powerpoint: 'POWERPNT.EXE', vscode: 'Code.exe', code: 'Code.exe', paint: 'mspaint.exe' };
const VK = { volume_up: 175, volume_down: 174, mute: 173, next: 176, previous: 177, play_pause: 179 };
const H = {};
H.ping = async () => ({ ok: true, os: process.platform, tools: Object.keys(H) });
H.open_app = async d => { const n = String(d.name || '').trim().toLowerCase(), t = APPS[n] || n; if (!/^[a-z0-9 ._:-]{1,40}$/.test(t)) throw fail('invalid app name');
  const c = WIN ? cp.spawn('cmd', ['/c', 'start', '', t], { windowsHide: true, detached: true, stdio: 'ignore' }) : MAC ? cp.spawn('open', ['-a', n], { detached: true, stdio: 'ignore' }) : cp.spawn(t, [], { detached: true, stdio: 'ignore' }); c.on('error', () => {}); c.unref(); return 'Opened ' + n + '.'; };
H.close_app = async d => { const exe = KILL[String(d.name || '').trim().toLowerCase()]; if (!exe) return 'I only close common apps: ' + Object.keys(KILL).join(', '); return WIN ? run('taskkill', ['/IM', exe, '/F']) : run('pkill', ['-f', exe.replace('.exe', '')]); };
H.system_info = async () => { const d = { os: os.type() + ' ' + os.release(), cpus: os.cpus().length, cpu_model: (os.cpus()[0] || {}).model, ram_total_gb: +(os.totalmem() / 1e9).toFixed(1), ram_used_percent: Math.round(100 - os.freemem() / os.totalmem() * 100), user: os.userInfo().username }; try { const s = fs.statfsSync(HOME); d.disk_free_gb = +(s.bavail * s.bsize / 1e9).toFixed(1); } catch {} return d; };
H.media = async d => { const n = Math.max(1, Math.min(+d.amount || 1, 25)), k = VK[d.action]; if (!k) throw fail('action must be one of ' + Object.keys(VK).join(', ')); if (!WIN) return 'Media keys: Windows only.';
  await run('powershell', ['-NoProfile', '-Command', `$w=New-Object -ComObject WScript.Shell;1..${n}|%{$w.SendKeys([char]${k})}`]); return `${d.action} x${n} done.`; };
H.find_files = async d => { const w = String(d.query || '').toLowerCase().split(/\s+/).filter(Boolean); if (!w.length) throw fail('empty query'); const out = [], t0 = Date.now();
  const walk = (dir, dep) => { if (dep > 4 || out.length >= 40 || Date.now() - t0 > 5000) return; let es; try { es = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of es) { if (e.name.startsWith('.')) continue; if (w.every(x => e.name.toLowerCase().includes(x))) out.push(path.join(dir, e.name)); if (e.isDirectory()) walk(path.join(dir, e.name), dep + 1); } };
  ROOTS.forEach(r => walk(r, 0)); return out.slice(0, 40); };
H.open_path = async d => { const [ok, rp] = inside(d.path || ''); if (!ok) throw fail('path not found or outside allowed folders'); (WIN ? cp.spawn('cmd', ['/c', 'start', '', rp], { windowsHide: true, detached: true, stdio: 'ignore' }) : cp.spawn(MAC ? 'open' : 'xdg-open', [rp], { detached: true, stdio: 'ignore' })).on('error', () => {}); return 'Opened ' + rp; };
H.read_text = async d => { const [ok, rp] = inside(d.path || ''); if (!ok || !fs.statSync(rp).isFile() || fs.statSync(rp).size > 2e6) throw fail('file not found, too large, or outside allowed folders'); return fs.readFileSync(rp, 'utf8').slice(0, 12000); };
H.save_text = async d => { const n = path.basename(String(d.filename || '').replace(/\\/g, '/')); if (!n || n.startsWith('.')) throw fail('bad filename'); const p = path.join(FILES, n); fs.writeFileSync(p, String(d.content || '')); return 'Saved to ' + p; };
H.doc_search = async d => { const q = String(d.query || '').toLowerCase().split(/\s+/).filter(w => w.length > 1); if (!q.length) throw fail('empty query'); const EXT = /\.(txt|md|csv|json|py|js|html|log|ini|cfg|xml|tex)$/i, res = [], t0 = Date.now(); let n = 0;
  const walk = (dir, dep) => { if (dep > 3 || n > 400 || Date.now() - t0 > 6000) return; let es; try { es = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of es) { if (e.name.startsWith('.') || e.name === 'node_modules') continue; const f = path.join(dir, e.name); if (e.isDirectory()) walk(f, dep + 1); else if (EXT.test(e.name)) { try { if (fs.statSync(f).size > 1e6) continue; n++; const t = fs.readFileSync(f, 'utf8'), low = t.toLowerCase(); let sc = 0, first = -1;
      for (const w of q) { let i = 0, c = 0; while ((i = low.indexOf(w, i)) >= 0 && c < 20) { if (first < 0) first = i; c++; i += w.length; } sc += c; } if (sc) res.push({ sc, f, s: t.slice(Math.max(0, first - 80), first + 220).replace(/\s+/g, ' ') }); } catch {} } } };
  ROOTS.forEach(r => walk(r, 0)); res.sort((a, b) => b.sc - a.sc); return res.slice(0, 5).map(r => r.f + ': ...' + r.s + '...').join('\n') || 'No matching text found in Documents, Desktop or Downloads.'; };
H.screenshot = async () => { const f = path.join(os.tmpdir(), 'nexa_shot.jpg');
  if (WIN) await run('powershell', ['-NoProfile', '-Command', `Add-Type -AssemblyName System.Windows.Forms,System.Drawing;$b=[System.Windows.Forms.SystemInformation]::VirtualScreen;$bm=New-Object System.Drawing.Bitmap $b.Width,$b.Height;$g=[System.Drawing.Graphics]::FromImage($bm);$g.CopyFromScreen($b.Left,$b.Top,0,0,$bm.Size);$w=1280;$h=[int]($b.Height*$w/$b.Width);$s=New-Object System.Drawing.Bitmap $bm,$w,$h;$s.Save('${f}',[System.Drawing.Imaging.ImageFormat]::Jpeg)`], 20000);
  else if (MAC) await run('screencapture', ['-x', '-t', 'jpg', f]); else throw fail('screenshots are supported on Windows and macOS');
  if (!fs.existsSync(f)) throw fail('screenshot failed'); const b = fs.readFileSync(f).toString('base64'); fs.unlinkSync(f); return { result: "Screenshot of the user's screen attached.", image: b, mime: 'image/jpeg' }; };

H.set_volume = async d => { const lv = Math.max(0, Math.min(100, Math.round(+d.level))); if (isNaN(lv)) throw fail('level must be 0-100'); if (!WIN) return 'Volume control: Windows only.';
  await run('powershell', ['-NoProfile', '-Command', `$w=New-Object -ComObject WScript.Shell;1..50|%{$w.SendKeys([char]174)};1..${Math.round(lv / 2)}|%{$w.SendKeys([char]175)}`], 30000); return 'Volume set to about ' + lv + '%.'; };
H.lock_screen = async () => { if (!WIN) throw fail('Locking is supported on Windows only'); cp.spawn('rundll32.exe', ['user32.dll,LockWorkStation'], { windowsHide: true, detached: true, stdio: 'ignore' }).unref(); return 'Screen locked.'; };
H.shutdown_pc = async d => { if (!WIN) throw fail('Supported on Windows only'); const a = String(d.action || '').toLowerCase();
  if (/sleep/.test(a)) { cp.spawn('rundll32.exe', ['powrprof.dll,SetSuspendState 0,1,0'], { windowsHide: true, detached: true, stdio: 'ignore' }).unref(); return 'Going to sleep now.'; }
  const re = /restart|reboot/.test(a); await run('shutdown', [re ? '/r' : '/s', '/t', '30']); return 'Okay. The PC will ' + (re ? 'restart' : 'shut down') + ' in 30 seconds. Say "cancel shutdown" to stop it.'; };
H.cancel_shutdown = async () => { if (!WIN) throw fail('Supported on Windows only'); await run('shutdown', ['/a']); return 'Cancelled.'; };

H.open_external = async d => { const u = String(d.url || ''); if (!/^(https?:\/\/|mailto:|tel:|sms:|whatsapp:|tg:)/i.test(u)) throw fail('this kind of link is not allowed');
  const c = WIN ? cp.spawn('rundll32', ['url.dll,FileProtocolHandler', u], { windowsHide: true, detached: true, stdio: 'ignore' }) : cp.spawn(MAC ? 'open' : 'xdg-open', [u], { detached: true, stdio: 'ignore' }); c.on('error', () => {}); c.unref(); return 'Opened.'; };
H.open_video = async d => { const id = String(d.id || ''); if (!/^[\w-]{11}$/.test(id)) throw fail('bad video id'); return H.open_external({ url: 'https://www.youtube.com/watch?v=' + id + '&autoplay=1' }); };


/* ---------- Electron parts ---------- */
let SITE = '', win = null;
const origin = u => { try { return new URL(u).origin; } catch { return ''; } };
const cfgFile = () => path.join(app.getPath('userData'), 'config.json');
function loadSite() { for (const f of [cfgFile(), path.join(__dirname, 'site.json')]) { try { const c = JSON.parse(fs.readFileSync(f, 'utf8')); if (c.site && /^https?:\/\//i.test(c.site)) return new URL(c.site).origin; } catch {} } return ''; }
H.open_external = async d => { const u = String(d.url || ''); if (!/^(https?:\/\/|mailto:|tel:|sms:|whatsapp:|tg:)/i.test(u)) throw fail('this kind of link is not allowed'); await shell.openExternal(u); return 'Opened.'; };
H.open_video = async d => { const id = String(d.id || ''); if (!/^[\w-]{11}$/.test(id)) throw fail('bad video id');
  const w = new BrowserWindow({ width: 1100, height: 680, backgroundColor: '#000', autoHideMenuBar: true, webPreferences: { autoplayPolicy: 'no-user-gesture-required', partition: 'persist:yt', sandbox: true } }); w.setMenu(null); w.loadURL('https://www.youtube.com/watch?v=' + id + '&autoplay=1'); return 'Playing in a video window.'; };
H.screenshot = async () => { const s = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 1280, height: 800 } }); if (!s[0]) throw fail('no screen found');
  return { result: "Screenshot of the user's screen attached.", image: s[0].thumbnail.toJPEG(70).toString('base64'), mime: 'image/jpeg' }; };
ipcMain.handle('nexa', async (e, p, b) => { try { if (!SITE || origin(e.senderFrame.url) !== SITE) throw new Error('forbidden'); p = String(p).replace(/^\//, ''); const f = H[p]; if (!f) throw new Error('unknown action'); const r = await f(b || {}); return p === 'ping' || (r && r.image) ? r : { result: r }; } catch (x) { return { error: String(x.message || x).slice(0, 300) }; } });
ipcMain.handle('setup-save', async (e, url) => { if (!String(e.senderFrame.url).startsWith('file://')) throw new Error('forbidden'); const u = new URL(/^https?:\/\//i.test(String(url).trim()) ? String(url).trim() : 'https://' + String(url).trim());
  fs.mkdirSync(app.getPath('userData'), { recursive: true }); fs.writeFileSync(cfgFile(), JSON.stringify({ site: u.origin })); SITE = u.origin; if (win) win.loadURL(SITE); return true; });

function createWindow() {
  win = new BrowserWindow({ width: 1320, height: 860, minWidth: 420, minHeight: 640, backgroundColor: '#03070d', title: 'SEAS-AI-AGENT', autoHideMenuBar: true, icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true, partition: 'persist:nexa', autoplayPolicy: 'no-user-gesture-required' } });
  win.setMenu(null);
  const ses = session.fromPartition('persist:nexa'), okPerm = ['media', 'audioCapture', 'fullscreen', 'clipboard-sanitized-write'];
  ses.setPermissionRequestHandler((wc, perm, cb, d) => cb(origin((d && d.requestingUrl) || wc.getURL()) === SITE && okPerm.includes(perm)));
  ses.setPermissionCheckHandler((wc, perm, o) => origin(o) === SITE && okPerm.includes(perm));
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^(https?:|mailto:|tel:)/i.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (origin(url) !== SITE && !url.startsWith('file://')) { e.preventDefault(); if (/^https?:/i.test(url)) shell.openExternal(url); } });
  win.webContents.on('did-fail-load', (e, code, desc, url, main) => { if (main && code !== -3 && !url.startsWith('file://')) { log('load failed ' + code + ' ' + desc); win.loadFile(path.join(__dirname, 'setup.html'), { query: { err: desc, site: SITE } }); } });
  let crashes = 0; win.webContents.on('render-process-gone', (e, d) => { log('renderer gone ' + d.reason); if (!process.argv.includes('--safe')) { app.relaunch({ args: process.argv.slice(1).concat('--safe') }); app.exit(0); } else if (++crashes < 4) win.reload(); });
  if (SITE) win.loadURL(SITE); else win.loadFile(path.join(__dirname, 'setup.html'));
}
app.whenReady().then(() => { SITE = loadSite(); createWindow(); });
app.on('window-all-closed', () => app.quit());
