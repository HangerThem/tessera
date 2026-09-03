import './style.css'
import state from './state'
import { CardList, syncActiveCard } from './components/CardList'
import { AddCardForm } from './components/AddCardForm'
import "./sw"

const app = document.querySelector<HTMLDivElement>('#app')!
app.innerHTML = `
  <h1>Tessera</h1>
  <div class="cards-container"></div>
  <button id="add-card-button">Add Card</button>
  <div id="add-card-form"></div>
`

const cardsContainer = app.querySelector<HTMLDivElement>('.cards-container')!
const formEl = app.querySelector<HTMLFormElement>('#add-card-form')!
const addCardButton = app.querySelector<HTMLButtonElement>('#add-card-button')!

const render = () => {
  CardList(cardsContainer)
}

const updateActiveCard = () => {
  syncActiveCard(cardsContainer)
}

state.subscribe("cards", render)
state.subscribe("activeCard", updateActiveCard)

render()

AddCardForm(formEl, async (card) => {
  await state.saveCard(card)
})

addCardButton?.addEventListener('click', () => {
  state.isAddCardFormVisible = !state.isAddCardFormVisible
})

state.subscribe("isAddCardFormVisible", () => {
  if (state.isAddCardFormVisible) {
    formEl.style.display = "block"
  } else {
    formEl.style.display = "none"
  }
})