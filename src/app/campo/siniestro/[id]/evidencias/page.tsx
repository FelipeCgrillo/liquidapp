'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
    Camera, Upload, Loader2, CheckCircle, AlertTriangle,
    ChevronLeft, Send, Shield, Zap, DollarSign, X, RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { Evidencia, AnalisisIA, SeveridadDano, NivelFraude, EvidenciaConAnalisis } from '@/types';
import { useEvidenceUpload } from '@/hooks/useEvidenceUpload';

const COLORES_SEVERIDAD: Record<SeveridadDano, string> = {
    leve: 'text-green-400 bg-green-900/30 border-green-700/50',
    moderado: 'text-yellow-400 bg-yellow-900/30 border-yellow-700/50',
    grave: 'text-orange-400 bg-orange-900/30 border-orange-700/50',
    perdida_total: 'text-red-400 bg-red-900/30 border-red-700/50',
};

const COLORES_FRAUDE: Record<NivelFraude, string> = {
    bajo: 'text-green-400',
    medio: 'text-yellow-400',
    alto: 'text-orange-400',
    critico: 'text-red-400',
};

const LABELS_SEVERIDAD: Record<SeveridadDano, string> = {
    leve: 'Leve',
    moderado: 'Moderado',
    grave: 'Grave',
    perdida_total: 'Pérdida Total',
};

