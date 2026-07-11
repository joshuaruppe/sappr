# Changelog

All notable changes to sappr are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.9.0] - 2026-07-11

### Added

- **Red Team** - a new top-level category for offensive infrastructure and analysis
  utilities, all client-side:
  - **Redirector Generator** - turn a Cobalt Strike malleable C2 profile (or manual
    URIs + User-Agent) into ready-to-paste nginx and Apache mod_rewrite redirector
    configs: forward matching beacon traffic to the team server, 302 everything else
    to a decoy, with an optional scanner/sandbox User-Agent blocklist.
  - **C2 Profile Linter** - static analysis of a malleable profile (the c2lint job):
    pulls out sleep/jitter, User-Agent, staging, pipe name and GET/POST URIs and flags
    OPSEC red flags (noisy sleep/jitter, staging left on, a default UA / pipe / cert).
  - **Vulnerable Driver Lookup** - check a Windows driver by hash or filename against
    the bundled LOLDrivers catalog (660 drivers): category, whether it loads despite
    HVCI, and the matching sample hashes.
- **Email Header Analyzer** (Forensics) - trace an email's Received hop chain with
  per-hop delays, read the SPF/DKIM/DMARC results, and flag phishing tells (auth
  failures, From vs Return-Path / Reply-To domain mismatches).

### Changed

- Added `npm run update:loldrivers` to rebuild the vulnerable-driver dataset from the
  public LOLDrivers catalog.

## [1.8.0] - 2026-07-11

### Added

- A "Load sample" button on ~29 more tools (encode / format / convert, crypto and
  hash, and the Windows and value decoders). Each loads a realistic, pentest-flavored
  example that exercises the tool: an NTLM hash for the hash identifier, an
  AS-REP-roastable userAccountControl, a Vigenere cipher message, an email-harvesting
  regex with named groups, a dangerous-ACL SDDL, and so on. Nobody memorizes 60-plus
  input formats.

### Changed

- Swept em-dashes out of all user-facing copy and source in favor of plain punctuation.
- Replaced the Kerberos ticket sample and test fixture with a fully synthetic,
  fabricated `.kirbi`, so no third-party lab material ships in the repo.

## [1.7.0] - 2026-07-10

### Added

- **Network** - the category is now populated with two tools pentesters actually
  reach for (the network-engineer filler like subnet math is deliberately left out):
  - **Scope Cleanup** - paste a messy engagement scope (any mix of CIDRs, hyphen
    ranges, nmap-style short ranges, single IPs, URLs, `host:port`, IPv6 and
    hostnames, with dupes and junk) and get it back clean and deduped in the form
    you need: every IPv4 host one-per-line for `nmap -iL`, the minimal set of
    aggregated CIDRs, or a single nmap-ready target string. IPv4 is modeled as
    merged integer intervals, so a `/8` doesn't blow up and CIDR collapsing is
    exact. Nothing is dropped silently - unrecognized tokens are surfaced.
  - **MAC Vendor Lookup** - extract every MAC from pasted text (colon, hyphen,
    Cisco dotted or bare-hex - so `arp -a` / `ip neigh` dumps work as-is) and
    resolve each to its IEEE-registered vendor from the bundled OUI registry
    (~53k MA-L/MA-M/MA-S prefixes, most-specific block wins). Decodes the
    unicast/multicast and universal/local bits, flagging randomized or private
    MACs (modern iOS/Android privacy, VMs, virtual interfaces) that have no real
    hardware vendor.

### Changed

- Added a `npm run update:oui` script that rebuilds the MAC vendor dataset from
  the public IEEE registries (MA-L/MA-M/MA-S).

## [1.6.0] - 2026-07-10

### Added

