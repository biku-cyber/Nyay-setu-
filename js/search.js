const Search = {
  _flatIndex: null,

  // Walks a law's JSON generically — works for constitution-shaped data
  // (preamble/parts/schedules/amendments/case_studies) and chapters/sections
  // shaped data alike, so a future law needs no new search code.
  _flattenLaw(law) {
    const rows = [];
    const lawName = law.name_as;
    const lawId = law.id;

    if (law.preamble && law.preamble.text_as) {
      rows.push({
        lawId, path: `${lawId}/preamble`,
        breadcrumb: `${lawName} · প্ৰস্তাৱনা`,
        title: law.preamble.title_as || "প্ৰস্তাৱনা",
        text: law.preamble.text_as
      });
    }

    (law.parts || []).forEach(part => {
      (part.articles || []).forEach(article => {
        rows.push({
          lawId, path: `${lawId}/parts/${part.id}/${article.id}`,
          breadcrumb: `${lawName} · অংশ ${part.number}`,
          title: `অনুচ্ছেদ ${article.number}: ${article.title_as || ""}`,
          text: article.text_as || ""
        });
      });
    });

    (law.chapters || []).forEach(chapter => {
      (chapter.sections || []).forEach(section => {
        rows.push({
          lawId, path: `${lawId}/chapters/${chapter.id}/${section.id}`,
          breadcrumb: `${lawName} · অধ্যায় ${chapter.number}`,
          title: `ধাৰা ${section.number}: ${section.title_as || ""}`,
          text: section.text_as || ""
        });
      });
    });

    (law.schedules || []).forEach(sch => {
      rows.push({
        lawId, path: `${lawId}/schedules/${sch.id}`,
        breadcrumb: `${lawName} · অনুসূচী`,
        title: sch.title_as || "",
        text: sch.text_as || ""
      });
    });

    (law.amendments || []).forEach(am => {
      rows.push({
        lawId, path: `${lawId}/amendments/${am.id}`,
        breadcrumb: `${lawName} · সংশোধনী`,
        title: am.title_as || "",
        text: am.text_as || ""
      });
    });

    (law.case_studies || []).forEach(cs => {
      rows.push({
        lawId, path: `${lawId}/case_studies/${cs.id}`,
        breadcrumb: `${lawName} · গুৰুত্বপূৰ্ণ গোচৰ`,
        title: cs.title_as || "",
        text: cs.text_as || ""
      });
    });

    return rows;
  },

  async buildIndex() {
    if (this._flatIndex) return this._flatIndex;
    const laws = await DataLoader.getAllLaws();
    this._flatIndex = laws.flatMap(l => this._flattenLaw(l));
    return this._flatIndex;
  },

  async query(term) {
    const index = await this.buildIndex();
    const q = term.trim().toLowerCase();
    if (!q) return [];
    return index
      .filter(row =>
        row.title.toLowerCase().includes(q) ||
        row.text.toLowerCase().includes(q) ||
        row.breadcrumb.toLowerCase().includes(q)
      )
      .slice(0, 50);
  }
};
