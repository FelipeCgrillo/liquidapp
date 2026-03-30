'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Loader2, Clock, Shield, AlertCircle, PhoneCall } from 'lucide-react';
import { useClaim } from '@/context/ClaimContext';
import Link from 'next/link';

interface StepResolucionProps {
    onNext: () => void;
    onBack: () => void;
}

type EstadoResolucion = 'procesando' | 'resultado' | 'error';

interface ACLResultado {
    acl_score: number;
    decision: string;
    bloqueos: string[];
    monto_estimado_min: number;
    monto_estimado_max: number;
    monto_final: number;
    explicacion_asegurado: string;
    dry_run: boolean;
}

export default function StepResolucion({ onNext, onBack }: StepResolucionProps) {
    const {
        siniestroId,
        evidencias,
        finalizarSiniestro,
        isLoading: contextLoading,
    } = useClaim();

    const [estado, setEstado] = useState<EstadoResolucion>('procesando');
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [numeroCaso, setNumeroCaso] = useState<string | null>(null);
    const [aclResultado, setAclResultado] = useState<ACLResultado | null>(null);
    const [aclError, setAclError] = useState<string | null>(null);

    // Ejecutar motor ACL cuando llegamos a este paso
    useEffect(() => {
        if (estado !== 'procesando' || !siniestroId) return;

        const ejecutarACL = async () => {
            try {
                const response = await fetch('/api/autoliquidar', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        siniestro_id: siniestroId,
                        dry_run: true, // Sprint 2: siempre dry_run
                    }),
                });

                if (response.ok) {
                    const data = await response.json();
                    setAclResultado(data.resultado);
                } else {
                    // Motor ACL no disponible (ej: sin análisis IA)
                    // Continuar con flujo manual
                    console.warn('Motor ACL retornó error, usando flujo manual');
                    setAclError('No pudimos procesar tu caso automáticamente. Lo revisará un liquidador.');
                }
            } catch {
                console.warn('Error conectando con motor ACL, usando flujo manual');
                setAclError('No pudimos procesar tu caso automáticamente. Lo revisará un liquidador.');
            }
            setEstado('resultado');
        };

        // Delay mínimo para UX (mostrar animación al menos 2s)
        const timer = setTimeout(ejecutarACL, 2000);
        return () => clearTimeout(timer);
    }, [estado, siniestroId]);

    const handleSubmit = async () => {
        if (!siniestroId) return;
        setSubmitting(true);
        const success = await finalizarSiniestro();
        if (success) {
            setSubmitted(true);
            // Generar número de caso legible
            setNumeroCaso(`LA-${new Date().getFullYear()}-${siniestroId.slice(0, 6).toUpperCase()}`);
        }
        setSubmitting(false);
    };

    // ─── Estado: Ya enviado ──────────────────────────────────────────────────
    if (submitted && numeroCaso) {
        return (
            <div className="flex flex-col h-full items-center justify-center space-y-6 text-center animate-in fade-in duration-500">
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
                    className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center"
                >
                    <CheckCircle className="w-12 h-12 text-green-600" />
                </motion.div>

                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Tu caso está en proceso</h2>
                    <p className="text-gray-500 mt-2 max-w-xs mx-auto">
                        Recibirás una notificación cuando tengamos una resolución.
                    </p>
                </div>

                {/* Número de caso */}
                <div className="w-full bg-blue-50 border border-blue-200 rounded-2xl p-5">
                    <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">
                        Tu número de caso
                    </p>
                    <p className="text-3xl font-mono font-bold text-blue-900">
                        {numeroCaso}
                    </p>
                    <p className="text-xs text-blue-500 mt-2">
                        Guarda este número. Lo necesitarás para hacer seguimiento.
                    </p>
                </div>

                {/* Próximos pasos */}
                <div className="w-full bg-gray-50 rounded-2xl p-4 text-left space-y-3">
                    <p className="text-sm font-bold text-gray-700">¿Qué sigue?</p>
                    <div className="flex items-start gap-3">
                        <Clock className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-gray-600">
                            Recibirás una respuesta en un plazo estimado de <strong>4 horas</strong>.
                        </p>
                    </div>
                    <div className="flex items-start gap-3">
                        <Shield className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-gray-600">
                            Un liquidador autorizado validará tu caso.
                        </p>
                    </div>
                </div>

                <div className="w-full pt-4 space-y-3">
                    <button
                        onClick={onNext}
                        className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition-colors"
                    >
                        Ver seguimiento del caso
                    </button>
                    <Link href="/">
                        <button className="w-full text-gray-500 py-2 text-sm hover:text-gray-700 transition-colors">
                            Volver al inicio
                        </button>
                    </Link>
                </div>
            </div>
        );
    }

    // ─── Estado: Procesando ──────────────────────────────────────────────────
    if (estado === 'procesando') {
        return (
            <div className="flex flex-col h-full items-center justify-center space-y-8 text-center">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                >
                    <Loader2 className="w-16 h-16 text-blue-600" />
                </motion.div>

                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Analizando tu caso</h2>
                    <p className="text-gray-500 mt-2">
                        Estamos revisando toda la información que nos proporcionaste...
                    </p>
                </div>

                <div className="w-full max-w-xs space-y-2">
                    {['Revisando fotos', 'Evaluando daños', 'Calculando estimación'].map((paso, i) => (
                        <motion.div
                            key={paso}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.8 }}
                            className="flex items-center gap-2 text-sm text-gray-500"
                        >
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: i * 0.8 + 0.5 }}
                                className="w-2 h-2 bg-green-500 rounded-full"
                            />
                            {paso}
                        </motion.div>
                    ))}
                </div>
            </div>
        );
    }

    // ─── Estado: Resultado (pre-envío) ───────────────────────────────────────
    // Usar montos del motor ACL si están disponibles, sino del análisis IA directo
    const costoMin = aclResultado?.monto_estimado_min || evidencias.reduce((sum, ev) => sum + (ev.analisis?.costo_estimado_min || 0), 0);
    const costoMax = aclResultado?.monto_estimado_max || evidencias.reduce((sum, ev) => sum + (ev.analisis?.costo_estimado_max || 0), 0);
    const formatCLP = (n: number) => n.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });

    return (
        <div className="flex flex-col h-full py-4">
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-6"
            >
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">Resumen de tu caso</h1>
                <p className="text-gray-500 text-sm mt-1">
                    Hemos analizado la información. Revisa antes de enviar.
                </p>
            </motion.div>

            <div className="flex-grow space-y-4 overflow-y-auto">
                {/* Qué se analizó */}
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-blue-50 border border-blue-200 rounded-xl p-4"
                >
                    <p className="text-sm font-semibold text-blue-800 mb-2 flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        Lo que analizamos
                    </p>
                    <p className="text-sm text-blue-700">
                        {aclResultado?.explicacion_asegurado || aclError || `Revisamos ${evidencias.length} fotos de tu vehículo y verificamos tu identidad y cobertura.`}
                    </p>
                </motion.div>

                {/* Estimación de costos (rango) */}
                {costoMin > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-white border border-gray-200 rounded-xl p-4"
                    >
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                            Estimación preliminar
                        </p>
                        <p className="text-2xl font-bold text-gray-900">
                            {formatCLP(costoMin)} – {formatCLP(costoMax)}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                            Rango estimado. El monto final será confirmado por un liquidador autorizado.
                        </p>
                    </motion.div>
                )}

                {/* Evidencias recibidas */}
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white border border-gray-200 rounded-xl p-4"
                >
                    <p className="text-sm font-semibold text-gray-700 mb-2">
                        Evidencias recibidas
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {evidencias.map((ev, i) => (
                            <div key={i} className="w-12 h-12 rounded-lg overflow-hidden border border-green-300 bg-gray-100">
                                {ev.previewUrl && (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={ev.previewUrl} className="w-full h-full object-cover" alt="" />
                                )}
                            </div>
                        ))}
                    </div>
                    <p className="text-xs text-green-600 mt-2 font-medium">
                        ✓ {evidencias.length} fotos procesadas correctamente
                    </p>
                </motion.div>
            </div>

            {/* Botones */}
            <div className="space-y-3 mt-6">
                <button
                    onClick={handleSubmit}
                    className="w-full py-4 rounded-xl bg-blue-600 text-white font-bold text-lg flex items-center justify-center gap-2 hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50"
                    disabled={submitting || contextLoading || evidencias.length === 0}
                >
                    {submitting || contextLoading ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Enviando...
                        </>
                    ) : (
                        'Enviar mi caso'
                    )}
                </button>
                <button
                    onClick={onBack}
                    disabled={submitting}
                    className="w-full text-gray-500 py-2 text-sm hover:text-gray-700 transition-colors"
                >
                    Volver a editar
                </button>
            </div>
        </div>
    );
}
