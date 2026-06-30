'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/supabase-server';

type VerificationResult = 'PASSED' | 'FAILED' | 'NEEDS_MORE_INFO';
type WorkerDecision = 'APPROVED' | 'REJECTED' | 'SUSPENDED';

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeResult(value: string): VerificationResult | null {
  const upper = value.toUpperCase();
  if (upper === 'PASSED' || upper === 'FAILED' || upper === 'NEEDS_MORE_INFO') {
    return upper;
  }
  return null;
}

function decisionCopy(decision: WorkerDecision, reason: string) {
  if (decision === 'APPROVED') {
    return {
      title: 'Verificacion aprobada',
      message: 'Tu perfil de trabajador fue aprobado. Ya puedes recibir oportunidades en Todero.',
    };
  }

  if (decision === 'SUSPENDED') {
    return {
      title: 'Perfil suspendido',
      message: `Tu perfil de trabajador fue suspendido. Motivo: ${reason}`,
    };
  }

  return {
    title: 'Verificacion rechazada',
    message: `Tu solicitud de trabajador fue rechazada. Motivo: ${reason}`,
  };
}

async function getWorkerProfile(supabase: Awaited<ReturnType<typeof requireAdmin>>['supabase'], workerProfileId: string) {
  const { data, error } = await supabase
    .from('worker_profiles')
    .select('id,profile_id,metadata')
    .eq('id', workerProfileId)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'No se encontro el trabajador.');
  }

  return data as { id: string; profile_id: string; metadata: Record<string, unknown> | null };
}

async function writeAuditLog(
  supabase: Awaited<ReturnType<typeof requireAdmin>>['supabase'],
  adminProfileId: string,
  params: {
    action: string;
    workerProfileId: string;
    metadata?: Record<string, unknown>;
  },
) {
  const { error } = await supabase.from('audit_logs').insert({
    actor_profile_id: adminProfileId,
    action: params.action,
    entity: 'worker_profiles',
    entity_id: params.workerProfileId,
    metadata: params.metadata ?? {},
  });

  if (error) {
    throw new Error(error.message);
  }
}

async function notifyWorker(
  supabase: Awaited<ReturnType<typeof requireAdmin>>['supabase'],
  params: {
    profileId: string;
    decision: WorkerDecision;
    reason: string;
    workerProfileId: string;
  },
) {
  const copy = decisionCopy(params.decision, params.reason);
  const { error } = await supabase.from('notifications').insert({
    profile_id: params.profileId,
    type: `worker_verification_${params.decision.toLowerCase()}`,
    title: copy.title,
    message: copy.message,
    metadata: {
      worker_profile_id: params.workerProfileId,
      reason: params.reason || null,
    },
  });

  if (error) {
    throw new Error(error.message);
  }
}

function revalidateWorkerPaths(workerProfileId: string) {
  revalidatePath('/admin/workers');
  revalidatePath(`/admin/workers/${workerProfileId}`);
  revalidatePath(`/admin/workers/${workerProfileId}/verification`);
  revalidatePath('/admin/verificaciones');
  revalidatePath(`/admin/verificaciones/workers/${workerProfileId}`);
}

export async function saveVerificationCheck(formData: FormData) {
  const { supabase, adminProfile } = await requireAdmin();
  const workerProfileId = readString(formData, 'workerProfileId');
  const checkType = readString(formData, 'checkType');
  const result = normalizeResult(readString(formData, 'result'));
  const notes = readString(formData, 'notes');

  if (!workerProfileId || !checkType || !result) {
    throw new Error('Datos de verificacion invalidos.');
  }

  const { error } = await supabase.from('worker_verification_checks').insert({
    worker_profile_id: workerProfileId,
    check_type: checkType,
    result,
    notes: notes || null,
  });

  if (error) {
    throw new Error(error.message);
  }

  await writeAuditLog(supabase, adminProfile.id, {
    action: 'worker_verification_check_recorded',
    workerProfileId,
    metadata: { check_type: checkType, result, notes },
  });

  revalidateWorkerPaths(workerProfileId);
}

export async function saveAdminNotes(formData: FormData) {
  const { supabase, adminProfile } = await requireAdmin();
  const workerProfileId = readString(formData, 'workerProfileId');
  const adminNotes = readString(formData, 'adminNotes');

  if (!workerProfileId) {
    throw new Error('Falta el trabajador.');
  }

  const workerProfile = await getWorkerProfile(supabase, workerProfileId);
  const metadata = {
    ...(workerProfile.metadata ?? {}),
    admin_notes: adminNotes,
  };

  const { error } = await supabase.from('worker_profiles').update({ metadata }).eq('id', workerProfileId);

  if (error) {
    throw new Error(error.message);
  }

  await writeAuditLog(supabase, adminProfile.id, {
    action: 'worker_admin_notes_updated',
    workerProfileId,
    metadata: { admin_notes: adminNotes },
  });

  revalidateWorkerPaths(workerProfileId);
}

export async function decideWorkerApplication(formData: FormData) {
  const { supabase, adminProfile } = await requireAdmin();
  const workerProfileId = readString(formData, 'workerProfileId');
  const decision = readString(formData, 'decision') as WorkerDecision;
  const reason = readString(formData, 'reason');

  if (!workerProfileId || !['APPROVED', 'REJECTED', 'SUSPENDED'].includes(decision)) {
    throw new Error('Decision invalida.');
  }

  if (decision !== 'APPROVED' && !reason) {
    throw new Error('El motivo administrativo es obligatorio para rechazar o suspender.');
  }

  const workerProfile = await getWorkerProfile(supabase, workerProfileId);
  const workerUpdate =
    decision === 'APPROVED'
      ? { verification_status: 'APPROVED', is_verified: true, status: 'ACTIVE' }
      : {
          verification_status: decision,
          is_verified: false,
          status: decision === 'SUSPENDED' ? 'SUSPENDED' : 'ACTIVE',
        };

  const { error: workerError } = await supabase.from('worker_profiles').update(workerUpdate).eq('id', workerProfileId);

  if (workerError) {
    throw new Error(workerError.message);
  }

  const profileStatus = decision === 'SUSPENDED' ? 'SUSPENDED' : 'ACTIVE';
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ status: profileStatus })
    .eq('id', workerProfile.profile_id);

  if (profileError) {
    throw new Error(profileError.message);
  }

  await writeAuditLog(supabase, adminProfile.id, {
    action: `worker_${decision.toLowerCase()}`,
    workerProfileId,
    metadata: { reason: reason || null },
  });

  await notifyWorker(supabase, {
    profileId: workerProfile.profile_id,
    decision,
    reason,
    workerProfileId,
  });

  revalidateWorkerPaths(workerProfileId);
}
