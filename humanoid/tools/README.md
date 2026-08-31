# Translation pipeline

The site is written in English. The other three languages are applied in the
browser from dictionaries in `assets/i18n/`, so there is only ever **one** copy
of each page to maintain.

```
pages/*.html            English source, with data-i18n="<hash>" markers
assets/i18n/en.json     the English strings, keyed by hash  (generated)
assets/i18n/de.js       German dictionary                   (generated)
assets/i18n/it.js       Italian dictionary                  (generated)
assets/i18n/zh-Hant.js  Traditional Chinese dictionary      (generated)
tools/translations/     the translations you edit           (source of truth)
```

Keys are a hash of the English text, so a string is translated once and reused
everywhere it appears — "Home" in the nav is one entry, not six.

## After you edit English text on a page

1. Re-key the pages and refresh the English string list:

   ```
   python3 tools/i18n_extract.py
   ```

   Existing `data-i18n` markers are left alone; changed or new text gets a new
   hash. Nothing breaks in the meantime — a string with no translation simply
   shows in English.

2. Rebuild the dictionaries and see what is missing:

   ```
   python3 tools/i18n_build.py
   ```

   It prints a coverage percentage per language and lists untranslated strings.

3. Add the missing entries to `tools/translations/<lang>.py` — each is a plain
   `"English": "translation"` pair — and run step 2 again.

## Rules for translations

- Keep HTML tags and entities exactly as they appear in the English:
  `<strong>`, `<i class="bi …"></i>`, `&mdash;`, `&nbsp;`.
- Do not translate people's names, `PCMS-HRG`, `Booster T1`/`K1`, or the
  glossary head-words — `tools/i18n_build.py` already skips those.
- Patterned strings compose automatically. "View photo: <caption>" is built
  from the `view_photo` template plus the translated caption, so captions are
  translated once. Same for "Illustrated portrait of <name>".

## Filling gaps with a machine translator

`i18n_build.py` reports exactly which strings lack a translation. To draft them
with a service such as DeepL, feed it that list and paste the results into the
matching `tools/translations/<lang>.py` — the file is a plain dict, so the
output can be pasted in directly. Always read the result before shipping:
machine output tends to mangle the inline HTML and the robotics terminology.
