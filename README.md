# passgen

A password generator that runs entirely in your browser: one HTML file, no dependencies, no requests, no tracking. Works offline.

**https://passgen.fyi**

## Why trust it

- Randomness comes from `crypto.getRandomValues()` with rejection sampling, so there is no modulo bias. `Math.random()` is never used.
- A Content Security Policy of `default-src 'none'` blocks every network request. Inline code is allowed only by hash.
- GitHub Pages serves `index.html` from this repo as is, with no build step.

## Verify

- DevTools → Network shows only the HTML document.
- `node test/test.mjs` runs:
  - a chi-square test on 1M characters
  - a check that `Math.random` is absent
  - CSP and external-resource checks
  - option tests

## Develop

After editing the inline `<script>` or `<style>`, run `node tools/csp.mjs` to update the CSP hashes. The tests fail if you forget.

## License

[MIT](LICENSE)