export default function EvidenciasPage() {
    const router = useRouter();
    const params = useParams();
    const siniestroId = params.id as string;
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [evidencias, setEvidencias] = useState<EvidenciaConAnalisis[]>([]);
    const [enviando, setEnviando] = useState(false);
    const [generandoInforme, setGenerandoInforme] = useState(false);
    const [siniestro, setSiniestro] = useState<{ numero_siniestro: string; patente: string } | null>(null);

    useEffect(() => {
        const cargarSiniestro = async () => {
            const supabase = createClient();
            const { data } = await supabase
                .from('siniestros')
                .select('numero_siniestro, patente')
                .eq('id', siniestroId)
                .single();
            if (data) setSiniestro(data);
        };
        cargarSiniestro();
    }, [siniestroId]);

    const obtenerGeolocalizacion = (): Promise<{ lat: number; lng: number; precision: number } | null> => {
        return new Promise((resolve) => {
            if (!navigator.geolocation) { resolve(null); return; }
            navigator.geolocation.getCurrentPosition(
                (pos) => resolve({
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                    precision: pos.coords.accuracy,
                }),
                () => resolve(null),
                { enableHighAccuracy: true, timeout: 5000 }
            );
        });
    };

    const { uploadAndAnalyze } = useEvidenceUpload();

    const procesarImagen = useCallback(async (file: File) => {
        const previewUrl = URL.createObjectURL(file);
        const tempId = `temp-${Date.now()}`;

        // Agregar evidencia con estado "analizando"
        const evidenciaTemp: EvidenciaConAnalisis = {
            id: tempId,
            siniestro_id: siniestroId,
            storage_path: '',
            orden: evidencias.length,
            analizado: false,
            capturado_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            analizando: true,
            previewUrl,
        };
        setEvidencias((prev) => [...prev, evidenciaTemp]);

        try {
            const geo = await obtenerGeolocalizacion();

            // Usar hook centralizado
            const evidenciaAnalizada = await uploadAndAnalyze(file, {
                siniestroId,
                location: geo ? { lat: geo.lat, lng: geo.lng, precision: geo.precision } : undefined,
                order: evidencias.length
            });

            // Actualizar evidencia con análisis
            setEvidencias((prev) =>
                prev.map((ev) =>
                    ev.id === tempId
                        ? {
                            ...evidenciaAnalizada,
                            previewUrl, // Mantener previewUrl local
                        }
                        : ev
                )
            );

            toast.success('Evidencia analizada correctamente');
        } catch (error) {
            console.error('Error procesando imagen:', error);
            setEvidencias((prev) => prev.filter((ev) => ev.id !== tempId));
            toast.error('Error al procesar la imagen. Intenta nuevamente.');
        }
    }, [evidencias.length, siniestroId, uploadAndAnalyze]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        files.forEach(procesarImagen);
        e.target.value = '';
    };

    const eliminarEvidencia = (id: string) => {
        setEvidencias((prev) => prev.filter((ev) => ev.id !== id));
    };

    const enviarARevision = async () => {
        const evidenciasAnalizadas = evidencias.filter((ev) => ev.analizado && !ev.analizando);
        if (evidenciasAnalizadas.length === 0) {
            toast.error('Debes capturar al menos una evidencia antes de enviar');
            return;
        }

        setGenerandoInforme(true);
        try {
            // Generar pre-informe automático
            const resp = await fetch('/api/generar-preinforme', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ siniestro_id: siniestroId }),
            });

            if (!resp.ok) throw new Error('Error generando pre-informe');

            // Cambiar estado del siniestro a "en_revision"
            const supabase = createClient();
            await supabase
                .from('siniestros')
                .update({
                    estado: 'en_revision',
                    enviado_revision_at: new Date().toISOString(),
                })
                .eq('id', siniestroId);

            toast.success('¡Siniestro enviado a revisión! El pre-informe fue generado automáticamente.');
            router.push('/campo');
        } catch (error) {
            console.error(error);
            toast.error('Error al enviar a revisión');
        } finally {
            setGenerandoInforme(false);
            setEnviando(false);
        }
    };

    const evidenciasListas = evidencias.filter((ev) => ev.analizado && !ev.analizando);
    const hayAnalizando = evidencias.some((ev) => ev.analizando);

    return (
        <div className="min-h-screen bg-dark-950 pb-32">
            {/* Header */}
            <div className="glass-dark sticky top-0 z-10 safe-top">
                <div className="flex items-center justify-between px-4 py-4">
                    <div className="flex items-center gap-3">
                        <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-dark-700">
                            <ChevronLeft className="w-5 h-5 text-dark-300" />
                        </button>
                        <div>
                            <h1 className="text-base font-bold text-white">Captura de Evidencias</h1>
                            <p className="text-xs text-dark-400">
                                {siniestro?.numero_siniestro} · {siniestro?.patente}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-dark-400">{evidenciasListas.length} foto{evidenciasListas.length !== 1 ? 's' : ''}</span>
                        <div className={`w-2 h-2 rounded-full ${hayAnalizando ? 'bg-yellow-400 animate-pulse' : 'bg-green-400'}`} />
                    </div>
                </div>
            </div>

            <div className="px-4 pt-4 space-y-4">
                {/* Botón de captura */}
                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={() => {
                            if (fileInputRef.current) {
                                fileInputRef.current.setAttribute('capture', 'environment');
                                fileInputRef.current.click();
                            }
                        }}
                        className="btn-primary py-5 flex-col gap-2 rounded-2xl"
                    >
                        <Camera className="w-7 h-7" />
                        <span className="text-sm">Tomar Foto</span>
                    </button>
                    <button
                        onClick={() => {
                            if (fileInputRef.current) {
                                fileInputRef.current.removeAttribute('capture');
                                fileInputRef.current.click();
                            }
                        }}
                        className="btn-secondary py-5 flex-col gap-2 rounded-2xl"
                    >
                        <Upload className="w-7 h-7" />
                        <span className="text-sm">Subir Imagen</span>
                    </button>
                </div>

                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                />

                {/* Instrucciones */}
                {evidencias.length === 0 && (
                    <div className="card text-center py-10">
                        <Camera className="w-12 h-12 text-dark-600 mx-auto mb-3" />
                        <p className="text-dark-400 font-medium">Sin evidencias aún</p>
                        <p className="text-dark-600 text-sm mt-1">
                            Captura fotos del vehículo dañado.<br />
                            La IA analizará cada imagen automáticamente.
                        </p>
                    </div>
                )}

                {/* Lista de evidencias */}
                {evidencias.map((ev) => (
                    <div key={ev.id} className="card overflow-hidden">
                        <div className="flex gap-4">
                            {/* Miniatura */}
                            <div className="relative w-24 h-24 flex-shrink-0 rounded-xl overflow-hidden bg-dark-800">
                                {ev.previewUrl && (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={ev.previewUrl}
                                        alt="Evidencia"
                                        className="w-full h-full object-cover"
                                    />
                                )}
                                {ev.analizando && (
                                    <div className="absolute inset-0 bg-dark-900/80 flex items-center justify-center">
                                        <Loader2 className="w-6 h-6 text-brand-400 animate-spin" />
                                    </div>
                                )}
                            </div>

                            {/* Contenido */}
                            <div className="flex-1 min-w-0">
                                {ev.analizando ? (
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <Loader2 className="w-4 h-4 text-brand-400 animate-spin" />
                                            <span className="text-sm text-brand-400 font-medium">Analizando con IA...</span>
                                        </div>
                                        <div className="space-y-1">
                                            <div className="h-3 bg-dark-700 rounded shimmer" />
                                            <div className="h-3 bg-dark-700 rounded shimmer w-3/4" />
                                        </div>
                                    </div>
                                ) : ev.analisis ? (
                                    <div className="space-y-2">
                                        {/* Severidad */}
                                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${COLORES_SEVERIDAD[ev.analisis.severidad]}`}>
                                            <Zap className="w-3 h-3" />
                                            {LABELS_SEVERIDAD[ev.analisis.severidad]}
                                        </div>

                                        {/* Score fraude */}
                                        <div className="flex items-center gap-2">
                                            <Shield className="w-3.5 h-3.5 text-dark-400" />
                                            <span className="text-xs text-dark-400">Fraude:</span>
                                            <span className={`text-xs font-semibold ${COLORES_FRAUDE[ev.analisis.nivel_fraude]}`}>
                                                {(ev.analisis.score_fraude * 100).toFixed(0)}% ({ev.analisis.nivel_fraude})
                                            </span>
                                        </div>

                                        {/* Costo */}
                                        <div className="flex items-center gap-2">
                                            <DollarSign className="w-3.5 h-3.5 text-dark-400" />
                                            <span className="text-xs text-dark-300">
                                                ${ev.analisis.costo_estimado_min.toLocaleString('es-CL')} –
                                                ${ev.analisis.costo_estimado_max.toLocaleString('es-CL')} CLP
                                            </span>
                                        </div>

                                        {/* Alerta fraude alto */}
                                        {(ev.analisis.nivel_fraude === 'alto' || ev.analisis.nivel_fraude === 'critico') && (
                                            <div className="flex items-center gap-1.5 text-xs text-orange-400">
                                                <AlertTriangle className="w-3.5 h-3.5" />
                                                <span>Indicadores de fraude detectados</span>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 text-dark-500">
                                        <RefreshCw className="w-4 h-4" />
                                        <span className="text-sm">Sin análisis</span>
                                    </div>
                                )}
                            </div>

                            {/* Botón eliminar */}
                            {!ev.analizando && (
                                <button
                                    onClick={() => eliminarEvidencia(ev.id)}
                                    className="p-1.5 rounded-lg hover:bg-dark-700 text-dark-500 hover:text-red-400 transition-colors self-start"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>

                        {/* Descripción de daños */}
                        {ev.analisis?.descripcion_danos && (
                            <p className="mt-3 pt-3 border-t border-dark-700 text-xs text-dark-400 leading-relaxed">
                                {ev.analisis.descripcion_danos}
                            </p>
                        )}
                    </div>
                ))}
            </div>

            {/* Barra inferior fija */}
            {evidenciasListas.length > 0 && (
                <div className="fixed bottom-0 left-0 right-0 glass-dark p-4 safe-bottom">
                    <button
                        onClick={enviarARevision}
                        disabled={hayAnalizando || generandoInforme}
                        className="btn-primary w-full py-4 text-base"
                    >
                        {generandoInforme ? (
                            <><Loader2 className="w-5 h-5 animate-spin" /> Generando pre-informe IA...</>
                        ) : hayAnalizando ? (
                            <><Loader2 className="w-5 h-5 animate-spin" /> Esperando análisis...</>
                        ) : (
                            <><Send className="w-5 h-5" /> Enviar a Revisión ({evidenciasListas.length} evidencias)</>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
}
