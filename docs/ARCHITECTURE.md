# Intern Project Hub 아키텍처

## 1. 실행 환경과 기술

- Windows 11 호스트, VS Code, WSL Ubuntu
- 저장소: `/mnt/c/Users/gmltj/intern-project-hub`
- React 19, React Router 7, Vite 8, TypeScript 6
- Supabase JS, Auth, PostgreSQL과 Row Level Security
- npm 및 GitHub

Firebase SDK와 `firebase.ts`는 현재 소스 및 패키지에서 발견되지 않았다.

## 2. 애플리케이션 구조

```text
src/
├─ main.tsx                 Production entry, V2App만 렌더링
├─ app/                     AuthProvider와 정식 React Router route
├─ App.tsx                  V1 source 보존용, runtime에서 미사용
├─ supabase.ts              Supabase browser client 생성
├─ pages/                   V2 ADMIN pages와 V1 보존 pages
├─ components/              Workstreams, Tasks와 Project members 탭
├─ constants/               공통 상태·우선순위 라벨
├─ services/                Auth 및 도메인별 Supabase 접근
└─ types/domain.ts          공통 업무 타입

supabase/migrations/
├─ 20260803000100_initial_core_schema.sql
├─ 20260803000200_task_write_functions.sql
├─ 20260803000300_auto_activate_parent_status.sql
├─ 20260804000100_task_multi_assignee_functions.sql
├─ 20260805000100_program_memberships.sql
├─ 20260806000100_task_updates.sql
├─ 20260807000100_resources.sql
├─ 20260808000100_deliverables.sql
├─ 20260809000100_decisions.sql
├─ 20260810000100_manager_notes.sql
├─ 20260811000100_user_profile_management.sql
├─ 20260812000100_intern_reviews.sql
├─ 20260813000100_kpis.sql
└─ 20260814000100_audit_logs.sql
└─ 20260815000100_project_plan_import.sql
└─ 20260816000100_auth_account_audit.sql
└─ 20260817000100_user_workspace_preferences.sql
```

Production React Router는 `/admin`, `/manager`, `/intern` 정식 namespace를 사용한다. 기존 `/v2/*` URL은 대응되는 정식 URL로 redirect하며, V1 route는 runtime에서 render하지 않는다. Project 탭은 query parameter로 유지되어 새로고침과 직접 진입을 지원한다.

공통 UI는 `App.tsx`의 App Shell과 `App.css`의 BX Intern 테마를 사용한다. 브랜드 로고는 `public/bx-intern-logo.png`에 포함되어 있으며 외부 디자인 참고 폴더 없이 빌드·실행된다.

## 3. 데이터 접근 경계

- 컴포넌트 → service 함수 → Supabase client → PostgreSQL 순서로 접근한다.
- 현재 직접 Supabase 쿼리는 `src/services`와 `src/supabase.ts`에만 존재한다.
- service의 DB Row 타입은 snake_case이고 `mapProject`, `mapWorkstream`, `mapIntern`, `mapTask`에서 camelCase 도메인 타입으로 변환한다.
- 예외적으로 `UserProfile`은 현재 snake_case 필드를 그대로 노출하며 공통 타입도 `domain.ts` 밖에 있다. 정리 대상이다.
- 생성자는 현재 사용자 ID를 `created_by`, `updated_by`에 기록한다. Task 생성·수정은 RPC가 `auth.uid()`를 기록한다.

## 4. 현재 데이터 모델

### profiles

| 컬럼 | 타입/제약 | 설명 |
|---|---|---|
| id | uuid PK, auth.users FK, cascade | Auth 사용자 ID |
| email | text nullable | 이메일 |
| display_name | text not null | 표시 이름 |
| global_role | app_role, default VIEWER | ADMIN/MANAGER/INTERN/VIEWER |
| status | user_status, default ACTIVE | 계정 상태 |
| created_at / updated_at | timestamptz | 생성·수정 시각 |

Auth 사용자 생성 trigger가 profile을 만든다. profile 삭제은 Auth 사용자 삭제에 종속되므로 과거 이력 보존 정책과 실제 운영 절차를 함께 검토해야 한다.

### projects

기존 기본 정보에 `project_type`, 목적·배경·분야·현재 작업 단계, Teams 폴더 URL, 키워드와 운영 담당자를 추가한다. Project 상태는 검토·수정·중단 흐름을 포함한다. 과거 `expected_outcome` 데이터는 호환 목적으로 보존하지만 사용자 화면에서는 목적을 사용하며, 사용되지 않던 `next_review_date`는 신규 migration으로 제거한다.

### review_gates

Project 또는 Deliverable 중 정확히 하나를 대상으로 `REVISE / KEEP / ASSET / DROP` 판정과 의견, DROP 사유, 검토자·시각을 append 이력으로 보존한다. 기존 Deliverable 버전 승인/보완 검토는 제출 품질 검토이고 Review Gate는 BX 활용 가치 판정이므로 분리한다.

