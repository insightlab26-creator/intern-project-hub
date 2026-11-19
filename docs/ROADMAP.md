# Intern Project Hub 로드맵

## 2026-11-19 업무 제출 흐름 보강

현재 실행 경로에 INTERN의 배정 업무 시작·진행 기록·최종 제출과 ADMIN/MANAGER의 피드백·최종 검토를 연결했다. 새 DB 마이그레이션은 별도로 적용해야 실제 환경에서 동작한다. 기존 REVIEW Task는 제출 이력이 없으면 사유를 남겨 재제출 요청 또는 기존 완료 확정으로 전환한다. 과거 DONE Task는 기존 완료 상태를 유지한다.

각 단계는 앞 단계의 데이터 무결성과 권한 모델을 유지하며 진행한다. DB 변경은 신규 migration으로 남기고 원격 적용 전에 승인을 받는다.

## P0. 현재 기능 안정화

**목표:** 현재 ADMIN 흐름과 Dashboard를 재현 가능하고 안전한 기준선으로 만든다.

**완료 조건:** Dashboard 연결 확인, build/lint 통과, migration fresh apply 순서 검증, RLS 권한표와 UI 정합성 확보, 핵심 Task 관계·RPC·상태 trigger 회귀 테스트 완료.

**DB 변경:** migration 버전/순서 보정, 확정된 INTERN/VIEWER RLS, 필요한 제약·테스트용 SQL. 이미 적용된 파일은 수정하지 않고 보정 migration을 추가한다.

**예상 파일:** `src/App.tsx`, `src/types/domain.ts`, auth/dashboard 및 도메인 services, Project/Task 관련 화면, 신규 migration, 테스트 설정·파일, README.

**선행 조건:** 원격 migration history와 역할별 권한표 확인.

**현재 상태:** 완료. 네 migration의 로컬/원격 이력이 일치하고 원격 rollback fixture 회귀 테스트와 build/lint를 통과했다.

**위험:** 기존 미커밋 변경과 line ending 혼재, RLS 완화에 따른 노출, migration 버전 충돌, UI 단일 담당자에 의한 관계 손실.

## P1. 기본 운영 완성

**목표:** 주요 관리 엔티티의 일상 운영과 탐색 흐름을 완성한다.

**완료 조건:** Project/Workstream/Intern 수정, 전체 Tasks 화면, 검색·상태·담당자 필터, URL 기반 프로젝트 상세, 공통 loading/error/empty UI가 역할별로 동작한다.

**DB 변경:** 필요 시 수정 감사 정보와 검색 인덱스. 삭제 API는 기본 범위에서 제외한다.

**예상 파일:** pages/components/services/domain types, `App.tsx`, router 구성, 공통 UI 및 신규 migration.

**선행 조건:** P0 권한과 migration 안정화.

**위험:** 라우팅 도입 시 현재 상태 기반 UI 회귀, 검색 쿼리 성능, 쓰기 버튼과 RLS 불일치.

**현재 상태:** Project/Workstream/Intern 수정, 독립 Tasks 검색·필터, URL 상세, 공통 화면 상태와 Dashboard Task 이동을 구현했다. Workstream 순서는 양의 정수이며 프로젝트 안에서 중복될 수 없다.

## P2. 프로그램과 참여 관계

**목표:** 여러 프로그램·기수와 프로젝트 참여를 정규화한다.

**완료 조건:** programs, program_enrollments, program_projects, project_members 관리와 프로그램/기수별 조회, profile-intern 연결 관리가 가능하다.

**DB 변경:** 위 네 테이블, 상태·기간·역할 제약, 인덱스, RLS, 기존 cohort 데이터 전환 전략.

**예상 파일:** 신규 migration, domain types/services/pages, Project/Intern 상세와 Dashboard.

**선행 조건:** 프로그램·기수·멤버 역할 정의와 기존 cohort 처리 정책.

**위험:** 기존 문자열 cohort와 중복 데이터, 한 사용자의 복수 참여 모델, project_members 기반 RLS 복잡도.

**현재 상태:** 완료. 프로그램 관리·상세, 인턴 참여, 프로젝트 연결, 프로젝트 멤버, profile-intern 연결과 ADMIN 전용 RLS를 원격 적용하고 rollback 회귀 테스트를 통과했다. 기존 `interns.cohort`는 보존하며 자동 전환하지 않는다.

