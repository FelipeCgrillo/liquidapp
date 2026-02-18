'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import StepGeolocation from '@/components/claim/StepGeolocation';
import StepEvidence from '@/components/claim/StepEvidence';
import StepVoice from '@/components/claim/StepVoice';
import StepConfirmation from '@/components/claim/StepConfirmation';

const STEPS = [
    { id: 'geo', component: StepGeolocation },
    { id: 'evidence', component: StepEvidence },
    { id: 'voice', component: StepVoice },
    { id: 'confirm', component: StepConfirmation },
];

export default function ClaimWizardPage() {
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [direction, setDirection] = useState(1);

    const nextStep = () => {
        if (currentStepIndex < STEPS.length - 1) {
            setDirection(1);
            setCurrentStepIndex(prev => prev + 1);
        }
    };

    const prevStep = () => {
        if (currentStepIndex > 0) {
            setDirection(-1);
            setCurrentStepIndex(prev => prev - 1);
        }
    };

    const CurrentComponent = STEPS[currentStepIndex].component;

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
            {/* Minimal Header */}
            <header className="px-6 py-4 bg-white border-b border-gray-100 flex justify-between items-center sticky top-0 z-50">
                <span className="text-sm font-bold text-gray-400">
                    Siniestro #TEMP-{Math.floor(Math.random() * 1000)}
                </span>
                <div className="flex gap-1">
                    {STEPS.map((_, index) => (
                        <div
                            key={index}
                            className={`h-2 rounded-full transition-all duration-300 ${index === currentStepIndex ? 'w-8 bg-blue-600' : 'w-2 bg-gray-200'}`}
                        />
                    ))}
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-grow flex flex-col p-4 max-w-lg mx-auto w-full relative overflow-hidden">
                <AnimatePresence mode="wait" custom={direction}>
                    <motion.div
                        key={currentStepIndex}
                        custom={direction}
                        initial={{ x: direction * 50, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: direction * -50, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="flex-grow flex flex-col h-full"
                    >
                        <CurrentComponent onNext={nextStep} onBack={prevStep} />
                    </motion.div>
                </AnimatePresence>
            </main>
        </div>
    );
}
