'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import StepCrisis from '@/components/claim/StepCrisis';
import StepIdentificacion from '@/components/claim/StepIdentificacion';
import StepQueOcurrio from '@/components/claim/StepQueOcurrio';
import StepGeolocation from '@/components/claim/StepGeolocation';
import StepEvidence from '@/components/claim/StepEvidence';
import StepVoice from '@/components/claim/StepVoice';
import StepTercero from '@/components/claim/StepTercero';
import StepResolucion from '@/components/claim/StepResolucion';
import StepSeguimiento from '@/components/claim/StepSeguimiento';
import { ClaimProvider, useClaim } from '@/context/ClaimContext';
import { Loader2, Shield } from 'lucide-react';
import type { TipoEvento, TipoImpacto, DatosTercero } from '@/types';

/**
 * Wizard de 10 pasos para el asegurado:
 * 0 — Crisis (¿Qué te pasó?)
 * 1 — Tu identidad (RUT + vehículo)
 * 2 — ¿Qué pasó? (tipo impacto, heridos, terceros)
 * 3 — ¿Dónde ocurrió? (geolocalización)
 * 4 — Fotos del daño (evidencias)
 * 5 — Tu relato (audio o texto, obligatorio)
 * 6 — Datos del otro conductor (condicional: solo si hay terceros)
 * 7 — Resolución preliminar (resultado + envío)
 * 8 — Seguimiento (timeline)
 */

// Pasos fijos (sin crisis ni identificación que se manejan aparte)
enum Paso {
    Crisis = 0,
    Identidad = 1,
    QueOcurrio = 2,
    Ubicacion = 3,
    Fotos = 4,
    Relato = 5,
    Tercero = 6,
    Resolucion = 7,
    Seguimiento = 8,
}

const TOTAL_STEPS = 9; // 0-8

function WizardContent() {
    const {
        pasoActual,
        setPasoActual,
        siniestroId,
        isLoading,
        error,
        identificarCliente,
        tipoEvento,
        setTipoEvento,
        setTipoImpacto,
        setHayHeridos,
        hayTerceros,
        setHayTerceros,
        setDatosTercero,
    } = useClaim();

    const [direction, setDirection] = useState(1);

    const goTo = (paso: number) => {
        setDirection(paso > pasoActual ? 1 : -1);
        setPasoActual(paso);
    };

    const nextStep = () => {
        let siguiente = pasoActual + 1;
        // Saltear paso de tercero si no hay terceros involucrados
        if (siguiente === Paso.Tercero && !hayTerceros) {
            siguiente = Paso.Resolucion;
        }
        if (siguiente < TOTAL_STEPS) {
            goTo(siguiente);
        }
    };

    const prevStep = () => {
        let anterior = pasoActual - 1;
        // Saltear paso de tercero si no hay terceros al retroceder
        if (anterior === Paso.Tercero && !hayTerceros) {
            anterior = Paso.Relato;
        }
        if (anterior >= 0) {
            goTo(anterior);
        }
    };

    // Handlers de pasos especiales
    const handleCrisis = (tipo: TipoEvento) => {
        setTipoEvento(tipo);
        goTo(Paso.Identidad);
    };

    const handleIdentificacion = async (
        cliente: { id: string; nombre_completo: string; rut: string; telefono: string | null; email: string | null; poliza_numero: string | null; vehiculos: { id: string; patente: string; marca: string; modelo: string; anio: number | null; color: string | null }[] },
        vehiculo: { id: string; patente: string; marca: string; modelo: string; anio: number | null; color: string | null }
    ) => {
        await identificarCliente(cliente, vehiculo);
        goTo(Paso.QueOcurrio);
    };

    const handleQueOcurrio = (data: { tipoImpacto: TipoImpacto; hayHeridos: boolean; hayTerceros: boolean }) => {
        setTipoImpacto(data.tipoImpacto);
        setHayHeridos(data.hayHeridos);
        setHayTerceros(data.hayTerceros);
        goTo(Paso.Ubicacion);
    };

    const handleTercero = (datos: DatosTercero) => {
        setDatosTercero(datos);
        goTo(Paso.Resolucion);
    };

    // Error de creación de siniestro (pasos 2+ en adelante)
    if (error && pasoActual > Paso.Identidad) {
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
                        Verifica tu conexión a internet.
                    </p>
                </div>
            </div>
        );
    }

    // Loading de creación de siniestro
    if (pasoActual > Paso.Identidad && !siniestroId && isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center space-y-3">
                    <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto" />
                    <p className="text-gray-500">Iniciando tu reporte...</p>
                </div>
            </div>
        );
    }

    // Calcular pasos visibles para el indicador de progreso
    // Si no hay terceros, el indicador muestra 8 pasos en vez de 9
    const totalVisible = hayTerceros ? TOTAL_STEPS : TOTAL_STEPS - 1;
    const pasoVisible = pasoActual > Paso.Tercero && !hayTerceros
        ? pasoActual - 1
        : pasoActual;

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
            {/* Header — sin ID técnico */}
            <header className="px-6 py-4 bg-white border-b border-gray-100 flex justify-between items-center sticky top-0 z-50">
                <span className="text-sm font-bold text-gray-400 flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-blue-500" />
                    LiquidApp
                </span>
                {/* Indicador de progreso */}
                <div
                    className="flex gap-1"
                    role="progressbar"
                    aria-valuenow={pasoVisible}
                    aria-valuemin={0}
                    aria-valuemax={totalVisible - 1}
                    aria-label={`Paso ${pasoVisible + 1} de ${totalVisible}`}
                >
                    {Array.from({ length: totalVisible }).map((_, index) => (
                        <div
                            key={index}
                            aria-current={index === pasoVisible ? 'step' : undefined}
                            className={`h-2 rounded-full transition-all duration-300 ${index === pasoVisible
                                ? 'w-8 bg-blue-600'
                                : index < pasoVisible
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
                        {pasoActual === Paso.Crisis && (
                            <StepCrisis onNext={handleCrisis} />
                        )}
                        {pasoActual === Paso.Identidad && (
                            <StepIdentificacion onNext={handleIdentificacion} />
                        )}
                        {pasoActual === Paso.QueOcurrio && (
                            <StepQueOcurrio
                                tipoEvento={tipoEvento || 'choque'}
                                onNext={handleQueOcurrio}
                                onBack={prevStep}
                            />
                        )}
                        {pasoActual === Paso.Ubicacion && (
                            <StepGeolocation onNext={nextStep} onBack={prevStep} />
                        )}
                        {pasoActual === Paso.Fotos && (
                            <StepEvidence onNext={nextStep} onBack={prevStep} />
                        )}
                        {pasoActual === Paso.Relato && (
                            <StepVoice onNext={nextStep} onBack={prevStep} />
                        )}
                        {pasoActual === Paso.Tercero && hayTerceros && (
                            <StepTercero onNext={handleTercero} onBack={prevStep} />
                        )}
                        {pasoActual === Paso.Resolucion && (
                            <StepResolucion onNext={nextStep} onBack={prevStep} />
                        )}
                        {pasoActual === Paso.Seguimiento && (
                            <StepSeguimiento onBack={prevStep} />
                        )}
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