## P3. 업무 진행 기록

**목표:** Task의 최신 상태뿐 아니라 수행 과정과 피드백을 보존한다.

**완료 조건:** task_updates에 진행·학습·장애·다음 계획을 기록하고 관리자 피드백, 타임라인, 지연·검토 대기 표시를 제공한다.

**DB 변경:** task_updates와 필요 시 feedback/review 필드 또는 관계, 작성자·시각·수정 정책, RLS와 인덱스.

**예상 파일:** 신규 migration, task update service/types/components, Task 상세 및 Dashboard.

**선행 조건:** INTERN 작성 범위와 관리자 피드백 규칙.

**위험:** 변경 이력 수정·삭제 정책, 민감 피드백 노출, 시간대와 알림 범위.

**현재 상태:** 완료. 진행·학습·장애·다음 계획의 append 기록, 관리자 피드백·검토 상태, Task 타임라인과 Dashboard 지연/검토 목록을 구현했다. ADMIN 전용 migration을 원격 적용했고 본문 불변성·검토·RLS rollback 회귀 테스트를 통과했다.

## P4. 지식자산

**목표:** Teams 문서 링크와 의사결정을 프로젝트 맥락에 연결한다.

**완료 조건:** Documents 생성·조회, Project/Work Package 연결과 Project Review의 결정 요약·원본 링크를 통한 인수인계용 탐색을 지원한다.

**DB 변경:** 세 핵심 테이블과 연결/버전/검토 이력 테이블, RLS와 검색 인덱스.

**예상 파일:** 신규 migration, services/types/pages/components, Project tabs, Dashboard.

**선행 조건:** Teams/SharePoint 링크 정책.

**위험:** 외부 링크 권한·만료, 버전 기준, 링크된 문서의 삭제, 민감 의사결정 접근권한.

**현재 상태:** 완료. Resources와 Deliverables 사용자 기능을 Documents 링크 목록으로 통합했다. Decisions 입력은 Project Review의 결정 요약·다음 조치·Teams 회의록 링크로 흡수했으며 기존 DB 이력은 호환 목적으로 보존한다.

## P5. 평가

**목표:** 인턴 성장과 프로젝트·프로그램 운영 성과를 구조적으로 측정한다.

**완료 조건:** intern_reviews 관리와 성장 기록, 프로그램/프로젝트 Dashboard와 보고서 기초 데이터 제공.

**DB 변경:** 평가 주기·평가자·평가 항목·점수/서술형 구조와 RLS. 기존 KPI DB 구조는 데이터 보존용으로 유지한다.

**예상 파일:** 신규 migration, evaluation services/types/pages, Dashboard와 report UI.

**선행 조건:** 평가 기준과 열람 권한.

**위험:** 개인정보와 평가 민감도, 기준 변경 시 비교 가능성, Task 완료율에 치우친 평가.

**현재 상태:** 완료. Intern Reviews는 유지한다. KPI 사용자 기능과 Dashboard 지표는 중복 입력 부담을 줄이기 위해 제거했으며 기존 DB 데이터는 보존한다.

## P6. 운영 고도화

**목표:** 확장된 데이터를 안전하고 효율적으로 운영하고 재활용한다.

**완료 조건:** 관리자 사용자 관리, project_members 기반 세부 권한, 알림·통합 검색·리포트·감사 로그, AI 주간 요약과 권한 인식 지식 검색 제공.

**DB 변경:** 알림, 감사 로그, 검색/요약 메타데이터 및 필요한 함수·인덱스·RLS.

**예상 파일:** 전 계층, Edge Function 또는 승인된 백엔드 구성, 운영 문서.

**선행 조건:** P2~P5 데이터 품질, 보안·보존·AI 사용 정책과 외부 연동 승인.

**위험:** 권한 우회, 개인정보의 AI 입력, 검색 인덱스 동기화, 운영 비용과 감사 가능성.

**현재 상태:** 사용자 초대·비밀번호 재설정·Auth 계정 종료, Audit Logs, ADMIN별 Dashboard 지표 구성과 사용자별 검색 설정 migration을 원격 적용했다. 통합 검색, 프로젝트·인턴·주간 보고서와 Excel/CSV 내보내기도 화면에 연결했다. 알림과 AI 요약은 후속 범위다.
