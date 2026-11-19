# Intern Project Hub 업무 규칙

## 현재 최종 제출 운영 규칙

- Task의 `expected_output`은 설명과 별도로 검토자가 읽는 정성적 기준이다.
- 활성 ADMIN 또는 MANAGER 중 지정된 한 명이 최종 제출을 검토한다. 부문장은 현재 MANAGER로 취급한다. REVIEW 상태에서는 검토자를 변경하지 않는다.
- 배정된 인턴은 TODO 업무를 시작하고 IN_PROGRESS 업무에 중간 기록을 추가한다. 새 중간 기록에는 승인 상태를 적용하지 않고 관리자가 피드백을 남긴다.
- 배정 인턴 누구나 최종 제출할 수 있다. 실제 제출자와 배정 인턴 중 선택한 공동 기여자를 제출 회차에 기록한다.
- 제출 회차에는 작업물 URL의 해당 앱 버전을 고정한다. 같은 URL 재제출도 새 회차와 새 버전이다. Teams 원본의 과거 내용 복원은 제공하지 않는다.
- 승인과 DONE 전환, 수정 요청과 IN_PROGRESS 복귀는 각각 한 DB 작업이다. 수정 요청에는 피드백을 입력한다.
- 기존 REVIEW 업무에 새 제출 이력이 없으면 담당 관리자가 사유를 기록하고 재제출 요청 또는 기존 완료 확정으로 전환한다. 기존 DONE은 과거 승인 이력 없이 완료 상태를 보존한다.
- 기존 Task 배정과 새 담당자 지정 시 프로젝트 멤버가 없으면 ACTIVE MEMBER로 연결한다. 기존 INACTIVE 멤버는 자동 재활성화하지 않는다. Program 참여는 별도 등록한다.

아래의 초기 Task update 검토 상태 규칙은 과거 기록에 적용된 이력이다. 새 기록의 완료 여부는 Task 최종 제출의 판정으로 결정한다.

## 1. 상태 값

| 대상 | 허용 상태 |
|---|---|
| Project | `PLANNING`, `ACTIVE`, `REVIEW`, `REVISION`, `ON_HOLD`, `COMPLETED`, `DROPPED`, `ARCHIVED` |
| Workstream | `PLANNING`, `ACTIVE`, `ON_HOLD`, `COMPLETED` |
| Task | `TODO`, `IN_PROGRESS`, `REVIEW`, `DONE`, `HOLD` |
| Task priority | `LOW`, `MEDIUM`, `HIGH` |
| Intern | `PLANNED`, `ACTIVE`, `COMPLETED` |
| Profile | `ACTIVE`, `INACTIVE` |
| Program | `PLANNING`, `ACTIVE`, `COMPLETED`, `ARCHIVED` |
| Program enrollment | `PLANNED`, `ACTIVE`, `COMPLETED` |
| Program/Project membership | `ACTIVE`, `INACTIVE` |

## 2. 자동 상태 규칙

- TODO Task만 있으면 Project와 Workstream은 PLANNING을 유지할 수 있다.
- Task가 `IN_PROGRESS`, `REVIEW` 또는 `DONE`이 되면 연결된 Project와 Workstream이 PLANNING일 때 ACTIVE로 바뀐다.
- ACTIVE로 바뀐 Project나 Workstream을 자동으로 PLANNING으로 되돌리지 않는다.
- `ON_HOLD`, `COMPLETED`, `ARCHIVED` 상태는 자동 활성화하지 않는다.
- Project 완료 여부를 Task 상태만으로 자동 확정하지 않는다.
- 현재 구현은 Task insert 또는 update 후 DB trigger에서 위 규칙을 적용하며, 기존 진행 Task에 대한 backfill SQL도 포함한다.

`DONE` Task를 최초 등록하는 경우에도 ACTIVE 전환하는 것이 제품 의도인지 추가 확인이 필요하다.

## 3. Task 관계 규칙

이 절의 `Task`는 DB와 내부 코드의 호환 명칭이다. 사용자 화면에서는 개인 To-do와 구분하기 위해 `실행 업무`로 표시하며, 적용 사례 조사·서비스 시나리오 설계·발표자료 제작처럼 Project 결과에 직접 연결되는 결과물 단위로 등록한다. `Workstream`은 이러한 실행 업무를 묶는 `업무 영역`으로 표시한다. 회의에서 나온 세부 Action Item은 Loop/Planner에서 관리한다.

- Task는 정확히 하나의 Project와 Workstream에 속한다.
- Task의 Workstream은 같은 `project_id`를 가져야 한다.
- 부모 Task는 동일 Project와 Workstream 안에서만 지정할 수 있다.
- Task 자신을 부모로 지정할 수 없다.
- 자신의 자손을 부모로 지정하여 순환 구조를 만들 수 없다.
- 자식 Task가 있는 Task는 관계를 깨뜨리는 Project/Workstream 이동을 허용하지 않는다.
- 부모 삭제는 DB 외래키의 `ON DELETE RESTRICT`로 차단된다.
- Task UI와 DB 관계는 여러 담당자를 지원하며, 수정 시 선택한 담당자 목록 전체를 하나의 RPC에서 원자적으로 교체한다.

