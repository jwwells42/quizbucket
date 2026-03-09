import amendments from './flashcards/amendments.json'
import musicalFamilies from './flashcards/musical-families.json'
import stateNicknames from './flashcards/state-nicknames.json'
import elements from './flashcards/elements.json'
import tossups from './tossups.json'
import lightning from './lightning.json'

export const flashcardDecks = [amendments, musicalFamilies, stateNicknames, elements]

export function getDeck(id) {
  return flashcardDecks.find(deck => deck.id === id)
}

export { tossups, lightning }
