<div align="center">

<img src="docs/sappr-logo.svg" alt="sappr" width="208" />

**The pentester's web toolkit.** A fast, modern, self-hostable collection of the
tools you actually reach for: encoding/decoding, hashing, hash identification,
crypto, formatting, regex, conversions, generators and binary forensics.
Everything runs in your browser. No backend, nothing uploaded.

[![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38BDF8?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
![Tests](https://img.shields.io/badge/tests-303_passing-3fb950?style=flat-square&logo=vitest&logoColor=white)
![Runs](https://img.shields.io/badge/runs-in_your_browser-6d4aff?style=flat-square)
![License](https://img.shields.io/badge/license-AGPL_v3-3fb950?style=flat-square)
![Use](https://img.shields.io/badge/use-authorized_testing_only-d73a49?style=flat-square)

</div>

> Status: the complete **client-side** toolset (the 1.0 line). An optional backend
> (WHOIS/RDAP, passive DNS, server-backed auth, update checks) and a one-image
> Docker deployment are the planned 2.0 phase (see [Roadmap](#roadmap)).

## Features

- **Encode / Decode**: Base64 · Base32 · Base58 · Hex · URL encode · URL parse · HTML entities · JWT decoder · **Magic** auto-decoder
- **Crypto**: hash text (MD5 → SHA-3 / BLAKE2) · HMAC · streamed file hashing · **hash-type identifier** · AES encrypt/decrypt · XOR · ROT/Caesar · classical ciphers
- **Format**: multi-language beautifier (JSON · YAML · XML · SQL · JS/TS · HTML · CSS/SCSS/LESS · GraphQL · Markdown) · dedicated JSON & SQL formatters · convert between JSON / YAML / CSV / TOML
- **Regex**: live tester with match highlighting · plain-English explainer
- **Convert**: Unix timestamps · number-base converter · text diff · Unicode inspector
- **Generate**: UUID / ULID · secure passwords · random tokens · QR codes
- **Forensics**: `strings`-style printable extraction from any file · QR decode from an image

Every tool is a self-contained folder under [`src/tools/`](src/tools/); dropping
a new one in registers it automatically across the nav, palette and launcher.

## Settings & access

A settings menu (top-right) persists your choices locally:

- **Theme**: light / dark / automatic.
- **Cracking tool**: hashcat, John, or both. The Hash Identifier tailors the
  commands and flags it generates to your choice.
- **Password gate** *(optional)*: lock the instance behind a password. The
  password is stored **only as an Argon2id hash** (random salt) in `localStorage`,
  never in recoverable form, and you pick how often you're re-prompted
  (every launch / daily / weekly). It enforces a 10-character minimum with
  upper / number / special requirements.

  > ⚠️ Because 1.0 is 100% client-side, the password gate is a **deterrent, not a
  > hard boundary**. Anyone with devtools or filesystem access to the machine can
  > bypass a client-side check. For real enforcement on a shared instance, put it
  > behind your reverse proxy (basic-auth / SSO); server-backed auth is planned
  > for 2.0.

## Hash identification

The Hash Identifier recognizes credentials and raw hashes across Active Directory
/ Kerberos (Kerberoast & AS-REP), NetNTLM, `/etc/shadow`, databases,
network devices, documents, archives and many raw-hash formats. For each likely
match it emits a ready-to-run **hashcat** (`-m …`) and/or **John** (`--format=…`)
command. It flags malformed input instead of guessing on a prefix alone, and you
can attach a wordlist, rules file, and GPU / workload / fork options right from
the UI.

It bundles hashcat's authoritative mode → name → example table
(`src/tools/hash-id/hashcat-modes.generated.ts`, pulled from hashcat's
MIT-licensed [example_hashes](https://hashcat.net/wiki/doku.php?id=example_hashes)).
Run `npm run update:hash-defs` to refresh it; the script also cross-checks our
curated detectors against the authoritative list and flags any mode mismatches.

## Tech stack

Vite · React 18 · TypeScript · Tailwind CSS v4 (OKLCH tokens) · cmdk · lucide ·
[hash-wasm](https://github.com/Daninet/hash-wasm) (hashing + Argon2id) ·
self-hosted variable fonts (offline-safe). Heavy work is code-split per tool and
moves into Web Workers where it matters.

## Download & run (no build)

Most people don't need to build anything. Grab the prebuilt bundle from the
[latest release](https://github.com/joshuaruppe/sappr/releases/latest) and unzip
it. Then, from inside the folder, serve it with any static web server:

```bash
npx serve                    # Node (Windows, macOS, Linux)
python -m http.server 8000   # Python (use python3 on macOS/Linux)
```

Then open the printed URL, or point nginx / Caddy at the folder. Routing is
hash-based, so **no rewrite rules are needed**, and each release ships a `.sha256`
to verify the download.

## Build & run from source

Requires **Node 20+** (Node 24 LTS recommended).

```bash
npm install
npm run dev        # dev server at http://localhost:5173 (hot reload)
```

Production build (static files, host them anywhere):

```bash
npm run build      # type-checks then builds to ./dist
npm run preview    # serve the built ./dist locally to verify
```

The contents of `dist/` are fully static. Drop them behind any web server
(nginx, Caddy, `python -m http.server`, GitHub Pages, etc.). Because routing is
hash-based, **no server rewrite rules are needed**.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Typecheck + production build to `dist/` |
| `npm run preview` | Preview the production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Run the Vitest unit tests |
| `npm run update:hash-defs` | Re-pull hashcat's mode table into the Hash Identifier |

## Adding a tool

See [docs/AUTHORING_TOOLS.md](docs/AUTHORING_TOOLS.md). In short: create
`src/tools/<id>/` with `meta.ts`, `Tool.tsx`, `logic.ts` and `logic.test.ts`,
following the `base64` reference. No central registration needed.

## Privacy

Every tool runs entirely client-side: there is no backend, and nothing you paste
or upload leaves your browser. The optional password gate is local too (an
Argon2id hash in `localStorage`). Note that browser-side hashing/crypto is for
tooling and analysis, not a substitute for audited production key handling.

## Roadmap

- [x] Foundation: auto-discovering registry, theming, command palette, shareable hash-routing
- [x] Client-side toolset: encode · crypto · format · regex · convert · generate · forensics
- [x] Settings (theme, cracker choice) + optional Argon2id password gate
- [ ] Network tools (IP/CIDR/MAC/UA parsing, DoH); category is currently a placeholder
- [ ] Steganography (EXIF / LSB / magic-byte carving)
- [ ] Shareable tool-state permalinks + PWA update prompts
- [ ] AI text transform pack (Unicode tricks, emoji steganography, classical ciphers)
- [ ] Optional Go backend (WHOIS/RDAP, passive DNS/geo) + server-backed auth/SSO + `/api/update-check`
- [ ] One multi-arch Docker image (GHCR, cosign-signed) + in-app "update available" banner

## License

[GNU Affero General Public License v3.0](LICENSE) (AGPL-3.0). sappr is free and
open source: you can use, study, share and modify it. The catch that keeps it
open: if you distribute it, or run a modified version as a network service, you
must release your full source under the same AGPL terms. Fork it and build on it
all you like, but your version has to stay open too.

The bundled hashcat mode table (`src/tools/hash-id/hashcat-modes.generated.ts`)
is MIT-licensed (GPL-compatible) and keeps its original terms; see
[THIRD-PARTY-LICENSES.md](THIRD-PARTY-LICENSES.md) for the full notice.
