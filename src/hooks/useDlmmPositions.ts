import { useState, useEffect, useCallback, useRef } from 'react';
import { PublicKey } from '@solana/web3.js';
import apiClient from '@/lib/api'; // Ensure apiClient is correctly set up
import { LpPosition, LpTotalSummary } from '@/types/dlmm'; // Import updated types

interface DlmmPositionsHook {
    positions: LpPosition[];
    isLoading: boolean;
    error: string | null;
    totalSummary: LpTotalSummary; // Use the defined summary type
    fetchPositions: () => Promise<void>;
}

const initialTotalSummary: LpTotalSummary = {
    totalLiquidityValueUsd: 0,
    totalClaimedFeesUsd: 0,
    totalUnclaimedFeesUsd: 0,
    totalPositions: 0,
    inRangePositions: 0,
    totalInitialValueUsd: 0,
};

export const useDlmmPositions = (userPublicKey: PublicKey | null | undefined): DlmmPositionsHook => {
    const [positions, setPositions] = useState<LpPosition[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [totalSummary, setTotalSummary] = useState<LpTotalSummary>(initialTotalSummary);
    
    // Ref to track if initial fetch has occurred for the current userPublicKey
    const initialFetchDoneRef = useRef<boolean>(false);
    const currentPublicKeyRef = useRef<string | null>(null);


    const fetchPositions = useCallback(async () => {
        if (!userPublicKey) {
            setPositions([]);
            setTotalSummary(initialTotalSummary);
            setError(null);
            setIsLoading(false);
            initialFetchDoneRef.current = false; // Reset for next user
            currentPublicKeyRef.current = null;
            return;
        }

        console.log(`[useDlmmPositions] Fetching positions for ${userPublicKey.toBase58()}`);
        setIsLoading(true);
        setError(null);

        try {
            // Backend endpoint now returns { positions: LpPosition[], totalSummary: LpTotalSummary }
            const response = await apiClient.get<{ positions: LpPosition[], totalSummary: LpTotalSummary }>('/api/dlmm/positions');
            
            if (response.data && Array.isArray(response.data.positions) && response.data.totalSummary) {
                setPositions(response.data.positions);
                setTotalSummary(response.data.totalSummary);
                console.log('[useDlmmPositions] Positions and summary fetched successfully:', response.data);
            } else {
                console.error('[useDlmmPositions] Invalid data structure from backend:', response.data);
                setError('Failed to parse LP positions data from server.');
                setPositions([]);
                setTotalSummary(initialTotalSummary);
            }
        } catch (e: any) {
            console.error('[useDlmmPositions] Error fetching user positions:', e);
            setError(e.response?.data?.message || e.message || 'Failed to fetch LP positions list.');
            setPositions([]); // Clear positions on error
            setTotalSummary(initialTotalSummary); // Reset summary on error
        } finally {
            setIsLoading(false);
            initialFetchDoneRef.current = true; // Mark initial fetch as done for this user
            currentPublicKeyRef.current = userPublicKey.toBase58();
        }
    }, [userPublicKey]); // Dependency on userPublicKey for useCallback

    useEffect(() => {
        const pkString = userPublicKey?.toBase58() || null;

        if (pkString) {
            // Fetch if userPublicKey is present and either:
            // 1. It's a new publicKey (user changed).
            // 2. It's the same publicKey but initial fetch wasn't done (e.g., component remounted).
            if (currentPublicKeyRef.current !== pkString || !initialFetchDoneRef.current) {
                fetchPositions();
            }
        } else {
            // User logged out or publicKey became null
            setPositions([]);
            setTotalSummary(initialTotalSummary);
            setError(null);
            setIsLoading(false);
            initialFetchDoneRef.current = false;
            currentPublicKeyRef.current = null;
        }
    }, [userPublicKey, fetchPositions]);

    return { positions, isLoading, error, totalSummary, fetchPositions };
};