import { connectDatabase, disconnectDatabase } from '../config/database';
import { logger } from '../config/logger';
import { Lead } from '../modules/lead/lead.model';
import { Quotation } from '../modules/quotation/quotation.model';

async function seedQuotation() {
  await connectDatabase();
  logger.info('Connected to database for quotation seeding');

  const DEFAULT_ORG_ID = '6ad9e23bf460aa2e6102c0c6';
  const DEFAULT_USER_ID = '6ad9e23bf460aa2e6102c0c8';

  // 1. Find or create a Lead
  let lead = await Lead.findOne({ email: 'priya.sharma@apexglobal.in' });

  if (!lead) {
    logger.info('No existing lead found, creating a new lead...');
    lead = await Lead.create({
      firstName: 'Priya',
      lastName: 'Sharma',
      fullName: 'Priya Sharma',
      mobile: '9876543210',
      email: 'priya.sharma@apexglobal.in',
      businessName: 'Apex Global Technologies',
      pipelineStage: 'Proposal Sent',
      status: 'qualified',
      address: 'Prestige Tech Park, Marathahalli-Sarjapur Outer Ring Road',
      city: 'Bengaluru',
      state: 'Karnataka',
      country: 'India',
      pincode: '560103',
      servicesInterested: ['GST Audit & Annual Return', 'Corporate Tax Filing'],
      orgId: DEFAULT_ORG_ID,
      userId: DEFAULT_USER_ID,
      createdBy: DEFAULT_USER_ID,
    });
    logger.info(`Created new lead: ${lead.fullName} (${lead._id})`);
  } else {
    lead.orgId = DEFAULT_ORG_ID as any;
    lead.userId = DEFAULT_USER_ID;
    lead.createdBy = DEFAULT_USER_ID;
    await lead.save();
    logger.info(`Updated existing lead with orgId: ${lead.fullName} (${lead._id})`);
  }

  // Ensure lead has an email for testing the email compose modal
  if (!lead.email) {
    lead.email = 'priya.sharma@apexglobal.in';
    await lead.save();
  }

  // 2. Check or create Quotation for this lead
  const quotationNo = 'QT-2026-0089';
  let quotation = await Quotation.findOne({ quotationNo });

  if (quotation) {
    logger.info(`Found existing quotation ${quotationNo}, updating with lead details...`);
    quotation.leadId = lead._id;
    quotation.quotationTo = {
      leadId: lead._id,
      name: lead.fullName,
      businessName: lead.businessName || 'Apex Global Technologies',
      email: lead.email,
      mobile: lead.mobile,
      state: lead.state || 'Karnataka',
      city: lead.addressDetails?.city || 'Bengaluru',
      addressLine1: lead.address || 'Prestige Tech Park',
    };
    quotation.orgId = DEFAULT_ORG_ID as any;
    quotation.userId = DEFAULT_USER_ID;
    quotation.createdBy = DEFAULT_USER_ID;
    await quotation.save();
  } else {
    logger.info(`Creating new quotation ${quotationNo}...`);
    quotation = await Quotation.create({
      quotationNo,
      quotationDate: '2026-10-23',
      dueDate: '2026-11-23',
      status: 'Pending',
      template: 'Aura',
      billingOrg: {
        name: 'Ayatrio Practice',
        address: '88 MG Road, Central Business District, Bengaluru, Karnataka 560001',
        email: 'billing@ayatrio.com',
        mobile: '8722750204',
        website: 'https://ayatrio.in',
        gstin: '29AARCS3638L2ZH',
        pan: 'KKXPS8986J',
      },
      quotationTo: {
        leadId: lead._id,
        name: lead.fullName,
        businessName: lead.businessName || 'Apex Global Technologies',
        email: lead.email,
        mobile: lead.mobile,
        state: lead.state || 'Karnataka',
        city: lead.addressDetails?.city || 'Bengaluru',
        addressLine1: lead.address || 'Prestige Tech Park',
        placeOfSupply: 'Karnataka',
        stateCode: '29',
      },
      bankDetails: {
        paymentType: 'Bank Transfer',
        bankName: 'HDFC Bank',
        accountName: 'Ayatrio Practice Technologies Private Limited',
        accountNumber: '50200089473821',
        ifsc: 'HDFC0001234',
        accountType: 'Current',
        bankBranch: 'Indiranagar, Bengaluru',
        upi: 'ayatrio@hdfcbank',
        currencyCode: 'INR',
      },
      items: [
        {
          serviceName: 'GST Annual Return Filing (GSTR-9 & 9C)',
          hsnSac: '998311',
          quantity: 1,
          price: 25000,
          discountType: 'flat',
          discountValue: 0,
          taxRate: 18,
          sgst: 2250,
          cgst: 2250,
          amount: 25000,
          total: 29500,
          description: 'End-to-end reconciliation of books with GSTR-2B/3B and filing of Annual GST Returns.',
        },
      ],
      subtotal: 25000,
      discountTotal: 0,
      taxTotal: 4500,
      totalAmount: 29500,
      notes: 'Payment due within 30 days from invoice date.',
      terms: '1. Quotation valid for 30 days. 2. Standard GST laws apply.',
      leadId: lead._id,
    });
  }

  logger.info(`Quotation successfully seeded! Quotation No: ${quotation.quotationNo}, Lead: ${lead.fullName} (${lead._id})`);
  await disconnectDatabase();
}

seedQuotation().catch((err) => {
  logger.error('Failed to seed quotation:', err);
  process.exit(1);
});