`id`, unique `code`, `name`, `description`, `status`, `start_date`, `target_end_date`, 감사 컬럼과 `schema_version`을 가진다. 날짜 순서와 공백 이름을 검사한다.

### workstreams

`project_id`로 Project에 종속되며 Project 삭제 시 cascade된다. 이름, 설명, 상태, `sort_order`와 감사 컬럼을 가진다. `(project_id, sort_order)`는 unique다.

### interns

이름, 학교, 전공, cohort 문자열, 참여 기간, 상태와 감사 컬럼을 가진다. nullable unique `user_id`로 profile과 연결할 수 있고 profile 삭제 시 null 처리된다.

### tasks

`project_id`, `workstream_id`, nullable `parent_task_id`, 제목·설명, 상태·우선순위, 기간, `sort_order`와 감사 컬럼을 가진다.

`tasks`는 기존 데이터와 RPC 호환을 위한 물리 명칭이며 사용자 화면에서는 인턴에게 맡기는 구체적인 결과물 단위인 `실행 업무`로 표시한다. `workstreams`는 실행 업무를 주제나 단계별로 묶는 `업무 영역`으로 표시한다. 물리 테이블과 관계는 그대로 재사용하므로 이 용어 변경에는 schema migration이 없다.

- Project 삭제: cascade
- Workstream 삭제: restrict
- 부모 Task 삭제: restrict
- trigger가 Workstream/Project 일치와 부모 관계 및 순환을 검증한다.

### task_assignees

`(task_id, intern_id)` 복합 PK의 관계 테이블이다. Task 삭제은 cascade, Intern 삭제은 restrict다. `assigned_at`, `assigned_by`를 기록한다.

```text
auth.users 1 ── 1 profiles 0..1 ── 1 interns
projects   1 ── N workstreams
projects   1 ── N tasks
workstreams 1 ── N tasks
tasks      1 ── N child tasks
tasks      N ── M interns (task_assignees)
programs   N ── M interns (program_enrollments)
programs   N ── M projects (program_projects)
projects   N ── M interns (project_members)
```

### programs와 참여 관계

`programs`는 프로그램/기수의 코드, 이름, 상태와 운영 기간을 관리한다. `program_enrollments`는 Program과 Intern 참여, `program_projects`는 Program과 Project 연결, `project_members`는 Project의 Intern 멤버 및 역할을 정규화한다. 각 관계는 상태 전환으로 종료하며 중복 관계를 unique 제약으로 막는다. 기존 `interns.cohort`는 자동 이관하지 않고 호환 필드로 유지한다.

### task_updates

Task별 기록일, 진행 내용, 학습, 장애 요소, 다음 계획과 관리자 피드백·검토 상태를 보존한다. 본문 변경 방지 trigger가 작성 이후 업무 기록을 불변으로 유지하며, 피드백과 검토 상태만 update한다.

### resources

Project에 필수로 속하고 같은 Project의 Task에 선택적으로 연결되는 외부 자료 링크다. 유형과 활성/보관 상태를 가지며 관계 검증 trigger가 교차 Project 연결을 차단한다.

### deliverables

`deliverables`가 Project/Task 연결과 현재 상태·버전을 관리하고, `deliverable_versions`와 `deliverable_reviews`가 제출 링크와 검토 결정을 append 이력으로 보존한다. 두 RPC가 버전 증가와 검토 상태 변경을 원자적으로 수행한다.

### decisions

Project에 속한 의사결정의 배경, 대안, 결정, 영향과 후속 조치를 보존한다. 같은 Project의 Task 및 이전 Decision만 연결하도록 trigger가 검증한다.

### manager_notes

Project·Intern·Task를 대상으로 하는 ADMIN 전용 민감 운영 기록이다. 유형, 후속 확인일, 해결일과 보관 상태를 관리하며 교차 Project Task 연결을 차단한다.
현재 데이터와 서비스는 보존하되 사이드바, 직접 화면, Dashboard 설정, 통합 검색과 Data Cleanup UI에서는 숨긴다.

## 5. DB 함수와 Trigger

- `handle_new_user`: Auth 사용자 생성 후 기본 VIEWER/ACTIVE profile 생성
- `set_updated_at`: 주요 테이블 수정 시 timestamp 갱신
- `is_admin`: 현재 사용자가 ACTIVE ADMIN인지 확인
- `is_manager`: 현재 사용자가 ACTIVE MANAGER인지 확인
- `can_manage_project`: ADMIN 또는 해당 Project의 활성 MANAGER인지 확인
- `validate_task_relationships`: Project/Workstream/부모 및 순환 관계 검증
- `create_task_with_assignees`: Task와 여러 담당자 원자적 생성
- `update_task_with_assignees`: Task 수정과 여러 담당자 원자적 교체
- `activate_parent_status_from_task`: 진행 상태 Task insert/update 후 PLANNING 부모를 ACTIVE로 전환
- `protect_task_update_history`: 작성된 진행 기록의 Task, 기록일과 본문 변경 차단
- `validate_resource_task_project`: Resource의 선택 Task와 Project 일치 검증
- `submit_deliverable_version`: 버전 번호 증가·버전 저장·제출 상태 전환
- `review_deliverable_version`: 검토 이력 저장·Deliverable 상태 전환
- `validate_decision_relationships`: Decision의 Task와 이전 결정이 같은 Project인지 검증
- `admin_update_profile`: ADMIN의 profile 변경과 자기 계정 잠금 방지
- `protect_finalized_intern_review`: 확정된 인턴 평가 변경 차단
- `calculate_kpi_achievement`: 목표값과 방향에 따른 KPI 실적 달성 상태 계산
- `write_audit_log`: 주요 행의 생성·수정 메타데이터와 변경 필드명 기록
- `admin-user-management` Edge Function: 활성 ADMIN 검증 후 Auth 초대·비밀번호 재설정·로그인 차단/활성화 수행

