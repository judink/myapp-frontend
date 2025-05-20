// src/types/user.ts

export interface User {
  id: string; // DB의 사용자 ID
  googleId?: string; // 구글 ID (선택적)
  displayName: string; // 구글 표시 이름
  email: string; // 이메일
  solanaPublicKey?: string; // 솔라나 공개키 (최초 로그인 시 생성)
  // 필요에 따라 추가적인 사용자 정보를 포함할 수 있습니다.
}