- **Reversing** - a new top-level category for binary analysis, all in the browser:
  - **ELF checksec** - an ELF's exploit-mitigation posture (RELRO, stack canary,
    NX, PIE, Fortify, RPATH/RUNPATH, stripped) with findings on what's missing.
  - **PE Inspector** - Windows PE (EXE/DLL/SYS) headers, ASLR/DEP/CFG mitigations,
    data directories (signed? .NET?), the section table with Shannon entropy, and
    the imported DLLs/APIs.
  - **Mach-O Parser** - macOS/iOS binaries (32/64-bit, both byte orders,
    fat/universal): header, load commands, segments, dylibs, UUID, signing and
    encryption state.
  - **Disassembler** - multi-architecture (x86/x64/ARM/ARM64/Thumb/MIPS) via
    Capstone compiled to WebAssembly; paste bytes, choose an arch, read the listing.
  - **Entropy Visualizer** - a Shannon-entropy graph over a file's length plus a
    byte histogram, to spot packed/compressed/encrypted regions.
  - **ASN.1 / DER Decoder** - X.509 / PKCS / CMS structures into a readable tree
    with named object identifiers; accepts hex, Base64 or PEM.

### Changed

- Added `capstone-wasm` (WASM disassembler) and `asn1js` (ASN.1 parsing) as
  dependencies, and a Vite `optimizeDeps` exclusion so the Capstone WASM loads
  correctly in dev.

## [1.5.0] - 2026-07-07

### Added

- **Forensics / DFIR** tools:
  - **IOC Defang / Refang** - defang indicators for safe sharing (hxxp, `[.]`,
    `[@]`), refang them back to live, and extract URLs, IPs, domains, emails and
    hashes from a pasted blob.
  - **LNK Parser** - parse a Windows `.lnk` shortcut (from a dropped file or
    Base64/hex): target, arguments, MAC timestamps, volume serial and UNC share,
    plus the tracker block that leaks the origin machine name + MAC address. Flags
    living-off-the-land binaries, encoded PowerShell and remote payloads.
  - **Forensic Timestamps** - decode a mystery numeric timestamp across Unix
    (s/ms/µs/ns), FILETIME, Chrome/WebKit, Mac/Cocoa, APFS, HFS+, NTP, OLE and
    packed DOS, showing every plausible date likeliest-first.
  - **EXIF / Metadata Viewer** - read EXIF/GPS/XMP/IPTC metadata from an image
    in the browser, surfacing embedded GPS location (with a map link), camera
    serial, device and editing software as privacy/OSINT findings.
- **Windows Error Code** decoder - look up a code across NTSTATUS, Win32 and
  HRESULT at once (~9,000 codes with official Microsoft messages), decode the
  HRESULT and NTSTATUS bit-fields (severity/facility/code), unwrap FACILITY_WIN32
  (`0x8007xxxx`) HRESULTs to the underlying Win32 error, and suggest near-matches
  for a mistyped code.

### Changed

- Added `exifr` as a dependency for client-side image-metadata parsing.

## [1.4.0] - 2026-07-05

### Added

- **Web** tool category for web-app pentest triage:
  - **SAML** decoder/encoder - auto-detects the HTTP-Redirect (DEFLATE + Base64)
    or HTTP-POST (Base64) binding into readable XML, and re-encodes into either.
  - **Security Headers** analyzer - grades a pasted response-header block (CSP,
    HSTS, framing, cookie flags, info-leak headers) and flags what's missing.
  - **Session Cookie** decoder - reads Flask/itsdangerous (incl. compressed),
    JWT-in-cookie and Django signed values without the secret.
  - **Serialized Blob** identifier - fingerprints Java, JSF ViewState, ASP.NET
    `__VIEWSTATE`, PHP `serialize()`, Ruby Marshal and Python pickle, decoding
    what's cheap and pointing to the matching deserialization attack.
- **PowerShell EncodedCommand** gained an **Encode** mode (script → Base64
  UTF-16LE `-EncodedCommand`) alongside the existing decode.

### Changed

- Tool output boxes now auto-fit their content (up to 70vh, then scroll).
- The PowerShell EncodedCommand sample now demonstrates the layered
  Base64 + Gzip auto-unwrap.

### Fixed

- File Permissions: the Findings panel now stays visible when switching to the
  "Explain all" view (previously it only appeared in "Concerning only").