Task write 함수는 security invoker여서 호출자의 RLS를 적용한다. 자동 활성화 trigger 함수는 security definer이며 직접 실행 권한은 회수되어 있다.

## 6. RLS 현황

모든 현재 public 테이블에 RLS가 활성화되어 있다.

- profiles: 본인 조회 또는 ADMIN 조회, ADMIN 수정
- ADMIN은 전체 운영 테이블에 접근한다.
- MANAGER는 `projects.operator_id` 기준 담당 Project와 하위 Workstream, Task, 담당자, 진행 기록, Documents, Review와 Project 멤버에 접근한다.
- Project 생성과 운영 담당자 변경, 사용자·프로그램·평가·감사·삭제 기능은 ADMIN 전용이다.
- 일반 데이터 테이블에는 기본적으로 물리 삭제 권한이 없음
- task_assignees는 ADMIN이 담당자 교체를 위해 insert/delete 가능

현재 앱은 ADMIN에게 전체 운영 메뉴를 표시하고 MANAGER에게 Dashboard, 담당 Projects, Work Packages, Calendar와 Documents만 표시한다. INTERN은 `/intern/home`, 본인 Tasks와 Task Detail만 사용하며 RLS는 본인 assigned Task, 해당 Project/Workstream 맥락 및 본인 Task Update로 범위를 제한한다. VIEWER 권한은 추후 확장한다.

## 7. Dashboard

`dashboardService.ts`는 `App.tsx`에 import되어 Dashboard mount 시 호출된다. 다음 네 쿼리를 병렬 실행한다.

- ACTIVE Project count
- ACTIVE Intern count
- REVIEW Task count
- updated_at 기준 최근 Task 5건

Dashboard는 전체·진행·완료율·마감 임박 지표, 주간 상태 분포, 담당자별 미완료 업무 분배, 최근 업무와 D-Day 알림을 제공한다. ADMIN은 전체 범위를, MANAGER는 RLS가 허용한 담당 Project 범위를 집계하며 검토 대기 관리자 영역은 ADMIN에게만 표시한다.

ADMIN은 사전 정의된 운영·지식·KPI·평가 지표 카탈로그에서 Dashboard 카드를 선택하고 순서를 계정별로 저장한다. `dashboard_preferences`는 활성 ADMIN의 자기 설정만 허용한다. `search_preferences`는 사용자가 검색 대상 카테고리를 저장하며 실제 검색 데이터는 원본 테이블 RLS를 그대로 적용한다. 보고서는 브라우저에서 권한 내 데이터를 집계해 미리보기와 Excel/CSV 파일을 생성한다.

## 8. Migration 현황과 위험

- 원격 migration 이력이 비어 있음을 확인한 뒤 기존 세 migration의 내용을 유지하고 고유한 14자리 버전으로 rename했다.
- fresh migration 순서는 initial schema → Task RPC → 자동 활성화 → 다중 담당자 RPC다.
- initial schema의 앞부분은 명시적 transaction 밖이고 Intern/Task 구간만 `begin/commit`으로 감싸져 있다.
- 이미 원격 적용된 migration은 수정하지 않는 원칙에 따라 실제 migration history를 확인한 후 신규 보정 migration으로 처리해야 한다.
- 현재 `20260817000100_user_workspace_preferences.sql`까지 17개 migration의 LOCAL/REMOTE 이력이 일치한다.
- 프로그램·지식자산·평가·KPI·감사·계정 관리 migration은 원격 적용과 관련 rollback 검증을 완료했고, Dashboard/검색 설정 migration도 원격 이력에 반영됐다.

## 9. 현재 기술 부채

- 현재 사용자 ID 조회가 여러 service 파일에 반복된다.
- Auth/Profile과 Dashboard 타입이 `domain.ts` 밖에 있다.
- 인증 상태 변경 구독과 테스트가 없다.
- 통합 검색은 현재 카테고리별 최대 500행을 권한 내에서 조회해 브라우저에서 검색하므로 데이터 증가 시 DB 검색 인덱스/RPC 전환이 필요하다.
