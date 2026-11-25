# Offline display fonts

These fonts ship with the exhibition demo, so mixed Chinese / Khmer text remains
readable without installed language packs or a network connection. CSS confines
each web font to its script range. Translation catalogs and stored names are not
changed.

- `wharton-han-regular.woff2`, `wharton-han-bold.woff2`: renamed, subsetted Noto
  Sans CJK TC. Includes Chinese text, punctuation and symbols used by the source
  interface and its OpenCC Simplified Chinese output. System CJK fallbacks remain
  available for newly entered characters outside this subset.
- `wharton-khmer.woff2`: Noto Sans Khmer, full Khmer repertoire, width fixed at
  100 and variable weights retained. Khmer shaping tables are preserved.
- `manifest.json`: source / output hashes, copyright and supported codepoints.
- `CJK-OFL.txt`, `Khmer-OFL.txt`: SIL Open Font License 1.1. The same license text
  is included in standalone HTML exports.

Pinned sources:

- https://github.com/notofonts/noto-cjk/tree/f8d157532fbfaeda587e826d4cd5b21a49186f7c/Sans/OTF/TraditionalChinese
  (`NotoSansCJKtc-Regular.otf`, `NotoSansCJKtc-Bold.otf`; license: `Sans/LICENSE`)
- https://github.com/google/fonts/tree/6ebe737e44fd64ee736bbc6feed6136a6dbfd222/ofl/notosanskhmer
  (`NotoSansKhmer[wdth,wght].ttf`, stored as `NotoSansKhmer-VF.ttf` for the builder;
  license: `OFL.txt`)

To rebuild after adding Chinese source text, place those upstream files and the
two license files in a local directory and run `showcase-tools/build-fonts.py`
with that directory as its argument, using Python with `fonttools[woff]`.
`showcase-tools/build.mjs` embeds the resulting WOFF2 files in both standalone
HTML apps. The app never downloads fonts from third parties.
