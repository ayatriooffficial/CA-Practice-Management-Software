import { FinancialReceipt } from "../financials/financial.model";
import { PaginationMeta } from "../../shared/utils/apiResponse";
import { Client } from "../client/client.model";

export class FinancialService {
  static async workDoneClient(query: { page?: number | string; limit?: number | string; search?: string } = {}): Promise<{ items: any[]; pagination: PaginationMeta }> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 10));
    const rawSearch = typeof query.search === "string" ? query.search.trim() : "";
    const search = (rawSearch === "undefined" || rawSearch === "null") ? "" : rawSearch.toLowerCase();

    const [receipts, deletedClients] = await Promise.all([
      FinancialReceipt.find({ isClientDeleted: { $ne: true } }).lean(),
      Client.find({ isDeleted: true }).select('_id fileNo name').lean(),
    ]);

    const deletedClientSet = new Set<string>();
    deletedClients.forEach((c: any) => {
      if (c._id) deletedClientSet.add(c._id.toString());
      if (c.fileNo) deletedClientSet.add(String(c.fileNo).toLowerCase().trim());
      if (c.name) deletedClientSet.add(String(c.name).toLowerCase().trim());
    });

    const clientMap: { [key: string]: any } = {};

    receipts.forEach((receipt: any) => {
      const clientId = receipt.clientId?.toString() || receipt._id?.toString() || "unknown";

      if (
        (receipt.clientId && deletedClientSet.has(String(receipt.clientId).toLowerCase().trim())) ||
        (receipt.businessName && deletedClientSet.has(String(receipt.businessName).toLowerCase().trim())) ||
        (receipt.legalName && deletedClientSet.has(String(receipt.legalName).toLowerCase().trim()))
      ) {
        return;
      }

      if (!clientMap[clientId]) {
        clientMap[clientId] = {
          clientId,
          businessName: receipt.businessName || "Unknown Client",
          legalName: receipt.legalName || "Unknown Legal Name",
          totalCost: 0,
          totalPaid: 0,
          services: [],

          // Track invoices already counted
          countedInvoiceIds: new Set<string>(),
          countedInvoiceNumbers: new Set<string>(),
        };
      }

      const client = clientMap[clientId];

      // Service details
      const service = receipt.amountForService || {};

      const serviceName = service.serviceName || "General Service";
      const frequency = service.frequency || "ONE_TIME";

      // Invoice identification
      const invoiceId = receipt.invoiceId?.toString();
      const invoiceNumber = receipt.invoiceNumber?.toString();

      // Check whether invoice was already counted
      const alreadyCounted =
        (invoiceId && client.countedInvoiceIds.has(invoiceId)) ||
        (invoiceNumber &&
          client.countedInvoiceNumbers.has(invoiceNumber));

      // Fee breakdown
      const governmentFee = Number(service.governmentFee || 0);
      const professionalFee = Number(service.professionalFee || 0);

      const total = governmentFee + professionalFee;

      // GST applies to professional fees
      const gstRate =
        Number.parseFloat(String(service.tax || "0")) || 0;

      const gstAmount = (total * gstRate) / 100;

      // Use stored values when available
      const totalServiceFee =
        service.totalServiceFee != null
          ? Number(service.totalServiceFee)
          : professionalFee + gstAmount;

      const invoiceCost =
        service.total != null
          ? Number(service.total)
          : governmentFee + totalServiceFee;

      // Actual payment received
      const paid = Number(receipt.amount || 0);

      // Add invoice cost only once
      const cost = alreadyCounted ? 0 : invoiceCost;

      if (!alreadyCounted) {
        client.totalCost += invoiceCost;
      }

      // Always add receipt payment
      client.totalPaid += paid;

      // Remember invoice identifiers
      if (invoiceId) {
        client.countedInvoiceIds.add(invoiceId);
      }

      if (invoiceNumber) {
        client.countedInvoiceNumbers.add(invoiceNumber);
      }

      // Determine service period
      let period =
        service.periodLabel ||
        service.compliancePeriod ||
        "General";

      if (
        frequency.toUpperCase() === "MONTHLY" &&
        receipt.paymentDate
      ) {
        period = new Date(receipt.paymentDate).toLocaleString(
          "en-IN",
          {
            month: "long",
            year: "numeric",
            timeZone: "UTC",
          }
        );
      } else if (
        frequency.toUpperCase() === "YEARLY" &&
        (service.financialYear || receipt.financialYear)
      ) {
        period = service.financialYear || receipt.financialYear;
      }

      // Add receipt and service details
      client.services.push({
        receiptNo: receipt.receiptNo,

        invoiceId,
        invoiceNumber,

        serviceId: service.id,
        serviceName,
        description: service.description || "",

        frequency,
        period,
        compliancePeriod: service.compliancePeriod || "",

        // Fee breakdown
        governmentFee,
        professionalFee,
        tax: service.tax || "0%",
        gstRate,
        gstAmount,
        totalServiceFee,
        total: invoiceCost,

        // Invoice amounts
        cost,
        invoiceCost,

        // Receipt payment
        paid,
        paymentDate: receipt.paymentDate,

        // Additional receipt information
        paymentMethod: receipt.method || "",
        referenceNumber: receipt.referenceNumber || "",
        financialYear: receipt.financialYear || "",
        isAdvance: receipt.isAdvance || false,
      });
    });

    // Remove internal tracking Sets
    let clients = Object.values(clientMap).map((client: any) => {
      const {
        countedInvoiceIds,
        countedInvoiceNumbers,
        ...result
      } = client;

      return {
        ...result,
        outstanding: result.totalCost - result.totalPaid,
      };
    });

    if (search) {
      clients = clients.filter((client: any) =>
        (client.businessName && client.businessName.toLowerCase().includes(search)) ||
        (client.legalName && client.legalName.toLowerCase().includes(search)) ||
        (client.clientId && client.clientId.toLowerCase().includes(search))
      );
    }

    const totalDocs = clients.length;
    const totalPages = Math.max(1, Math.ceil(totalDocs / limit));
    const startIndex = (page - 1) * limit;
    const items = clients.slice(startIndex, startIndex + limit);

    const pagination: PaginationMeta = {
      page,
      limit,
      totalDocs,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };

    return { items, pagination };
  }
}
