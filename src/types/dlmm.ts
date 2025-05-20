// src/types/dlmm.ts

export interface LpPosition {
  address: string;
  pair_address: string;
  owner: string;

  total_fee_usd_claimed: number;
  total_reward_usd_claimed: number;
  fee_apy_24h: number;
  fee_apr_24h: number;
  daily_fee_yield: number;

  lowerBinId: number;
  upperBinId: number;
  binStep: number;
  tokenXMint: string;
  tokenYMint: string;
  tokenXDecimals: number;
  tokenYDecimals: number;
  
  // Raw amounts are now string representations of BigInt/BN from backend
  totalXAmount: string; 
  totalYAmount: string;
  pendingFeeX: string;
  pendingFeeY: string;
  pendingRewards: { mint: string; amount: string }[];

  // UI formatted amounts
  totalXAmountUi: string;
  totalYAmountUi: string;
  pendingFeeXUi: string;
  pendingFeeYUi: string;
  pendingRewardsUi: { mint: string; amount: string }[];
  
  priceRange: string;
  totalValueInSol: string; // Value in SOL
  totalValueUsd?: string; // Optional: Total value in USD, if backend provides it
  isInRange?: boolean; // Optional, if backend calculates this
  // Add any other fields that the backend might return and are useful for the UI
}

// Summary object structure returned by the backend
export interface LpTotalSummary {
    totalLiquidityValueUsd: number;
    totalClaimedFeesUsd: number;
    totalUnclaimedFeesUsd: number;
    totalPositions: number;
    inRangePositions: number;
    totalInitialValueUsd: number;
    // Add other summary fields if PnL calculation is moved to backend
    // totalPnLUsd?: number;
    // totalPnLPercentage?: number;
}