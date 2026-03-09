# QuizBucket

A study tool for AGQBA-style quiz bowl preparation. Built for students and coaches who want to drill facts, practice buzzing, and memorize texts.

**Live site**: [quizbucket.vercel.app](https://quizbucket.vercel.app)

## Study Modes

- **Flashcards** — Progressive batch learning (5 cards at a time). Drill each batch to zero before moving on. 21 topic decks covering science, history, literature, geography, civics, and more.
- **Tossup Practice** — Question text reveals word-by-word. Buzz in and type your answer. Tracks accuracy over time.
- **Lightning Round** — Single topic, 10 questions from a larger bank, 60-second timer. Mirrors the AGQBA Round 3 format.
- **Text Memorizer** — Memorize speeches and poems across 4 levels: full text, 30% blanked, 60% blanked, then recite from memory. Inline fill-in-the-blank with word-by-word feedback.

## Getting Started

```bash
npm install
npm run dev
```

## Adding Content

All content is in JSON files under `src/data/`. No code changes needed to add new material.

- **Flashcard deck**: Add a JSON file to `src/data/flashcards/`, then import it in `src/data/loader.js`
- **Lightning round**: Add a question bank to `src/data/lightning.json` (20+ questions per topic)
- **Tossup questions**: Add entries to `src/data/tossups.json`
- **Memorizer text**: Add entries to `src/data/texts.json` (use `\n` for line breaks)

## Tech Stack

Vite + React, Tailwind CSS v4, React Router, LocalStorage for progress tracking. Deployed as a static site on Vercel.

## License

[AGPL-3.0](LICENSE)
