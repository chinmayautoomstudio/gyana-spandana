import json, re, pathlib
p = pathlib.Path(r'd:\Odisha Quiz Competition\odisha_questions.md')
lines = p.read_text(encoding='utf-8').splitlines()
rows=[]
errs=[]
for i,ln in enumerate(lines, start=1):
    if not ln.strip().startswith('|'):
        continue
    if i<=2:
        continue
    raw=[c.strip() for c in ln.strip().split('|')]
    if raw and raw[0]=='': raw=raw[1:]
    if raw and raw[-1]=='': raw=raw[:-1]
    if not raw:
        continue
    if len(raw)>=13 and raw[-3]=='' and raw[-2].startswith('[') and re.fullmatch(r'\d+', raw[-1] or ''):
        raw.pop(-3)
    if len(raw) < 12:
        errs.append((i,'too_few_cols',len(raw),raw))
        continue
    order = raw[-1]
    tags = raw[-2]
    expl = raw[-3]
    diff = raw[-4].lower()
    cat = raw[-5]
    pts = raw[-6]
    ans = raw[-7].upper()
    left = raw[:-7]
    if not re.fullmatch(r'\d+', order or ''):
        errs.append((i,'bad_order',order,raw)); continue
    if diff not in {'easy','medium','hard'}:
        if len(raw)>=13 and raw[-5].lower() in {'easy','medium','hard'}:
            expl = raw[-4]
            diff = raw[-5].lower()
            cat = raw[-6]
            pts = raw[-7]
            ans = raw[-8].upper()
            left = raw[:-8]
        else:
            errs.append((i,'bad_diff',diff,raw)); continue
    if not re.fullmatch(r'[ABCD]', ans or ''):
        errs.append((i,'bad_ans',ans,raw)); continue
    if not re.fullmatch(r'\d+', pts or ''):
        errs.append((i,'bad_pts',pts,raw)); continue
    if len(left) < 5:
        errs.append((i,'left_cols_lt5',len(left),raw)); continue
    if len(left)==5:
        q,a,b,c,d = left
    else:
        q = ' | '.join(left[:-4]).strip()
        a,b,c,d = left[-4:]
    rows.append({
        'order_index': int(order),
        'question_text_odia': q,
        'option_a_odia': a,
        'option_b_odia': b,
        'option_c_odia': c,
        'option_d_odia': d,
        'explanation_odia': expl,
    })

if errs:
    print('PARSE_ERRORS', len(errs))
    for e in errs[:5]:
        print(e)
    raise SystemExit(1)

m={r['order_index']:r for r in rows}
rows=[m[k] for k in sorted(m)]

def esc(s:str)->str:
    return s.replace("'","''")

values=[]
for r in rows:
    values.append("("+str(r['order_index'])+",'"+esc(r['question_text_odia'])+"','"+esc(r['option_a_odia'])+"','"+esc(r['option_b_odia'])+"','"+esc(r['option_c_odia'])+"','"+esc(r['option_d_odia'])+"','"+esc(r['explanation_odia'])+"')")

sql = "WITH src(order_index,question_text_odia,option_a_odia,option_b_odia,option_c_odia,option_d_odia,explanation_odia) AS (VALUES\n  " + ",\n  ".join(values) + "\n), upd AS (\n  UPDATE public.questions q\n  SET question_text_odia = src.question_text_odia,\n      option_a_odia = src.option_a_odia,\n      option_b_odia = src.option_b_odia,\n      option_c_odia = src.option_c_odia,\n      option_d_odia = src.option_d_odia,\n      explanation_odia = src.explanation_odia\n  FROM src\n  WHERE q.order_index = src.order_index\n  RETURNING q.id, q.order_index\n)\nSELECT COUNT(*) AS updated_rows FROM upd;"

out = pathlib.Path(r'd:\Odisha Quiz Competition\tmp_odia_update.sql')
out.write_text(sql, encoding='utf-8')
print(json.dumps({'parsed_rows':len(rows),'min':min(m) if m else None,'max':max(m) if m else None,'sql_path':str(out)}))
