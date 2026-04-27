import type { EmojiItem } from "@tiptap/extension-emoji";
import twemoji from "@twemoji/api";

import { EMOJI_CATALOG } from "./emoji-catalog";

const twemojiSvgAssets = import.meta.glob(
  "../../../../node_modules/@discordapp/twemoji/dist/svg/{1f440,1f47b,1f525,1f600,1f601,1f602,1f603,1f604,1f605,1f606,1f607,1f609,1f60a,1f60b,1f60d,1f60e,1f610,1f611,1f614,1f615,1f616,1f617,1f618,1f61a,1f61b,1f61c,1f621,1f622,1f62a,1f62c,1f62e,1f62f,1f630,1f632,1f634,1f635,1f636,1f642,1f643,1f644,1f648,1f64f,1f680,1f389,1f44d,1f907,1f910,1f914,1f917,1f920,1f922,1f924,1f925,1f927,1f92a,1f92b,1f92d,1f92e,1f92f,1f970,1f971,1f972,1f973,1f974,1f976}.svg",
  {
    eager: true,
    import: "default",
  },
) as Record<string, string>;

const twemojiAssetMap = Object.entries(twemojiSvgAssets).reduce<Record<string, string>>((accumulator, [path, url]) => {
  const match = path.match(/\/([^/]+)\.svg$/);

  if (match) {
    accumulator[match[1]] = url;
  }

  return accumulator;
}, {});

export const getTwemojiAssetUrl = (value: string) => {
  const codepoint = twemoji.convert.toCodePoint(value).toLowerCase();
  return twemojiAssetMap[codepoint] ?? null;
};

export const TWEMOJI_OPTIONS: EmojiItem[] = EMOJI_CATALOG.map((item) => ({
  emoji: item.emoji,
  fallbackImage: getTwemojiAssetUrl(item.emoji) ?? undefined,
  name: item.name,
  shortcodes: [item.name],
  tags: item.keywords,
}));