- A codebase-wide bug sweep hardened many tools:
  - **Regex Tester** now evaluates patterns in a Web Worker with a timeout, so a
    catastrophically-backtracking pattern (e.g. `(a+)+$`) can no longer freeze
    the tab.
  - A tool with a bad `meta.category`, or any tool that throws while rendering,
    is now contained by an error boundary instead of blanking the whole app.
  - **Hash Identifier** recognizes Cisco type-7 secrets with any salt
    (`00`-`15`), not only seed `07`.
  - **FILETIME / Integer8** sign-extends raw two's-complement hex durations
    (e.g. a hex `maxPwdAge`) instead of reading them as far-future dates.
  - **Crontab** explains multi-value minute/hour schedules in English (no more
    leaked `{…}`), with correct ordinals ("2nd hour").
  - **SAML** decodes BOM-prefixed POST-binding XML; **Session Cookie** no longer
    mislabels a malformed JWT as Flask, and stops over-matching Django values.
  - Smaller fixes across Base58, JWT expiry, PowerShell decode, timestamps,
    `ls -l` device rows, regex-explain `\p{…}`, and NULL-DACL detection.

## [1.3.0] - 2026-07-04

### Added

- Two Windows tools:
  - **PowerShell EncodedCommand** decoder - decodes `-EncodedCommand`
    (Base64 → UTF-16LE) and auto-unwraps the common inner Base64 +
    DeflateStream/GzipStream obfuscation layer used by fileless malware.
  - **SID Decoder** - converts a Windows SID between string and binary form,
    resolves well-known SIDs and RIDs (Administrator, Domain Admins, krbtgt…),
    and breaks out the identifier authority and sub-authorities.
- Four Linux tools:
  - **/etc/group** parser - flags membership in privilege-escalation groups
    (docker, lxd, disk, shadow ≈ instant root; sudo/wheel/adm).
  - **SSH authorized_keys** analyzer - SHA-256 fingerprints each key, shows its
    options, and flags weak algorithms and unrestricted (backdoor-shaped) keys.
  - **Linux Capabilities** decoder - turns getcap output into plain meaning and
    flags privesc capabilities (cap_setuid, cap_dac_read_search, cap_sys_admin…).
  - **systemd Unit** analyzer - flags a root service with a writable/relative
    ExecStart, a `User=` bypass, secrets in `Environment=`, and missing sandboxing.

### Changed

- The **FILETIME** tool now also interprets AD **Integer8** (LargeInteger)
  values - negative durations (maxPwdAge, lockoutDuration) alongside absolute
  timestamps - and is renamed **FILETIME / Integer8**.
- Every **Findings** panel is now a collapsible card (collapsed by default) with
  color-coded per-severity counts next to the title and a copy button that
  exports the findings as plain text (one per line, severity-tagged).
- The **userAccountControl** and **JWT** decoders gained a Findings panel - UAC
  surfaces delegation / AS-REP-roastable / reversible-encryption flags; JWT
  flags `alg: none`, expired, symmetric-algorithm and no-expiry tokens.
- The **Security Descriptor** decoder now flags dangerous ACL grants - DCSync,
  GenericAll, WriteDacl/WriteOwner, Shadow Credentials, RBCD, targeted
  Kerberoast and group-membership writes - downgrading grants to well-known
  privileged principals (Domain Admins, SYSTEM…) to informational.

## [1.2.0] - 2026-07-03

### Added

- **Linux** tool category for post-exploitation triage, with four tools that
  each surface privilege-escalation red flags:
  - **passwd / shadow** parser - structures /etc/passwd and /etc/shadow and
    flags UID 0 accounts, empty or unshadowed passwords, weak hash schemes and
    duplicate UIDs.
  - **sudoers** analyzer - flags passwordless `ALL` rules, command wildcards,
    `env_keep`/`!authenticate` tricks and GTFOBins-runnable commands; also reads
    `sudo -l` output.
  - **File Permissions** - triages a pasted `ls -l` / `ls -la` listing,
    flagging world-writable and setuid entries (concerning-only or explain-all
    view), with per-class r/w/x tags and a hover-card breakdown of any octal.
  - **Crontab** analyzer - explains cron schedules in plain English and flags
    `@reboot` persistence, world-writable script paths and PATH hijacks.

### Changed

