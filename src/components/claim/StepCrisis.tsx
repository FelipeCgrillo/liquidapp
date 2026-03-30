'use client';

import { motion } from 'framer-motion';
import { Car, AlertTriangle, Shield } from 'lucide-react';
import type { TipoEvento } from '@/types';

interface StepCrisisProps {
    onNext: (tipoEvento: TipoEvento) => void;
}

const OPCIONES: { id: TipoEvento; label: string; sublabel: string; icon: typeof Car; color: string; bgColor: string; borderColor: string }[] = [
    {
        id: 'choque',
        label: 'Tuve un choque',
        sublabel: 'Colisión con otro vehículo u objeto',
        icon: Car,
        color: 'text-orange-600',
        bgColor: 'bg-orange-50 hover:bg-orange-100',
        borderColor: 'border-orange-200 hover:border-orange-400',
    },
    {
        id: 'solo',
        label: 'Accidente solo',
        sublabel: 'Sin otro vehículo involucrado',
        icon: AlertTriangle,
        color: 'text-amber-600',
        bgColor: 'bg-amber-50 hover:bg-amber-100',
        borderColor: 'border-amber-200 hover:border-amber-400',
    },
    {
        id: 'robo',
        label: 'Robo o hurto',
        sublabel: 'Mi vehículo fue robado o vandalizado',
        icon: Shield,
        color: 'text-red-600',
        bgColor: 'bg-red-50 hover:bg-red-100',
        borderColor: 'border-red-200 hover:border-red-400',
    },
];

export default function StepCrisis({ onNext }: StepCrisisProps) {
    return (
        <div className="flex flex-col h-full py-6">
            {/* Encabezado empático */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-center mb-10"
            >
                <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-5 shadow-lg shadow-blue-600/30">
                    <Shield className="w-10 h-10 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 leading-tight">
                    Tuviste un accidente.
                    <br />
                    <span className="text-blue-600">Te ayudamos.</span>
                </h1>
                <p className="text-gray-500 text-sm mt-3 max-w-xs mx-auto">
                    Vamos a resolver esto juntos. Selecciona qué ocurrió para guiarte paso a paso.
                </p>
            </motion.div>

            {/* Opciones */}
            <div className="flex-grow flex flex-col gap-4">
                {OPCIONES.map((opcion, index) => {
                    const Icon = opcion.icon;
                    return (
                        <motion.button
                            key={opcion.id}
                            initial={{ opacity: 0, x: -30 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.4, delay: 0.2 + index * 0.1 }}
                            onClick={() => onNext(opcion.id)}
                            className={`w-full border-2 rounded-2xl p-5 text-left transition-all duration-200 active:scale-[0.98] ${opcion.bgColor} ${opcion.borderColor}`}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-white shadow-sm`}>
                                    <Icon className={`w-6 h-6 ${opcion.color}`} />
                                </div>
                                <div>
                                    <p className="font-bold text-gray-900 text-lg">{opcion.label}</p>
                                    <p className="text-sm text-gray-500">{opcion.sublabel}</p>
                                </div>
                            </div>
                        </motion.button>
                    );
                })}
            </div>

            {/* Nota de confianza */}
            <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="text-xs text-gray-400 text-center mt-6 leading-relaxed"
            >
                🔒 Tu información es confidencial y está protegida.
                <br />
                Este proceso toma menos de 5 minutos.
            </motion.p>
        </div>
    );
}
