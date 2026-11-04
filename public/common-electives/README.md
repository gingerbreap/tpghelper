# Common Electives master index

Reusable catalogue for HKUBS Faculty-level common electives.

## Layout

- `26-27/index.json` — structured rows from the November enrollment sheet (meetings, prerequisites, other requirements, `notOpenTo`, `crossList`, outline paths).
- `26-27/outlines/` — downloaded course outline PDFs.

## Refresh / merge

```bash
# Re-parse sheet HTML under tmp-common-electives/ + download PDFs
npm run ce:parse

# Apply index → public/{msba,mgm,mecon}/courses.json + requirements antirequisites
npm run ce:merge

# Both
npm run ce:import
```

## Adding a new programme pack later

1. Read `26-27/index.json`.
2. For each course where `notOpenTo` does **not** include the new pack id, inject a `courseType: "Common Elective"` row (copy meetings / outline path).
3. If the pack is the **host** (course prefix matches the programme), update timetable instead and do **not** set Common Elective.
4. Copy bidirectional `antirequisite` / `crossList` rules into that pack’s `requirements.json`.
