/**
 * Shared TypeScript domain contracts for Todero Marketplace.
 *
 * These types are intentionally UI-agnostic so web, mobile, and backend code can
 * all import the same request and status shapes.
 */

export const USER_ROLES = ['CUSTOMER', 'WORKER', 'ADMIN', 'SUPER_ADMIN'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const WORKER_APPLICATION_STATUSES = [
  'DRAFT',
  'SUBMITTED',
  'IN_REVIEW',
  'APPROVED',
  'REJECTED',
  'SUSPENDED',
] as const;
export type WorkerApplicationStatus = (typeof WORKER_APPLICATION_STATUSES)[number];

export const SERVICE_CATEGORY_STATUSES = ['ACTIVE', 'INACTIVE'] as const;
export type ServiceCategoryStatus = (typeof SERVICE_CATEGORY_STATUSES)[number];

export const SERVICE_REQUEST_STATUSES = [
  'requested',
  'reviewing',
  'assigned',
  'quoted',
  'accepted',
  'scheduled',
  'in_progress',
  'completed',
  'disputed',
  'cancelled',
  'closed',
] as const;
export type ServiceRequestStatus = (typeof SERVICE_REQUEST_STATUSES)[number];

export const SERVICE_REQUEST_ASSIGNMENT_STATUSES = [
  'ASSIGNED',
  'QUOTE_SUBMITTED',
  'DECLINED',
  'ACCEPTED',
  'CANCELLED',
] as const;
export type ServiceRequestAssignmentStatus = (typeof SERVICE_REQUEST_ASSIGNMENT_STATUSES)[number];

export const JOB_QUOTE_STATUSES = ['submitted', 'reviewed', 'accepted', 'rejected', 'expired', 'cancelled'] as const;
export type JobQuoteStatus = (typeof JOB_QUOTE_STATUSES)[number];

export const JOB_STATUSES = [
  'accepted',
  'scheduled',
  'worker_on_the_way',
  'in_progress',
  'completed_by_worker',
  'approved_by_customer',
  'disputed',
  'cancelled',
  'closed',
] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export const PAYMENT_STATUSES = ['pending', 'paid', 'failed', 'refunded', 'partially_refunded', 'cancelled'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYOUT_STATUSES = ['not_ready', 'pending', 'paid', 'failed', 'held'] as const;
export type PayoutStatus = (typeof PAYOUT_STATUSES)[number];

export const DISPUTE_STATUSES = [
  'open',
  'under_review',
  'waiting_for_customer',
  'waiting_for_worker',
  'resolved',
  'rejected',
  'escalated',
  'closed',
] as const;
export type DisputeStatus = (typeof DISPUTE_STATUSES)[number];

export const DISPUTE_TYPES = [
  'no_show',
  'incomplete_work',
  'damage_reported',
  'payment_issue',
  'unsafe_behavior',
  'price_disagreement',
  'other',
] as const;
export type DisputeType = (typeof DISPUTE_TYPES)[number];

export interface UserProfile {
  id: string;
  userId: string;
  role: UserRole;
  fullName: string;
  email: string;
  phoneNumber?: string;
  city?: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'BANNED';
  createdAt: string;
  updatedAt: string;
}

export interface WorkerApplication {
  id?: string;
  userId: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  city: string;
  serviceCategoryIds: string[];
  bio?: string;
  experienceYears: number;
  serviceRadiusKm?: number;
  documentUrls: string[];
  status: WorkerApplicationStatus;
  submittedAt?: string;
}

export interface CustomerServiceRequest {
  id?: string;
  customerProfileId: string;
  categoryId: string;
  subcategoryId?: string;
  city: string;
  address: string;
  details?: string;
  scheduledAt?: string;
  photoUrls?: string[];
  status: ServiceRequestStatus;
}

export interface ServiceCategory {
  id: string;
  name: string;
  description?: string;
  status: ServiceCategoryStatus;
  createdAt: string;
  updatedAt: string;
}

export interface JobQuote {
  id?: string;
  serviceRequestId: string;
  workerProfileId: string;
  amount: number;
  laborPrice: number;
  materialsEstimate?: number;
  diagnosticFee?: number;
  durationMinutes?: number;
  currency: 'COP';
  notes?: string;
  status: JobQuoteStatus;
  expiresAt?: string;
}

export interface DisputeReport {
  id?: string;
  jobId: string;
  filedByProfileId: string;
  filedAgainstProfileId: string;
  type: DisputeType;
  reason: string;
  evidenceUrls?: string[];
  status: DisputeStatus;
}

export interface ApiError {
  code: string;
  message: string;
  field?: string;
}

export interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}
