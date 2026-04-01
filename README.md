# L.B ONLINE Website

리뱅 온라인 네트워크의 공식 웹사이트입니다.  
Cloudflare Pages + Functions + KV를 기반으로 운영되며, 관리자 전용 편집 모드를 통해 서버 목록/패치노트/운영진 정보를 실시간으로 관리할 수 있습니다.

---

**주요 기능**
- Leaf 스타일 기반의 다크 UI 레이아웃
- 서버 목록 / 패치 노트 / 운영진 섹션 제공
- 관리자 로그인 후 인라인 편집 및 저장
- Cloudflare KV에 데이터 저장
- Pages Functions 기반 API 제공

---

**기술 스택**
- HTML / CSS / JavaScript
- Cloudflare Pages Functions
- Cloudflare KV

---

**프로젝트 구조**
```
public/
  index.html
  assets/
functions/
  api/
    auth.js
    servers.js
    patch.js
    team.js
    site.js
```

---

**Cloudflare Pages 배포**
1. GitHub 레포를 Cloudflare Pages에 연결합니다.
2. Build command는 비워둡니다.
3. Build output directory는 `public`으로 설정합니다.
4. Root directory는 비워둡니다. (레포 루트에 `public`과 `functions`가 있어야 함)
5. KV 네임스페이스를 생성하고 `LB_DATA`로 바인딩합니다.
6. Secrets에 `ADMIN_KEY`를 추가합니다.
7. 배포 후 사이트에 접속합니다.

---

**관리자 편집**
1. 우측 상단 계정 아이콘 클릭
2. `ADMIN_KEY` 입력
3. 텍스트/서버/패치/운영진 수정
4. 상단의 `편집 완료` 버튼으로 저장
5. `취소` 버튼으로 변경 사항 되돌리기

---

**API 엔드포인트**
- `GET /api/servers`
- `POST /api/servers`
- `GET /api/patch`
- `POST /api/patch`
- `GET /api/team`
- `POST /api/team`
- `GET /api/site`
- `POST /api/site`

---

**보안**
- `ADMIN_KEY`는 서버에서 검증됩니다.
- 클라이언트 코드에는 비밀번호가 포함되지 않습니다.

---

**라이선스**
라이선스는 [LICENSE](LICENSE) 파일을 참고하세요.
