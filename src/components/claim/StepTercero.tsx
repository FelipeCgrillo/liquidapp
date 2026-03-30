'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Car, Phone, Building2, ChevronRight, Camera, Loader2, CheckCircle, X, ScanLine } from 'lucide-react';
import type { DatosTercero } from '@/types';

interface StepTerceroProps {
    onNext: (datos: DatosTercero) => void;
    onBack: () => void;
}

interface OCRResultado {
    tipo_documento: string;
    datos_persona: {
        nombre_completo: string | null;
        rut: string | null;
    };
    datos_vehiculo: {
        patente: string | null;
        marca: string | null;
        modelo: string | null;
    };
    aseguradora: string | null;
    confianza_lectura: number;
}

export default function StepTercero({ onNext, onBack }: StepTerceroProps) {
    const [datos, setDatos] = useState<DatosTercero>({
        nombre: '',
        patente: '',
        aseguradora: '',
        telefono: '',
    });

    const [ocrLoading, setOcrLoading] = useState(false);
    const [ocrSuccess, setOcrSuccess] = useState(false);
    const [ocrError, setOcrError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleChange = (field: keyof DatosTercero, value: string) => {
        setDatos(prev => ({ ...prev, [field]: value }));
    };

    const canContinue = (datos.patente?.trim().length ?? 0) >= 4;

    const handleContinuar = () => {
        if (!canContinue) return;
        onNext(datos);
    };

    // ─── OCR de documento ────────────────────────────────────────────────────

    const handleOCRCapture = () => {
        fileInputRef.current?.click();
    };

    const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setOcrLoading(true);
        setOcrError(null);
        setOcrSuccess(false);

        try {
            // Convertir a base64
            const base64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = () => reject(new Error('Error leyendo archivo'));
                reader.readAsDataURL(file);
            });

            // Llamar API OCR
            const response = await fetch('/api/ocr-documento', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imagen_base64: base64 }),
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Error en el OCR');
            }

            const data = await response.json();
            const resultado: OCRResultado = data.resultado;

            // Rellenar campos con datos del OCR
            setDatos(prev => ({
                nombre: resultado.datos_persona?.nombre_completo || prev.nombre,
                patente: resultado.datos_vehiculo?.patente || prev.patente,
                aseguradora: resultado.aseguradora || prev.aseguradora,
                telefono: prev.telefono, // No viene del OCR
            }));

            setOcrSuccess(true);
            setTimeout(() => setOcrSuccess(false), 3000);

        } catch (error) {
            setOcrError(error instanceof Error ? error.message : 'Error procesando documento');
        } finally {
            setOcrLoading(false);
            // Resetear input para permitir re-captura
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const CAMPOS: { key: keyof DatosTercero; label: string; placeholder: string; icon: typeof User; inputMode?: 'text' | 'tel' }[] = [
        { key: 'nombre', label: 'Nombre del otro conductor', placeholder: 'Juan Pérez', icon: User },
        { key: 'patente', label: 'Patente del otro vehículo', placeholder: 'AB-CD-12', icon: Car },
        { key: 'aseguradora', label: 'Compañía de seguros', placeholder: 'Ej: Sura, Liberty, HDI...', icon: Building2 },
        { key: 'telefono', label: 'Teléfono de contacto', placeholder: '+56 9 1234 5678', icon: Phone, inputMode: 'tel' },
    ];

    return (
        <div className="flex flex-col h-full py-4">
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-6"
            >
                <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <User className="w-8 h-8 text-purple-600" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">Datos del otro conductor</h1>
                <p className="text-gray-500 text-sm mt-1">
                    Completa lo que puedas. Al menos la patente nos ayuda mucho.
                </p>
            </motion.div>

            <div className="flex-grow space-y-4 overflow-y-auto">
                {CAMPOS.map((campo, index) => {
                    const Icon = campo.icon;
                    return (
                        <motion.div
                            key={campo.key}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.08 }}
                        >
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                                <Icon className="w-3.5 h-3.5 text-gray-400" />
                                {campo.label}
                                {campo.key === 'patente' && (
                                    <span className="text-red-400 text-xs">*</span>
                                )}
                            </label>
                            <input
                                type="text"
                                inputMode={campo.inputMode || 'text'}
                                value={(datos[campo.key] as string) || ''}
                                onChange={(e) => handleChange(campo.key, e.target.value)}
                                placeholder={campo.placeholder}
                                className={`w-full border-2 rounded-xl px-4 py-3 text-gray-900 placeholder:text-gray-300 bg-white focus:outline-none transition-colors ${campo.key === 'patente'
                                    ? 'font-mono uppercase tracking-wider text-center text-lg focus:border-purple-500'
                                    : 'focus:border-blue-500'
                                    } border-gray-200`}
                            />
                        </motion.div>
                    );
                })}

                {/* Input oculto para captura de archivo */}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleFileSelected}
                />

                {/* Botón OCR funcional */}
                <motion.button
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className={`w-full border-2 rounded-xl p-4 text-center transition-all group relative overflow-hidden ${
                        ocrSuccess
                            ? 'border-green-400 bg-green-50'
                            : ocrError
                            ? 'border-red-300 bg-red-50'
                            : 'border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                    }`}
                    onClick={handleOCRCapture}
                    disabled={ocrLoading}
                >
                    <AnimatePresence mode="wait">
                        {ocrLoading ? (
                            <motion.div
                                key="loading"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex flex-col items-center"
                            >
                                <Loader2 className="w-6 h-6 text-blue-500 animate-spin mx-auto mb-1" />
                                <p className="text-sm font-medium text-blue-600">Leyendo documento...</p>
                                <div className="mt-2 w-full h-1 bg-blue-100 rounded-full overflow-hidden">
                                    <motion.div
                                        className="h-full bg-blue-500 rounded-full"
                                        initial={{ width: '0%' }}
                                        animate={{ width: '90%' }}
                                        transition={{ duration: 4, ease: 'easeOut' }}
                                    />
                                </div>
                            </motion.div>
                        ) : ocrSuccess ? (
                            <motion.div
                                key="success"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex flex-col items-center"
                            >
                                <CheckCircle className="w-6 h-6 text-green-500 mx-auto mb-1" />
                                <p className="text-sm font-medium text-green-600">
                                    ✓ Datos capturados del documento
                                </p>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="default"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                            >
                                <div className="flex items-center justify-center gap-2 mb-1">
                                    <ScanLine className="w-5 h-5 text-gray-400 group-hover:text-blue-500" />
                                    <Camera className="w-5 h-5 text-gray-400 group-hover:text-blue-500" />
                                </div>
                                <p className="text-sm font-medium text-gray-500 group-hover:text-blue-600">
                                    Escanear carnet, licencia o permiso de circulación
                                </p>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    Captura automática: completamos los campos por ti
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.button>

                {/* Error OCR */}
                {ocrError && (
                    <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2"
                    >
                        <X className="w-4 h-4 flex-shrink-0" />
                        <p>{ocrError}</p>
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
