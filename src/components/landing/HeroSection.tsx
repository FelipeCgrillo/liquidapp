'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Car, Phone, Ambulance, Zap, ArrowRight } from 'lucide-react';

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.15, delayChildren: 0.3 },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' as const } },
};

export default function HeroSection() {
    return (
        <section className="relative min-h-screen flex items-center overflow-hidden pt-20">
            {/* Video de fondo (comprimido y recortado desde 1.5s) */}
            <video
                autoPlay
                muted
                loop
                playsInline
                preload="none"
                poster="/icons/videohero-poster.jpg"
                className="absolute inset-0 w-full h-full object-cover"
            >
                <source src="/icons/videohero-opt.mp4" type="video/mp4" />
            </video>

            {/* Overlay oscuro con gradiente para legibilidad */}
            <div className="absolute inset-0 bg-gradient-to-r from-dark-950/95 via-dark-950/80 to-dark-950/60" />
            <div className="absolute inset-0 bg-gradient-to-t from-dark-950 via-transparent to-dark-950/70" />

            {/* Viñeta sutil en bordes */}
            <div className="absolute inset-0" style={{ boxShadow: 'inset 0 0 150px 60px rgba(3,7,18,0.7)' }} />

            <div className="relative max-w-7xl mx-auto px-6 lg:px-8 py-20 lg:py-32 w-full">
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="max-w-3xl space-y-8"
                >
                    {/* Badge */}
                    <motion.div variants={itemVariants}>
                        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-card text-xs font-semibold text-brand-400 uppercase tracking-wider">
                            <Zap className="w-3.5 h-3.5" />
                            Inteligencia Artificial en Tiempo Real
                        </span>
                    </motion.div>

                    {/* Título */}
                    <motion.div variants={itemVariants} className="space-y-4">
                        <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold leading-[1.05] tracking-tight">
                            <span className="text-dark-50">Liquidación</span>
                            <br />
                            <span className="text-gradient-blue">Inteligente</span>
                            <br />
                            <span className="text-dark-300 text-4xl md:text-5xl lg:text-6xl font-bold">
                                de Siniestros
                            </span>
                        </h1>
                    </motion.div>

                    {/* Subtítulo */}
                    <motion.p
                        variants={itemVariants}
                        className="text-lg md:text-xl text-dark-400 max-w-xl leading-relaxed"
                    >
                        Peritaje automatizado con IA que detecta fraude, evalúa daños y estima
                        costos de reparación en{' '}
                        <span className="text-accent-400 font-semibold">segundos</span>, no días.
                    </motion.p>

                    {/* CTA Principal */}
                    <motion.div variants={itemVariants} className="flex flex-wrap items-center gap-4">
                        <Link href="/claim/wizard">
                            <button className="group relative px-8 py-4 bg-brand-600 hover:bg-brand-500 text-white text-lg font-bold rounded-2xl transition-all duration-300 flex items-center gap-3 glow-blue hover:glow-blue-strong active:scale-95">
                                <Car className="w-6 h-6" />
                                Iniciar Inspección
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </Link>
                    </motion.div>

                    {/* Acciones de Emergencia */}
                    <motion.div variants={itemVariants} className="flex items-center gap-4 pt-4">
                        <span className="text-xs font-medium text-dark-500 uppercase tracking-wider">
                            Emergencia:
                        </span>
                        <button className="flex items-center gap-2 px-4 py-2 rounded-xl glass-card text-red-400 hover:text-red-300 text-sm font-medium transition-colors">
                            <Phone className="w-4 h-4" />
                            Grúa
                        </button>
                        <button className="flex items-center gap-2 px-4 py-2 rounded-xl glass-card text-red-400 hover:text-red-300 text-sm font-medium transition-colors">
                            <Ambulance className="w-4 h-4" />
                            Ambulancia
                        </button>
                    </motion.div>
                </motion.div>
            </div>
        </section>
    );
}
