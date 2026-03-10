# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

QuizBucket is a study/preparation website for AGQBA-style quiz bowl. It helps students memorize facts and practice skills needed for competition. It is NOT a game simulator — it's a study tool.

### AGQBA Format (for context)
- Round 1: Tossup questions
- Round 2: Tossup with 4 bonus questions
- Round 3: Lightning round (rapid-fire) — trailing team picks from 3 categories, 60s for 10 questions
- Round 4: Tossup questions
- **Note**: AGQBA does NOT use "For ten points..." phrasing (that's NAQT). Tossups end naturally with "Name this..."

### Study Modes
- **Flashcards**: Flip cards with progressive batch learning (5 at a time, drill to zero, then next batch). Progress tracked in LocalStorage.
- **Tossup Practice**: Question text reveals word-by-word, student types answer to buzz in. Randomized order.
- **Lightning Round Practice**: Single topic per round, 10 questions pulled randomly from a larger bank, 60-second timer
- **Text Memorizer**: 5-level progressive memorization (full text → first-letter hints → blanks → mostly blank → recite from memory). Inline fill-in-the-blank with peek-to-reveal eye icon. Supports line breaks for poetry.
- **Math Computation**: Procedurally generated math problems with 20-second timer (AGQBA-style). Grade-appropriate difficulty. 10 problems per round.

## Tech Stack

- **Build**: Vite + React
- **Styling**: Tailwind CSS v4 (dark mode theme)
- **Data**: Static JSON files in `src/data/`
- **State/Progress**: LocalStorage (no backend, no auth)
- **Deployment**: Static site on Vercel (rewrites configured in `vercel.json`)

## Commands

```bash
npm install          # install dependencies
npm run dev          # start dev server
npm run build        # production build
npm run preview      # preview production build
```

## Architecture

- `src/data/flashcards/` — Flashcard deck JSON files (one per topic)
- `src/data/tossups.json` — Tossup questions (120 across 8 categories)
- `src/data/lightning.json` — Lightning round question banks (all topics, 25 Qs each)
- `src/data/texts.json` — Texts for the memorizer (supports `\n` for line breaks; 5-level system with first-letter hints and peek)
- `src/data/loader.js` — Imports and exports all data; add new decks here
- `src/context/LevelContext.jsx` — Grade-level filter context (LevelProvider, useLevel hook)
- `src/components/` — React components (Layout with nav + level picker)
- `src/data/mathProblems.js` — Procedural math problem generator (grade-leveled, infinite problems)
- `src/pages/` — Page components (Home, FlashcardList, FlashcardStudy, Tossup, Lightning, Memorize, Computation)
- `src/hooks/` — Custom hooks (useProgress for LocalStorage tracking)

## Content Guidelines

- All quiz content lives in JSON files under `src/data/`
- Adding new content should never require code changes — just add/edit JSON files and update `loader.js`
- Flashcard decks go in `src/data/flashcards/<topic>.json`; lightning sets go in `src/data/lightning.json`
- Memorizer texts go in `src/data/texts.json` — use `\n` for line breaks (important for poetry)
- Flashcard format: `{ "id": "...", "title": "...", "description": "...", "levels": ["3/4", "5/6", "7-9", "9-12"], "cards": [{ "front": "...", "back": "..." }] }`
- Lightning format: `{ "id": "...", "title": "...", "levels": ["3/4", "5/6", "7-9", "9-12"], "questions": [{ "question": "...", "answer": "..." }] }` — bank should have 20+ questions (10 are pulled randomly per round)
- Tossup format: `{ "question": "...", "answer": "...", "category": "...", "levels": ["3/4", "5/6", "7-9", "9-12"] }` — no "For ten points" phrasing
- **Grade levels**: Every content item has a `levels` array with one or more of: `"3/4"`, `"5/6"`, `"7-9"`, `"9-12"`. Content is filtered by the selected level in the nav dropdown. Use all four levels for content appropriate to all grades.
- Bidirectional flashcards are preferred (e.g. "Gold → Au" and "Au → Gold" as separate cards)

## Current Content (21 decks, 19 lightning topics, 120 tossups, 4 texts)

Flashcard decks: Amendments, Musical Families, State Nicknames, Elements, Presidents, Greek/Roman Mythology, State Capitals, Authors & Works, Math Vocabulary, World Capitals, Science Terms, World History, Art & Music, Word Roots, U.S. Civics, Shakespeare, Human Body, Grammar & Literary Devices, Physical Geography, Economics, Music Theory

Lightning topics: Presidents, Elements, State Capitals, Greek/Roman Gods, Authors, Math Vocabulary, World Capitals, Science Terms, World History, Art & Music, Word Roots, Civics, Shakespeare, Human Body, Grammar & Literary Devices, Physical Geography, Economics, Music Theory (19 topics, 25 Qs each)

Memorizer texts: Preamble, Gettysburg Address, Declaration of Independence (opening), Shakespeare's Sonnet 29
