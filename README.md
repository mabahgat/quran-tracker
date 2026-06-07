# Quran Memorization Cadence

A cross-platform (iOS + Android) mobile app to track the **cadence of Quran memorization (hifz)**.
Create a plan, choose how fast you want to finish, log your progress each day, and the app projects
**when you will finish** at your current pace — with your position marked by **Surah and verse**.

Built with **Expo + React Native + TypeScript**. UI fully localized in **English and Arabic** with
right-to-left (RTL) support. Data is stored **locally on the device** today, behind a storage
abstraction that is ready for a **remote backend** in the future.

## Features

- **Plans** with a name and a **cadence template**: `100 days`, `6 months`, `1 year`, `2 years`.
  Each template sets a daily verse goal (the whole Quran is 6236 verses).
- **Default plan** that loads automatically on the home screen when you open the app.
- **Daily logging**: mark a day as **Full** (hit the goal), **Partial** (enter the exact verses you
  memorized), or **Missed** (0).
- **Live projection**: your current pace → projected finish date, compared against the plan's target,
  showing whether you are **ahead** or **behind**.
- **Position tracking** by Surah name/number and verse number (e.g. `Al-Baqarah (2) : 56`).
- **English + Arabic** with automatic device-language detection and instant in-app switching (RTL aware).

## Tech stack

| Concern        | Choice                                             |
| -------------- | -------------------------------------------------- |
| Framework      | Expo SDK 56, React Native, TypeScript              |
| Navigation     | expo-router (file-based)                            |
| Local storage  | expo-sqlite (native) behind a repository interface |
| Localization   | i18next + react-i18next + expo-localization        |
| Testing        | Jest (jest-expo preset)                            |

## Getting started

Prerequisites: **Node.js** and **npm**. No Xcode or Android SDK is required to run on a real device.

```bash
npm install
npx expo start
```

Then:

- **On your phone (easiest):** install **Expo Go** from the App Store / Play Store and scan the QR
  code shown in the terminal. The app runs on your real iOS or Android device.
- **iOS simulator / Android emulator:** press `i` or `a` in the terminal (requires Xcode / Android
  Studio installed).
- **Web preview:** press `w` (or `npm run web`). Useful for a quick UI look. On web the app uses an
  in-memory store (no persistence) so the SQLite WASM worker is not bundled.

### Scripts

```bash
npm run start        # start the Expo dev server
npm run ios          # start on iOS simulator
npm run android      # start on Android emulator
npm run web          # start in the browser
npm test             # run the Jest test suite
npm run type-check   # TypeScript type-check (tsc --noEmit)
npm run lint         # Expo ESLint
```

## Project structure

```
src/
  app/                      expo-router screens
    _layout.tsx             root: providers (storage, app state, i18n) + navigation stack
    (tabs)/                 bottom tabs
      index.tsx             Home dashboard (default plan, daily logging, projection)
      plans.tsx             Plans list (set default, delete)
      settings.tsx          Language + default plan + about
    plans/
      new.tsx               Create a plan (name + cadence template)
      [id].tsx              Plan detail: stats, projection, history
  domain/                   pure, fully unit-tested business logic (no RN/Expo imports)
    quranData.ts            the 114 surahs (Arabic + English names, verse counts)
    quran.ts                position math: verse count <-> (surah, ayah)
    templates.ts            loads + validates the cadence templates from JSON resources
    schedule.ts             full day-by-day schedule generation
    progress.ts             status -> verses, aggregation helpers
    projection.ts           pace, projected finish date, ahead/behind target
  resources/
    templates/*.json        human-readable cadence definitions (computed + scheduled kinds)
    schedules/*.json         explicit expert timetables (e.g. incremental-100-days, from the Excel)
  data/                     storage layer (local now, remote-ready)
    db.ts / db.web.ts       SQLite (native) / in-memory (web) initialization
    repositories/           Plan/Progress/Settings interfaces + sqlite & memory impls
    RepositoryProvider.tsx  injects the active storage implementation
  i18n/                     i18next config + en.json / ar.json
  state/                    AppProvider (language, plans, default plan) + usePlan hook
  components/               Screen, Card, Button, ProgressBar, Badge, InfoRow, Toast, ...
  hooks/, utils/            theme, direction (RTL), date math, formatting, ids
```

