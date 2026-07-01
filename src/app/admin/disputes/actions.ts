'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/supabase-server';
import { disputeStatuses, disputeTypes, type DisputeStatus, type DisputeType } from './constants';

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

function readStatus(value: string): DisputeStatus | null {
  return disputeStatuses.includes(value as DisputeStatus) ? (value as DisputeStatus) : null;
}

function readType(value: string): DisputeType | null {
  return disputeTypes.includes(value as DisputeType) ? (value as DisputeType) : null;
}

function revalidateDisputePaths(disputeId: string) {
  revalidatePath('/admin/disputes');
  revalidatePath(`/admin/disputes/${disputeId}`);
}

async function readDispute(disputeId: string) {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from('disputes')
    .select('id,job_id,status,type,internal_notes,resolution')
    .eq('id', disputeId)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'No se encontro la disputa.');
  }

  return {
    dispute: data as {
      id: string;
      job_id: string;
      status: string;
      type: string | null;
      internal_notes: string | null;
      resolution: string | null;
    },
    supabase,
  };
}

async function writeAuditLog(params: {
  action: string;
  disputeId: string;
  metadata?: Record<string, unknown>;
}) {
  const { supabase, adminProfile } = await requireAdmin();
  const { error } = await supabase.from('audit_logs').insert({
    actor_profile_id: adminProfile.id,
    action: params.action,
    entity: 'disputes',
    entity_id: params.disputeId,
    metadata: params.metadata ?? {},
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function saveDisputeNotes(formData: FormData) {
  const disputeId = readString(formData, 'disputeId');
  const internalNotes = readString(formData, 'internalNotes');
  const disputeType = readType(readString(formData, 'type')) ?? 'other';

  if (!disputeId) {
    throw new Error('Falta la disputa.');
  }

  const { dispute, supabase } = await readDispute(disputeId);
  const { error } = await supabase
    .from('disputes')
    .update({
      internal_notes: internalNotes || null,
      type: disputeType,
    })
    .eq('id', disputeId);

  if (error) {
    throw new Error(error.message);
  }

  await writeAuditLog({
    action: 'dispute_admin_notes_updated',
    disputeId,
    metadata: {
      job_id: dispute.job_id,
      type: disputeType,
      internal_notes: internalNotes || null,
    },
  });

  revalidateDisputePaths(disputeId);
}

export async function updateDisputeStatus(formData: FormData) {
  const disputeId = readString(formData, 'disputeId');
  const status = readStatus(readString(formData, 'status'));
  const resolution = readString(formData, 'resolution');
  const note = readString(formData, 'statusNote');

  if (!disputeId || !status) {
    throw new Error('Estado de disputa invalido.');
  }

  const { dispute, supabase } = await readDispute(disputeId);
  const update: Record<string, unknown> = { status };
  if (resolution || status === 'resolved' || status === 'closed') {
    update.resolution = resolution || dispute.resolution;
  }

  const { error } = await supabase.from('disputes').update(update).eq('id', disputeId);

  if (error) {
    throw new Error(error.message);
  }

  await writeAuditLog({
    action: 'dispute_status_updated_by_admin',
    disputeId,
    metadata: {
      job_id: dispute.job_id,
      previous_status: dispute.status,
      status,
      resolution: update.resolution ?? null,
      note: note || null,
    },
  });

  revalidateDisputePaths(disputeId);
}

export async function requestDisputeInfo(formData: FormData) {
  const disputeId = readString(formData, 'disputeId');
  const target = readString(formData, 'target');
  const note = readString(formData, 'requestNote');

  if (!disputeId || !['customer', 'worker'].includes(target)) {
    throw new Error('Selecciona a quien se solicita informacion.');
  }

  const status = target === 'customer' ? 'waiting_for_customer' : 'waiting_for_worker';
  const { dispute, supabase } = await readDispute(disputeId);
  const { error } = await supabase.from('disputes').update({ status }).eq('id', disputeId);

  if (error) {
    throw new Error(error.message);
  }

  await writeAuditLog({
    action: 'dispute_more_information_requested',
    disputeId,
    metadata: {
      job_id: dispute.job_id,
      previous_status: dispute.status,
      status,
      target,
      note: note || null,
    },
  });

  revalidateDisputePaths(disputeId);
}

export async function closeDispute(formData: FormData) {
  const disputeId = readString(formData, 'disputeId');
  const resolution = readString(formData, 'resolution');

  if (!disputeId || !resolution) {
    throw new Error('Cerrar una disputa requiere una resolucion.');
  }

  const { dispute, supabase } = await readDispute(disputeId);
  const { error } = await supabase.from('disputes').update({ status: 'closed', resolution }).eq('id', disputeId);

  if (error) {
    throw new Error(error.message);
  }

  await writeAuditLog({
    action: 'dispute_closed_by_admin',
    disputeId,
    metadata: {
      job_id: dispute.job_id,
      previous_status: dispute.status,
      status: 'closed',
      resolution,
    },
  });

  revalidateDisputePaths(disputeId);
}
