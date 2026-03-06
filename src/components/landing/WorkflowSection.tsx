'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Camera, Brain, FileText } from 'lucide-react';

const steps = [
    {
        number: '01',
        icon: <Camera className="w-7 h-7" />,
        title: 'Reportar',
        description: 'El asegurado saca fotos del siniestro desde su celular. Guías visuales ayudan a capturar los ángulos correctos.',
        color: 'text-brand-400',
        bg: 'bg-brand-500/10',
    },
    {
        number: '02',
        icon: <Brain className="w-7 h-7" />,
        title: 'Analizar',
        description: 'La IA procesa cada imagen: detecta fraude, evalúa severidad, identifica partes dañadas y estima costos de reparación.',
        color: 'text-accent-400',
        bg: 'bg-accent-500/10',
    },
    {
        number: '03',
        icon: <FileText className="w-7 h-7" />,
        title: 'Resolver',
        description: 'Se genera un pre-informe técnico automático. El liquidador lo revisa, firma digitalmente y cierra el caso.',
        color: 'text-green-400',
        bg: 'bg-green-500/10',
    },
];

export default function WorkflowSection() {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: '-100px' });

    return (
        <section id="workflow" className="relative py-24 lg:py-32 overflow-hidden">
            {/* Fondo */}
            <div className="absolute inset-0 bg-gradient-to-b from-dark-900/0 via-dark-900/50 to-dark-900/0" />

            <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
                {/* Encabezado */}
                <motion.div
                    ref={ref}
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6 }}
                    className="text-center max-w-2xl mx-auto mb-20"
                >
                    <span className="text-sm font-semibold text-accent-400 uppercase tracking-wider">
                        Proceso Simplificado
                    </span>
                    <h2 className="mt-4 text-3xl md:text-4xl lg:text-5xl font-extrabold text-dark-50 tracking-tight">
                        Del siniestro al informe en{' '}
                        <span className="text-gradient-accent">3 pasos</span>
                    </h2>
                </motion.div>

                {/* Timeline */}
                <div className="relative">
                    {/* Línea conectora (desktop) */}
                    <div className="hidden md:block absolute top-[60px] left-[16.66%] right-[16.66%] h-[2px]">
                        <div className="progress-line w-full h-full" />
                    </div>

                    <div className="grid md:grid-cols-3 gap-12 md:gap-8">
                        {steps.map((step, index) => (
                            <motion.div
                                key={step.number}
                                initial={{ opacity: 0, y: 30 }}
                                animate={isInView ? { opacity: 1, y: 0 } : {}}
                                transition={{ duration: 0.5, delay: 0.3 + index * 0.2 }}
                                className="relative text-center"
                            >
                                {/* Número + Icono */}
                                <div className="relative inline-flex flex-col items-center mb-8">
                                    <div className={`w-[120px] h-[120px] rounded-3xl ${step.bg} flex items-center justify-center mb-4 relative`}>
                                        <div className={`${step.color}`}>
                                            {step.icon}
                                        </div>
                                        {/* Punto de conexión */}
                                        <div className={`absolute -bottom-2 w-4 h-4 rounded-full bg-dark-950 border-2 ${step.color.replace('text-', 'border-')} hidden md:block`} />
                                    </div>
                                    <span className={`text-5xl font-black ${step.color} opacity-20 absolute -top-4 -right-4`}>
                                        {step.number}
                                    </span>
                                </div>

                                {/* Contenido */}
                                <h3 className="text-xl font-bold text-dark-50 mb-3">
                                    {step.title}
                                </h3>
                                <p className="text-dark-400 leading-relaxed text-sm max-w-xs mx-auto">
                                    {step.description}
                                </p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
