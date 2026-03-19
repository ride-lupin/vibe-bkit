import jwt from 'jsonwebtoken'

const ACCESS_SECRET = process.env.JWT_SECRET!
const REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET!

type AccessPayload = { sub: string; role: string }
type RefreshPayload = { sub: string }

export const signAccessToken = (payload: AccessPayload): string =>
  jwt.sign(payload, ACCESS_SECRET, { expiresIn: '1m' })

export const signRefreshToken = (payload: RefreshPayload): string =>
  jwt.sign(payload, REFRESH_SECRET, { expiresIn: '7d' })

export const verifyAccessToken = (token: string): AccessPayload =>
  jwt.verify(token, ACCESS_SECRET) as AccessPayload

export const verifyRefreshToken = (token: string): RefreshPayload =>
  jwt.verify(token, REFRESH_SECRET) as RefreshPayload

export const REFRESH_TOKEN_COOKIE = 'refreshToken'
export const REFRESH_TOKEN_MAX_AGE = 60 * 60 * 24 * 7 // 7일 (초)
