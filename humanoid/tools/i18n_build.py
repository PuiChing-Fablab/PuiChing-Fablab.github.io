# -*- coding: utf-8 -*-
"""Compile human-readable translation files into the hash-keyed dictionaries
the site loads.

Source of truth is gen/translations/<lang>.py, which maps English -> translation
so the translations stay reviewable. Patterned strings ("View photo: <caption>")
are composed from their parts rather than translated one by one.

Emits assets/i18n/<lang>.js and prints a coverage report.
"""
import hashlib
import importlib
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

LANGS = ["zh_hant", "de", "it"]
FILE_NAME = {"zh_hant": "zh-Hant", "de": "de", "it": "it"}

# Strings that are the same in every language (people, brands, technical terms).
IDENTITY = re.compile(
    r"^(?:"
    r"Lao Kun Wa|Lam Kin Un|Lei Mou Hong|Wu Iat Cheng|Lam Si Ioi|Hoi Wai Kio|"
    r"Yao Yi Chen|Lei Pui Weng|Lei Ut Ieng|Mui Lek Hou|Kwan Chi Cheng|"
    r"Kong Ngai Lam|U Hong Nei|Fong Cheng In|"
    r"Instagram|YouTube|PCMS-HRG|Booster T1|Booster K1|"
    # Glossary head-words stay English — they are the vocabulary being taught;
    # only their definitions are translated.
    r"Robot|Humanoid|Servo|RoboCup|Motor|Actuator|LiDAR|Dynamics|Gyro|Firmware|"
    r"Joint|Protocol|Sensor|Algorithm|Vision|Kinematic|Neural|Torque|Binary|"
    r"<strong class=\"glossary-term\">\w+</strong>|"
    r"[一-鿿·]+"
    r")$"
)

# Patterns composed from a translated stem plus a translated inner string.
COMPOSED = [
    (re.compile(r"^View photo: (.+)$"),             "view_photo"),
    (re.compile(r"^Illustrated portrait of (.+)$"), "portrait_of"),
]


def key_of(text):
    return hashlib.sha1(text.encode("utf-8")).hexdigest()[:8]


def build(lang):
    mod = importlib.import_module("translations." + lang)
    T = dict(mod.T)
    templates = getattr(mod, "TEMPLATES", {})

    en = json.load(open(os.path.join(ROOT, "assets", "i18n", "en.json"), encoding="utf-8"))
    out, missing, identity, composed = {}, [], 0, 0

    def translate(text):
        """Best translation for one English string, or None."""
        if text in T:
            return T[text]
        if IDENTITY.match(text):
            return None                      # identical — let it fall back
        for pat, tpl in COMPOSED:
            m = pat.match(text)
            if m and tpl in templates:
                inner = m.group(1)
                got = T.get(inner)
                if got is None and IDENTITY.match(inner):
                    got = inner
                if got is not None:
                    return templates[tpl].replace("{x}", got)
        return None

    for k, text in en.items():
        if IDENTITY.match(text):
            identity += 1
            continue
        v = translate(text)
        if v is None:
            missing.append(text)
        else:
            if any(p.match(text) for p, _ in COMPOSED) and text not in T:
                composed += 1
            out[k] = v

    code = FILE_NAME[lang]
    path = os.path.join(ROOT, "assets", "i18n", code + ".js")
    with open(path, "w", encoding="utf-8") as fh:
        fh.write("window.__I18N__=window.__I18N__||{};\nwindow.__I18N__['" + code + "']=")
        json.dump(out, fh, ensure_ascii=False, separators=(",", ":"), sort_keys=True)
        fh.write(";\n")

    total = len(en)
    done = len(out) + identity
    pct = 100.0 * done / total
    size = os.path.getsize(path) / 1024
    print(f"  {code:8} {len(out):4} translated (+{composed} composed, {identity} identical) "
          f"→ {pct:5.1f}% of {total}   {size:5.1f} KB")
    return missing


def main():
    all_missing = {}
    for lang in LANGS:
        all_missing[lang] = build(lang)
    worst = max(all_missing.values(), key=len)
    if worst:
        print(f"\n  untranslated ({len(worst)} in the largest gap) — first 25:")
        for t in worst[:25]:
            print("    -", t[:96])
    else:
        print("\n  every string translated in every language")


if __name__ == "__main__":
    main()
