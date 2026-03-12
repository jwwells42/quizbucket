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
import grammarLiteraryDevices from './flashcards/grammar-literary-devices.json'
import geographyPhysical from './flashcards/geography-physical.json'
import economics from './flashcards/economics.json'
import musicTheory from './flashcards/music-theory.json'
import famousPaintings from './flashcards/famous-paintings.json'
import americanLiterature from './flashcards/american-literature.json'
import supremeCourt from './flashcards/supreme-court.json'
import famousBattles from './flashcards/famous-battles.json'
import worldReligions from './flashcards/world-religions.json'
import astronomy from './flashcards/astronomy.json'
import norseMythology from './flashcards/norse-mythology.json'
import classicalComposers from './flashcards/classical-composers.json'
import psychology from './flashcards/psychology.json'
import explorers from './flashcards/explorers.json'
import britishMonarchs from './flashcards/british-monarchs.json'
import geology from './flashcards/geology.json'
import mathFormulas from './flashcards/math-formulas.json'
import civilRights from './flashcards/civil-rights.json'
import philosophy from './flashcards/philosophy.json'
import egyptianMythology from './flashcards/egyptian-mythology.json'
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
  grammarLiteraryDevices,
  geographyPhysical,
  economics,
  musicTheory,
  famousPaintings,
  americanLiterature,
  supremeCourt,
  famousBattles,
  worldReligions,
  astronomy,
  norseMythology,
  classicalComposers,
  psychology,
  explorers,
  britishMonarchs,
  geology,
  mathFormulas,
  civilRights,
  philosophy,
  egyptianMythology,
]

export function getDeck(id) {
  return flashcardDecks.find(deck => deck.id === id)
}

export { tossups, lightning }
