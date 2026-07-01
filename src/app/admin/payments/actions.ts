'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/supabase-server';
import { inactivePaymentProviders, paymentStatuses, payoutStatuses, type PaymentStatus, type PayoutStatus } from './constants';

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

function readMoney(formData: FormData, key: string) {
  const value = Number(readString(formData, key));
  return Number.isFinite(value) && value >= 0 ? value : null;
}

function readPaymentStatus(value: string): PaymentStatus | null {
  return paymentStatuses.includes(value as PaymentStatus) ? (value as PaymentStatus) : null;
}

function readPayoutStatus(value: string): PayoutStatus | null {
  return payoutStatuses.includes(value as PayoutStatus) ? (value as PayoutStatus) : null;
}

function revalidatePaymentPaths(paymentId?: string) {
  revalidatePath('/admin/payments');
  if (paymentId) {
    revalidatePath(`/admin/payments/${paymentId}`);
  }
}

async function writeAuditLog(params: {
  action: string;
  paymentId: string;
  metadata?: Record<string, unknown>;
}) {
  const { supabase, adminProfile } = await requireAdmin();
  const { error } = await supabase.from('audit_logs').insert({
    actor_profile_id: adminProfile.id,
    action: params.action,
    entity: 'payments',
    entity_id: params.paymentId,
    metadata: params.metadata ?? {},
  });

  if (error) {
    throw new Error(error.message);
  }
}

async function readPayment(paymentId: string) {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from('payments')
    .select('id,job_id,payment_status,payout_status,admin_notes')
    .eq('id', paymentId)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'No se encontro el pago.');
  }

  return {
    payment: data as {
      id: string;
      job_id: string;
      payment_status: string;
      payout_status: string;
      admin_notes: string | null;
    },
    supabase,
  };
}

export async function createManualPayment(formData: FormData) {
  const { supabase } = await requireAdmin();
  const jobId = readString(formData, 'jobId');
  const amount = readMoney(formData, 'amount');
  const platformFee = readMoney(formData, 'platformFee') ?? 0;
  const paymentProvider = readString(formData, 'paymentProvider') || 'manual';
  const providerReference = readString(formData, 'providerReference');
  const adminNotes = readString(formData, 'adminNotes');

  if (!jobId || amount == null) {
    throw new Error('Selecciona un trabajo e ingresa un valor valido.');
  }

  if (!inactivePaymentProviders.includes(paymentProvider as (typeof inactivePaymentProviders)[number])) {
    throw new Error('Proveedor de pago invalido.');
  }

  if (platformFee > amount) {
    throw new Error('La tarifa de plataforma no puede superar el valor total.');
  }

  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .select('id,customer_profile_id,worker_profile_id')
    .eq('id', jobId)
    .single();

  if (jobError || !job) {
    throw new Error(jobError?.message ?? 'No se encontro el trabajo.');
  }

  const { data: payment, error } = await supabase
    .from('payments')
    .insert({
      job_id: jobId,
      customer_profile_id: job.customer_profile_id,
      worker_profile_id: job.worker_profile_id,
      amount,
      currency: 'COP',
      status: 'pending',
      payment_status: 'pending',
      payout_status: 'not_ready',
      payment_method: paymentProvider,
      payment_provider: paymentProvider,
      provider_reference: providerReference || null,
      platform_fee: platformFee,
      worker_amount: amount - platformFee,
      admin_notes: adminNotes || null,
    })
    .select('id')
    .single();

  if (error || !payment) {
    throw new Error(error?.message ?? 'No se pudo crear el pago.');
  }

  await writeAuditLog({
    action: 'payment_manual_record_created',
    paymentId: payment.id as string,
    metadata: {
      job_id: jobId,
      amount,
      platform_fee: platformFee,
      worker_amount: amount - platformFee,
      payment_provider: paymentProvider,
    },
  });

  revalidatePaymentPaths(payment.id as string);
  redirect(`/admin/payments/${payment.id}`);
}

export async function updatePaymentStatus(formData: FormData) {
  const paymentId = readString(formData, 'paymentId');
  const paymentStatus = readPaymentStatus(readString(formData, 'paymentStatus'));

  if (!paymentId || !paymentStatus) {
    throw new Error('Estado de pago invalido.');
  }

  const { payment, supabase } = await readPayment(paymentId);
  const { error } = await supabase
    .from('payments')
    .update({
      status: paymentStatus,
      payment_status: paymentStatus,
    })
    .eq('id', paymentId);

  if (error) {
    throw new Error(error.message);
  }

  await writeAuditLog({
    action: 'payment_status_updated_by_admin',
    paymentId,
    metadata: {
      previous_payment_status: payment.payment_status,
      payment_status: paymentStatus,
      job_id: payment.job_id,
    },
  });

  revalidatePaymentPaths(paymentId);
}

export async function updatePayoutStatus(formData: FormData) {
  const paymentId = readString(formData, 'paymentId');
  const payoutStatus = readPayoutStatus(readString(formData, 'payoutStatus'));

  if (!paymentId || !payoutStatus) {
    throw new Error('Estado de pago al trabajador invalido.');
  }

  const { payment, supabase } = await readPayment(paymentId);
  const { error } = await supabase.from('payments').update({ payout_status: payoutStatus }).eq('id', paymentId);

  if (error) {
    throw new Error(error.message);
  }

  await writeAuditLog({
    action: 'payment_payout_status_updated_by_admin',
    paymentId,
    metadata: {
      previous_payout_status: payment.payout_status,
      payout_status: payoutStatus,
      job_id: payment.job_id,
    },
  });

  revalidatePaymentPaths(paymentId);
}

export async function savePaymentNotes(formData: FormData) {
  const paymentId = readString(formData, 'paymentId');
  const adminNotes = readString(formData, 'adminNotes');

  if (!paymentId) {
    throw new Error('Falta el pago.');
  }

  const { supabase } = await readPayment(paymentId);
  const { error } = await supabase.from('payments').update({ admin_notes: adminNotes || null }).eq('id', paymentId);

  if (error) {
    throw new Error(error.message);
  }

  await writeAuditLog({
    action: 'payment_admin_notes_updated',
    paymentId,
    metadata: { admin_notes: adminNotes || null },
  });

  revalidatePaymentPaths(paymentId);
}
