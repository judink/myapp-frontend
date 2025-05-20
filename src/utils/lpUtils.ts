import apiClient from '@/lib/api';
import { StrategyType } from '@meteora-ag/dlmm';

interface Pool {
  poolAddress: string;
  current_price: number; // Added current_price
  // Include other necessary pool properties
}

interface PriceRangeResult {
  minBinId: number;
  maxBinId: number;
  minPrice: string;
  maxPrice: string;
}

interface AssetCheckResult {
  needsSwap: boolean;
  requiredAssets: {
    solLamports: string;
    targetTokenLamports: string;
    tokenCa: string;
    tokenDecimals: number;
  };
  currentBalances: {
    solLamports: string;
    targetTokenLamports: string;
  };
  swapQuote: any | null;
}

/**
 * Executes the LP creation process by calling the backend API.
 * @param selectedPool - The selected pool object.
 * @param tokenCaInput - The target token mint address.
 * @param totalSolValue - The total value to deposit in SOL.
 * @param solDepositRatioPercent - The percentage of total value to deposit as SOL.
 * @param strategyType - The selected strategy type.
 * @param calculatedPriceRange - The calculated price range result.
 * @param assetCheckResult - The result from the asset check step.
 * @returns Promise resolving with the API response data on success.
 * @throws Error if the API call fails.
 */
export async function executeLpCreation(
  selectedPool: Pool,
  tokenCaInput: string,
  totalSolValue: string,
  solDepositRatioPercent: string,
  strategyType: keyof typeof StrategyType,
  calculatedPriceRange: PriceRangeResult,
  assetCheckResult: AssetCheckResult
): Promise<any> { // Define a more specific return type if possible
  if (!selectedPool || !tokenCaInput || !totalSolValue || solDepositRatioPercent === undefined || !strategyType || !calculatedPriceRange || !assetCheckResult) {
    throw new Error('Missing required parameters for LP creation execution.');
  }

  try {
      const response = await apiClient.post('/api/dlmm/lp/create', {
        poolAddress: selectedPool.poolAddress,
        tokenCa: tokenCaInput,
        totalSolValue: totalSolValue,
        solDepositRatioPercent: solDepositRatioPercent,
        strategyType: strategyType,
        currentPrice: selectedPool.current_price, // Pass current_price from frontend
        minBinId: calculatedPriceRange.minBinId, // These Bin IDs are for reference/logging on backend
        maxBinId: calculatedPriceRange.maxBinId, // These Bin IDs are for reference/logging on backend
        targetMinPrice: calculatedPriceRange.minPrice, // Pass target prices for backend calculation
        targetMaxPrice: calculatedPriceRange.maxPrice, // Pass target prices for backend calculation
        executeLpCreation: true, // Indicate this is the execution step
      });
      console.log('LP Creation Response (lpUtils):', response.data);
    return response.data;
  } catch (error: any) {
    console.error('LP Creation Failed (lpUtils):', error);
    const errorMessage = error.response?.data?.message || error.message;
    throw new Error(`LP 포지션 생성 실패: ${errorMessage}`);
  }
}
