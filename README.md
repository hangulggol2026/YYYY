# 2026 한글꼴 가을전 웹

## 로컬 실행

```bash
npm install
npm run dev
```

`npm run dev` 실행 시 **브라우저가 자동으로** `http://localhost:4321` 을 엽니다.

**빠른 링크 모음**: [http://localhost:4321/dev.html](http://localhost:4321/dev.html) (서버 켠 뒤)  
또는 다른 터미널에서 `npm run open` (macOS 기본 브라우저).

| 명령 | 이동 |
|------|------|
| `npm run open` | `/dev.html` 링크 모음 |
| `npm run open:main` | 메인 목록 |
| `npm run open:seopung` | 서풍 상세 |

빌드 결과만 볼 때:

```bash
npm run build
npm run preview
```

## 폰트 스모크 테스트

현재 16종 목록·상세 모두 **서풍 Regular** (`public/fonts/exhibition/seopung-Regular.otf`)를 사용합니다.  
`Fonts/seopung-Medium.otf`는 추후 웨이트 슬라이더 또는 Medium 전환 시 연결합니다.

## 배포

GitHub Pages용 `base`는 `astro.config.mjs`에서 저장소 이름에 맞게 수정하세요.

### 방명록 (전 visitors 공유)

Supabase 설정이 필요합니다. 로컬 `.env`와 GitHub Actions Secrets에 `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`를 넣으세요. 자세한 절차는 [supabase/README.md](./supabase/README.md)를 참고하세요.

