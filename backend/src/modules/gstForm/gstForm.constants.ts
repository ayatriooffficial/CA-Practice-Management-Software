// GST Portal Constants and Master Data
// Verified against GSTN Offline Tool and Rules

export interface StateInfo {
  code: string;
  name: string;
  isUtWithoutLegislature?: boolean;
}

export const MASTER_STATES: StateInfo[] = [
  { code: '01', name: 'Jammu and Kashmir' },
  { code: '02', name: 'Himachal Pradesh' },
  { code: '03', name: 'Punjab' },
  { code: '04', name: 'Chandigarh', isUtWithoutLegislature: true },
  { code: '05', name: 'Uttarakhand' },
  { code: '06', name: 'Haryana' },
  { code: '07', name: 'Delhi' },
  { code: '08', name: 'Rajasthan' },
  { code: '09', name: 'Uttar Pradesh' },
  { code: '10', name: 'Bihar' },
  { code: '11', name: 'Sikkim' },
  { code: '12', name: 'Arunachal Pradesh' },
  { code: '13', name: 'Nagaland' },
  { code: '14', name: 'Manipur' },
  { code: '15', name: 'Mizoram' },
  { code: '16', name: 'Tripura' },
  { code: '17', name: 'Meghalaya' },
  { code: '18', name: 'Assam' },
  { code: '19', name: 'West Bengal' },
  { code: '20', name: 'Jharkhand' },
  { code: '21', name: 'Odisha' },
  { code: '22', name: 'Chhattisgarh' },
  { code: '23', name: 'Madhya Pradesh' },
  { code: '24', name: 'Gujarat' },
  { code: '25', name: 'Daman and Diu', isUtWithoutLegislature: true }, // merged in 26 now, kept for backward compat
  { code: '26', name: 'Dadra and Nagar Haveli and Daman and Diu', isUtWithoutLegislature: true },
  { code: '27', name: 'Maharashtra' },
  { code: '28', name: 'Andhra Pradesh (Old)' },
  { code: '29', name: 'Karnataka' },
  { code: '30', name: 'Goa' },
  { code: '31', name: 'Lakshadweep', isUtWithoutLegislature: true },
  { code: '32', name: 'Kerala' },
  { code: '33', name: 'Tamil Nadu' },
  { code: '34', name: 'Puducherry' },
  { code: '35', name: 'Andaman and Nicobar Islands', isUtWithoutLegislature: true },
  { code: '36', name: 'Telangana' },
  { code: '37', name: 'Andhra Pradesh' },
  { code: '38', name: 'Ladakh', isUtWithoutLegislature: true },
  { code: '96', name: 'Foreign Country' },
  { code: '97', name: 'Other Territory', isUtWithoutLegislature: true },
  { code: '99', name: 'Centre Jurisdiction' },
];

export const STATE_MAP: Record<string, StateInfo> = MASTER_STATES.reduce(
  (acc, st) => {
    acc[st.code] = st;
    return acc;
  },
  {} as Record<string, StateInfo>
);

// Standard GST Rates as shown on the real GST Portal screens
// TODO(spec-gap): GSTN changes tax rates over time; default config keyed by return period
export const DEFAULT_TAX_RATES: number[] = [
  0, 0.1, 0.25, 1, 1.5, 3, 5, 6, 7.5, 12, 18, 28, 40,
];

// Standard GSTN Unit Quantity Codes (UQC)
export const MASTER_UQC: { code: string; name: string }[] = [
  { code: 'BAG', name: 'BAGS' },
  { code: 'BAL', name: 'BALE' },
  { code: 'BDL', name: 'BUNDLES' },
  { code: 'BKL', name: 'BUCKLES' },
  { code: 'BOU', name: 'BILLION OF UNITS' },
  { code: 'BOX', name: 'BOX' },
  { code: 'BTL', name: 'BOTTLES' },
  { code: 'BUN', name: 'BUNCHES' },
  { code: 'CAN', name: 'CANS' },
  { code: 'CBM', name: 'CUBIC METERS' },
  { code: 'CCM', name: 'CUBIC CENTIMETERS' },
  { code: 'CMS', name: 'CENTIMETERS' },
  { code: 'CTN', name: 'CARTONS' },
  { code: 'DOZ', name: 'DOZENS' },
  { code: 'DRM', name: 'DRUMS' },
  { code: 'GGK', name: 'GREAT GROSS' },
  { code: 'GMS', name: 'GRAMMES' },
  { code: 'GRS', name: 'GROSS' },
  { code: 'GYD', name: 'GROSS YARDS' },
  { code: 'KGS', name: 'KILOGRAMS' },
  { code: 'KLR', name: 'KILOLITRES' },
  { code: 'KME', name: 'KILOMETRE' },
  { code: 'MLT', name: 'MILLILITRE' },
  { code: 'MTR', name: 'METERS' },
  { code: 'MTS', name: 'METRIC TON' },
  { code: 'NOS', name: 'NUMBERS' },
  { code: 'PAC', name: 'PACKS' },
  { code: 'PCS', name: 'PIECES' },
  { code: 'PRS', name: 'PAIRS' },
  { code: 'QTL', name: 'QUINTAL' },
  { code: 'ROL', name: 'ROLLS' },
  { code: 'SET', name: 'SETS' },
  { code: 'SQF', name: 'SQUARE FEET' },
  { code: 'SQM', name: 'SQUARE METERS' },
  { code: 'SQY', name: 'SQUARE YARDS' },
  { code: 'TBS', name: 'TABLETS' },
  { code: 'TGM', name: 'TEN GROSS' },
  { code: 'THD', name: 'THOUSANDS' },
  { code: 'TON', name: 'TONNES' },
  { code: 'TUB', name: 'TUBES' },
  { code: 'UGS', name: 'US GALLONS' },
  { code: 'UNT', name: 'UNITS' },
  { code: 'YDS', name: 'YARDS' },
  { code: 'OTH', name: 'OTHERS' },
  { code: 'NA', name: 'NOT APPLICABLE (Services)' },
];

