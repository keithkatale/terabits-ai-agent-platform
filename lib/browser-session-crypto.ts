/**
 * AES-256-CBC encryption for browser session storage state.
 * Session cookies contain auth tokens — they must never be stored in plaintext.
 *
 * Key derivation: SHA-256 of BROWSER_SESSION_SECRET (or SUPABASE_JWT_SECRET as fallback).
 * Always 32 bytes regardless of input length.
 */

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto'

function getKey(): Buffer {
  const raw =
    process.env.BROWSER_SESSION_SECRET?.trim() ||
    process.env.SUPABASE_JWT_SECRET?.trim() ||
    'dev-only-insecure-key-change-in-production'
  return createHash('sha256').update(raw).digest() // always 32 bytes
}

/**
 * Encrypts a JSON-serializable value.
 * Returns a hex string: "<iv_hex>:<ciphertext_hex>"
 */
export function encryptSessionState(value: unknown): string {
  const key = getKey()
  const iv = randomBytes(16)
  const cipher = createCipheriv('aes-256-cbc', key, iv)
  const json = JSON.stringify(value)
  const encrypted = Buffer.concat([cipher.update(json, 'utf8'), cipher.final()])
  return iv.toString('hex') + ':' + encrypted.toString('hex')
}

/**
 * Decrypts a value previously encrypted with encryptSessionState.
 */
export function decryptSessionState<T = unknown>(ciphertext: string): T {
  const key = getKey()
  const [ivHex, encHex] = ciphertext.split(':')
  if (!ivHex || !encHex) throw new Error('Invalid ciphertext format')
  const iv = Buffer.from(ivHex, 'hex')
  const enc = Buffer.from(encHex, 'hex')
  const decipher = createDecipheriv('aes-256-cbc', key, iv)
  const decrypted = Buffer.concat([decipher.update(enc), decipher.final()])
  return JSON.parse(decrypted.toString('utf8')) as T
}
