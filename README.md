# QuizBucket

A study tool for AGQBA-style quiz bowl preparation. Built for students and coaches who want to drill facts, practice buzzing, and memorize texts and sequences.

**Live site**: [quizbucket.vercel.app](https://quizbucket.vercel.app)

## Study Modes

- **Flashcards** — Progressive batch learning (5 cards at a time). Drill each batch to zero before moving on. 39 topic decks covering science, history, literature, geography, civics, and more.
- **Tossup Practice** — Question text reveals word-by-word. Buzz in and type your answer. Toggle between Tossup Only and Tossup + Bonus (Round 2 mode). 120 tossups across 8 categories.
- **Lightning Round** — Single topic, 10 questions from a larger bank, 60-second timer. Mirrors the AGQBA Round 3 format. 36 topics, 25 questions each.
- **Text Memorizer** — Memorize speeches and poems across 5 levels: full text, first-letter hints, blanks, mostly blank, then recite from memory. Inline fill-in-the-blank with peek-to-reveal and word-by-word feedback. Add your own custom texts.
- **Math Computation** — Procedurally generated, grade-appropriate math problems with a 30-second timer. 10 problems per round.
- **Sequence Memorizer** — Learn ordered lists (presidents, monarchs, elements, etc.) through 5 drill types: chunked build-up, fill the gap, next/before, position quiz, and full recitation. Add your own custom sequences.

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
- **Sequence**: Add entries to `src/data/sequences.json` (chunked ordered lists)

Users can also create custom texts and sequences directly in the app (stored in LocalStorage).

## Tech Stack

Vite + React, Tailwind CSS v4, React Router, LocalStorage for progress tracking. Deployed as a static site on Vercel.

## License

[AGPL-3.0](LICENSE)
