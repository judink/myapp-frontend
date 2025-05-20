import { useState, useCallback } from 'react';
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
  minPrice: string; // Include minPrice and maxPrice as they are passed to the backend
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
  swapQuote: any | null; // Define a more specific type if possible
}

interface UseAssetCheck {
  assetCheckResult: AssetCheckResult | null;
  assetCheckLoading: boolean;
  assetCheckError: string | null;
  handleAssetCheck: (
    selectedPool: Pool | null,
    tokenCaInput: string,
    totalSolValue: string,
    solDepositRatioPercent: string,
    strategyType: keyof typeof StrategyType,
    calculatedPriceRange: PriceRangeResult | null
  ) => Promise<void>;
  setAssetCheckResult: (result: AssetCheckResult | null) => void; // Allow resetting from outside
  setAssetCheckError: (error: string | null) => void; // Allow setting error from outside
}

export function useAssetCheck(): UseAssetCheck {
  const [assetCheckResult, setAssetCheckResult] = useState<AssetCheckResult | null>(null);
  const [assetCheckLoading, setAssetCheckLoading] = useState(false);
  const [assetCheckError, setAssetCheckError] = useState<string | null>(null);

  const handleAssetCheck = useCallback(
    async (
      selectedPool: Pool | null,
      tokenCaInput: string,
      totalSolValue: string,
      solDepositRatioPercent: string,
      strategyType: keyof typeof StrategyType,
      calculatedPriceRange: PriceRangeResult | null
    ) => {
      if (!selectedPool || !tokenCaInput || !totalSolValue || solDepositRatioPercent === undefined || !strategyType || !calculatedPriceRange || calculatedPriceRange.minBinId === undefined || calculatedPriceRange.maxBinId === undefined) {
        setAssetCheckError('모든 필수 정보를 입력하고 가격 범위를 계산해주세요.');
        return;
      }
      setAssetCheckLoading(true);
        setAssetCheckError(null);
        setAssetCheckResult(null);
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
            executeLpCreation: false, // Indicate this is an asset check, not execution
          });
          // Check for the new status field
          if (response.data && response.data.status === 'success') {
              setAssetCheckResult(response.data as AssetCheckResult);
              // Note: The component using this hook will handle the step transition based on the result
          } else {
              // Handle cases where status is not 'success' or response structure is unexpected
              console.error('Asset Check Failed: Unexpected response structure or status', response.data);
              setAssetCheckError(`자산 확인 실패: 예상치 못한 응답 형식`);
          }
        } catch (error: any) {
          console.error('Asset Check Failed (useAssetCheck):', error);
          setAssetCheckError(`자산 확인 실패: ${error.response?.data?.message || error.message}`);
        } finally {
          setAssetCheckLoading(false);
        }
      },
      [] // Dependencies: This function depends on parameters passed to it, not external state
    );

  return {
    assetCheckResult,
    assetCheckLoading,
    assetCheckError,
    handleAssetCheck,
    setAssetCheckResult,
    setAssetCheckError,
  };
}
