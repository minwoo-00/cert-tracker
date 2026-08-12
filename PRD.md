# 프로젝트
- 이름: 자격증 학습 관리 플랫폼 (개인용, HTML/CSS/JS 단일 페이지)
- 목적: 자격증 취득 현황 관리 + 시험 일정 계획 + 학습 진도/통계 관리

# 핵심 기능
- 자격증 관리: 등록/수정/삭제, 상태(준비중/응시예정/합격/불합격), 분류(선택)
- 시험 일정 관리: 자격증 1개당 시험일정 여러 개, 공식 시험일정 카탈로그에서 선택하거나 직접 입력, D-Day 계산 및 정렬 표시
- 학습 진도 체크리스트: 자격증별 학습 항목(과목/단원) 등록, 완료 체크, 진도율(%) 계산
- 통계 대시보드: 전체 합격률, 보유(합격) 자격증 목록, 자격증별 진도율, 다가오는 시험 요약 카드

# 데이터 모델 (localStorage)
데이터는 "사용자 개인 데이터"와 "공용 참고 데이터(카탈로그)"로 구분한다. 이 구분은 이후 Supabase 전환(M5) 시 개인 데이터는 사용자별 테이블(RLS), 카탈로그는 공용 읽기 전용 테이블로 자연스럽게 이어진다.

- **ExamCatalog** (공용 참고 데이터, 코드 내 상수로 시딩, 사용자가 수정 불가)
  - id, certificationName, category, round, examDate
- **Certification** (사용자 개인 데이터)
  - id, name, category, status, memo
- **Exam** (사용자 개인 데이터 — 내가 응시할/응시한 시험 기록)
  - id, certificationId, catalogId(선택, 카탈로그에서 선택한 경우 참조), examDate, round, result
  - 카탈로그에서 선택 시 examDate/round는 카탈로그 값으로 채워짐. 카탈로그에 없는 시험은 직접 입력 가능.
- **ChecklistItem** (사용자 개인 데이터)
  - id, certificationId, title, done

# 화면 구성 (단일 페이지, 탭/섹션 전환)
- 대시보드: 통계 요약(합격률) + 보유(합격) 자격증 목록 + 임박 시험 D-Day 목록
- 자격증 관리: 목록 + 등록/수정 폼
- 시험 일정: 자격증별 시험 목록 + 등록/수정 폼
- 학습 체크리스트: 자격증 선택 후 체크리스트 관리

# 마일스톤
- M1 (1일차): 자격증 CRUD + localStorage 저장
- M2 (1일차): ExamCatalog 시딩(공식 시험일정 상수 데이터) + 시험 일정 CRUD(카탈로그 선택 또는 직접 입력) + D-Day 계산/정렬
- M3 (1일차): 학습 진도 체크리스트 + 진도율 계산
- M4 (1일차): 통계 대시보드 (M1~M3 데이터 집계)
- M5 (2일차, 이후 별도 논의): 시험 임박 알림 기능 추가, localStorage → Supabase 전환 (ExamCatalog는 공용 테이블, Certification/Exam/ChecklistItem은 사용자별 테이블)

# 기술 규칙 / 작업 방식 / 검증 규칙
- CLAUDE.md 규칙을 그대로 따름 (순수 HTML/CSS/JS, 3개 파일 유지, localStorage, 한 번에 한 태스크, 브라우저 검증)
- app.js 내에서 데이터 저장/조회 함수(load/save/query)를 한 곳에 모아 구성해, 추후 Supabase 전환 시 UI/렌더링 코드를 건드리지 않고 저장소 구현부만 교체할 수 있도록 한다.

# 참조
- @CLAUDE.md
- @DESIGN.md (M5 단계에서 추가 예정, 현재는 없음)
