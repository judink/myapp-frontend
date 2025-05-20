"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Connection, PublicKey } from '@solana/web3.js';
import useAuthStore from '@/store/authStore';
import { useRouter } from 'next/navigation';
import { useDlmmPositions } from '@/hooks/useDlmmPositions';
import LpPositionItem from '@/components/lp/LpPositionItem';
import { LpTotalSummary } from '@/types/dlmm'; // Import LpTotalSummary

export default function PortfolioPage() {
  const { user, isLoggedIn, isLoading: isAuthLoading, initializeAuth } = useAuthStore();
  const userPublicKey = user?.solanaPublicKey ? new PublicKey(user.solanaPublicKey) : null;
  const router = useRouter();

  const { positions, isLoading: positionsLoading, error: positionsError, totalSummary, fetchPositions } = useDlmmPositions(userPublicKey);

  useEffect(() => {
    if (!isLoggedIn && !isAuthLoading) {
      initializeAuth();
    }
  }, [isLoggedIn, isAuthLoading, initializeAuth]);

  useEffect(() => {
    if (!isAuthLoading && !isLoggedIn) {
      router.replace('/');
    }
  }, [isAuthLoading, isLoggedIn, router]);

  // Helper function to safely format numbers, defaulting to 0 if undefined/null
  const safeToFixed = (value: number | undefined | null, digits: number = 2): string => {
    return (value ?? 0).toFixed(digits);
  };

  if (isAuthLoading || (!isLoggedIn && typeof window !== 'undefined')) {
    return (
      <div className="container mx-auto p-4 pt-6 text-center text-text-secondary">
        <p>Loading portfolio data...</p>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
        <div className="container mx-auto p-4 pt-6 text-center text-text-secondary">
            <p>Please log in to view your portfolio.</p>
        </div>
    );
  }
  
  if (!userPublicKey && isLoggedIn) {
    return (
      <div className="container mx-auto p-4 pt-6 text-center text-text-secondary">
        <p>Loading user wallet information...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      <h1 className="text-3xl md:text-4xl font-bold text-text-primary mb-6 md:mb-8">My Portfolio</h1>

      {positionsError && (
        <div className="bg-error text-white p-3 md:p-4 rounded-md mb-6">
          {positionsError}
        </div>
      )}

      {/* LP Positions Summary */}
      <div className="bg-card p-4 md:p-6 rounded-lg shadow-xl border border-border mb-8">
        <h2 className="text-xl md:text-2xl font-semibold text-text-primary mb-4">LP Positions Summary</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <p className="text-text-secondary">Total Positions: <span className="text-text-primary font-medium">{totalSummary.totalPositions || 0}</span></p>
          <p className="text-text-secondary">In-Range Positions: <span className="text-text-primary font-medium">{totalSummary.inRangePositions || 0}</span></p>
          <p className="text-text-secondary">Total Liquidity Value (USD): <span className="text-text-primary font-medium">${safeToFixed(totalSummary.totalLiquidityValueUsd)}</span></p>
          <p className="text-text-secondary">Total Unclaimed Fees (USD): <span className="text-text-primary font-medium">${safeToFixed(totalSummary.totalUnclaimedFeesUsd)}</span></p>
          <p className="text-text-secondary sm:col-span-2">Total Initial Value (USD): <span className="text-text-primary font-medium">${safeToFixed(totalSummary.totalInitialValueUsd)}</span></p>
          {/* Add claimed fees if available and needed */}
          {/* <p className="text-text-secondary">Total Claimed Fees (USD): <span className="text-text-primary font-medium">${safeToFixed(totalSummary.totalClaimedFeesUsd)}</span></p> */}
        </div>
      </div>

      {/* LP List Section */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl md:text-2xl font-semibold text-text-primary">My LP Positions</h2>
          <button
              className={`px-2.5 py-1 rounded border border-gray-500 text-xs text-text-secondary hover:text-text-primary hover:bg-gray-700 hover:scale-105 transition-all duration-150 ease-in-out ${positionsLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={fetchPositions}
              disabled={positionsLoading}
          >
              {positionsLoading ? 'Refreshing...' : 'Refresh Positions'}
          </button>
        </div>

        {positionsLoading && !positions.length ? (
          <p className="text-text-secondary text-center py-5">Loading LP positions...</p>
        ) : positionsError && !positions.length ? ( // Show error prominently if no positions due to error
          <div className="bg-error text-white p-4 rounded-md mb-4">
            {positionsError}
          </div>
        ) : !positionsLoading && positions.length === 0 && !positionsError ? ( // Explicitly check for no positions and no error
          <p className="text-text-secondary">No active LP positions found.</p>
        ) : (
          <div className="space-y-4">
            {positions.map(position => (
              <LpPositionItem
                key={position.address}
                position={position}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}