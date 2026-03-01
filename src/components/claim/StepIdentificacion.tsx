'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Car, ChevronRight, Loader2, AlertCircle, CheckCircle2, User, FileText, Phone } from 'lucide-react';

// Tipos locales para este componente
interface VehiculoAsegurado {
    id: string;
    patente: string;
    marca: string;
    modelo: string;
    anio: number | null;
    color: string | null;
}

interface ClienteAsegurado {
    id: string;
    nombre_completo: string;
    rut: string;
    telefono: string | null;
    email: string | null;
    poliza_numero: string | null;
    vehiculos: VehiculoAsegurado[];
}

interface StepIdentificacionProps {
    onNext: (cliente: ClienteAsegurado, vehiculo: VehiculoAsegurado) => void;
}

// Formatea el RUT al escribir: "12345678" → "12.345.678-"
function formatearRutInput(valor: string): string {
    // Eliminar todo excepto números y K/k
    let limpio = valor.replace(/[^0-9kK]/g, '').toUpperCase();
    if (limpio.length === 0) return '';

    // Separar cuerpo y dígito verificador
    const dv = limpio.length > 1 ? limpio.slice(-1) : '';
    const cuerpo = limpio.length > 1 ? limpio.slice(0, -1) : limpio;

    // Agregar puntos al cuerpo
    const cuerpoConPuntos = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

    return dv ? `${cuerpoConPuntos}-${dv}` : cuerpoConPuntos;
}

