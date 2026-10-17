// Dependency-free checks for index.html. Run with: node test/test.mjs
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import assert from "node:assert/strict";

const root = fileURLToPath(new URL("..", import.meta.url));
const html = readFileSync(root + "index.html", "utf8");
let failures = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`ok   ${name}`);
  } catch (e) {
    failures++;
    console.log(`FAIL ${name}\n     ${e.message}`);
  }
}

// Load the page's script without a DOM; it then exposes globalThis.PassGen.
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
vm.runInThisContext(script);
const { SETS, randomIndices, randomString, generate } = globalThis.PassGen;
const FULL = SETS.upper + SETS.lower + SETS.digits + SETS.symbols;

// Upper-tail p-value of the chi-square distribution (Wilson-Hilferty).
function chiSquarePValue(x, df) {
  const z = (Math.cbrt(x / df) - (1 - 2 / (9 * df))) / Math.sqrt(2 / (9 * df));
  return 0.5 * erfc(z / Math.SQRT2);
}
function erfc(x) {
  // Numerical Recipes erfc, accurate to ~1.2e-7.
  const t = 1 / (1 + 0.5 * Math.abs(x));
  const y = t * Math.exp(-x * x - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 +
    t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 +
    t * (-0.82215223 + t * 0.17087277)))))))));
  return x >= 0 ? y : 2 - y;
}
function chiSquare(text, charset) {
  const counts = new Map([...charset].map((c) => [c, 0]));
  for (const c of text) {
    assert.ok(counts.has(c), `unexpected character ${JSON.stringify(c)}`);
    counts.set(c, counts.get(c) + 1);
  }
  const expected = text.length / charset.length;
  let x = 0;
  for (const n of counts.values()) x += (n - expected) ** 2 / expected;
  const df = charset.length - 1;
  return { x, df, p: chiSquarePValue(x, df) };
}

test("source contains no Math.random", () => {
  assert.ok(!/Math\s*\.\s*random/.test(html));
});

test("CSP is default-src 'none' and hashes are current", () => {
  const csp = html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)[1];
  assert.match(csp, /^default-src 'none';/);
  assert.ok(!/unsafe-inline|unsafe-eval|https?:|\*/.test(csp), csp);
  execFileSync(process.execPath, [root + "tools/csp.mjs", "--check"], { stdio: "pipe" });
});

test("no external resources are referenced", () => {
  const refs = [...html.matchAll(/\b(?:src|href|action)\s*=\s*"([^"]*)"/g)].map((m) => m[1]);
  for (const ref of refs) {
    // The only absolute URL is the plain link to the source repo, which is never fetched.
    if (ref === "https://github.com/arturvibe/passgen") continue;
    assert.ok(ref.startsWith("data:"), `external reference: ${ref}`);
  }
  assert.ok(!/<(?:iframe|object|embed|img|video|audio|source)\b/i.test(html));
  assert.ok(!/@import|url\(/.test(html.match(/<style>([\s\S]*?)<\/style>/)[1]));
});

test("1,000,000 characters are uniform over the full set (chi-square)", () => {
  const r = chiSquare(randomString(FULL, 1_000_000), FULL);
  console.log(`     chi2=${r.x.toFixed(1)} df=${r.df} p=${r.p.toFixed(4)}`);
  assert.ok(r.p > 1e-4, `p=${r.p}`);
});

test("chi-square test detects modulo bias (sanity check of the test itself)", () => {
  const bytes = new Uint8Array(1_000_000);
  for (let i = 0; i < bytes.length; i += 65536) crypto.getRandomValues(bytes.subarray(i, i + 65536));
  let biased = "";
  for (const b of bytes) biased += FULL[b % FULL.length];
  assert.ok(chiSquare(biased, FULL).p < 1e-6);
});

test("randomIndices stays in range for awkward sizes", () => {
  for (const n of [1, 2, 3, 7, 88, 1000, 2 ** 31 + 1, 2 ** 32]) {
    for (const v of randomIndices(n, 2000)) assert.ok(Number.isInteger(v) && v >= 0 && v < n, `${v} for n=${n}`);
  }
  assert.deepEqual(randomIndices(1, 5), [0, 0, 0, 0, 0]);
});

test("generate honours length and character options", () => {
  const names = Object.keys(SETS);
  for (let mask = 1; mask < 16; mask++) {
    const opts = { length: 8 };
    names.forEach((n, i) => (opts[n] = Boolean(mask & (1 << i))));
    for (const length of [8, 20, 128]) {
      opts.length = length;
      for (let k = 0; k < 50; k++) {
        const password = generate(opts);
        assert.equal(password.length, length);
        for (const n of names) {
          const has = [...password].some((c) => SETS[n].includes(c));
          assert.equal(has, opts[n], `${n} in ${password}`);
        }
      }
    }
  }
});

test("generate rejects bad input", () => {
  assert.throws(() => generate({ length: 20 }), /at least one/);
  assert.throws(() => generate({ length: 7, lower: true }));
  assert.throws(() => generate({ length: 129, lower: true }));
});

if (failures) {
  console.log(`\n${failures} test(s) failed`);
  process.exit(1);
}
console.log("\nall tests passed");
