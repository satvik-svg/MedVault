import express from 'express'
import cors from 'cors'
import hfrRoutes from './routes/hfr.ts'
import abhaRoutes from './routes/abha.ts'
import consentRoutes from './routes/consent.ts'

const app = express()
const PORT = parseInt(process.env.PORT || '5050', 10)

app.use(cors())
app.use(express.json())

app.use('/api/v1/facility', hfrRoutes)
app.use('/api/v1/abha', abhaRoutes)
app.use('/api/v1/consent', consentRoutes)

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'abdm-mock' })
})

app.listen(PORT, () => {
  console.log(`[ABDM Mock] Running on port ${PORT}`)
})

export default app
