'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Clock, Target, FileCheck } from 'lucide-react';

interface StatItemProps {
    icon: React.ReactNode;
    value: string;
    label: string;
    delay: number;
}

function StatItem({ icon, value, label, delay }: StatItemProps) {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: '-50px' });

    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay }}
            className="flex items-center gap-4 px-6 py-4"
        >
            <div className="p-3 rounded-xl bg-brand-600/10 text-brand-400">
                {icon}
            </div>
            <div>
                <span className="text-2xl md:text-3xl font-extrabold text-dark-50 tracking-tight">
                    {value}
                </span>
                <p className="text-sm text-dark-400 font-medium">{label}</p>
            </div>
        </motion.div>
    );
}

export default function StatsBar() {
    return (
        <section className="relative py-8">
            <div className="max-w-7xl mx-auto px-6 lg:px-8">
                <div className="glass-card rounded-2xl divide-x divide-dark-700/50 grid grid-cols-1 md:grid-cols-3">
                    <StatItem
                        icon={<Clock className="w-6 h-6" />}
                        value="< 3 min"
                        label="Tiempo promedio de análisis"
                        delay={0}
                    />
                    <StatItem
                        icon={<Target className="w-6 h-6" />}
                        value="99.2%"
                        label="Precisión en detección de daños"
                        delay={0.15}
                    />
                    <StatItem
                        icon={<FileCheck className="w-6 h-6" />}
                        value="+12,000"
                        label="Siniestros procesados"
                        delay={0.3}
                    />
                </div>
            </div>
        </section>
    );
}
