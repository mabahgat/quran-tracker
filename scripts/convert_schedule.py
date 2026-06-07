"""
Convert an expert memorization timetable (Quran_Tracker_*.xlsx) into a
human-readable JSON schedule resource consumed by the app, and verify it covers
the whole Quran.

Each Excel has 9 columns (RTL); column B is a grouping label (decade or week)
that we ignore — the phase is derived from where review days fall:
  اليوم | <grouping> | النوع | المقدار | صفحة البداية | صفحة النهاية |
  من (سورة - آية) | إلى (سورة - آية) | حالة الإنجاز
  (Day | Group | Type | Amount | StartPage | EndPage | From | To | Status)

Type is حفظ (memorize) or مراجعة (review). From/To use Arabic surah names with
diacritics plus the ayah number; the page comes from the StartPage/EndPage cols.

Surah names are mapped to numbers using the app's own dataset
(src/domain/quranData.ts), and ayah continuity / total coverage (6236 ayat) is
verified before writing.

Usage:
  python scripts/convert_schedule.py <templateId> <input.xlsx> <quranData.ts> <output.json>
"""

import json
import re
import sys

import openpyxl

AYAH_RE = re.compile(r"آية\s*(\d+)")
DAY_RE = re.compile(r"(\d+)")
DIACRITICS_RE = re.compile(r"[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]")


def normalize_arabic(text):
    text = "" if text is None else str(text)
    text = DIACRITICS_RE.sub("", text)
    for ch in "\u0622\u0623\u0625\u0671":  # آ أ إ ٱ
        text = text.replace(ch, "\u0627")  # ا
    text = text.replace("\u0649", "\u064A")  # ى -> ي
    text = text.replace("\u0624", "\u0648").replace("\u0626", "\u064A")  # ؤ ئ
    return re.sub(r"\s+", " ", text).strip()


def load_surahs(quran_data_path):
    with open(quran_data_path, encoding="utf-8") as handle:
        content = handle.read()
    entry_re = re.compile(
        r"number:\s*(\d+),\s*nameAr:\s*'([^']+)',\s*nameEn:[^,]+,\s*meaningEn:[^,]+,\s*ayahCount:\s*(\d+)"
    )
    by_name = {}
    ayah_counts = {}
    for number, name_ar, ayah_count in entry_re.findall(content):
        number = int(number)
        ayah_counts[number] = int(ayah_count)
        by_name[normalize_arabic(name_ar)] = number
    if len(ayah_counts) != 114:
        raise SystemExit(f"Expected 114 surahs in dataset, found {len(ayah_counts)}")
    return by_name, ayah_counts


def parse_position(name_ayah, page, by_name):
    name = str(name_ayah).split(" - ")[0]
    key = normalize_arabic(name)
    if key not in by_name:
        raise SystemExit(f"Could not map surah name: {name!r} (normalized {key!r})")
    ayah_match = AYAH_RE.search(str(name_ayah))
    if not ayah_match:
        raise SystemExit(f"Could not parse ayah from: {name_ayah!r}")
    return {"surah": by_name[key], "ayah": int(ayah_match.group(1)), "page": int(page)}


def parse_int(value):
    match = DAY_RE.search(str(value))
    if not match:
        raise SystemExit(f"Could not parse integer from: {value!r}")
    return int(match.group(1))


def cumulative_index(position, ayah_counts):
    return sum(ayah_counts[s] for s in range(1, position["surah"])) + position["ayah"]


def convert(template_id, input_path, quran_data_path, output_path):
    by_name, ayah_counts = load_surahs(quran_data_path)
    total_ayah = sum(ayah_counts.values())

    wb = openpyxl.load_workbook(input_path, data_only=True)
    ws = wb.active

    rows = []
    for row in list(ws.iter_rows(values_only=True))[1:]:
        day_label, _group, type_label, _amount, start_page, end_page, from_str, to_str, _status = row
        if day_label is None:
            continue
        rows.append(
            {
                "day": parse_int(day_label),
                "isReview": "حفظ" not in str(type_label),
                "start_page": int(start_page),
                "end_page": int(end_page),
                "from": parse_position(from_str, start_page, by_name),
                "to": parse_position(to_str, end_page, by_name),
            }
        )
    rows.sort(key=lambda r: r["day"])

    # Derive the phase number from review-day boundaries: each phase ends on a
    # review day, so phases increment after every review day.
    phase = 1
    days = []
    for r in rows:
        days.append(
            {
                "day": r["day"],
                "phase": phase,
                "isReview": r["isReview"],
                "pages": r["end_page"] - r["start_page"] + 1,
                "from": r["from"],
                "to": r["to"],
            }
        )
        if r["isReview"]:
            phase += 1

    verify(days, ayah_counts, total_ayah)

    schedule = {
        "templateId": template_id,
        "source": input_path.split("/")[-1],
        "totalDays": len(days),
        "totalPages": max(d["to"]["page"] for d in days),
        "days": days,
    }
    with open(output_path, "w", encoding="utf-8") as handle:
        json.dump(schedule, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
    print(f"Wrote {len(days)} days ({template_id}) to {output_path}")


def verify(days, ayah_counts, total_ayah):
    memorize = [d for d in days if not d["isReview"]]

    for d in days:
        for key in ("from", "to"):
            p = d[key]
            if not (1 <= p["surah"] <= 114 and 1 <= p["ayah"] <= ayah_counts[p["surah"]]):
                raise SystemExit(f"Day {d['day']} {key} is an invalid position: {p}")

    expected = 1
    for d in memorize:
        start = cumulative_index(d["from"], ayah_counts)
        end = cumulative_index(d["to"], ayah_counts)
        if start != expected:
            raise SystemExit(f"Day {d['day']} starts at index {start}, expected {expected}")
        if end < start:
            raise SystemExit(f"Day {d['day']} ends before it starts")
        expected = end + 1

    covered = expected - 1
    first = memorize[0]["from"]
    last = memorize[-1]["to"]
    print("=== VERIFICATION ===")
    print(f"memorize days: {len(memorize)} | review days: {len(days) - len(memorize)}")
    print(f"first: {first['surah']}:{first['ayah']} (page {first['page']})")
    print(f"last:  {last['surah']}:{last['ayah']} (page {last['page']})")
    print(f"ayat covered: {covered} / {total_ayah}")
    if first["surah"] != 1 or first["ayah"] != 1:
        raise SystemExit("Schedule does not start at Al-Fatihah 1:1")
    if covered != total_ayah:
        raise SystemExit(f"Schedule covers {covered} ayat, expected {total_ayah}")
    print("OK: continuous and covers the whole Quran (1:1 -> 114:6).")


if __name__ == "__main__":
    if len(sys.argv) != 5:
        print(__doc__)
        sys.exit(1)
    convert(sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4])
