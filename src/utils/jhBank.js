import encrypted from '../data/jh.enc.json'

// The JH packet bank is AES-GCM encrypted with a key derived from the team
// password (see scripts/build-jh.mjs), so the questions never appear in the
// public repo or JS bundle. A wrong password simply fails to decrypt.

const SESSION_KEY = 'quizbucket-jh-unlock'

const fromBase64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0))

export async function decryptBank(password) {
  const subtle = globalThis.crypto?.subtle
  if (!subtle) throw new Error('This page needs a secure (https) connection to unlock.')
  const baseKey = await subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey'])
  const key = await subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: fromBase64(encrypted.salt), iterations: encrypted.iterations },
    baseKey, { name: 'AES-GCM', length: 256 }, false, ['decrypt'],
  )
  let gzipped
  try {
    gzipped = await subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(encrypted.iv) }, key, fromBase64(encrypted.data))
  } catch {
    return null
  }
  const stream = new Blob([gzipped]).stream().pipeThrough(new DecompressionStream('gzip'))
  return JSON.parse(await new Response(stream).text())
}

// Remember the password for this browser tab only, so a refresh doesn't re-prompt
export function getSessionPassword() {
  try { return sessionStorage.getItem(SESSION_KEY) } catch { return null }
}

export function setSessionPassword(password) {
  try {
    if (password) sessionStorage.setItem(SESSION_KEY, password)
    else sessionStorage.removeItem(SESSION_KEY)
  } catch { /* storage unavailable */ }
}
