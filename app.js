// ===== 데이터 저장소 (Supabase / Postgres) =====

const SUPABASE_URL = "https://ffekolbihjqybvhafjhr.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmZWtvbGJpaGpxeWJ2aGFmamhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY1MDE3MzksImV4cCI6MjEwMjA3NzczOX0.UROdX5RsycbFRGC402-2oqUJ5rNbnZeoAyRba_Se80Y";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function fetchCertifications() {
  const { data, error } = await supabaseClient
    .from("certifications")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) {
    alert("자격증 데이터를 불러오지 못했습니다: " + error.message);
    return;
  }
  state.certifications = data;
}

function examRowToState(row) {
  return {
    id: row.id,
    certificationId: row.certification_id,
    catalogId: row.catalog_id,
    round: row.round,
    examDate: row.exam_date,
    result: row.result,
  };
}

function examStateToRow(data) {
  return {
    certification_id: data.certificationId,
    catalog_id: data.catalogId,
    round: data.round,
    exam_date: data.examDate,
    result: data.result,
  };
}

async function fetchExams() {
  const { data, error } = await supabaseClient
    .from("exams")
    .select("*")
    .order("exam_date", { ascending: true });
  if (error) {
    alert("시험 일정을 불러오지 못했습니다: " + error.message);
    return;
  }
  state.exams = data.map(examRowToState);
}

function checklistRowToState(row) {
  return {
    id: row.id,
    certificationId: row.certification_id,
    title: row.title,
    done: row.done,
  };
}

async function fetchChecklist() {
  const { data, error } = await supabaseClient
    .from("checklist")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) {
    alert("학습 체크리스트를 불러오지 못했습니다: " + error.message);
    return;
  }
  state.checklist = data.map(checklistRowToState);
}

// ===== 앱 상태 =====

let state = { certifications: [], exams: [], checklist: [] };

// ===== 탭 네비게이션 =====

function switchTab(tabName) {
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tabName);
  });
  document.querySelectorAll(".tab-section").forEach((section) => {
    section.classList.toggle("active", section.id === tabName);
  });
  if (tabName === "dashboard") {
    renderDashboard();
  }
}

function initTabs() {
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });
}

// ===== 자격증 관리 (M1) =====

const STATUS_BADGE_CLASS = {
  준비중: "badge-preparing",
  응시예정: "badge-scheduled",
  합격: "badge-passed",
  불합격: "badge-failed",
};

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

async function addCertification(data) {
  const { data: inserted, error } = await supabaseClient
    .from("certifications")
    .insert(data)
    .select()
    .single();
  if (error) {
    alert("자격증 등록에 실패했습니다: " + error.message);
    return;
  }
  state.certifications.push(inserted);
}

async function updateCertification(id, data) {
  const { data: updated, error } = await supabaseClient
    .from("certifications")
    .update(data)
    .eq("id", id)
    .select()
    .single();
  if (error) {
    alert("자격증 수정에 실패했습니다: " + error.message);
    return;
  }
  const cert = state.certifications.find((c) => c.id === id);
  if (cert) Object.assign(cert, updated);
}

async function deleteCertification(id) {
  const { error } = await supabaseClient.from("certifications").delete().eq("id", id);
  if (error) {
    alert("자격증 삭제에 실패했습니다: " + error.message);
    return;
  }
  state.certifications = state.certifications.filter((c) => c.id !== id);
}

function renderCertifications() {
  const list = document.getElementById("cert-list");
  if (state.certifications.length === 0) {
    list.innerHTML = '<li class="empty">등록된 자격증이 없습니다.</li>';
  } else {
    list.innerHTML = state.certifications
      .map(
        (cert) => `
      <li class="list-item">
        <div class="list-item-main">
          <strong>${escapeHtml(cert.name)}</strong>
          <span class="badge ${STATUS_BADGE_CLASS[cert.status] || ""}">${escapeHtml(cert.status)}</span>
          ${cert.category ? `<span class="tag">${escapeHtml(cert.category)}</span>` : ""}
        </div>
        ${cert.memo ? `<p class="list-item-memo">${escapeHtml(cert.memo)}</p>` : ""}
        <div class="list-item-actions">
          <button type="button" class="btn-edit" data-id="${cert.id}">수정</button>
          <button type="button" class="btn-delete" data-id="${cert.id}">삭제</button>
        </div>
      </li>`
      )
      .join("");
  }
  renderExamCertOptions();
  renderExamCatalogOptions();
  renderExams();
  renderChecklistCertOptions();
  renderChecklist();
}

