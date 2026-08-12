// ===== 데이터 저장소 (localStorage) =====
// 추후 Supabase 전환 시 이 구간의 구현부만 교체하면 되도록 분리해둔다.

const STORAGE_KEY = "cert-tracker-state";

function getDefaultState() {
  return {
    certifications: [],
    exams: [],
    checklist: [],
  };
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return getDefaultState();
  }
  try {
    return JSON.parse(raw);
  } catch (e) {
    return getDefaultState();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// ===== 앱 상태 =====

let state = loadState();

// ===== 탭 네비게이션 =====

function switchTab(tabName) {
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tabName);
  });
  document.querySelectorAll(".tab-section").forEach((section) => {
    section.classList.toggle("active", section.id === tabName);
  });
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

function generateId() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

function addCertification(data) {
  state.certifications.push({ id: generateId(), ...data });
  saveState();
}

function updateCertification(id, data) {
  const cert = state.certifications.find((c) => c.id === id);
  if (cert) Object.assign(cert, data);
  saveState();
}

function deleteCertification(id) {
  state.certifications = state.certifications.filter((c) => c.id !== id);
  saveState();
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

  form.addEventListener("submit", (e) => {
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
      updateCertification(editId, data);
    } else {
      addCertification(data);
    }
    resetCertForm();
    renderCertifications();
  });

  cancelBtn.addEventListener("click", () => {
    resetCertForm();
  });

  list.addEventListener("click", (e) => {
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
      deleteCertification(deleteBtn.dataset.id);
      renderCertifications();
    }
  });

  renderCertifications();
}

// ===== 시험 일정 (M2) =====
// EXAM_CATALOG는 공식 시험 일정을 흉내 낸 참고용 시드 데이터다. 실제 시행처 공고와 다를 수 있으며,
// 추후 Supabase 전환 시 공용 테이블(read-only)로 옮겨갈 자리다.
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

function addExam(data) {
  state.exams.push({ id: generateId(), ...data });
  saveState();
}

function updateExam(id, data) {
  const exam = state.exams.find((e) => e.id === id);
  if (exam) Object.assign(exam, data);
  saveState();
}

function deleteExam(id) {
  state.exams = state.exams.filter((e) => e.id !== id);
  saveState();
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

  form.addEventListener("submit", (e) => {
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
      updateExam(editId, data);
    } else {
      addExam(data);
    }
    resetExamForm();
    renderExams();
  });

  cancelBtn.addEventListener("click", () => {
    resetExamForm();
  });

  list.addEventListener("click", (e) => {
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
      deleteExam(deleteBtn.dataset.id);
      renderExams();
    }
  });

  renderExamCertOptions();
  renderExamCatalogOptions();
  renderExams();
}

// ===== 학습 체크리스트 (M3) =====

function addChecklistItem(data) {
  state.checklist.push({ id: generateId(), done: false, ...data });
  saveState();
}

function toggleChecklistItem(id) {
  const item = state.checklist.find((i) => i.id === id);
  if (item) item.done = !item.done;
  saveState();
}

function deleteChecklistItem(id) {
  state.checklist = state.checklist.filter((i) => i.id !== id);
  saveState();
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

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const certId = certSelect.value;
    if (!certId) {
      alert("자격증을 먼저 등록해주세요.");
      return;
    }
    const titleInput = document.getElementById("checklist-title");
    const title = titleInput.value.trim();
    if (!title) return;
    addChecklistItem({ certificationId: certId, title });
    titleInput.value = "";
    renderChecklist();
  });

  list.addEventListener("click", (e) => {
    const deleteBtn = e.target.closest(".btn-delete");
    if (deleteBtn) {
      if (!confirm("이 학습 항목을 삭제할까요?")) return;
      deleteChecklistItem(deleteBtn.dataset.id);
      renderChecklist();
    }
  });

  list.addEventListener("change", (e) => {
    const checkbox = e.target.closest(".checklist-toggle");
    if (checkbox) {
      toggleChecklistItem(checkbox.dataset.id);
      renderChecklist();
    }
  });

  renderChecklistCertOptions();
  renderChecklist();
}

// ===== 초기화 =====

function init() {
  initTabs();
  initCertifications();
  initExams();
  initChecklist();
  saveState();
}

document.addEventListener("DOMContentLoaded", init);
