# Intern Project Hub 제품 명세

## 1. 제품 목적

Intern Project Hub는 인턴 프로그램의 업무, 산출물, 의사결정, 평가와 지식자산을 프로젝트 단위로 축적하는 내부 운영 시스템이다. 인턴이 교체되더라도 업무 맥락과 결과물이 다음 참여자에게 이어지도록 하는 것이 핵심 목적이다.

단순 Task 관리에 머무르지 않고 다음 영역을 연결한다.

- 인턴 프로그램과 참여 이력
- 프로젝트, Workstream과 업무 담당자
- 업무 진행 업데이트와 관리자 피드백
- Teams 문서 링크와 Project 검토 이력
- 주요 의사결정, 배경과 후속 조치
- 인턴 성장과 평가
- 후속 인턴에게 전달할 지식자산

사용자 화면에서 `Task`는 개인 To-do가 아니라 Project 아래의 상위 실행 단위인 `Work Package`를 뜻한다. 실제 세부 Action Item과 일정은 Loop/Planner에서 관리하며 웹에 중복 입력하지 않는다. 기존 DB의 `tasks` 명칭과 관계는 호환성을 위해 유지한다.

`Workstream`은 Work Package를 묶는 프로젝트 단계 또는 업무 영역으로 사용한다. Document는 파일을 업로드하지 않고 Teams 원본 URL을 가리키는 단순 인덱스 역할만 한다. 기존 Resource와 Deliverable DB 구조는 데이터 호환을 위해 유지한다.

## 2. 사용자

| 역할 | 목적 | 현재 구현 범위 |
|---|---|---|
| ADMIN | 시스템 및 인턴 운영 관리 | 로그인, 전체 핵심 데이터 조회·생성, Task 수정 |
| INTERN | 배정 업무 수행과 진행 기록 | 역할 값과 로그인만 존재하며 데이터 RLS는 아직 미완성 |
| VIEWER | 허용된 운영 정보 조회 | 역할 값과 로그인만 존재하며 데이터 RLS는 아직 미완성 |

계정은 `profiles`, 인턴 이력은 `interns`로 분리한다. 계정이 비활성화되어도 과거 인턴 이력과 업무 관계는 보존한다.

## 3. 현재 제공 기능

- Project의 `EXPLORE / BUILD` 유형, 목적·배경·기대 결과·분야·현재 단계·Next Review·Teams 작업 폴더·키워드·운영 담당자 관리
- Project 상태의 검토·수정·중단 단계와 Project Review Gate (`REVISE / KEEP / ASSET / DROP`) 이력
- Project Review의 결정 요약·다음 조치·Teams 회의록 링크 기록

- Supabase 이메일/비밀번호 로그인, 로그아웃과 세션 복원
- `profiles` 기반 `ADMIN / INTERN / VIEWER` 역할 및 `ACTIVE / INACTIVE` 확인
- Project 목록·생성·수정·상태 변경과 URL 상세 진입
- 프로젝트별 Workstream 목록·생성·수정·정렬·상태 변경
- Intern 목록·등록·수정과 종료 상태 처리
- 프로젝트별 Task 목록, 생성과 수정
- 동일 Workstream 안의 계층형 Task 트리
- Task와 담당 인턴 연결
- Task 관계 검증 및 Task/다중 담당자 원자적 저장 RPC
- Task 진행에 따른 PLANNING Project/Workstream의 ACTIVE 자동 전환
- 실제 DB 집계를 사용하는 Dashboard
- 독립 Tasks 목록과 프로젝트·상태·담당자·기한 검색/필터
- URL 기반 Task 상세와 Dashboard 최근/검토 Task 이동
- 공통 loading/error/empty 상태 UI
- 프로그램·기수, 참여 인턴, 연결 프로젝트와 Project 멤버 관리
- Task 진행·학습·장애·다음 계획 타임라인과 관리자 검토
- Dashboard 지연 Task 목록
- Documents Teams 링크 등록·검색·수정·보관 및 Project/Work Package 연결
- Manager Notes 대상별 민감 메모·위험·후속 조치 관리
- Users 계정 초대, 표시 이름·역할 수정, 비밀번호 재설정 메일과 로그인 계정 활성화·종료
- Intern Reviews 6개 역량 점수와 강점·개선점·성장 목표 관리
- 월간 Calendar의 Project/Task 일정과 팀원·Project 필터
- Data Cleanup의 관리자 전용 실제 삭제 및 삭제 감사 로그
- Projects 화면의 Plan Import 모달에서 Excel 파일 선택 또는 드래그 앤 드롭으로 Project·Project Area·Work Package 계획 일괄 등록과 저장 전 검증
- Project 상세에서 해당 Project의 Documents·Review·Manager Notes 조회 및 등록
- ADMIN이 지표 카탈로그에서 카드 구성과 순서를 계정별로 저장하는 확장 Dashboard
- 사용자별 검색 범위 설정과 RLS 권한을 따르는 Projects·Tasks·운영·지식 데이터 통합 검색
- 프로젝트 진행·인턴 업무/성과·주간 업무 보고서 미리보기와 Excel/CSV 내보내기

