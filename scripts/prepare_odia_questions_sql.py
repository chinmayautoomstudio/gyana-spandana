from __future__ import annotations

import json
from pathlib import Path


SOURCE = Path(r"D:\Odisha Quiz Competition\odisha_questions.md")
OUT_DIR = Path(r"D:\Odisha Quiz Competition\scripts\tmp")
OUT_DIR.mkdir(parents=True, exist_ok=True)


def parse_markdown_table(path: Path) -> tuple[list[dict], list[str]]:
    rows: list[dict] = []
    anomalies: list[str] = []

    lines = path.read_text(encoding="utf-8").splitlines()
    for line_no, raw in enumerate(lines, start=1):
        line = raw.strip()
        if not line.startswith("|"):
            continue
        if set(line.replace("|", "").replace("-", "").replace(" ", "")) == set():
            continue
        if "order_index" in line and "question_text" in line:
            continue

        parts = [p.strip() for p in line.split("|")]
        if parts and parts[0] == "":
            parts = parts[1:]
        if parts and parts[-1] == "":
            parts = parts[:-1]

        if len(parts) < 12:
            anomalies.append(f"Line {line_no}: expected at least 12 columns, got {len(parts)}")
            continue

        order_index_raw = parts[-1].strip()
        if not order_index_raw.isdigit():
            anomalies.append(f"Line {line_no}: invalid order_index `{order_index_raw}`")
            continue

        # Locate correct_answer column by pattern: [A-D] followed by numeric points.
        correct_idx = -1
        for i in range(len(parts) - 2):
            if parts[i] in {"A", "B", "C", "D"} and parts[i + 1].isdigit():
                correct_idx = i
        if correct_idx < 4:
            anomalies.append(f"Line {line_no}: could not infer correct_answer column")
            continue

        if correct_idx + 4 >= len(parts):
            anomalies.append(f"Line {line_no}: could not infer explanation column")
            continue

        question_text = " | ".join(parts[: correct_idx - 4]).strip()
        option_a = parts[correct_idx - 4].strip()
        option_b = parts[correct_idx - 3].strip()
        option_c = parts[correct_idx - 2].strip()
        option_d = parts[correct_idx - 1].strip()
        explanation = parts[correct_idx + 4].strip()

        if len(parts) != 12:
            anomalies.append(
                f"Line {line_no}: parsed non-standard row with {len(parts)} cells"
            )

        rows.append(
            {
                "order_index": int(order_index_raw),
                "question_text_odia": question_text,
                "option_a_odia": option_a,
                "option_b_odia": option_b,
                "option_c_odia": option_c,
                "option_d_odia": option_d,
                "explanation_odia": explanation,
            }
        )

    return rows, anomalies


def sql_string(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def build_values_sql(rows: list[dict]) -> str:
    values = []
    for r in rows:
        values.append(
            "("
            f"{r['order_index']}, "
            f"{sql_string(r['question_text_odia'])}, "
            f"{sql_string(r['option_a_odia'])}, "
            f"{sql_string(r['option_b_odia'])}, "
            f"{sql_string(r['option_c_odia'])}, "
            f"{sql_string(r['option_d_odia'])}, "
            f"{sql_string(r['explanation_odia'])}"
            ")"
        )
    return ",\n".join(values)


def main() -> None:
    rows, anomalies = parse_markdown_table(SOURCE)
    values_sql = build_values_sql(rows)

    update_sql = f"""
WITH data (
  order_index,
  question_text_odia,
  option_a_odia,
  option_b_odia,
  option_c_odia,
  option_d_odia,
  explanation_odia
) AS (
  VALUES
  {values_sql}
),
updated AS (
  UPDATE public.questions AS q
  SET
    question_text_odia = d.question_text_odia,
    option_a_odia = d.option_a_odia,
    option_b_odia = d.option_b_odia,
    option_c_odia = d.option_c_odia,
    option_d_odia = d.option_d_odia,
    explanation_odia = d.explanation_odia
  FROM data AS d
  WHERE q.order_index = d.order_index
  RETURNING q.order_index
)
SELECT COUNT(*)::int AS updated_rows FROM updated;
""".strip()

    total_non_empty_sql = """
SELECT COUNT(*)::int AS total_non_empty_question_text_odia
FROM public.questions
WHERE COALESCE(BTRIM(question_text_odia), '') <> '';
""".strip()

    unmatched_sql = f"""
WITH data (
  order_index,
  question_text_odia,
  option_a_odia,
  option_b_odia,
  option_c_odia,
  option_d_odia,
  explanation_odia
) AS (
  VALUES
  {values_sql}
)
SELECT COALESCE(ARRAY_AGG(d.order_index ORDER BY d.order_index), ARRAY[]::int[]) AS unmatched_order_indexes
FROM data d
LEFT JOIN public.questions q
  ON q.order_index = d.order_index
WHERE q.order_index IS NULL;
""".strip()

    duplicates = sorted({r["order_index"] for r in rows if [x["order_index"] for x in rows].count(r["order_index"]) > 1})

    (OUT_DIR / "update_questions_odia.sql").write_text(update_sql, encoding="utf-8")
    (OUT_DIR / "verify_total_non_empty.sql").write_text(total_non_empty_sql, encoding="utf-8")
    (OUT_DIR / "verify_unmatched.sql").write_text(unmatched_sql, encoding="utf-8")
    (OUT_DIR / "meta.json").write_text(
        json.dumps(
            {
                "parsed_rows": len(rows),
                "order_indexes": sorted(r["order_index"] for r in rows),
                "anomalies": anomalies,
                "duplicate_order_indexes_in_file": duplicates,
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

    print(json.dumps({"parsed_rows": len(rows), "anomalies": len(anomalies)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
