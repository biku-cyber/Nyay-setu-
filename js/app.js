const LEVEL_LABEL = {
  parts: "অংশ", articles: "অনুচ্ছেদ", clauses: "খণ্ড",
  chapters: "অধ্যায়", sections: "ধাৰা",
  schedules: "অনুসূচী", amendments: "সংশোধনী", case_studies: "গোচৰ"
};
const EXTRA_TILE_META = {
  preamble: { icon: "scroll", label: "প্ৰস্তাৱনা" },
  parts: { icon: "layers", label: "অংশসমূহ" },
  chapters: { icon: "layers", label: "অধ্যায়সমূহ" },
  schedules: { icon: "schedule", label: "অনুসূচী" },
  amendments: { icon: "amendment", label: "সংশোধনী" },
  case_studies: { icon: "case", label: "গুৰুত্বপূৰ্ণ গোচৰ" }
};

const screenEl = document.getElementById("screen");
const topbarEl = document.getElementById("topbar");
const bottomNavEl = document.getElementById("bottomNav");
const toastEl = document.getElementById("toast");

let currentReadingCtx = null; // { law, node, bookmarkId, siblings, index }

/* ---------------- Utility ---------------- */

function navigate(path) { location.hash = "#/" + path; }
function goBack() { history.back(); }
function segments() {
  return location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
}
function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toastEl.classList.remove("show"), 2200);
}
function esc(s) {
  return String(s || "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/* ---------------- Theme & font ---------------- */

function applyTheme() {
  const pref = Store.getTheme();
  const isDark = pref === "dark" || (pref === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
}
function applyFontScale() {
  const scale = Store.getFontScale();
  document.documentElement.style.setProperty("--reading-size", (18 * scale).toFixed(1) + "px");
}
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
  if (Store.getTheme() === "system") applyTheme();
});

/* ---------------- Topbar ---------------- */

function renderTopbar(mode) {
  if (mode === "home") {
    topbarEl.innerHTML = `
      <button class="icon-btn" id="btnExit" aria-label="প্ৰস্থান">${icon("back")}</button>
      <button class="icon-btn" id="btnSettings" aria-label="ছেটিংছ">${icon("settings")}</button>`;
    document.getElementById("btnExit").onclick = () => {
      try { window.close(); } catch (e) {}
      showToast("এপ্‌টো বন্ধ কৰিবলৈ ডিভাইচৰ Back বা Home বুটাম ব্যৱহাৰ কৰক");
    };
    document.getElementById("btnSettings").onclick = () => navigate("settings");
  } else {
    topbarEl.innerHTML = `
      <button class="icon-btn" id="btnBack" aria-label="উভতি যাওক">${icon("back")}</button>
      <button class="icon-btn" id="btnSearch" aria-label="সন্ধান">${icon("search")}</button>`;
    document.getElementById("btnBack").onclick = goBack;
    document.getElementById("btnSearch").onclick = openSearch;
  }
}

/* ---------------- Home screen ---------------- */

const DASHBOARD_TILES = [
  { icon: "scroll", label: "প্ৰস্তাৱনা", path: "law/constitution/preamble" },
  { icon: "layers", label: "অংশসমূহ", path: "law/constitution/parts" },
  { icon: "schedule", label: "অনুসূচী", path: "law/constitution/schedules" },
  { icon: "amendment", label: "সংশোধনী", path: "law/constitution/amendments" },
  { icon: "case", label: "গুৰুত্বপূৰ্ণ গোচৰ", path: "law/constitution/case_studies" },
  { icon: "bookmark", label: "বুকমাৰ্ক", path: "bookmarks" }
];

async function renderHome() {
  renderTopbar("home");
  bottomNavEl.classList.add("hidden");
  const laws = await DataLoader.getIndex();
  screenEl.innerHTML = `
    <div class="dashboard-grid">
      ${DASHBOARD_TILES.map(t => `
        <button class="dash-tile" data-nav="${t.path}">
          ${icon(t.icon)}
          <span>${t.label}</span>
        </button>`).join("")}
    </div>
    <div class="section-label">আইন গ্ৰন্থাগাৰ</div>
    <div class="library-list">
      ${laws.map(l => `
        <button class="library-item" data-nav="law/${l.id}">
          ${icon(l.icon)}
          <span class="name">${l.name_as}</span>
          ${l.status === "coming_soon" ? `<span class="status-badge">শীঘ্রে আহিব</span>` : ""}
        </button>`).join("")}
    </div>`;
  bindNavButtons();
}

/* ---------------- Law overview (generic) ---------------- */

async function renderLawOverview(lawId) {
  renderTopbar("sub");
  bottomNavEl.classList.add("hidden");
  const index = await DataLoader.getIndex();
  const meta = index.find(l => l.id === lawId);
  if (!meta) return renderNotFound();

  // Laws with no "extras" (chapters-only codes) skip straight to their
  // primary hierarchy list — nothing else to show on an overview page.
  if (!meta.extras || meta.extras.length === 0) {
    return renderHierarchyList(lawId, meta.hierarchy[0], null);
  }

  screenEl.innerHTML = `
    <h1 class="page-title">${meta.name_as}</h1>
    ${meta.status === "coming_soon" ? `<p class="page-subtitle">বিষয়বস্তু সোনকালে যোগ কৰা হ'ব</p>` : ""}
    <div class="dashboard-grid" style="margin-top:16px">
      ${meta.extras.map(key => {
        const m = EXTRA_TILE_META[key] || { icon: "document", label: key };
        return `<button class="dash-tile" data-nav="law/${lawId}/${key}">${icon(m.icon)}<span>${m.label}</span></button>`;
      }).join("")}
    </div>`;
  bindNavButtons();
}

function renderNotFound() {
  screenEl.innerHTML = `<div class="empty-state">${icon("info")}<p>পৃষ্ঠাখন পোৱা নগ'ল।</p></div>`;
}

/* ---------------- Generic hierarchy list screens ---------------- */
/* Handles: parts-list, articles-list-within-part, clauses-list-within-article,
   chapters-list, sections-list-within-chapter, schedules/amendments/case_studies lists */

async function renderHierarchyList(lawId, levelKey, parentIds) {
  renderTopbar("sub");
  bottomNavEl.classList.add("hidden");
  const law = await DataLoader.getLaw(lawId);
  let items = [];
  let title = law.name_as;

  if (levelKey === "parts") {
    items = (law.parts || []).map(p => ({ badge: `অংশ ${p.number}`, title: p.title_as, path: `law/${lawId}/parts/${p.id}` }));
    title = "অংশসমূহ";
  } else if (levelKey === "articles") {
    const part = (law.parts || []).find(p => p.id === parentIds[0]);
    if (!part) return renderNotFound();
    items = (part.articles || []).map(a => ({ badge: `অনুচ্ছেদ ${a.number}`, title: a.title_as, path: `law/${lawId}/parts/${part.id}/${a.id}` }));
    title = `অংশ ${part.number}: ${part.title_as || ""}`;
  } else if (levelKey === "chapters") {
    items = (law.chapters || []).map(c => ({ badge: `অধ্যায় ${c.number}`, title: c.title_as, path: `law/${lawId}/chapters/${c.id}` }));
    title = "অধ্যায়সমূহ";
  } else if (levelKey === "sections") {
    const chapter = (law.chapters || []).find(c => c.id === parentIds[0]);
    if (!chapter) return renderNotFound();
    items = (chapter.sections || []).map(s => ({ badge: `ধাৰা ${s.number}`, title: s.title_as, path: `law/${lawId}/chapters/${chapter.id}/${s.id}` }));
    title = `অধ্যায় ${chapter.number}: ${chapter.title_as || ""}`;
  } else if (levelKey === "schedules") {
    items = (law.schedules || []).map(s => ({ badge: "অনুসূচী", title: s.title_as, path: `law/${lawId}/schedules/${s.id}` }));
    title = "অনুসূচী";
  } else if (levelKey === "amendments") {
    items = (law.amendments || []).map(a => ({ badge: "সংশোধনী", title: a.title_as, path: `law/${lawId}/amendments/${a.id}` }));
    title = "সংশোধনী";
  } else if (levelKey === "case_studies") {
    items = (law.case_studies || []).map(c => ({ badge: "গোচৰ", title: c.title_as, path: `law/${lawId}/case_studies/${c.id}` }));
    title = "গুৰুত্বপূৰ্ণ গোচৰ";
  }

  screenEl.innerHTML = `
    <h1 class="page-title">${title}</h1>
    ${items.length === 0 ? `
      <div class="empty-state">
        ${icon("info")}
        <p>${law.content_note || "বিষয়বস্তু সোনকালে যোগ কৰা হ'ব।"}</p>
      </div>` : `
      <div class="nav-list">
        ${items.map(it => `
          <button class="nav-row" data-nav="${it.path}">
            <span class="badge">${esc(it.badge)}</span>
            <span class="title">${esc(it.title)}</span>
            <span class="chev">${icon("chevron")}</span>
          </button>`).join("")}
      </div>`}`;
  bindNavButtons();
}

/* ---------------- Reading screen ---------------- */

function flattenArticles(law) {
  const rows = [];
  (law.parts || []).forEach(part => {
    (part.articles || []).forEach(a => {
      rows.push({ path: `law/${law.id}/parts/${part.id}/${a.id}`, node: a, kind: "article" });
    });
  });
  return rows;
}
function flattenSections(law) {
  const rows = [];
  (law.chapters || []).forEach(ch => {
    (ch.sections || []).forEach(s => {
      rows.push({ path: `law/${law.id}/chapters/${ch.id}/${s.id}`, node: s, kind: "section" });
    });
  });
  return rows;
}
function flattenSimpleList(law, key) {
  return (law[key] || []).map(n => ({ path: `law/${law.id}/${key}/${n.id}`, node: n, kind: key }));
}

// Single source of truth for a reading node's canonical path — used for
// both bookmark storage and sibling (prev/next) matching so the two never
// drift out of sync.
function canonicalReadingPath(lawId, kind, parentIds, leafId) {
  if (kind === "preamble") return `law/${lawId}/preamble`;
  if (kind === "article") return `law/${lawId}/parts/${parentIds[0]}/${leafId}`;
  if (kind === "section") return `law/${lawId}/chapters/${parentIds[0]}/${leafId}`;
  return `law/${lawId}/${kind}/${leafId}`; // schedules / amendments / case_studies
}

async function renderReading(lawId, kind, parentIds, leafId) {
  renderTopbar("sub");
  const law = await DataLoader.getLaw(lawId);
  let node, bookmarkId, refLabel, siblings;

  if (kind === "preamble") {
    node = law.preamble;
    bookmarkId = `${lawId}/preamble`;
    refLabel = "প্ৰস্তাৱনা";
    siblings = null;
  } else if (kind === "article") {
    const part = (law.parts || []).find(p => p.id === parentIds[0]);
    node = part && (part.articles || []).find(a => a.id === leafId);
    bookmarkId = `law/${lawId}/parts/${parentIds[0]}/${leafId}`;
    refLabel = node ? `অনুচ্ছেদ ${node.number}` : "";
    siblings = flattenArticles(law);
  } else if (kind === "section") {
    const chapter = (law.chapters || []).find(c => c.id === parentIds[0]);
    node = chapter && (chapter.sections || []).find(s => s.id === leafId);
    bookmarkId = `law/${lawId}/chapters/${parentIds[0]}/${leafId}`;
    refLabel = node ? `ধাৰা ${node.number}` : "";
    siblings = flattenSections(law);
  } else if (kind === "schedules" || kind === "amendments" || kind === "case_studies") {
    node = (law[kind] || []).find(n => n.id === leafId);
    bookmarkId = `law/${lawId}/${kind}/${leafId}`;
    refLabel = LEVEL_LABEL[kind];
    siblings = flattenSimpleList(law, kind);
  }

  if (!node) return renderNotFound();

  const bookmarked = Store.isBookmarked(bookmarkId);
  const wakeSupported = WakeLock.isSupported();

  screenEl.innerHTML = `
    <div class="reading-toolbar">
      <button class="icon-btn" id="btnPlay">${icon("play")}</button>
      <button class="icon-btn" id="btnTranslate">${icon("translate")}</button>
      <div class="spacer"></div>
      <button class="icon-btn ${bookmarked ? "active" : ""}" id="btnBookmark">${icon(bookmarked ? "bookmarkFilled" : "bookmark")}</button>
      <button class="icon-btn ${WakeLock.active ? "active" : ""}" id="btnWake">${icon("wake")}</button>
    </div>
    <div class="reading-body">
      <div class="ref-label">${esc(law.name_as)} · ${esc(refLabel)}</div>
      <h1 class="ref-title">${esc(node.title_as || "")}</h1>
      <div class="ref-text">${esc(node.text_as || "")}</div>
      ${node.explanation_as ? `<div class="aux-block"><span class="aux-label">ব্যাখ্যা</span><div class="aux-text">${esc(node.explanation_as)}</div></div>` : ""}
      ${node.example_as ? `<div class="aux-block"><span class="aux-label">উদাহৰণ</span><div class="aux-text">${esc(node.example_as)}</div></div>` : ""}
      ${node.source || node.source_note ? `<div class="source-line">${esc(node.source || "")}${node.source_note ? " — " + esc(node.source_note) : ""}</div>` : ""}
    </div>`;

  bottomNavEl.classList.remove("hidden");
  const thisPath = canonicalReadingPath(lawId, kind, parentIds, leafId);
  const curIndex = siblings ? siblings.findIndex(s => s.path === thisPath) : -1;
  const prevItem = siblings && curIndex > 0 ? siblings[curIndex - 1] : null;
  const nextItem = siblings && curIndex >= 0 && curIndex < siblings.length - 1 ? siblings[curIndex + 1] : null;

  bottomNavEl.innerHTML = `
    <button id="btnPrev" ${!prevItem ? "disabled" : ""}>${icon("back")}<span>পূৰ্বৱৰ্তী</span></button>
    <button id="btnAI" class="primary">${icon("sparkles")}<span>AI সহায়ক</span></button>
    <button id="btnNext" ${!nextItem ? "disabled" : ""}>${icon("chevron")}<span>পৰৱৰ্তী</span></button>`;

  document.getElementById("btnPrev").onclick = () => prevItem && navigate(prevItem.path);
  document.getElementById("btnNext").onclick = () => nextItem && navigate(nextItem.path);
  document.getElementById("btnAI").onclick = () => showToast("AI সহায়ক শীঘ্রে আহিব");
  document.getElementById("btnTranslate").onclick = () => showToast("অনুবাদ সুবিধা শীঘ্রে আহিব");

  document.getElementById("btnBookmark").onclick = () => {
    const nowBookmarked = Store.toggleBookmark({
      id: bookmarkId, path: thisPath,
      lawName: law.name_as, title: node.title_as || refLabel, refLabel
    });
    showToast(nowBookmarked ? "বুকমাৰ্ক কৰা হ'ল" : "বুকমাৰ্ক আঁতৰোৱা হ'ল");
    renderReading(lawId, kind, parentIds, leafId);
  };

  const btnWake = document.getElementById("btnWake");
  btnWake.onclick = async () => {
    if (!wakeSupported) return showToast("এই ব্ৰাউজাৰত এই সুবিধা উপলব্ধ নাই");
    if (WakeLock.active) { await WakeLock.disable(); } else { await WakeLock.enable(); }
    renderReading(lawId, kind, parentIds, leafId);
  };

  const btnPlay = document.getElementById("btnPlay");
  if (!TTS.isSupported()) {
    btnPlay.disabled = true;
  } else {
    btnPlay.onclick = () => {
      if (TTS.speaking) {
        TTS.stop();
        btnPlay.innerHTML = icon("play");
      } else {
        const spoken = [node.title_as, node.text_as].filter(Boolean).join(". ");
        TTS.speak(spoken, () => { btnPlay.innerHTML = icon("play"); });
        btnPlay.innerHTML = icon("pause");
      }
    };
  }
}

/* ---------------- Bookmarks screen ---------------- */

function renderBookmarks() {
  renderTopbar("sub");
  bottomNavEl.classList.add("hidden");
  const list = Store.getBookmarks();
  screenEl.innerHTML = `
    <h1 class="page-title">বুকমাৰ্ক</h1>
    ${list.length === 0 ? `
      <div class="empty-state">${icon("bookmark")}<p>আপুনি এতিয়ালৈকে একো বুকমাৰ্ক কৰা নাই।</p></div>` : `
      <div class="nav-list">
        ${list.map(b => `
          <button class="nav-row" data-nav="${b.path}">
            <span class="badge">${esc(b.refLabel || "")}</span>
            <span class="title">${esc(b.title)} <span style="color:var(--ink-soft);font-size:12px">— ${esc(b.lawName)}</span></span>
            <span class="chev">${icon("chevron")}</span>
          </button>`).join("")}
      </div>`}`;
  bindNavButtons();
}

/* ---------------- Search ---------------- */

const searchOverlay = document.getElementById("searchOverlay");
function openSearch() {
  searchOverlay.classList.remove("hidden");
  const input = document.getElementById("searchInput");
  input.value = "";
  document.getElementById("searchResults").innerHTML = `<div class="search-empty">অনুচ্ছেদ, ধাৰা, অধ্যায় বা বিষয়বস্তু সন্ধান কৰক</div>`;
  input.focus();
}
function closeSearch() { searchOverlay.classList.add("hidden"); }

document.getElementById("btnSearchClose").onclick = closeSearch;
document.getElementById("searchInput").addEventListener("input", async (e) => {
  const term = e.target.value;
  const resultsEl = document.getElementById("searchResults");
  if (!term.trim()) {
    resultsEl.innerHTML = `<div class="search-empty">অনুচ্ছেদ, ধাৰা, অধ্যায় বা বিষয়বস্তু সন্ধান কৰক</div>`;
    return;
  }
  const results = await Search.query(term);
  resultsEl.innerHTML = results.length === 0
    ? `<div class="search-empty">কোনো ফলাফল পোৱা নগ'ল</div>`
    : results.map(r => `
        <button class="search-result-item" data-search-nav="${r.path}">
          <div class="src">${esc(r.breadcrumb)}</div>
          <div class="snip">${esc(r.title)}</div>
        </button>`).join("");
  resultsEl.querySelectorAll("[data-search-nav]").forEach(btn => {
    btn.onclick = () => { closeSearch(); navigate(btn.dataset.searchNav); };
  });
});

/* ---------------- Settings ---------------- */

const FONT_OPTIONS = [
  { key: "small", label: "সৰু", scale: 0.875 },
  { key: "medium", label: "মধ্যম", scale: 1 },
  { key: "large", label: "ডাঙৰ", scale: 1.15 },
  { key: "xl", label: "অতি ডাঙৰ", scale: 1.3 }
];
const INFO_PANELS = {
  privacy: { title: "গোপনীয়তা নীতি", text: "এই এপ্‌টোৱে আপোনাৰ ব্যক্তিগত তথ্য সংগ্ৰহ নকৰে। বুকমাৰ্ক আৰু ছেটিংছ কেৱল আপোনাৰ ডিভাইচতে ষ্ট'ৰ কৰা হয়।" },
  about: { title: "এপ্‌ৰ বিষয়ে", text: "অসমীয়া ভাষাত ভাৰতৰ সংবিধান আৰু মুখ্য ফৌজদাৰী আইনসমূহ সহজে পঢ়িবলৈ আৰু বুজিবলৈ প্ৰস্তুত কৰা এক শিক্ষামূলক প্ৰসংগ এপ্‌।" },
  datasource: { title: "তথ্যৰ উৎস", text: "প্ৰতিখন পৃষ্ঠাত ইয়াৰ উৎস আৰু শেষ আপডেটৰ তাৰিখ দেখুওৱা হয়। গুৰুত্বপূৰ্ণ বিষয়ত সদায় চৰকাৰী ৰাজপত্ৰ প্ৰকাশনৰ সৈতে মিলাই চাওক।" },
  licenses: { title: "মুক্ত উৎস অনুজ্ঞাপত্ৰ", text: "এই এপ্‌টো ভেনিলা HTML, CSS আৰু JavaScript ব্যৱহাৰ কৰি তৈয়াৰ কৰা হৈছে, কোনো তৃতীয়-পক্ষ ফ্ৰেমৱৰ্ক নাই।" },
  future: { title: "ভৱিষ্যতৰ সুবিধাসমূহ", text: "অনুবাদ, AI সহায়ক, অডিঅ' ব্যাখ্যা, আৰু অধিক আইন গ্ৰন্থ শীঘ্রে যোগ কৰা হ'ব।" }
};

async function renderSettings() {
  renderTopbar("sub");
  bottomNavEl.classList.add("hidden");
  const theme = Store.getTheme();
  const scale = Store.getFontScale();
  const currentFontKey = (FONT_OPTIONS.find(f => f.scale === scale) || FONT_OPTIONS[1]).key;

  screenEl.innerHTML = `
    <h1 class="page-title">ছেটিংছ</h1>

    <div class="settings-group">
      <h3>থীম</h3>
      <div class="theme-picker">
        <button data-theme-opt="light" class="${theme === "light" ? "selected" : ""}">${icon("sun")} উজ্জ্বল</button>
        <button data-theme-opt="dark" class="${theme === "dark" ? "selected" : ""}">${icon("moon")} আন্ধাৰ</button>
        <button data-theme-opt="system" class="${theme === "system" ? "selected" : ""}">${icon("monitor")} ছিষ্টেম</button>
      </div>
    </div>

    <div class="settings-group">
      <h3>ফণ্টৰ আকাৰ</h3>
      <div class="font-picker">
        ${FONT_OPTIONS.map(f => `<button data-font-opt="${f.key}" class="${f.key === currentFontKey ? "selected" : ""}">${f.label}</button>`).join("")}
      </div>
    </div>

    <div class="settings-group">
      <h3>ভাষা</h3>
      <div class="settings-row"><span class="label">এপ্‌ৰ ভাষা</span><span class="value">অসমীয়া (ভৱিষ্যতে অধিক)</span></div>
    </div>

    <div class="settings-group">
      <h3>তথ্য</h3>
      <button class="settings-row" data-info="privacy" style="width:100%"><span class="label">গোপনীয়তা নীতি</span>${icon("chevron")}</button>
      <button class="settings-row" data-info="disclaimer" style="width:100%"><span class="label">দাবী ত্যাগ</span>${icon("chevron")}</button>
      <button class="settings-row" data-info="about" style="width:100%"><span class="label">এপ্‌ৰ বিষয়ে</span>${icon("chevron")}</button>
      <button class="settings-row" data-info="datasource" style="width:100%"><span class="label">তথ্যৰ উৎস</span>${icon("chevron")}</button>
      <div class="settings-row"><span class="label">সংস্কৰণ</span><span class="value">1.0.0</span></div>
      <button class="settings-row" data-info="licenses" style="width:100%"><span class="label">মুক্ত উৎস অনুজ্ঞাপত্ৰ</span>${icon("chevron")}</button>
      <button class="settings-row" data-info="future" style="width:100%"><span class="label">ভৱিষ্যতৰ সুবিধা</span>${icon("chevron")}</button>
    </div>`;

  screenEl.querySelectorAll("[data-theme-opt]").forEach(btn => {
    btn.onclick = () => { Store.setTheme(btn.dataset.themeOpt); applyTheme(); renderSettings(); };
  });
  screenEl.querySelectorAll("[data-font-opt]").forEach(btn => {
    btn.onclick = () => {
      const opt = FONT_OPTIONS.find(f => f.key === btn.dataset.fontOpt);
      Store.setFontScale(opt.scale); applyFontScale(); renderSettings();
    };
  });
  screenEl.querySelectorAll("[data-info]").forEach(btn => {
    btn.onclick = () => {
      if (btn.dataset.info === "disclaimer") return openDisclaimer(true);
      const panel = INFO_PANELS[btn.dataset.info];
      showInfoPanel(panel.title, panel.text);
    };
  });
}

function showInfoPanel(title, text) {
  screenEl.innerHTML = `
    <button class="icon-btn" id="btnInfoBack" style="margin-bottom:8px">${icon("back")}</button>
    <h1 class="page-title">${esc(title)}</h1>
    <p style="line-height:1.8;color:var(--ink-soft);margin-top:12px">${esc(text)}</p>`;
  document.getElementById("btnInfoBack").onclick = renderSettings;
}

/* ---------------- Disclaimer modal ---------------- */

const disclaimerModal = document.getElementById("disclaimerModal");
function openDisclaimer(dismissible) {
  disclaimerModal.classList.remove("hidden");
  document.getElementById("disclaimerClose").classList.toggle("hidden", !dismissible);
}
document.getElementById("disclaimerAccept").onclick = () => {
  Store.acceptDisclaimer();
  disclaimerModal.classList.add("hidden");
};
document.getElementById("disclaimerClose").onclick = () => disclaimerModal.classList.add("hidden");

/* ---------------- Nav button binding & router ---------------- */

function bindNavButtons() {
  screenEl.querySelectorAll("[data-nav]").forEach(el => {
    el.onclick = () => navigate(el.dataset.nav);
  });
}

async function router() {
  const segs = segments();
  if (segs.length === 0) return renderHome();

  if (segs[0] === "bookmarks") return renderBookmarks();
  if (segs[0] === "settings") return renderSettings();

  if (segs[0] === "law" && segs[1]) {
    const lawId = segs[1];
    const rest = segs.slice(2);

    if (rest.length === 0) return renderLawOverview(lawId);

    const level = rest[0];
    if (level === "preamble") return renderReading(lawId, "preamble", [], null);
    if (level === "parts" && rest.length === 1) return renderHierarchyList(lawId, "parts", null);
    if (level === "parts" && rest.length === 2) return renderHierarchyList(lawId, "articles", [rest[1]]);
    if (level === "parts" && rest.length === 3) return renderReading(lawId, "article", [rest[1]], rest[2]);

    if (level === "chapters" && rest.length === 1) return renderHierarchyList(lawId, "chapters", null);
    if (level === "chapters" && rest.length === 2) return renderHierarchyList(lawId, "sections", [rest[1]]);
    if (level === "chapters" && rest.length === 3) return renderReading(lawId, "section", [rest[1]], rest[2]);

    if (["schedules", "amendments", "case_studies"].includes(level)) {
      if (rest.length === 1) return renderHierarchyList(lawId, level, null);
      if (rest.length === 2) return renderReading(lawId, level, [], rest[1]);
    }
  }

  return renderNotFound();
}

window.addEventListener("hashchange", router);

/* ---------------- Boot ---------------- */

(async function boot() {
  applyTheme();
  applyFontScale();
  WakeLock.bindVisibilityReacquire();

  if ("speechSynthesis" in window) {
    window.speechSynthesis.onvoiceschanged = () => {};
  }

  if (!Store.hasAcceptedDisclaimer()) openDisclaimer(false);

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("service-worker.js").catch(() => {});
  }

  await router();
})();
