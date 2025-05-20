import { Connection, PublicKey, AccountInfo } from '@solana/web3.js';
import { MintLayout, getMint, NATIVE_MINT } from '@solana/spl-token';
import {
    PositionV2Account,
    LbPairAccount,
    BinArrayAccount,
    BinArray,
    getBinArrayPubkeysForPosition,
    getPriceOfBinByBinId,
    getAmountsFromLiquidityShares,
    DLMM // Assuming DLMM is also exported from the root
} from '@meteora-ag/dlmm'; // Attempt to import directly from the root
import axios from 'axios';
import Decimal from 'decimal.js';

const JUPITER_PRICE_API_URL = 'https://lite-api.jup.ag/price/v2'; // Jupiter Price API URL

// Helper to convert lamports to UI amount
function lamportsToUiAmount(lamports: bigint | number | string | undefined | null, decimals: number | undefined | null): string {
    if (lamports === undefined || lamports === null || decimals === undefined || decimals === null) return '0';
    try {
        const amountDecimal = new Decimal(lamports.toString()).div(new Decimal(10).pow(decimals));
        return amountDecimal.toFixed(Math.min(decimals, 6)); // Example: show up to 6 decimals
    } catch (e) {
        console.error("Error formatting amount:", e);
        return 'Error';
    }
}

// Helper to get token prices from Jupiter
async function getJupiterPrices(mintAddresses: string[]): Promise<{ [key: string]: number }> {
    if (!mintAddresses || mintAddresses.length === 0) return {};
    try {
        const ids = mintAddresses.join(',');
        const response = await axios.get(`${JUPITER_PRICE_API_URL}?ids=${ids}&vsToken=${NATIVE_MINT.toBase58()}`);
        const prices = response.data.data;
        const priceMap: { [key: string]: number } = {};
        for (const id in prices) {
            priceMap[id] = prices[id].price;
        }
        return priceMap;
    } catch (error) {
        console.error('Failed to fetch prices from Jupiter:', error);
        return {};
    }
}

// Helper to convert internal price (bin price) to UI price (Y/X)
function convertInternalPriceToUi(internalPrice: bigint | number | string | Decimal | undefined | null, tokenXDecimals: number | undefined | null, tokenYDecimals: number | undefined | null): string {
    if (internalPrice === undefined || internalPrice === null || tokenXDecimals === undefined || tokenXDecimals === null || tokenYDecimals === undefined || tokenYDecimals === null) {
        return 'N/A';
    }
    try {
        const priceDecimal = internalPrice instanceof Decimal ? internalPrice : new Decimal(internalPrice?.toString() || '0');
        const adjustedPrice = priceDecimal.mul(new Decimal(10).pow(tokenYDecimals)).div(new Decimal(10).pow(tokenXDecimals));
        return adjustedPrice.toFixed(Math.max(tokenXDecimals, tokenYDecimals)); // Adjust precision
    } catch (e) {
        console.error("Error converting internal price to UI:", e);
        return 'Error';
    }
}

// Define a type for the detailed position data including calculated values
export interface DetailedLpPosition {
    address: string; // Position address
    pair_address: string; // LB Pair address
    owner: string; // Owner public key

    // Data from Meteora API (subset)
    total_fee_usd_claimed: number; // Total claimed fee in USD
    total_reward_usd_claimed: number; // Total claimed reward in USD
    fee_apy_24h: number; // 24h fee APY
    fee_apr_24h: number; // 24h fee APR
    daily_fee_yield: number; // Daily fee yield

    // Calculated details from on-chain data
    lowerBinId: number;
    upperBinId: number;
    binStep: number;
    tokenXMint: string;
    tokenYMint: string;
    tokenXDecimals: number;
    tokenYDecimals: number;
    totalXAmount: bigint; // Raw amount
    totalYAmount: bigint; // Raw amount
    pendingFeeX: bigint; // Raw amount
    pendingFeeY: bigint; // Raw amount
    pendingRewards: { mint: string; amount: bigint }[]; // Raw amounts
    totalXAmountUi: string; // Formatted UI amount
    totalYAmountUi: string; // Formatted UI amount
    pendingFeeXUi: string; // Formatted UI amount
    pendingFeeYUi: string; // Formatted UI amount
    pendingRewardsUi: { mint: string; amount: string }[]; // Formatted UI amounts
    priceRange: string; // Formatted price range
    totalValueInSol: string; // Total value in SOL (formatted)
}


