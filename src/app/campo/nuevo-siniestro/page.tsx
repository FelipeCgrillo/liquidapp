'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Car, User, FileText, MapPin, Loader2, ArrowRight, ChevronLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import type { NuevoSiniestroForm } from '@/types';

const TIPOS_SINIESTRO = [
    { value: 'colision', label: '💥 Colisión' },
    { value: 'robo', label: '🔓 Robo / Hurto' },
    { value: 'incendio', label: '🔥 Incendio' },
    { value: 'granizo', label: '🌨️ Granizo' },
    { value: 'inundacion', label: '🌊 Inundación' },
    { value: 'vandalismo', label: '⚠️ Vandalismo' },
    { value: 'atropello', label: '🚶 Atropello' },
    { value: 'otro', label: '📋 Otro' },
];

export default function NuevoSiniestroPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [obtenendoUbicacion, setObtenendoUbicacion] = useState(false);
    const [ubicacion, setUbicacion] = useState<{ lat: number; lng: number; direccion?: string } | null>(null);

    const [form, setForm] = useState<NuevoSiniestroForm>({
        patente: '',
        marca: '',
        modelo: '',
        anio: undefined,
        color: '',
        nombre_asegurado: '',
        rut_asegurado: '',
        telefono_asegurado: '',
        poliza_numero: '',
        tipo_siniestro: 'colision',
        descripcion: '',
    });

    const actualizarCampo = (campo: keyof NuevoSiniestroForm, valor: string | number) => {
        setForm((prev) => ({ ...prev, [campo]: valor }));
    };

    const obtenerUbicacion = () => {
        setObtenendoUbicacion(true);
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const { latitude, longitude } = pos.coords;
                setUbicacion({ lat: latitude, lng: longitude });
                // Intentar geocodificación inversa
                try {
                    const resp = await fetch(
                        `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
                    );
                    const data = await resp.json();
                    setUbicacion({
                        lat: latitude,
                        lng: longitude,
                        direccion: data.display_name,
                    });
                } catch {
                    // Si falla la geocodificación, usar coordenadas
                }
                setObtenendoUbicacion(false);
                toast.success('Ubicación capturada correctamente');
            },
            (error) => {
                setObtenendoUbicacion(false);
                toast.error('No se pudo obtener la ubicación: ' + error.message);
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.patente || !form.nombre_asegurado) {
            toast.error('Completa los campos obligatorios: patente y nombre del asegurado');
            return;
        }

        setLoading(true);
        try {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();

            // Generar número de siniestro
            const { data: numData } = await supabase.rpc('generar_numero_siniestro');

            const { data: siniestro, error } = await supabase
                .from('siniestros')
                .insert({
                    numero_siniestro: numData || `SIN-${Date.now()}`,
                    patente: form.patente.toUpperCase().replace(/\s/g, ''),
                    marca: form.marca,
                    modelo: form.modelo,
                    anio: form.anio,
                    color: form.color,
                    nombre_asegurado: form.nombre_asegurado,
                    rut_asegurado: form.rut_asegurado,
                    telefono_asegurado: form.telefono_asegurado,
                    poliza_numero: form.poliza_numero,
                    tipo_siniestro: form.tipo_siniestro,
                    descripcion: form.descripcion,
                    latitud: ubicacion?.lat,
                    longitud: ubicacion?.lng,
                    direccion: ubicacion?.direccion,
                    liquidador_campo_id: user?.id || null,
                    estado: 'borrador',
                })
                .select()
                .single();

            if (error) throw error;

            toast.success(`Siniestro ${siniestro.numero_siniestro} creado`);
            router.push(`/campo/siniestro/${siniestro.id}/evidencias`);
        } catch (error) {
            console.error(error);
            toast.error('Error al crear el siniestro');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-dark-950 pb-8">
            {/* Header */}
            <div className="glass-dark sticky top-0 z-10 safe-top">
                <div className="flex items-center gap-3 px-4 py-4">
                    <button
                        onClick={() => router.back()}
                        className="p-2 rounded-xl hover:bg-dark-700 transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5 text-dark-300" />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-white">Nuevo Siniestro</h1>
                        <p className="text-xs text-dark-400">Completa los datos del vehículo y asegurado</p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="px-4 pt-6 space-y-6 max-w-2xl mx-auto">
                {/* Tipo de siniestro */}
                <div className="card">
                    <div className="flex items-center gap-2 mb-4">
                        <FileText className="w-5 h-5 text-brand-400" />
                        <h2 className="font-semibold text-white">Tipo de Siniestro</h2>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        {TIPOS_SINIESTRO.map((tipo) => (
                            <button
                                key={tipo.value}
                                type="button"
                                onClick={() => actualizarCampo('tipo_siniestro', tipo.value)}
                                className={`p-3 rounded-xl text-sm font-medium transition-all text-left ${form.tipo_siniestro === tipo.value
                                    ? 'bg-brand-700 text-white border border-brand-500'
                                    : 'bg-dark-800 text-dark-300 border border-dark-700 hover:border-dark-500'
                                    }`}
                            >
                                {tipo.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Datos del vehículo */}
                <div className="card">
                    <div className="flex items-center gap-2 mb-4">
                        <Car className="w-5 h-5 text-brand-400" />
                        <h2 className="font-semibold text-white">Datos del Vehículo</h2>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-dark-300 mb-2">
                                Patente <span className="text-accent-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={form.patente}
                                onChange={(e) => actualizarCampo('patente', e.target.value)}
                                className="input-base uppercase"
                                placeholder="ABCD12"
                                required
                                maxLength={8}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-dark-300 mb-2">Marca</label>
                                <input
                                    type="text"
                                    value={form.marca}
                                    onChange={(e) => actualizarCampo('marca', e.target.value)}
                                    className="input-base"
                                    placeholder="Toyota"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-dark-300 mb-2">Modelo</label>
                                <input
                                    type="text"
                                    value={form.modelo}
                                    onChange={(e) => actualizarCampo('modelo', e.target.value)}
                                    className="input-base"
                                    placeholder="Corolla"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-dark-300 mb-2">Año</label>
                                <input
                                    type="number"
                                    value={form.anio || ''}
                                    onChange={(e) => actualizarCampo('anio', parseInt(e.target.value))}
                                    className="input-base"
                                    placeholder="2020"
                                    min={1990}
                                    max={new Date().getFullYear() + 1}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-dark-300 mb-2">Color</label>
                                <input
                                    type="text"
                                    value={form.color}
                                    onChange={(e) => actualizarCampo('color', e.target.value)}
                                    className="input-base"
                                    placeholder="Blanco"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Datos del asegurado */}
                <div className="card">
                    <div className="flex items-center gap-2 mb-4">
                        <User className="w-5 h-5 text-brand-400" />
                        <h2 className="font-semibold text-white">Datos del Asegurado</h2>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-dark-300 mb-2">
                                Nombre Completo <span className="text-accent-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={form.nombre_asegurado}
                                onChange={(e) => actualizarCampo('nombre_asegurado', e.target.value)}
                                className="input-base"
                                placeholder="Juan Pérez González"
                                required
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-dark-300 mb-2">RUT</label>
                                <input
                                    type="text"
                                    value={form.rut_asegurado}
                                    onChange={(e) => actualizarCampo('rut_asegurado', e.target.value)}
                                    className="input-base"
                                    placeholder="12.345.678-9"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-dark-300 mb-2">Teléfono</label>
                                <input
                                    type="tel"
                                    value={form.telefono_asegurado}
                                    onChange={(e) => actualizarCampo('telefono_asegurado', e.target.value)}
                                    className="input-base"
                                    placeholder="+56 9 1234 5678"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-dark-300 mb-2">N° de Póliza</label>
                            <input
                                type="text"
                                value={form.poliza_numero}
                                onChange={(e) => actualizarCampo('poliza_numero', e.target.value)}
                                className="input-base"
                                placeholder="POL-2024-001234"
                            />
                        </div>
                    </div>
                </div>

                {/* Ubicación */}
                <div className="card">
                    <div className="flex items-center gap-2 mb-4">
                        <MapPin className="w-5 h-5 text-brand-400" />
                        <h2 className="font-semibold text-white">Ubicación del Siniestro</h2>
                    </div>
                    {ubicacion ? (
                        <div className="bg-green-900/20 border border-green-700/30 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                                <span className="text-green-400 text-sm font-medium">Ubicación capturada</span>
                            </div>
                            <p className="text-dark-300 text-xs">
                                {ubicacion.direccion || `${ubicacion.lat.toFixed(6)}, ${ubicacion.lng.toFixed(6)}`}
                            </p>
                            <button
                                type="button"
                                onClick={obtenerUbicacion}
                                className="mt-2 text-xs text-brand-400 hover:text-brand-300"
                            >
                                Actualizar ubicación
                            </button>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={obtenerUbicacion}
                            disabled={obtenendoUbicacion}
                            className="btn-secondary w-full"
                        >
                            {obtenendoUbicacion ? (
                                <><Loader2 className="w-4 h-4 animate-spin" /> Obteniendo ubicación...</>
                            ) : (
                                <><MapPin className="w-4 h-4" /> Capturar Ubicación GPS</>
                            )}
                        </button>
                    )}
                </div>

                {/* Descripción */}
                <div className="card">
                    <label className="block text-sm font-medium text-dark-300 mb-2">
                        Descripción del Siniestro
                    </label>
                    <textarea
                        value={form.descripcion}
                        onChange={(e) => actualizarCampo('descripcion', e.target.value)}
                        className="input-base resize-none"
                        rows={4}
                        placeholder="Describe brevemente cómo ocurrió el siniestro..."
                    />
                </div>

                {/* Botón submit */}
                <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary w-full py-4 text-base"
                >
                    {loading ? (
                        <><Loader2 className="w-5 h-5 animate-spin" /> Creando siniestro...</>
                    ) : (
                        <><ArrowRight className="w-5 h-5" /> Continuar a Captura de Evidencias</>
                    )}
                </button>
            </form>
        </div>
    );
}
