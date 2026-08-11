# Intern Project Hub

인턴 프로그램과 참여자, 프로젝트, Workstream, Task, 담당자와 운영 이력을 관리하는 내부 웹 애플리케이션입니다. React/Vite 프런트엔드와 Supabase Auth/PostgreSQL을 사용합니다.

현재 운영 데이터 범위는 ADMIN 전용입니다. INTERN과 VIEWER는 로그인할 수 있지만 운영 데이터 메뉴와 RLS 접근 권한이 아직 제공되지 않습니다. Users 화면은 기존 Auth 계정의 profile만 관리하며 계정 초대·비밀번호 초기화는 지원하지 않습니다.

## 실행 환경

- Windows 11 + VS Code
- WSL Ubuntu 터미널
- Node.js 24 이상과 npm
- Supabase 프로젝트

저장소는 WSL에서 다음 경로로 접근합니다.

```bash
cd /mnt/c/Users/gmltj/intern-project-hub
```

## 로컬 실행

의존성을 설치합니다.

```bash
npm install
```

`.env.example`을 참고해 `.env.local`을 만듭니다.

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

개발 서버를 실행합니다.

```bash
npm run dev
```

Vite가 출력한 로컬 주소를 브라우저에서 엽니다. 앱 사용을 위해 Supabase Auth 사용자와 연결된 `ACTIVE / ADMIN` profile이 필요합니다.

## 검증 명령

```bash
npm run lint
npm run build
```

로컬 Supabase CLI와 Docker가 준비된 환경에서는 DB 회귀 테스트를 실행할 수 있습니다.

React 화면 테스트는 다음 명령으로 실행합니다.

```bash
npm test
```

개발 중 반복 실행은 `npm run test:watch`를 사용합니다. Dashboard, Calendar, Plan Import와 권한별 메뉴 동작을 jsdom 환경에서 검증합니다.

```bash
npm run test:db
```

테스트는 Task 계층/순환 방지, 다중 담당자 저장, Project/Workstream 자동 활성화, 프로그램 참여 관계와 진행 기록 불변성·검토 처리를 확인합니다.

## Supabase migration

Migration은 `supabase/migrations`에 있으며 원격 DB에는 자동 적용되지 않습니다. 원격 작업 전에는 반드시 migration history를 확인합니다.

```bash
supabase login
supabase link --project-ref <project-ref>
supabase migration list
supabase db push --dry-run
supabase db push
```

주의사항:

- 원격 migration 실행은 사전 승인을 받은 경우에만 수행합니다.
- 이미 적용된 migration은 수정하거나 rename하지 않습니다.
- migration 파일은 고유한 14자리 버전으로 정렬하며, 이미 원격 적용된 파일은 수정하거나 rename하지 않습니다.
- 신규 DB 변경은 고유한 14자리 버전의 후속 migration으로 추가합니다.
- 데이터 삭제, destructive migration과 RLS 완화는 별도 승인이 필요합니다.

## 구조

```text
src/
├─ components/       Project 내부 Workstream/Task/Member UI
├─ constants/        공통 도메인 라벨
├─ pages/            Programs, Projects, Tasks, Interns와 URL 상세 화면
├─ services/         Supabase 데이터 접근 및 매핑
├─ types/domain.ts   공통 도메인 타입
└─ App.tsx           인증, 메뉴와 Dashboard

supabase/
├─ migrations/       순차 DB 변경
└─ tests/            pgTAP 회귀 테스트

sample-data/
├─ full-sample-dataset.sql  전체 화면 확인용 관계 데이터
└─ plan-import/             Plan Import용 Excel·CSV·JSON과 선행 Intern SQL
```

화면 확인용 샘플 적용 방법은 `sample-data/README.md`를 참고합니다. 샘플 SQL은 migration이 아니며 원격 적용 전에 대상 프로젝트를 별도로 확인해야 합니다.

제품 범위와 개발 규칙은 다음 문서를 기준으로 합니다.

- `docs/PRODUCT_SPEC.md`
- `docs/BUSINESS_RULES.md`
- `docs/ARCHITECTURE.md`
- `docs/ROADMAP.md`
- `docs/DECISIONS.md`
