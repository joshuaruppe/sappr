/**
 * App identity + version. APP_VERSION is replaced at build time via Vite's
 * `define` (see vite.config.ts) so the in-app footer and the future
 * update-check report the exact running release. Falls back to "dev".
 */
declare const __APP_VERSION__: string | undefined;

export const APP_NAME = "sappr";
export const APP_TAGLINE = "the pentester's web toolkit";
export const APP_VERSION =
  typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "dev";
export const REPO_URL = "https://github.com/joshuaruppe/sappr";
export const AUTHOR_NAME = "Joshua Ruppe";
export const AUTHOR_URL = "https://github.com/joshuaruppe";
