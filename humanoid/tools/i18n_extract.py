# -*- coding: utf-8 -*-
"""Post-build pass: key every translatable string and extract the English source.

Walks each built page, finds the outermost elements whose content is text plus
inline formatting, stamps them with data-i18n="<hash>", and collects the English
into assets/i18n/en.json. Keys are a hash of the English text, so they are
stable across reordering and shared between pages — "Home" is translated once.

Run after the page builders, before publishing.
"""
import glob
import hashlib
import json
import os
import re
from html.parser import HTMLParser

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input",
        "link", "meta", "param", "source", "track", "wbr"}

# May appear inside a single translatable unit.
INLINE = {"a", "abbr", "b", "br", "code", "em", "i", "small", "span",
          "strong", "sub", "sup", "u", "wbr"}

# Never descend into these.
OPAQUE = {"script", "style", "canvas", "iframe", "svg", "head"}

# Translatable attributes, per tag.
ATTRS = {
    "img": ["alt"],
    "a": ["title", "aria-label"],
    "button": ["aria-label"],
    "div": ["aria-label"],
    "nav": ["aria-label"],
    "section": ["aria-label"],
    "table": ["summary"],
}
# Subtrees that must never be translated: live counters, proper nouns and
# technical tokens. Descending into these produced keys like "C++" and "劉冠華".
SKIP_SUBTREE_CLASS = {
    "stat-value",      # live counters + ordinal suffixes
    "pill-row",        # technology names: C++, ROS 2, YOLO …
    "roster-names",    # people's names
    "member-cn",       # Chinese names
    "member-lines",    # T1 / K1 tags
    "line-badge",      # T1 / K1
    "footer-social",   # icon-only links
    "line-roster",     # squad name lists
}
SKIP_EXACT_TEXT = re.compile(r"^[\s\d.,:/&|+\-–—×]*$")   # pure numbers/punctuation

# Standalone tokens that are the same in every language.
DO_NOT_TRANSLATE = re.compile(
    r"^(?:"
    r"[A-Z]\d|[A-Z]{2,}(?:-[A-Z]{2,})*|"            # T1, K1, RCAP, PCMS-HRG
    r"C\+\+|ROS\s*2|YOLO|OpenCV|Python|"
    r"st|nd|rd|th|"                                  # ordinal suffixes
    r"@?[\w.]+@[\w.]+|"                             # emails
    r"[\u4e00-\u9fff·]{1,6}"                        # CJK proper nouns
    r")$"
)


def translatable(text):
    """False for pure punctuation, bare numbers and untranslatable tokens."""
    plain = re.sub(r"<[^>]+>", "", text).strip()
    plain = re.sub(r"&[a-z]+;", " ", plain).strip()
    if not plain or SKIP_EXACT_TEXT.match(plain):
        return False
    if DO_NOT_TRANSLATE.match(plain):
        return False
    return True


def key_of(text):
    return hashlib.sha1(text.encode("utf-8")).hexdigest()[:8]


class Tokenizer(HTMLParser):
    """Rebuilds the document as a token list so we can rewrite in place."""

    def __init__(self):
        super().__init__(convert_charrefs=False)
        self.tokens = []

    def handle_starttag(self, tag, attrs):
        self.tokens.append(("start", tag, attrs, self.get_starttag_text()))

    def handle_startendtag(self, tag, attrs):
        self.tokens.append(("startend", tag, attrs, self.get_starttag_text()))

    def handle_endtag(self, tag):
        self.tokens.append(("end", tag, None, f"</{tag}>"))

    def handle_data(self, data):
        self.tokens.append(("data", None, None, data))

    def handle_comment(self, data):
        self.tokens.append(("raw", None, None, f"<!--{data}-->"))

    def handle_decl(self, data):
        self.tokens.append(("raw", None, None, f"<!{data}>"))

    def handle_entityref(self, name):
        self.tokens.append(("data", None, None, f"&{name};"))

    def handle_charref(self, name):
        self.tokens.append(("data", None, None, f"&#{name};"))

    def unknown_decl(self, data):
        self.tokens.append(("raw", None, None, f"<![{data}]>"))


def attr_dict(attrs):
    return {k: (v or "") for k, v in attrs}


