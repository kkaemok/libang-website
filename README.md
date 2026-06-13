# L.B ONLINE Website

리뱅 온라인 네트워크의 공식 웹사이트입니다.

Cloudflare Pages + Functions + KV + D1 기반으로 운영되며, 서버 목록/패치 노트/운영진/사이트 문구를 관리자 계정으로 편집할 수 있습니다. 결제 위젯은 제거했고, 후원 및 구매 상담은 공식 문의 채널로 연결합니다.

## 주요 기능

- Liquid glass 스타일의 밝은 반응형 UI
- Home, Servers, Support, Patches, Team 분리 페이지
- 로그인 계정 기반 관리자 편집 모드
- 서버 목록, 패치 노트, 운영진 순서 변경/추가/삭제/저장
- KV 콘텐츠 저장과 D1 계정/세션 관리

## 프로젝트 구조

```text
public/
  index.html
  auth/index.html
  servers/index.html
  support/index.html
  patch/index.html
  team/index.html
  assets/
    libang-icon.png
    site.css
    site.js
functions/
  _lib/
    auth.js
    password.js
  api/
    auth/
    servers.js
    patch.js
    team.js
    site.js
schema.sql
```

## 로컬 실행

Cloudflare Pages 프로젝트 이름이 `libang-website`이고 대시보드에서 기존 바인딩을 관리 중이라면, 먼저 현재 설정을 내려받아 로컬 Wrangler 설정으로 사용합니다.

```bash
npx wrangler pages download config libang-website
```

D1에 계정/세션 스키마를 적용합니다. `<D1_DATABASE_NAME>`은 실제 D1 데이터베이스 이름으로 바꿉니다.

```bash
npx wrangler d1 execute <D1_DATABASE_NAME> --local --file=./schema.sql
```

로컬 Pages와 Functions를 실행합니다.

```bash
npx wrangler pages dev public
```

다운로드한 Wrangler 설정을 사용하지 않고 일회성으로 바인딩을 전달하려면 KV/D1 바인딩과 프로젝트에서 사용하는 호환 날짜를 CLI 옵션으로 지정합니다.

```bash
npx wrangler pages dev public --compatibility-date=2026-05-03 --kv=LB_DATA --d1 LB_DB=<D1_DATABASE_ID>
```

## Cloudflare Pages 배포

GitHub 저장소 `kkaemok/libang-website`를 Pages 프로젝트에 연결한 상태에서 다음 빌드 구성을 유지합니다.

| 설정 | 값 |
| --- | --- |
| Production branch | `main` |
| Build command | 비움 |
| Build output directory | `public` |
| Root directory | 비움 |

Pages 프로젝트의 **Settings > Bindings**에서 다음 바인딩을 Production과 Preview 환경에 필요한 범위로 추가합니다.

| 바인딩 | 용도 |
| --- | --- |
| `LB_DATA` (KV namespace) | 사이트 편집 콘텐츠 |
| `LB_DB` (D1 database) | 사용자 및 세션 |

원격 D1에도 스키마를 적용합니다.

```bash
npx wrangler d1 execute <D1_DATABASE_NAME> --remote --file=./schema.sql
```

## API 엔드포인트

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/auth/google/start`
- `GET /api/auth/google/callback`
- `GET|POST /api/servers`
- `GET|POST /api/patch`
- `GET|POST /api/team`
- `GET|POST /api/site`

## 관리자 편집

1. `/auth/`에서 관리자 계정으로 로그인합니다.
2. 각 페이지 상단의 편집 버튼을 누릅니다.
3. 텍스트는 화면에서 직접 수정하고, 목록은 추가/삭제/순서 변경 후 저장합니다.
4. 저장된 콘텐츠는 KV에 보관됩니다.
