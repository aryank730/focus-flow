# Focus Flow

A lightweight Pomodoro-style focus timer that runs entirely in the browser, with a task list and daily stats tracked alongside it.

## Features

- Focus / short break / long break timer modes with a circular progress ring
- Task list — add tasks, mark them done, and track focus sessions (pomodoros) per task
- Daily stats: sessions completed, focus minutes, and current day streak
- Configurable focus/short break/long break durations
- Everything is saved to `localStorage`, so your tasks and history persist between visits

## Running it

No build step or dependencies — just open [index.html](index.html) in a browser.

```
open index.html
```

## Files

- [index.html](index.html) — app markup
- [style.css](style.css) — styling
- [app.js](app.js) — timer, task list, and stats logic
