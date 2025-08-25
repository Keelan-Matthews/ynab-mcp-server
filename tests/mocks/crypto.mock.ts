import { vi } from 'vitest'

// Mock crypto.subtle for cookie signing
export const mockCryptoSubtle = {
  sign: vi.fn(),
  verify: vi.fn(),
  importKey: vi.fn(),
}

// Mock crypto.getRandomValues
export const mockGetRandomValues = vi.fn()

export function setupCryptoMocks() {
  // Mock HMAC signing
  mockCryptoSubtle.sign.mockResolvedValue(new ArrayBuffer(32))
  
  // Mock signature verification
  mockCryptoSubtle.verify.mockResolvedValue(true)
  
  // Mock key import
  mockCryptoSubtle.importKey.mockResolvedValue({} as CryptoKey)
  
  // Mock random values
  mockGetRandomValues.mockImplementation((array: Uint8Array) => {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256)
    }
    return array
  })
}

export function setupCryptoError() {
  mockCryptoSubtle.sign.mockRejectedValue(new Error('Crypto signing failed'))
  mockCryptoSubtle.verify.mockRejectedValue(new Error('Crypto verification failed'))
}

export function resetCryptoMocks() {
  vi.clearAllMocks()
  setupCryptoMocks()
}

// Apply mocks to global crypto object
// @ts-ignore - test environment polyfill
if (!global.crypto) {
  Object.defineProperty(global, 'crypto', {
    value: {
      subtle: mockCryptoSubtle,
      getRandomValues: mockGetRandomValues,
    },
    writable: true,
  })
} else {
  // @ts-ignore - test environment polyfill assignment
  global.crypto.subtle = mockCryptoSubtle
  // @ts-ignore - test environment polyfill assignment
  global.crypto.getRandomValues = mockGetRandomValues
}