import axios, { type AxiosInstance } from 'axios'
import { config } from '../config/env.ts'

export interface AIExtractEntitiesResponse {
  input_text?: string
  entities: Array<Record<string, unknown>>
}

export interface AIDiagnosisResponse {
  top_diagnoses: Array<Record<string, unknown>>
  red_flags: Array<Record<string, unknown>>
  is_calibrated?: boolean
  model_used?: string
}

export interface AIClientOptions {
  http?: AxiosInstance
}

export class AIClient {
  private readonly http: AxiosInstance

  constructor(options: AIClientOptions = {}) {
    this.http = options.http || axios.create({
      baseURL: config.ai.serviceUrl,
      timeout: config.ai.requestTimeoutMs,
    })
  }

  async transcribe(audioBase64: string, language = 'en'): Promise<Record<string, unknown>> {
    try {
      const response = await this.http.post('/transcribe/base64', { audio_base64: audioBase64, language })
      return response.data
    } catch (error) {
      if (!config.ai.enableFallbacks) throw error
      return { text: '', language, duration: 0, segments: [], fallback: true }
    }
  }

  async extractEntities(text: string): Promise<AIExtractEntitiesResponse> {
    try {
      const response = await this.http.post('/ner', { text })
      return response.data
    } catch (error) {
      if (!config.ai.enableFallbacks) throw error
      return { input_text: text, entities: [] }
    }
  }

  async diagnose(entities: unknown[], age: number, sex: string): Promise<AIDiagnosisResponse> {
    try {
      const response = await this.http.post('/diagnose', { entities, age, sex })
      return response.data
    } catch (error) {
      if (!config.ai.enableFallbacks) throw error
      return { top_diagnoses: [], red_flags: [], is_calibrated: false, model_used: 'unavailable' }
    }
  }

  async summarizePatient(patientData: Record<string, unknown>): Promise<{ summary: string }> {
    try {
      const response = await this.http.post('/summarize/patient', patientData)
      return response.data
    } catch (error) {
      if (!config.ai.enableFallbacks) throw error
      const conditions = Array.isArray(patientData.chronicConditions) ? patientData.chronicConditions.length : 0
      const medications = Array.isArray(patientData.activeMedications) ? patientData.activeMedications.length : 0
      return {
        summary: `Patient summary generated from structured MedVault data: ${conditions} active/chronic condition entries and ${medications} active medication entries are available for review.`,
      }
    }
  }

  async checkRecurrence(patientId: string, currentEntities: unknown[]): Promise<{ recurring_presentations: unknown[] }> {
    try {
      const response = await this.http.post('/recurrence', {
        patient_id: patientId,
        current_entities: currentEntities,
      })
      return response.data
    } catch (error) {
      if (!config.ai.enableFallbacks) throw error
      return { recurring_presentations: [] }
    }
  }

  async ocrPrescription(imageBase64: string): Promise<Record<string, unknown>> {
    try {
      const response = await this.http.post('/ocr/prescription/base64', { image_base64: imageBase64 })
      return response.data
    } catch (error) {
      if (!config.ai.enableFallbacks) throw error
      return { medications: [], needs_review: true, raw_ocr: {}, fallback: true }
    }
  }
}

export const aiClient = new AIClient()
