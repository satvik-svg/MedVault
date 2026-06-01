import type { Request, Response } from 'express'

export async function registerClinic(_req: Request, res: Response): Promise<void> {
  res.status(410).json({ error: 'Clinic registration was removed in MedVault v2.' })
}

export async function verifyHfr(_req: Request, res: Response): Promise<void> {
  res.status(410).json({ error: 'HFR verification was removed in MedVault v2.' })
}

export async function verifyDomain(_req: Request, res: Response): Promise<void> {
  res.status(410).json({ error: 'Domain verification was removed in MedVault v2.' })
}

export async function uploadDocuments(_req: Request, res: Response): Promise<void> {
  res.status(410).json({ error: 'Clinic document upload was removed in MedVault v2.' })
}

export async function getClinicMe(_req: Request, res: Response): Promise<void> {
  res.status(410).json({ error: 'Clinic admin profile was removed in MedVault v2.' })
}
