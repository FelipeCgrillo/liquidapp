import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

interface UseSignedUrlResult {
    getSignedUrl: (path: string, bucket?: string, expiresIn?: number) => Promise<string | null>;
    isLoading: boolean;
    error: string | null;
}

export function useSignedUrl(): UseSignedUrlResult {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const getSignedUrl = useCallback(async (
        path: string,
        bucket: string = 'evidencias-siniestros',
        expiresIn: number = 3600
    ): Promise<string | null> => {
        if (!path) return null;

        setIsLoading(true);
        setError(null);
        const supabase = createClient();

        try {
            const { data, error } = await supabase.storage
                .from(bucket)
                .createSignedUrl(path, expiresIn);

            if (error) throw error;
            return data?.signedUrl || null;
        } catch (err: any) {
            console.error('Error generating signed URL:', err);
            setError(err.message || 'Error generating signed URL');
            return null;
        } finally {
            setIsLoading(false);
        }
    }, []);

    return { getSignedUrl, isLoading, error };
}
