const Store = {
  KEYS: {
    THEME: "ca_theme",
    FONT_SCALE: "ca_font_scale",
    BOOKMARKS: "ca_bookmarks",
    DISCLAIMER: "ca_disclaimer_accepted"
  },

  getTheme() {
    return localStorage.getItem(this.KEYS.THEME) || "system";
  },
  setTheme(value) {
    localStorage.setItem(this.KEYS.THEME, value);
  },

  getFontScale() {
    const v = parseFloat(localStorage.getItem(this.KEYS.FONT_SCALE));
    return Number.isFinite(v) ? v : 1;
  },
  setFontScale(value) {
    localStorage.setItem(this.KEYS.FONT_SCALE, String(value));
  },

  getBookmarks() {
    try {
      return JSON.parse(localStorage.getItem(this.KEYS.BOOKMARKS)) || [];
    } catch (e) {
      return [];
    }
  },
  saveBookmarks(list) {
    localStorage.setItem(this.KEYS.BOOKMARKS, JSON.stringify(list));
  },
  isBookmarked(id) {
    return this.getBookmarks().some(b => b.id === id);
  },
  toggleBookmark(entry) {
    const list = this.getBookmarks();
    const idx = list.findIndex(b => b.id === entry.id);
    if (idx >= 0) {
      list.splice(idx, 1);
      this.saveBookmarks(list);
      return false;
    } else {
      list.unshift({ ...entry, addedAt: Date.now() });
      this.saveBookmarks(list);
      return true;
    }
  },

  hasAcceptedDisclaimer() {
    return localStorage.getItem(this.KEYS.DISCLAIMER) === "1";
  },
  acceptDisclaimer() {
    localStorage.setItem(this.KEYS.DISCLAIMER, "1");
  }
};
