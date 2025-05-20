import { useState, useCallback } from 'react';
import axios from 'axios';
import { NATIVE_MINT } from '@solana/spl-token';

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

interface UsePoolSearch {
  pools: Pool[];
  poolsLoading: boolean;
  error: string | null;
  fetchPoolsByToken: (tokenCaInput: string) => Promise<void>;
  setPools: (pools: Pool[]) => void; // Allow resetting pools from outside
  setError: (error: string | null) => void; // Allow setting error from outside
}

export function usePoolSearch(): UsePoolSearch {
  const [pools, setPools] = useState<Pool[]>([]);
  const [poolsLoading, setPoolsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPoolsByToken = useCallback(async (tokenCaInput: string) => {
    if (!tokenCaInput) {
      setError('대상 토큰 민트 주소를 입력해주세요.');
      setPools([]);
      return;
    }
    setPoolsLoading(true);
    setError(null);
    setPools([]);
    try {
      const meteoraApiUrl = `https://dlmm-api.meteora.ag/pair/all_by_groups?include_pool_token_pairs=${tokenCaInput}-${NATIVE_MINT.toBase58()}`;
      console.log(`Fetching pools from Meteora API (usePoolSearch): ${meteoraApiUrl}`);
      const response = await axios.get(meteoraApiUrl, { headers: { 'accept': 'application/json' } });
      const apiResponse = response.data;
      console.log("Meteora API response received (usePoolSearch).");
      const relevantPairs = apiResponse.groups.flatMap((group: any) =>
        group.pairs.map((pair: any) => ({
          poolAddress: pair.address,
          tokenX: pair.name?.split('/')[0] || pair.mint_x.substring(0,4),
          tokenY: pair.name?.split('/')[1] || pair.mint_y.substring(0,4),
          tokenXMint: pair.mint_x,
          tokenYMint: pair.mint_y,
          binStep: pair.bin_step,
          baseFeeBps: parseFloat(pair.base_fee_percentage) * 100,
          name: pair.name,
          liquidity: parseFloat(pair.liquidity),
          trade_volume_24h: pair.trade_volume_24h,
          current_price: pair.current_price,
        }))
      );
      relevantPairs.sort((a: Pool, b: Pool) => b.liquidity - a.liquidity);
      setPools(relevantPairs);
      if (relevantPairs.length === 0) {
        setError('입력하신 토큰 페어에 해당하는 풀을 찾을 수 없습니다.');
      }
    } catch (error: any) {
      console.error('Failed to fetch pools by token from Meteora API (usePoolSearch):', error);
      const errorMessage = error.response?.data?.message || error.message;
      setError(`풀 목록을 불러오는 데 실패했습니다: ${errorMessage}`);
    } finally {
      setPoolsLoading(false);
    }
  }, []);

  return {
    pools,
    poolsLoading,
    error,
    fetchPoolsByToken,
    setPools,
    setError,
  };
}