## 4. 사용자와 인턴

- `profile`은 로그인 계정과 전역 역할을 나타낸다.
- `intern`은 프로그램 참여 및 업무 이력을 나타낸다.
- 두 엔티티는 동일한 생명주기를 갖지 않는다.
- 인턴은 로그인 계정 없이 존재할 수 있다.
- profile 비활성화 또는 향후 계정 종료가 과거 intern과 업무 이력을 삭제해서는 안 된다.
- 한 profile은 현재 스키마에서 최대 하나의 intern과 연결되며, 한 intern의 여러 프로그램 참여는 `program_enrollments`로 표현한다.

## 5. 프로그램과 참여 관계

- Program은 코드, 이름, 상태와 선택적인 운영 기간을 가진다.
- 같은 intern은 한 Program에 한 번만 등록할 수 있다.
- 같은 Project는 한 Program에 한 번만 연결할 수 있다.
- 같은 intern은 한 Project에 한 번만 멤버로 등록할 수 있으며 역할은 `OWNER` 또는 `MEMBER`다.
- 참여 관계를 종료할 때 물리 삭제 대신 상태를 `COMPLETED` 또는 `INACTIVE`로 바꾼다.
- 기존 `interns.cohort` 문자열은 호환성을 위해 유지하며 Program으로 자동 변환하지 않는다.

## 6. 권한 규칙

- ADMIN은 사이트 전체 데이터와 사용자·권한·감사·삭제를 관리하고 Project의 `operator_id`를 지정한다.
- 활성 MANAGER는 `operator_id`가 본인인 Project와 그 Project의 Workstream, Work Package, 담당 관계, 진행 기록, Documents, Review와 Project 멤버를 관리한다.
- MANAGER는 Project를 생성하거나 운영 담당자를 변경할 수 없으며 Users, Programs, Intern Reviews, Audit Logs와 Data Cleanup에 접근하지 않는다.
- MANAGER는 담당 Project에 참여 인턴을 연결할 수 있도록 인턴 목록을 조회할 수 있지만 인턴 기본 이력을 직접 수정하지 않는다.
- 활성 INTERN은 자신에게 배정된 Task와 관련 프로젝트, 담당자, 진행 기록, 최종 제출 및 작업물 링크를 조회한다. 배정된 Task의 시작, 진행 기록 추가, 최종 제출만 수행한다. VIEWER의 범위는 아직 확정·구현되지 않았다.
- 지정된 MANAGER 검토자는 담당 프로젝트가 아니어도 해당 Task의 제출과 관련 기록을 조회하고 최종 판정만 할 수 있다.
- UI에서 버튼을 숨기는 것만으로 권한을 보장하지 않으며 RLS가 최종 권한 경계다.
- RLS 완화는 데이터 노출 범위를 바꾸므로 사전 승인이 필요하다.
- 비활성 profile은 앱 로그인 흐름에서 로그아웃 처리되며 `is_admin()`도 ACTIVE ADMIN만 인정한다.

## 7. 데이터 보존

- 운영 데이터는 기본적으로 물리 삭제하지 않는다.
- 종료·중단·보관은 상태값으로 표현한다.
- Project는 `ARCHIVED`, Intern은 `COMPLETED` 상태 보관을 우선한다.
- 현재 authenticated 역할에 Project, Workstream, Intern, Task 삭제 권한은 부여하지 않는다.
- 담당자 관계는 Task 수정 시 교체가 필요하여 삭제를 허용하지만 Task 자체 이력은 유지한다.
- 데이터 파괴 migration과 사용자 데이터 삭제는 명시적 승인 없이는 실행하지 않는다.

## 8. 향후 기록 규칙

- Project는 아이디어를 탐색·검증하는 `EXPLORE`, 신규 결과물·서비스를 구축하는 `BUILD`, 기존 결과물·자산을 개선·고도화하는 `REFINE`으로 구분한다.
- Project Review Gate는 `REVISE`, `KEEP`, `ASSET`, `DROP` 중 하나이며 판정 이력을 덮어쓰지 않는다.
- `DROP` 판정에는 사유가 필수이고 실패한 실험도 삭제하지 않는다.
- Teams Project Folder URL은 HTTP 또는 HTTPS 링크만 허용한다.

