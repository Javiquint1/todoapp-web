import { createPlaceholderProvider } from './placeholder';

const hasWompiConfig = Boolean(process.env.WOMPI_PUBLIC_KEY && process.env.WOMPI_PRIVATE_KEY && process.env.WOMPI_EVENTS_SECRET);

export const wompiProvider = createPlaceholderProvider('wompi', hasWompiConfig);

// TODO: Implementar checkout, verificacion de eventos, consulta de estado y reembolsos con Wompi.
// Las credenciales deben venir de WOMPI_PUBLIC_KEY, WOMPI_PRIVATE_KEY y WOMPI_EVENTS_SECRET.
