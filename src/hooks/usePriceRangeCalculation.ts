import { useState, useEffect, useCallback } from 'react';
import debounce from 'lodash.debounce';
import apiClient from '@/lib/api';
import { StrategyType } from '@meteora-ag/dlmm';

interface Pool {
  poolAddress: string;
  binStep: number;
  current_price: number;
  // Include other necessary pool properties
}

interface PriceRangeResult {
  minPrice: string;
  maxPrice: string;
  minBinId: number;
  maxBinId: number;
}

interface UsePriceRangeCalculation {
  calculatedPriceRange: PriceRangeResult | null;
  calculationLoading: boolean;
  calculationError: string | null;
}

export function usePriceRangeCalculation(
  selectedPool: Pool | null,
  totalSolValue: string,
  solDepositRatioPercent: string,
  strategyType: keyof typeof StrategyType
): UsePriceRangeCalculation {
  const [calculatedPriceRange, setCalculatedPriceRange] = useState<PriceRangeResult | null>(null);
  const [calculationLoading, setCalculationLoading] = useState(false);
  const [calculationError, setCalculationError] = useState<string | null>(null);

  const calculatePriceRange = useCallback(
    debounce(async () => {
      console.log('[usePriceRangeCalculation] Called. selectedPool:', selectedPool, 'totalSolValue:', totalSolValue, 'solDepositRatioPercent:', solDepositRatioPercent, 'strategyType:', strategyType);
      const parsedTotalSolValue = parseFloat(totalSolValue);
      if (!selectedPool || !totalSolValue || isNaN(parsedTotalSolValue) || parsedTotalSolValue <= 0 || solDepositRatioPercent === undefined || !strategyType || selectedPool.current_price === undefined) {
        console.log('[usePriceRangeCalculation] Conditions not met (e.g., totalSolValue invalid or other params missing), setting calculatedPriceRange to null.');
        setCalculatedPriceRange(null);
        setCalculationError(null); // Clear error if conditions are not met
        return;
      }
      setCalculationLoading(true);
      setCalculationError(null);
      try {
        const response = await apiClient.post('/api/dlmm/calculate-price-range', {
          poolAddress: selectedPool.poolAddress,
          currentPrice: selectedPool.current_price.toString(),
          binStep: selectedPool.binStep,
          solDepositRatioPercent: solDepositRatioPercent,
          strategyType: strategyType,
        });
        setCalculatedPriceRange(response.data);
      } catch (error: any) {
        console.error('Failed to calculate price range (usePriceRangeCalculation):', error);
        setCalculationError(`가격 범위 계산 실패: ${error.response?.data?.message || error.message}`);
        setCalculatedPriceRange(null);
      } finally {
        setCalculationLoading(false);
      }
    }, 500),
    [selectedPool, totalSolValue, solDepositRatioPercent, strategyType]
  );

  useEffect(() => {
    calculatePriceRange();
    return () => {
      calculatePriceRange.cancel();
    };
  }, [selectedPool, totalSolValue, solDepositRatioPercent, strategyType, calculatePriceRange]);

  return {
    calculatedPriceRange,
    calculationLoading,
    calculationError,
  };
}
