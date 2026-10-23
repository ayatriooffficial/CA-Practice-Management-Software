import { Quotation } from './quotation.model';
import { IQuotation } from './quotation.interface';
import { AppError } from '../../shared/utils/apiError';
import { HttpStatus } from '../../constants/httpStatus';

export class QuotationService {
  /**
   * Generate sequential quotation number: #QUOT00001, #QUOT00802, etc.
   */
  private static async generateQuotationNo(): Promise<string> {
    const count = await Quotation.countDocuments({ isDeleted: false });
    const padded = String(count + 1).padStart(5, '0');
    let candidate = `#QUOT${padded}`;
    let exists = await Quotation.findOne({ quotationNo: candidate });
    let inc = count + 1;
    while (exists) {
      inc++;
      candidate = `#QUOT${String(inc).padStart(5, '0')}`;
      exists = await Quotation.findOne({ quotationNo: candidate });
    }
    return candidate;
  }

  /**
   * Calculate totals on quotation items
   */
  private static calculateTotals(items: any[]) {
    let subtotal = 0;
    let discountTotal = 0;
    let taxTotal = 0;

    const computedItems = items.map((item) => {
      const qty = Number(item.quantity) || 1;
      const price = Number(item.price) || 0;
      const baseAmount = qty * price;

      let discount = 0;
      if (item.discountType === 'flat') {
        discount = Number(item.discountValue) || 0;
      } else {
        const pct = Number(item.discountValue) || 0;
        discount = (baseAmount * pct) / 100;
      }

      const discountedAmount = Math.max(0, baseAmount - discount);
      const taxRate = Number(item.taxRate) || 0;
      const tax = (discountedAmount * taxRate) / 100;
      const halfTax = tax / 2;

      const total = discountedAmount + tax;

      subtotal += baseAmount;
      discountTotal += discount;
      taxTotal += tax;

      return {
        ...item,
        quantity: qty,
        price,
        discountValue: Number(item.discountValue) || 0,
        taxRate,
        sgst: halfTax,
        cgst: halfTax,
        igst: 0,
        amount: discountedAmount,
        total,
      };
    });

    const totalAmount = Math.max(0, subtotal - discountTotal + taxTotal);

    return {
      items: computedItems,
      subtotal,
      discountTotal,
      taxTotal,
      totalAmount,
    };
  }

  /**
   * Create Quotation
   */
  public static async createQuotation(data: Partial<IQuotation>): Promise<any> {
    if (!data.quotationNo) {
      data.quotationNo = await this.generateQuotationNo();
    }

    if (data.items && Array.isArray(data.items)) {
      const calc = this.calculateTotals(data.items);
      data.items = calc.items;
      data.subtotal = calc.subtotal;
      data.discountTotal = calc.discountTotal;
      data.taxTotal = calc.taxTotal;
      data.totalAmount = calc.totalAmount;
    }

    const quotation = await Quotation.create(data);
    return quotation;
  }

  /**
   * Get Quotations with pagination and search
   */
  public static async getQuotations(filter: {
    leadId?: string;
    clientId?: string;
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ quotations: any[]; total: number; page: number; limit: number; totalPages: number }> {
    const page = Math.max(1, Number(filter.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(filter.limit) || 10));
    const skip = (page - 1) * limit;

    const query: any = { isDeleted: false };

    if (filter.leadId) {
      query.$or = [{ leadId: filter.leadId }, { 'quotationTo.leadId': filter.leadId }];
    }
    if (filter.clientId) {
      query.clientId = filter.clientId;
    }
    if (filter.status) {
      query.status = filter.status;
    }
    if (filter.search?.trim()) {
      const s = filter.search.trim();
      query.$or = [
        { quotationNo: { $regex: s, $options: 'i' } },
        { 'quotationTo.name': { $regex: s, $options: 'i' } },
        { 'quotationTo.businessName': { $regex: s, $options: 'i' } },
        { 'items.serviceName': { $regex: s, $options: 'i' } },
      ];
    }

    const [quotations, total] = await Promise.all([
      Quotation.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Quotation.countDocuments(query),
    ]);

    return {
      quotations,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Get Quotation By ID
   */
  public static async getQuotationById(id: string): Promise<any> {
    const quotation = await Quotation.findOne({ _id: id, isDeleted: false });
    if (!quotation) {
      throw new AppError('Quotation not found', HttpStatus.NOT_FOUND);
    }
    return quotation;
  }

  /**
   * Update Quotation
   */
  public static async updateQuotation(id: string, data: Partial<IQuotation>): Promise<any> {
    if (data.items && Array.isArray(data.items)) {
      const calc = this.calculateTotals(data.items);
      data.items = calc.items;
      data.subtotal = calc.subtotal;
      data.discountTotal = calc.discountTotal;
      data.taxTotal = calc.taxTotal;
      data.totalAmount = calc.totalAmount;
    }

    const quotation = await Quotation.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { $set: data },
      { new: true, runValidators: true }
    );

    if (!quotation) {
      throw new AppError('Quotation not found', HttpStatus.NOT_FOUND);
    }
    return quotation;
  }

  /**
   * Delete Quotation (Soft Delete)
   */
  public static async deleteQuotation(id: string): Promise<any> {
    const quotation = await Quotation.findOne({ _id: id, isDeleted: false });
    if (!quotation) {
      throw new AppError('Quotation not found', HttpStatus.NOT_FOUND);
    }
    await (quotation as any).softDelete();
    return { id, message: 'Quotation moved to trash' };
  }
}
