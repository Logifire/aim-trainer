# Aim Trainer — Free Browser Tracking Aim Practice

> Improve your **tracking aim**, **mouse control** and **muscle memory** directly in the browser. No install, no login — practice smooth tracking, build precision and stay consistent.

![Aim Trainer](https://img.shields.io/badge/Aim%20Trainer-Tracking%20Practice-7e22ce) ![Free](https://img.shields.io/badge/Free-Browser%20Only-34d399) ![Open Source](https://img.shields.io/badge/License-GPL--3.0-blue)

**Live demo:** `https://your-domain.github.io/aim-trainer/` *(replace with your GitHub Pages URL)*

**Keywords for search:** aim trainer, aim practice, tracking aim trainer, mouse accuracy trainer, muscle memory practice, FPS aim training, free aim trainer browser, smooth tracking practice

---

## Why this Aim Trainer?

Most aim trainers are bloated or require installs. This is a **lightweight, 100% client-side tracking trainer** focused on one thing: **keeping your crosshair on a moving target**. Perfect for FPS players (Valorant, Counter-Strike, Apex, Overwatch, Fortnite) who want to improve:

- **Tracking aim** – follow smooth arcs, zig-zag bounces and reactive shifts
- **Mouse control & muscle memory** – consistent hand-eye coordination
- **Accuracy vs Time on Target (TOT)** – measurable progress
- **Speed control** – from Very Slow (0.3×) to Max Speed (3.5×)

Everything runs locally with `localStorage` — your best accuracy, best Time on Target and recent sessions stay on your device.

---

## Features

- **Three movement patterns**
  - `Smooth Sine Wave` — fluid, predictable arcs
  - `Zig-Zag Bounces` — sharp direction changes
  - `Reactive Shifts (Hard)` — random teleports to break prediction
- **Adjustable target**
  - Shape: Sphere / Cylinder, Size: 20–100px (Small/Medium/Large presets), Color: Cyan / Emerald / Purple / Coral
- **Speed** — slider 0.3×–3.5× with presets `0.4× / 1.0× / 2.0× / Max`
- **Session control** — 15s / 30s / 60s / Free Play, Pause `[ESC]`, Reset `[R]`, Start/Resume `[SPACE]`, Fullscreen
- **Live tracking** — Time on Target, Accuracy %, Time Remaining, Cursor Coordinates, FPS, Best TOT
- **History** — Recent Training Sessions (`duration • pattern • speed • size`) and Personal Records (Best Accuracy / Best TOT / Total Sessions) stored in `localStorage` (`aim-trainer:history`)
- **Static site** — Vite + React + TypeScript + Tailwind, deployable to GitHub Pages

---

## Quick Start

```bash
# install
npm install

# dev (HMR at http://localhost:5173)
npm run dev

# build (static output in /dist)
npm run build

# preview built site
npm run preview
```

Deploy `dist/` to GitHub Pages, Netlify, Vercel or any static host.

**Controls:**

- `SPACE` — Start / Resume Tracking
- `ESC` — Pause
- `R` — Reset
- Fullscreen button — focus only the arena (Adjust Settings exits fullscreen automatically)

---

## How to Practice Effectively

1. **Warm up** at `0.4×–1.0× Slow` on `Large (80px)` + `Smooth`.
2. **Build precision** at `1.0×–2.0× Standard` on `Medium (55px)`.
3. **Push speed** at `2.0×–3.5× Max` on `Small (32px)` + `Reactive`.
4. Track **Time on Target** over **score** — it reflects real control, not bonus multipliers.
5. Review `Recent Training Sessions` — compare `30s • Reactive • 2.0× speed • 55px` across days.

---

## Tech Stack

- React 18 + TypeScript + Vite
- Tailwind CSS (custom `surface` / `primary` / `secondary` / `tertiary` palette)
- No backend, no cookies, no tracking — all data in `localStorage`

Project structure:

```
src/
  App.tsx              # arena, physics loop (rAF), HUD
  hooks/useHistory.ts  # localStorage history (max 20, display 3)
  types.ts             # SessionRecord { pattern, size, speed, duration, onTargetSec ... }
  ...
```

---

## SEO — For Gamers Searching

If you searched for `free aim trainer browser`, `tracking aim practice`, `mouse muscle memory trainer`, `FPS aim training online`, `how to improve tracking aim` — this is for you. The trainer is intentionally **search-friendly, fast and free**, with no ads or accounts.

---

## License — GPL-3.0

This project is released under the **GNU General Public License v3.0 (GPL-3.0)** — a strong copyleft open-source license with attribution.

**What GPL-3.0 means:**

- You can use, copy, modify and distribute the code, also commercially
- You **must indicate where you took the code from** (keep copyright + license notice)
- Any derivative / distributed version **must also be licensed under GPL-3.0** and its source made available
- No warranty — see full text at https://www.gnu.org/licenses/gpl-3.0.html and https://choosealicense.com/licenses/gpl-3.0/

---

## Built with AI

This project was built with assistance from **AI** — code, UI iteration and copy were generated and refined with **Muse Spark** (Meta) via **OpenCode**. Logic was reviewed, tested and verified locally.