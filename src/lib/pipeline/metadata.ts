/**
 * Pipeline Etapa 0: Extracción de metadata
 * 
 * No usa IA. Extrae información de los headers HTTP y genera hash SHA-256
 * para trazabilidad / compliance CMF.
 * 
 * Datos extraídos:
 * - SHA-256 del archivo (inmutabilidad)
 * - Tamaño del archivo
 * - Tipo MIME
 * - Coordenadas GPS del EXIF (si disponibles desde la URL/metadata)
 * - Fecha de captura
 */

export interface MetadataResult {
    sha256: string;
    tamanoBytes: number;
    tipoMime: string;
    gpsLat?: number;
    gpsLng?: number;
    fechaCaptura?: string;
    // Validaciones
    esImagenValida: boolean;
    errores: string[];
}

const TIPOS_MIME_VALIDOS = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
];

const TAMANO_MAXIMO_BYTES = 20 * 1024 * 1024; // 20MB
const TAMANO_MINIMO_BYTES = 10 * 1024; // 10KB (evitar imágenes corruptas)

/**
 * Calcula SHA-256 de un ArrayBuffer.
 * Usa Web Crypto API (disponible en Node 18+ y Edge).
 */
export async function calcularSHA256(buffer: ArrayBuffer): Promise<string> {
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Extrae metadata de una imagen a partir de su URL pública.
 * Descarga headers + primeros bytes para calcular hash.
 */
export async function extraerMetadata(
    imagenUrl: string,
    options?: {
        gpsLat?: number;
        gpsLng?: number;
        fechaCaptura?: string;
        tamanoBytes?: number;
        tipoMime?: string;
    }
): Promise<MetadataResult> {
    const errores: string[] = [];

    try {
        // Hacer HEAD request para obtener metadata sin descargar todo
        const headResponse = await fetch(imagenUrl, { method: 'HEAD' });

        if (!headResponse.ok) {
            return {
                sha256: '',
                tamanoBytes: 0,
                tipoMime: '',
                esImagenValida: false,
                errores: [`No se pudo acceder a la imagen: HTTP ${headResponse.status}`],
            };
        }

        const contentType = headResponse.headers.get('content-type') || options?.tipoMime || 'image/jpeg';
        const contentLength = parseInt(headResponse.headers.get('content-length') || '0') || options?.tamanoBytes || 0;

        // Validar tipo MIME
        if (!TIPOS_MIME_VALIDOS.some(tipo => contentType.startsWith(tipo))) {
            errores.push(`Tipo de archivo no soportado: ${contentType}`);
        }

        // Validar tamaño
        if (contentLength > TAMANO_MAXIMO_BYTES) {
            errores.push(`Archivo demasiado grande: ${(contentLength / 1024 / 1024).toFixed(1)}MB (máx: 20MB)`);
        }
        if (contentLength > 0 && contentLength < TAMANO_MINIMO_BYTES) {
            errores.push(`Archivo demasiado pequeño: ${(contentLength / 1024).toFixed(1)}KB (mín: 10KB)`);
        }

        // Descargar imagen para calcular hash
        const imageResponse = await fetch(imagenUrl);
        const imageBuffer = await imageResponse.arrayBuffer();
        const sha256 = await calcularSHA256(imageBuffer);

        return {
            sha256,
            tamanoBytes: contentLength || imageBuffer.byteLength,
            tipoMime: contentType,
            gpsLat: options?.gpsLat,
            gpsLng: options?.gpsLng,
            fechaCaptura: options?.fechaCaptura || new Date().toISOString(),
            esImagenValida: errores.length === 0,
            errores,
        };
    } catch (error) {
        return {
            sha256: '',
            tamanoBytes: 0,
            tipoMime: '',
            esImagenValida: false,
            errores: [`Error extrayendo metadata: ${error instanceof Error ? error.message : String(error)}`],
        };
    }
}

/**
 * Calcula la distancia en km entre dos puntos GPS (fórmula Haversine).
 * Útil para validar que las fotos fueron tomadas cerca del lugar declarado.
 */
export function calcularDistanciaKm(
    lat1: number, lng1: number,
    lat2: number, lng2: number
): number {
    const R = 6371; // Radio de la Tierra en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * Valida que las fotos hayan sido tomadas cerca del lugar declarado.
 */
export function validarProximidadGPS(
    fotoLat: number, fotoLng: number,
    declaradoLat: number, declaradoLng: number,
    umbralKm: number = 5
): { dentroDeRango: boolean; distanciaKm: number } {
    const distanciaKm = calcularDistanciaKm(fotoLat, fotoLng, declaradoLat, declaradoLng);
    return {
        dentroDeRango: distanciaKm <= umbralKm,
        distanciaKm: Math.round(distanciaKm * 10) / 10,
    };
}
