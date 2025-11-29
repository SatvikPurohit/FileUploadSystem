import { rest } from 'msw'
export const handlers = [
  rest.post('http://localhost:4000/api/auth/login', async (req, res, ctx) => {
    const { username, password } = await req.json()
    if (username === 'demo@local.test' && password === 'Password123!') {
      return res(ctx.json({ accessToken: 'mock-access-token' }))
    }
    return res(ctx.status(401), ctx.json({ error: 'Invalid credentials' }))
  }),
  rest.post('http://localhost:4000/api/auth/refresh', (req, res, ctx) => {
    return res(ctx.json({ accessToken: 'mock-access-token' }))
  }),
  rest.post('http://localhost:4000/api/upload', async (req, res, ctx) => {
    await new Promise((r)=> setTimeout(r, 300))
    return res(ctx.json({ uploaded: true }))
  })
]
