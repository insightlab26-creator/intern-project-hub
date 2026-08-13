# Intern Project Hub 기술 및 제품 결정 기록

이 문서는 현재 확인된 결정을 기록한다. 날짜는 문서 최초 작성일 기준이며, 변경 시 기존 기록을 삭제하지 않고 새 결정을 추가한다.

## 2026-08-03 — Firebase 대신 Supabase PostgreSQL 사용

**결정:** 인증과 운영 데이터 저장소를 Supabase Auth 및 PostgreSQL로 통합한다.

**이유:** 프로젝트, 프로그램, 참여 관계, Task, 산출물과 평가 데이터는 관계형 무결성이 중요하다. 향후 통계와 AI 분석을 위한 쿼리 및 RLS도 PostgreSQL 구조가 적합하다.

**현재 상태:** Firebase SDK와 설정 파일은 제거됐고 Supabase 서비스 및 migration이 존재한다.

## 2026-08-03 — Profile과 Intern 분리

**결정:** 로그인 계정과 권한은 `profiles`, 인턴 참여 이력은 `interns`로 관리한다.

**이유:** 로그인 계정이 비활성화되거나 종료되어도 과거 참여, 담당 업무와 평가 이력을 보존해야 한다. 인턴 이력은 계정 없이도 존재할 수 있다.

## 2026-08-03 — 삭제보다 상태 기반 보관

**결정:** 운영 엔티티의 물리 삭제보다 상태 전환을 우선한다.

**이유:** 업무 맥락, 운영 기록과 지식자산은 후속 인턴 및 성과 분석에 필요하다. Project에는 `ARCHIVED`, Intern에는 `COMPLETED` 상태를 제공한다.

**영향:** 현재 일반 운영 테이블에는 authenticated 삭제 권한을 부여하지 않는다. 관계 교체에 필요한 task_assignees 삭제만 예외다.

## 2026-08-03 — Task 담당자를 관계 테이블로 분리

**결정:** 담당자를 Task 컬럼이 아닌 `task_assignees` 관계 테이블에 저장한다.

**이유:** 다중 담당자 확장, 관계 정규화와 담당 이력 확장 기반을 확보한다.

**현재 상태:** UI에서 여러 담당자를 선택하고 RPC가 Task 및 담당자 관계를 원자적으로 저장한다.

## 2026-08-03 — DB 변경을 migration SQL로 관리

**결정:** 모든 스키마, 함수, trigger와 RLS 변경은 `supabase/migrations`의 SQL로 남긴다.

**이유:** 환경 간 재현성, 변경 이력과 코드 리뷰 가능성을 확보한다.

**운영 규칙:** 이미 적용된 migration은 사후 수정하지 않는다. 원격 실행과 파괴적 변경은 사전 승인을 받는다.

## 2026-08-03 — Task 진행 시 부모만 자동 활성화

**결정:** Task가 `IN_PROGRESS`, `REVIEW`, `DONE`이 되면 PLANNING 상태의 Project와 Workstream만 ACTIVE로 전환한다.

**이유:** 실제 업무가 시작된 상위 항목을 수동으로 활성화하는 부담을 줄인다.

**경계:** ACTIVE를 PLANNING으로 되돌리지 않고 `ON_HOLD`, `COMPLETED`, `ARCHIVED`를 변경하지 않는다. 완료와 보류는 관리자의 명시적 판단으로 남긴다.

## 2026-08-03 — Supabase 접근을 Service 계층으로 분리

**결정:** React 컴포넌트가 직접 Supabase를 호출하지 않고 `src/services`의 도메인 함수로 접근한다.

**이유:** 화면과 데이터 접근 책임을 분리하고 snake_case DB Row를 camelCase 도메인 모델로 변환하는 경계를 일관되게 유지한다.

**현재 예외:** Profile 타입/매핑은 아직 snake_case를 React에 노출하며 정리 대상이다.

## 2026-08-04 — Program과 참여 관계 정규화

**결정:** 프로그램/기수는 `programs`, 인턴 참여는 `program_enrollments`, 프로젝트 연결은 `program_projects`, 프로젝트 멤버는 `project_members`로 분리한다.

**이유:** 한 인턴과 프로젝트가 여러 프로그램에 참여할 수 있으므로 기존 자유 입력 `interns.cohort`만으로는 기간, 상태, 역할과 이력을 안전하게 표현할 수 없다.

**전환 정책:** 기존 `interns.cohort`는 삭제하거나 자동 변환하지 않는다. 운영자가 실제 Program을 만든 뒤 명시적으로 연결하며, 신규 테이블 권한은 우선 ADMIN 전용으로 유지한다.

## 2026-08-06 — Task 진행 기록은 append 중심으로 보존

**결정:** `task_updates`의 진행·학습·장애·다음 계획과 기록일은 작성 후 변경하지 않고, 관리자 피드백과 검토 상태만 갱신한다.