export default function StepIdentificacion({ onNext }: StepIdentificacionProps) {
    const [rutInput, setRutInput] = useState('');
    const [buscando, setBuscando] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [cliente, setCliente] = useState<ClienteAsegurado | null>(null);
    const [vehiculoSeleccionado, setVehiculoSeleccionado] = useState<VehiculoAsegurado | null>(null);

    // Paso interno: 'rut' | 'vehiculo' | 'confirmar'
    type SubPaso = 'rut' | 'vehiculo' | 'confirmar';
    const [subPaso, setSubPaso] = useState<SubPaso>('rut');

    const handleRutChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formateado = formatearRutInput(e.target.value);
        setRutInput(formateado);
        setError(null);
    };

    const buscarCliente = async () => {
        if (!rutInput || rutInput.length < 3) {
            setError('Ingrese su RUT completo.');
            return;
        }

        setBuscando(true);
        setError(null);

        try {
            const res = await fetch(`/api/buscar-cliente?rut=${encodeURIComponent(rutInput)}`);
            const json = await res.json();

            if (!res.ok) {
                setError(json.error || 'No se encontró el RUT en nuestra base de datos.');
                return;
            }

            setCliente(json.cliente);

            // Si solo tiene 1 vehículo, pre-seleccionarlo
            if (json.cliente.vehiculos?.length === 1) {
                setVehiculoSeleccionado(json.cliente.vehiculos[0]);
                setSubPaso('confirmar');
            } else {
                setSubPaso('vehiculo');
            }
        } catch {
            setError('Error de conexión. Verifique su red e intente nuevamente.');
        } finally {
            setBuscando(false);
        }
    };

    const seleccionarVehiculo = (v: VehiculoAsegurado) => {
        setVehiculoSeleccionado(v);
        setSubPaso('confirmar');
    };

    const confirmarYContinuar = () => {
        if (cliente && vehiculoSeleccionado) {
            onNext(cliente, vehiculoSeleccionado);
        }
    };

    return (
        <div className="flex flex-col h-full py-4">
            {/* Encabezado */}
            <div className="mb-8 text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <User className="w-8 h-8 text-blue-600" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">Identificación</h1>
                <p className="text-gray-500 text-sm mt-1">
                    {subPaso === 'rut' && 'Ingrese su RUT para verificar su póliza'}
                    {subPaso === 'vehiculo' && 'Seleccione el vehículo involucrado en el siniestro'}
                    {subPaso === 'confirmar' && 'Confirme sus datos antes de continuar'}
                </p>
            </div>

            <div className="flex-grow">
                <AnimatePresence mode="wait">

                    {/* Sub-paso 1: Ingresar RUT */}
                    {subPaso === 'rut' && (
                        <motion.div
                            key="rut"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="space-y-5"
                        >
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    RUT del Asegurado
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={rutInput}
                                        onChange={handleRutChange}
                                        onKeyDown={(e) => e.key === 'Enter' && buscarCliente()}
                                        placeholder="12.345.678-9"
                                        maxLength={12}
                                        inputMode="numeric"
                                        className="w-full border-2 border-gray-200 rounded-xl px-4 py-4 text-xl font-mono tracking-widest text-center text-gray-900 placeholder:text-gray-300 bg-white focus:outline-none focus:border-blue-500 transition-colors"
                                        disabled={buscando}
                                    />
                                </div>
                                <p className="text-xs text-gray-400 mt-2 text-center">
                                    Ingrese el RUT sin puntos ni guión, se formateará automáticamente
                                </p>
                            </div>

                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4"
                                >
                                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                    <p className="text-sm text-red-700">{error}</p>
                                </motion.div>
                            )}

                            <button
                                onClick={buscarCliente}
                                disabled={buscando || !rutInput}
                                className="w-full bg-blue-600 text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {buscando ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Verificando...
                                    </>
                                ) : (
                                    <>
                                        <Search className="w-5 h-5" />
                                        Verificar RUT
                                    </>
                                )}
                            </button>

                            {/* Nota de privacidad */}
                            <p className="text-xs text-gray-400 text-center leading-relaxed">
                                🔒 Sus datos son confidenciales y se usan exclusivamente para verificar su póliza de seguro.
                            </p>
                        </motion.div>
                    )}

                    {/* Sub-paso 2: Seleccionar Vehículo */}
                    {subPaso === 'vehiculo' && cliente && (
                        <motion.div
                            key="vehiculo"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="space-y-4"
                        >
                            {/* Info del cliente */}
                            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center gap-3">
                                <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0" />
                                <div>
                                    <p className="font-semibold text-gray-900 text-sm">{cliente.nombre_completo}</p>
                                    {cliente.poliza_numero && (
                                        <p className="text-xs text-gray-500">Póliza: {cliente.poliza_numero}</p>
                                    )}
                                </div>
                            </div>

                            <p className="text-sm font-semibold text-gray-700">
                                Vehículos asegurados ({cliente.vehiculos.length})
                            </p>

                            <div className="space-y-3">
                                {cliente.vehiculos.map((v) => (
                                    <button
                                        key={v.id}
                                        onClick={() => seleccionarVehiculo(v)}
                                        className="w-full bg-white border-2 border-gray-200 rounded-xl p-4 text-left hover:border-blue-400 hover:bg-blue-50 active:scale-98 transition-all group"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                                                    <Car className="w-5 h-5 text-gray-600 group-hover:text-blue-600" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-900">
                                                        {v.marca} {v.modelo}
                                                    </p>
                                                    <p className="text-sm text-gray-500">
                                                        {v.anio && `${v.anio} • `}{v.color && `${v.color} • `}
                                                        <span className="font-mono font-semibold text-blue-700">{v.patente}</span>
                                                    </p>
                                                </div>
                                            </div>
                                            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500" />
                                        </div>
                                    </button>
                                ))}
                            </div>

                            <button
                                onClick={() => { setSubPaso('rut'); setCliente(null); }}
                                className="w-full text-sm text-gray-500 py-2 hover:text-gray-700 transition-colors"
                            >
                                ← Buscar otro RUT
                            </button>
                        </motion.div>
                    )}

                    {/* Sub-paso 3: Confirmar */}
                    {subPaso === 'confirmar' && cliente && vehiculoSeleccionado && (
                        <motion.div
                            key="confirmar"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="space-y-4"
                        >
                            <div className="bg-green-50 border border-green-200 rounded-xl p-5 space-y-4">
                                <div className="flex items-center gap-2 text-green-700 font-semibold text-sm mb-1">
                                    <CheckCircle2 className="w-5 h-5" />
                                    Identidad verificada
                                </div>

                                {/* Datos del Asegurado */}
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-gray-500 text-xs font-semibold uppercase tracking-wider">
                                        <User className="w-3.5 h-3.5" />
                                        Asegurado
                                    </div>
                                    <p className="font-bold text-gray-900">{cliente.nombre_completo}</p>
                                    <p className="text-sm text-gray-500 font-mono">{cliente.rut}</p>
                                    {cliente.telefono && (
                                        <div className="flex items-center gap-1 text-sm text-gray-500">
                                            <Phone className="w-3.5 h-3.5" />
                                            {cliente.telefono}
                                        </div>
                                    )}
                                    {cliente.poliza_numero && (
                                        <div className="flex items-center gap-1 text-sm text-gray-500">
                                            <FileText className="w-3.5 h-3.5" />
                                            Póliza: {cliente.poliza_numero}
                                        </div>
                                    )}
                                </div>

                                <div className="border-t border-green-200 pt-3 space-y-2">
                                    <div className="flex items-center gap-2 text-gray-500 text-xs font-semibold uppercase tracking-wider">
                                        <Car className="w-3.5 h-3.5" />
                                        Vehículo involucrado
                                    </div>
                                    <p className="font-bold text-gray-900">
                                        {vehiculoSeleccionado.marca} {vehiculoSeleccionado.modelo}
                                        {vehiculoSeleccionado.anio && ` (${vehiculoSeleccionado.anio})`}
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        <span className="font-mono font-semibold text-blue-700">{vehiculoSeleccionado.patente}</span>
                                        {vehiculoSeleccionado.color && ` • ${vehiculoSeleccionado.color}`}
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={confirmarYContinuar}
                                className="w-full bg-blue-600 text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-blue-700 active:scale-95 transition-all"
                            >
                                Confirmar e Iniciar Reporte
                                <ChevronRight className="w-5 h-5" />
                            </button>

                            {cliente.vehiculos.length > 1 && (
                                <button
                                    onClick={() => setSubPaso('vehiculo')}
                                    className="w-full text-sm text-gray-500 py-2 hover:text-gray-700 transition-colors"
                                >
                                    ← Cambiar vehículo
                                </button>
                            )}
                        </motion.div>
                    )}

                </AnimatePresence>
            </div>
        </div>
    );
}
