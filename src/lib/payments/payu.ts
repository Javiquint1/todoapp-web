import { createPlaceholderProvider } from './placeholder';

const hasPayuConfig = Boolean(process.env.PAYU_API_KEY && process.env.PAYU_API_LOGIN && process.env.PAYU_MERCHANT_ID);

export const payuProvider = createPlaceholderProvider('payu', hasPayuConfig);

// TODO: Implementar checkout, webhooks, consulta de estado y reembolsos con PayU.
// Las credenciales deben venir de PAYU_API_KEY, PAYU_API_LOGIN y PAYU_MERCHANT_ID.
