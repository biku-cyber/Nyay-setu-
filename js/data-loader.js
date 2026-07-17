const DataLoader = {
  _index: null,
  _cache: {},

  async getIndex() {
    if (this._index) return this._index;
    const res = await fetch("data/laws-index.json");
    const json = await res.json();
    this._index = json.laws;
    return this._index;
  },

  async getLaw(lawId) {
    if (this._cache[lawId]) return this._cache[lawId];
    const index = await this.getIndex();
    const meta = index.find(l => l.id === lawId);
    if (!meta) throw new Error("Unknown law: " + lawId);
    const res = await fetch(meta.file);
    const data = await res.json();
    data._meta = meta;
    this._cache[lawId] = data;
    return data;
  },

  async getAllLaws() {
    const index = await this.getIndex();
    return Promise.all(index.map(l => this.getLaw(l.id)));
  }
};