def process(path, strings):
    html = open(path, encoding="utf-8").read()
    t = Tokenizer()
    t.feed(html)
    toks = t.tokens

    # Find each element's span [start, end] so we can inspect its subtree.
    spans = {}
    stack = []
    for i, (kind, tag, _a, _raw) in enumerate(toks):
        if kind == "start" and tag not in VOID:
            stack.append((tag, i))
        elif kind == "end" and tag not in VOID:
            for j in range(len(stack) - 1, -1, -1):
                if stack[j][0] == tag:
                    spans[stack[j][1]] = i
                    del stack[j:]
                    break

    out = list(t.tokens)
    keyed = set()

    def subtree_is_inline(start, end):
        """True if the element holds text of its own, plus only inline markup.

        Requiring a *direct* text node stops wrappers like <li><a>Home</a></li>
        being keyed as a unit, which would drag the whole anchor into every
        translation. Such wrappers are descended into instead, so the string is
        just the text that needs translating.
        """
        has_own_text = False
        depth = 0
        for k in range(start + 1, end):
            kind, tag, _a, raw = toks[k]
            if kind == "data":
                if raw.strip() and depth == 0:
                    has_own_text = True
            elif kind == "startend":
                if tag in OPAQUE or tag not in INLINE:
                    return False
            elif kind == "start":
                if tag in OPAQUE or tag not in INLINE:
                    return False
                if tag not in VOID:
                    depth += 1
            elif kind == "end":
                if tag not in INLINE:
                    return False
                depth -= 1
        return has_own_text

    def inner_html(start, end):
        raw = "".join(toks[k][3] for k in range(start + 1, end))
        return re.sub(r"\s+", " ", raw).strip()

    def add_attr(idx, name, value):
        kind, tag, attrs, raw = out[idx]
        if f" {name}=" in raw:
            return
        insert = f' {name}="{value}"'
        closing = "/>" if raw.rstrip().endswith("/>") else ">"
        new_raw = raw[: raw.rfind(closing)].rstrip() + insert + closing
        out[idx] = (kind, tag, attrs, new_raw)

    def walk(start, end, depth=0):
        """Key the outermost inline-only elements; otherwise descend."""
        k = start + 1
        while k < end:
            kind, tag, attrs, raw = toks[k]
            if kind in ("start", "startend"):
                a = attr_dict(attrs)
                # translatable attributes on any element
                for an in ATTRS.get(tag, []):
                    val = re.sub(r"\s+", " ", a.get(an, "")).strip()
                    if val and translatable(val):
                        kk = key_of(val)
                        strings[kk] = val
                        add_attr(k, f"data-i18n-{an}", kk)
                if tag == "img" and a.get("data-caption"):
                    pass
                for an in ("data-caption", "data-phrases"):
                    val = re.sub(r"\s+", " ", a.get(an, "")).strip()
                    if val and translatable(val):
                        kk = key_of(val)
                        strings[kk] = val
                        add_attr(k, "data-i18n-" + an, kk)

            if kind == "start" and tag not in VOID and tag not in OPAQUE:
                e = spans.get(k)
                if e is None:
                    k += 1
                    continue
                cls = attr_dict(attrs).get("class", "").split()
                if SKIP_SUBTREE_CLASS.intersection(cls) or "data-i18n-skip" in raw:
                    k = e + 1
                    continue
                if subtree_is_inline(k, e):
                    text = inner_html(k, e)
                    if translatable(text):
                        kk = key_of(text)
                        strings[kk] = text
                        add_attr(k, "data-i18n", kk)
                        keyed.add(kk)
                        k = e + 1
                        continue
                walk(k, e, depth + 1)
                k = e + 1
                continue
            k += 1

    # <title>
    for i, (kind, tag, _a, _raw) in enumerate(toks):
        if kind == "start" and tag == "title":
            e = spans.get(i)
            if e:
                val = inner_html(i, e).strip()
                if val:
                    kk = key_of(val)
                    strings[kk] = val
                    add_attr(i, "data-i18n", kk)
    # meta description
    for i, (kind, tag, attrs, raw) in enumerate(toks):
        if kind in ("start", "startend") and tag == "meta":
            a = attr_dict(attrs)
            if a.get("name") in ("description",) or a.get("property") in ("og:description", "og:title"):
                val = a.get("content", "").strip()
                if val:
                    kk = key_of(val)
                    strings[kk] = val
                    add_attr(i, "data-i18n-content", kk)

    body_i = next((i for i, (k, tg, _a, _r) in enumerate(toks) if k == "start" and tg == "body"), None)
    if body_i is not None:
        walk(body_i, spans[body_i])

    open(path, "w", encoding="utf-8").write("".join(tok[3] for tok in out))
    return len(keyed)


def main():
    strings = {}
    total = 0
    for page in sorted(glob.glob(os.path.join(ROOT, "pages", "*.html"))):
        n = process(page, strings)
        total += n
        print(f"  {os.path.basename(page):24} {n:4} keyed elements")
    outdir = os.path.join(ROOT, "assets", "i18n")
    os.makedirs(outdir, exist_ok=True)
    with open(os.path.join(outdir, "en.json"), "w", encoding="utf-8") as fh:
        json.dump(strings, fh, ensure_ascii=False, indent=1, sort_keys=True)
    words = sum(len(re.sub(r"<[^>]+>", "", v).split()) for v in strings.values())
    print(f"\n  unique strings: {len(strings)}   ~{words} words of English")


if __name__ == "__main__":
    main()