**이유:** 최신 내용으로 덮어쓰면 수행 과정과 학습 맥락이 사라져 피드백·평가·인수인계 자료로 사용할 수 없다.

**권한:** 첫 구현은 ADMIN 전용이다. 물리 삭제 권한은 부여하지 않으며 INTERN 작성 권한은 담당 Task 범위와 민감 피드백 열람 정책을 확정한 후 별도 migration으로 연다.

## 2026-08-05 — Auth 관리자 작업은 Edge Function으로 격리

**결정:** 사용자 초대, 비밀번호 재설정과 Auth 계정 차단은 브라우저에서 직접 수행하지 않고 활성 ADMIN을 재검증하는 Edge Function에서 처리한다.

**이유:** Auth Admin API의 service role 권한을 프론트엔드에 노출하지 않으면서 로그인 계정과 앱 profile 상태를 함께 관리해야 한다.

**종료 정책:** Auth 사용자는 삭제하지 않는다. 장기 로그인 차단과 profile `INACTIVE`를 적용하고, 과거 인턴·업무 및 감사 기록은 보존한다.

## 2026-08-11 — Task를 Work Package로 재정의

**결정:** 기존 `tasks`, `task_assignees`, Task RPC와 URL은 호환성을 위해 유지하고, 사용자 화면에서는 Project 결과에 직접 연결되는 상위 실행 단위인 `Work Package`로 표현한다. `workstreams`는 Work Package를 묶는 프로젝트 단계 또는 업무 영역으로 사용한다.

**이유:** 기존 관계 무결성, 담당자, 상태 자동화와 이력을 보존하면서 웹이 Loop/Planner의 개인 To-do 기능과 경쟁하지 않도록 역할을 분리한다.

**외부 파일 원칙:** Documents는 파일 저장소가 아니다. 실제 파일과 버전 이력은 Teams에 두고 웹에는 최신 원본 URL과 최소 메타정보만 저장한다. Resources와 Deliverables를 별도 사용자 기능으로 구분하지 않는다.

## 2026-08-11 — 버전 검토와 BX Review Gate 분리

**결정:** 파일별 승인·보완 및 Deliverable Review Gate는 사용자 화면에서 제거한다. 활용 가치 판단과 회의 결론은 Project Review Gate의 `REVISE / KEEP / ASSET / DROP`, 결정 요약, 다음 조치와 Teams 회의록 링크로 통합한다. 기존 Deliverable과 Decision DB 이력은 데이터 보존을 위해 유지한다.

**이유:** 제출 승인과 조직 자산 가치는 서로 다른 판단이며, 실패·보류 판정도 다음 프로젝트가 참고할 조직 경험으로 보존해야 한다.

## 2026-08-11 — Microsoft 365와 중복되는 운영 UI 축소

**결정:** 신규 하위 Work Package 입력을 비활성화하고 주요 진행 업데이트만 웹에 남긴다. Calendar는 Next Review를 포함한 상위 일정 중심으로 사용한다. 평가·민감 메모는 Operations로 분리하고 Data Cleanup은 사이드바에서 숨긴다. 상세 KPI는 Teams 원본 계획에서 관리하며 웹에 중복 입력하지 않는다.

**이유:** 웹이 Loop/Planner의 개인 To-do·일정·Action Item 기능과 경쟁하지 않으면서 Project Control Tower 역할에 집중하도록 한다. 기존 데이터와 직접 URL은 호환성을 위해 보존한다.

## 2026-08-11 — BX Intern UI Redesign 적용

**결정:** `BX Intern UI Redesign`의 단일 HTML 시안을 기준으로 밝은 사이드바, BX 로고, Manrope/Sora 타이포그래피, 파란 포인트와 둥근 카드 중심의 공통 UI를 적용한다.

**독립성:** 디자인 폴더는 참고 자료로만 사용한다. 런타임에 필요한 로고는 `public/bx-intern-logo.png`로 복사하고 애플리케이션 코드에서 디자인 폴더의 HTML, 스크립트와 업로드 자산을 참조하지 않는다.

## 2026-08-13 — Project 범위 인턴 관리자 역할

**결정:** `MANAGER` 역할을 추가하고 기존 `projects.operator_id`를 담당 Project 권한 경계로 사용한다. ADMIN은 사이트 전체를 관리하고 운영 담당자를 지정하며, MANAGER는 담당 Project의 Work Package, 참여 인턴, 진행 기록, Documents와 Review를 운영한다.

**경계:** MANAGER는 Project 생성·담당자 변경, 사용자·프로그램·평가·감사·삭제 기능에 접근하지 않는다. 별도 인수인계 워크플로는 만들지 않고 Project의 기존 맥락과 기록을 다음 관리자가 이어서 사용한다.
