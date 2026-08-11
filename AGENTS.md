# Intern Project Hub 작업 지침

이 저장소는 Windows 11 호스트의 VS Code + WSL Ubuntu 환경에서 관리한다. 저장소 위치는 `/mnt/c/Users/gmltj/intern-project-hub`이며 Bash 명령은 WSL 터미널에서 실행한다.

## 작업 전 확인

- 작업 범위에 맞는 문서를 먼저 읽는다.
  - [제품 명세](docs/PRODUCT_SPEC.md)
  - [업무 규칙](docs/BUSINESS_RULES.md)
  - [아키텍처](docs/ARCHITECTURE.md)
  - [로드맵](docs/ROADMAP.md)
  - [기술 결정](docs/DECISIONS.md)
- 변경 전에 간단한 구현 계획과 예상 수정 파일을 제시한다.
- 실제 저장소 상태가 문서와 다르면 코드를 우선 확인하고 문서도 함께 갱신한다.

## 필수 규칙

- 명시적 요청 없이 Git commit 또는 push를 하지 않는다.
- 원격 DB에는 명시적 승인 없이 migration을 실행하지 않는다.
- 이미 적용된 migration을 사후 수정하지 않고 새 migration을 추가한다.
- 데이터 손실 가능성이 있는 destructive migration은 실행하지 않는다.
- 사용자 데이터 삭제와 RLS 완화는 반드시 사전 승인을 받는다.
- `.env.local`, 비밀키, 토큰을 출력하거나 커밋하지 않는다.
- DB 컬럼은 snake_case, React/TypeScript 도메인 타입은 camelCase를 사용한다.
- Supabase 접근은 `src/services`에 두고 컴포넌트에서 직접 쿼리하지 않는다.
- 공통 도메인 타입은 `src/types/domain.ts`에서 관리한다.
- UI 변경 시 기존 디자인과 CSS 클래스를 우선 재사용한다.
- 변경 후 `npm run build`를 실행한다. 필요하면 관련 lint와 테스트도 실행한다.
- 실행하지 못했거나 통과하지 못한 검증 항목을 완료했다고 주장하지 않는다.

