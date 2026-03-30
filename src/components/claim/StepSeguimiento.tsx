'use client';

import { motion } from 'framer-motion';
import { CheckCircle2, Clock, FileSearch, CreditCard, Circle } from 'lucide-react';
import { useClaim } from '@/context/ClaimContext';
import Link from 'next/link';

interface StepSeguimientoProps {
    onBack?: () => void;
}

const TIMELINE_STEPS = [
    {
        id: 'recibido',
        label: 'Caso recibido',
        description: 'Tu reporte fue recibido correctamente',
        icon: CheckCircle2,
        color: 'text-green-600',
        bgColor: 'bg-green-100',
    },
    {
        id: 'revisado',
        label: 'En revisión',
        description: 'Un liquidador autorizado está revisando tu caso',
        icon: FileSearch,
        color: 'text-blue-600',
        bgColor: 'bg-blue-100',
    },
    {
        id: 'aprobado',
        label: 'Aprobado',
        description: 'Tu caso fue aprobado y estamos procesando el pago',
        icon: CheckCircle2,
        color: 'text-green-600',
        bgColor: 'bg-green-100',
    },
    {
        id: 'pagado',
        label: 'Pagado',
        description: 'La indemnización fue transferida a tu cuenta',
        icon: CreditCard,
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-100',
    },
];

export default function StepSeguimiento({ onBack }: StepSeguimientoProps) {
    const { siniestroId } = useClaim();

    // TODO: Sprint 5 — Obtener estado real del siniestro desde API
    // Por ahora siempre muestra estado "recibido" (paso 0)
    const estadoActual = 0;

    const numeroCaso = siniestroId
        ? `LA-${new Date().getFullYear()}-${siniestroId.slice(0, 6).toUpperCase()}`
        : '...';

    return (
        <div className="flex flex-col h-full py-4">
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-8"
            >
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Clock className="w-8 h-8 text-blue-600" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">Seguimiento de tu caso</h1>
                <p className="text-sm text-gray-500 mt-1">
                    Caso <span className="font-mono font-bold text-blue-600">{numeroCaso}</span>
                </p>
            </motion.div>

            {/* Timeline */}
            <div className="flex-grow">
                <div className="relative pl-8">
                    {/* Línea vertical */}
                    <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gray-200" />

                    {TIMELINE_STEPS.map((step, index) => {
                        const isCompleted = index <= estadoActual;
                        const isCurrent = index === estadoActual;
                        const Icon = isCompleted ? step.icon : Circle;

                        return (
                            <motion.div
                                key={step.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.15 }}
                                className={`relative mb-8 last:mb-0 ${!isCompleted ? 'opacity-40' : ''}`}
                            >
                                {/* Punto en la línea */}
                                <div className={`absolute -left-8 top-0 w-6 h-6 rounded-full flex items-center justify-center ${isCompleted ? step.bgColor : 'bg-gray-100'
                                    } ${isCurrent ? 'ring-4 ring-blue-200' : ''}`}>
                                    <Icon className={`w-3.5 h-3.5 ${isCompleted ? step.color : 'text-gray-400'}`} />
                                </div>

                                {/* Contenido */}
                                <div className={`${isCurrent ? 'bg-blue-50 border border-blue-200' : 'bg-white border border-gray-100'} rounded-xl p-4`}>
                                    <p className={`font-bold text-sm ${isCurrent ? 'text-blue-900' : 'text-gray-700'}`}>
                                        {step.label}
                                        {isCurrent && (
                                            <span className="ml-2 text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">
                                                Actual
                                            </span>
                                        )}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">{step.description}</p>
                                    {isCurrent && (
                                        <p className="text-xs text-blue-600 mt-2 font-medium">
                                            ⏱ Tiempo estimado: 4 horas
                                        </p>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>

            {/* Info adicional */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="bg-gray-50 rounded-xl p-4 mt-4 space-y-2"
            >
                <p className="text-xs text-gray-500">
                    📱 Recibirás una notificación por SMS cuando el estado de tu caso cambie.
                </p>
                <p className="text-xs text-gray-400">
                    También puedes consultar el estado en cualquier momento con tu número de caso.
                </p>
            </motion.div>

            {/* Botón */}
            <div className="mt-6">
                <Link href="/">
                    <button className="w-full py-4 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors">
                        Volver al inicio
                    </button>
                </Link>
            </div>
        </div>
    );
}
