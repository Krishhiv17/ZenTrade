import Groq from 'groq-sdk'

// Lazily instantiate Groq to avoid build-time crashes on Vercel
// when process.env.GROQ_API_KEY might be undefined during static route generation.
let _groqClient: Groq | null = null

export function getGroqClient() {
    if (!_groqClient) {
        if (!process.env.GROQ_API_KEY) {
            throw new Error('GROQ_API_KEY is not defined in the environment.')
        }
        _groqClient = new Groq({
            apiKey: process.env.GROQ_API_KEY,
        })
    }
    return _groqClient
}

export const COACH_MODEL = 'llama-3.3-70b-versatile'
export const COACH_TEMPERATURE = 0.4
export const COACH_MAX_TOKENS = 1024
