// Rate limiting in-memory simple
// Reinicia con cada deploy/restart del servidor
// Para producción con múltiples instancias, considerar Upstash Redis

interface RateLimitEntry {
    count: number;
    resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

export function checkRateLimit(
    identifier: string,
    limit: number = 10,
    windowMs: number = 60_000
): { success: boolean; remaining: number; resetAt: number } {
    const now = Date.now();
    const entry = store.get(identifier);

    if (!entry || now > entry.resetAt) {
        store.set(identifier, { count: 1, resetAt: now + windowMs });
        return { success: true, remaining: limit - 1, resetAt: now + windowMs };
    }

    if (entry.count >= limit) {
        return { success: false, remaining: 0, resetAt: entry.resetAt };
    }

    entry.count++;
    return { success: true, remaining: limit - entry.count, resetAt: entry.resetAt };
}

// Limpiar entradas expiradas cada 5 minutos para evitar memory leaks
if (typeof setInterval !== 'undefined') {
    setInterval(() => {
        const now = Date.now();
        for (const [key, entry] of Array.from(store.entries())) {
            if (now > entry.resetAt) store.delete(key);
        }
    }, 5 * 60_000);
}
