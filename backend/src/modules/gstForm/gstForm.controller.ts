import { Request, Response } from 'express';
import { GstFormService } from './gstForm.service';
import { ApiResponse } from '../../shared/utils/apiResponse';

export class GstFormController {
  // CA Staff: Generate Link
  static async createLink(req: Request, res: Response) {
    try {
      const {
        clientId,
        gstin,
        legalName,
        tradeName,
        pan,
        stateCode,
        returnPeriod,
        filingFrequency,
        turnoverSlab,
        registrationType,
      } = req.body;

      if (!clientId || !gstin || !legalName || !stateCode || !returnPeriod) {
        return ApiResponse.error(res, 'clientId, gstin, legalName, stateCode, and returnPeriod are required', 400);
      }

      const baseUrl =
        process.env.FRONTEND_URL ||
        (req.headers.origin as string) ||
        (req.headers.referer ? new URL(req.headers.referer).origin : 'http://localhost:3000');

      const result = await GstFormService.generateLink({
        clientId,
        gstin,
        legalName,
        tradeName,
        pan,
        stateCode,
        returnPeriod,
        filingFrequency,
        turnoverSlab,
        registrationType,
        createdBy: (req as any).user?.id || 'CA Staff',
        baseUrl,
      });

      return ApiResponse.success(res, result, 'GST collection link generated successfully');
    } catch (err: any) {
      return ApiResponse.error(res, err.message || 'Failed to generate GST form link', err.statusCode || 500);
    }
  }

  // CA Staff: List links for a client
  static async getClientLinks(req: Request, res: Response) {
    try {
      const clientId = String(req.params.clientId);
      const links = await GstFormService.getLinksForClient(clientId);
      return ApiResponse.success(res, links, 'GST form links retrieved successfully');
    } catch (err: any) {
      return ApiResponse.error(res, err.message || 'Failed to retrieve links', err.statusCode || 500);
    }
  }

