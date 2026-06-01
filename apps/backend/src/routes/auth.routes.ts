import { Router, type Router as RouterType } from 'express'
import {
  requestOtp,
  verifyOtp,
  doctorRegister,
  loginHandler,
  firstTimeLoginHandler,
  refreshHandler,
  logoutHandler,
} from '../controllers/auth.controller.ts'
import { otpRateLimiter, loginRateLimiter } from '../middleware/rateLimiter.ts'

const router: RouterType = Router()

router.post('/patient/signup-otp', otpRateLimiter, requestOtp)
router.post('/patient/verify-otp', verifyOtp)
router.post('/doctor/signup', doctorRegister)
router.post('/login', loginRateLimiter, loginHandler)
router.post('/login/first-time', loginRateLimiter, firstTimeLoginHandler)
router.post('/refresh', refreshHandler)
router.post('/logout', logoutHandler)

export default router
