import { Plus } from 'lucide-preact'
import { render } from 'preact'

import './style.css'
import './sw'

import { useEffect, useState } from 'preact/hooks'

import { CardList } from './components/CardList'
import { activeCardId, isAddCardFormVisible, saveCard } from './store'
import { AddCardForm } from './components/AddCardForm'

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
      <h1>Tessera </h1>
      <input
        type="text"
        class="search-input"
        placeholder="Search cards..."
        value={query}
        onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
      />
      <CardList />
      <button
        class="add-card-button"
        onClick={() => (isAddCardFormVisible.value = !isAddCardFormVisible.value)}
      >
        <Plus />
      </button>
      {isAddCardFormVisible.value === true && (
        <AddCardForm
          onSave={async (card) => saveCard(card)}
          onClose={() => (isAddCardFormVisible.value = false)}
        />
      )}
    </>
  )
}

render(<App />, document.querySelector<HTMLDivElement>('#app')!)
