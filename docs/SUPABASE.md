# Supabase · Google 로그인

OX 퀴즈 앱은 Supabase 프로젝트 **민법기출ox** (`jisoyiiimgaxihpyntrj`)를 사용합니다.

## 테이블

| 테이블 | 용도 |
|--------|------|
| `ox_profiles` | 프로필, 커뮤니티 닉네임, `appearance_settings` |
| `ox_user_state` | 사용자별 `progress`, `notes` (JSON) |
| `ox_community_posts` | 커뮤니티 글 |
| `ox_item_attempts` | 보기별 시도 (향후 확장) |

스키마 SQL: `supabase/migrations/20260525111934_ox_quiz_app_schema.sql`

## 로컬 설정

1. `.env.example`을 복사해 `.env` 생성
2. [Supabase Dashboard](https://supabase.com/dashboard/project/jisoyiiimgaxihpyntrj/settings/api) → **Project URL**, **anon** 또는 **publishable** 키 입력
3. `npm run dev` 후 상단 **Google 로그인** 사용

```bash
cp .env.example .env   # Windows: copy .env.example .env
```

## Google OAuth (Supabase 대시보드)

1. [Authentication → Providers](https://supabase.com/dashboard/project/jisoyiiimgaxihpyntrj/auth/providers) → **Google** 활성화
2. [Google Cloud Console](https://console.cloud.google.com/)에서 OAuth 클라이언트 ID/Secret 생성
3. **Authorized redirect URIs**에 Supabase 콜백 URL 추가:

   `https://jisoyiiimgaxihpyntrj.supabase.co/auth/v1/callback`

4. [Authentication → URL Configuration](https://supabase.com/dashboard/project/jisoyiiimgaxihpyntrj/auth/url-configuration) → **Redirect URLs**에 앱 주소 추가:

   - `http://localhost:5173`
   - Vercel 배포 URL (예: `https://your-app.vercel.app`)

## 동작

- **게스트**: 기존과 같이 `localStorage`만 사용
- **로그인**: `ox_user_state`·`ox_profiles`와 동기화, 커뮤니티는 `ox_community_posts` 사용
- 첫 로그인 시 로컬 진도·노트가 비어 있으면 클라우드에 업로드, 클라우드에 데이터가 있으면 그쪽을 우선 적용

## MCP

Cursor의 **user-supabase** MCP로 마이그레이션·SQL 조회가 가능합니다.
