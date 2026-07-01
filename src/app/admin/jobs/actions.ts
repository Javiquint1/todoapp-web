'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/supabase-server';
import { jobStatuses, type JobStatus } from './constants';

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

function readStatus(value: string): JobStatus | null {
  return jobStatuses.includes(value as JobStatus) ? (value as JobStatus) : null;
}

function completionTimestamp(status: JobStatus) {
  return status === 'approved_by_customer' || status === 'closed' ? new Date().toISOString() : undefined;
}

function revalidateJobPaths(jobId: string) {
  revalidatePath('/admin/jobs');
  revalidatePath(`/admin/jobs/${jobId}`);
}

async function readJob(jobId: string) {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from('jobs')
    .select('id,service_request_id,quote_id,customer_profile_id,worker_profile_id,status,metadata')
    .eq('id', jobId)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'No se encontro el trabajo.');
  }

  return {
    job: data as {
      id: string;
      service_request_id: string;
      quote_id: string | null;
      customer_profile_id: string;
      worker_profile_id: string;
      status: string;
      metadata: Record<string, unknown> | null;
    },
    supabase,
  };
}

async function writeAuditLog(params: {
  action: string;
  jobId: string;
  metadata?: Record<string, unknown>;
}) {
  const { supabase, adminProfile } = await requireAdmin();
  const { error } = await supabase.from('audit_logs').insert({
    actor_profile_id: adminProfile.id,
    action: params.action,
    entity: 'jobs',
    entity_id: params.jobId,
    metadata: params.metadata ?? {},
  });

  if (error) {
    throw new Error(error.message);
  }
}

async function updateJobWithReason(params: {
  action: string;
  jobId: string;
  nextStatus: JobStatus;
  reason: string;
}) {
  if (!params.jobId || !params.reason) {
    throw new Error('El motivo administrativo es obligatorio.');
  }

  const { job, supabase } = await readJob(params.jobId);
  const now = new Date().toISOString();
  const metadata = {
    ...(job.metadata ?? {}),
    last_admin_override_at: now,
    last_admin_override_reason: params.reason,
    last_admin_override_status: params.nextStatus,
    previous_status: job.status,
  };

  const update: Record<string, unknown> = {
    status: params.nextStatus,
    metadata,
  };
  const completedAt = completionTimestamp(params.nextStatus);
  if (completedAt) {
    update.completed_at = completedAt;
  }

  const { error } = await supabase.from('jobs').update(update).eq('id', params.jobId);

  if (error) {
    throw new Error(error.message);
  }

  await writeAuditLog({
    action: params.action,
    jobId: params.jobId,
    metadata: {
      previous_status: job.status,
      status: params.nextStatus,
      reason: params.reason,
      service_request_id: job.service_request_id,
      quote_id: job.quote_id,
      worker_profile_id: job.worker_profile_id,
      customer_profile_id: job.customer_profile_id,
    },
  });

  revalidateJobPaths(params.jobId);
}

export async function overrideJobStatus(formData: FormData) {
  const jobId = readString(formData, 'jobId');
  const status = readStatus(readString(formData, 'status'));
  const reason = readString(formData, 'reason');

  if (!jobId || !status) {
    throw new Error('Estado de trabajo invalido.');
  }

  await updateJobWithReason({
    action: 'job_status_admin_override',
    jobId,
    nextStatus: status,
    reason,
  });
}

export async function cancelJob(formData: FormData) {
  const jobId = readString(formData, 'jobId');
  const reason = readString(formData, 'reason');

  await updateJobWithReason({
    action: 'job_cancelled_by_admin',
    jobId,
    nextStatus: 'cancelled',
    reason,
  });
}

export async function closeJob(formData: FormData) {
  const jobId = readString(formData, 'jobId');
  const reason = readString(formData, 'reason');

  await updateJobWithReason({
    action: 'job_closed_by_admin',
    jobId,
    nextStatus: 'closed',
    reason,
  });
}

export async function openJobDispute(formData: FormData) {
  const { supabase, adminProfile } = await requireAdmin();
  const jobId = readString(formData, 'jobId');
  const reason = readString(formData, 'reason');

  if (!jobId || !reason) {
    throw new Error('Abrir una disputa requiere un motivo.');
  }

  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .select('id,worker_profile_id,customer_profile_id,status,metadata')
    .eq('id', jobId)
    .single();

  if (jobError || !job) {
    throw new Error(jobError?.message ?? 'No se encontro el trabajo.');
  }

  const { data: worker, error: workerError } = await supabase
    .from('worker_profiles')
    .select('id,profile_id')
    .eq('id', job.worker_profile_id as string)
    .single();

  if (workerError || !worker) {
    throw new Error(workerError?.message ?? 'No se encontro el trabajador asignado.');
  }

  const { error: disputeError } = await supabase.from('disputes').insert({
    job_id: jobId,
    filed_by_profile_id: adminProfile.id,
    filed_against_profile_id: worker.profile_id,
    reason,
    status: 'open',
    type: 'other',
  });

  if (disputeError) {
    throw new Error(disputeError.message);
  }

  const now = new Date().toISOString();
  const { error: updateError } = await supabase
    .from('jobs')
    .update({
      status: 'disputed',
      metadata: {
        ...((job.metadata as Record<string, unknown> | null) ?? {}),
        last_admin_override_at: now,
        last_admin_override_reason: reason,
        last_admin_override_status: 'disputed',
        previous_status: job.status,
      },
    })
    .eq('id', jobId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  await writeAuditLog({
    action: 'job_dispute_opened_by_admin',
    jobId,
    metadata: {
      previous_status: job.status as string,
      status: 'disputed',
      reason,
      worker_profile_id: job.worker_profile_id as string,
      customer_profile_id: job.customer_profile_id as string,
    },
  });

  revalidateJobPaths(jobId);
}
