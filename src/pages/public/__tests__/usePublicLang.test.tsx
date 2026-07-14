import { afterEach, describe, expect, it } from 'vitest'
import { act, cleanup, renderHook } from '@testing-library/react'
import { isPublicLang, usePublicLang } from '../usePublicLang'

const KEY = 'prangan_public_lang'

afterEach(() => { cleanup(); localStorage.clear() })

describe('isPublicLang accepts only the two supported codes', () => {
  it('accepts gu and en', () => {
    expect(isPublicLang('gu')).toBe(true)
    expect(isPublicLang('en')).toBe(true)
  })

  it('rejects historical, empty, mis-cased and arbitrary values', () => {
    const bad: unknown[] = ['Gujarati', 'english', '', ' ', 'GU', 'EN', 'gu ', 'fr', 'hi', 'null', 'undefined', null, undefined, 0, 42, {}, []]
    for (const value of bad) {
      expect(isPublicLang(value), `expected ${JSON.stringify(value)} to be rejected`).toBe(false)
    }
  })
})

describe('usePublicLang never crashes on a bad stored value - it falls back to gu', () => {
  // These are the exact hostile inputs called out in the task: a historical
  // full-word value, a lower-case full word, an empty string, and arbitrary
  // text. Before the fix any of these was cast straight into copy[lang], where
  // the first t.* access threw and took down the whole public page.
  for (const stored of ['Gujarati', 'english', '', 'random-extension-junk', 'EN', 'gu ']) {
    it(`falls back to gu when localStorage holds ${JSON.stringify(stored)}`, () => {
      localStorage.setItem(KEY, stored)
      const { result } = renderHook(() => usePublicLang())
      expect(result.current[0]).toBe('gu')
    })
  }

  it('defaults to gu when nothing has ever been stored', () => {
    const { result } = renderHook(() => usePublicLang())
    expect(result.current[0]).toBe('gu')
  })

  it('honours a valid stored en and reflects it on <html lang>', () => {
    localStorage.setItem(KEY, 'en')
    const { result } = renderHook(() => usePublicLang())
    expect(result.current[0]).toBe('en')
    expect(document.documentElement.lang).toBe('en')
  })

  it('persists the chosen value and updates <html lang>', () => {
    const { result } = renderHook(() => usePublicLang())
    act(() => result.current[1]('en'))
    expect(result.current[0]).toBe('en')
    expect(localStorage.getItem(KEY)).toBe('en')
    expect(document.documentElement.lang).toBe('en')
  })

  it('restores <html lang> to gu on unmount (so /app is never left as en)', () => {
    localStorage.setItem(KEY, 'en')
    const { unmount } = renderHook(() => usePublicLang())
    expect(document.documentElement.lang).toBe('en')
    unmount()
    expect(document.documentElement.lang).toBe('gu')
  })

  it('a bad value written after mount still resolves to gu on the next mount', () => {
    localStorage.setItem(KEY, 'Gujarati')
    const first = renderHook(() => usePublicLang())
    expect(first.result.current[0]).toBe('gu')
    // The effect rewrites storage to the resolved, valid code, so a reload is
    // clean rather than repeatedly re-reading the poisoned value.
    expect(localStorage.getItem(KEY)).toBe('gu')
  })
})
