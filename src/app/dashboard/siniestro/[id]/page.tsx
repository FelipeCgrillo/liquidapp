'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import SignatureCanvas from 'react-signature-canvas';
import toast from 'react-hot-toast';
import { Car, FileText, PenTool } from 'lucide-react';

import type { SiniestroCompleto, SeveridadDano } from '@/types';
import { useSignedUrl } from '@/hooks/useSignedUrl';

import { SiniestroHeader } from '@/components/siniestro-detalle/SiniestroHeader';
import { SiniestroInfoCards } from '@/components/siniestro-detalle/SiniestroInfoCards';
import { EvidenceTab } from '@/components/siniestro-detalle/EvidenceTab';
import { ReportTab } from '@/components/siniestro-detalle/ReportTab';
import { SignatureTab } from '@/components/siniestro-detalle/SignatureTab';

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
    const [generandoInforme, setGenerandoInforme] = useState(false);
    const [exportandoPDF, setExportandoPDF] = useState(false);
    const [tabActiva, setTabActiva] = useState<'evidencias' | 'informe' | 'firma'>('evidencias');
    const [urlsEvidencias, setUrlsEvidencias] = useState<Record<string, string>>({});
    const { getSignedUrl } = useSignedUrl();

    const cargarSiniestro = useCallback(async () => {
        const supabase = createClient();
        const { data, error } = await supabase
            .from('siniestros')
            .select(`
                *,
                liquidador_campo:perfiles!liquidador_campo_id(nombre_completo, telefono),
                liquidador_senior:perfiles!liquidador_senior_id(nombre_completo, telefono),
                evidencias (
                  *,
                  analisis_ia (*)
                ),
                pre_informe:pre_informes(*)
            `)
            .eq('id', siniestroId)
            .single();

        if (error) {
            console.error('Error cargando siniestro:', error);
            toast.error('Error al cargar el siniestro');
            setLoading(false);
            return;
        }

        if (data) {
            // Transformar/Validar datos para ajustar a SiniestroCompleto
            const siniestroData: SiniestroCompleto = {
                ...data,
                // Asegurar arrays y objetos anidados
                evidencias: data.evidencias || [],
                pre_informe: data.pre_informe || null,
                liquidador_campo: data.liquidador_campo || null,
                liquidador_senior: data.liquidador_senior || null,
            };

            setSiniestro(siniestroData);
            const informe = siniestroData.pre_informe;
            if (informe) setContenidoInforme(informe.contenido_markdown);

            // Obtener URLs firmadas para las evidencias
            const urls: Record<string, string> = {};
            for (const ev of siniestroData.evidencias) {
                if (ev.storage_path) {
                    const url = await getSignedUrl(ev.storage_path);
                    if (url) urls[ev.id] = url;
                }
            }
            setUrlsEvidencias(urls);
        }
        setLoading(false);
    }, [siniestroId, getSignedUrl]);

    useEffect(() => {
        cargarSiniestro();
    }, [cargarSiniestro]);

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
            if (!elemento) throw new Error('Elemento no encontrado. Asegúrate de estar en la pestaña de Informe.');

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
        } catch (error) {
            console.error(error);
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
            <SiniestroHeader
                numero_siniestro={siniestro.numero_siniestro}
                patente={siniestro.patente}
                nombre_asegurado={siniestro.nombre_asegurado}
                pre_informe_estado={siniestro.pre_informe?.estado}
                exportarPDF={exportarPDF}
                exportandoPDF={exportandoPDF}
                onBack={() => router.back()}
            />

            <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
                <SiniestroInfoCards
                    siniestro={siniestro}
                    coloresSeveridad={COLORES_SEVERIDAD}
                    labelsSeveridad={LABELS_SEVERIDAD}
                />

                {/* Tabs Navigation */}
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

                {/* Tab Content */}
                {tabActiva === 'evidencias' && (
                    <EvidenceTab
                        evidencias={siniestro.evidencias}
                        urlsEvidencias={urlsEvidencias}
                        coloresSeveridad={COLORES_SEVERIDAD}
                        labelsSeveridad={LABELS_SEVERIDAD}
                    />
                )}

                {tabActiva === 'informe' && (
                    <ReportTab
                        pre_informe={siniestro.pre_informe || null}
                        contenidoInforme={contenidoInforme}
                        setContenidoInforme={setContenidoInforme}
                        editandoInforme={editandoInforme}
                        setEditandoInforme={setEditandoInforme}
                        guardandoInforme={guardandoInforme}
                        guardarInforme={guardarInforme}
                        generandoInforme={generandoInforme}
                        generarInformeIA={generarInformeIA}
                    />
                )}

                {tabActiva === 'firma' && (
                    <SignatureTab
                        pre_informe={siniestro.pre_informe || null}
                        firmando={firmando}
                        firmarInforme={firmarInforme}
                        exportarPDF={exportarPDF}
                        exportandoPDF={exportandoPDF}
                        sigRef={sigRef}
                    />
                )}
            </div>
        </div>
    );
}
