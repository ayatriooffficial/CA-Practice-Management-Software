export const SERVICE_CATEGORY_TUPLE = [
  'Retainer',
  'G.S.T',
  'Income Tax',
  'R.O.C',
  'E.P.F.P',
  'E.S.I.C',
  'Audit',
  'Import Export',
  'Profession Tax',
  'Shram Suvida',
  'Trade License',
] as const;

export type ServiceCategory = (typeof SERVICE_CATEGORY_TUPLE)[number];

export const SERVICE_CATEGORIES: string[] = [...SERVICE_CATEGORY_TUPLE];