export interface HsnMasterEntry {
  hsn: string;
  description: string;
  isService?: boolean;
}

export const DEFAULT_MASTER_HSN: HsnMasterEntry[] = [
  // Services (SAC)
  { hsn: '998221', description: 'Financial and related advisory services', isService: true },
  { hsn: '998231', description: 'Accounting, auditing and bookkeeping services', isService: true },
  { hsn: '998232', description: 'Tax consultancy and preparation services', isService: true },
  { hsn: '998311', description: 'Management consulting and management services', isService: true },
  { hsn: '998313', description: 'Information technology (IT) consulting and support services', isService: true },
  { hsn: '998314', description: 'Information technology (IT) design and development services', isService: true },
  { hsn: '998315', description: 'Hosting and information technology (IT) infrastructure provisioning services', isService: true },
  { hsn: '998316', description: 'IT infrastructure and network management services', isService: true },
  { hsn: '998319', description: 'Other information technology services n.e.c.', isService: true },
  { hsn: '998211', description: 'Legal advisory and representation services', isService: true },
  { hsn: '998399', description: 'Other professional, technical and business services n.e.c.', isService: true },
  { hsn: '998599', description: 'Other support services n.e.c.', isService: true },
  { hsn: '997212', description: 'Rental or leasing services involving own or leased non-residential property', isService: true },
  { hsn: '996511', description: 'Road transport services of goods', isService: true },

  // Goods (Common HSN)
  { hsn: '84713010', description: 'Personal computer (laptop, notebook)' },
  { hsn: '84714190', description: 'Other digital automatic data processing machines' },
  { hsn: '85171300', description: 'Smartphones' },
  { hsn: '85176290', description: 'Machines for reception, conversion, transmission of voice/data' },
  { hsn: '85285200', description: 'Monitors capable of directly connecting to data processing machines' },
  { hsn: '48201090', description: 'Registers, account books, note books, order books' },
  { hsn: '48025510', description: 'Uncoated paper used for writing, printing' },
  { hsn: '84433100', description: 'Machines which perform two or more functions of printing, copying' },
  { hsn: '94031000', description: 'Metal furniture of a kind used in offices' },
  { hsn: '94032090', description: 'Other metal furniture' },
  { hsn: '94033000', description: 'Wooden furniture of a kind used in offices' },
  { hsn: '85044090', description: 'Static converters (UPS, inverters)' },
  { hsn: '39269099', description: 'Other articles of plastics' },
  { hsn: '85076000', description: 'Lithium-ion accumulators' },
  { hsn: '84733020', description: 'Motherboards for data processing machines' },
  { hsn: '84733030', description: 'Other parts and accessories of automatic data processing machines' },
];

// 12 Natures of Documents for Table 13 (Section 6.9)
export const NATURE_OF_DOCUMENTS: { id: number; name: string; description: string }[] = [
  { id: 1, name: 'Invoices for outward supply', description: 'All outward invoices including bills of supply, B2B, B2C, SEZ, DE series-wise' },
  { id: 2, name: 'Invoices for inward supply from unregistered person', description: 'Self-invoices for reverse-charge purchases from unregistered suppliers' },
  { id: 3, name: 'Revised invoice', description: 'Revised tax invoices issued' },
  { id: 4, name: 'Debit note', description: 'All debit notes issued for supplies made by this taxpayer' },
  { id: 5, name: 'Credit note', description: 'All credit notes issued for supplies made by this taxpayer' },
  { id: 6, name: 'Receipt voucher', description: 'Vouchers issued for advances received' },
  { id: 7, name: 'Payment voucher', description: 'Vouchers issued for payments made to suppliers under reverse charge' },
  { id: 8, name: 'Refund voucher', description: 'Issued when an advance is refunded' },
  { id: 9, name: 'Delivery challan for job work', description: 'Delivery challans issued for goods sent for job work' },
  { id: 10, name: 'Delivery challan for supply on approval', description: 'Delivery challans for goods sent on approval' },
  { id: 11, name: 'Delivery challan in case of liquid gas', description: 'Challans for transportation of liquid gas' },
  { id: 12, name: 'Delivery challan in cases other than by way of supply (excluding at S.No. 9 to 11)', description: 'Other non-supply movement challans' },
];

