# Migration report — 2026-11-06 14:24

Source: /home/claude/jaschro/logtrim
Output: /home/claude/traintracks

## Gyms
- 8 gyms read (7 personal, copied to equipment/my-gyms/)
- generic.local.json: 1 added machine(s) [Jog], 0 hidden, 0 added room(s)

## Workout log
- 1682 entries; 74 linked to Garmin activities (0 had a garminId field before; the rest came from the notes tag)
- gymId/roomId filled in on 1217 legacy entries; 0 ambiguous (machineId in several gyms, gym name didn't settle it) left without gymId
- machineIds not found in any gym (history kept, shown under the logged names): m1785618032217 (1), m1782186709718 (17), m1785006392732 (2), m1782152863635 (4), m1782152403811 (3), m1782438526308 (6), m1782438536945 (4), m1782151830912 (6), m1782152064365 (2)

## Garmin activities not linked to a log entry (73)
- 2026-06-22 walking 23346621203 (72.57 min) ↔ "Walk" set 1 72 min — "Approx 20 min avg pace bc I stopped for 5-10 minutes"  → LINKED
- 2026-06-23 walking 23358748064 (66.8 min) ↔ "Walk" set 1 66 min  → LINKED
- 2026-06-25 walking 23381439655 (94.53 min) ↔ "Walk" set 1 93 min  → LINKED
- 2026-06-26 walking 23391538478 (65.77 min) ↔ "Walk" set 1 66 min  → LINKED
- 2026-06-27 walking 23399983430 (44.67 min) ↔ "Walk" set 1 44 min  → LINKED
- 2026-06-28 running 23407188803 (15.12 min) ↔ "Run" set 1 15 min — "1.03 miles at 14:43/mile. Total time 15:06"  → LINKED
- 2026-08-03 walking 23843393090 (56.68 min) ↔ "Walk" set 1 56.38 min  → LINKED
- 2026-08-04 walking 23851312429 (51.1 min) ↔ "Walk" set 1 49.21666666666667 min  → LINKED
- 2026-08-05 elliptical 23867475861 (25.28 min) ↔ "Elliptical Cross Trainer" set 1 20 min — "Avg 109 bpm"  → LINKED
- 2026-08-05 walking 23869209428 (39.5 min) ↔ "Walk" set 1 39 min — "Average heart rate: 97 bpm"  → LINKED
- 2026-08-06 walking 23882010483 (47.23 min) ↔ "Walk" set 1 47 min  → LINKED
- 2026-08-09 walking 23917913237 (59.07 min) ↔ "Walk" set 1 53.36666666666667 min  → LINKED
- 2026-08-10 elliptical 23925931913 (25.43 min) ↔ "Elliptical" set 1 25 min — "Zone 1: 1:59
Zone 2: 11:29
Zone 3: 11:48
Zone 4: 0:10"  → LINKED
- 2026-08-10 walking 23930362697 (60.8 min) ↔ "Walk" set 1 60.38333333333333 min  → LINKED
- 2026-08-11 walking 23943963158 (52.17 min) ↔ "Walk" set 1 52.05 min  → LINKED
- 2026-08-12 walking 23956874801 (32.35 min) ↔ "Walk" set 1 32.016666666666666 min  → LINKED
- 2026-08-14 walking 23980844191 (33.15 min) ↔ "Walk" set 1 32.53333333333333 min  → LINKED
- 2026-08-17 walking 24017658584 (54.32 min) ↔ "Walk" set 1 53.833333333333336 min  → LINKED
- 2026-03-10 walking 22133625325 (14.18 min): no matching hand-logged cardio that day — not in the log
- 2026-03-11 walking 22138967069 (19.95 min): no matching hand-logged cardio that day — not in the log
- 2026-03-20 walking 22235446752 (45.17 min): no matching hand-logged cardio that day — not in the log
- 2026-03-26 walking 22304027897 (38.83 min): no matching hand-logged cardio that day — not in the log
- 2026-03-28 walking 22331647796 (51.28 min): no matching hand-logged cardio that day — not in the log
- 2026-06-14 walking 23252119954 (59.45 min): no matching hand-logged cardio that day — not in the log
- 2026-06-15 running 23257080809 (10.35 min): no matching hand-logged cardio that day — not in the log
- 2026-06-15 walking 23260770578 (21 min): no matching hand-logged cardio that day — not in the log
- 2026-06-16 running 23269088272 (17.08 min): no matching hand-logged cardio that day — not in the log
- 2026-06-16 walking 23277120617 (71.93 min): no matching hand-logged cardio that day — not in the log
- 2026-06-17 running 23283499711 (20.18 min): no matching hand-logged cardio that day — not in the log
- 2026-06-18 running 23294456677 (12.57 min): no matching hand-logged cardio that day — not in the log
- 2026-06-18 walking 23298449241 (40.52 min): no matching hand-logged cardio that day — not in the log
- 2026-06-19 walking 23307157597 (128.57 min): no matching hand-logged cardio that day — not in the log
- 2026-06-19 walking 23311295342 (19.92 min): no matching hand-logged cardio that day — not in the log
- 2026-06-20 running 23321125209 (10.93 min): no matching hand-logged cardio that day — not in the log
- 2026-06-21 running 23330288587 (18.6 min): no matching hand-logged cardio that day — not in the log
- 2026-06-21 walking 23333153821 (31.1 min): no matching hand-logged cardio that day — not in the log
- 2026-06-21 walking 23333485233 (23.32 min): no matching hand-logged cardio that day — not in the log
- 2026-06-25 running 23375145156 (17.85 min): no matching hand-logged cardio that day — not in the log
- 2026-07-01 walking 23442849702 (81.1 min): no matching hand-logged cardio that day — not in the log
- 2026-07-02 running 23453183360 (14.47 min): no matching hand-logged cardio that day — not in the log
- 2026-07-02 walking 23459790903 (62.95 min): no matching hand-logged cardio that day — not in the log
- 2026-07-03 walking 23469754676 (121.45 min): no matching hand-logged cardio that day — not in the log
- 2026-07-04 running 23481223168 (12.45 min): no matching hand-logged cardio that day — not in the log
- 2026-07-05 indoor_cardio 23488028449 (21.3 min): no matching hand-logged cardio that day — not in the log
- 2026-07-07 running 23510920787 (16.48 min): no matching hand-logged cardio that day — not in the log
- 2026-07-07 walking 23517898318 (31.73 min): no matching hand-logged cardio that day — not in the log
- 2026-07-08 walking 23524406241 (97.95 min): no matching hand-logged cardio that day — not in the log
- 2026-07-09 indoor_cardio 23536368640 (34.2 min): no matching hand-logged cardio that day — not in the log
- 2026-07-15 walking 23607860887 (78.37 min): no matching hand-logged cardio that day — not in the log
- 2026-07-16 walking 23620089152 (75.95 min): no matching hand-logged cardio that day — not in the log
- 2026-07-17 walking 23632892809 (25.12 min): no matching hand-logged cardio that day — not in the log
- 2026-07-19 walking 23660027400 (27.37 min): no matching hand-logged cardio that day — not in the log
- 2026-07-22 walking 23692150044 (30.42 min): no matching hand-logged cardio that day — not in the log
- 2026-07-22 walking 23697093763 (22.15 min): no matching hand-logged cardio that day — not in the log
- 2026-07-23 walking 23709957270 (50.35 min): no matching hand-logged cardio that day — not in the log
- 2026-07-25 walking 23730840726 (31.3 min): no matching hand-logged cardio that day — not in the log
- 2026-07-26 walking 23743325623 (18.18 min): no matching hand-logged cardio that day — not in the log
- 2026-07-28 walking 23763581619 (20.48 min): no matching hand-logged cardio that day — not in the log
- 2026-07-30 walking 23794066632 (23.88 min): no matching hand-logged cardio that day — not in the log
- 2026-07-31 walking 23802235492 (32.67 min): no matching hand-logged cardio that day — not in the log
- 2026-08-02 indoor_cardio 23829041007 (7.05 min): 2 candidate entries, not linking automatically
- 2026-08-02 walking 23829610466 (24.6 min): no matching hand-logged cardio that day — not in the log
- 2026-08-04 walking 23854320649 (1.03 min): no matching hand-logged cardio that day — not in the log
- 2026-08-04 walking 23856401509 (43.02 min): no matching hand-logged cardio that day — not in the log
- 2026-08-07 walking 23892359300 (13.53 min): no matching hand-logged cardio that day — not in the log
- 2026-08-08 running 23899540352 (13.35 min): no matching hand-logged cardio that day — not in the log
- 2026-08-08 walking 23905728620 (61.22 min): no matching hand-logged cardio that day — not in the log
- 2026-08-11 treadmill_running 23942001318 (24.97 min): no matching hand-logged cardio that day — not in the log
- 2026-08-13 treadmill_running 23967461714 (39.87 min): no matching hand-logged cardio that day — not in the log
- 2026-08-14 treadmill_running 23979087800 (40.02 min): no matching hand-logged cardio that day — not in the log
- 2026-08-16 treadmill_running 23999760455 (45.03 min): no matching hand-logged cardio that day — not in the log
- 2026-08-17 indoor_cycling 24015814175 (29.57 min): no matching hand-logged cardio that day — not in the log
- 2026-08-18 treadmill_running 24027271633 (43.02 min): no matching hand-logged cardio that day — not in the log

To add the 54 activities that were never logged as log rows, run the posting script once with an early --since, e.g.:
  python pipelines/garmin/post_zone_records.py --cardio cardio-minutes.csv --log-json workout-log.json --log-csv workout-log.csv --garmin garmin-recent.json --since 2026-01-01 --dry-run
(indoor types need pipelines/garmin/mapping.json; drop --dry-run to write).

## Copied
- profile.json, goals.json, suggested-workout.json, garmin-recent.json, cardio-minutes.csv, cardio-buckets.csv, daily-wellness.csv, zones.json → pipelines/garmin/, corrections.json → pipelines/garmin/

## Not migrated (by design)
- worker.js, push.bat, purge-tokens.bat, the old scripts/ and workflow files — replaced by pipelines/garmin and .github/workflows/garmin.yml
- Repository secrets (GARMIN_TOKENS, GARMIN_DISPLAY_NAME) and variables (GARMIN_ENABLED, GARMIN_TZ): set them again on the new repo
- Indoor-activity routing that lived only in notes (e.g. Garmin "other" → Jog): add it to pipelines/garmin/mapping.json
