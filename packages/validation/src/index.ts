/**
 * Zod validation schemas for Todero Marketplace shared contracts.
 */

import { z } from 'zod';
import {
  DISPUTE_STATUSES,
  DISPUTE_TYPES,
  JOB_QUOTE_STATUSES,
  JOB_STATUSES,
  PAYMENT_STATUSES,
  SERVICE_CATEGORY_STATUSES,
  SERVICE_REQUEST_ASSIGNMENT_STATUSES,
  SERVICE_REQUEST_STATUSES,
  USER_ROLES,
  WORKER_APPLICATION_STATUSES,
} from '@shared/types';

export { z };

const requiredText = (field: string) => z.string().trim().min(1, `${field} is required`);
const optionalText = z.string().trim().min(1).optional();
const uuid = z.string().uuid();
const isoDateTime = z.string().datetime({ offset: true });

export const userRoleSchema = z.enum(USER_ROLES);
export const workerApplicationStatusSchema = z.enum(WORKER_APPLICATION_STATUSES);
export const serviceCategoryStatusSchema = z.enum(SERVICE_CATEGORY_STATUSES);
export const serviceRequestStatusSchema = z.enum(SERVICE_REQUEST_STATUSES);
export const serviceRequestAssignmentStatusSchema = z.enum(SERVICE_REQUEST_ASSIGNMENT_STATUSES);
export const jobQuoteStatusSchema = z.enum(JOB_QUOTE_STATUSES);
export const jobStatusSchema = z.enum(JOB_STATUSES);
export const paymentStatusSchema = z.enum(PAYMENT_STATUSES);
export const disputeStatusSchema = z.enum(DISPUTE_STATUSES);
export const disputeTypeSchema = z.enum(DISPUTE_TYPES);

export const loginSchema = z.object({
  email: z.string().trim().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const signUpSchema = z.object({
  email: z.string().trim().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  fullName: requiredText('Full name'),
  role: z.enum(['CUSTOMER', 'WORKER']),
});

export const userProfileSchema = z.object({
  id: uuid,
  userId: uuid,
  role: userRoleSchema,
  fullName: requiredText('Full name'),
  email: z.string().trim().email('Invalid email'),
  phoneNumber: optionalText,
  city: optionalText,
  status: z.enum(['ACTIVE', 'SUSPENDED', 'BANNED']),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
});

export const workerApplicationSchema = z.object({
  id: uuid.optional(),
  userId: uuid,
  fullName: requiredText('Full name'),
  email: z.string().trim().email('Invalid email'),
  phoneNumber: requiredText('Phone number'),
  city: requiredText('City'),
  serviceCategoryIds: z.array(uuid).min(1, 'Select at least one service category'),
  bio: optionalText,
  experienceYears: z.number().int().min(0).max(80),
  serviceRadiusKm: z.number().int().positive().max(200).optional(),
  documentUrls: z.array(z.string().url()).min(1, 'Upload at least one verification document'),
  status: workerApplicationStatusSchema.default('DRAFT'),
  submittedAt: isoDateTime.optional(),
});

export const customerServiceRequestSchema = z.object({
  id: uuid.optional(),
  customerProfileId: uuid,
  categoryId: uuid,
  subcategoryId: uuid.optional(),
  city: requiredText('City'),
  address: requiredText('Address'),
  details: optionalText,
  scheduledAt: isoDateTime.optional(),
  photoUrls: z.array(z.string().url()).optional(),
  status: serviceRequestStatusSchema.default('requested'),
});

export const serviceCategorySchema = z.object({
  id: uuid,
  name: requiredText('Category name'),
  description: optionalText,
  status: serviceCategoryStatusSchema.default('ACTIVE'),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
});

export const jobQuoteSchema = z.object({
  id: uuid.optional(),
  serviceRequestId: uuid,
  workerProfileId: uuid,
  amount: z.number().nonnegative(),
  laborPrice: z.number().nonnegative(),
  materialsEstimate: z.number().nonnegative().optional(),
  diagnosticFee: z.number().nonnegative().optional(),
  durationMinutes: z.number().int().positive().optional(),
  currency: z.literal('COP').default('COP'),
  notes: optionalText,
  status: jobQuoteStatusSchema.default('submitted'),
  expiresAt: isoDateTime.optional(),
});

export const disputeReportSchema = z.object({
  id: uuid.optional(),
  jobId: uuid,
  filedByProfileId: uuid,
  filedAgainstProfileId: uuid,
  type: disputeTypeSchema,
  reason: requiredText('Dispute reason'),
  evidenceUrls: z.array(z.string().url()).optional(),
  status: disputeStatusSchema.default('OPEN'),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type UserProfileInput = z.infer<typeof userProfileSchema>;
export type WorkerApplicationInput = z.infer<typeof workerApplicationSchema>;
export type CustomerServiceRequestInput = z.infer<typeof customerServiceRequestSchema>;
export type ServiceCategoryInput = z.infer<typeof serviceCategorySchema>;
export type JobQuoteInput = z.infer<typeof jobQuoteSchema>;
export type JobStatusInput = z.infer<typeof jobStatusSchema>;
export type PaymentStatusInput = z.infer<typeof paymentStatusSchema>;
export type DisputeReportInput = z.infer<typeof disputeReportSchema>;

// Backwards-compatible aliases for earlier scaffold examples.
export const bookingRequestSchema = customerServiceRequestSchema;
export type BookingRequest = CustomerServiceRequestInput;