function resetCertForm() {
  document.getElementById("cert-form").reset();
  document.getElementById("cert-edit-id").value = "";
  document.getElementById("cert-submit-btn").textContent = "등록";
  document.getElementById("cert-cancel-btn").classList.add("hidden");
}

function initCertifications() {
  const form = document.getElementById("cert-form");
  const list = document.getElementById("cert-list");
  const cancelBtn = document.getElementById("cert-cancel-btn");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const editId = document.getElementById("cert-edit-id").value;
    const data = {
      name: document.getElementById("cert-name").value.trim(),
      category: document.getElementById("cert-category").value.trim(),
      status: document.getElementById("cert-status").value,
      memo: document.getElementById("cert-memo").value.trim(),
    };
    if (!data.name) return;

    if (editId) {
      await updateCertification(editId, data);
    } else {
      await addCertification(data);
    }
    resetCertForm();
    renderCertifications();
  });

  cancelBtn.addEventListener("click", () => {
    resetCertForm();
  });

  list.addEventListener("click", async (e) => {
    const editBtn = e.target.closest(".btn-edit");
    const deleteBtn = e.target.closest(".btn-delete");

    if (editBtn) {
      const cert = state.certifications.find((c) => c.id === editBtn.dataset.id);
      if (!cert) return;
      document.getElementById("cert-edit-id").value = cert.id;
      document.getElementById("cert-name").value = cert.name;
      document.getElementById("cert-category").value = cert.category || "";
      document.getElementById("cert-status").value = cert.status;
      document.getElementById("cert-memo").value = cert.memo || "";
      document.getElementById("cert-submit-btn").textContent = "수정 완료";
      cancelBtn.classList.remove("hidden");
    }

    if (deleteBtn) {
      if (!confirm("이 자격증을 삭제할까요?")) return;
      await deleteCertification(deleteBtn.dataset.id);
      renderCertifications();
    }
  });

  renderCertifications();
}

// ===== 시험 일정 (M2) =====
// EXAM_CATALOG는 공식 시험 일정을 흉내 낸 참고용 시드 데이터다. 실제 시행처 공고와 다를 수 있다.
// 사용자가 CRUD하지 않는 정적 참고 데이터라 테이블화하지 않고 그대로 둔다.
const EXAM_CATALOG = [
  { id: "cat-1", certificationName: "정보처리기사", category: "IT", round: "2026년 3회", examDate: "2026-09-19" },
  { id: "cat-2", certificationName: "정보처리기사", category: "IT", round: "2027년 1회", examDate: "2027-03-06" },
  { id: "cat-3", certificationName: "SQLD", category: "IT", round: "2026년 45회", examDate: "2026-09-05" },
  { id: "cat-4", certificationName: "컴퓨터활용능력 1급", category: "사무", round: "2026년 6회", examDate: "2026-10-10" },
  { id: "cat-5", certificationName: "정보보안기사", category: "IT", round: "2026년 2회", examDate: "2026-11-14" },
];

