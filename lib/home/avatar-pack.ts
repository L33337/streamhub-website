// Lossless packing of streamer avatar URLs for the homepage's lineup payload
// (payload diet 2026-09-14, SEO plan F7).
//
// Every deferred lineup card carries its streamer's avatar, and the two forms
// production stores are long and mostly constant: 463 of 463 lineup avatars
// were either YouTube's `https://yt3.ggpht.com/<id>=s800-c-k-c0x00ffffff-no-rj`
// or Twitch's `https://static-cdn.jtvnw.net/jtv_user_pictures/<id>-profile_image-300x300.png`
// (2026-09-14), ~115 characters on average of which ~50-75 are the fixed
// frame. Only the varying middle travels, tagged with the form it belongs to.
//
// Strict by construction: a URL is packed only when unpacking the packed value
// reproduces it byte for byte, so the client can never render a different
// image than the database stores. Pure and unit-tested
// (lib/home/__tests__/avatar-pack.test.ts). Rendering still applies
// `sizedAvatarUrl` to the UNPACKED URL, exactly as before.

interface AvatarForm {
  /** One-letter tag the packed value starts with, followed by ":". */
  tag: string;
  prefix: string;
  suffix: string;
}

const AVATAR_FORMS: readonly AvatarForm[] = [
  {
    tag: 'y',
    prefix: 'https://yt3.ggpht.com/',
    suffix: '=s800-c-k-c0x00ffffff-no-rj',
  },
  {
    tag: 't',
    prefix: 'https://static-cdn.jtvnw.net/jtv_user_pictures/',
    suffix: '-profile_image-300x300.png',
  },
];

/** Inverse of `packAvatarUrl`. Anything without a known tag is a full URL. */
export function unpackAvatarUrl(value: string | null): string | null {
  if (value === null) return null;
  for (const form of AVATAR_FORMS) {
    const marker = `${form.tag}:`;
    if (value.startsWith(marker)) {
      return `${form.prefix}${value.slice(marker.length)}${form.suffix}`;
    }
  }
  return value;
}

/**
 * The avatar value to ship: the tagged middle of a known form, otherwise the
 * URL untouched. A stored value that would be MISREAD as packed (not a URL,
 * starting with a tag) is dropped to null, so the card falls back to the
 * streamer's initial instead of rendering an image the database never named.
 */
export function packAvatarUrl(url: string | null): string | null {
  if (url === null) return null;
  for (const form of AVATAR_FORMS) {
    if (
      url.length > form.prefix.length + form.suffix.length &&
      url.startsWith(form.prefix) &&
      url.endsWith(form.suffix)
    ) {
      const packed = `${form.tag}:${url.slice(
        form.prefix.length,
        url.length - form.suffix.length,
      )}`;
      if (unpackAvatarUrl(packed) === url) return packed;
    }
  }
  return unpackAvatarUrl(url) === url ? url : null;
}