## Cadence templates (resource files)

The four cadence templates are defined in human-readable JSON under
`src/resources/templates/` (e.g. `100-days.json`), each with its localized names, a `kind`
(`computed` or `scheduled`), nominal `durationDays`, `dailyTarget`, and `totalVerses`.
`domain/templates.ts` loads and validates these at startup. When a plan is created (or its cadence
changed), the resolved template is **snapshotted onto the plan** and persisted, so later edits to a
resource file never retroactively change the cadence, projection, or schedule of plans the user
already created.

There are seven templates: **100 days**, **Incremental 100 days**, **6 months**, **Incremental 6
months**, **1 year**, **Incremental 1 year**, and **2 years**. A `computed` template derives a flat
day-by-day schedule by even division; a `scheduled` template (the three **Incremental** ones) is
backed by an explicit, expert-authored timetable resource (below). Projection/progress are identical
for both kinds — only the schedule view and the daily goal differ (scheduled plans use the schedule's
actual per-day amount).

### Explicit day-by-day timetables (scheduled templates)

The three **Incremental** templates each ship an expert, day-by-day timetable in
`src/resources/schedules/` (e.g. `incremental-100-days.json`): phases, page-based daily portions, a
periodic review day (every 10 days for the 100-day plan, weekly for the others), and per-day
from→to Surah:Ayah with page numbers. They are generated from Excel workbooks with
`scripts/convert_schedule.py`, which maps the Arabic surah names to numbers via the app's own dataset,
derives phases from the review-day boundaries, and **verifies the schedule covers the whole Quran**
(continuous from Al-Fatihah 1:1 / page 1 to An-Nas 114:6 / page 604, all 6236 ayat) before writing:

```bash
python scripts/convert_schedule.py incremental-100-days \
  <Quran_Tracker_Surah_Ayah.xlsx> src/domain/quranData.ts src/resources/schedules/incremental-100-days.json
python scripts/convert_schedule.py incremental-6-months \
  <Quran_Tracker_6Months.xlsx>     src/domain/quranData.ts src/resources/schedules/incremental-6-months.json
python scripts/convert_schedule.py incremental-1-year \
  <Quran_Tracker_1Year.xlsx>       src/domain/quranData.ts src/resources/schedules/incremental-1-year.json
```

`domain/explicitSchedule.ts` loads and validates them. When you open the schedule for one of the
**Incremental** templates, the app renders that exact timetable (dated from the plan's start date)
instead of the flat computed schedule, and the home daily goal uses the schedule's actual per-day
amount. Progress and projection still use the verse-count model.

## How the projection works

- Daily goal is derived from the template: `ceil(6236 / template days)`.
- A logged day credits verses: **Full** = the daily goal, **Partial** = the number you enter,
  **Missed** = 0.
- Total memorized verses map forward from `Al-Fatihah (1:1)` to a current **Surah : Ayah** position.
- Your **pace** = total verses memorized ÷ days elapsed (from the plan start to your latest log).
- **Projected finish** = today + (verses remaining ÷ pace), compared to the plan's target finish date.

## Storage and future remote sync

All persistence goes through small repository interfaces (`PlanRepository`, `ProgressRepository`,
`SettingsRepository`). The native app uses a SQLite implementation; a future remote backend only needs
a new implementation of those interfaces wired into `initRepositories()` — no UI changes required.

## Testing

Pure domain logic and the storage contract are covered by Jest:

```bash
npm test
```

This validates, among other things, that the dataset totals exactly 6236 verses, that positions map
correctly to Surah/verse, that projections handle the start, partial, missed, behind-schedule and
completed cases, and a full create-plan → log → project flow through the repositories.

## Notes on Arabic / RTL

The active language drives text alignment and row order so content flips immediately when switching.
Because React Native applies full native layout mirroring at startup, switching language may prompt you
to reopen the app once to fully mirror the navigation chrome.

## Roadmap

- Remote storage and cross-device sync (architecture already in place).
- Custom start position and back-to-front (Juz Amma first) memorization order.
- Reminders / notifications, streaks, and progress charts.
