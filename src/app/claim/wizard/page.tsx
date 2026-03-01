'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import StepIdentificacion from '@/components/claim/StepIdentificacion';
import StepGeolocation from '@/components/claim/StepGeolocation';
import StepEvidence from '@/components/claim/StepEvidence';
import StepVoice from '@/components/claim/StepVoice';
import StepConfirmation from '@/components/claim/StepConfirmation';
import { ClaimProvider, useClaim } from '@/context/ClaimContext';
import { Loader2 } from 'lucide-react';

// El paso 0 es Identificación — los demás siguen el orden original
// NOTA: StepIdentificacion tiene su propio onNext con firma diferente,
// por eso lo manejamos aparte en WizardContent.
const STEPS_AFTER_ID = [
    { id: 'geo', component: StepGeolocation },
    { id: 'evidence', component: StepEvidence },
    { id: 'voice', component: StepVoice },
    { id: 'confirm', component: StepConfirmation },
];

// Total de pasos para el indicador: 1 (identificación) + 4 (flujo original) = 5
const TOTAL_STEPS = 1 + STEPS_AFTER_ID.length;

function WizardContent() {
    const {
        pasoActual,
        setPasoActual,
        siniestroId,
        isLoading,
        error,
        identificarCliente
    } = useClaim();

    const [direction, setDirection] = useState(1);

    const nextStep = () => {
        if (pasoActual < TOTAL_STEPS - 1) {
            setDirection(1);
            setPasoActual(prev => prev + 1);
        }
    };

    const prevStep = () => {
        if (pasoActual > 0) {
            setDirection(-1);
            setPasoActual(prev => prev - 1);
        }
    };

    // Cuando el StepIdentificacion completa, guardamos los datos y avanzamos
    const handleIdentificacionNext = async (
        cliente: { id: string; nombre_completo: string; rut: string; telefono: string | null; email: string | null; poliza_numero: string | null; vehiculos: { id: string; patente: string; marca: string; modelo: string; anio: number | null; color: string | null }[] },
        vehiculo: { id: string; patente: string; marca: string; modelo: string; anio: number | null; color: string | null }
    ) => {
        await identificarCliente(cliente, vehiculo);
        // El siniestro se crea via useEffect en ClaimContext.
        // Avanzamos al siguiente paso directamente.
        setDirection(1);
        setPasoActual(1);
    };

    // Error de creación de siniestro (pasos 1+ en adelante)
    if (error && pasoActual > 0) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="text-center space-y-4 bg-white p-8 rounded-xl shadow-lg max-w-sm w-full">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                        <Loader2 className="w-8 h-8 text-red-500" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">Error de Conexión</h3>
                    <p className="text-sm text-gray-500">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition"
                    >
                        Reintentar
                    </button>
                    <p className="text-xs text-gray-400 mt-2">
                        Verifique su conexión a internet.
                    </p>
                </div>
            </div>
        );
    }

    // Loading de creación de siniestro (solo en pasos posteriores a identificación)
    if (pasoActual > 0 && !siniestroId && isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center space-y-3">
                    <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto" />
                    <p className="text-gray-500">Iniciando reporte...</p>
                </div>
            </div>
        );
    }

    // Determinar qué componente mostrar
    const isIdentificacionStep = pasoActual === 0;
    const currentRegularStepIndex = pasoActual - 1; // índice en STEPS_AFTER_ID
    const CurrentRegularComponent = !isIdentificacionStep
        ? STEPS_AFTER_ID[currentRegularStepIndex]?.component
        : null;

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
            {/* Minimal Header */}
            <header className="px-6 py-4 bg-white border-b border-gray-100 flex justify-between items-center sticky top-0 z-50">
                <span className="text-sm font-bold text-gray-400">
                    {pasoActual === 0
                        ? 'LiquidApp'
                        : `Siniestro #${siniestroId ? siniestroId.slice(0, 8).toUpperCase() : '...'}`
                    }
                </span>
                {/* Indicador de progreso: 5 puntos */}
                <div className="flex gap-1">
                    {Array.from({ length: TOTAL_STEPS }).map((_, index) => (
                        <div
                            key={index}
                            className={`h-2 rounded-full transition-all duration-300 ${index === pasoActual
                                ? 'w-8 bg-blue-600'
                                : index < pasoActual
                                    ? 'w-2 bg-blue-300'
                                    : 'w-2 bg-gray-200'
                                }`}
                        />
                    ))}
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-grow flex flex-col p-4 max-w-lg mx-auto w-full relative overflow-hidden">
                <AnimatePresence mode="wait" custom={direction}>
                    <motion.div
                        key={pasoActual}
                        custom={direction}
                        initial={{ x: direction * 50, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: direction * -50, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="flex-grow flex flex-col h-full"
                    >
                        {isIdentificacionStep ? (
                            <StepIdentificacion onNext={handleIdentificacionNext} />
                        ) : CurrentRegularComponent ? (
                            <CurrentRegularComponent onNext={nextStep} onBack={prevStep} />
                        ) : null}
                    </motion.div>
                </AnimatePresence>
            </main>
        </div>
    );
}

export default function ClaimWizardPage() {
    return (
        <ClaimProvider>
            <WizardContent />
        </ClaimProvider>
    );
}
