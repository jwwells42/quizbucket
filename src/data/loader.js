import amendments from './flashcards/amendments.json'
import musicalFamilies from './flashcards/musical-families.json'
import stateNicknames from './flashcards/state-nicknames.json'
import elements from './flashcards/elements.json'
import presidents from './flashcards/presidents.json'
import greekRomanMythology from './flashcards/greek-roman-mythology.json'
import stateCapitals from './flashcards/state-capitals.json'
import authorsWorks from './flashcards/authors-works.json'
import mathVocabulary from './flashcards/math-vocabulary.json'
import worldCapitals from './flashcards/world-capitals.json'
import scienceTerms from './flashcards/science-terms.json'
import worldHistory from './flashcards/world-history.json'
import artMusic from './flashcards/art-music.json'
import wordRoots from './flashcards/word-roots.json'
import civics from './flashcards/civics.json'
import shakespeare from './flashcards/shakespeare.json'
import humanBody from './flashcards/human-body.json'
import tossups from './tossups.json'
import lightning from './lightning.json'

export const flashcardDecks = [
  amendments,
  musicalFamilies,
  stateNicknames,
  elements,
  presidents,
  greekRomanMythology,
  stateCapitals,
  authorsWorks,
  mathVocabulary,
  worldCapitals,
  scienceTerms,
  worldHistory,
  artMusic,
  wordRoots,
  civics,
  shakespeare,
  humanBody,
]

export function getDeck(id) {
  return flashcardDecks.find(deck => deck.id === id)
}

export { tossups, lightning }
