import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

export const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret';
export const PORT = Number(process.env.PORT ?? '4000');
export const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173';
export const UPLOADS_DIR = process.env.UPLOADS_DIR ?? path.join(__dirname, '..', 'public', 'uploads');
