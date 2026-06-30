'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/supabase-server';

const quoteStatuses = ['submitted', 'reviewed', 'accepted', 'rejected', 'expired', 'cancelled'] as const;
type QuoteStatus = (typeof quoteStatuses)[number];

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

function readStatus(value: string): QuoteStatus | null {
  return quoteStatuses.includes(value as QuoteStatus) ? (value as QuoteStatus) : null;
}

async function readQuote(quoteId: string) {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from('job_quotes')
    .select('id,service_request_id,worker_profile_id,metadata,status')
    .eq('id', quoteId)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'No se encontro la cotizacion.');
  }

  return {
    quote: data as {
      id: string;
      service_request_id: string;
      worker_profile_id: string;
      metadata: Record<string, unknown> | null;
      status: string;
    },
    supabase,
  };
}

async function writeAuditLog(params: {
  action: string;
  quoteId: string;
  serviceRequestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { supabase, adminProfile } = await requireAdmin();
  const { error } = await supabase.from('audit_logs').insert({
    actor_profile_id: adminProfile.id,
    action: params.action,
    entity: 'job_quotes',
    entity_id: params.quoteId,
    metadata: {
      service_request_id: params.serviceRequestId,
      ...(params.metadata ?? {}),
    },
  });

  if (error) {
    throw new Error(error.message);
  }
}

function revalidateQuotePaths(serviceRequestId: string) {
  revalidatePath('/admin/quotes');
  revalidatePath(`/admin/service-requests/${serviceRequestId}`);
  revalidatePath(`/admin/service-requests/${serviceRequestId}/quotes`);
}

export async function updateQuoteAdminReview(formData: FormData) {
  const quoteId = readString(formData, 'quoteId');
  const nextStatus = readStatus(readString(formData, 'status'));
  const adminNote = readString(formData, 'adminNote');
  const moderation = readString(formData, 'moderation');

  if (!quoteId || !nextStatus) {
    throw new Error('Datos de cotizacion invalidos.');
  }

  if (nextStatus === 'accepted') {
    throw new Error('Usa la anulación administrativa explícita con motivo para aceptar por el cliente.');
  }

  const { quote, supabase } = await readQuote(quoteId);
  const metadata = {
    ...(quote.metadata ?? {}),
    admin_note: adminNote,
    reviewed_at: new Date().toISOString(),
    is_hidden: moderation === 'hidden',
    is_flagged: moderation === 'flagged',
  };

  const { error } = await supabase
    .from('job_quotes')
    .update({
      status: nextStatus,
      metadata,
    })
    .eq('id', quoteId);

  if (error) {
    throw new Error(error.message);
  }

  await writeAuditLog({
    action: 'quote_admin_review_updated',
    quoteId,
    serviceRequestId: quote.service_request_id,
    metadata: { status: nextStatus, moderation, admin_note: adminNote || null },
  });

  revalidateQuotePaths(quote.service_request_id);
}

export async function acceptQuoteWithAdminOverride(formData: FormData) {
  const quoteId = readString(formData, 'quoteId');
  const overrideReason = readString(formData, 'overrideReason');

  if (!quoteId || !overrideReason) {
    throw new Error('La anulación administrativa requiere un motivo.');
  }

  const { quote, supabase } = await readQuote(quoteId);
  const metadata = {
    ...(quote.metadata ?? {}),
    admin_override_accepted: true,
    admin_override_reason: overrideReason,
    admin_override_accepted_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('job_quotes')
    .update({
      status: 'accepted',
      accepted_at: new Date().toISOString(),
      metadata,
    })
    .eq('id', quoteId);

  if (error) {
    throw new Error(error.message);
  }

  await writeAuditLog({
    action: 'quote_admin_override_accepted',
    quoteId,
    serviceRequestId: quote.service_request_id,
    metadata: { override_reason: overrideReason },
  });

  revalidateQuotePaths(quote.service_request_id);
}
