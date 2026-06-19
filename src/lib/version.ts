/**
 * App identity + version. APP_VERSION is replaced at build time via Vite's
 * `define` (see vite.config.ts) so the in-app footer and the future
 * update-check report the exact running release. Falls back to "dev".
 */
declare const __APP_VERSION__: string | undefined;

export const APP_NAME = "sappr";
export const APP_TAGLINE = "the pentester's toolkit";
export const APP_VERSION =
  typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "dev";
export const REPO_URL = "https://github.com/joshuaruppe/sappr";
export const AUTHOR_NAME = "Joshua Ruppe";
export const AUTHOR_URL = "https://github.com/joshuaruppe";

/**
 * Licensing. sappr is AGPL-3.0; because it's served over a network, AGPL §13
 * requires offering users the Corresponding Source. The footer links both the
 * source (REPO_URL) and this license notice to satisfy that. If you modify and
 * host your own version, point REPO_URL at *your* source to stay compliant.
 */
export const LICENSE_NAME = "AGPL-3.0";
export const LICENSE_URL = `${REPO_URL}/blob/main/LICENSE`;