- Task update는 최신 값 덮어쓰기만 하지 않고 진행·학습·장애·다음 계획의 시간 이력을 보존한다.
- 진행 기록은 네 내용 중 하나 이상을 포함해야 하며, 작성 후 기록일과 본문을 변경할 수 없다.
- 관리자는 피드백과 `PENDING`, `APPROVED`, `CHANGES_REQUESTED` 검토 상태만 갱신한다.
- 진행 기록에는 물리 삭제 권한을 부여하지 않는다.
- 지연 Task는 기한이 오늘보다 이전이고 상태가 `DONE`이 아닌 Task다.
- Document에는 파일을 업로드하지 않고 Teams 원본의 HTTP/HTTPS URL만 저장한다.
- Document는 하나의 Project에 속하며 선택적으로 같은 Project의 Work Package에 연결한다.
- Document는 사용 중 또는 보관 상태만 사용자에게 표시하며, 승인·보완과 파일별 Review는 관리하지 않는다.
- 파일 검토와 변경 이력은 Teams에서 관리하고, 웹은 최신 링크를 찾기 위한 인덱스로 사용한다.
- 상세 회의 내용과 대안은 Teams 회의록에서 관리하고 웹에는 Project Review의 결정 요약, 다음 조치와 원본 링크만 기록한다.
- 기존 Decision 데이터는 삭제하지 않고 호환 데이터로 보존한다.
- Manager Note는 Project, Intern, Task 중 하나 이상을 대상으로 하며 ADMIN만 열람·작성한다.
- 해결 상태에는 해결일이 필요하고, 민감 기록은 삭제 대신 보관한다.
- ADMIN은 기존 profile의 표시 이름, 전역 역할과 활성 상태를 관리할 수 있다.
- 로그인 중인 ADMIN은 자신의 역할이나 상태를 직접 변경할 수 없고 마지막 활성 ADMIN도 보호한다.
- Auth 계정 초대·삭제·비밀번호 작업은 브라우저 클라이언트가 아니라 서버 권한 경계에서 수행한다.
- 사용자 초대, 비밀번호 재설정 메일, Auth 계정 활성화·종료는 활성 ADMIN만 Edge Function을 통해 수행한다.
- 계정 종료는 Auth 사용자를 물리 삭제하지 않고 장기 로그인 차단과 profile `INACTIVE`를 함께 적용하며, 과거 업무·인턴 이력은 보존한다.
- 현재 로그인한 관리자와 마지막 활성 ADMIN은 계정 종료할 수 없다.
- 인턴 평가는 문제 이해, 조사·분석, 업무 품질, 커뮤니케이션, 피드백 반영, 주도성·성장을 각각 1~5점으로 기록한다.
- 같은 평가자·인턴·주기·Program·Project 조합은 한 번만 평가하며, 확정된 평가는 변경하지 않는다.
- Project의 상세 수치 목표와 실적은 Teams 원본 계획에서 관리하며 웹에 KPI로 중복 입력하지 않는다.
- 웹에서는 Project의 목적·배경과 Review 판정으로 성과 맥락과 최종 판단을 남긴다. 기존 기대 결과 데이터는 보존하지만 Project 입력 화면에서는 새로 받지 않는다.
- 감사 로그는 주요 데이터의 생성·수정 사실과 변경 필드명만 기록하며 본문 값을 복제하지 않는다.
- 감사 로그에는 애플리케이션 수정·삭제 권한을 부여하지 않는다. 운영 데이터 삭제 시 대상·작업자·시각의 삭제 로그만 남긴다.
- 실제 삭제는 ADMIN 전용 RPC로 수행하며 연결 데이터 정리는 하나의 transaction에서 전부 성공하거나 rollback한다.
- Dashboard 완료율은 전체 Task 중 `DONE` 비율이며, 마감 임박은 미완료 Task 중 오늘부터 7일 이내 마감 건수다.
- 주간 Task는 시작일 또는 마감일 기준으로 이번 주 일정과 겹치는 업무이며 `DONE` 비율을 주간 진행률로 사용한다.
- 팀원 업무 분배는 미완료 Task 기준이고 다중 담당 Task는 각 담당자에게 1건씩 집계한다.
- Dashboard 지표 구성은 ADMIN만 자신의 계정 단위로 추가·제거·정렬하며 임의 SQL이나 수식은 실행하지 않는다.
- 통합 검색 대상 선택은 계정별로 저장하지만 검색 결과는 각 테이블의 RLS 권한 범위를 넘을 수 없다.
- 보고서 화면 필터와 Excel/CSV 내보내기에는 동일한 데이터 범위를 적용한다.
- 계획 일괄 등록은 Projects 화면의 Plan Import 모달에서 수행한다. 양식 다운로드, 파일 작성, 업로드, 검증 확인, 전체 등록 순서를 안내하며 파일 선택과 드래그 앤 드롭을 모두 지원한다. 새로운 Project만 생성하고 기존 Project를 덮어쓰지 않는다. Excel의 Project 코드, Workstream 이름과 Task 제목으로 관계를 연결하고 담당자는 활동 중인 Intern의 정확한 이름으로 연결한다. 하나라도 검증에 실패하면 전체 등록을 rollback한다.
- 기존 Resource와 Deliverable 데이터는 삭제하지 않고 Documents 전환 호환 데이터로 보존한다.
- Project Review는 활용 가치 판정과 함께 결정 요약, 다음 조치와 Teams 회의록 링크를 기록한다.
- 평가는 완료율만 사용하지 않고 문제 이해, 조사·분석, 품질, 커뮤니케이션, 피드백 반영, 자기주도성과 성장 정도를 함께 다룬다.
