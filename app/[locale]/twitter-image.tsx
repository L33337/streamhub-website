// Same card as the OG image. Re-exporting generateImageMetadata is what makes
// this route ISR-cached too (2026-08-29, see AGENTS.md "OG image routes").
// `revalidate` must be a literal export here — Next does not resolve a
// re-exported segment config and falls back to the default (build warning).
export const revalidate = 86400;
export { default, generateImageMetadata } from './opengraph-image';
