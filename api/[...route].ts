import { apiHandler } from '../server/routes.js'

export const config = { supportsResponseStreaming: true }

export default apiHandler(process.env, process.cwd(), true)
