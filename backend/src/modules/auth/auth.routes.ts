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
router.patch('/organization', authenticate, AuthController.updateOrganization);

// Team Member Management Endpoints
router.get('/team', optionalAuthenticate, AuthController.getTeamMembers);
router.post('/team', authenticate, AuthController.createTeamMember);
router.patch('/team/:id', authenticate, AuthController.updateTeamMember);
router.delete('/team/:id', authenticate, AuthController.deleteTeamMember);

// Employment Request Endpoints
router.post('/employment-request', AuthController.requestEmployment);
router.get('/employment-status', authenticate, AuthController.getEmploymentStatus);
router.get('/employment-requests', authenticate, AuthController.getEmploymentRequests);
router.post('/employment-requests/:id/accept', authenticate, AuthController.acceptEmploymentRequest);
router.post('/employment-requests/:id/reject', authenticate, AuthController.rejectEmploymentRequest);
router.post('/organization/register', AuthController.register);

export const authRoutes = router;

