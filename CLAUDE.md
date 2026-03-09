# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

QuizBucket is a study/preparation website for AGQBA-style quiz bowl. It helps students memorize facts and practice skills needed for competition. It is NOT a game simulator — it's a study tool.

### AGQBA Format (for context)
- Round 1: Tossup questions
- Round 2: Tossup with 4 bonus questions
- Round 3: Lightning round (rapid-fire)
- Round 4: Tossup questions

### Study Modes
- **Flashcards**: Flip cards with spaced repetition tracking (LocalStorage)
- **Tossup Practice**: Question text reveals word-by-word, student types answer to buzz in
- **Lightning Round Practice**: 60-second rapid-fire typed answers

## Tech Stack

- **Build**: Vite + React
- **Styling**: Tailwind CSS
- **Data**: Static JSON files in `src/data/`
- **State/Progress**: LocalStorage (no backend, no auth)
- **Deployment**: Static site on Vercel

## Commands

```bash
npm install          # install dependencies
npm run dev          # start dev server
npm run build        # production build
npm run preview      # preview production build
```

## Architecture

- `src/data/` — JSON files containing all study content (flashcard decks, tossup questions, lightning round sets). This is where content is added over time.
- `src/components/` — React components for study modes and UI
- `src/pages/` — Top-level page components
- `src/hooks/` — Custom hooks (progress tracking, spaced repetition logic)

## Content Guidelines

- All quiz content lives in JSON files under `src/data/`
- Adding new content should never require code changes — just add/edit JSON files
- Categories include things like: constitutional amendments, musical instrument families, state nicknames, presidents, world capitals, etc.
