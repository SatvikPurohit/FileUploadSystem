
# Frontend — Production-ready (Option A)

React 18 + TypeScript + Material UI (RTL) + React Query (v5) + Axios + MSW (mocks)
Structure follows modular architecture with separation of concerns.

How to run:
1. npm install
2. npm run dev

Testing:
- npm run test  (uses jest + @testing-library/react + msw)
Notes:
- The project uses MSW for local mocks. Replace API baseURL in src/api/axios.ts to point to your backend.
- Access token is stored in-memory; refresh must be provided by backend via HttpOnly cookie.