function calcDday(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  const diffDays = Math.round((target - today) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "D-Day";
  return diffDays > 0 ? `D-${diffDays}` : `D+${Math.abs(diffDays)}`;
}

async function addExam(data) {
  const { data: inserted, error } = await supabaseClient
    .from("exams")
    .insert(examStateToRow(data))
    .select()
    .single();
  if (error) {
    alert("시험 일정 등록에 실패했습니다: " + error.message);
    return;
  }
  state.exams.push(examRowToState(inserted));
}

async function updateExam(id, data) {
  const { data: updated, error } = await supabaseClient
    .from("exams")
    .update(examStateToRow(data))
    .eq("id", id)
    .select()
    .single();
  if (error) {
    alert("시험 일정 수정에 실패했습니다: " + error.message);
    return;
  }
  const exam = state.exams.find((e) => e.id === id);
  if (exam) Object.assign(exam, examRowToState(updated));
}

async function deleteExam(id) {
  const { error } = await supabaseClient.from("exams").delete().eq("id", id);
  if (error) {
    alert("시험 일정 삭제에 실패했습니다: " + error.message);
    return;
  }
  state.exams = state.exams.filter((e) => e.id !== id);
}

function renderExamCertOptions() {
  const select = document.getElementById("exam-cert-select");
  if (!select) return;
  const prevValue = select.value;
  if (state.certifications.length === 0) {
    select.innerHTML = '<option value="">등록된 자격증이 없습니다</option>';
    return;
  }
  select.innerHTML = state.certifications
    .map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`)
    .join("");
  if (state.certifications.some((c) => c.id === prevValue)) {
    select.value = prevValue;
  }
}

function renderExamCatalogOptions() {
  const certSelect = document.getElementById("exam-cert-select");
  const catalogSelect = document.getElementById("exam-catalog-select");
  if (!certSelect || !catalogSelect) return;
  const cert = state.certifications.find((c) => c.id === certSelect.value);
  const matches = cert
    ? EXAM_CATALOG.filter((entry) => entry.certificationName === cert.name)
    : [];
  catalogSelect.innerHTML = ['<option value="">직접 입력</option>']
    .concat(
      matches.map(
        (m) => `<option value="${m.id}">${escapeHtml(m.round)} (${m.examDate})</option>`
      )
    )
    .join("");
}

function renderExams() {
  const certSelect = document.getElementById("exam-cert-select");
  const list = document.getElementById("exam-list");
  if (!certSelect || !list) return;
  const certId = certSelect.value;

  if (!certId) {
    list.innerHTML = "";
    return;
  }
  const examsForCert = state.exams
    .filter((e) => e.certificationId === certId)
    .slice()
    .sort((a, b) => new Date(a.examDate) - new Date(b.examDate));

  if (examsForCert.length === 0) {
    list.innerHTML = '<li class="empty">등록된 시험 일정이 없습니다.</li>';
    return;
  }
  list.innerHTML = examsForCert
    .map(
      (exam) => `
    <li class="list-item">
      <div class="list-item-main">
        <strong>${escapeHtml(exam.round || "회차 미입력")}</strong>
        <span class="badge badge-dday">${calcDday(exam.examDate)}</span>
        <span class="tag">${exam.examDate}</span>
        <span class="tag">${escapeHtml(exam.result)}</span>
      </div>
      <div class="list-item-actions">
        <button type="button" class="btn-edit" data-id="${exam.id}">수정</button>
        <button type="button" class="btn-delete" data-id="${exam.id}">삭제</button>
      </div>
    </li>`
    )
    .join("");
}

function resetExamForm() {
  document.getElementById("exam-form").reset();
  document.getElementById("exam-edit-id").value = "";
  document.getElementById("exam-submit-btn").textContent = "등록";
  document.getElementById("exam-cancel-btn").classList.add("hidden");
  renderExamCatalogOptions();
}

function initExams() {
  const certSelect = document.getElementById("exam-cert-select");
  const catalogSelect = document.getElementById("exam-catalog-select");
  const form = document.getElementById("exam-form");
  const list = document.getElementById("exam-list");
  const cancelBtn = document.getElementById("exam-cancel-btn");

  certSelect.addEventListener("change", () => {
    resetExamForm();
    renderExams();
  });

  catalogSelect.addEventListener("change", () => {
    const entry = EXAM_CATALOG.find((c) => c.id === catalogSelect.value);
    if (entry) {
      document.getElementById("exam-round").value = entry.round;
      document.getElementById("exam-date").value = entry.examDate;
    }
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const certId = certSelect.value;
    if (!certId) {
      alert("자격증을 먼저 등록해주세요.");
      return;
    }
    const editId = document.getElementById("exam-edit-id").value;
    const data = {
      certificationId: certId,
      catalogId: catalogSelect.value || null,
      round: document.getElementById("exam-round").value.trim(),
      examDate: document.getElementById("exam-date").value,
      result: document.getElementById("exam-result").value,
    };
    if (!data.examDate) return;

    if (editId) {
      await updateExam(editId, data);
    } else {
      await addExam(data);
    }
    resetExamForm();
    renderExams();
  });

  cancelBtn.addEventListener("click", () => {
    resetExamForm();
  });

  list.addEventListener("click", async (e) => {
    const editBtn = e.target.closest(".btn-edit");
    const deleteBtn = e.target.closest(".btn-delete");

    if (editBtn) {
      const exam = state.exams.find((ex) => ex.id === editBtn.dataset.id);
      if (!exam) return;
      document.getElementById("exam-edit-id").value = exam.id;
      catalogSelect.value = exam.catalogId || "";
      document.getElementById("exam-round").value = exam.round || "";
      document.getElementById("exam-date").value = exam.examDate;
      document.getElementById("exam-result").value = exam.result;
      document.getElementById("exam-submit-btn").textContent = "수정 완료";
      cancelBtn.classList.remove("hidden");
    }

    if (deleteBtn) {
      if (!confirm("이 시험 일정을 삭제할까요?")) return;
      await deleteExam(deleteBtn.dataset.id);
      renderExams();
    }
  });

  renderExamCertOptions();
  renderExamCatalogOptions();
  renderExams();
}

// ===== 학습 체크리스트 (M3) =====

async function addChecklistItem(data) {
  const { data: inserted, error } = await supabaseClient
    .from("checklist")
    .insert({ certification_id: data.certificationId, title: data.title, done: false })
    .select()
    .single();
  if (error) {
    alert("학습 항목 추가에 실패했습니다: " + error.message);
    return;
  }
  state.checklist.push(checklistRowToState(inserted));
}

async function toggleChecklistItem(id) {
  const item = state.checklist.find((i) => i.id === id);
  if (!item) return;
  const { data: updated, error } = await supabaseClient
    .from("checklist")
    .update({ done: !item.done })
    .eq("id", id)
    .select()
    .single();
  if (error) {
    alert("학습 항목 상태 변경에 실패했습니다: " + error.message);
    return;
  }
  Object.assign(item, checklistRowToState(updated));
}

async function deleteChecklistItem(id) {
  const { error } = await supabaseClient.from("checklist").delete().eq("id", id);
  if (error) {
    alert("학습 항목 삭제에 실패했습니다: " + error.message);
    return;
  }
  state.checklist = state.checklist.filter((i) => i.id !== id);
}

function calcProgress(certId) {
  const items = state.checklist.filter((i) => i.certificationId === certId);
  if (items.length === 0) return 0;
  const done = items.filter((i) => i.done).length;
  return Math.round((done / items.length) * 100);
}

function renderChecklistCertOptions() {
  const select = document.getElementById("checklist-cert-select");
  if (!select) return;
  const prevValue = select.value;
  if (state.certifications.length === 0) {
    select.innerHTML = '<option value="">등록된 자격증이 없습니다</option>';
    return;
  }
  select.innerHTML = state.certifications
    .map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`)
    .join("");
  if (state.certifications.some((c) => c.id === prevValue)) {
    select.value = prevValue;
  }
}

