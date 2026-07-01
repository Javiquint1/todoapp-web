import { createPlaceholderProvider } from './placeholder';

const hasMercadoPagoConfig = Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN);

export const mercadoPagoProvider = createPlaceholderProvider('mercadopago', hasMercadoPagoConfig);

// TODO: Implementar checkout, webhooks, consulta de estado y reembolsos con Mercado Pago.
// La credencial debe venir de MERCADOPAGO_ACCESS_TOKEN.
