import { Plus } from 'lucide-preact'
import { render } from 'preact'

import './style.css'
import './sw'
import './utils/theme'

import { useEffect, useState } from 'preact/hooks'

import { AddCardForm } from './components/AddCardForm'
import { CardList } from './components/CardList'
import { Input } from './components/ui/Input'
import { activeCardId, isAddCardFormVisible, saveCard } from './store'

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
      if (e.key === 'Escape') isAddCardFormVisible.value = false
    }

    window.addEventListener('popstate', onPopState)
    document.addEventListener('keydown', onKeyDown)

    return () => {
      window.removeEventListener('popstate', onPopState)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  return (
    <>
      <h1 className="text-2xl font-bold mb-1">Tessera</h1>
      <Input
        type="text"
        placeholder="Search cards..."
        value={query}
        onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
      />
      <CardList />
      <button
        className="fixed bottom-4 right-4 p-3 rounded-full bg-foreground/10 text-foreground shadow-lg hover:bg-foreground/30 transition-colors cursor-pointer"
        onClick={() => (isAddCardFormVisible.value = !isAddCardFormVisible.value)}
      >
        <Plus />
      </button>
      {isAddCardFormVisible.value && (
        <AddCardForm
          onSave={async (card) => saveCard(card)}
          onClose={() => (isAddCardFormVisible.value = false)}
        />
      )}
    </>
  )
}

render(<App />, document.querySelector<HTMLDivElement>('#app')!)
