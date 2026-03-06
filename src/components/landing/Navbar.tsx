'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ShieldCheck, LogIn, Menu, X } from 'lucide-react';

export default function Navbar() {
    const [scrolled, setScrolled] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const navLinks = [
        { label: 'Motor IA', href: '#features' },
        { label: 'Proceso', href: '#workflow' },
        { label: 'Seguridad', href: '#security' },
    ];

    return (
        <motion.nav
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled
                    ? 'glass-nav shadow-lg shadow-black/20'
                    : 'bg-transparent'
                }`}
        >
            <div className="max-w-7xl mx-auto px-6 lg:px-8">
                <div className="flex items-center justify-between h-16 lg:h-20">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-3 group">
                        <div className="relative">
                            <ShieldCheck className="w-8 h-8 text-brand-400 transition-colors group-hover:text-brand-300" />
                            <div className="absolute inset-0 bg-brand-500/20 blur-lg rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <span className="text-xl font-bold text-dark-50 tracking-tight">
                            Liquid<span className="text-gradient-blue">App</span>
                        </span>
                    </Link>

                    {/* Desktop Links */}
                    <div className="hidden md:flex items-center gap-8">
                        {navLinks.map((link) => (
                            <a
                                key={link.href}
                                href={link.href}
                                className="text-sm font-medium text-dark-400 hover:text-dark-100 transition-colors relative group"
                            >
                                {link.label}
                                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-brand-500 group-hover:w-full transition-all duration-300" />
                            </a>
                        ))}
                    </div>

                    {/* CTA + Mobile Toggle */}
                    <div className="flex items-center gap-4">
                        <Link
                            href="/login"
                            className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-dark-300 border border-dark-700 hover:border-brand-600 hover:text-brand-400 transition-all"
                        >
                            <LogIn className="w-4 h-4" />
                            Acceso Admin
                        </Link>

                        {/* Mobile hamburger */}
                        <button
                            onClick={() => setMobileOpen(!mobileOpen)}
                            className="md:hidden p-2 text-dark-400 hover:text-dark-100"
                        >
                            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            {mobileOpen && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="md:hidden glass-nav border-t border-dark-700/50"
                >
                    <div className="px-6 py-4 space-y-3">
                        {navLinks.map((link) => (
                            <a
                                key={link.href}
                                href={link.href}
                                onClick={() => setMobileOpen(false)}
                                className="block text-sm font-medium text-dark-400 hover:text-dark-100 py-2"
                            >
                                {link.label}
                            </a>
                        ))}
                        <Link
                            href="/login"
                            className="flex items-center gap-2 text-sm font-medium text-brand-400 py-2"
                        >
                            <LogIn className="w-4 h-4" />
                            Acceso Admin
                        </Link>
                    </div>
                </motion.div>
            )}
        </motion.nav>
    );
}
