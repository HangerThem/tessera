import './style.css'
import { createIcons, Plus, ScanBarcode, Trash2, X } from 'lucide'

import './sw'
import { AddCardForm } from './components/AddCardForm'
import { CardList, syncActiveCard } from './components/CardList'
import state from './state'

const app = document.querySelector<HTMLDivElement>('#app')!
app.innerHTML = `
  <h1>Tessera</h1>
  <input type="text" id="search-input" class="search-input" placeholder="Search cards..." />
  <div class="cards-container"></div>
  <button class="add-card-button" id="add-card-button"><i data-lucide="plus"></i></button>
  <div id="add-card-form"></div>
`

const searchInput = app.querySelector<HTMLInputElement>('#search-input')!
searchInput.addEventListener('input', () => {
  const query = searchInput.value.trim()
  const filteredCards = state.searchCards(query)
  CardList(app.querySelector('.cards-container')!, filteredCards)
})
const cardsContainer = app.querySelector<HTMLDivElement>('.cards-container')!
const formEl = app.querySelector<HTMLFormElement>('#add-card-form')!
const addCardButton = app.querySelector<HTMLButtonElement>('#add-card-button')!

const render = () => {
  CardList(cardsContainer)
}

const updateActiveCard = () => {
  syncActiveCard(cardsContainer)
}

state.subscribe('cards', render)
state.subscribe('activeCard', updateActiveCard)

render()

AddCardForm(
  formEl,
  async (card) => {
    await state.saveCard(card)
  },
  () => (state.isAddCardFormVisible = false),
)

addCardButton?.addEventListener('click', () => {
  state.isAddCardFormVisible = !state.isAddCardFormVisible
})

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    state.isAddCardFormVisible = false
  }
})

history.pushState(null, '', location.href)

window.addEventListener('popstate', () => {
  if (state.activeCardId || state.isAddCardFormVisible) {
    state.activeCardId = null
    state.isAddCardFormVisible = false
    history.pushState(null, '', location.href)
    console.log('Back navigation intercepted')
  }
})

state.subscribe('isAddCardFormVisible', () => {
  if (state.isAddCardFormVisible) {
    formEl.style.display = 'block'
  } else {
    formEl.style.display = 'none'
  }
})

createIcons({
  icons: {
    Trash2,
    Plus,
    X,
    ScanBarcode,
  },
})
