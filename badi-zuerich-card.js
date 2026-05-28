/**
 * Badi Zürich Card
 * HACS custom Lovelace card — live water temperatures for Zürich outdoor pools
 * https://github.com/harrolf/badi-zuerich-card
 */

const TEMP_SCALE = [
  { max: 14, col: '#7dd3fc', feel: 'Sehr kalt' },
  { max: 17, col: '#38bdf8', feel: 'Kalt'      },
  { max: 19, col: '#34d399', feel: 'Frisch'    },
  { max: 22, col: '#4ade80', feel: 'Angenehm'  },
  { max: 25, col: '#fbbf24', feel: 'Warm'      },
  { max: 99, col: '#fb923c', feel: 'Sehr warm' },
];

function tempInfo(t) {
  if (t === null) return { col: '#4b5563', feel: '' };
  return TEMP_SCALE.find(s => t < s.max) || TEMP_SCALE[TEMP_SCALE.length - 1];
}

function classify(title) {
  if (title.startsWith('Frauenbad')) return 'Frauenbad';
  if (title.startsWith('Männerbad')) return 'Männerbad';
  if (title.startsWith('Flussbad'))  return 'Flussbad';
  if (title.startsWith('Strandbad')) return 'Strandbad';
  if (title.startsWith('Seebad'))    return 'Seebad';
  return 'Freibad';
}

function parseXml(text) {
  const xml = new DOMParser().parseFromString(text, 'text/xml');
  const baths = [];
  xml.querySelectorAll('bath').forEach(n => {
    const id = (n.querySelector('poiid')?.textContent || '').trim();
    if (id.startsWith('hb')) return;
    baths.push({
      title:  n.querySelector('title')?.textContent || '',
      temp:   (n.querySelector('temperatureWater')?.textContent || '').trim(),
      status: (n.querySelector('openClosedTextPlain')?.textContent || '').trim(),
      date:   (n.querySelector('dateModified')?.textContent || '').trim(),
      url:    n.querySelector('urlPage')?.textContent || '#',
    });
  });
  return baths;
}

const CARD_CSS = `
  :host { display: block; }
  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
  .card {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    font-size: 13px; line-height: 1.4;
    background: var(--ha-card-background, #1a1d24);
    border-radius: var(--ha-card-border-radius, 12px);
    overflow: hidden;
    --line:  rgba(255,255,255,0.07);
    --bg3:   #22262f;
    --text:  #e2e4e9;
    --muted: #6b7280;
    --dim:   #3d4148;
    --open:  #22c55e;
    --accent:#38bdf8;
  }
  /* topbar */
  .topbar { display:flex; align-items:center; justify-content:space-between; padding:0 14px; height:42px; border-bottom:1px solid var(--line); }
  .topbar-left { display:flex; align-items:center; gap:8px; }
  .logo { width:24px; height:24px; border-radius:5px; background:linear-gradient(135deg,#0369a1,#38bdf8); display:flex; align-items:center; justify-content:center; font-size:13px; }
  .topbar-title { font-size:13px; font-weight:600; color:var(--text); }
  .topbar-sub   { font-size:11px; color:var(--muted); }
  .topbar-right { display:flex; align-items:center; gap:10px; }
  .upd-time { font-size:11px; color:var(--muted); }
  .rbtn { width:24px; height:24px; border-radius:4px; border:1px solid var(--dim); background:transparent; color:var(--muted); cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all .15s; }
  .rbtn:hover { background:var(--bg3); color:var(--text); }
  .rbtn.spin svg { animation:spin .7s linear infinite; }
  @keyframes spin { to { transform:rotate(360deg); } }
  /* stats */
  .statsrow { display:grid; grid-template-columns:repeat(3,1fr); border-bottom:1px solid var(--line); }
  .stat { padding:9px 14px; border-right:1px solid var(--line); }
  .stat:last-child { border-right:none; }
  .stat-val { font-size:19px; font-weight:600; line-height:1; color:var(--text); }
  .stat-val.green { color:var(--open); }
  .stat-val.blue  { color:var(--accent); }
  .stat-lbl { font-size:10px; color:var(--muted); margin-top:2px; text-transform:uppercase; letter-spacing:.06em; }
  /* filters */
  .filterbar { display:flex; align-items:center; gap:4px; padding:6px 14px; border-bottom:1px solid var(--line); overflow-x:auto; }
  .fp { font-size:11px; font-weight:500; padding:3px 9px; border-radius:4px; border:1px solid var(--dim); background:transparent; color:var(--muted); cursor:pointer; white-space:nowrap; transition:all .12s; font-family:inherit; }
  .fp.active { background:var(--bg3); border-color:var(--accent); color:var(--text); }
  .fp:hover:not(.active) { border-color:var(--muted); color:var(--text); }
  /* section header */
  .sec-hdr { padding:5px 14px; font-size:10px; font-weight:600; text-transform:uppercase; letter-spacing:.07em; color:var(--muted); border-bottom:1px solid var(--line); display:flex; align-items:center; justify-content:space-between; }
  .sec-hdr span { background:var(--bg3); color:var(--muted); font-size:10px; padding:1px 5px; border-radius:3px; }
  /* rows */
  .rows { display:flex; flex-direction:column; }
  .row { display:grid; grid-template-columns:12px 1fr auto; align-items:center; gap:0 12px; padding:8px 14px; border-bottom:1px solid var(--line); text-decoration:none; color:inherit; transition:background .1s; }
  .row:hover { background:rgba(255,255,255,0.03); }
  .row.closed { opacity:.5; }
  .dot { width:7px; height:7px; border-radius:50%; flex-shrink:0; }
  .dot.open   { background:var(--open); box-shadow:0 0 0 2px rgba(34,197,94,.2); }
  .dot.closed { background:var(--dim); }
  .row-main { display:flex; flex-direction:column; gap:2px; min-width:0; }
  .row-name { font-size:13px; font-weight:500; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .row-meta { display:flex; align-items:center; gap:8px; }
  .row-type { font-size:10px; color:var(--muted); }
  .row-date { font-size:10px; color:var(--dim); }
  .row-right { display:flex; flex-direction:column; align-items:flex-end; gap:1px; flex-shrink:0; }
  .row-temp  { font-size:17px; font-weight:600; line-height:1; letter-spacing:-.01em; }
  .row-feel  { font-size:10px; font-weight:500; text-transform:uppercase; letter-spacing:.05em; }
  /* states */
  .state { padding:32px 14px; text-align:center; color:var(--muted); font-size:12px; }
  .pad   { height:4px; }
`;

class BadiZuerichCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._baths  = [];
    this._filter = 'all';
    this._timer  = null;
    this._ready  = false;
  }

  // Called by HA whenever state changes
  set hass(hass) {
    this._hass = hass;
    if (!this._ready) {
      this._ready = true;
      this._buildDOM();
      this._load();
      this._timer = setInterval(() => this._load(), 10 * 60 * 1000);
    } else {
      // Re-check sensor attribute in case it updated
      this._readFromSensor();
    }
  }

  setConfig(config) {
    this._config = config || {};
  }

  static getStubConfig() {
    return { entity: 'sensor.badi_zuerich' };
  }

  getCardSize() { return 8; }

  // ── data loading ────────────────────────────────────────────────────────────

  async _load() {
    const btn = this.shadowRoot.getElementById('rbtn');
    if (btn) btn.classList.add('spin');
    try {
      // Primary: read from HA command_line sensor (no CORS)
      if (this._readFromSensor()) return;

      // Fallback: direct fetch (works if HA's allowed_external_urls includes the host)
      const resp = await fetch('https://www.stadt-zuerich.ch/stzh/bathdatadownload');
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      this._baths = parseXml(await resp.text());
      this._update();
    } catch (e) {
      this._showError(e.message);
    } finally {
      if (btn) btn.classList.remove('spin');
    }
  }

  _readFromSensor() {
    const entityId = this._config?.entity || 'sensor.badi_zuerich';
    const state = this._hass?.states?.[entityId];
    if (!state) return false;
    const raw = state.attributes?.baths_json;
    if (!raw) return false;
    this._baths = typeof raw === 'string' ? JSON.parse(raw) : raw;
    this._update();
    return true;
  }

  // ── rendering ───────────────────────────────────────────────────────────────

  _update() {
    const data  = this._baths;
    const temps = data.filter(b => b.temp && !isNaN(parseFloat(b.temp))).map(b => parseFloat(b.temp));
    const avg   = temps.length ? (temps.reduce((a, v) => a + v, 0) / temps.length).toFixed(1) : null;
    const openN = data.filter(b => b.status === 'offen').length;

    const $ = id => this.shadowRoot.getElementById(id);
    if ($('s-n')) $('s-n').textContent = data.length;
    if ($('s-o')) $('s-o').textContent = openN;
    if ($('s-t')) $('s-t').textContent = avg ? `${avg}°` : '—';
    const n = new Date();
    if ($('upd-time')) $('upd-time').textContent =
      `${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}`;
    this._renderRows();
  }

  _renderRows() {
    const cf = this._filter;
    let list = this._baths.slice();
    if (cf === 'open') list = list.filter(b => b.status === 'offen');
    else if (cf !== 'all') list = list.filter(b => classify(b.title) === cf);

    const byTemp = (a, b) => (b.temp ? parseFloat(b.temp) : -1) - (a.temp ? parseFloat(a.temp) : -1);
    const open   = list.filter(b => b.status === 'offen').sort(byTemp);
    const closed = list.filter(b => b.status !== 'offen').sort(byTemp);

    const main = this.shadowRoot.getElementById('main');
    if (!main) return;
    if (!list.length) { main.innerHTML = '<div class="state">Keine Bäder gefunden.</div>'; return; }

    let h = '';
    if (open.length) {
      if (cf === 'all') h += `<div class="sec-hdr">Offen<span>${open.length}</span></div>`;
      h += `<div class="rows">${open.map(b => this._rowHtml(b)).join('')}</div>`;
    }
    if (closed.length && cf !== 'open') {
      h += `<div class="sec-hdr">Geschlossen<span>${closed.length}</span></div>`;
      h += `<div class="rows">${closed.map(b => this._rowHtml(b)).join('')}</div>`;
    }
    main.innerHTML = h + '<div class="pad"></div>';
  }

  _rowHtml(b) {
    const open = b.status === 'offen';
    const t    = b.temp !== '' ? parseFloat(b.temp) : null;
    const info = tempInfo(t);
    const ds   = b.date.replace(/^[^,]+,[ ]*/, '');
    return `
      <a class="row${open ? '' : ' closed'}" href="${b.url}" target="_blank" rel="noopener">
        <span class="dot ${open ? 'open' : 'closed'}"></span>
        <div class="row-main">
          <div class="row-name">${b.title}</div>
          <div class="row-meta">
            <span class="row-type">${classify(b.title)}</span>
            <span class="row-date">${ds}</span>
          </div>
        </div>
        <div class="row-right">
          ${t !== null
            ? `<div class="row-temp" style="color:${info.col}">${t}°</div>
               <div class="row-feel" style="color:${info.col};opacity:.7">${info.feel}</div>`
            : `<div class="row-temp" style="color:#4b5563">—</div>`}
        </div>
      </a>`;
  }

  _showError(msg) {
    const main = this.shadowRoot.getElementById('main');
    if (main) main.innerHTML = `<div class="state">⚠ ${msg}</div>`;
  }

  // ── DOM bootstrap ────────────────────────────────────────────────────────────

  _buildDOM() {
    this.shadowRoot.innerHTML = `
      <style>${CARD_CSS}</style>
      <div class="card">
        <div class="topbar">
          <div class="topbar-left">
            <div class="logo">🌊</div>
            <span class="topbar-title">Badi Zürich</span>
            <span class="topbar-sub">Sommerbäder</span>
          </div>
          <div class="topbar-right">
            <span class="upd-time" id="upd-time"></span>
            <button class="rbtn" id="rbtn" title="Aktualisieren">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" stroke-width="2.5"
                   stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>
              </svg>
            </button>
          </div>
        </div>
        <div class="statsrow">
          <div class="stat"><div class="stat-val"        id="s-n">—</div><div class="stat-lbl">Badis</div></div>
          <div class="stat"><div class="stat-val green"  id="s-o">—</div><div class="stat-lbl">Offen</div></div>
          <div class="stat"><div class="stat-val blue"   id="s-t">—</div><div class="stat-lbl">Ø Wassertemp</div></div>
        </div>
        <div class="filterbar" id="filterbar">
          <button class="fp active" data-f="all">Alle</button>
          <button class="fp" data-f="open">Offen</button>
          <button class="fp" data-f="Freibad">Freibad</button>
          <button class="fp" data-f="Flussbad">Flussbad</button>
          <button class="fp" data-f="Seebad">Seebad</button>
          <button class="fp" data-f="Strandbad">Strandbad</button>
        </div>
        <div id="main"><div class="state">Lade Daten…</div></div>
      </div>`;

    this.shadowRoot.getElementById('rbtn')
      .addEventListener('click', () => this._load());
    this.shadowRoot.querySelectorAll('.fp')
      .forEach(btn => btn.addEventListener('click', () => {
        this._filter = btn.dataset.f;
        this.shadowRoot.querySelectorAll('.fp').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this._renderRows();
      }));
  }

  disconnectedCallback() {
    if (this._timer) clearInterval(this._timer);
  }
}

customElements.define('badi-zuerich-card', BadiZuerichCard);

// HACS / Lovelace card registration
window.customCards = window.customCards || [];
window.customCards.push({
  type:        'badi-zuerich-card',
  name:        'Badi Zürich',
  description: 'Live Wassertemperaturen der Zürcher Sommerbäder',
  preview:     true,
  documentationURL: 'https://github.com/harrolf/badi-zuerich-card',
});
