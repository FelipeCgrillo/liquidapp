'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Loader2, FileText, MapPin, Camera, Mic, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { useClaim } from '@/context/ClaimContext';
import { toast } from 'react-hot-toast';

interface StepConfirmationProps {
    onBack: () => void;
}

export default function StepConfirmation({ onBack }: StepConfirmationProps) {
    const {
        siniestroId,
        evidencias,
        finalizarSiniestro,
        isLoading: contextLoading
    } = useClaim();

    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async () => {
        if (!siniestroId) return;

        setSubmitting(true);
        const success = await finalizarSiniestro();
        if (success) {
            setSubmitted(true);
        }
        setSubmitting(false);
    };

    if (submitted) {
        return (
            <div className="flex flex-col h-full items-center justify-center space-y-6 text-center animate-in fade-in duration-500">
                <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle className="w-12 h-12 text-green-600" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900">¡Recibido!</h2>
                <p className="text-lg text-gray-600 max-w-xs">
                    Hemos recibido tu reporte. Un liquidador revisará tu caso en los próximos minutos.
                </p>
                <Card className="w-full bg-blue-50 border-blue-100 mt-8">
                    <CardContent className="p-4">
                        <p className="text-sm font-semibold text-blue-800">N° de Siniestro</p>
                        <p className="text-2xl font-mono text-blue-900">
                            {siniestroId?.slice(0, 8).toUpperCase() || 'Pendiente'}
                        </p>
                    </CardContent>
                </Card>
                <div className="w-full pt-8">
                    <Link href="/">
                        <Button className="w-full h-14 text-lg font-bold" variant="outline">
                            Volver al Inicio
                        </Button>
                    </Link>
                </div>
            </div>
        );
    }

    // Calcular resumen de daños
    const dañosDetectados = evidencias
        .filter(ev => ev.analisis)
        .flatMap(ev => ev.analisis?.partes_danadas || []);

    const severidadMax = evidencias
        .map(ev => ev.analisis?.severidad)
        .reduce((max, current) => {
            if (current === 'perdida_total') return 'perdida_total';
            if (current === 'grave' && max !== 'perdida_total') return 'grave';
            if (current === 'moderado' && max !== 'grave' && max !== 'perdida_total') return 'moderado';
            return max || current;
        }, 'leve');

    return (
        <div className="flex flex-col h-full space-y-6">
            <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-gray-900">Confirma tu Reporte</h2>
                <p className="text-gray-500">Revisa los datos antes de enviar.</p>
            </div>

            <Card className="flex-grow overflow-y-auto shadow-sm">
                <CardHeader>
                    <CardTitle className="text-lg">Resumen del Siniestro</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                        <MapPin className="w-5 h-5 text-blue-500 mt-0.5" />
                        <div>
                            <p className="font-medium text-sm text-gray-900">Ubicación</p>
                            <p className="text-xs text-gray-500">Registrada automáticamente</p>
                        </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                        <Camera className="w-5 h-5 text-blue-500 mt-0.5" />
                        <div className="w-full">
                            <p className="font-medium text-sm text-gray-900">Evidencias ({evidencias.length})</p>

                            {evidencias.length > 0 ? (
                                <div className="mt-2 space-y-2">
                                    <div className="flex flex-wrap gap-1">
                                        {evidencias.map((ev, i) => (
                                            <div key={i} className={`w-8 h-8 rounded overflow-hidden border ${!ev.analisis ? 'border-red-300' : 'border-green-300'}`}>
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img src={ev.previewUrl} className="w-full h-full object-cover" alt="" />
                                            </div>
                                        ))}
                                    </div>

                                    {dañosDetectados.length > 0 && (
                                        <div className="text-xs bg-white p-2 rounded border border-gray-100">
                                            <p className="font-semibold text-gray-700 mb-1">IA Detectó:</p>
                                            <p className="text-gray-500 capitalize">{dañosDetectados.join(', ').slice(0, 100)}...</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <p className="text-xs text-red-400 flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" /> Sin evidencias
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg opacity-50">
                        <Mic className="w-5 h-5 text-gray-400 mt-0.5" />
                        <div>
                            <p className="font-medium text-sm text-gray-900">Relato</p>
                            <p className="text-xs text-gray-500">Audio opcional (no grabado)</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="space-y-3 pt-4">
                <Button
                    onClick={handleSubmit}
                    className="w-full h-14 text-lg font-bold bg-blue-700 hover:bg-blue-800 shadow-xl flex items-center justify-center gap-2"
                    disabled={submitting || contextLoading || evidencias.length === 0}
                >
                    {submitting || contextLoading ? (
                        <>
                            <Loader2 className="w-6 h-6 animate-spin" />
                            Enviando...
                        </>
                    ) : (
                        "Enviar Informe"
                    )}
                </Button>
                <Button variant="ghost" onClick={onBack} disabled={submitting} className="w-full text-gray-500">
                    Volver a editar
                </Button>
            </div>
        </div>
    );
}
