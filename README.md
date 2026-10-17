# passgen

A password generator that runs entirely in your browser. It is one self-contained HTML file with no dependencies, no network requests and no tracking, and it works offline.

**Live page:** https://arturvibe.github.io/passgen/

## Why trust it

- **Cryptographic randomness.** Every character comes from `crypto.getRandomValues()`, the browser's built-in cryptographic random number generator. `Math.random()` is never used.
- **No modulo bias.** Random 32-bit values are mapped to characters with rejection sampling: values at or above the largest multiple of the character-set size are discarded, so every character is exactly equally likely.
- **Every selected type appears.** When several character types are selected, a password that lacks one of them is thrown away and redrawn as a whole. This keeps every valid password equally likely, which is not the case when a missing character is patched in afterwards.
- **The page cannot make requests.** A Content Security Policy of `default-src 'none'` blocks every fetch, image, font, frame and form submission. The single inline script and stylesheet are allowed by their SHA-256 hashes only, and `'unsafe-inline'` is never used.
- **Nothing to download.** No external scripts, fonts or images. The favicon is a `data:` URI.
- **What you read is what is served.** GitHub Pages publishes `index.html` straight from this repo with no build step (see [`.github/workflows/pages.yml`](.github/workflows/pages.yml)).

## Use it offline

Save the page (Ctrl+S / ⌘S, or download [`index.html`](index.html)) and open the file from disk. It works the same way.

## Features

- Length from 8 to 128 characters (default 20)
- Toggles for uppercase, lowercase, digits and symbols (`!#$%&()*+,-./:;<=>?@[]^_{|}~`)
- A new password on load and on every option change
- Copy button that uses the Clipboard API and falls back to selecting the text
- Works on mobile, with a light or dark theme that follows your system setting

## Verify it yourself

1. Open DevTools → **Network**, then reload. The only entry is the HTML document.
2. Search the source for `Math.random`. It doesn't appear.
3. Run the tests (Node 18+, no install needed):

   ```sh
   node test/test.mjs
   ```

   The tests check that:
   - the source contains no `Math.random`
   - the CSP is `default-src 'none'` with up-to-date hashes and no `unsafe-*` or remote sources
   - the page references no external resources
   - a chi-square test on 1,000,000 generated characters finds a uniform distribution, plus a control test showing that a naive `byte % n` generator fails it
   - every length and character-type combination behaves correctly
4. Run Lighthouse in Chrome DevTools. It reports no third-party requests and no cookies.

## Development

Because the CSP pins the exact bytes of the inline `<script>` and `<style>`, any edit to either one changes its hash. After editing, run:

```sh
node tools/csp.mjs           # rewrite the hashes in index.html
node tools/csp.mjs --check   # CI runs this through the tests
```

If you forget, the browser blocks the script or styles and the tests fail.

### Deploying

In the repo's **Settings → Pages**, set **Source** to **GitHub Actions**. Every push to `main` then runs the tests and publishes the page.

## License

[MIT](LICENSE)
