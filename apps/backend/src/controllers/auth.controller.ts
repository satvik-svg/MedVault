import type { Request, Response } from 'express'
import {
  registerWithPassword,
  patientSignup,
  verifyOtpAndCreatePatient,
  doctorSignup,
  login,
  completeFirstTimeLogin,
  refreshTokens,
  logout,
} from '../services/auth.service.ts'
import { User } from '../models/User.ts'

export async function registerHandler(req: Request, res: Response): Promise<void> {
  try {
    const result = await registerWithPassword(req.body)
    res.status(201).json(result)
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Registration failed' })
  }
}

export async function meHandler(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ error: 'Unauthenticated' })
      return
    }

    const user = await User.findById(req.user.userId).select('email phoneNumber role patientId doctorId labId mustChangePassword isActive isLocked').lean()
    if (!user || user.isActive === false || user.isLocked) {
      res.status(401).json({ error: 'User is not active' })
      return
    }

    res.json({
      id: user._id,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role,
      patientId: user.patientId,
      doctorId: user.doctorId,
      labId: user.labId,
      mustChangePassword: user.mustChangePassword,
    })
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to fetch current user' })
  }
}

export async function requestOtp(req: Request, res: Response): Promise<void> {
  try {
    const { phoneNumber } = req.body
    await patientSignup(phoneNumber)
    res.json({ message: 'OTP sent successfully' })
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to send OTP' })
  }
}

export async function verifyOtp(req: Request, res: Response): Promise<void> {
  try {
    const { phoneNumber, otp } = req.body
    const result = await verifyOtpAndCreatePatient(phoneNumber, otp)
    res.json(result)
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'OTP verification failed' })
  }
}

export async function doctorRegister(req: Request, res: Response): Promise<void> {
  try {
    const result = await doctorSignup(req.body)
    res.status(201).json(result)
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Doctor registration failed' })
  }
}

export async function firstTimeLoginHandler(req: Request, res: Response): Promise<void> {
  try {
    const { email, tempPassword, newPassword } = req.body
    const result = await completeFirstTimeLogin(email, tempPassword, newPassword)
    res.json(result)
  } catch (error) {
    res.status(401).json({ error: error instanceof Error ? error.message : 'First-time login failed' })
  }
}

export async function loginHandler(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body
    const result = await login(email, password)
    res.json(result)
  } catch (error) {
    res.status(401).json({ error: error instanceof Error ? error.message : 'Login failed' })
  }
}

export async function refreshHandler(req: Request, res: Response): Promise<void> {
  try {
    const { refreshToken } = req.body
    const result = await refreshTokens(refreshToken)
    res.json(result)
  } catch (error) {
    res.status(401).json({ error: error instanceof Error ? error.message : 'Token refresh failed' })
  }
}

export async function logoutHandler(req: Request, res: Response): Promise<void> {
  try {
    const { refreshToken } = req.body
    await logout(refreshToken)
    res.json({ message: 'Logged out successfully' })
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Logout failed' })
  }
}
