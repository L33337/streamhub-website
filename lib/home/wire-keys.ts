// Short JSON keys for the homepage's client-island payloads (payload diet
// 2026-09-14, SEO plan F7).
//
// Every object that crosses the server/client boundary repeats its key names
// once per card in the RSC flight: "streamer_timezone", "duration_minutes",
// "externalClipId" and friends were ~160 bytes per lineup card and ~80 per
// clip, a quarter of each section's payload. The islands therefore receive
// their pruned cards under one- or two-letter keys and decode them before
// anything renders.
//
// The READABLE shape stays the source of truth: a key map must name every key
// of it (`WireKeyMap` makes each one required), so adding a field to a card
// type without giving it a wire key fails to compile, and the decoded object
// is typed as the readable shape again. Pure and unit-tested
// (lib/home/__tests__/wire-keys.test.ts).

/** One short key per field of `T`, every field required. */
export type WireKeyMap<T> = { readonly [K in keyof T]-?: string };

/**
 * `T` under the short keys of `M`. Homomorphic, so optional fields stay
 * optional on the wire.
 */
export type WireEncoded<T, M extends WireKeyMap<T>> = {
  [K in keyof T as M[K]]: T[K];
};

/** Renames the defined fields of `value` to their short keys. */
export function encodeWire<T extends object, M extends WireKeyMap<T>>(
  value: T,
  keys: M,
): WireEncoded<T, M> {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(value) as Array<keyof T>) {
    const field = value[key];
    // An undefined field would vanish in JSON anyway; skipping it here keeps
    // the in-memory object identical to what the client will receive.
    if (field !== undefined) out[keys[key]] = field;
  }
  return out as WireEncoded<T, M>;
}

/** Inverse of `encodeWire`. Keys absent on the wire stay absent. */
export function decodeWire<T extends object, M extends WireKeyMap<T>>(
  wire: WireEncoded<T, M>,
  keys: M,
): T {
  const source = wire as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(keys) as Array<keyof T & string>) {
    const short = keys[key];
    if (Object.prototype.hasOwnProperty.call(source, short)) out[key] = source[short];
  }
  return out as T;
}
