export interface DaySchedule {
  day: string;
  enabled: boolean;
  from: string;
  to: string;
  hours: number;
}

export const INDIAN_STATES: string[] = [
  "Andaman and Nicobar Islands",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chandigarh",
  "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu and Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Ladakh",
  "Lakshadweep",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Puducherry",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
];

export const BUSINESS_ENTITIES: string[] = [
  "Sole Proprietorship",
  "Partnership Firm",
  "Limited Liability Partnership (LLP)",
  "Private Limited Company",
  "Public Limited Company",
  "One Person Company (OPC)",
  "Trust / Society / NGO",
  "Individual / Proprietor",
];

export const BUSINESS_TYPES: string[] = [
  "Chartered Accountant (CA)",
  "Tax Consultant & Practitioner",
  "Company Secretary (CS)",
  "Cost & Management Accountant (CMA)",
  "Legal Practitioner / Advocate",
  "Accounting & Bookkeeping Services",
  "Auditing & Assurance Firm",
  "Corporate Advisory & Consulting",
];

export const CURRENCIES = [
  { code: "INR", label: "Rupees INR ₹" },
  { code: "USD", label: "US Dollar USD $" },
  { code: "EUR", label: "Euro EUR €" },
  { code: "GBP", label: "British Pound GBP £" },
  { code: "AED", label: "UAE Dirham AED د.إ" },
];

export const MSME_CATEGORIES: string[] = ["Micro", "Small", "Medium", "Not Applicable"];

export const DEFAULT_DAYS: DaySchedule[] = [
  { day: "Monday", enabled: true, from: "09:30 AM", to: "06:30 PM", hours: 9.0 },
  { day: "Tuesday", enabled: true, from: "09:30 AM", to: "06:30 PM", hours: 9.0 },
  { day: "Wednesday", enabled: true, from: "09:30 AM", to: "06:30 PM", hours: 9.0 },
  { day: "Thursday", enabled: true, from: "09:30 AM", to: "06:30 PM", hours: 9.0 },
  { day: "Friday", enabled: true, from: "09:30 AM", to: "06:30 PM", hours: 9.0 },
  { day: "Saturday", enabled: true, from: "09:30 AM", to: "06:30 PM", hours: 9.0 },
  { day: "Sunday", enabled: false, from: "", to: "", hours: 0.0 },
];
