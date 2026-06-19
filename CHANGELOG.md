# Changelog

All notable changes to sappr are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-06-19

The first public release: the complete client-side toolset. Every tool runs
entirely in your browser. There is no backend, and nothing you paste or upload
ever leaves the page.

### Tools

Thirty-three tools, organized into seven categories. New tools are
auto-discovered from the source tree, so the set grows without any central
registration.

**Encode / Decode**
- Base64, Base32, Base58 and Hex encoders/decoders
- URL encode/decode and a full URL parser (scheme, host, path, query breakdown)
- HTML entity encode/decode
- JWT decoder (header, payload and signature, with claim inspection)
- Magic: an auto-decoder that detects and unwraps layered/unknown encodings

**Crypto**
- Hash text across the common families (MD5 through the SHA-2 and SHA-3 lines, plus BLAKE2)
- HMAC generation
- Streamed file hashing (handles large files without loading them whole)
- Hash-type identifier (see below)
- AES encrypt/decrypt
- XOR
- ROT / Caesar
- Classical ciphers

**Format**
- Multi-language beautifier covering JSON, YAML, XML, SQL, JS/TS, HTML, CSS/SCSS/LESS, GraphQL and Markdown
- Dedicated JSON and SQL formatters
- Data conversion between JSON, YAML, CSV and TOML

**Regex**
- Live tester with real-time match highlighting
- Plain-English explainer that describes what a pattern actually does

**Convert**
- Unix timestamp converter
- Number-base converter
- Text diff
- Unicode inspector (code points, names, categories, escapes)

**Generate**
- UUID and ULID
- Secure passwords
- Random tokens
- QR codes

**Forensics**
- Printable-string extraction from any file (a `strings`-style tool)
- QR decode from an image

### Hash identification

- Recognizes credentials and raw hashes across Active Directory / Kerberos
  (Kerberoast and AS-REP), NetNTLM, `/etc/shadow`, databases, network devices,
  documents, archives and many raw-hash formats.
- For each likely match it emits a ready-to-run hashcat (`-m ...`) and/or John
  (`--format=...`) command, tailored to your configured cracker.
- Reports a confidence level per match and flags malformed input instead of
  guessing from a prefix alone.
- Attach a wordlist, rules file, and GPU / workload / fork options directly in
  the UI and they are folded into the generated command.
- Bundles hashcat's authoritative mode -> name -> example table; refresh it with
  `npm run update:hash-defs`, which also cross-checks the curated detectors
  against the upstream list.

### Settings and access

- Theme: light, dark or automatic (follows the OS).
- Cracking tool: hashcat, John, or both. The Hash Identifier tailors its output
  to this choice.
- Optional password gate (Settings -> Security): locks the instance behind a
  password stored only as an Argon2id hash (random salt) in `localStorage`,
  never in recoverable form. Configurable re-prompt cadence (every launch,
  daily or weekly) and a 10-character policy with upper/number/special
  requirements. Note: because 1.0 is fully client-side, this is a deterrent, not
  a hard security boundary; real enforcement belongs behind a reverse proxy.

### Platform and experience

- Command palette (Ctrl/Cmd + K) for jumping to any tool.
- Hash-based routing, so tool state lives in the URL and needs no server rewrite
  rules to host.
- Theming built on OKLCH color tokens for consistent light/dark rendering.
- Self-hosted variable fonts, so the app works fully offline.
- Per-tool code splitting, with heavy work moved into Web Workers where it
  matters, to keep the UI responsive.

### Privacy

- 100% client-side. No backend, no telemetry, nothing uploaded. Browser-side
  hashing and crypto are provided for tooling and analysis, not as a substitute
  for audited production key handling.

### Distribution

- Ships as a prebuilt static bundle attached to each GitHub Release, with a
  `.sha256` checksum, so most users never build from source.
- Fully static output: host it behind any web server (nginx, Caddy,
  `python -m http.server`, GitHub Pages, etc.) with no rewrite rules.
- Builds are produced fresh from the tagged commit in CI, so releases are
  reproducible.

### Quality

- Backed by a unit-test suite (300+ tests) covering tool logic and regression
  cases, including a guard against a pathological regex-tester hang.

### Licensing

- Released under the GNU Affero General Public License v3.0.
- Bundles hashcat's MIT-licensed mode table; its notice is reproduced in
  [THIRD-PARTY-LICENSES.md](THIRD-PARTY-LICENSES.md).

[1.0.0]: https://github.com/joshuaruppe/sappr/releases/tag/v1.0.0
