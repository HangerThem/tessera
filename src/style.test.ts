import { describe, expect, it } from 'vitest'

import css from './style.css?raw'

describe('style.css', () => {
  it('does not load anything from other origins', () => {
    // Everything must be bundled: requests to third parties leak visits and break offline use.
    expect(css).not.toMatch(/https?:\/\//)
  })
})
