import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';

export default function Footer() {
    return (
        <footer className="relative py-12">
            {/* Separador superior */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-dark-700/50 to-transparent" />

            <div className="max-w-7xl mx-auto px-6 lg:px-8">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2">
                        <ShieldCheck className="w-6 h-6 text-brand-500" />
                        <span className="text-lg font-bold text-dark-200">
                            Liquid<span className="text-gradient-blue">App</span>
                        </span>
                    </Link>

                    {/* Links */}
                    <div className="flex items-center gap-6">
                        <a href="#features" className="text-sm text-dark-500 hover:text-dark-300 transition-colors">
                            Motor IA
                        </a>
                        <a href="#workflow" className="text-sm text-dark-500 hover:text-dark-300 transition-colors">
                            Proceso
                        </a>
                        <a href="#security" className="text-sm text-dark-500 hover:text-dark-300 transition-colors">
                            Seguridad
                        </a>
                        <Link href="/login" className="text-sm text-dark-500 hover:text-dark-300 transition-colors">
                            Admin
                        </Link>
                    </div>

                    {/* Copyright */}
                    <p className="text-sm text-dark-600">
                        © 2026 LiquidApp. Todos los derechos reservados.
                    </p>
                </div>
            </div>
        </footer>
    );
}
