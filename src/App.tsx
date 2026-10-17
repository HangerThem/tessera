import { effect } from '@preact/signals'
import { CreditCard, Plus } from 'lucide-preact'
import { useEffect, useState } from 'preact/hooks'

import type { Card } from './types/Card.type'

import { ActiveCard } from './components/ActiveCard'
import { AddCardForm } from './components/AddCardForm'
import { CardList } from './components/CardList'
import { EditCardForm } from './components/EditCardForm'
import { ThemeToggle } from './components/ThemeToggle'
import { Input } from './components/ui/Input'
import { fuzzySearch } from './lib/fuzzy'
import {
  activeCardId,
  cards,
  closeTopScreen,
  editCardId,
  isAddCardFormVisible,
  isAnyScreenOpen,
  saveCard,
  updateCardById,
} from './store'

export function App() {
  const [query, setQuery] = useState('')

  useEffect(() => {
    // Keep one extra history entry while a screen is open, so back closes it instead of leaving the
    // app. When nothing is open, back behaves normally.
    const pushScreenEntry = () => history.pushState({ screen: true }, '')
    const disposeEffect = effect(() => {
      if (isAnyScreenOpen.value && !history.state?.screen) pushScreenEntry()
    })

    const onPopState = () => {
      if (closeTopScreen() && isAnyScreenOpen.value) pushScreenEntry()
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeTopScreen()
    }

    window.addEventListener('popstate', onPopState)
    document.addEventListener('keydown', onKeyDown)

    return () => {
      disposeEffect()
      window.removeEventListener('popstate', onPopState)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  const filteredCards =
    query.trim() === ''
      ? cards.value
      : fuzzySearch<Card>(cards.value, query, {
          keys: (c) => [c.name, c.barcodeValue],
          maxErrors: 1,
        }).map((r) => r.item)

  return (
    <main>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold">Tessera</h1>
        <ThemeToggle />
      </div>
      <div className="sticky top-0 bg-background/90 backdrop-blur-sm z-10 py-2" role="search">
        <Input
          type="text"
          placeholder="Search cards..."
          aria-label="Search cards"
          autocomplete="off"
          value={query}
          onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
        />
      </div>
      {activeCardId.value && (
        <ActiveCard card={cards.value.find((c) => c.id === activeCardId.value)!} />
      )}
      {editCardId.value && (
        <EditCardForm
          initialCard={cards.value.find((c) => c.id === editCardId.value)!}
          onSave={async (card) => {
            await updateCardById(editCardId.value!, card)
          }}
          onClose={() => (editCardId.value = null)}
        />
      )}
      {filteredCards.length > 0 ? (
        <CardList cards={filteredCards} />
      ) : (
        <div className="text-center mt-8">
          {query.trim() === '' ? (
            <div className="flex flex-col items-center gap-2 min-h-40 justify-center">
              <CreditCard className="w-10 h-10" aria-hidden="true" />
              <div>
                <p className="text-sm text-foreground/70">No cards yet</p>
                <p className="text-sm text-foreground/70">Click the + button to add one.</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 min-h-40 justify-center">
              <CreditCard className="w-10 h-10" aria-hidden="true" />
              <p className="text-sm text-foreground/70 max-w-80 w-full text-center">
                No cards found for
                <span className="block truncate">"{query}"</span>
              </p>
            </div>
          )}
        </div>
      )}
      <button
        className="fixed bottom-4 right-4 p-3 rounded-full bg-background text-foreground shadow-lg hover:bg-foreground hover:text-background transition-colors cursor-pointer"
        onClick={() => (isAddCardFormVisible.value = !isAddCardFormVisible.value)}
        aria-label={isAddCardFormVisible.value ? 'Close add card form' : 'Add card'}
        aria-expanded={isAddCardFormVisible.value}
      >
        <Plus />
      </button>
      {isAddCardFormVisible.value && (
        <AddCardForm
          onSave={async (card) => saveCard(card)}
          onClose={() => (isAddCardFormVisible.value = false)}
        />
      )}
    </main>
  )
}
