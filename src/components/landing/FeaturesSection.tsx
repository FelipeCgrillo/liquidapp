'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { ShieldAlert, Activity, DollarSign } from 'lucide-react';

const features = [
    {
        icon: <ShieldAlert className="w-8 h-8" />,
        title: 'IA Antifraude',
        description:
            'Análisis de cada imagen con score de fraude 0.0 a 1.0. Detecta inconsistencias, manipulación de fotos y patrones sospechosos automáticamente.',
        color: 'text-red-400',
        bgColor: 'bg-red-500/10',
        borderHover: 'hover:border-red-500/30',
    },
    {
        icon: <Activity className="w-8 h-8" />,
        title: 'Triage Automático',
        description:
            'Clasificación inmediata de severidad: leve, moderado, grave o pérdida total. Identifica partes dañadas y genera descripción técnica del daño.',
        color: 'text-brand-400',
        bgColor: 'bg-brand-500/10',
        borderHover: 'hover:border-brand-500/30',
    },
    {
        icon: <DollarSign className="w-8 h-8" />,
        title: 'Costos en Segundos',
        description:
            'Estimación instantánea de costos de reparación en CLP con desglose por pieza. Rango min/max basado en precios de mercado chileno.',
        color: 'text-accent-400',
        bgColor: 'bg-accent-500/10',
        borderHover: 'hover:border-accent-500/30',
    },
];

export default function FeaturesSection() {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: '-100px' });

    return (
        <section id="features" className="relative py-24 lg:py-32">
            {/* Orbe decorativo */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-600/5 rounded-full blur-[150px]" />

            <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
                {/* Encabezado */}
                <motion.div
                    ref={ref}
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6 }}
                    className="text-center max-w-2xl mx-auto mb-16"
                >
                    <span className="text-sm font-semibold text-brand-400 uppercase tracking-wider">
                        Motor de Inteligencia Artificial
                    </span>
                    <h2 className="mt-4 text-3xl md:text-4xl lg:text-5xl font-extrabold text-dark-50 tracking-tight">
                        Cada foto pasa por{' '}
                        <span className="text-gradient-blue">tres capas de IA</span>
                    </h2>
                    <p className="mt-4 text-lg text-dark-400 leading-relaxed">
                        Análisis automático que transforma una simple fotografía en un peritaje técnico completo.
                    </p>
                </motion.div>

                {/* Cards */}
                <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
                    {features.map((feature, index) => (
                        <motion.div
                            key={feature.title}
                            initial={{ opacity: 0, y: 30 }}
                            animate={isInView ? { opacity: 1, y: 0 } : {}}
                            transition={{ duration: 0.5, delay: 0.2 + index * 0.15 }}
                            className={`glass-card rounded-2xl p-8 group cursor-default ${feature.borderHover}`}
                        >
                            {/* Icono */}
                            <div className={`inline-flex p-4 rounded-2xl ${feature.bgColor} ${feature.color} mb-6 transition-transform group-hover:scale-110`}>
                                {feature.icon}
                            </div>

                            {/* Contenido */}
                            <h3 className="text-xl font-bold text-dark-50 mb-3">
                                {feature.title}
                            </h3>
                            <p className="text-dark-400 leading-relaxed text-sm">
                                {feature.description}
                            </p>

                            {/* Barra decorativa inferior */}
                            <div className="mt-6 h-1 w-12 rounded-full bg-dark-700 group-hover:w-full transition-all duration-500">
                                <div className={`h-full rounded-full ${feature.bgColor} w-full`} />
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
