# Supabase 방명록

전시 방명록은 **Supabase Postgres**에 저장되어 모든 방문자가 같은 목록을 봅니다.

## 1. 프로젝트 만들기

1. [supabase.com](https://supabase.com)에서 프로젝트 생성  
2. **SQL Editor**에서 `supabase/schema.sql` 내용 실행  

## 2. API 키

**Project Settings → API**에서 복사:

- Project URL → `PUBLIC_SUPABASE_URL`
- anon public → `PUBLIC_SUPABASE_ANON_KEY`

## 3. 로컬

```bash
cp .env.example .env
# .env 값 채운 뒤
npm run dev
```

`.env`가 없으면 예전처럼 **브라우저 localStorage**만 사용합니다 (기기마다 따로).

## 4. GitHub Pages 배포

Repository **Settings → Secrets and variables → Actions**에 추가:

| Secret | 값 |
|--------|-----|
| `PUBLIC_SUPABASE_URL` | Supabase Project URL |
| `PUBLIC_SUPABASE_ANON_KEY` | anon key |

`main` push 시 빌드에 주입되어 정적 JS에 포함됩니다. (anon key는 클라이언트에 노출되는 것이 정상이며, RLS로 insert/select만 허용합니다.)

## 5. 운영

- 부적절한 글: Supabase **Table Editor**에서 행 삭제  
- Rate limit·스팸 방지가 필요하면 Edge Function 또는 RLS 강화를 추가하세요.