function renderChecklist() {
  const certSelect = document.getElementById("checklist-cert-select");
  const list = document.getElementById("checklist-list");
  const progress = document.getElementById("checklist-progress");
  if (!certSelect || !list || !progress) return;
  const certId = certSelect.value;

  if (!certId) {
    list.innerHTML = "";
    progress.textContent = "";
    return;
  }

  const items = state.checklist.filter((i) => i.certificationId === certId);
  const doneCount = items.filter((i) => i.done).length;
  progress.textContent = `진도율: ${calcProgress(certId)}% (${doneCount}/${items.length})`;

  if (items.length === 0) {
    list.innerHTML = '<li class="empty">등록된 학습 항목이 없습니다.</li>';
    return;
  }

  list.innerHTML = items
    .map(
      (item) => `
    <li class="list-item checklist-item">
      <label class="checklist-label">
        <input type="checkbox" class="checklist-toggle" data-id="${item.id}" ${item.done ? "checked" : ""}>
        <span class="${item.done ? "done-text" : ""}">${escapeHtml(item.title)}</span>
      </label>
      <div class="list-item-actions">
        <button type="button" class="btn-delete" data-id="${item.id}">삭제</button>
      </div>
    </li>`
    )
    .join("");
}

function initChecklist() {
  const certSelect = document.getElementById("checklist-cert-select");
  const form = document.getElementById("checklist-form");
  const list = document.getElementById("checklist-list");

  certSelect.addEventListener("change", () => {
    renderChecklist();
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const certId = certSelect.value;
    if (!certId) {
      alert("자격증을 먼저 등록해주세요.");
      return;
    }
    const titleInput = document.getElementById("checklist-title");
    const title = titleInput.value.trim();
    if (!title) return;
    await addChecklistItem({ certificationId: certId, title });
    titleInput.value = "";
    renderChecklist();
  });

  list.addEventListener("click", async (e) => {
    const deleteBtn = e.target.closest(".btn-delete");
    if (deleteBtn) {
      if (!confirm("이 학습 항목을 삭제할까요?")) return;
      await deleteChecklistItem(deleteBtn.dataset.id);
      renderChecklist();
    }
  });

  list.addEventListener("change", async (e) => {
    const checkbox = e.target.closest(".checklist-toggle");
    if (checkbox) {
      await toggleChecklistItem(checkbox.dataset.id);
      renderChecklist();
    }
  });

  renderChecklistCertOptions();
  renderChecklist();
}

// ===== 통계 대시보드 (M4) =====

function calcPassRate() {
  const decided = state.certifications.filter(
    (c) => c.status === "합격" || c.status === "불합격"
  );
  if (decided.length === 0) return null;
  const passed = decided.filter((c) => c.status === "합격").length;
  return Math.round((passed / decided.length) * 100);
}

