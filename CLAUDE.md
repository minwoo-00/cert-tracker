# 기술 규칙

- 순수 HTML/CSS/JS로 구현한다. (빌드 도구 사용 금지). 예외적으로 Supabase JS 클라이언트는 CDN 스크립트 태그로 불러와 사용할 수 있다.
- 파일은 index.html, style.css, app.js 3개로만 유지한다. (추가 파일 생성 금지)
- 모든 사용자 데이터(자격증, 시험 일정, 학습 체크리스트)는 Supabase(Postgres)에 저장한다. localStorage는 더 이상 사용하지 않는다.
- 공식 시험 일정 참고 데이터(`exam_catalog`)도 Supabase에 저장하며, 앱에서는 읽기 전용으로만 사용한다.
- 앱에 로그인 기능이 없으므로 Supabase anon key를 클라이언트에 그대로 노출하고, RLS 정책으로 anon 역할의 전체 접근을 허용한다.

# 작업 규칙

- 한 번에 한 태스크만 진행한다.
- 변경 후에는 반드시 브라우저에서 직접 확인한다.
- 요구사항은 PRD.md를 참조한다.
