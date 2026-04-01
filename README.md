# L.B ONLINE Website

리뱅 온라인 네트워크의 공식 웹사이트입니다.  
Cloudflare Pages + Functions + KV + D1을 기반으로 운영되며, 관리자 전용 편집 모드를 통해 서버 목록/패치노트/운영진/텍스트를 관리할 수 있습니다.

---

**주요 기능**
- Leaf 스타일 기반 다크 UI
- 서버 목록 / 패치 노트 / 운영진 섹션 제공
- 로그인 계정 기반 관리자 편집 (편집 완료/취소)
- Cloudflare KV에 콘텐츠 저장
- D1 기반 계정/세션 관리
- Google 로그인 + 이메일/비밀번호 로그인 지원

---

**기술 스택**
- HTML / CSS / JavaScript
- Cloudflare Pages Functions
- Cloudflare KV
- Cloudflare D1

---

**프로젝트 구조**
```
public/
  index.html
  auth/
    index.html
  assets/
functions/
  _lib/
    auth.js
    password.js
  api/
    auth/
      login.js
      signup.js
      logout.js
      me.js
      google/
        start.js
        callback.js
    servers.js
    patch.js
    team.js
    site.js
schema.sql
```

---

## Cloudflare Pages 배포
1. GitHub 레포를 Cloudflare Pages에 연결합니다.
2. Build command는 비워둡니다.
3. Build output directory는 `public`으로 설정합니다.
4. Root directory는 비워둡니다. (레포 루트에 `public`과 `functions`가 있어야 함)

### KV 바인딩
- `LB_DATA`로 KV 네임스페이스를 바인딩합니다.

### D1 바인딩
- D1 데이터베이스를 생성하고 `LB_DB`로 바인딩합니다.
- `schema.sql`을 실행해 테이블을 생성합니다.

### OAuth 설정 (선택)
Google 로그인 사용 시 아래 환경 변수가 필요합니다.
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI` (선택, 없으면 자동 생성)

---

## 관리자 지정 방식 (수동)
관리자 계정은 D1에서 `role='admin'`으로 직접 변경합니다.

예시:
```sql
UPDATE users SET role='admin' WHERE email='admin@example.com';
```

---

## 관리자 편집
1. 우측 상단 계정 아이콘 → 로그인/회원가입
2. 로그인 후 `role=admin` 계정이면 편집 UI 활성화
3. 수정 후 상단의 `편집 완료` 버튼으로 저장
4. `취소` 버튼으로 마지막 저장 상태로 되돌리기

---

## API 엔드포인트
- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/auth/google/start`
- `GET /api/auth/google/callback`
- `GET /api/servers`
- `POST /api/servers` (admin)
- `GET /api/patch`
- `POST /api/patch` (admin)
- `GET /api/team`
- `POST /api/team` (admin)
- `GET /api/site`
- `POST /api/site` (admin)

---

## 보안
- 비밀번호는 PBKDF2 해시로 저장됩니다.
- 세션은 HttpOnly 쿠키로 관리됩니다.
- 클라이언트 코드에는 비밀번호/관리자 키가 포함되지 않습니다.

---

## 라이선스
라이선스는 [LICENSE](LICENSE) 파일을 참고하세요.
