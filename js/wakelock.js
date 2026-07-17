const WakeLock = {
  sentinel: null,
  active: false,

  isSupported() {
    return "wakeLock" in navigator;
  },

  async enable() {
    if (!this.isSupported()) return false;
    try {
      this.sentinel = await navigator.wakeLock.request("screen");
      this.active = true;
      this.sentinel.addEventListener("release", () => { this.active = false; });
      return true;
    } catch (e) {
      this.active = false;
      return false;
    }
  },

  async disable() {
    if (this.sentinel) {
      try { await this.sentinel.release(); } catch (e) {}
      this.sentinel = null;
    }
    this.active = false;
  },

  // Re-acquire after tab visibility returns, since the OS releases the lock
  // when the page is hidden.
  bindVisibilityReacquire() {
    document.addEventListener("visibilitychange", async () => {
      if (this.active && document.visibilityState === "visible" && !this.sentinel) {
        await this.enable();
      }
    });
  }
};
