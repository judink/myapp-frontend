"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Connection, PublicKey } from '@solana/web3.js'; // Import Connection and PublicKey
import useAuthStore from '@/store/authStore';
import { StrategyType } from '@meteora-ag/dlmm';
import Decimal from 'decimal.js';
import { NATIVE_MINT } from '@solana/spl-token';
import { usePoolSearch } from '@/hooks/usePoolSearch';
import { usePriceRangeCalculation } from '@/hooks/usePriceRangeCalculation';
import { useAssetCheck } from '@/hooks/useAssetCheck';
import { executeLpCreation } from '@/utils/lpUtils';

interface Pool {
  poolAddress: string;
  tokenX: string;
  tokenY: string;
  tokenXMint: string;
  tokenYMint: string;
  binStep: number;
  baseFeeBps: number;
  name: string;
  liquidity: number;
  trade_volume_24h: number;
  current_price: number;
}

interface PriceRangeResult {
  minPrice: string;
  maxPrice: string;
  minBinId: number;
  maxBinId: number;
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

export default function CreateLpPage() {
  const router = useRouter();
  const { isLoggedIn, user, isLoading: isAuthLoading } = useAuthStore();

  const [selectedPool, setSelectedPool] = useState<Pool | null>(null);
  const [tokenCaInput, setTokenCaInput] = useState('');
  const [totalSolValue, setTotalSolValue] = useState('');
  const [solDepositRatioPercent, setSolDepositRatioPercent] = useState('50');
  const [strategyType, setStrategyType] = useState<keyof typeof StrategyType>('Spot');
  const [createLpLoading, setCreateLpLoading] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [currentUserSolBalance, setCurrentUserSolBalance] = useState<number | null>(null); // State for SOL balance

  const { pools, poolsLoading, error: poolSearchError, fetchPoolsByToken, setPools, setError: setPoolSearchError } = usePoolSearch();
  const { calculatedPriceRange, calculationLoading, calculationError } = usePriceRangeCalculation(selectedPool, totalSolValue, solDepositRatioPercent, strategyType);
  const { assetCheckResult, assetCheckLoading, assetCheckError, handleAssetCheck: performAssetCheck, setAssetCheckResult, setAssetCheckError } = useAssetCheck();

  const combinedError = pageError || poolSearchError || calculationError || assetCheckError;
  const strategies: (keyof typeof StrategyType)[] = ['Spot', 'Curve', 'BidAsk'];

  useEffect(() => {
    if (!isAuthLoading && !isLoggedIn) {
      router.replace('/');
    }
  }, [isAuthLoading, isLoggedIn, router]);

  // Fetch current SOL balance
  useEffect(() => {
    const fetchSolBalance = async () => {
      if (user?.solanaPublicKey && isLoggedIn) {
        try {
          const connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com', 'confirmed');
          const publicKey = new PublicKey(user.solanaPublicKey);
          const balance = await connection.getBalance(publicKey);
          setCurrentUserSolBalance(balance / 1_000_000_000); // Convert lamports to SOL
        } catch (e) {
          console.error("Failed to fetch current SOL balance for LP create page:", e);
          setCurrentUserSolBalance(null);
        }
      }
    };
    fetchSolBalance();
  }, [user, isLoggedIn]);

  useEffect(() => {
    setAssetCheckResult(null);
    setAssetCheckError(null);
  }, [selectedPool, totalSolValue, solDepositRatioPercent, strategyType, setAssetCheckResult, setAssetCheckError]);

  const handlePoolSearch = useCallback(() => {
    setPageError(null);
    setPools([]);
    setSelectedPool(null); // This will trigger the chart to show placeholder
    setAssetCheckResult(null);
    setAssetCheckError(null);
    fetchPoolsByToken(tokenCaInput);
  }, [fetchPoolsByToken, setPools, setSelectedPool, setAssetCheckResult, setAssetCheckError, tokenCaInput]);

  const handlePerformAssetCheck = useCallback(async () => {
     setPageError(null);
     await performAssetCheck(selectedPool, tokenCaInput, totalSolValue, solDepositRatioPercent, strategyType, calculatedPriceRange);
  }, [selectedPool, tokenCaInput, totalSolValue, solDepositRatioPercent, strategyType, calculatedPriceRange, performAssetCheck]);

  const handleExecuteCreateLp = useCallback(async () => {
    if (!selectedPool || !tokenCaInput || !totalSolValue || solDepositRatioPercent === undefined || !strategyType || !calculatedPriceRange || !assetCheckResult) {
      setPageError('필수 정보가 누락되었습니다.');
      return;
    }
    setCreateLpLoading(true);
    setPageError(null);
    try {
      const response = await executeLpCreation(
        selectedPool,
        tokenCaInput,
        totalSolValue,
        solDepositRatioPercent,
        strategyType,
        calculatedPriceRange,
        assetCheckResult
      );
      alert('LP 포지션 생성 성공! 서명: ' + response.signature);
      router.push('/'); // Redirect to main page (dashboard)
    } catch (error: any) {
      console.error('LP Creation Failed (page):', error);
      setPageError(error.message || 'LP 포지션 생성 중 알 수 없는 오류 발생');
    } finally {
      setCreateLpLoading(false);
    }
  }, [selectedPool, tokenCaInput, totalSolValue, solDepositRatioPercent, strategyType, calculatedPriceRange, assetCheckResult, router]);

  const formatDisplayAmount = (lamports: string, decimals: number | undefined) => {
      if (!lamports || decimals === undefined) return 'N/A';
      try {
          const amountDecimal = new Decimal(lamports).div(new Decimal(10).pow(decimals));
          return amountDecimal.toFixed(decimals);
      } catch (e) {
          console.error("Error formatting amount:", e);
          return 'Error';
      }
  };

  const isDepositSettingsDisabled = !selectedPool;
  const isAssetCheckDisabled = isDepositSettingsDisabled || !totalSolValue || !strategyType || !calculatedPriceRange || calculationLoading;
  const isExecuteDisabled = !assetCheckResult || assetCheckLoading || createLpLoading;

  return (
    <div className="max-w-screen-2xl mx-auto p-4 md:p-6 bg-background text-text-primary flex flex-col min-h-[calc(100vh-3rem)]"> {/* max-w-screen-2xl and mx-auto added, padding increased */}
      {/* Title and Dashboard button removed as they are now in the global navbar */}

      {combinedError && (
        <div className="bg-error text-white p-3 md:p-4 rounded-md mb-6 mt-4"> {/* Restored margins */}
          {combinedError}
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-6 flex-grow"> {/* Restored gap, flex-grow to take available space */}
        {/* Left Column: DexScreener Chart */}
        <div className="md:w-3/4 flex-grow h-[500px] md:h-auto"> {/* Original md:w-3/4, flex-grow, adjusted h-[500px] */}
          {selectedPool?.poolAddress ? (
            <iframe
              key={selectedPool.poolAddress} // Add key to force re-render on pool change
              src={`https://dexscreener.com/solana/${selectedPool.poolAddress}?embed=1&theme=dark&info=0`}
              className="w-full h-full rounded-lg border border-border"
              title="DexScreener Chart"
              allowFullScreen
            ></iframe>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-card border border-border rounded-lg text-text-secondary">
              <p>풀을 선택하면 여기에 차트가 표시됩니다.</p>
            </div>
          )}
        </div>

        {/* Right Column: LP Creation Form */}
        <div className="md:w-1/4 flex-shrink-0 bg-card p-4 rounded-lg shadow-xl text-text-primary border border-border overflow-y-auto md:h-auto"> {/* Original md:w-1/4, flex-shrink-0, md:h-auto, p-4 for form */}
          {/* Section 1: Pool Selection */}
          <section className="mb-4 pb-4 border-b border-border">
            {/* <h2 className="text-md font-semibold text-text-primary mb-2">1. 토큰 및 풀 선택</h2> */} {/* Title Removed */}
            <div className="mb-2">
              <label htmlFor="tokenCaInput" className="block text-text-secondary text-xs font-bold mb-1">
                대상 토큰 (Y) 민트 주소:
              </label>
              <input
                type="text"
                id="tokenCaInput"
                className="shadow appearance-none border border-border rounded w-full py-1 px-2 bg-background text-text-primary leading-tight focus:outline-none focus:shadow-outline focus:border-primary text-sm"
                value={tokenCaInput}
                onChange={(e) => setTokenCaInput(e.target.value)}
                placeholder="토큰 민트 주소 입력"
              />
              <button
                className="mt-1.5 w-full border border-[var(--primary-orange)] text-[var(--primary-orange)] hover:bg-[var(--primary-orange)] hover:text-background font-semibold py-1 px-2.5 rounded-lg transition duration-300 text-xs"
                onClick={handlePoolSearch}
                disabled={poolsLoading}
              >
                {poolsLoading ? '검색 중...' : '풀 검색'}
              </button>
            </div>
            {poolsLoading && <p className="text-text-secondary text-xs">풀 목록을 불러오는 중...</p>}
            {!poolsLoading && pools.length === 0 && tokenCaInput && <p className="text-text-secondary text-xs">해당 토큰 페어의 풀을 찾을 수 없습니다.</p>}
            {!poolsLoading && pools.length > 0 && (
              <div className="mb-2">
                <label htmlFor="poolSelect" className="block text-text-secondary text-xs font-bold mb-1">
                  풀 선택:
                </label>
                <select
                  id="poolSelect"
                  className="shadow appearance-none border border-border rounded w-full py-1 px-2 bg-background text-text-primary leading-tight focus:outline-none focus:shadow-outline focus:border-primary text-sm"
                  value={selectedPool?.poolAddress || ''}
                  onChange={(e) => {
                    const pool = pools.find(p => p.poolAddress === e.target.value);
                    setSelectedPool(pool || null);
                  }}
                >
                  <option value="" disabled className="text-text-secondary">풀을 선택해주세요</option>
                  {pools.map(pool => (
                    <option key={pool.poolAddress} value={pool.poolAddress} className="bg-background text-text-primary">
                      {`${pool.name || `${pool.tokenX.substring(0, 4)}.../${pool.tokenY.substring(0, 4)}...`} (Bin: ${pool.binStep}, Fee: ${pool.baseFeeBps / 100}%)`}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </section>

          {/* Section 2: Deposit Settings */}
          <section className={`mb-4 pb-4 border-b border-border ${isDepositSettingsDisabled ? 'opacity-50 pointer-events-none' : ''}`}>
            <h2 className="text-md font-semibold text-text-primary mb-2">2. 예치 설정</h2>
            {selectedPool && (
              <div className="mb-1.5 p-1 bg-background rounded border border-border text-xs">
                <p className="text-text-primary"><strong>선택된 풀:</strong> <span className="text-text-accent">{selectedPool.name || selectedPool.poolAddress.substring(0,10)}...</span></p>
                <p className="text-text-secondary">Bin Step: {selectedPool.binStep}, 현재가(Y/X): {selectedPool.current_price !== undefined ? selectedPool.current_price.toFixed(6) : 'N/A'}</p>
              </div>
            )}
            <div className="space-y-1.5 mb-1.5">
              <div>
                <label htmlFor="totalSolValue" className="block text-text-secondary text-xs font-bold mb-0.5">
                  총 예치 가치 (SOL):
                  {currentUserSolBalance !== null && (
                    <span className="text-text-accent font-normal"> (보유: {currentUserSolBalance.toFixed(4)} SOL)</span>
                  )}
                </label>
                <input
                  type="number"
                  id="totalSolValue"
                  className="shadow appearance-none border border-border rounded w-full py-1 px-2 bg-background text-text-primary leading-tight focus:outline-none focus:shadow-outline focus:border-primary text-sm"
                  value={totalSolValue}
                  onChange={(e) => setTotalSolValue(e.target.value)}
                  placeholder="예: 10"
                  min="0"
                  step="any"
                  disabled={isDepositSettingsDisabled}
                />
              </div>
              <div>
                <label htmlFor="solDepositRatio" className="block text-text-secondary text-xs font-bold mb-0.5">
                  SOL 예치 비율: <span className="text-text-accent">{solDepositRatioPercent}%</span> / 토큰 예치 비율: <span className="text-text-accent">{100 - parseInt(solDepositRatioPercent, 10)}%</span>
                </label>
                <input
                  type="range"
                  id="solDepositRatio"
                  className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[var(--primary-orange)] disabled:opacity-50"
                  min="0"
                  max="100"
                  value={solDepositRatioPercent}
                  onChange={(e) => setSolDepositRatioPercent(e.target.value)}
                  disabled={isDepositSettingsDisabled}
                />
              </div>
            </div>
            <div className="mb-1.5">
              <label className="block text-text-secondary text-xs font-bold mb-0.5">전략 선택:</label>
              <div className="flex space-x-1">
                {strategies.map(s => (
                  <button
                    key={s}
                    className={`flex-1 py-1 px-1.5 rounded-md transition duration-300 text-xs ${
                      strategyType === s ? 'bg-[var(--primary-orange)] text-white' : 'bg-background border border-[var(--primary-orange)] text-[var(--primary-orange)] hover:bg-[var(--secondary-orange)] hover:text-white'
                    } ${isDepositSettingsDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={() => setStrategyType(s)}
                    disabled={isDepositSettingsDisabled}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            {calculationLoading && <p className="text-text-secondary text-xs">가격 범위 계산 중...</p>}
            {!calculationLoading && calculatedPriceRange && (
              <div className="mb-1.5 text-success text-xs">
                <p><strong>가격 범위 (Y/X):</strong> {parseFloat(calculatedPriceRange.minPrice).toFixed(6)} ~ {parseFloat(calculatedPriceRange.maxPrice).toFixed(6)}</p>
              </div>
            )}
            {!calculationLoading && !calculatedPriceRange && parseFloat(totalSolValue) > 0 && selectedPool && (
                 <p className="text-text-accent text-xs">가격을 계산 중이거나, 입력값을 확인해주세요.</p>
            )}
             <button
                className={`mt-1.5 w-full bg-[var(--primary-orange)] hover:bg-[var(--secondary-orange)] text-white font-semibold py-2 px-3 rounded-lg transition duration-300 text-sm ${isAssetCheckDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={handlePerformAssetCheck}
                disabled={isAssetCheckDisabled}
              >
                {assetCheckLoading ? '자산 확인 중...' : '자산 확인 및 최종 검토'}
              </button>
          </section>

          {/* Section 3: Asset Check & Execution */}
          {assetCheckResult && !assetCheckLoading && (
            <section className="mb-2"> {/* Reduced bottom margin */}
              <h2 className="text-md font-semibold text-text-primary mb-1.5">3. 최종 확인 및 생성</h2>
              <div className="space-y-1 mb-1.5 p-1 bg-background rounded-lg border border-border text-xs">
                <div>
                  <h3 className="text-xs font-semibold text-text-accent mb-0.5">필요 자산:</h3>
                  <p className="text-text-secondary">SOL: <span className="text-text-primary">{formatDisplayAmount(assetCheckResult.requiredAssets?.solLamports, 9)}</span></p>
                  <p className="text-text-secondary">대상 토큰 ({assetCheckResult.requiredAssets?.tokenCa?.substring(0,4)}...): <span className="text-text-primary">{formatDisplayAmount(assetCheckResult.requiredAssets?.targetTokenLamports, assetCheckResult.requiredAssets?.tokenDecimals)}</span></p>
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-text-accent mb-0.5">현재 잔액:</h3>
                  <p className="text-text-secondary">SOL: <span className="text-text-primary">{formatDisplayAmount(assetCheckResult.currentBalances.solLamports, 9)}</span></p>
                  <p className="text-text-secondary">대상 토큰 ({assetCheckResult.requiredAssets?.tokenCa?.substring(0,4)}...): <span className="text-text-primary">{formatDisplayAmount(assetCheckResult.currentBalances.targetTokenLamports, assetCheckResult.requiredAssets?.tokenDecimals)}</span></p>
                </div>
                {assetCheckResult.needsSwap && (
                  <div className="mt-1 p-1 bg-primary bg-opacity-20 rounded border border-primary">
                    <p className="text-text-accent font-semibold text-xs mb-0.5">알림: 자동 스왑 진행</p>
                    {assetCheckResult.swapQuote ? (
                      <div className="text-[0.6rem] text-text-secondary"> {/* Even smaller text for swap details */}
                        <p>경로: <span className="text-text-primary">{assetCheckResult.swapQuote.routePlan?.map((route: any) => route.swapInfo.label).join('->') || 'N/A'}</span></p>
                        <p>입력: <span className="text-text-primary">{formatDisplayAmount(assetCheckResult.swapQuote.inAmount, assetCheckResult.swapQuote.inTokenInfo?.decimals || 9)} {assetCheckResult.swapQuote.inTokenInfo?.symbol || 'In'}</span></p>
                        <p>출력: <span className="text-text-primary">{formatDisplayAmount(assetCheckResult.swapQuote.outAmount, assetCheckResult.swapQuote.outTokenInfo?.decimals || 9)} {assetCheckResult.swapQuote.outTokenInfo?.symbol || 'Out'}</span></p>
                      </div>
                    ) : <p className="text-[0.6rem] text-text-accent">스왑 견적 정보 없음.</p>}
                  </div>
                )}
                {!assetCheckResult.needsSwap && (
                   <div className="mt-1 p-1 bg-success bg-opacity-20 rounded border border-success">
                      <p className="text-success font-semibold text-xs">자산 충분 (스왑 불필요)</p>
                   </div>
                 )}
              </div>
              <button
                className={`w-full bg-[var(--primary-orange)] hover:bg-[var(--secondary-orange)] text-white font-semibold py-2 px-3 rounded-lg transition duration-300 text-sm ${isExecuteDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={handleExecuteCreateLp}
                disabled={isExecuteDisabled}
              >
                {createLpLoading ? 'LP 생성 중...' : (assetCheckResult.needsSwap ? '자동 스왑 후 LP 생성' : 'LP 포지션 생성')}
              </button>
            </section>
          )}
        </div> {/* Closing Right Column Div */}
      </div> {/* Closing Two-Column Flex Div */}
    </div> // Closing Main Container Div
  );
}
