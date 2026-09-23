import { apiHandler } from './routes.js'

/** Shared handler behind explicit Vercel file routes. */
export const hostedHandler = apiHandler(process.env, process.cwd(), true)
