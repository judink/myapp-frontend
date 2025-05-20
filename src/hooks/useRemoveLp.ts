import { useState } from 'react';
import { removeLiquidityPosition } from '@/lib/api'; // Adjust path as necessary

// Interface for the parameters of the removeLp mutation function
interface RemoveLpParams {
  positionAddress: string;
  poolAddress: string;
  bps?: number; // Optional: Basis points to remove (0-10000)
  shouldClaimAndClose?: boolean; // Optional: Whether to claim fees and close position
}

// Interface for the success data returned by the hook
interface RemoveLpData {
  message: string;
  signature: string;
  removedBps?: number;
  claimedAndClosed?: boolean;
}

// Interface for the hook's return value
interface UseRemoveLpReturn {
  removeLp: (params: RemoveLpParams) => Promise<void>;
  isLoading: boolean;
  error: any | null; // Can be more specific if backend error structure is known
  data: RemoveLpData | null;
  reset: () => void; // Function to reset state
}

/**
 * Custom hook to manage the state and logic for removing an LP position.
 *
 * @returns {UseRemoveLpReturn} An object containing the mutation function, loading state, error state, success data, and a reset function.
 */
export const useRemoveLp = (): UseRemoveLpReturn => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<any | null>(null);
  const [data, setData] = useState<RemoveLpData | null>(null);

  /**
   * Asynchronously calls the API to remove an LP position and updates state.
   * @param params - The parameters required for the LP removal API call.
   */
  const removeLp = async (params: RemoveLpParams) => {
    setIsLoading(true);
    setError(null);
    setData(null);
    try {
      console.log('[useRemoveLp] Attempting to remove LP with params:', params);
      const result = await removeLiquidityPosition(params);
      setData(result);
      console.log('[useRemoveLp] LP removal successful:', result);
    } catch (e: any) {
      console.error('[useRemoveLp] Error removing LP:', e);
      setError(e.message || e || 'An unknown error occurred during LP removal.');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Resets the hook's state (isLoading, error, data).
   */
  const reset = () => {
    setIsLoading(false);
    setError(null);
    setData(null);
  };

  return { removeLp, isLoading, error, data, reset };
};