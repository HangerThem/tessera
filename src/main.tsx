import { render } from 'preact'

import './style.css'
import './sw'
import './utils/theme'
import { App } from './App'
import { loadCards } from './store'

render(<App />, document.querySelector<HTMLDivElement>('#app')!)
void loadCards()
