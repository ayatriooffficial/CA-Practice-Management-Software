// Frontend GST Utilities, Formatters and Masters

export function formatIndianCurrency(amount: number | undefined | null): string {
  const val = Number(amount) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);
}

export function formatIndianNumber(amount: number | undefined | null): string {
  const val = Number(amount) || 0;
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);
}

export function round2(num: number): number {
  return Math.round((Number(num) || 0) * 100) / 100;
}

export function validateGstin(gstin: string): boolean {
  if (!gstin) return false;
  const regex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return regex.test(gstin.trim().toUpperCase());
}

export interface StateOption {
  code: string;
  name: string;
  label: string; // e.g. "07-Delhi"
}

export const STATE_OPTIONS: StateOption[] = [
  { code: '01', name: 'Jammu and Kashmir', label: '01-Jammu and Kashmir' },
  { code: '02', name: 'Himachal Pradesh', label: '02-Himachal Pradesh' },
  { code: '03', name: 'Punjab', label: '03-Punjab' },
  { code: '04', name: 'Chandigarh', label: '04-Chandigarh' },
  { code: '05', name: 'Uttarakhand', label: '05-Uttarakhand' },
  { code: '06', name: 'Haryana', label: '06-Haryana' },
  { code: '07', name: 'Delhi', label: '07-Delhi' },
  { code: '08', name: 'Rajasthan', label: '08-Rajasthan' },
  { code: '09', name: 'Uttar Pradesh', label: '09-Uttar Pradesh' },
  { code: '10', name: 'Bihar', label: '10-Bihar' },
  { code: '11', name: 'Sikkim', label: '11-Sikkim' },
  { code: '12', name: 'Arunachal Pradesh', label: '12-Arunachal Pradesh' },
  { code: '13', name: 'Nagaland', label: '13-Nagaland' },
  { code: '14', name: 'Manipur', label: '14-Manipur' },
  { code: '15', name: 'Mizoram', label: '15-Mizoram' },
  { code: '16', name: 'Tripura', label: '16-Tripura' },
  { code: '17', name: 'Meghalaya', label: '17-Meghalaya' },
  { code: '18', name: 'Assam', label: '18-Assam' },
  { code: '19', name: 'West Bengal', label: '19-West Bengal' },
  { code: '20', name: 'Jharkhand', label: '20-Jharkhand' },
  { code: '21', name: 'Odisha', label: '21-Odisha' },
  { code: '22', name: 'Chhattisgarh', label: '22-Chhattisgarh' },
  { code: '23', name: 'Madhya Pradesh', label: '23-Madhya Pradesh' },
  { code: '24', name: 'Gujarat', label: '24-Gujarat' },
  { code: '26', name: 'Dadra & Nagar Haveli and Daman & Diu', label: '26-Dadra & Nagar Haveli and Daman & Diu' },
  { code: '27', name: 'Maharashtra', label: '27-Maharashtra' },
  { code: '29', name: 'Karnataka', label: '29-Karnataka' },
  { code: '30', name: 'Goa', label: '30-Goa' },
  { code: '31', name: 'Lakshadweep', label: '31-Lakshadweep' },
  { code: '32', name: 'Kerala', label: '32-Kerala' },
  { code: '33', name: 'Tamil Nadu', label: '33-Tamil Nadu' },
  { code: '34', name: 'Puducherry', label: '34-Puducherry' },
  { code: '35', name: 'Andaman and Nicobar Islands', label: '35-Andaman and Nicobar Islands' },
  { code: '36', name: 'Telangana', label: '36-Telangana' },
  { code: '37', name: 'Andhra Pradesh', label: '37-Andhra Pradesh' },
  { code: '38', name: 'Ladakh', label: '38-Ladakh' },
  { code: '96', name: 'Foreign Country', label: '96-Foreign Country' },
  { code: '97', name: 'Other Territory', label: '97-Other Territory' },
  { code: '99', name: 'Centre Jurisdiction', label: '99-Centre Jurisdiction' },
];

export const TAX_RATES = [0, 0.1, 0.25, 1, 1.5, 3, 5, 6, 7.5, 12, 18, 28, 40];

