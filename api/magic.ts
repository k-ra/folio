import { hostedHandler } from '../server/vercel.js'

export const config = { supportsResponseStreaming: true }
export default hostedHandler
