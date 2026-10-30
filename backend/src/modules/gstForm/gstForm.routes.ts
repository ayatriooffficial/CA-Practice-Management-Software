import { Router } from 'express';
import multer from 'multer';
import { GstFormController } from './gstForm.controller';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
});

const staffRouter = Router();
const publicRouter = Router();

// Staff Endpoints (under /gst-links)
staffRouter.post('/', GstFormController.createLink);
staffRouter.get('/client/:clientId', GstFormController.getClientLinks);
staffRouter.post('/:id/revoke', GstFormController.revokeLink);
staffRouter.post('/:id/regenerate', GstFormController.regenerateLink);

// Submission view
staffRouter.get('/submissions/:id', GstFormController.getSubmission);

// Staff: Master suggestions review (Section 11)
staffRouter.get('/client/:clientId/master-suggestions', GstFormController.getMasterSuggestions);
staffRouter.post('/master-suggestions/:id/status', GstFormController.updateSuggestionStatus);

// Public Endpoints (under /public/gst-form)
publicRouter.get('/:token', GstFormController.getPublicContext);
publicRouter.get('/:token/context', GstFormController.getPublicContext);
publicRouter.put('/:token/draft', GstFormController.saveDraft);
publicRouter.post('/:token/validate', GstFormController.validateForm);
publicRouter.get('/:token/csv-template/:section', GstFormController.getCsvTemplate);
publicRouter.post('/:token/submit', GstFormController.submitForm);

// v3 Public Endpoints
publicRouter.get('/:token/recipients', GstFormController.searchRecipients);
publicRouter.get('/:token/items', GstFormController.searchItems);
publicRouter.get('/:token/series', GstFormController.getSeriesBook);
publicRouter.post('/:token/carry-over', GstFormController.getCarryOver);
publicRouter.post('/:token/csv-import/:section/map', GstFormController.smartMapHeaders);
publicRouter.post('/:token/csv-import/:section/save-map', GstFormController.saveImportMapping);
publicRouter.post('/:token/csv-import/:section/preview', upload.single('file'), GstFormController.previewImport);
publicRouter.post('/:token/derive/hsn', GstFormController.deriveHsn);
publicRouter.post('/:token/derive/documents', GstFormController.deriveDocuments);

export const gstStaffRoutes = staffRouter;
export const gstPublicRoutes = publicRouter;
