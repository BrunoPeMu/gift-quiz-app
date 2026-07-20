export const LEGAL_VERSION = '1.4.0';
export const LEGAL_LAST_UPDATED = '2026-06-18';

export const TITULAR = {
    nombre: 'Natalia Pérez Muñoz',
    nif: '26811336Y',
    direccionFiscal: 'Calle Juan de Ortega 7, Málaga',
    emailContacto: 'casatechie@gmail.com',
    regimenIva: 'No sujeto (sin actividad económica registrada)',
};

export const JURISDICCION = 'España (UE)';
export const ALCANCE = 'España + Latinoamérica';
export const LEY_APLICABLE = 'RGPD (UE 2016/679) + LSSI-CE (Ley 34/2002)';

export const APP_NAME = 'FlashTests';

export const LEGAL_URLS = {
    terms: '/legal/terminos',
    privacy: '/legal/privacidad',
    cookies: '/legal/cookies',
    notice: '/legal/aviso-legal',
};

export const LEGAL_PAGES = LEGAL_URLS;

export function formatLegalValue(value: string, fallback: string): string {
    return value.startsWith('[') ? fallback : value;
}

export const LEGAL_CONTACT_URL = `${LEGAL_URLS.notice}#contacto`;

export function shouldReaccept(accepted: boolean, acceptedVersion?: string): boolean {
    if (!accepted) return true;
    const v = acceptedVersion ?? '';
    if (!v || v !== LEGAL_VERSION) return true;
    return false;
}
