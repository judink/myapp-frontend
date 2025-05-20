// src/lib/api.ts
import axios, { InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

const apiClient = axios.create({
  baseURL: backendUrl,
  withCredentials: true, // 쿠키를 주고받기 위해 필요 (세션 기반 인증 시)
});

// 요청 인터셉터: 모든 요청에 JWT를 헤더에 추가
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== 'undefined') { // 브라우저 환경에서만 실행
      const token = localStorage.getItem('jwtToken');
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// 응답 인터셉터 (예: 401 Unauthorized 시 자동 로그아웃 처리 등 - 선택 사항)
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error: AxiosError) => {
    if (error.response && error.response.status === 401) {
      // 예: 토큰 만료 또는 무효 시 자동 로그아웃 처리
      if (typeof window !== 'undefined') {
        localStorage.removeItem('jwtToken');
        // 로그인 페이지로 리디렉션 (라우터 사용 필요)
        // window.location.href = '/'; 
        console.error('Unauthorized, logging out.');
      }
    }
    return Promise.reject(error);
  }
);

// Function to call the new LP removal backend
// Function to call the original backend for LP removal
export const removeLiquidityPosition = async (positionAddress: string, poolAddress: string) => {
  try {
    // Request sent to the original backend, which will handle private key retrieval and forwarding
    const response = await apiClient.post('/api/dlmm/remove-lp', {
      positionAddress,
      poolAddress,
    });
    return response.data;
  } catch (error) {
    console.error('Error removing liquidity position:', error);
    throw error;
  }
};

export default apiClient;
