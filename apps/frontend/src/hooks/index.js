import { useState, useCallback, useRef } from 'react'
import { doctorApi } from '../lib/api.js'

export const useQRScanner = () => {
  const [isScanning, setIsScanning] = useState(false)
  const [scannedData, setScannedData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const videoRef = useRef(null)

  const startScanning = useCallback(async () => {
    setIsScanning(true)
    setError(null)
    setScannedData(null)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } }
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
    } catch (err) {
      setError('Camera access denied or not available. Please use manual ABHA ID entry.')
      setIsScanning(false)
    }
  }, [])

  const stopScanning = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks()
      tracks.forEach(track => track.stop())
      videoRef.current.srcObject = null
    }
    setIsScanning(false)
  }, [])

  const simulateScan = useCallback(async (patientData) => {
    setLoading(true)
    await new Promise(resolve => setTimeout(resolve, 800))
    setScannedData(patientData)
    stopScanning()
    setLoading(false)
  }, [stopScanning])

  const validateQR = useCallback(async (qrToken) => {
    setLoading(true)
    try {
      const data = await doctorApi.scanQR(qrToken)
      setScannedData(data)
      return data
    } catch (err) {
      setError('Failed to validate QR code')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const reset = useCallback(() => {
    setScannedData(null)
    setError(null)
    setIsScanning(false)
  }, [])

  return {
    isScanning,
    scannedData,
    error,
    loading,
    videoRef,
    startScanning,
    stopScanning,
    simulateScan,
    validateQR,
    reset,
  }
}

export const useDrugCheck = () => {
  const [checking, setChecking] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const check = useCallback(async (newDrug, currentMedications, patientAllergies = []) => {
    setChecking(true)
    setError(null)
    setResult(null)

    try {
      await new Promise(resolve => setTimeout(resolve, 200))

      const mockInteractions = []
      let overallSeverity = 'safe'

      for (const med of currentMedications) {
        const pair = `${newDrug}-${med}`.toLowerCase()
        let severity = 'safe'

        if (pair.includes('aspirin') && pair.includes('warfarin')) {
          severity = 'severe'
          overallSeverity = 'severe'
        } else if (
          pair.includes('metformin') && pair.includes('alcohol') ||
          pair.includes('omeprazole') && pair.includes('clopidogrel')
        ) {
          severity = 'moderate'
          if (overallSeverity !== 'severe') overallSeverity = 'moderate'
        }

        mockInteractions.push({
          drug_a: newDrug,
          drug_b: med,
          severity,
          mechanism: severity === 'severe'
            ? 'Both drugs inhibit platelet aggregation. Major bleeding risk.'
            : severity === 'moderate'
            ? 'Potential adverse interaction. Monitor patient closely.'
            : null,
          recommendation: severity === 'severe'
            ? 'DO NOT co-administer. Seek alternative.'
            : severity === 'moderate'
            ? 'Use with caution. Monitor closely.'
            : 'No known clinically significant interaction.',
          source: 'DrugBank + OpenFDA',
          confidence: severity === 'severe' ? 97.3 : severity === 'moderate' ? 88.5 : 91.2,
        })
      }

      const allergyFlags = patientAllergies.filter(a =>
        newDrug.toLowerCase().includes(a.toLowerCase())
      )

      setResult({
        results: mockInteractions,
        overall_severity: overallSeverity,
        allergy_flags: allergyFlags,
        latency_ms: Math.floor(Math.random() * 100) + 100,
      })

      return {
        results: mockInteractions,
        overall_severity: overallSeverity,
        allergy_flags: allergyFlags,
        latency_ms: Math.floor(Math.random() * 100) + 100,
      }
    } catch (err) {
      setError('Drug interaction check failed. Please try again.')
      throw err
    } finally {
      setChecking(false)
    }
  }, [])

  const clear = useCallback(() => {
    setResult(null)
    setError(null)
  }, [])

  return { checking, result, error, check, clear }
}

export const usePatientRecord = () => {
  const [loading, setLoading] = useState(false)
  const [record, setRecord] = useState(null)
  const [error, setError] = useState(null)

  const fetchRecord = useCallback(async (patientId) => {
    setLoading(true)
    setError(null)

    try {
      await new Promise(resolve => setTimeout(resolve, 500))

      const mockRecord = {
        id: patientId,
        name: 'Ravi Kumar',
        abhaId: '14-1234-5678-9012',
        age: 34,
        gender: 'male',
        bloodGroup: 'B+',
        allergies: ['Penicillin'],
        activeMedications: [
          { drugName: 'Metformin', genericName: 'Metformin HCl', dose: '500mg', frequency: '2x daily', prescribedBy: 'Dr. Sharma', prescribedAt: '12 Jan 2025' },
          { drugName: 'Amlodipine', genericName: 'Amlodipine Besylate', dose: '5mg', frequency: '1x daily', prescribedBy: 'Dr. Sharma', prescribedAt: '3 Jan 2025' },
          { drugName: 'Atorvastatin', genericName: 'Atorvastatin Calcium', dose: '20mg', frequency: '1x nightly', prescribedBy: 'Dr. Gupta', prescribedAt: '20 Feb 2025' },
        ],
        records: [],
        prescriptions: [],
        labReports: [],
      }

      setRecord(mockRecord)
      return mockRecord
    } catch (err) {
      setError('Failed to load patient record')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchByQR = useCallback(async (qrToken) => {
    setLoading(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 600))
      const mockRecord = {
        id: 'patient-123',
        name: 'Ravi Kumar',
        abhaId: '14-1234-5678-9012',
        age: 34,
        gender: 'male',
        bloodGroup: 'B+',
        allergies: ['Penicillin'],
        activeMedications: [
          { drugName: 'Metformin', dose: '500mg', frequency: '2x daily', prescribedBy: 'Dr. Sharma', prescribedAt: '12 Jan 2025' },
        ],
      }
      setRecord(mockRecord)
      return mockRecord
    } catch (err) {
      setError('Invalid or expired QR code')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const clear = useCallback(() => {
    setRecord(null)
    setError(null)
  }, [])

  return { loading, record, error, fetchRecord, fetchByQR, clear }
}
