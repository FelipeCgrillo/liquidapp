'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Lock, Shield, Eye, Server, CheckCircle2 } from 'lucide-react';

const securityFeatures = [
    {
        icon: <Lock className="w-5 h-5" />,
        title: 'Encriptación End-to-End',
        description: 'Todas las imágenes y datos viajan encriptados con TLS 1.3.',
    },
    {
        icon: <Eye className="w-5 h-5" />,
        title: 'URLs Firmadas',
        description: 'Las evidencias fotográficas solo son accesibles con tokens temporales de 1 hora.',
    },
    {
        icon: <Server className="w-5 h-5" />,
        title: 'Infraestructura Segura',
        description: 'Datos alojados en Supabase con RLS (Row Level Security) en cada tabla.',
    },
];

const complianceBadges = [
    'Ley 19.628 (Chile)',
    'Estándares HIPAA',
    'Protección de Datos GDPR',
    'Auditoría Continua',
];

export default function SecuritySection() {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: '-100px' });

    return (
        <section id="security" className="relative py-24 lg:py-32">
            {/* Fondo con gradiente */}
            <div className="absolute inset-0 bg-gradient-to-b from-dark-950 via-dark-900 to-dark-950" />
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-dark-700/50 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-dark-700/50 to-transparent" />

            <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
                <div className="grid lg:grid-cols-2 gap-16 items-center">
                    {/* Lado Izquierdo — Contenido */}
                    <motion.div
                        ref={ref}
                        initial={{ opacity: 0, x: -30 }}
                        animate={isInView ? { opacity: 1, x: 0 } : {}}
                        transition={{ duration: 0.6 }}
                        className="space-y-8"
                    >
                        <div>
                            <span className="text-sm font-semibold text-green-400 uppercase tracking-wider">
                                Seguridad y Cumplimiento
                            </span>
                            <h2 className="mt-4 text-3xl md:text-4xl font-extrabold text-dark-50 tracking-tight">
                                Datos sensibles protegidos{' '}
                                <span className="text-green-400">siempre</span>
                            </h2>
                            <p className="mt-4 text-dark-400 leading-relaxed">
                                Tratamos cada imagen y dato personal con el máximo nivel de
                                seguridad. Cumplimos con la normativa chilena e internacional
                                para protección de información sensible.
                            </p>
                        </div>

                        {/* Features */}
                        <div className="space-y-5">
                            {securityFeatures.map((feature, index) => (
                                <motion.div
                                    key={feature.title}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={isInView ? { opacity: 1, x: 0 } : {}}
                                    transition={{ duration: 0.4, delay: 0.3 + index * 0.1 }}
                                    className="flex items-start gap-4"
                                >
                                    <div className="p-2.5 rounded-xl bg-green-500/10 text-green-400 shrink-0 mt-0.5">
                                        {feature.icon}
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-dark-100">{feature.title}</h4>
                                        <p className="text-sm text-dark-400 mt-1">{feature.description}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>

                    {/* Lado Derecho — Badges */}
                    <motion.div
                        initial={{ opacity: 0, x: 30 }}
                        animate={isInView ? { opacity: 1, x: 0 } : {}}
                        transition={{ duration: 0.6, delay: 0.3 }}
                        className="flex justify-center"
                    >
                        <div className="glass-card rounded-3xl p-10 max-w-md w-full space-y-8">
                            {/* Escudo central */}
                            <div className="flex justify-center">
                                <div className="relative">
                                    <div className="p-6 rounded-3xl bg-green-500/10 text-green-400">
                                        <Shield className="w-16 h-16" />
                                    </div>
                                    <div className="absolute inset-0 bg-green-500/5 blur-2xl rounded-full" />
                                </div>
                            </div>

                            {/* Lista de compliance */}
                            <div className="space-y-4">
                                {complianceBadges.map((badge, index) => (
                                    <motion.div
                                        key={badge}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={isInView ? { opacity: 1, y: 0 } : {}}
                                        transition={{ duration: 0.3, delay: 0.5 + index * 0.1 }}
                                        className="flex items-center gap-3 px-4 py-3 rounded-xl bg-dark-800/50 border border-dark-700/50"
                                    >
                                        <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
                                        <span className="text-sm font-medium text-dark-200">{badge}</span>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
