# L.B ONLINE Website

리뱅 온라인 네트워크의 공식 웹사이트입니다.  
Cloudflare Pages + Functions + KV + D1 기반으로 운영되며, 서버 목록/패치노트/운영진 편집과 토스페이먼츠 결제위젯 기반 테스트 후원 흐름을 제공합니다.

## 주요 기능

- Leaf 스타일 다크 UI와 모바일 반응형 레이아웃
- 서버 목록 / 패치 노트 / 운영진 섹션
- 로그인 계정 기반 관리자 편집 모드
- 토스페이먼츠 SDK v2 주문서형 결제위젯
- 서버 발급 주문 및 서버 승인 방식의 테스트 결제
- KV 콘텐츠 저장과 D1 계정/결제 주문 관리

## 결제 구조

현재 구현은 테스트/샌드박스 사용을 기본으로 합니다.

1. 홈 화면에서 응원 패키지와 결제수단을 선택합니다.
2. 브라우저는 `POST /api/payments/order`로 서버 기준 주문을 생성합니다.
3. 브라우저는 공개 가능한 `TOSS_CLIENT_KEY`로 토스페이먼츠 결제위젯을 띄우고 인증을 요청합니다.
4. 성공 리다이렉트 화면은 `paymentKey`, `orderId`, `amount`를 `POST /api/payments/confirm`으로 보냅니다.
5. Pages Function은 D1에 저장된 원 주문 금액과 요청 금액을 비교합니다.
6. 금액이 일치할 때만 서버의 `TOSS_SECRET_KEY`로 토스페이먼츠 승인 API를 호출하고 결과를 D1에 저장합니다.

`TOSS_SECRET_KEY`는 `public/` 또는 브라우저 JavaScript에 넣지 않습니다. `TOSS_CLIENT_KEY`는 SDK 초기화에 필요한 공개 키이며 `/api/payments/config`가 브라우저에 제공합니다.

토스페이먼츠 결제위젯은 네이버페이, 카카오페이 등 간편결제 UI를 지원합니다. 네이버페이는 테스트 키로 확인할 수 있지만, 카카오페이는 계약 후 발급받은 상점 테스트 키에서 위젯 노출과 테스트가 가능합니다.

## 프로젝트 구조

```text
public/
  index.html
  auth/index.html
  payment/
    success/index.html
    fail/index.html
functions/
  _lib/
    auth.js
    password.js
    payments.js
  api/
    payments/
      config.js
      order.js
      confirm.js
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

생성된 Wrangler 설정은 배포 시 설정의 기준이 될 수 있으므로, Cloudflare 대시보드의 실제 `LB_DATA` 및 `LB_DB` 바인딩과 일치하는지 검토한 뒤 커밋합니다.

D1에 신규 결제 주문 테이블을 포함한 스키마를 적용합니다. `<D1_DATABASE_NAME>`은 실제 D1 데이터베이스 이름으로 바꿉니다.

```bash
npx wrangler d1 execute <D1_DATABASE_NAME> --local --file=./schema.sql
```

프로젝트 루트에 커밋하지 않을 `.dev.vars`를 만들고 토스페이먼츠 개발자센터에서 발급받은 **테스트 결제위젯 연동 키**를 설정합니다.

```dotenv
TOSS_PAYMENT_MODE="test"
TOSS_CLIENT_KEY="test_..."
TOSS_SECRET_KEY="test_..."
```

`TOSS_SECRET_KEY`는 서버 Function만 읽습니다. `.dev.vars`와 `.env`는 `.gitignore`에서 제외되어 있습니다.

로컬 Pages와 Functions를 실행합니다.

```bash
npx wrangler pages dev public
```

다운로드한 Wrangler 설정을 사용하지 않고 일회성으로 바인딩을 전달하려면 KV/D1 바인딩과 프로젝트에서 사용하는 호환 날짜를 CLI 옵션으로 지정합니다. 아래 날짜는 현재 확인된 개발 서버 호환 기준이며, 대시보드 설정을 내려받은 경우에는 해당 설정 파일의 `compatibility_date`를 우선합니다.

```bash
npx wrangler pages dev public --compatibility-date=2026-05-03 --kv=LB_DATA --d1 LB_DB=<D1_DATABASE_ID>
```

결제 키는 CLI 인자에 직접 적지 말고 `.dev.vars`를 사용합니다.

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
| `LB_DB` (D1 database) | 사용자, 세션, 결제 주문/승인 상태 |

원격 D1에도 스키마를 적용합니다.

```bash
npx wrangler d1 execute <D1_DATABASE_NAME> --remote --file=./schema.sql
```

Pages 프로젝트의 **Settings > Variables and Secrets**에서 결제 설정을 등록합니다.

| 이름 | 형식 | 테스트 배포 값 |
| --- | --- | --- |
| `TOSS_PAYMENT_MODE` | 일반 변수 | `test` |
| `TOSS_CLIENT_KEY` | 일반 변수 | 토스 테스트 클라이언트 키 |
| `TOSS_SECRET_KEY` | Encrypt 적용 시크릿 | 토스 테스트 시크릿 키 |

키와 바인딩을 추가한 다음 새 배포를 실행해야 Functions에서 사용할 수 있습니다. 테스트 완료 전에는 `TOSS_PAYMENT_MODE=test`와 `test_*` 키만 사용합니다. 계약 및 결제수단 설정이 끝난 뒤 라이브 전환 시에는 상점 설정을 검증하고 별도 배포에서 `live` 키와 `TOSS_PAYMENT_MODE=live`를 함께 적용합니다.

## API 엔드포인트

- `POST /api/auth/signup`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- `GET /api/auth/google/start`, `GET /api/auth/google/callback`
- `GET|POST /api/servers`, `GET|POST /api/patch`, `GET|POST /api/team`, `GET|POST /api/site`
- `GET /api/payments/config`
- `POST /api/payments/order`
- `POST /api/payments/confirm`

## 참고 문서

- [토스페이먼츠 SDK v2 결제위젯](https://docs.tosspayments.com/sdk/v2/js)
- [토스페이먼츠 결제 흐름 및 승인](https://docs.tosspayments.com/guides/v2/get-started/payment-flow)
- [Cloudflare Pages Functions Bindings 및 Secrets](https://developers.cloudflare.com/pages/functions/bindings/)
- [Cloudflare Pages 로컬 개발](https://developers.cloudflare.com/pages/functions/local-development/)
