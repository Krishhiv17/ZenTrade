import Groq from 'groq-sdk'

export const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY!,
})

export const COACH_MODEL = 'llama-3.3-70b-versatile'
export const COACH_TEMPERATURE = 0.4
export const COACH_MAX_TOKENS = 1024
