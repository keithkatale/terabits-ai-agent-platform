/**
 * Generate a unique workflow slug: w_************ (w_ + 12 alphanumeric).
 * Used for URLs: /workflow/w_xxxxxxxxxxxx
 */

const ALPHANUMERIC = 'abcdefghijklmnopqrstuvwxyz0123456789'

export function generateWorkflowSlug(): string {
  let result = 'w_'
  for (let i = 0; i < 12; i++) {
    result += ALPHANUMERIC[Math.floor(Math.random() * ALPHANUMERIC.length)]
  }
  return result
}
