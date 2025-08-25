import { describe, expect, it } from 'vitest'
import { getApiKeyFromHeader, validateApiKey, makeServiceProps } from '../../src/auth/api-key'

const dummyEnv: any = { API_KEY: 'secret-123', SERVICE_ACCESS_TOKEN: 'tok-service' }

describe('api-key helpers', () => {
  it('extracts bearer token', () => {
    const req = new Request('http://localhost', { headers: { Authorization: 'Bearer secret-123' } })
    expect(getApiKeyFromHeader(req)).toBe('secret-123')
  })

  it('validates key correctly', () => {
    expect(validateApiKey('secret-123', dummyEnv)).toBe(true)
    expect(validateApiKey('wrong', dummyEnv)).toBe(false)
  })

  it('creates service props', () => {
    const props = makeServiceProps(dummyEnv as any)
    expect(props.login).toBe('service')
    expect(props.apiKey).toBe('secret-123')
  })
})