function renderDashboard() {
  renderCalendar();

  const passRate = calcPassRate();
  const passRateEl = document.getElementById("stat-pass-rate");
  if (passRateEl) {
    passRateEl.textContent = passRate === null ? "기록 없음" : `${passRate}%`;
  }

  const passedList = document.getElementById("dashboard-passed-list");
  if (passedList) {
    const passedCerts = state.certifications.filter((c) => c.status === "합격");
    passedList.innerHTML =
      passedCerts.length === 0
        ? '<li class="empty">합격한 자격증이 없습니다.</li>'
        : passedCerts
            .map(
              (cert) => `
      <li class="list-item">
        <div class="list-item-main">
          <strong>${escapeHtml(cert.name)}</strong>
          ${cert.category ? `<span class="tag">${escapeHtml(cert.category)}</span>` : ""}
        </div>
      </li>`
            )
            .join("");
  }

  const progressList = document.getElementById("dashboard-progress-list");
  if (progressList) {
    progressList.innerHTML =
      state.certifications.length === 0
        ? '<li class="empty">등록된 자격증이 없습니다.</li>'
        : state.certifications
            .map(
              (cert) => `
      <li class="list-item">
        <div class="list-item-main">
          <strong>${escapeHtml(cert.name)}</strong>
          <span class="tag">${calcProgress(cert.id)}%</span>
        </div>
      </li>`
            )
            .join("");
  }

  const upcomingList = document.getElementById("dashboard-upcoming-list");
  if (upcomingList) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const upcoming = state.exams
      .filter((exam) => new Date(exam.examDate) >= today)
      .slice()
      .sort((a, b) => new Date(a.examDate) - new Date(b.examDate))
      .slice(0, 5);

    upcomingList.innerHTML =
      upcoming.length === 0
        ? '<li class="empty">다가오는 시험이 없습니다.</li>'
        : upcoming
            .map((exam) => {
              const cert = state.certifications.find((c) => c.id === exam.certificationId);
              return `
      <li class="list-item">
        <div class="list-item-main">
          <strong>${escapeHtml(cert ? cert.name : "알 수 없음")}</strong>
          <span class="badge badge-dday">${calcDday(exam.examDate)}</span>
          <span class="tag">${exam.examDate}</span>
        </div>
      </li>`;
            })
            .join("");
  }
}

// ===== 대시보드 - 시험 일정 캘린더 =====

let calendarViewDate = new Date();
calendarViewDate.setDate(1);

function formatDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function renderCalendar() {
  const label = document.getElementById("calendar-month-label");
  const grid = document.getElementById("calendar-grid");
  if (!label || !grid) return;

  const year = calendarViewDate.getFullYear();
  const month = calendarViewDate.getMonth();
  label.textContent = `${year}년 ${month + 1}월`;

  const startWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const examsByDate = {};
  state.exams.forEach((exam) => {
    if (!examsByDate[exam.examDate]) examsByDate[exam.examDate] = [];
    const cert = state.certifications.find((c) => c.id === exam.certificationId);
    examsByDate[exam.examDate].push(cert ? cert.name : "알 수 없음");
  });

  const todayKey = formatDateKey(new Date());
  const cells = [];

  for (let i = 0; i < startWeekday; i++) {
    cells.push('<div class="calendar-cell calendar-cell--empty"></div>');
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = formatDateKey(new Date(year, month, day));
    const examNames = examsByDate[dateKey] || [];
    const stateClasses = [
      dateKey === todayKey ? "calendar-cell--today" : "",
      examNames.length ? "calendar-cell--has-exam" : "",
    ]
      .filter(Boolean)
      .join(" ");

    cells.push(`
      <div class="calendar-cell ${stateClasses}">
        <span class="calendar-date">${day}</span>
        ${examNames
          .map((name) => `<span class="calendar-exam-tag">${escapeHtml(name)}</span>`)
          .join("")}
      </div>`);
  }

  grid.innerHTML = cells.join("");
}

function initCalendar() {
  document.getElementById("calendar-prev").addEventListener("click", () => {
    calendarViewDate.setMonth(calendarViewDate.getMonth() - 1);
    renderCalendar();
  });
  document.getElementById("calendar-next").addEventListener("click", () => {
    calendarViewDate.setMonth(calendarViewDate.getMonth() + 1);
    renderCalendar();
  });
  renderCalendar();
}

// ===== 초기화 =====

async function init() {
  initTabs();
  await Promise.all([fetchCertifications(), fetchExams(), fetchChecklist()]);
  initCertifications();
  initExams();
  initChecklist();
  initCalendar();
  renderDashboard();
}

document.addEventListener("DOMContentLoaded", init);
