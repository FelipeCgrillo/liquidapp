/**
 * Pipeline Etapa 0: Extracción de metadata
 * 
 * Extrae información de los headers HTTP, genera hash SHA-256 (Compliance CMF),
 * y analiza metadata EXIF binaria de la imagen para trazabilidad y anti-fraude.
 * 
 * Datos extraídos:
 * - SHA-256 del archivo (inmutabilidad)
 * - Tamaño del archivo y MIME
 * - Metadata del hardware (Cámara, Lente, Editor)
 * - Coordenadas GPS y Hora de Disparo real vs declarada
 */

import exifr from 'exifr';

export interface MetadataResult {
    sha256: string;
    tamanoBytes: number;
    tipoMime: string;
    gpsLat?: number;
    gpsLng?: number;
    fechaCaptura?: string;
    // Novedades EXIF Extraídas:
    exifData?: {
        Make?: string;
        Model?: string;
        Software?: string;
        DateTimeOriginal?: string;
        latitude?: number;
        longitude?: number;
    };
    alertas_fraude_exif: string[]; // Banderas rojas EXIF levantadas
    // Validaciones Base
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
const TAMANO_MINIMO_BYTES = 10 * 1024; // 10KB

export async function calcularSHA256(buffer: ArrayBuffer): Promise<string> {
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function extraerMetadata(
    imagenUrl: string,
    options?: {
        gpsLat?: number;
        gpsLng?: number;
        fechaCaptura?: string; // Fecha declarada del siniestro
        tamanoBytes?: number;
        tipoMime?: string;
    }
): Promise<MetadataResult> {
    const errores: string[] = [];
    const alertas_fraude_exif: string[] = [];

    try {
        const headResponse = await fetch(imagenUrl, { method: 'HEAD' });

        if (!headResponse.ok) {
            return {
                sha256: '',
                tamanoBytes: 0,
                tipoMime: '',
                esImagenValida: false,
                errores: [`No se pudo acceder a la imagen: HTTP ${headResponse.status}`],
                alertas_fraude_exif,
            };
        }

        const contentType = headResponse.headers.get('content-type') || options?.tipoMime || 'image/jpeg';
        const contentLength = parseInt(headResponse.headers.get('content-length') || '0') || options?.tamanoBytes || 0;

        if (!TIPOS_MIME_VALIDOS.some(tipo => contentType.startsWith(tipo))) {
            errores.push(`Tipo de archivo no soportado: ${contentType}`);
        }

        if (contentLength > TAMANO_MAXIMO_BYTES) {
            errores.push(`Archivo grande: ${(contentLength / 1024 / 1024).toFixed(1)}MB`);
        }
        if (contentLength > 0 && contentLength < TAMANO_MINIMO_BYTES) {
            errores.push(`Archivo pequeño: ${(contentLength / 1024).toFixed(1)}KB`);
        }

        const imageResponse = await fetch(imagenUrl);
        const imageBuffer = await imageResponse.arrayBuffer();
        const sha256 = await calcularSHA256(imageBuffer);

        // EXTRAER EXIF MEDIANTE BUFFER RAW
        let exifParsed: any = null;
        let exifData: MetadataResult['exifData'] = undefined;

        try {
            exifParsed = await exifr.parse(imageBuffer, { tiff: true, exif: true, gps: true });
        } catch (e) {
            // Falla silenciosa si no existe metadata
        }

        if (exifParsed) {
            exifData = {
                Make: exifParsed.Make,
                Model: exifParsed.Model,
                Software: exifParsed.Software,
                DateTimeOriginal: exifParsed.DateTimeOriginal ? new Date(exifParsed.DateTimeOriginal).toISOString() : undefined,
                latitude: exifParsed.latitude,
                longitude: exifParsed.longitude,
            };

            // REGLAS ANTIFRAUDE EXIF
            
            // 1. Detectores de manipulación fotográfica
            const editingSoftwares = ['adobe', 'photoshop', 'lightroom', 'gimp', 'pixelmator', 'coreldraw', 'paint'];
            const sfw = (exifParsed.Software || '').toLowerCase();
            if (editingSoftwares.some(es => sfw.includes(es))) {
                alertas_fraude_exif.push(`Software de edición detectado en metadata original: ${exifParsed.Software}`);
            }

            // 2. Coherencia Temporal (Disparo vs Declaración Siniestro > 24H es crítico)
            if (exifData.DateTimeOriginal && options?.fechaCaptura) {
                const dateExif = new Date(exifData.DateTimeOriginal);
                const dateDecl = new Date(options.fechaCaptura);
                // Dif positiva (tomada antes) o negativa (tomada despues? absurdo)
                const diffHours = (dateDecl.getTime() - dateExif.getTime()) / (1000 * 60 * 60);
                
                if (diffHours > 24 || diffHours < -24) {
                    alertas_fraude_exif.push(`La captura del archivo supera las 24 horas críticas de diferencia con el siniestro (Dif estim.: ${Math.round(diffHours)}h)`);
                }
            } else if (exifData.DateTimeOriginal) {
                 // Alternativa si no declara hora: comparar contra hora actual de subida del server local (-3 GMT)
                 const diffUpload = (Date.now() - new Date(exifData.DateTimeOriginal).getTime()) / (1000 * 60 * 60);
                 if (diffUpload > 72) {
                     alertas_fraude_exif.push(`La foto tiene más de 3 días de antigüedad (Archivada en galería).`);
                 }
            }

            // 3. Proximidad GPS Real (Hardware GPS Foto vs Declaración GPS Teléfono/Wizard)
            if (exifData.latitude && exifData.longitude && options?.gpsLat && options?.gpsLng) {
                const proximidad = validarProximidadGPS(
                    exifData.latitude, exifData.longitude, 
                    options.gpsLat, options.gpsLng, 
                    5 // km tolerancia conservadora
                );
                if (!proximidad.dentroDeRango) {
                    alertas_fraude_exif.push(`Distancia sospechosa: El GPS original del lente ubica el siniestro a ${proximidad.distanciaKm}km de la dirección declarada.`);
                }
            }

        } else {
            // El EXIF fue purgado por WhatsApp u otra red social, beneficio de la duda
            alertas_fraude_exif.push('Información EXIF no encontrada o purgada (Potencial compresión vía chat). Desventaja de peritaje automático.');
        }

        return {
            sha256,
            tamanoBytes: contentLength || imageBuffer.byteLength,
            tipoMime: contentType,
            gpsLat: options?.gpsLat,
            gpsLng: options?.gpsLng,
            fechaCaptura: options?.fechaCaptura || new Date().toISOString(),
            exifData,
            alertas_fraude_exif,
            esImagenValida: errores.length === 0,
            errores,
        };
    } catch (error) {
        return {
            sha256: '',
            tamanoBytes: 0,
            tipoMime: '',
            esImagenValida: false,
            alertas_fraude_exif: ['Falla sistémica en evaluación de seguridad binaria.'],
            errores: [`Error extrayendo metadata: ${error instanceof Error ? error.message : String(error)}`],
        };
    }
}

export function calcularDistanciaKm(
    lat1: number, lng1: number,
    lat2: number, lng2: number
): number {
    const R = 6371; 
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

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
