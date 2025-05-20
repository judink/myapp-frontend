"use client";

import React, { useCallback, useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import useAuthStore from '@/store/authStore';
import apiClient from '@/lib/api'; // For private key export
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js'; // Added for SOL balance

export default function NavigationBar() {
  const router = useRouter();
  const { user, isLoggedIn, logout } = useAuthStore();
  const userPublicKey = user?.solanaPublicKey ? new PublicKey(user.solanaPublicKey) : null; // Get PublicKey instance
  const [copySuccess, setCopySuccess] = useState('');
  const [solBalance, setSolBalance] = useState<number | null>(null);

  useEffect(() => {
    const fetchSolBalance = async () => {
      if (userPublicKey && isLoggedIn) {
        try {
          const connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com', 'confirmed');
          const balance = await connection.getBalance(userPublicKey);
          setSolBalance(balance / LAMPORTS_PER_SOL); // Convert lamports to SOL
        } catch (e) {
          console.error("Failed to fetch SOL balance for navbar:", e);
          setSolBalance(null);
        }
      } else {
        setSolBalance(null);
      }
    };
    fetchSolBalance();
  }, [userPublicKey, isLoggedIn]);

  const handleLogin = () => {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
    const googleLoginUrl = `${backendUrl}/api/auth/google`;
    window.location.href = googleLoginUrl;
  };

  const handleLogout = useCallback(async () => {
    await logout();
    // The logout function in authStore already handles redirection to '/'
  }, [logout]);

  const handleExportPrivateKey = useCallback(async () => {
    if (!isLoggedIn) {
      alert('Please log in to export your private key.');
      return;
    }
    try {
      const response = await apiClient.get<{ privateKey: string }>('/api/wallet/export-private-key');
      if (response.data && response.data.privateKey) {
        await navigator.clipboard.writeText(response.data.privateKey);
        setCopySuccess('Private key copied!');
        setTimeout(() => setCopySuccess(''), 2000); // Clear message after 2 seconds
      } else {
        alert('Failed to retrieve private key.');
      }
    } catch (err: any) {
      console.error('Error exporting private key:', err);
      alert(`Error exporting private key: ${err.response?.data?.message || err.message}`);
    }
  }, [isLoggedIn]);

  const copyToClipboard = async (text: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess('Wallet address copied!');
      setTimeout(() => setCopySuccess(''), 2000); // Clear message after 2 seconds
    } catch (err) {
      console.error('Failed to copy text: ', err);
      setCopySuccess('Failed to copy!');
      setTimeout(() => setCopySuccess(''), 2000);
    }
  };

  const renderWalletAddress = () => {
    if (user?.solanaPublicKey) {
      const key = user.solanaPublicKey;
      const truncatedKey = `${key.substring(0, 4)}...${key.substring(key.length - 4)}`;
      return (
        <button
          onClick={() => copyToClipboard(key)}
          title="Copy full address"
          className="px-3 py-1 rounded border border-gray-500 text-sm text-text-secondary hover:text-text-primary hover:bg-gray-700 hover:scale-105 transition-all duration-150 ease-in-out"
        >
          {truncatedKey}
        </button>
      );
    }
    return null;
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black border-b border-gray-700">
      <div className="w-full px-4 h-12 flex items-center justify-between"> {/* Removed max-w and mx-auto, using px-4 for edge padding */}
        {/* Left: Logo - Pushed to the start by justify-between on parent */}
        <div className="flex items-center"> {/* Wrapper for logo and text */}
          <Link href="/" className="flex items-center">
            <Image
              src="/logo.png"
              alt="DLMM WebApp Logo"
              width={33}
              height={33}
              className="rounded-full"
            />
            <span className="ml-2 text-lg font-semibold bg-gradient-to-br from-indigo-700 to-orange-500 bg-clip-text text-transparent hidden sm:inline">Degen MET</span>
          </Link>
        </div>

        {/* Center: Create LP Button - Will be centered due to justify-between and flex-grow on siblings */}
        {isLoggedIn && (
          <div className="absolute left-1/2 transform -translate-x-1/2"> {/* Absolute positioning for perfect center */}
            <button
              onClick={() => router.push('/lp/create')}
              className="px-3 py-1 bg-gray-700 rounded hover:bg-gray-600 hover:scale-105 transition-all duration-150 ease-in-out text-white font-semibold text-xs"
            >
              새 LP 포지션 생성
            </button>
          </div>
        )}

        {/* Right: Auth Section - Pushed to the end by justify-between on parent */}
        <div className="flex items-center gap-2"> {/* Kept gap for internal spacing */}
          {isLoggedIn && user ? (
            <>
              {solBalance !== null && (
                <span className="px-3 py-1 text-xs text-text-secondary">
                  {solBalance.toFixed(4)} SOL
                </span>
              )}
              {renderWalletAddress()}
              <button
                onClick={() => router.push('/portfolio')}
                className="px-2.5 py-1 rounded border border-gray-500 text-xs text-text-secondary hover:text-text-primary hover:bg-gray-700 hover:scale-105 transition-all duration-150 ease-in-out"
              >
                포트폴리오
              </button>
              <button
                onClick={handleExportPrivateKey}
                className="px-2.5 py-1 rounded border border-gray-500 text-xs text-text-secondary hover:text-text-primary hover:bg-gray-700 hover:scale-105 transition-all duration-150 ease-in-out"
              >
                개인키 내보내기
              </button>
              <button
                onClick={handleLogout}
                className="px-2.5 py-1 rounded border border-gray-500 text-xs text-text-secondary hover:text-text-primary hover:bg-gray-700 hover:scale-105 transition-all duration-150 ease-in-out"
              >
                로그아웃
              </button>
            </>
          ) : (
            <button
              onClick={handleLogin}
              className="px-3 py-1 bg-primary hover:bg-primary-hover text-white font-semibold rounded hover:scale-105 transition-all duration-150 ease-in-out text-xs border border-primary"
            >
              로그인
            </button>
          )}
        </div>
      </div>
      {copySuccess && (
        <div className="fixed bottom-5 right-5 bg-success text-white text-sm py-2 px-4 rounded-md shadow-lg transition-opacity duration-300">
          {copySuccess}
        </div>
      )}
    </nav>
  );
}