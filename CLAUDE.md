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
- **Tossup Practice**: Question text reveals word-by-word, student types answer to buzz in. Randomized rounds of 20. Toggle between "Tossup Only" (Rounds 1 & 4) and "Tossup + Bonus" (Round 2) — bonus pulls 4 questions from a random lightning topic, 5 pts each + 20 pt sweep bonus.
- **Lightning Round Practice**: Single topic per round, 10 questions pulled randomly from a larger bank, 60-second timer
- **Memorize** (unified page at `/memorize`):
  - *Texts*: 5-level progressive memorization (full text → first-letter hints → blanks → mostly blank → recite from memory). Inline fill-in-the-blank with peek-to-reveal eye icon. Supports line breaks for poetry.
  - *Sequences*: Learn ordered lists (presidents, monarchs, elements, etc.) through 5 progressive drill types: Learn (chunk build-up), Fill the Gap, Next & Before, Position Quiz, Full Recitation. Collapsible full list reference panel.
  - Users can add custom texts and sequences (stored in LocalStorage).
- **Math Computation**: Procedurally generated math problems with 30-second timer (AGQBA gives 20s, extra time for reading and typing). Grade-appropriate difficulty. 10 problems per round.

## Tech Stack

- **Build**: Vite + React
- **Styling**: Tailwind CSS v4 (dark mode theme)
- **Data**: Static JSON files in `src/data/`
- **State/Progress**: LocalStorage (no backend, no auth)
- **Navigation**: Memorize page uses URL search params (`?id=` for texts, `?seq=`/`?drill=` for sequences) so browser back/forward works within multi-step flows
- **Custom Content**: Users can create their own texts and sequences in-app (stored in LocalStorage via `useCustomContent` hook)
- **Deployment**: Static site on Vercel (rewrites configured in `vercel.json`)

## Commands

```bash
npm install          # install dependencies
npm run dev          # start dev server
npm run build        # production build
npm run preview      # preview production build
```

## Workflow

After making changes, always follow this sequence:

1. `npm run build` — verify the production build succeeds before committing
2. Commit and `git push`
3. Update documentation where relevant:
   - `CLAUDE.md` — if architecture, content counts, study modes, or guidelines changed
   - `README.md` — if user-facing features or content changed
   - Memory files (`~/.claude/projects/.../memory/`) — if roadmap status, user preferences, or project context changed

## Architecture

- `src/data/flashcards/` — Flashcard deck JSON files (one per topic)
- `src/data/tossups.json` — Tossup questions (120 across 8 categories)
- `src/data/lightning.json` — Lightning round question banks (all topics, 25 Qs each)
- `src/data/texts.json` — Texts for the memorizer (supports `\n` for line breaks; 5-level system with first-letter hints and peek)
- `src/data/sequences.json` — Sequence data for ordered list memorization (6 sequences)
- `src/data/loader.js` — Imports and exports all data; add new decks here
- `src/context/LevelContext.jsx` — Grade-level filter context (LevelProvider, useLevel hook)
- `src/components/` — React components (Layout with nav + level picker)
- `src/data/mathProblems.js` — Procedural math problem generator (grade-leveled, infinite problems)
- `src/pages/Sequence.jsx` — Sequence drill components (imported by Memorize page, not a standalone route)
- `src/pages/` — Page components (Home, FlashcardList, FlashcardStudy, Tossup, Lightning, Memorize, Computation)
- `src/hooks/useProgress.js` — LocalStorage progress tracking (flashcards, tossups, lightning, computation, sequences)
- `src/hooks/useCustomContent.js` — LocalStorage for user-created custom texts and sequences

## Content Guidelines

- All quiz content lives in JSON files under `src/data/`
- Adding new content should never require code changes — just add/edit JSON files and update `loader.js`
- Flashcard decks go in `src/data/flashcards/<topic>.json`; lightning sets go in `src/data/lightning.json`
- Memorizer texts go in `src/data/texts.json` — use `\n` for line breaks (important for poetry)
- Flashcard format: `{ "id": "...", "title": "...", "description": "...", "levels": ["3/4", "5/6", "7-9", "9-12"], "cards": [{ "front": "...", "back": "..." }] }`
- Lightning format: `{ "id": "...", "title": "...", "levels": ["3/4", "5/6", "7-9", "9-12"], "questions": [{ "question": "...", "answer": "..." }] }` — bank should have 20+ questions (10 are pulled randomly per round)
- Tossup format: `{ "question": "...", "answer": "...", "category": "...", "levels": ["3/4", "5/6", "7-9", "9-12"] }` — no "For ten points" phrasing
- Sequence format: `{ "id": "...", "title": "...", "description": "...", "levels": [...], "chunks": [{ "label": "...", "items": ["..."] }] }` — items are ordered, chunks group items by era/category
- **Grade levels**: Every content item has a `levels` array with one or more of: `"3/4"`, `"5/6"`, `"7-9"`, `"9-12"`. Content is filtered by the selected level in the nav dropdown. Use all four levels for content appropriate to all grades.
- Bidirectional flashcards are preferred (e.g. "Gold → Au" and "Au → Gold" as separate cards)
- **Lightning question rules**: Every answer must be a single word or short phrase — never a list or multi-part answer. Questions must not contain or directly hint at the answer (e.g., don't ask about "sediment" when the answer is "sedimentary"). Questions should be tightly focused on the topic with clear, unambiguous answers.

## Current Content (39 decks, 36 lightning topics, 120 tossups, 4 texts, 6 sequences)

Flashcard decks: Amendments, Musical Families, State Nicknames, Elements, Presidents, Greek/Roman Mythology, State Capitals, Authors & Works, Math Vocabulary, World Capitals, Biology Terms, Chemistry Terms, Physics Terms, World History, Art & Music, Word Roots, U.S. Civics, Shakespeare, Human Body, Grammar & Literary Devices, Physical Geography, Economics, Music Theory, Supreme Court Cases, American Literature, Famous Paintings, Classical Composers, Norse Mythology, Famous Battles, Astronomy & Space, World Religions, Philosophy, Psychology, British Monarchs, Explorers, Egyptian Mythology, Geology, Math Formulas, Civil Rights

Lightning topics: Presidents, Elements, State Capitals, Greek/Roman Gods, Authors, Math Vocabulary, World Capitals, Biology Terms, Chemistry Terms, Physics Terms, World History, Art & Music, Word Roots, Civics, Shakespeare, Human Body, Grammar & Literary Devices, Physical Geography, Economics, Music Theory, Supreme Court Cases, American Literature, Famous Paintings, Classical Composers, Norse Mythology, Famous Battles, Astronomy & Space, World Religions, Philosophy, Psychology, British Monarchs, Explorers, Egyptian Mythology, Geology, Math Formulas, Civil Rights (36 topics, 25 Qs each)

Memorizer texts: Preamble, Gettysburg Address, Declaration of Independence (opening), Shakespeare's Sonnet 29

Sequences: U.S. Presidents in Order, Constitutional Amendments in Order, English & British Monarchs, Elements by Atomic Number (1–36), Planets of the Solar System, Books of the Bible (Old Testament)
