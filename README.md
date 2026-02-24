# Gym Progress Tracker

A lightweight single-page web app for tracking gym workouts and body-weight trends.

## Features

- Log workouts with date, exercise, sets, reps, weight, and optional body weight.
- Automatic metrics: total volume, number of training days, heaviest lift, and latest body weight.
- Estimated 1RM trend chart over time.
- Persistent storage in browser `localStorage`.
- Delete individual entries or reset all data.
- **Load Demo Data** button so the dashboard is instantly visible with sample workouts.

## Run locally

Because this is a static app, any local server works:

```bash
python -m http.server 8000
```

Then open <http://localhost:8000>.
