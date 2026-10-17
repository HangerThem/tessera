import { render } from 'preact'

import './style.css'
import './sw'
import './utils/theme'
import { App } from './App'

render(<App />, document.querySelector<HTMLDivElement>('#app')!)