Documents는 독립 메뉴와 Project 상세 탭에서 조회·등록·수정할 수 있다. 의사결정 결론은 Project Review에서 기록한다.

## 4. 핵심 사용자 흐름

### 관리자

1. 활성 계정으로 로그인한다.
2. 프로젝트를 만들고 Workstream을 구성한다.
3. 인턴 이력을 등록한다.
4. Workstream에 Task를 생성하고 필요하면 상하위 관계와 담당 인턴을 지정한다.
5. Task 상태를 갱신한다.
6. 진행 Task가 생기면 PLANNING 상태의 상위 Project와 Workstream이 ACTIVE로 전환된다.
7. Dashboard에서 활성 프로젝트·인턴, 검토 Task와 최근 Task를 확인한다.
8. Task 상세에서 진행 기록을 추가하고 피드백과 검토 상태를 관리한다.

### 인턴 및 조회 사용자

로그인과 역할 식별은 구현되어 있지만 현재 핵심 테이블 RLS가 ADMIN 조회만 허용한다. 세부 조회·작성 범위는 기획 확정과 RLS 구현이 필요하다.

## 5. 제품 원칙

- 운영 데이터는 삭제보다 상태 기반 보관을 우선한다.
- Project는 삭제보다 `ARCHIVED`를 우선한다.
- 한 인턴의 여러 프로그램·기수 참여를 지원하는 방향으로 확장한다.
- 결과뿐 아니라 학습, 장애 요소, 피드백과 성장 이력을 보존한다.
- Dashboard, 통계와 AI 분석에 활용할 수 있도록 관계형 데이터로 저장한다.
- DB의 자동화는 명확한 사실만 처리하고 완료·보류 같은 운영 판단은 관리자에게 남긴다.
- 신규 Work Package는 기본적으로 계층화하지 않으며 개인 To-do와 회의 Action Item은 Loop/Planner에서 관리한다. 과거 계층형 Task 관계는 읽기 호환을 위해 보존한다.
- 진행 업데이트는 일일 업무일지가 아니라 주요 단계 변경, 완료, 검토 요청과 중요한 장애를 남기는 기록이다.
- Calendar는 Project 시작·종료, Next Review와 Work Package 목표 일정을 중심으로 제공한다.
- Intern Review와 Manager Note는 프로젝트 핵심 흐름이 아닌 운영 보조 기능으로 분리한다.
- Data Cleanup은 일상 내비게이션에 노출하지 않고 승인된 관리자가 직접 접근하는 시스템 기능으로 유지한다.

## 6. 향후 제품 범위

- 프로그램 및 참여 관계: programs, enrollments, project members
- Task 진행 기록: 진행 내용, 학습, 장애 요소, 다음 계획, 피드백
- 지식자산: Teams 문서 링크, 의사결정과 인수인계 조회
- 성장과 평가: 다면 평가와 프로그램 성과
- 운영 고도화: 사용자 관리, 알림, 검색, 보고서, 감사 로그, AI 요약

## 7. 완료 품질 기준

- UI 권한과 RLS가 같은 권한표를 따른다.
- DB snake_case와 앱 camelCase 사이에 명시적 매핑이 있다.
- 모든 스키마 변경은 순서가 보장되는 신규 migration으로 재현된다.
- 핵심 관계와 상태 자동화에 회귀 테스트가 있다.
- 빌드와 관련 검증을 통과하고, 검증하지 않은 항목은 명시한다.
