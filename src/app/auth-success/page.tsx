// src/app/auth-success/page.tsx
"use client";

import React, { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function AuthSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');

    if (token) {
      // 토큰을 로컬 스토리지에 저장
      localStorage.setItem('jwtToken', token);
      // 메인 페이지로 리디렉션 (메인 페이지가 이제 대시보드 역할을 함)
      router.replace('/'); // replace를 사용하여 뒤로가기 시 이 페이지로 돌아오지 않도록 함
    } else {
      // 토큰이 없는 경우 로그인 페이지로 리디렉션 또는 오류 메시지 표시
      console.error('인증 토큰이 없습니다.');
      router.replace('/'); // 로그인 페이지로
    }
  }, [router, searchParams]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div className="p-8 bg-card shadow-md rounded-lg text-center border border-border">
        <h1 className="text-2xl font-semibold text-text-primary mb-4">인증 처리 중...</h1>
        <p className="text-text-secondary">잠시만 기다려주세요. 메인 페이지로 이동합니다.</p>
        {/* 간단한 로딩 스피너 등을 추가할 수 있습니다 */}
        <div className="mt-6">
          <svg 
            className="animate-spin h-8 w-8 text-primary mx-auto"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle 
              className="opacity-25" 
              cx="12" 
              cy="12" 
              r="10" 
              stroke="currentColor" 
              strokeWidth="4"
            ></circle>
            <path 
              className="opacity-75" 
              fill="currentColor" 
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        </div>
      </div>
    </div>
  );
}
