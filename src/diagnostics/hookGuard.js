export function guard(label, fn, fallback = {}) {
  try {
    console.log(`[GUARD] ${label} start`)
    const out = fn()
    console.log(`[GUARD] ${label} end`, out)
    return out
  } catch (err) {
    console.error(`[GUARD][ERROR] ${label}`, err)
    return fallback
  }
}

