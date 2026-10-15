import { RiskHistoryEntry } from './review.model';

export type ApplicationStatus = 'DRAFT' | 'SUBMITTED' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';

export const APPLICATION_STATUSES: readonly ApplicationStatus[] = [
  'DRAFT',
  'SUBMITTED',
  'PENDING_REVIEW',
  'APPROVED',
  'REJECTED',
];

export const BUSINESS_TYPES = [
  { value: 'RETAIL', label: 'Retail' },
  { value: 'FOOD_BEVERAGE', label: 'Food & Beverage' },
  { value: 'IMPORT_EXPORT', label: 'Import / Export' },
  { value: 'SOFTWARE', label: 'Software' },
  { value: 'SERVICES', label: 'Professional Services' },
  { value: 'TRAVEL', label: 'Travel' },
  { value: 'HEALTHCARE', label: 'Healthcare' },
  { value: 'OTHER', label: 'Other' },
] as const;

export interface MerchantApplication {
  id: string;
  businessName: string;
  businessType: string;
  annualRevenue: number;
  taxId: string;
  bankAccount: string;
  routingNumber: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  // null for SALES
  ownerSsn: string | null;
  status: ApplicationStatus;
  submittedBy: string;
  assignedReviewer: string | null;
  createdAt: string;
  updatedAt: string;
  riskHistory: RiskHistoryEntry[];
}

export type ApplicationInput = Pick<
  MerchantApplication,
  | 'businessName'
  | 'businessType'
  | 'annualRevenue'
  | 'taxId'
  | 'ownerName'
  | 'ownerEmail'
  | 'ownerPhone'
  | 'bankAccount'
  | 'routingNumber'
> & { ownerSsn: string };

export type ApplicationDraft = Partial<
  Pick<ApplicationInput, 'businessName' | 'businessType' | 'annualRevenue' | 'ownerName' | 'ownerEmail' | 'ownerPhone'>
> & { id?: string; updatedAt?: string };

export interface ApplicationPage {
  data: MerchantApplication[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ApplicationFilters {
  page: number;
  pageSize: number;
  status?: ApplicationStatus;
  search?: string;
}