export const UQC_OPTIONS = [
  { code: 'BAG', name: 'BAGS' },
  { code: 'BOX', name: 'BOX' },
  { code: 'BTL', name: 'BOTTLES' },
  { code: 'CAN', name: 'CANS' },
  { code: 'CTN', name: 'CARTONS' },
  { code: 'DOZ', name: 'DOZENS' },
  { code: 'GMS', name: 'GRAMMES' },
  { code: 'KGS', name: 'KILOGRAMS' },
  { code: 'MTR', name: 'METERS' },
  { code: 'NOS', name: 'NUMBERS' },
  { code: 'PAC', name: 'PACKS' },
  { code: 'PCS', name: 'PIECES' },
  { code: 'PRS', name: 'PAIRS' },
  { code: 'QTL', name: 'QUINTAL' },
  { code: 'ROL', name: 'ROLLS' },
  { code: 'SET', name: 'SETS' },
  { code: 'SQF', name: 'SQUARE FEET' },
  { code: 'SQM', name: 'SQUARE METERS' },
  { code: 'TON', name: 'TONNES' },
  { code: 'UNT', name: 'UNITS' },
  { code: 'OTH', name: 'OTHERS' },
  { code: 'NA', name: 'NOT APPLICABLE (Services)' },
];

export const HSN_MASTER_LIST = [
  { hsn: '998221', description: 'Financial and related advisory services', isService: true },
  { hsn: '998231', description: 'Accounting, auditing and bookkeeping services', isService: true },
  { hsn: '998232', description: 'Tax consultancy and preparation services', isService: true },
  { hsn: '998311', description: 'Management consulting and management services', isService: true },
  { hsn: '998313', description: 'Information technology (IT) consulting and support services', isService: true },
  { hsn: '998314', description: 'Information technology (IT) design and development services', isService: true },
  { hsn: '998315', description: 'Hosting and IT infrastructure provisioning services', isService: true },
  { hsn: '998316', description: 'IT infrastructure and network management services', isService: true },
  { hsn: '998319', description: 'Other information technology services n.e.c.', isService: true },
  { hsn: '998211', description: 'Legal advisory and representation services', isService: true },
  { hsn: '998399', description: 'Other professional, technical and business services n.e.c.', isService: true },
  { hsn: '998599', description: 'Other support services n.e.c.', isService: true },
  { hsn: '997212', description: 'Rental or leasing services of commercial property', isService: true },
  { hsn: '996511', description: 'Road transport services of goods', isService: true },
  { hsn: '84713010', description: 'Personal computer (laptop, notebook)' },
  { hsn: '84714190', description: 'Other digital automatic data processing machines' },
  { hsn: '85171300', description: 'Smartphones' },
  { hsn: '85176290', description: 'Machines for reception, conversion, transmission of voice/data' },
  { hsn: '85285200', description: 'Monitors capable of directly connecting to computers' },
  { hsn: '48201090', description: 'Registers, account books, note books, order books' },
  { hsn: '48025510', description: 'Uncoated paper used for writing, printing' },
  { hsn: '84433100', description: 'Multifunction printers, copiers' },
  { hsn: '94031000', description: 'Metal furniture of a kind used in offices' },
  { hsn: '94033000', description: 'Wooden furniture of a kind used in offices' },
  { hsn: '85044090', description: 'Static converters (UPS, inverters)' },
  { hsn: '39269099', description: 'Other articles of plastics' },
  { hsn: '85076000', description: 'Lithium-ion accumulators' },
];

export const NATURE_OF_DOCUMENTS = [
  { id: 1, name: 'Invoices for outward supply' },
  { id: 2, name: 'Invoices for inward supply from unregistered person' },
  { id: 3, name: 'Revised invoice' },
  { id: 4, name: 'Debit note' },
  { id: 5, name: 'Credit note' },
  { id: 6, name: 'Receipt voucher' },
  { id: 7, name: 'Payment voucher' },
  { id: 8, name: 'Refund voucher' },
  { id: 9, name: 'Delivery challan for job work' },
  { id: 10, name: 'Delivery challan for supply on approval' },
  { id: 11, name: 'Delivery challan in case of liquid gas' },
  { id: 12, name: 'Delivery challan in cases other than by way of supply (excluding at S.No. 9 to 11)' },
];

// Month name from MMYYYY (e.g. 102026 -> "October 2026")
export function formatReturnPeriod(periodStr: string): string {
  if (!periodStr || periodStr.length < 6) return periodStr || '';
  const monthIdx = parseInt(periodStr.slice(0, 2), 10) - 1;
  const year = periodStr.slice(2, 6);
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  return `${months[monthIdx] || periodStr.slice(0, 2)} ${year}`;
}

