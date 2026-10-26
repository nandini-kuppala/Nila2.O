// The shell: top bar, bottom tabs, hash routes, night mode and the first-run welcome.

import * as store from './store.js';
import { icon } from './icons.js';
import { html, str, $, ageInMonths } from './ui.js';
import { setReasonProvider } from './monitor/audio-engine.js';
import { guessReason } from './monitor/reason.js';
import { logState } from './lib/summaries.js';

// The "probably hungry" guess comes from the quick log, never from the sound.
setReasonProvider(async () => {
  const s = await store.settings();
  return guessReason(logState(await store.events()), Date.now(), ageInMonths(s.birthDate));
});

const TABS = [
  { id: 'monitor', label: 'Monitor', icon: 'ear' },
  { id: 'ask', label: 'Ask', icon: 'ask' },
  { id: 'watch', label: 'Watch', icon: 'eye' },
  { id: 'health', label: 'Health', icon: 'health' },
  { id: 'doctor', label: 'Doctor', icon: 'doctor' },
];

// route → screen module. `tab` is the tab it belongs to; sub-screens get a back arrow.
const ROUTES = {
  monitor: { title: 'Monitor', tab: 'monitor', load: () => import('./screens/monitor.js') },
  timeline: { title: 'Timeline', tab: 'monitor', sub: true, load: () => import('./screens/timeline.js') },
  insights: { title: 'Insights', tab: 'health', sub: true, load: () => import('./screens/insights.js') },
  settings: { title: 'Settings', tab: null, sub: true, load: () => import('./screens/settings.js') },
  ask: { title: 'Ask', tab: 'ask', load: () => import('./screens/ask.js') },
  answer: { title: 'Ask', tab: 'ask', sub: true, load: () => import('./screens/ask.js') },
  medicine: { title: 'Check a medicine', tab: 'ask', sub: true, load: () => import('./screens/medicine.js') },
  watch: { title: 'Watch', tab: 'watch', load: () => import('./screens/watch.js') },
  babyproof: { title: 'Babyproof a room', tab: 'watch', sub: true, load: () => import('./screens/babyproof.js') },
  health: { title: 'Health', tab: 'health', load: () => import('./screens/health.js') },
  signs: { title: 'Little Signs', tab: 'health', sub: true, load: () => import('./screens/signs.js') },
  spot: { title: 'Skin diary', tab: 'health', sub: true, load: () => import('./screens/signs.js') },
  nappy: { title: 'Nappy colour', tab: 'health', sub: true, load: () => import('./screens/checks.js') },
  eye: { title: 'Eye flash check', tab: 'health', sub: true, load: () => import('./screens/checks.js') },
  yellow: { title: 'Yellow check', tab: 'health', sub: true, load: () => import('./screens/checks.js') },
  food: { title: 'Food and reactions', tab: 'health', sub: true, load: () => import('./screens/checks.js') },
  doctor: { title: 'Doctor', tab: 'doctor', load: () => import('./screens/doctor.js') },
  visit: { title: 'Visit notes', tab: 'doctor', sub: true, load: () => import('./screens/visit.js') },
  calendar: { title: 'Calendar', tab: 'doctor', sub: true, load: () => import('./screens/visit.js') },
};

let cleanup = null;
let renderId = 0;

function parseHash() {
  const [name, ...params] = (location.hash.replace(/^#\/?/, '') || 'monitor').split('/');
  return { name: ROUTES[name] ? name : 'monitor', params: params.map(decodeURIComponent) };
}

export function go(path) {
  location.hash = `#/${path}`;
}

function applyTheme(s) {
  document.documentElement.dataset.theme = s.night ? 'dark' : 'light';
  document.querySelector('meta[name="theme-color"]').content = s.night ? '#101413' : '#F7FAF8';
}

function renderTopbar(route) {
  const s = store.cachedSettings();
  const night = html`<button class="icon-btn" data-night aria-label="${s.night ? 'Day mode' : 'Night mode'}">${{ __raw: icon(s.night ? 'sun' : 'moon') }}</button>`;
  $('#topbar').innerHTML = str(route.sub
    ? html`<button class="icon-btn" data-back aria-label="Back">${{ __raw: icon('back') }}</button>
           <h1 class="sub-title">${route.title}</h1>${night}`
    : html`<h1>${route.title}</h1>${night}
           <a class="icon-btn" href="#/timeline" aria-label="Timeline">${{ __raw: icon('history') }}</a>
           <a class="icon-btn" href="#/insights" aria-label="Insights">${{ __raw: icon('chart') }}</a>
           <a class="icon-btn" href="#/settings" aria-label="Settings">${{ __raw: icon('sliders') }}</a>`);
  $('#topbar [data-night]').onclick = async () => {
    const next = await store.saveSettings({ night: !store.cachedSettings().night });
    applyTheme(next);
    renderTopbar(route);
  };
  const back = $('#topbar [data-back]');
  if (back) back.onclick = () => (history.length > 1 ? history.back() : go(route.tab || 'monitor'));
}

function renderTabs(active) {
  $('#tabs').innerHTML = TABS.map((t) => str(html`
    <a class="tab" href="#/${t.id}" ${t.id === active ? { __raw: 'aria-current="page"' } : ''}>
      <span class="pill">${{ __raw: icon(t.icon) }}</span>${t.label}
    </a>`)).join('');
}

async function show() {
  const id = ++renderId;
  const { name, params } = parseHash();
  const route = ROUTES[name];
  const s = await store.settings();
  if (!s.babyName) return welcome();

  renderTopbar(route);
  renderTabs(route.tab);
  cleanup?.();
  cleanup = null;
  const view = $('#view');
  view.innerHTML = '';
  let mod;
  try {
    mod = await route.load();
  } catch (e) {
    console.error(e);
    view.innerHTML = '<div class="empty">This screen could not be loaded.</div>';
    return;
  }
  if (id !== renderId) return;
  window.scrollTo(0, 0);
  cleanup = (await mod.render(view, { name, params, go })) || null;
}

function welcome() {
  $('#topbar').innerHTML = '';
  $('#tabs').innerHTML = '';
  const view = $('#view');
  view.innerHTML = str(html`
    <section class="welcome">
      <img class="logo" src="assets/nila-logo.svg" alt="">
      <h2>Welcome to Nila</h2>
      <p>A baby monitor on the phone or laptop you already have. It hears a cry, tries to settle her, checks whether that worked, and only then wakes you. Everything stays on this device.</p>
      <form id="welcome-form">
        <label class="field"><span>Baby's name</span><input class="input" name="name" required autocomplete="off" placeholder="Meera"></label>
        <label class="field"><span>Date of birth</span><input class="input" name="birth" type="date" required></label>
        <button class="btn primary" type="submit">Start</button>
      </form>
      <p class="small faint" style="margin-top:18px">Nila helps you notice and record. It does not diagnose, and it is not a breathing monitor.</p>
    </section>`);
  const max = new Date();
  view.querySelector('[name=birth]').max = max.toISOString().slice(0, 10);
  view.querySelector('form').onsubmit = async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    await store.saveSettings({ babyName: String(f.get('name')).trim(), birthDate: f.get('birth') });
    show();
  };
}

store.onChange((what) => {
  if (what === 'all') location.reload();
});

window.addEventListener('hashchange', show);
store.settings().then((s) => {
  applyTheme(s);
  show();
});
