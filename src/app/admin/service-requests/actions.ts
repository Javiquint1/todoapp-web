'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/supabase-server';

const requestStatuses = [
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

type RequestStatus = (typeof requestStatuses)[number];

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

function readRequestStatus(value: string): RequestStatus | null {
  return requestStatuses.includes(value as RequestStatus) ? (value as RequestStatus) : null;
}

async function writeAuditLog(params: {
  action: string;
  serviceRequestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { supabase, adminProfile } = await requireAdmin();
  const { error } = await supabase.from('audit_logs').insert({
    actor_profile_id: adminProfile.id,
    action: params.action,
    entity: 'service_requests',
    entity_id: params.serviceRequestId,
    metadata: params.metadata ?? {},
  });

  if (error) {
    throw new Error(error.message);
  }
}

async function notifyWorker(params: {
  profileId: string;
  serviceRequestId: string;
  assignmentNote: string;
  city: string;
}) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from('notifications').insert({
    profile_id: params.profileId,
    type: 'service_request_assigned',
    title: 'Nueva solicitud asignada',
    message: `Tienes una solicitud asignada en ${params.city}.`,
    metadata: {
      service_request_id: params.serviceRequestId,
      assignment_note: params.assignmentNote || null,
    },
  });

  if (error) {
    throw new Error(error.message);
  }
}

async function readRequestMetadata(
  supabase: Awaited<ReturnType<typeof requireAdmin>>['supabase'],
  serviceRequestId: string,
) {
  const { data, error } = await supabase
    .from('service_requests')
    .select('metadata')
    .eq('id', serviceRequestId)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return ((data?.metadata as Record<string, unknown> | null) ?? {}) as Record<string, unknown>;
}

function revalidateRequestPaths(serviceRequestId: string) {
  revalidatePath('/admin/service-requests');
  revalidatePath(`/admin/service-requests/${serviceRequestId}`);
  revalidatePath('/admin/solicitudes');
  revalidatePath(`/admin/solicitudes/${serviceRequestId}`);
}

export async function saveServiceRequestNotes(formData: FormData) {
  const { supabase } = await requireAdmin();
  const serviceRequestId = readString(formData, 'serviceRequestId');
  const internalNotes = readString(formData, 'internalNotes');
  const urgency = readString(formData, 'urgency');

  if (!serviceRequestId) {
    throw new Error('Falta la solicitud.');
  }

  const metadata = {
    ...(await readRequestMetadata(supabase, serviceRequestId)),
    internal_notes: internalNotes,
    urgency: urgency || null,
  };

  const { error } = await supabase.from('service_requests').update({ metadata }).eq('id', serviceRequestId);

  if (error) {
    throw new Error(error.message);
  }

  await writeAuditLog({
    action: 'service_request_admin_notes_updated',
    serviceRequestId,
    metadata: { internal_notes: internalNotes, urgency: urgency || null },
  });

  revalidateRequestPaths(serviceRequestId);
}

export async function updateServiceRequestStatus(formData: FormData) {
  const { supabase } = await requireAdmin();
  const serviceRequestId = readString(formData, 'serviceRequestId');
  const status = readRequestStatus(readString(formData, 'status'));

  if (!serviceRequestId || !status) {
    throw new Error('Estado de solicitud invalido.');
  }

  const { error } = await supabase.from('service_requests').update({ status }).eq('id', serviceRequestId);

  if (error) {
    throw new Error(error.message);
  }

  await writeAuditLog({
    action: 'service_request_status_updated',
    serviceRequestId,
    metadata: { status },
  });

  revalidateRequestPaths(serviceRequestId);
}

export async function assignWorkersToServiceRequest(formData: FormData) {
  const { supabase, adminProfile } = await requireAdmin();
  const serviceRequestId = readString(formData, 'serviceRequestId');
  const assignmentNote = readString(formData, 'assignmentNote');
  const workerProfileIds = formData
    .getAll('workerProfileIds')
    .filter((value): value is string => typeof value === 'string' && value.length > 0);

  if (!serviceRequestId) {
    throw new Error('Falta la solicitud.');
  }

  const { data: request, error: requestReadError } = await supabase
    .from('service_requests')
    .select('id,city')
    .eq('id', serviceRequestId)
    .single();

  if (requestReadError || !request) {
    throw new Error(requestReadError?.message ?? 'No se encontro la solicitud.');
  }

  const { data: currentAssignments, error: readError } = await supabase
    .from('service_request_assignments')
    .select('worker_profile_id')
    .eq('service_request_id', serviceRequestId);

  if (readError) {
    throw new Error(readError.message);
  }

  const selected = new Set(workerProfileIds);
  const current = ((currentAssignments ?? []) as { worker_profile_id: string }[]).map(
    (assignment) => assignment.worker_profile_id,
  );
  const currentSet = new Set(current);
  const toRemove = current.filter((workerProfileId) => !selected.has(workerProfileId));
  const newlyAssigned = workerProfileIds.filter((workerProfileId) => !currentSet.has(workerProfileId));

  if (toRemove.length) {
    const { error: removeError } = await supabase
      .from('service_request_assignments')
      .delete()
      .eq('service_request_id', serviceRequestId)
      .in('worker_profile_id', toRemove);

    if (removeError) {
      throw new Error(removeError.message);
    }
  }

  if (workerProfileIds.length) {
    const assignments = workerProfileIds.map((workerProfileId) => ({
      service_request_id: serviceRequestId,
      worker_profile_id: workerProfileId,
      assigned_by_profile_id: adminProfile.id,
      status: 'ASSIGNED',
      assignment_note: assignmentNote || null,
    }));

    const { error: assignmentError } = await supabase
      .from('service_request_assignments')
      .upsert(assignments, { onConflict: 'service_request_id,worker_profile_id' });

    if (assignmentError) {
      throw new Error(assignmentError.message);
    }
  }

  if (newlyAssigned.length) {
    const { data: assignedWorkers, error: workersError } = await supabase
      .from('worker_profiles')
      .select('id,profile_id')
      .in('id', newlyAssigned);

    if (workersError) {
      throw new Error(workersError.message);
    }

    for (const worker of (assignedWorkers ?? []) as { id: string; profile_id: string }[]) {
      await notifyWorker({
        profileId: worker.profile_id,
        serviceRequestId,
        assignmentNote,
        city: request.city as string,
      });
    }
  }

  const { error: requestError } = await supabase
    .from('service_requests')
    .update({
      status: workerProfileIds.length ? 'assigned' : 'reviewing',
      assigned_worker_profile_id: workerProfileIds[0] ?? null,
    })
    .eq('id', serviceRequestId);

  if (requestError) {
    throw new Error(requestError.message);
  }

  await writeAuditLog({
    action: 'service_request_workers_assigned',
    serviceRequestId,
    metadata: {
      worker_profile_ids: workerProfileIds,
      newly_assigned_worker_profile_ids: newlyAssigned,
      removed_worker_profile_ids: toRemove,
      assignment_note: assignmentNote || null,
    },
  });

  revalidateRequestPaths(serviceRequestId);
  redirect(`/admin/service-requests/${serviceRequestId}`);
}
