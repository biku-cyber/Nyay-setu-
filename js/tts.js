const TTS = {
  utterance: null,
  speaking: false,

  pickVoice() {
    const voices = window.speechSynthesis ? window.speechSynthesis.getVoices() : [];
    const byPrefix = (prefix) => voices.find(v => v.lang && v.lang.toLowerCase().startsWith(prefix));
    return byPrefix("as") || byPrefix("bn") || byPrefix("hi") || voices[0] || null;
  },

  isSupported() {
    return "speechSynthesis" in window;
  },

  speak(text, onEnd) {
    if (!this.isSupported()) return false;
    this.stop();
    const u = new SpeechSynthesisUtterance(text);
    const v = this.pickVoice();
    if (v) u.voice = v;
    u.rate = 0.95;
    u.onend = () => { this.speaking = false; if (onEnd) onEnd(); };
    u.onerror = () => { this.speaking = false; if (onEnd) onEnd(); };
    this.utterance = u;
    this.speaking = true;
    window.speechSynthesis.speak(u);
    return true;
  },

  stop() {
    if (this.isSupported()) window.speechSynthesis.cancel();
    this.speaking = false;
  }
};
