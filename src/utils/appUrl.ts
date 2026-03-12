/**
 * URL pública do app (site). Usada em QR codes de cupom e OS para que o link
 * aponte sempre para produção (ex.: https://ativafix.com), e não para localhost.
 */
export const APP_PUBLIC_URL = import.meta.env.VITE_APP_URL || 'https://ativafix.com';
