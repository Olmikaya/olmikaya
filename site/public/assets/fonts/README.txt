Ovo and Inter, latin subsets, self-hosted.

Both are licensed under the SIL Open Font License 1.1, which permits
redistribution as part of a website. Full text: https://openfontlicense.org

  ovo-latin.woff2     Ovo, weight 400 — the only style it ships
  inter-latin.woff2   Inter, variable, weights 400-600

Taken from the files Google Fonts serves, latin subset only
(U+0000-00FF and the usual punctuation). If the site ever needs Greek,
Cyrillic or Vietnamese, fetch those subsets too and add matching
@font-face rules with the right unicode-range.

They are self-hosted rather than linked from fonts.googleapis.com for
three reasons: it removes two third-party connections from the critical
path, it lets the exact files be preloaded, and it means no visitor's IP
is handed to a third party just to read the site — which is what the
privacy policy claims.
