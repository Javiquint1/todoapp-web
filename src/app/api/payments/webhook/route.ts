import { NextResponse } from 'next/server';
import { getPaymentProvider, normalizePaymentProviderName } from '@/lib/payments/provider';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const providerParam = new URL(request.url).searchParams.get('provider');
  const providerName = normalizePaymentProviderName(providerParam);

  if (!providerName || providerName === 'manual') {
    return NextResponse.json({ error: 'Proveedor de pago invalido.' }, { status: 400 });
  }

  let payload: unknown = null;
  const rawBody = await request.text();
  try {
    payload = rawBody ? JSON.parse(rawBody) : null;
  } catch {
    return NextResponse.json({ error: 'Payload JSON invalido.' }, { status: 400 });
  }

  const provider = getPaymentProvider(providerName);

  if (!provider.enabled) {
    return NextResponse.json(
      {
        received: true,
        processed: false,
        message: 'La integracion de pagos aun no esta activa. El panel sigue usando pagos manuales.',
      },
      { status: 202 },
    );
  }

  try {
    const verification = await provider.verifyWebhook({
      provider: providerName,
      payload,
      rawBody,
      headers: request.headers,
    });

    if (!verification.valid) {
      return NextResponse.json({ error: 'Webhook no verificado.' }, { status: 401 });
    }

    // TODO: Cuando se active la integracion, actualizar payments.payment_status,
    // provider_reference y audit_logs de forma idempotente.
    return NextResponse.json({ received: true, processed: false, verification });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'No se pudo procesar el webhook.',
      },
      { status: 501 },
    );
  }
}