  // CA Staff: Revoke link
  static async revokeLink(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const link = await GstFormService.revokeLink(id);
      return ApiResponse.success(res, link, 'Link revoked successfully');
    } catch (err: any) {
      return ApiResponse.error(res, err.message || 'Failed to revoke link', err.statusCode || 500);
    }
  }

  // CA Staff: Regenerate link
  static async regenerateLink(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const oldLink = await GstFormService.revokeLink(id);

      const baseUrl =
        process.env.FRONTEND_URL ||
        (req.headers.origin as string) ||
        (req.headers.referer ? new URL(req.headers.referer).origin : 'http://localhost:3000');

      const result = await GstFormService.generateLink({
        clientId: String(oldLink.client_id),
        gstin: oldLink.gstin,
        legalName: oldLink.legal_name,
        tradeName: oldLink.trade_name,
        stateCode: oldLink.state_code,
        returnPeriod: oldLink.return_period,
        filingFrequency: oldLink.filing_frequency,
        turnoverSlab: oldLink.aggregate_turnover_slab,
        registrationType: oldLink.registration_type,
        createdBy: (req as any).user?.id || 'CA Staff',
        baseUrl,
      });

      return ApiResponse.success(res, result, 'New link regenerated successfully');
    } catch (err: any) {
      return ApiResponse.error(res, err.message || 'Failed to regenerate link', err.statusCode || 500);
    }
  }

  // CA Staff: Get Submission
  static async getSubmission(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const submission = await GstFormService.getSubmission(id);
      return ApiResponse.success(res, submission, 'Submission retrieved successfully');
    } catch (err: any) {
      return ApiResponse.error(res, err.message || 'Failed to retrieve submission', err.statusCode || 500);
    }
  }

  // Public: Get Form Context
  static async getPublicContext(req: Request, res: Response) {
    try {
      const token = String(req.params.token);
      const ip = req.ip || (req.headers['x-forwarded-for'] as string) || '';
      const userAgent = req.get('user-agent') || '';

      const context = await GstFormService.getPublicFormContext(token, ip, userAgent);
      return ApiResponse.success(res, context, 'Context loaded');
    } catch (err: any) {
      return ApiResponse.error(res, err.message || 'Invalid or expired link', err.statusCode || 404);
    }
  }

  // Public: Save Draft
  static async saveDraft(req: Request, res: Response) {
    try {
      const token = String(req.params.token);
      const { payload } = req.body;
      const result = await GstFormService.saveDraft(token, payload);
      return ApiResponse.success(res, result, 'Draft saved');
    } catch (err: any) {
      return ApiResponse.error(res, err.message || 'Failed to save draft', err.statusCode || 500);
    }
  }

  // Public: Validate Form
  static async validateForm(req: Request, res: Response) {
    try {
      const token = String(req.params.token);
      const { payload } = req.body;
      const report = await GstFormService.validateForm(token, payload);
      return ApiResponse.success(res, report, 'Validation report generated');
    } catch (err: any) {
      return ApiResponse.error(res, err.message || 'Validation failed', err.statusCode || 500);
    }
  }

  // Public: Get CSV Template
  static async getCsvTemplate(req: Request, res: Response) {
    try {
      const section = String(req.params.section);
      const template = GstFormService.getCsvTemplate(section);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${template.filename}"`);
      return res.status(200).send(template.content);
    } catch (err: any) {
      return ApiResponse.error(res, err.message || 'Failed to get template', err.statusCode || 400);
    }
  }

  // Public: Submit Form
  static async submitForm(req: Request, res: Response) {
    try {
      const token = String(req.params.token);
      const { payload } = req.body;
      const ip = req.ip || (req.headers['x-forwarded-for'] as string) || '';
      const userAgent = req.get('user-agent') || '';

      const result = await GstFormService.submitForm({
        token,
        payload,
        ip,
        userAgent,
      });

      return ApiResponse.success(res, result, 'Form submitted successfully');
    } catch (err: any) {
      return ApiResponse.error(
        res,
        err.message || 'Failed to submit form',
        err.statusCode || 500,
        err.errors ? { validationErrors: err.errors } : undefined
      );
    }
  }

  // v3 Controller Methods

  // Public: Search Recipients (Max 10, >= 2 chars)
  static async searchRecipients(req: Request, res: Response) {
    try {
      const token = String(req.params.token);
      const q = String(req.query.q || '');
      const results = await GstFormService.searchRecipients(token, q);
      return ApiResponse.success(res, results, 'Recipients retrieved');
    } catch (err: any) {
      return ApiResponse.error(res, err.message || 'Failed to search recipients', err.statusCode || 500);
    }
  }

  // Public: Search Items (Max 10, >= 2 chars)
  static async searchItems(req: Request, res: Response) {
    try {
      const token = String(req.params.token);
      const q = String(req.query.q || '');
      const results = await GstFormService.searchItems(token, q);
      return ApiResponse.success(res, results, 'Items retrieved');
    } catch (err: any) {
      return ApiResponse.error(res, err.message || 'Failed to search items', err.statusCode || 500);
    }
  }

  // Public: Get Series Book
  static async getSeriesBook(req: Request, res: Response) {
    try {
      const token = String(req.params.token);
      const result = await GstFormService.getSeriesBook(token);
      return ApiResponse.success(res, result, 'Series book retrieved');
    } catch (err: any) {
      return ApiResponse.error(res, err.message || 'Failed to get series book', err.statusCode || 500);
    }
  }

  // Public: Get Carry Over structure (Section 7)
  static async getCarryOver(req: Request, res: Response) {
    try {
      const token = String(req.params.token);
      const result = await GstFormService.getCarryOver(token);
      return ApiResponse.success(res, result, 'Carry over data retrieved');
    } catch (err: any) {
      return ApiResponse.error(res, err.message || 'Failed to get carry-over', err.statusCode || 500);
    }
  }

  // Public: Smart Map Headers (Section 8.4)
  static async smartMapHeaders(req: Request, res: Response) {
    try {
      const token = String(req.params.token);
      const section = String(req.params.section);
      const { headers } = req.body;
      const result = await GstFormService.smartMapHeaders(token, section, headers || []);
      return ApiResponse.success(res, result, 'Column mapping suggested');
    } catch (err: any) {
      return ApiResponse.error(res, err.message || 'Failed to map headers', err.statusCode || 500);
    }
  }

  // Public: Save Import Mapping
  static async saveImportMapping(req: Request, res: Response) {
    try {
      const token = String(req.params.token);
      const section = String(req.params.section);
      const { mapping, dateFormat } = req.body;
      const result = await GstFormService.saveImportMapping(token, section, mapping, dateFormat);
      return ApiResponse.success(res, result, 'Import mapping saved');
    } catch (err: any) {
      return ApiResponse.error(res, err.message || 'Failed to save mapping', err.statusCode || 500);
    }
  }

  // Public: Preview Import (CSV / XLSX / Paste)
  static async previewImport(req: Request, res: Response) {
    try {
      const token = String(req.params.token);
      const section = String(req.params.section);
      const { fileContent, fileType, fileName, mapping, dateFormat } = req.body;
      const fileBuffer = (req as any).file?.buffer;

      const result = await GstFormService.parseFileAndPreview({
        token,
        section,
        fileBuffer,
        fileContent,
        fileType: fileType || (fileBuffer ? 'xlsx' : 'csv'),
        fileName,
        mapping: mapping || {},
        dateFormat,
      });

      return ApiResponse.success(res, result, 'Import preview generated');
    } catch (err: any) {
      return ApiResponse.error(res, err.message || 'Failed to preview import', err.statusCode || 500);
    }
  }

  // Public: Auto-derive Table 12 HSN (Section 6.5)
  static async deriveHsn(req: Request, res: Response) {
    try {
      const token = String(req.params.token);
      const { payload } = req.body;
      const result = await GstFormService.deriveHsn(token, payload);
      return ApiResponse.success(res, result, 'Derived HSN summary');
    } catch (err: any) {
      return ApiResponse.error(res, err.message || 'Failed to derive HSN', err.statusCode || 500);
    }
  }

  // Public: Auto-derive Table 13 Documents (Section 6.6)
  static async deriveDocuments(req: Request, res: Response) {
    try {
      const token = String(req.params.token);
      const { payload } = req.body;
      const result = await GstFormService.deriveDocuments(token, payload);
      return ApiResponse.success(res, result, 'Derived documents series');
    } catch (err: any) {
      return ApiResponse.error(res, err.message || 'Failed to derive documents', err.statusCode || 500);
    }
  }

  // Staff: Get Master Suggestions (Section 11)
  static async getMasterSuggestions(req: Request, res: Response) {
    try {
      const clientId = String(req.params.clientId);
      const list = await GstFormService.getMasterSuggestions(clientId);
      return ApiResponse.success(res, list, 'Master suggestions retrieved');
    } catch (err: any) {
      return ApiResponse.error(res, err.message || 'Failed to retrieve suggestions', err.statusCode || 500);
    }
  }

  // Staff: Update Suggestion Status
  static async updateSuggestionStatus(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const { status } = req.body;
      if (!status || !['APPROVED', 'REJECTED'].includes(status)) {
        return ApiResponse.error(res, 'Valid status (APPROVED or REJECTED) is required', 400);
      }
      const updated = await GstFormService.updateSuggestionStatus(id, status);
      return ApiResponse.success(res, updated, `Suggestion ${status.toLowerCase()} successfully`);
    } catch (err: any) {
      return ApiResponse.error(res, err.message || 'Failed to update suggestion', err.statusCode || 500);
    }
  }
}
