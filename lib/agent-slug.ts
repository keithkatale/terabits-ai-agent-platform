/**
 * Generate a unique agent slug in the format a_************ (a_ + 12 alphanumeric).
 * Used for public URLs: /agent/a_xxxxxxxxxxxx
 */

const ALPHANUMERIC = 'abcdefghijklmnopqrstuvwxyz0123456789'

export function generateAgentSlug(): string {
  let result = 'a_'
  for (let i = 0; i < 12; i++) {
    result += ALPHANUMERIC[Math.floor(Math.random() * ALPHANUMERIC.length)]
  }
  return result
}
