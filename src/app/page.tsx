import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ShieldCheck, Phone, Ambulance, Car, LogIn } from 'lucide-react';

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-white flex flex-col font-sans">
            {/* Header */}
            <header className="px-6 py-4 flex justify-between items-center border-b border-gray-100">
                <div className="flex items-center space-x-2">
                    <ShieldCheck className="w-8 h-8 text-blue-900" />
                    <span className="text-xl font-bold text-blue-900">Seguros Banco de Chile</span>
                </div>
                <Link href="/login">
                    <Button variant="ghost" size="sm" className="text-gray-500">
                        <LogIn className="w-4 h-4 mr-2" />
                        Acceso Admin
                    </Button>
                </Link>
            </header>

            {/* Hero Section - Panic Mode */}
            <main className="flex-grow flex flex-col justify-center items-center px-6 py-10 space-y-12">
                <div className="text-center space-y-2">
                    <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
                        ¿Tuviste un siniestro?
                    </h1>
                    <p className="text-lg text-gray-500">
                        Estamos contigo. Reportalo en 3 simples pasos.
                    </p>
                </div>

                {/* Primary Action - Giant Button */}
                <Link href="/claim/wizard" className="w-full max-w-sm">
                    <Button
                        className="w-full h-32 text-2xl font-bold rounded-2xl shadow-xl bg-blue-700 hover:bg-blue-800 transition-all transform hover:scale-105 flex flex-col items-center justify-center gap-2"
                    >
                        <Car className="w-10 h-10" />
                        Iniciar Inspección
                    </Button>
                </Link>

                {/* Emergency Options */}
                <div className="w-full max-w-sm space-y-4">
                    <p className="text-center text-sm font-medium text-gray-400 uppercase tracking-wider">
                        ¿Necesitas asistencia inmediata?
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                        <Button variant="outline" className="h-16 flex flex-col items-center justify-center gap-1 border-red-100 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 hover:border-red-200">
                            <Phone className="w-6 h-6" />
                            <span className="text-xs font-semibold">Grúa</span>
                        </Button>
                        <Button variant="outline" className="h-16 flex flex-col items-center justify-center gap-1 border-red-100 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 hover:border-red-200">
                            <Ambulance className="w-6 h-6" />
                            <span className="text-xs font-semibold">Ambulancia</span>
                        </Button>
                    </div>
                </div>
            </main>

            {/* Basic Footer */}
            <footer className="py-6 text-center text-gray-400 text-sm">
                <p>© 2026 Banco de Chile Seguros</p>
            </footer>
        </div>
    );
}