export const TAX_TOLERANCE_PER_LINE = 1.0; // +/- 1.00 INR per line
export const HSN_TOTAL_TOLERANCE = 1.0; // +/- 1.00 INR tolerance for reconciliation
export const B2CL_MIN_INVOICE_VALUE = 100000.0; // B2C Large invoice threshold (> 1,00,000 INR)

// Canonical Column Synonyms for Smart Mapping (Section 8.4)
// TODO(spec-gap): [DECIDE: ask the owner for sample exports from accounting software (Tally, Zoho, Busy, Excel) and add presets from real files.]
export const COLUMN_SYNONYMS: Record<string, string[]> = {
  recipient_gstin: [
    'recipient_gstin', 'gstin of customer', 'customer gstin', 'party gstin',
    'gstin', 'buyer gstin', 'party gst', 'customer gst', 'gstin/uin', 'gstin / uin',
    'counterparty gstin', 'recipient gst'
  ],
  recipient_name: [
    'recipient_name', 'customer name', 'party name', 'buyer name', 'client name',
    'name of recipient', 'name of customer', 'party', 'customer', 'buyer'
  ],
  invoice_no: [
    'invoice_no', 'invoice number', 'inv no', 'inv number', 'bill no',
    'bill number', 'voucher no', 'voucher number', 'doc no', 'document no', 'ref no'
  ],
  invoice_date: [
    'invoice_date', 'invoice date', 'inv date', 'bill date', 'date', 'doc date', 'voucher date'
  ],
  invoice_value: [
    'invoice_value', 'invoice value', 'inv value', 'bill value', 'bill amount',
    'total amount', 'total value', 'invoice total', 'gross amount', 'grand total'
  ],
  pos: [
    'pos', 'place of supply', 'place of supply (state)', 'place of supply state',
    'state code', 'supply state', 'destination state', 'state of supply'
  ],
  rate: [
    'rate', 'gst rate', 'tax rate', 'tax rate (%)', 'rate (%)', 'gst %', 'gst percent', 'rate %', 'rate percent', 'tax percent', 'item rate'
  ],
  taxable_value: [
    'taxable_value', 'taxable value', 'taxable amount', 'taxable val', 'taxable amt',
    'basic amount', 'taxable turnover', 'assessable value', 'taxable'
  ],
  igst: [
    'igst', 'integrated tax', 'igst amount', 'igst amt', 'integrated tax amount', 'integrated gst'
  ],
  cgst: [
    'cgst', 'central tax', 'cgst amount', 'cgst amt', 'central tax amount', 'central gst'
  ],
  sgst: [
    'sgst', 'state tax', 'sgst amount', 'sgst amt', 'state tax amount', 'state / ut tax', 'state gst'
  ],
  cess: [
    'cess', 'cess amount', 'cess amt', 'compensation cess'
  ],
  note_type: [
    'note_type', 'document type', 'note type', 'cr/dr', 'credit / debit', 'c/d', 'type of note'
  ],
  note_no: [
    'note_no', 'note number', 'credit note no', 'debit note no', 'cn no', 'dn no'
  ],
  note_date: [
    'note_date', 'note date', 'credit note date', 'debit note date'
  ],
  hsn: [
    'hsn', 'hsn code', 'hsn/sac', 'hsn / sac', 'sac', 'item hsn', 'product hsn'
  ],
  uqc: [
    'uqc', 'unit', 'unit quantity code', 'uom', 'unit of measure'
  ],
  quantity: [
    'quantity', 'qty', 'count', 'units'
  ],
  reverse_charge: [
    'reverse_charge', 'reverse charge', 'rchrg', 'is reverse charge', 'rcm'
  ],
  invoice_type: [
    'invoice_type', 'invoice type', 'inv type', 'supply type', 'type'
  ],
  differential_rate: [
    'differential_rate', 'differential percentage', 'diff percent', 'diff rate', 'concessional rate'
  ],
  irn: [
    'irn', 'invoice reference number', 'irn number'
  ],
  irn_date: [
    'irn_date', 'irn date', 'ack date'
  ]
};

