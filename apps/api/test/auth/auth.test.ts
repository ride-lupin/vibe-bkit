import { describe, it, expect } from 'vitest'
import {
  signAccessToken,
  verifyAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  REFRESH_TOKEN_COOKIE,
  REFRESH_TOKEN_MAX_AGE,
} from '../../src/lib/auth'

describe('auth lib', () => {
  describe('access token', () => {
    it('signAccessToken → verifyAccessToken 왕복 검증', () => {
      const payload = { sub: 'user-123', role: 'user' }
      const token = signAccessToken(payload)
      const decoded = verifyAccessToken(token)
      expect(decoded.sub).toBe(payload.sub)
      expect(decoded.role).toBe(payload.role)
    })

    it('잘못된 토큰은 에러를 던진다', () => {
      expect(() => verifyAccessToken('invalid.token.here')).toThrow()
    })

    it('다른 secret으로 서명한 토큰은 검증 실패', () => {
      // sign with refresh secret, verify with access secret
      const token = signRefreshToken({ sub: 'user-123' })
      expect(() => verifyAccessToken(token)).toThrow()
    })
  })

  describe('refresh token', () => {
    it('signRefreshToken → verifyRefreshToken 왕복 검증', () => {
      const payload = { sub: 'user-456' }
      const token = signRefreshToken(payload)
      const decoded = verifyRefreshToken(token)
      expect(decoded.sub).toBe(payload.sub)
    })

    it('잘못된 토큰은 에러를 던진다', () => {
      expect(() => verifyRefreshToken('bad.token')).toThrow()
    })

    it('다른 secret으로 서명한 토큰은 검증 실패', () => {
      const token = signAccessToken({ sub: 'user-123', role: 'admin' })
      expect(() => verifyRefreshToken(token)).toThrow()
    })
  })

  describe('constants', () => {
    it('REFRESH_TOKEN_COOKIE 값이 올바르다', () => {
      expect(REFRESH_TOKEN_COOKIE).toBe('refreshToken')
    })

    it('REFRESH_TOKEN_MAX_AGE가 7일(초)이다', () => {
      expect(REFRESH_TOKEN_MAX_AGE).toBe(60 * 60 * 24 * 7)
    })
  })
})
