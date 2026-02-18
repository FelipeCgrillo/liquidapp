'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import SignatureCanvas from 'react-signature-canvas';
import {
    ChevronLeft, Shield, Zap, DollarSign, FileText,
    CheckCircle, AlertTriangle, Loader2, Download,
    PenTool, Trash2, Save, RefreshCw, MapPin, Car
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { Siniestro, Evidencia, AnalisisIA, PreInforme, SiniestroCompleto, SeveridadDano, EvidenciaConAnalisis } from '@/types';

const COLORES_SEVERIDAD: Record<SeveridadDano, string> = {
    leve: 'badge-leve',
    moderado: 'badge-moderado',
    grave: 'badge-grave',
    perdida_total: 'badge-perdida_total',
};

const LABELS_SEVERIDAD: Record<SeveridadDano, string> = {
    leve: 'Leve',
    moderado: 'Moderado',
    grave: 'Grave',
    perdida_total: 'Pérdida Total',
};

export default function SiniestroDetallePage() {
    const router = useRouter();
    const params = useParams();
    const siniestroId = params.id as string;
    const sigRef = useRef<SignatureCanvas>(null);

    const [siniestro, setSiniestro] = useState<SiniestroCompleto | null>(null);
    const [loading, setLoading] = useState(true);
    const [editandoInforme, setEditandoInforme] = useState(false);
    const [contenidoInforme, setContenidoInforme] = useState('');
    const [guardandoInforme, setGuardandoInforme] = useState(false);
    const [firmando, setFirmando] = useState(false);
    const [mostrarFirma, setMostrarFirma] = useState(false);
    const [generandoInforme, setGenerandoInforme] = useState(false);
    const [exportandoPDF, setExportandoPDF] = useState(false);
    const [tabActiva, setTabActiva] = useState<'evidencias' | 'informe' | 'firma'>('evidencias');
    const [urlsEvidencias, setUrlsEvidencias] = useState<Record<string, string>>({});

    useEffect(() => {
        cargarSiniestro();
    }, [siniestroId]);

    const cargarSiniestro = async () => {
        const supabase = createClient();
        const { data } = await supabase
            .from('siniestros')
            .select(`
        *,
        liquidador_campo:perfiles!liquidador_campo_id(nombre_completo, telefono),
        evidencias (
          *,
          analisis_ia (*)
        ),
        pre_informe:pre_informes(*)
      `)
            .eq('id', siniestroId)
            .single();

        if (data) {
            setSiniestro(data as unknown as SiniestroCompleto);
            const informe = (data as unknown as SiniestroCompleto).pre_informe;
            if (informe) setContenidoInforme(informe.contenido_markdown);

            // Obtener URLs firmadas para las evidencias
            const urls: Record<string, string> = {};
            for (const ev of (data as unknown as SiniestroCompleto).evidencias || []) {
                if (ev.storage_path) {
                    const { data: urlData } = await supabase.storage
                        .from('evidencias-siniestros')
                        .createSignedUrl(ev.storage_path, 3600);
                    if (urlData?.signedUrl) urls[ev.id] = urlData.signedUrl;
                }
            }
            setUrlsEvidencias(urls);
        }
        setLoading(false);
    };

    const guardarInforme = async () => {
        setGuardandoInforme(true);
        const supabase = createClient();
        const informe = siniestro?.pre_informe;

        if (informe) {
            await supabase
                .from('pre_informes')
                .update({ contenido_markdown: contenidoInforme, estado: 'revisado' })
                .eq('id', informe.id);
        } else {
            await supabase.from('pre_informes').insert({
                siniestro_id: siniestroId,
                contenido_markdown: contenidoInforme,
                generado_por_ia: false,
            });
        }

        toast.success('Informe guardado correctamente');
        setEditandoInforme(false);
        setGuardandoInforme(false);
        cargarSiniestro();
    };

    const generarInformeIA = async () => {
        setGenerandoInforme(true);
        try {
            const resp = await fetch('/api/generar-preinforme', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ siniestro_id: siniestroId }),
            });
            const data = await resp.json();
            if (data.informe) {
                setContenidoInforme(data.informe.contenido_markdown);
                toast.success('Pre-informe regenerado con IA');
                cargarSiniestro();
            }
        } catch {
            toast.error('Error al generar el informe');
        } finally {
            setGenerandoInforme(false);
        }
    };

    const firmarInforme = async () => {
        if (!sigRef.current || sigRef.current.isEmpty()) {
            toast.error('Por favor dibuja tu firma antes de confirmar');
            return;
        }

        setFirmando(true);
        try {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            const firmaBase64 = sigRef.current.toDataURL('image/png');

            const informe = siniestro?.pre_informe;
            if (informe) {
                await supabase
                    .from('pre_informes')
                    .update({
                        estado: 'firmado',
                        firmado_por: user?.id,
                        firma_imagen_base64: firmaBase64,
                        firmado_at: new Date().toISOString(),
                    })
                    .eq('id', informe.id);
            }

            await supabase
                .from('siniestros')
                .update({ estado: 'aprobado' })
                .eq('id', siniestroId);

            toast.success('¡Informe firmado y siniestro aprobado!');
            setMostrarFirma(false);
            cargarSiniestro();
        } catch {
            toast.error('Error al firmar el informe');
        } finally {
            setFirmando(false);
        }
    };

    const exportarPDF = async () => {
        setExportandoPDF(true);
        try {
            const { default: jsPDF } = await import('jspdf');
            const { default: html2canvas } = await import('html2canvas');

            const elemento = document.getElementById('informe-para-pdf');
            if (!elemento) throw new Error('Elemento no encontrado');

            const canvas = await html2canvas(elemento, {
                scale: 2,
                backgroundColor: '#111827',
                useCORS: true,
            });

            const pdf = new jsPDF('p', 'mm', 'a4');
            const imgData = canvas.toDataURL('image/png');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`${siniestro?.numero_siniestro || 'informe'}.pdf`);
            toast.success('PDF exportado correctamente');
        } catch {
            toast.error('Error al exportar el PDF');
        } finally {
            setExportandoPDF(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-dark-950 flex items-center justify-center">
                <div className="w-12 h-12 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!siniestro) {
        return (
            <div className="min-h-screen bg-dark-950 flex items-center justify-center">
                <p className="text-dark-400">Siniestro no encontrado</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-dark-950">
            {/* Header */}
            <div className="glass-dark border-b border-dark-700 sticky top-0 z-10">
                <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-dark-700">
                            <ChevronLeft className="w-5 h-5 text-dark-300" />
                        </button>
                        <div>
                            <h1 className="font-bold text-white">{siniestro.numero_siniestro}</h1>
                            <p className="text-xs text-dark-400">{siniestro.patente} · {siniestro.nombre_asegurado}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {siniestro.pre_informe?.estado === 'firmado' && (
                            <button
                                onClick={exportarPDF}
                                disabled={exportandoPDF}
                                className="btn-secondary text-sm py-2 px-4"
                            >
                                {exportandoPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                                <span className="hidden sm:inline">Exportar PDF</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
                {/* Info del siniestro */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="card">
                        <div className="flex items-center gap-2 mb-3">
                            <Car className="w-4 h-4 text-brand-400" />
                            <span className="text-sm font-medium text-dark-300">Vehículo</span>
                        </div>
                        <p className="font-bold text-white text-lg">{siniestro.patente}</p>
                        <p className="text-dark-400 text-sm">{siniestro.marca} {siniestro.modelo} {siniestro.anio}</p>
                        <p className="text-dark-500 text-xs mt-1">{siniestro.tipo_siniestro}</p>
                    </div>

                    <div className="card">
                        <div className="flex items-center gap-2 mb-3">
                            <Zap className="w-4 h-4 text-yellow-400" />
                            <span className="text-sm font-medium text-dark-300">Evaluación IA</span>
                        </div>
                        {siniestro.severidad_general ? (
                            <>
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-sm font-semibold border ${COLORES_SEVERIDAD[siniestro.severidad_general]}`}>
                                    {LABELS_SEVERIDAD[siniestro.severidad_general]}
                                </span>
                                <div className="mt-2 flex items-center gap-2">
                                    <Shield className="w-3.5 h-3.5 text-dark-400" />
                                    <span className="text-xs text-dark-400">Fraude: {((siniestro.score_fraude_general || 0) * 100).toFixed(0)}%</span>
                                </div>
                            </>
                        ) : (
                            <p className="text-dark-500 text-sm">Sin análisis IA</p>
                        )}
                    </div>

                    <div className="card">
                        <div className="flex items-center gap-2 mb-3">
                            <DollarSign className="w-4 h-4 text-accent-400" />
                            <span className="text-sm font-medium text-dark-300">Costo Estimado</span>
                        </div>
                        {siniestro.costo_estimado_max ? (
                            <>
                                <p className="font-bold text-accent-400">
                                    ${(siniestro.costo_estimado_max).toLocaleString('es-CL')}
                                </p>
                                <p className="text-dark-500 text-xs">máximo CLP</p>
                                <p className="text-dark-600 text-xs">
                                    mín: ${(siniestro.costo_estimado_min || 0).toLocaleString('es-CL')}
                                </p>
                            </>
                        ) : (
                            <p className="text-dark-500 text-sm">Sin estimación</p>
                        )}
                    </div>
                </div>

                {/* Ubicación */}
                {siniestro.direccion && (
                    <div className="flex items-start gap-2 text-sm text-dark-400 px-1">
                        <MapPin className="w-4 h-4 text-dark-500 mt-0.5 flex-shrink-0" />
                        <span>{siniestro.direccion}</span>
                    </div>
                )}

                {/* Tabs */}
                <div className="flex gap-1 bg-dark-900 rounded-xl p-1 border border-dark-700">
                    {[
                        { id: 'evidencias', label: 'Evidencias', icon: Car },
                        { id: 'informe', label: 'Pre-Informe', icon: FileText },
                        { id: 'firma', label: 'Firma Digital', icon: PenTool },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setTabActiva(tab.id as typeof tabActiva)}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${tabActiva === tab.id
                                ? 'bg-brand-700 text-white'
                                : 'text-dark-400 hover:text-dark-200'
                                }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            <span className="hidden sm:inline">{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* Tab: Evidencias */}
                {tabActiva === 'evidencias' && (
                    <div className="space-y-4">
                        {siniestro.evidencias?.length === 0 ? (
                            <div className="card text-center py-10">
                                <p className="text-dark-400">No hay evidencias registradas</p>
                            </div>
                        ) : (
                            siniestro.evidencias?.map((ev: EvidenciaConAnalisis) => {
                                const analisis = ev.analisis_ia?.[0];
                                return (
                                    <div key={ev.id} className="card overflow-hidden">
                                        <div className="flex gap-4">
                                            {/* Imagen */}
                                            <div className="w-32 h-32 flex-shrink-0 rounded-xl overflow-hidden bg-dark-800">
                                                {urlsEvidencias[ev.id] ? (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img
                                                        src={urlsEvidencias[ev.id]}
                                                        alt="Evidencia"
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <Car className="w-8 h-8 text-dark-600" />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Análisis */}
                                            <div className="flex-1">
                                                {analisis ? (
                                                    <div className="space-y-3">
                                                        <div className="flex flex-wrap gap-2">
                                                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border ${COLORES_SEVERIDAD[analisis.severidad]}`}>
                                                                <Zap className="w-3 h-3" />
                                                                {LABELS_SEVERIDAD[analisis.severidad]}
                                                            </span>
                                                            {(analisis.nivel_fraude === 'alto' || analisis.nivel_fraude === 'critico') && (
                                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border badge-rechazado">
                                                                    <AlertTriangle className="w-3 h-3" />
                                                                    Fraude {analisis.nivel_fraude}
                                                                </span>
                                                            )}
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-3 text-sm">
                                                            <div>
                                                                <p className="text-dark-500 text-xs mb-1">Score Fraude</p>
                                                                <div className="flex items-center gap-2">
                                                                    <div className="flex-1 bg-dark-700 rounded-full h-1.5">
                                                                        <div
                                                                            className={`h-1.5 rounded-full ${analisis.score_fraude < 0.3 ? 'bg-green-500' :
                                                                                analisis.score_fraude < 0.6 ? 'bg-yellow-500' : 'bg-red-500'
                                                                                }`}
                                                                            style={{ width: `${analisis.score_fraude * 100}%` }}
                                                                        />
                                                                    </div>
                                                                    <span className="text-xs text-dark-300">
                                                                        {(analisis.score_fraude * 100).toFixed(0)}%
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <p className="text-dark-500 text-xs mb-1">Costo Estimado</p>
                                                                <p className="text-dark-200 text-xs font-medium">
                                                                    ${analisis.costo_estimado_min.toLocaleString('es-CL')} –
                                                                    ${analisis.costo_estimado_max.toLocaleString('es-CL')}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {analisis.partes_danadas && analisis.partes_danadas.length > 0 && (
                                                            <div className="flex flex-wrap gap-1">
                                                                {analisis.partes_danadas.map((parte: string) => (
                                                                    <span key={parte} className="px-2 py-0.5 bg-dark-700 text-dark-300 text-xs rounded-lg">
                                                                        {parte.replace(/_/g, ' ')}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {analisis.descripcion_danos && (
                                                            <p className="text-dark-400 text-xs leading-relaxed">
                                                                {analisis.descripcion_danos}
                                                            </p>
                                                        )}

                                                        {analisis.indicadores_fraude && analisis.indicadores_fraude.length > 0 && (
                                                            <div className="bg-orange-900/20 border border-orange-700/30 rounded-xl p-3">
                                                                <p className="text-orange-400 text-xs font-semibold mb-1">
                                                                    ⚠️ Indicadores de Fraude:
                                                                </p>
                                                                <ul className="text-orange-300 text-xs space-y-0.5">
                                                                    {analisis.indicadores_fraude.map((ind: string, i: number) => (
                                                                        <li key={i}>• {ind}</li>
                                                                    ))}
                                                                </ul>
                                                                {analisis.justificacion_fraude && (
                                                                    <p className="text-orange-400/70 text-xs mt-2 italic">
                                                                        {analisis.justificacion_fraude}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <p className="text-dark-500 text-sm">Sin análisis IA</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}

                {/* Tab: Pre-Informe */}
                {tabActiva === 'informe' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <FileText className="w-5 h-5 text-brand-400" />
                                <h2 className="font-semibold text-white">Pre-Informe Técnico</h2>
                                {siniestro.pre_informe && (
                                    <span className={`px-2 py-0.5 text-xs rounded-lg border ${siniestro.pre_informe.estado === 'firmado' ? 'badge-aprobado' :
                                        siniestro.pre_informe.estado === 'revisado' ? 'badge-en_revision' : 'badge-borrador'
                                        }`}>
                                        {siniestro.pre_informe.estado}
                                    </span>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={generarInformeIA}
                                    disabled={generandoInforme}
                                    className="btn-secondary text-sm py-2 px-3"
                                >
                                    {generandoInforme ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <RefreshCw className="w-4 h-4" />
                                    )}
                                    <span className="hidden sm:inline">Regenerar IA</span>
                                </button>
                                {!editandoInforme && (
                                    <button
                                        onClick={() => setEditandoInforme(true)}
                                        className="btn-secondary text-sm py-2 px-3"
                                    >
                                        <PenTool className="w-4 h-4" />
                                        <span className="hidden sm:inline">Editar</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        {editandoInforme ? (
                            <div className="space-y-3">
                                <textarea
                                    value={contenidoInforme}
                                    onChange={(e) => setContenidoInforme(e.target.value)}
                                    className="input-base font-mono text-sm resize-none"
                                    rows={20}
                                    placeholder="Escribe el informe en formato Markdown..."
                                />
                                <div className="flex gap-2">
                                    <button
                                        onClick={guardarInforme}
                                        disabled={guardandoInforme}
                                        className="btn-primary"
                                    >
                                        {guardandoInforme ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                        Guardar
                                    </button>
                                    <button
                                        onClick={() => setEditandoInforme(false)}
                                        className="btn-secondary"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </div>
                        ) : contenidoInforme ? (
                            <div
                                id="informe-para-pdf"
                                className="card prose prose-invert prose-sm max-w-none"
                                style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '13px', lineHeight: '1.6' }}
                            >
                                {contenidoInforme}
                            </div>
                        ) : (
                            <div className="card text-center py-10">
                                <FileText className="w-10 h-10 text-dark-600 mx-auto mb-3" />
                                <p className="text-dark-400 mb-4">No hay pre-informe generado aún</p>
                                <button onClick={generarInformeIA} disabled={generandoInforme} className="btn-primary mx-auto">
                                    {generandoInforme ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                                    Generar con IA
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Tab: Firma Digital */}
                {tabActiva === 'firma' && (
                    <div className="space-y-4">
                        {siniestro.pre_informe?.estado === 'firmado' ? (
                            <div className="card text-center py-8">
                                <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
                                <p className="text-green-400 font-semibold text-lg">Informe Firmado</p>
                                <p className="text-dark-400 text-sm mt-1">
                                    Firmado el {new Date(siniestro.pre_informe.firmado_at!).toLocaleString('es-CL')}
                                </p>
                                {siniestro.pre_informe.firma_imagen_base64 && (
                                    <div className="mt-4 bg-white rounded-xl p-4 max-w-xs mx-auto">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={siniestro.pre_informe.firma_imagen_base64}
                                            alt="Firma digital"
                                            className="w-full"
                                        />
                                    </div>
                                )}
                                <button onClick={exportarPDF} disabled={exportandoPDF} className="btn-primary mt-4 mx-auto">
                                    {exportandoPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                                    Exportar PDF
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {!siniestro.pre_informe && (
                                    <div className="bg-yellow-900/20 border border-yellow-700/30 rounded-xl p-4">
                                        <div className="flex items-center gap-2">
                                            <AlertTriangle className="w-4 h-4 text-yellow-400" />
                                            <p className="text-yellow-400 text-sm font-medium">
                                                Debes generar el pre-informe antes de firmar
                                            </p>
                                        </div>
                                    </div>
                                )}

                                <div className="card">
                                    <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                                        <PenTool className="w-4 h-4 text-brand-400" />
                                        Firma del Liquidador
                                    </h3>
                                    <p className="text-dark-400 text-sm mb-4">
                                        Dibuja tu firma en el recuadro a continuación para aprobar y cerrar este siniestro.
                                    </p>

                                    <div className="bg-white rounded-xl overflow-hidden border-2 border-dark-600">
                                        <SignatureCanvas
                                            ref={sigRef}
                                            canvasProps={{
                                                width: 600,
                                                height: 200,
                                                className: 'w-full',
                                                style: { touchAction: 'none' },
                                            }}
                                            backgroundColor="white"
                                            penColor="#1e40af"
                                        />
                                    </div>

                                    <div className="flex gap-3 mt-4">
                                        <button
                                            onClick={() => sigRef.current?.clear()}
                                            className="btn-secondary flex-1"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            Limpiar
                                        </button>
                                        <button
                                            onClick={firmarInforme}
                                            disabled={firmando || !siniestro.pre_informe}
                                            className="btn-primary flex-1"
                                        >
                                            {firmando ? (
                                                <><Loader2 className="w-4 h-4 animate-spin" /> Firmando...</>
                                            ) : (
                                                <><CheckCircle className="w-4 h-4" /> Firmar y Aprobar</>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
