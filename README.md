# সংবিধান অসম — Constitution Assam

Assamese-language legal reference PWA. Vanilla HTML/CSS/JS, no build step, no frameworks.

## Running locally

Service workers require HTTP (not `file://`), so serve the folder:

```
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## Project structure

```
index.html            App shell
manifest.json          PWA manifest
service-worker.js       Offline cache (cache-first, same-origin only)
css/styles.css          All styles — design tokens at the top
js/icons.js             SVG icon library (no emoji/PNG anywhere)
js/storage.js           localStorage: theme, font size, bookmarks, disclaimer
js/data-loader.js       Fetches + caches laws-index.json and each law's JSON
js/search.js            Generic flat-index search across every law's content
js/tts.js               Web Speech API wrapper (as → bn → hi voice fallback)
js/wakelock.js          Screen Wake Lock wrapper for "keep screen awake"
js/app.js               Router + all screen rendering
data/laws-index.json    Master registry of every law
data/constitution.json  Constitution content
data/{bns,bnss,bsa,ipc,crpc}.json   Stubs — "content coming soon"
```

## Adding a future law (no code changes needed)

1. Add an entry to `data/laws-index.json`:
   - `hierarchy`: the drill-down chain, e.g. `["chapters","sections"]`
   - `extras`: only needed for constitution-like documents with a preamble/
     schedules/amendments/case studies; leave `[]` for a plain chapters→sections code
2. Create `data/<id>.json` following the shape of the existing files.
3. That's it — home screen, search, bookmarks, and navigation all pick it up
   automatically because the UI reads structure from the data, not from
   hardcoded per-law logic.

## Adding content to the Constitution or the five stubbed codes

Populate the relevant array in the law's JSON file (`parts` → `articles` →
optionally `clauses`, or `chapters` → `sections`, plus `schedules` /
`amendments` / `case_studies`). Each entry supports:

```json
{
  "id": "art-14", "number": "14",
  "title_as": "...", "text_as": "...",
  "explanation_as": "... (optional, only for important/difficult provisions)",
  "example_as": "... (optional)",
  "source": "...", "source_note": "...", "verified": false
}
```

**Important:** only the Preamble currently holds real content, sourced from
a public educational reference (SATHEE, IIT Kanpur) and explicitly flagged
`"verified": false` pending cross-check against the official Government
Gazette translation. I did not fabricate translations for the rest of the
Constitution or for BNS/BNSS/BSA/IPC/CrPC — accurate legal translation at
that scale needs real official source documents, not generated text. Set
`"verified": true` and update `source`/`last_updated` once you've checked
a passage against an authoritative source.

## Known simplifications in this pass

- Translate and AI Assistant are wired up as "coming soon" toasts, matching
  the spec's own "(Future Feature)" labels.
- Search overlay isn't hooked into the hardware back button (closes only
  via its own X) — everything else uses hash-based routing so back/forward
  works naturally.
- App icons are a placeholder scroll glyph in the brand colors — swap
  `icons/icon-*.png` for real artwork whenever you have it.
