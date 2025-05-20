// src/components/AuthProvider.tsx
"use client";

import React, { useEffect } from 'react';
import useAuthStore from '@/store/authStore';

interface AuthProviderProps {
  children: React.ReactNode;
}

export default function AuthProvider({ children }: AuthProviderProps) {
  useEffect(() => {
    // 앱이 처음 로드될 때 한 번만 인증 상태 초기화
    useAuthStore.getState().initializeAuth();
  }, []);

  return <>{children}</>;
}
