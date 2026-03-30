'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Users, Heart, ChevronRight } from 'lucide-react';
import type { TipoImpacto } from '@/types';

interface StepQueOcurrioProps {
    tipoEvento: 'choque' | 'solo' | 'robo';
    onNext: (data: {
        tipoImpacto: TipoImpacto;
        hayHeridos: boolean;
        hayTerceros: boolean;
    }) => void;
    onBack: () => void;
}

const TIPOS_IMPACTO: { id: TipoImpacto; label: string; emoji: string }[] = [
    { id: 'frontal', label: 'Frontal', emoji: '⬆️' },
    { id: 'lateral', label: 'Lateral', emoji: '➡️' },
    { id: 'trasero', label: 'Trasero', emoji: '⬇️' },
    { id: 'volcamiento', label: 'Volcamiento', emoji: '🔄' },
    { id: 'multiple', label: 'Múltiple', emoji: '💥' },
];

export default function StepQueOcurrio({ tipoEvento, onNext, onBack }: StepQueOcurrioProps) {
    const [tipoImpacto, setTipoImpacto] = useState<TipoImpacto | null>(null);
    const [hayHeridos, setHayHeridos] = useState<boolean | null>(null);
    const [hayTerceros, setHayTerceros] = useState<boolean | null>(null);

    // Para robo, saltar las preguntas de impacto y terceros
    const esRobo = tipoEvento === 'robo';
    const esSolo = tipoEvento === 'solo';

    const canContinue = esRobo
        ? hayHeridos !== null
        : tipoImpacto !== null && hayHeridos !== null && (esSolo || hayTerceros !== null);

    const handleContinuar = () => {
        if (!canContinue) return;
        onNext({
            tipoImpacto: esRobo ? 'multiple' : tipoImpacto!,
            hayHeridos: hayHeridos!,
            hayTerceros: esRobo || esSolo ? false : hayTerceros!,
        });
    };

    return (
        <div className="flex flex-col h-full py-4">
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-6"
            >
                <h1 className="text-2xl font-bold text-gray-900">¿Qué pasó?</h1>
                <p className="text-gray-500 text-sm mt-1">
                    Necesitamos algunos detalles para evaluar tu caso
                </p>
            </motion.div>

            <div className="flex-grow space-y-6 overflow-y-auto">
                {/* Tipo de impacto (no aparece en robo) */}
                {!esRobo && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                            ¿Cómo fue el impacto?
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {TIPOS_IMPACTO.map((tipo) => (
                                <button
                                    key={tipo.id}
                                    onClick={() => setTipoImpacto(tipo.id)}
                                    className={`p-3 rounded-xl border-2 text-center transition-all active:scale-95 ${tipoImpacto === tipo.id
                                        ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                                        : 'border-gray-200 bg-white hover:border-gray-300'
                                        }`}
                                >
                                    <span className="text-2xl block mb-1">{tipo.emoji}</span>
                                    <span className={`text-xs font-semibold ${tipoImpacto === tipo.id ? 'text-blue-700' : 'text-gray-600'
                                        }`}>
                                        {tipo.label}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* ¿Hay heridos? */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <Heart className="w-4 h-4 text-red-400" />
                        ¿Hay personas heridas?
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => setHayHeridos(false)}
                            className={`p-4 rounded-xl border-2 font-semibold transition-all active:scale-95 ${hayHeridos === false
                                ? 'border-green-500 bg-green-50 text-green-700 ring-2 ring-green-200'
                                : 'border-gray-200 text-gray-600 hover:border-gray-300'
                                }`}
                        >
                            No, todos están bien
                        </button>
                        <button
                            onClick={() => setHayHeridos(true)}
                            className={`p-4 rounded-xl border-2 font-semibold transition-all active:scale-95 ${hayHeridos === true
                                ? 'border-red-500 bg-red-50 text-red-700 ring-2 ring-red-200'
                                : 'border-gray-200 text-gray-600 hover:border-gray-300'
                                }`}
                        >
                            Sí, hay heridos
                        </button>
                    </div>
                    {hayHeridos === true && (
                        <motion.p
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3 mt-3"
                        >
                            ⚠️ Si hay personas heridas, llama al <strong>131 (SAMU)</strong> o <strong>133 (Carabineros)</strong> inmediatamente.
                        </motion.p>
                    )}
                </motion.div>

                {/* ¿Otro vehículo involucrado? (solo para choques) */}
                {!esRobo && !esSolo && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                            <Users className="w-4 h-4 text-blue-400" />
                            ¿Hay otro vehículo involucrado?
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setHayTerceros(false)}
                                className={`p-4 rounded-xl border-2 font-semibold transition-all active:scale-95 ${hayTerceros === false
                                    ? 'border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-200'
                                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                                    }`}
                            >
                                No, solo yo
                            </button>
                            <button
                                onClick={() => setHayTerceros(true)}
                                className={`p-4 rounded-xl border-2 font-semibold transition-all active:scale-95 ${hayTerceros === true
                                    ? 'border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-200'
                                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                                    }`}
                            >
                                Sí, otro vehículo
                            </button>
                        </div>
                    </motion.div>
                )}
            </div>

            {/* Botones */}
            <div className="flex gap-3 mt-6">
                <button
                    onClick={onBack}
                    className="flex-1 py-4 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition-colors"
                >
                    Atrás
                </button>
                <button
                    onClick={handleContinuar}
                    disabled={!canContinue}
                    className="flex-[2] py-4 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center gap-2 hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    Continuar
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
}
