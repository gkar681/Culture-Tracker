# Culture Tracker

A mobile app for molecular biologists to log, track, and analyse their cell culture work — built by someone who has actually done cell culture and got tired of spreadsheets.

---

## The Problem

Cell culture is meticulous, repetitive, and unforgiving. Passage numbers get miscounted. Media change schedules slip. Freeze/thaw histories live in lab notebooks that nobody can find. Reagent lot numbers get lost between experiments. When something goes wrong — contamination, unexpected senescence, inconsistent growth — reconstructing what happened is painful, and often impossible.

Most labs are still tracking this in Excel, paper notebooks, or memory. None of those options are good enough.

---

## What Culture Tracker Does

A mobile-first cell culture management app built in React Native (Expo) with a Supabase backend. Designed to be fast to log and easy to query — including an AI chat interface so you can record updates the way you'd say them out loud, without filling in forms.

**Cell Line Management**
- Full cell line profiles: source, species, tissue type, culture conditions
- Passage history with automatic passage number tracking
- Freeze/thaw logs linked to specific vials and passage numbers
- Growth characteristic notes per line

**Daily Culture Logging**
- Media change logs with date, reagent lots, and notes
- Confluence estimates and morphology observations
- Automatic calculation of days in culture, passages since thaw, and recommended split windows

**Reagents & Protocols**
- Reagent inventory with lot numbers and expiry tracking
- Protocol library attached to specific cell lines
- Full traceability: which reagent lot was used on which cells, when

**Analytics & Visualisations**
- Passage growth curves
- Media change frequency charts
- Culture health trends over time

---

## Tech Stack

- **Frontend:** React Native (Expo), TypeScript, Expo Router
- **Backend:** Supabase (PostgreSQL + Auth + Row Level Security)
- **Charts:** [charting library]


---

## Status

In active development. Core logging and tracking features are functional. AI chat interface is the next major milestone.

---

## Background

Built out of direct frustration with cell culture record-keeping during research in cellular senescence and retinal biology. The workflows researchers actually use — handwritten notes, colour-coded spreadsheets, WhatsApp messages to labmates — are not fit for purpose. This is an attempt to fix that.