/**
 * Fetches detailed information for a single LP position by its address.
 * This includes fetching on-chain data and calculating amounts/values.
 * @param connection The Solana Connection object.
 * @param positionAddress The public key of the position account.
 * @returns A promise that resolves to the detailed position information or null if fetching/processing fails.
 */
export async function fetchDetailedPosition(connection: Connection, positionAddress: PublicKey): Promise<DetailedLpPosition | null> {
    try {
        // 1. Fetch position account data
        const positionAccountInfo = await connection.getAccountInfo(positionAddress);
        if (!positionAccountInfo) {
            console.warn(`Position account not found for address: ${positionAddress.toBase58()}`);
            return null;
        }

        // 2. Deserialize position account
        const positionState = PositionV2Account.deserialize(positionAccountInfo.data)?.[0];
        if (!positionState) {
            console.error(`Failed to deserialize position account: ${positionAddress.toBase58()}`);
            return null;
        }

        const lbPairAddress = positionState.lb_pair;

        // 3. Fetch LB Pair account data
        const lbPairAccountInfo = await connection.getAccountInfo(lbPairAddress);
        if (!lbPairAccountInfo) {
            console.warn(`LB Pair account not found for address: ${lbPairAddress.toBase58()}`);
            return null;
        }

        // 4. Deserialize LB Pair account
        const lbPairState = LbPairAccount.deserialize(lbPairAccountInfo.data)?.[0];
        if (!lbPairState) {
            console.error(`Failed to deserialize LB Pair account: ${lbPairAddress.toBase58()}`);
            return null;
        }

        const tokenXMint = lbPairState.token_x_mint;
        const tokenYMint = lbPairState.token_y_mint;

        // 5. Fetch Mint account data for tokens and rewards
        const mintPubkeysToFetch = [tokenXMint, tokenYMint];
        lbPairState.reward_infos.forEach((rewardInfo: { mint: PublicKey | null }) => {
             if (rewardInfo.mint && !rewardInfo.mint.equals(PublicKey.default)) {
                 mintPubkeysToFetch.push(rewardInfo.mint);
             }
        });

        const mintAccountInfos = await connection.getMultipleAccountsInfo(mintPubkeysToFetch);
        const mintMap = new Map<string, any>(); // Map mint address string to MintLayout data

        mintAccountInfos.forEach((accountInfo, index) => {
            if (accountInfo) {
                try {
                    const mintState = MintLayout.decode(accountInfo.data);
                    mintMap.set(mintPubkeysToFetch[index].toBase58(), mintState);
                } catch (e) {
                    console.error(`Failed to unpack Mint account ${mintPubkeysToFetch[index].toBase58()}:`, e);
                }
            }
        });

        const tokenXMintInfo = mintMap.get(tokenXMint.toBase58());
        const tokenYMintInfo = mintMap.get(tokenYMint.toBase58());

        if (!tokenXMintInfo || !tokenYMintInfo) {
             console.warn(`Mint info not found for LbPair ${lbPairAddress.toBase58()}. Skipping calculation.`);
             return null;
        }

        const tokenXDecimals = tokenXMintInfo.decimals;
        const tokenYDecimals = tokenYMintInfo.decimals;

        // 6. Fetch BinArray account data for the position's range
        const binArrayPubkeysForPosition = getBinArrayPubkeysForPosition(
            lbPairAddress,
            positionState.lower_bin_id,
            positionState.upper_bin_id
        );
        const binArrayAccountInfos = await connection.getMultipleAccountsInfo(binArrayPubkeysForPosition);

        const binArraysForPosition = binArrayAccountInfos.map((accountInfo, index) => {
            if (!accountInfo) {
                console.warn(`BinArray account not found for pubkey: ${binArrayPubkeysForPosition[index].toBase58()}`);
                return null;
            }
            try {
                const binArrayState = BinArrayAccount.deserialize(accountInfo.data)?.[0];
                 if (!binArrayState) {
                       console.warn(`Failed to deserialize BinArray account: ${binArrayPubkeysForPosition[index].toBase58()}`);
                       return null;
                  }
                return { publicKey: binArrayPubkeysForPosition[index], account: binArrayState };
            } catch (e) {
                console.error(`Error deserializing BinArray account ${binArrayPubkeysForPosition[index].toBase58()}:`, e);
                return null;
            }
        }).filter(ba => ba !== null);


        // 7. Calculate total amounts, fees, and rewards from on-chain data
        let totalX = BigInt(0);
        let totalY = BigInt(0);
        let pendingFeeX = BigInt(0);
        let pendingFeeY = BigInt(0);
        let pendingRewardsMap = new Map<string, bigint>();

        for (let binId = positionState.lower_bin_id; binId <= positionState.upper_bin_id; binId++) {
            const binArrayIndex = BinArray.binIdToBinArrayIndex(binId);
            const binArray = binArraysForPosition.find(ba => ba?.account.index === binArrayIndex)?.account;

            if (!binArray) {
                console.warn(`BinArray for index ${binArrayIndex} not found for bin ${binId}. Skipping calculations for this bin.`);
                continue;
            }

            const binIndexInArray = BinArray.getBinIndexInArray(binArray, binId);
            const binData = binArray.bins[binIndexInArray];

            const liquidityShare = positionState.liquidity_shares[binId - positionState.lower_bin_id];

            if (liquidityShare > 0) {
                try {
                     const { amountX, amountY } = getAmountsFromLiquidityShares(binData, liquidityShare);
                     totalX += amountX;
                     totalY += amountY;
                } catch (e) {
                     console.error(`Error calculating amounts from liquidity shares for bin ${binId}:`, e);
                }
            }

            const feeInfo = positionState.fee_infos[binId - positionState.lower_bin_id];
            pendingFeeX += feeInfo.fee_x_pending;
            pendingFeeY += feeInfo.fee_y_pending;

            const rewardInfo = positionState.reward_infos[binId - positionState.lower_bin_id];
             if (rewardInfo && rewardInfo.reward_pendings) {
                 rewardInfo.reward_pendings.forEach((pendingAmount: bigint, rewardIndex: number) => {
                     const rewardMint = lbPairState.reward_infos?.[rewardIndex]?.mint?.toBase58();
                     if (rewardMint && pendingAmount > 0) {
                         pendingRewardsMap.set(rewardMint, (pendingRewardsMap.get(rewardMint) || BigInt(0)) + pendingAmount);
                     }
                 });
             }
        }

        // 8. Fetch token prices from Jupiter
        const mintAddressesForPricing = [...mintMap.keys()];
         if (!mintAddressesForPricing.includes(NATIVE_MINT.toBase58())) { // Add SOL mint if not present
            mintAddressesForPricing.push(NATIVE_MINT.toBase58());
        }
        const pricesInSol = await getJupiterPrices(mintAddressesForPricing);

        // 9. Calculate total value in SOL
        let totalValue = new Decimal(0);

        const totalXDecimal = new Decimal(totalX.toString()).div(new Decimal(10).pow(tokenXDecimals));
        const totalYDecimal = new Decimal(totalY.toString()).div(new Decimal(10).pow(tokenYDecimals));

        const tokenXPriceInSol = pricesInSol[tokenXMint.toBase58()] || 0;
        const tokenYPriceInSol = pricesInSol[tokenYMint.toBase58()] || 0;

        totalValue = totalValue
            .add(totalXDecimal.mul(tokenXPriceInSol))
            .add(totalYDecimal.mul(tokenYPriceInSol));

        const pendingFeeXDecimal = new Decimal(pendingFeeX.toString()).div(new Decimal(10).pow(tokenXDecimals));
        const pendingFeeYDecimal = new Decimal(pendingFeeY.toString()).div(new Decimal(10).pow(tokenYDecimals));

         totalValue = totalValue
            .add(pendingFeeXDecimal.mul(tokenXPriceInSol))
            .add(pendingFeeYDecimal.mul(tokenYPriceInSol));

        const pendingRewardsUi: { mint: string; amount: string }[] = [];
        pendingRewardsMap.forEach((amount, mint) => {
            const rewardPriceInSol = pricesInSol[mint] || 0;
            const rewardInfo = lbPairState.reward_infos?.find((ri: { mint: PublicKey | null }) => ri.mint?.toBase58() === mint);
            // Need to fetch reward mint decimals if not available in lbPairState
            const rewardMintInfo = mintMap.get(mint);
            const rewardDecimals = rewardMintInfo?.decimals || 6; // Default to 6 if not found

            const rewardDecimal = new Decimal(amount.toString()).div(new Decimal(10).pow(rewardDecimals));
            totalValue = totalValue.add(rewardDecimal.mul(rewardPriceInSol));
            pendingRewardsUi.push({
                amount: lamportsToUiAmount(amount, rewardDecimals),
                mint: mint
            });
        });

        // 10. Format price range
        let minPriceFormatted = 'N/A';
        let maxPriceFormatted = 'N/A';
        try {
             const minPriceInternal = getPriceOfBinByBinId(positionState.lower_bin_id, lbPairState.bin_step);
             const maxPriceInternal = getPriceOfBinByBinId(positionState.upper_bin_id, lbPairState.bin_step);

             minPriceFormatted = convertInternalPriceToUi(minPriceInternal, tokenXDecimals, tokenYDecimals);
             maxPriceFormatted = convertInternalPriceToUi(maxPriceInternal, tokenXDecimals, tokenYDecimals);

        } catch (e) {
            console.error("Error formatting price range:", e);
        }

        // 11. Fetch additional data from Meteora API
        const apiUrl = `https://dlmm-api.meteora.ag/position/${positionAddress.toBase58()}`;
        const apiResponse = await axios.get<any>(apiUrl); // Use 'any' for now, will refine type later
        const apiData = apiResponse.data;


        // 12. Combine all data into the DetailedLpPosition structure
        const detailedPosition: DetailedLpPosition = {
            address: positionAddress.toBase58(),
            pair_address: positionState.lb_pair.toBase58(),
            owner: positionState.owner.toBase58(),

            // Data from Meteora API
            total_fee_usd_claimed: apiData.total_fee_usd_claimed || 0,
            total_reward_usd_claimed: apiData.total_reward_usd_claimed || 0,
            fee_apy_24h: apiData.fee_apy_24h || 0,
            fee_apr_24h: apiData.fee_apr_24h || 0,
            daily_fee_yield: apiData.daily_fee_yield || 0,

            // Calculated details
            lowerBinId: positionState.lower_bin_id,
            upperBinId: positionState.upper_bin_id,
            binStep: lbPairState.bin_step,
            tokenXMint: tokenXMint.toBase58(),
            tokenYMint: tokenYMint.toBase58(),
            tokenXDecimals: tokenXDecimals,
            tokenYDecimals: tokenYDecimals,
            totalXAmount: totalX,
            totalYAmount: totalY,
            pendingFeeX: pendingFeeX,
            pendingFeeY: pendingFeeY,
            pendingRewards: Array.from(pendingRewardsMap.entries()).map(([mint, amount]) => ({ mint, amount })),
            totalXAmountUi: lamportsToUiAmount(totalX, tokenXDecimals),
            totalYAmountUi: lamportsToUiAmount(totalY, tokenYDecimals),
            pendingFeeXUi: lamportsToUiAmount(pendingFeeX, tokenXDecimals),
            pendingFeeYUi: lamportsToUiAmount(pendingFeeY, tokenYDecimals),
            pendingRewardsUi: pendingRewardsUi,
            priceRange: `${minPriceFormatted} - ${maxPriceFormatted}`,
            totalValueInSol: totalValue.toFixed(4),
        };

        return detailedPosition;

    } catch (error) {
        console.error(`Error fetching detailed position for ${positionAddress.toBase58()}:`, error);
        return null;
    }
}