import { Request, Response, NextFunction } from 'express';
import { QuotationService } from './quotation.service';
import { ApiResponse } from '../../shared/utils/apiResponse';
import { HttpStatus } from '../../constants/httpStatus';

export class QuotationController {
  public static async createQuotation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const quotation = await QuotationService.createQuotation(req.body);
      ApiResponse.success(res, quotation, 'Quotation created successfully', HttpStatus.CREATED);
    } catch (error) {
      next(error);
    }
  }

  public static async getQuotations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { leadId, clientId, search, status, page, limit } = req.query;
      const result = await QuotationService.getQuotations({
        leadId: leadId ? String(leadId) : undefined,
        clientId: clientId ? String(clientId) : undefined,
        search: search ? String(search) : undefined,
        status: status ? String(status) : undefined,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      });
      ApiResponse.paginated(
        res,
        result.quotations,
        {
          totalDocs: result.total,
          limit: result.limit,
          page: result.page,
          totalPages: result.totalPages,
          hasNextPage: result.page < result.totalPages,
          hasPrevPage: result.page > 1,
        },
        'Quotations retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  }

  public static async getQuotationById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const quotation = await QuotationService.getQuotationById(id);
      ApiResponse.success(res, quotation, 'Quotation retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  public static async updateQuotation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const quotation = await QuotationService.updateQuotation(id, req.body);
      ApiResponse.success(res, quotation, 'Quotation updated successfully');
    } catch (error) {
      next(error);
    }
  }

  public static async deleteQuotation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const result = await QuotationService.deleteQuotation(id);
      ApiResponse.success(res, result, 'Quotation deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}
