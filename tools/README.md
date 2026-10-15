# i18n tooling

Scripts that build and verify the Vietnamese/English switch. Everything is plain
Node — no dependencies, no build step. Run with the bundled runtime:

```
node tools/i18n-test.mjs        # dictionary + engine unit checks
node tools/i18n-coverage.mjs    # every string on the page is translated or allowlisted
node tools/extract-strings.mjs  # list every translatable string in index.html
node tools/fs-i18n-gen.mjs      # regenerate the filesystem dictionary in i18n.js
```

`i18n-coverage.mjs` reads the page live — it imports the extractor rather than
reading a cached list, so it can never report on a stale copy. Add
`--orphans` to also list dictionary keys nothing asks for any more; both
sides are whitespace-normalised before comparing, because the page wraps its
lines and uses HTML entities while `app.js` uses double spaces inside its
literals.

Browser checks drive real Chrome over the DevTools Protocol, so they catch what a
syntax check cannot — actual rendering, actual clicks:

```
node tools/pad-test.mjs         # banner frame width, English vs Vietnamese
node tools/capture-bad.mjs      # loop until a misaligned row shows up, then dump it
node tools/toggle-test.mjs      # click the button, read the page back
node tools/seed-lang-test.mjs   # a returning visitor who already chose Vietnamese
node tools/banner-debug.mjs     # raw code points and trailing-space counts per row
```

## How the switch works

`i18n.js` (in `dist/`) holds a dictionary keyed by the **English source string
itself**. A missing key falls through to English, so an untranslated line stays
readable instead of turning blank. It walks the document with a `TreeWalker`,
translating each text node from the English original kept in a `WeakMap`, then
does the same for `aria-label`, `title` and `placeholder`. `window.t()` exposes
the same table for strings that JavaScript writes into the DOM — which is all of
the terminal.

Two rules keep the box-drawing frame intact:

1. **`#termOut` is skipped** (`data-i18n-skip` in `index.html`). Every line in
   there is written at runtime through `t()` and padded to a fixed width.
   Translating it a second time would swap the text out from under the padding.
   This was a real bug: `' ' + text` keeps its trailing spaces, so a Vietnamese
   line longer than the English one came out one column past the `│`.
2. **Padding comes from the widest row**, floored at the English width, so a
   longer translation widens the frame instead of shearing it.

## Adding a string

Put the English text in `index.html` as normal, run `i18n-coverage.mjs`, and add
whatever it reports as missing to the `VI` object in `dist/i18n.js`. Strings that
JavaScript generates go through `t()` the same way. Keep interpolation split
around variables (`${t('cd: no such directory')}: ${target}`) so the keys stay
static.
