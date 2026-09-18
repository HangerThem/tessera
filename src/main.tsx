import { CreditCard, Plus } from 'lucide-preact'
import { render } from 'preact'

import './style.css'
import './sw'
import './utils/theme'

import { useEffect, useState } from 'preact/hooks'

import type { Card } from './types/Card.type'

import { ActiveCard } from './components/ActiveCard'
import { AddCardForm } from './components/AddCardForm'
import { CardList } from './components/CardList'
import { EditCardForm } from './components/EditCardForm'
import { Input } from './components/ui/Input'
import { fuzzySearch } from './lib/fuzzy'
import {
  activeCardId,
  cards,
  editCardId,
  isAddCardFormVisible,
  saveCard,
  updateCardById,
} from './store'

function App() {
  const [query, setQuery] = useState('')

  useEffect(() => {
    history.pushState(null, '', location.href)
    const onPopState = () => {
      if (activeCardId || isAddCardFormVisible) {
        activeCardId.value = null
        isAddCardFormVisible.value = false
        history.pushState(null, '', location.href)
      }
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        isAddCardFormVisible.value = false
        activeCardId.value = null
        editCardId.value = null
      }
    }

    window.addEventListener('popstate', onPopState)
    document.addEventListener('keydown', onKeyDown)

    return () => {
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
      <h1 className="text-2xl font-bold mb-1">Tessera</h1>
      <div className="sticky top-0 bg-background/90 backdrop-blur-sm z-10 py-2" role="search">
        <Input
          type="text"
          placeholder="Search cards..."
          aria-label="Search cards"
          autocomplete="off"
          value={query}
          onInput={(e) => (setQuery((e.target as HTMLInputElement).value))}
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

render(<App />, document.querySelector<HTMLDivElement>('#app')!)
