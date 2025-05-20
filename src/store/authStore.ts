// src/store/authStore.ts
import { create } from 'zustand';
import apiClient from '@/lib/api'; // API 클라이언트
import { User } from '@/types/user'; // 방금 만든 User 타입

interface AuthState {
  user: User | null;
  token: string | null;
  isLoggedIn: boolean;
  isLoading: boolean; // 인증 상태 로딩 중 여부
  login: (token: string, userData: User) => void; // 로그인 시 호출
  logout: () => Promise<void>; // 로그아웃 시 호출
  initializeAuth: () => void; // 앱 시작 시 인증 상태 초기화
  fetchUser: () => Promise<void>; // 토큰이 있을 때 사용자 정보 가져오기
}

const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoggedIn: false,
  isLoading: true, // 앱 시작 시 로딩 상태로 시작

  login: (token, userData) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('jwtToken', token);
    }
    // apiClient의 헤더는 인터셉터에서 자동으로 설정됨
    set({ user: userData, token, isLoggedIn: true, isLoading: false });
  },

  logout: async () => {
    set({ isLoading: true });
    if (typeof window !== 'undefined') {
      localStorage.removeItem('jwtToken');
    }
    delete apiClient.defaults.headers.common['Authorization']; // API 클라이언트 헤더에서도 제거
    try {
      // 백엔드에 로그아웃 요청 (세션/쿠키 무효화 등)
      await apiClient.post('/api/auth/logout'); 
      console.log('Logged out from server and client side');
    } catch (error) {
      console.error('Logout API call failed:', error);
      // 실패하더라도 클라이언트 측에서는 로그아웃 처리 계속 진행
    }
    set({ user: null, token: null, isLoggedIn: false, isLoading: false });
    // 로그인 페이지로 리디렉션
    if (typeof window !== 'undefined') {
        window.location.href = '/'; // 간단한 리디렉션
    }
  },

  fetchUser: async () => {
    set({ isLoading: true });
    try {
      // 백엔드의 /api/auth/me 엔드포인트는 JWT를 통해 사용자를 식별하고 사용자 정보를 반환해야 함
      const response = await apiClient.get<{ user: User }>('/api/auth/me'); 
      if (response.data && response.data.user) {
        // Assuming the backend /api/auth/me endpoint now returns solanaPrivateKey
        set({ user: response.data.user, isLoggedIn: true, isLoading: false });
      } else {
        // 토큰은 유효했으나 사용자 정보를 못 받아온 경우 (이론상 발생하기 어려움)
        // 또는 /api/auth/user가 사용자를 찾지 못한 경우
        console.warn('User data not found in /api/auth/user response, logging out.');
        get().logout(); // 상태 초기화
      }
    } catch (error) {
      console.error('Failed to fetch user with token:', error);
      // apiClient의 응답 인터셉터에서 401 시 localStorage 토큰 제거 등을 이미 처리할 수 있음
      // 여기서는 상태만 초기화
      set({ user: null, token: null, isLoggedIn: false, isLoading: false });
    }
  },
  
  initializeAuth: () => {
    if (typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('jwtToken');
      if (storedToken) {
        set({ token: storedToken, isLoggedIn: true }); // 우선 토큰과 로그인 상태 설정
        get().fetchUser(); // 그 다음 실제 사용자 정보 가져오기 (토큰 유효성 검증 포함)
      } else {
        set({ user: null, token: null, isLoggedIn: false, isLoading: false }); // 토큰 없으면 로딩 완료, 비로그인 상태
      }
    } else {
      // 서버 사이드 렌더링 환경에서는 로컬 스토리지가 없으므로 로딩 완료 처리
      set({ isLoading: false }); 
    }
  },
}));

export default useAuthStore;
