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
- **Tossup Practice**: Question text reveals word-by-word, student types answer to buzz in
- **Lightning Round Practice**: Single topic per round, 10 questions pulled randomly from a larger bank, 60-second timer
- **Text Memorizer**: Progressively memorize texts across 4 levels (full text → inline blanks → mostly blank → recite from memory). Supports line breaks for poetry.

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
- `src/data/tossups.json` — Tossup questions (40 across 7 categories)
- `src/data/lightning.json` — Lightning round question banks (all topics, 25 Qs each)
- `src/data/texts.json` — Texts for the memorizer (supports `\n` for line breaks)
- `src/data/loader.js` — Imports and exports all data; add new decks here
- `src/components/` — React components (Layout with nav)
- `src/pages/` — Page components (Home, FlashcardList, FlashcardStudy, Tossup, Lightning, Memorize)
- `src/hooks/` — Custom hooks (useProgress for LocalStorage tracking)

## Content Guidelines

- All quiz content lives in JSON files under `src/data/`
- Adding new content should never require code changes — just add/edit JSON files and update `loader.js`
- Flashcard decks go in `src/data/flashcards/<topic>.json`; lightning sets go in `src/data/lightning.json`
- Memorizer texts go in `src/data/texts.json` — use `\n` for line breaks (important for poetry)
- Flashcard format: `{ "id": "...", "title": "...", "description": "...", "cards": [{ "front": "...", "back": "..." }] }`
- Lightning format: `{ "id": "...", "title": "...", "questions": [{ "question": "...", "answer": "..." }] }` — bank should have 20+ questions (10 are pulled randomly per round)
- Tossup format: `{ "question": "...", "answer": "...", "category": "..." }` — no "For ten points" phrasing
- Bidirectional flashcards are preferred (e.g. "Gold → Au" and "Au → Gold" as separate cards)

## Current Content (21 decks, 19 lightning topics, 40 tossups, 4 texts)

Flashcard decks: Amendments, Musical Families, State Nicknames, Elements, Presidents, Greek/Roman Mythology, State Capitals, Authors & Works, Math Vocabulary, World Capitals, Science Terms, World History, Art & Music, Word Roots, U.S. Civics, Shakespeare, Human Body, Grammar & Literary Devices, Physical Geography, Economics, Music Theory

Lightning topics: Presidents, Elements, State Capitals, Greek/Roman Gods, Authors, Math Vocabulary, World Capitals, Science Terms, World History, Art & Music, Word Roots, Civics, Shakespeare, Human Body, Grammar & Literary Devices, Physical Geography, Economics, Music Theory

Memorizer texts: Preamble, Gettysburg Address, Declaration of Independence (opening), Sonnet 29