- Tool pages now open with a breadcrumb (**All tools › category**) and show a
  compact execution status dot beside the title, replacing the old
  "category · In your browser" meta line.
- Removed the redundant "in your browser" note from tool input hints - the
  status dot in the header already conveys it.

## [1.1.1] - 2026-07-02

### Changed

- Merged the separate Base64, Base32, Base58 and Hex tools into one **Base &
  Hex** encoder/decoder with a format selector. Each format's options (Base64
  URL-safe/padding/strict, Base32 padding/lowercase, hex delimiter/case) show
  contextually for the selected format and mode.
- The Base64 decoder no longer renders a security descriptor inline. When the
  decoded bytes look like a Windows security descriptor, it now shows a
  "security descriptor detected" prompt that opens the dedicated **Security
  Descriptor** tool with the pasted blob handed along (via the URL fragment, so
  it never leaves the machine).

## [1.1.0] - 2026-06-30

### Added

- **Windows** tool category, with a **Security Descriptor** decoder: paste a
  self-relative `SECURITY_DESCRIPTOR` as Base64 or hex and get readable owner and
  group SIDs, DACL/SACL entries (ACE type, inheritance flags, decoded access
  rights and trustee), well-known SID resolution, friendly names for well-known
  AD object-ACE GUIDs (extended rights such as DCSync, property sets, object
  classes), and the equivalent SDDL string. Everything is parsed in the browser;
  nothing leaves the machine.
- **Kerberos Ticket** decoder (Windows): paste a `.kirbi` / KRB-CRED (Rubeus,
  Mimikatz) and read its service, client, encryption types, ticket flags,
  validity window, and session key. It decodes only - the ticket itself stays
  encrypted (sealed with the service/krbtgt key) - and runs entirely client-side.
- More Windows tools: a **GPP cpassword** decrypter (uses Microsoft's published
  key, entirely in-browser), a **userAccountControl** flag decoder (flags
  delegation, AS-REP roastable, disabled and more), and a **Windows FILETIME**
  converter.
- The Base64 decoder now auto-detects a security descriptor in the decoded bytes
  and renders the same decoded panel inline.

### Changed

- Consolidated the menu bar: general categories are now grouped under **Data**
  and **Security** menus, while domain categories (Windows, and future ones such
  as Web or Linux) stay as their own top-level menus.

## [1.0.1] - 2026-06-19

### Security

- Updated dev/build tooling to clear five Dependabot advisories. All five are
  development dependencies scoped to the dev server and test runner, so the
  shipped client app and self-hosters were never affected:
  - `vite` to 6.4.3 (CVE-2026-53571, CVE-2026-53632, CVE-2026-39365)
  - `esbuild` to 0.25.12 (GHSA-67mh-4wv8-2f99)
  - `vitest` to 3.2.6 (CVE-2026-47429)

### Added

- Hash Identifier: hashcat `--username` flag, to strip the username column from
  `user:hash` inputs such as `/etc/shadow`, NetNTLM and Kerberoast dumps.
- Hash Identifier: John `--rules` flag for wordlist mangling, matching the
  existing hashcat rules option.

### Changed

- Hash Identifier: the flags-panel title now names your selected cracker
  ("hashcat flags" or "John the Ripper flags") instead of a generic label.
- Settings: the cracking tool is now a single choice, hashcat or John. The
  "Both" option was removed; any previously saved "both" preference falls back
  to hashcat.

### Removed

- Hash Identifier: the "Possible types (N)" heading above the results. The
  per-result type and confidence badges already make the count obvious.

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

[1.3.0]: https://github.com/joshuaruppe/sappr/releases/tag/v1.3.0
[1.2.0]: https://github.com/joshuaruppe/sappr/releases/tag/v1.2.0
[1.1.1]: https://github.com/joshuaruppe/sappr/releases/tag/v1.1.1
[1.1.0]: https://github.com/joshuaruppe/sappr/releases/tag/v1.1.0
[1.0.1]: https://github.com/joshuaruppe/sappr/releases/tag/v1.0.1
[1.0.0]: https://github.com/joshuaruppe/sappr/releases/tag/v1.0.0
