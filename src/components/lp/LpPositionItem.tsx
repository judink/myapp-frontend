"use client";

import React, { useState } from 'react'; // Import useState
import { LpPosition } from '@/types/dlmm'; // Import the updated LpPosition type
import { PublicKey } from '@solana/web3.js'; // Import necessary Solana types
import useAuthStore from '@/store/authStore'; // Import useAuthStore
import Decimal from 'decimal.js'; // For calculations
import { removeLiquidityPosition } from '@/lib/api'; // Import the API function

interface LpPositionItemProps {
  position: LpPosition;
  // onPositionRemoved?: (positionAddress: string) => void; // Optional callback if needed by parent
}

// Helper to convert lamports to UI amount (can be shared or defined here)
// This helper is now primarily used for transaction building amounts if needed,
// as display amounts come pre-calculated from the backend.
function lamportsToUiAmount(lamports: string | number | bigint | undefined | null, decimals: number | undefined | null): string {
    if (lamports === undefined || lamports === null || decimals === undefined || decimals === null) return '0';
    try {
        const amountDecimal = new Decimal(lamports.toString()).div(new Decimal(10).pow(decimals));
        return amountDecimal.toFixed(Math.min(decimals, 6)); // Example: show up to 6 decimals
    } catch (e) {
        console.error("Error formatting amount:", e);
        return 'Error';
    }
}

export default function LpPositionItem({ position }: LpPositionItemProps) {
  // Get userPublicKey from auth store
  const { user } = useAuthStore();
  const userPublicKey = user?.solanaPublicKey ? new PublicKey(user.solanaPublicKey) : null;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRemoved, setIsRemoved] = useState(false); // State to track if position is removed

  // Display details are now received directly in the position prop
  // No need for a separate state or useEffect for calculations

  // useEffect(() => {
  //     // Calculation logic moved to backend
  // }, [position, connection]);

  const handleRemoveLiquidity = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Call the original backend for LP removal
      // The original backend will retrieve the private key and forward to the new backend
      await removeLiquidityPosition(position.address, position.pair_address);
      setIsRemoved(true); // Mark as removed on success
      console.log(`LP Position ${position.address} removal request sent.`);
      // Optionally, trigger a refresh of the positions list in the parent component
      // if (onPositionRemoved) {
      //   onPositionRemoved(position.address);
      // }
    } catch (e: any) {
      console.error("Error requesting LP position removal:", e);
      setError(e.message || "Failed to request LP position removal.");
    } finally {
      setIsLoading(false);
    }
  };

  // Don't render the item if it's been removed
  if (isRemoved) {
    return null;
  }

  return (
    <div className="bg-card p-4 rounded-lg mb-4 border border-border">
      <h3 className="text-lg font-semibold text-text-primary mb-2">LP 포지션: <span className="text-text-accent">{position.address.slice(0, 6)}...{position.address.slice(-6)}</span></h3>
      <p className="text-text-secondary">풀: {position.pair_address.slice(0, 6)}...{position.pair_address.slice(-6)}</p>

      {/* Display calculated details from backend */}
      <p className="text-text-secondary mt-2">가격 범위: <span className="text-text-primary">{position.priceRange}</span></p>
      <p className="text-text-secondary">총 가치 (SOL): <span className="text-text-primary">{position.totalValueInSol}</span></p>
      <p className="text-text-secondary">
        예치 금액: <span className="text-text-primary">{position.totalXAmountUi} ({position.tokenXMint.slice(0, 4)}...)</span> / <span className="text-text-primary">{position.totalYAmountUi} ({position.tokenYMint.slice(0, 4)}...)</span>
      </p>
      <p className="text-text-secondary">
        미청구 수수료: <span className="text-text-primary">{position.pendingFeeXUi} ({position.tokenXMint.slice(0, 4)}...)</span> / <span className="text-text-primary">{position.pendingFeeYUi} ({position.tokenYMint.slice(0, 4)}...)</span>
      </p>
      {position.pendingRewardsUi.map((reward, index) => (
        <p key={index} className="text-text-secondary">
          미청구 보상 {index + 1}: <span className="text-text-primary">{reward.amount} ({reward.mint.slice(0, 4)}...)</span>
        </p>
      ))}

      {error && (
        <div className="bg-error text-white p-2 rounded-md mt-2">
          {error}
        </div>
      )}

      <div className="flex space-x-2 mt-4">
        <button
          className={`border border-primary text-primary hover:bg-primary hover:text-background font-semibold py-2 px-4 rounded-lg transition duration-300 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          onClick={handleRemoveLiquidity}
          disabled={isLoading}
        >
          {isLoading ? 'LP 해제 중...' : 'LP 해제'}
        </button>
        {/* You can add the "Remove and Swap" button back here if needed */}
      </div>
    </div>
  );
}
