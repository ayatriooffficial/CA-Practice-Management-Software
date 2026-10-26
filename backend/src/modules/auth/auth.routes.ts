import { Router } from 'express';
import { AuthController } from './auth.controller';
import { validateRequest } from '../../middlewares/validateRequest';
import { authenticate, optionalAuthenticate } from '../../middlewares/authenticate';
import {
  registerOrgSchema,
  lookupUserSchema,
  sendOtpSchema,
  verifyOtpSchema,
  deviceLoginSchema,
  deviceStatusSchema,
  loginSchema,
} from './auth.validation';

const router = Router();

// Public Authentication Endpoints
router.post('/register', validateRequest({ body: registerOrgSchema }), AuthController.register);
router.post('/lookup', validateRequest({ body: lookupUserSchema }), AuthController.lookup);
router.post('/send-otp', validateRequest({ body: sendOtpSchema }), AuthController.sendOtp);
router.post('/verify-otp', validateRequest({ body: verifyOtpSchema }), AuthController.verifyOtp);
router.post('/device-login', validateRequest({ body: deviceLoginSchema }), AuthController.deviceLogin);
router.post('/device-status', validateRequest({ body: deviceStatusSchema }), AuthController.checkDeviceStatus);
router.post('/login', validateRequest({ body: loginSchema }), AuthController.login);
router.post('/refresh', AuthController.refresh);
router.post('/logout', optionalAuthenticate, AuthController.logout);

// Protected Authentication Endpoints
router.get('/me', authenticate, AuthController.me);

// Organization Endpoints (Address, Bank Details, Billing Profile)
router.get('/organization', optionalAuthenticate, AuthController.getOrganization);
router.get('/organizations', optionalAuthenticate, AuthController.getAllOrganizations);
router.patch('/organization', authenticate, AuthController.updateOrganization);

// Team Member Management Endpoints
router.get('/team', AuthController.getTeamMembers);
router.post('/team', AuthController.createTeamMember);
router.patch('/team/:id', AuthController.updateTeamMember);
router.delete('/team/:id', AuthController.deleteTeamMember);

export const authRoutes = router;

