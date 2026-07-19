/* ==========================================================
   YES ACADEMY — Student Feedback Form logic
   ========================================================== */

// ---- CONFIG: Google Apps Script Web App URL (deployed as a POST/GET endpoint) ----
// Replace this with YOUR OWN deployed Web App URL (see setup instructions).
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwPxoCd7J0JsKmo03BsY2LYBaUmpyHuis7nNSApaVaRbaOL5jZ456DuK-dg4qqqDJtTkg/exec";

// ---- Numeric rating scale used by every question (1-5) ----
const RATING_SCALE = [
  { value: 1, label: "Bad" },
  { value: 2, label: "Average" },
  { value: 3, label: "Good" },
  { value: 4, label: "Very Good" },
  { value: 5, label: "Excellent" }
];

// ---- Rating question sets per feedback category ----
// NOTE: `label` is also used as the column header in the Google Sheet,
// so keep these labels in sync with the ALL_RATING_HEADERS list in Code.gs.
const RATING_SETS = {
  "PTE Mock Test": [
    { id: "difficulty", label: "Mock Test Difficulty Level" },
    { id: "questionQuality", label: "Mock Test Question Quality" },
    { id: "accuracy", label: "Accuracy of Evaluation" },
    { id: "speakingWriting", label: "Speaking & Writing Feedback Satisfaction" },
    { id: "facility", label: "Equipment Quality & Facility Satisfaction" },
    { id: "comparison", label: "Our Mock Test Compared to Other Institutes" },
    { id: "overall", label: "Overall Satisfaction" }
  ],
  "IELTS Mock Test": [
    { id: "quality", label: "Mock Test Quality" },
    { id: "questionQuality", label: "Mock Test Question Quality" },
    { id: "bandAccuracy", label: "Band Score Accuracy" },
    { id: "speakingWriting", label: "Speaking & Writing Feedback Satisfaction" },
    { id: "facility", label: "Equipment Quality & Facility Satisfaction" },
    { id: "comparison", label: "Our Mock Test Compared to Other Institutes" },
    { id: "overall", label: "Overall Satisfaction" }
  ],
  "Class Experience": [
    { id: "teacherGuidance", label: "Teacher Guidance Satisfaction" },
    { id: "classroomEnvironment", label: "Classroom Environment & Facility" },
    { id: "learningMaterials", label: "Learning Materials (PDFs & Videos)" },
    { id: "overall", label: "Overall Learning Experience" }
  ],
  "Service Experience": [
    { id: "frontOffice", label: "Front Office Behaviour" },
    { id: "admissionProcess", label: "Admission Process" },
    { id: "staffCommunication", label: "Staff Communication" },
    { id: "teacherBehaviour", label: "Teacher Behaviour" },
    { id: "overall", label: "Overall Service Satisfaction" }
  ]
};

// ---- State ----
const ratingValues = {}; // { questionId: 1-5 }

// ---- DOM refs ----
const courseSelect = document.getElementById("course");
const categorySelect = document.getElementById("category");
const ratingsSection = document.getElementById("section-ratings");
const ratingsContainer = document.getElementById("ratingsContainer");
const suggestionsSection = document.getElementById("section-suggestions");
const suggestionsField = document.getElementById("suggestions");
const charCountEl = document.getElementById("charCount");
const form = document.getElementById("feedbackForm");
const sendBtn = document.getElementById("sendBtn");
const successOverlay = document.getElementById("successOverlay");
const ribbonSteps = document.querySelectorAll(".ribbon-step");
const batchWrap = document.getElementById("batchWrap");

document.getElementById("year").textContent = new Date().getFullYear();

// ---- Build a numeric (1-5) rating widget for a single question ----
function buildRatingGroup(question) {
  const wrap = document.createElement("div");
  wrap.className = "rating-group";
  wrap.dataset.qid = question.id;

  const labelRow = document.createElement("div");
  labelRow.className = "rating-group-label";
  labelRow.innerHTML = `<span>${question.label}</span><i class="bi bi-check-circle-fill status-icon"></i>`;

  const numericRow = document.createElement("div");
  numericRow.className = "numeric-row";
  numericRow.setAttribute("role", "radiogroup");
  numericRow.setAttribute("aria-label", question.label);

  RATING_SCALE.forEach(({ value, label }) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "numeric-btn";
    btn.dataset.value = value;
    btn.setAttribute("aria-label", `${value} - ${label}`);
    btn.innerHTML = `<span class="numeric-number">${value}</span><span class="numeric-text">${label}</span>`;

    btn.addEventListener("click", () => {
      ratingValues[question.id] = value;
      updateNumericSelection(numericRow, value);
      labelRow.querySelector(".status-icon").classList.add("show");
      checkRatingsComplete();
    });

    numericRow.appendChild(btn);
  });

  wrap.appendChild(labelRow);
  wrap.appendChild(numericRow);
  return wrap;
}

// ---- Highlight only the chosen numeric card ----
function updateNumericSelection(numericRow, value) {
  [...numericRow.children].forEach((btn) => {
    btn.classList.toggle("selected", Number(btn.dataset.value) === value);
  });
}

// ---- Render the rating questions for the chosen category ----
function renderRatings(category) {
  ratingsContainer.innerHTML = "";
  Object.keys(ratingValues).forEach(k => delete ratingValues[k]);

  const questions = RATING_SETS[category] || [];
  questions.forEach(q => ratingsContainer.appendChild(buildRatingGroup(q)));

  const hasQuestions = questions.length > 0;
  ratingsSection.hidden = !hasQuestions;
  suggestionsSection.hidden = !hasQuestions;
  if (hasQuestions) setActiveStep(2);
}

// ---- Advance the ribbon to step 3 once every question in the category is answered ----
function checkRatingsComplete() {
  const questions = RATING_SETS[categorySelect.value] || [];
  const answered = Object.keys(ratingValues).length;
  if (questions.length > 0 && answered >= questions.length) {
    setActiveStep(3);
  }
}

// ---- Ribbon step control ----
function setActiveStep(stepNum) {
  ribbonSteps.forEach(step => {
    const n = Number(step.dataset.step);
    step.classList.remove("active", "done");
    if (n < stepNum) step.classList.add("done");
    if (n === stepNum) step.classList.add("active");
  });
}

// ---- Category change: rebuild the rating questions ----
categorySelect.addEventListener("change", () => {
  renderRatings(categorySelect.value);
});

// ---- Course change: reveal Batch Number field, advance ribbon if ratings already shown ----
function checkBasicsComplete() {
  batchWrap.hidden = !courseSelect.value;
  if (courseSelect.value && categorySelect.value && !ratingsSection.hidden) {
    setActiveStep(2);
  }
}
courseSelect.addEventListener("change", checkBasicsComplete);

// ---- Character counter for suggestions ----
suggestionsField.addEventListener("input", () => {
  charCountEl.textContent = suggestionsField.value.length;
});

// ---- Convert a numeric rating (1-5) into its "N - Label" text ----
function ratingText(value) {
  const entry = RATING_SCALE.find(r => r.value === value);
  return entry ? `${entry.value} - ${entry.label}` : "Not rated";
}

// ---- Build the JSON payload sent to the Google Sheet ----
// Each rating is sent as { "Question Label": "N - Label" } so the Apps
// Script can drop every answer into its own dedicated column, regardless
// of which category (and therefore which set of questions) was used.
function buildPayload() {
  const name = document.getElementById("studentName").value.trim();
  const course = courseSelect.value;
  const batch = document.getElementById("batchNumber").value.trim();
  const category = categorySelect.value;
  const suggestions = suggestionsField.value.trim();
  const questions = RATING_SETS[category] || [];

  const ratingsData = {};
  questions.forEach(q => {
    ratingsData[q.label] = ratingText(ratingValues[q.id]);
  });

  return {
    name: name || "Not provided",
    course: course,
    batchNumber: batch || "Not provided",
    category: category,
    ratingsData: JSON.stringify(ratingsData),
    suggestions: suggestions || "None",
    submittedAt: new Date().toISOString()
  };
}

// ---- Validation ----
function validateForm() {
  let valid = true;

  if (!courseSelect.value) {
    courseSelect.classList.add("is-invalid");
    valid = false;
  } else {
    courseSelect.classList.remove("is-invalid");
  }

  if (!categorySelect.value) {
    categorySelect.classList.add("is-invalid");
    valid = false;
  } else {
    categorySelect.classList.remove("is-invalid");
  }

  const questions = RATING_SETS[categorySelect.value] || [];
  const missing = questions.filter(q => !ratingValues[q.id]);
  if (missing.length > 0) {
    valid = false;
    missing.forEach(q => {
      const group = ratingsContainer.querySelector(`[data-qid="${q.id}"]`);
      if (group) {
        group.style.boxShadow = "0 0 0 3px rgba(220,53,69,0.35)";
        setTimeout(() => { group.style.boxShadow = ""; }, 1200);
      }
    });
  }

  return valid;
}

// ---- Reset the form back to its initial state ----
function resetForm() {
  form.reset();
  Object.keys(ratingValues).forEach(k => delete ratingValues[k]);
  ratingsContainer.innerHTML = "";
  ratingsSection.hidden = true;
  suggestionsSection.hidden = true;
  batchWrap.hidden = true;
  charCountEl.textContent = "0";
  setActiveStep(1);
}

// ---- Show a temporary, user-friendly error toast ----
function showErrorToast(message) {
  const toast = document.getElementById("errorToast");
  const toastMsg = document.getElementById("errorToastMsg");
  toastMsg.textContent = message;
  toast.classList.add("show");
  clearTimeout(showErrorToast._t);
  showErrorToast._t = setTimeout(() => toast.classList.remove("show"), 4500);
}

// ---- Submit handler: sends feedback to the Google Apps Script Web App ----
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!validateForm()) return;

  sendBtn.disabled = true;
  sendBtn.innerHTML = `<i class="bi bi-hourglass-split"></i> Sending...`;

  const payload = buildPayload();

  // Sent as a GET with query parameters — Google's /exec redirect strips
  // the body from POST requests, so query params are the reliable path.
  const queryString = new URLSearchParams(payload).toString();
  const requestUrl = `${SCRIPT_URL}?${queryString}`;

  try {
    await fetch(requestUrl, {
      method: "GET",
      // Apps Script Web Apps don't send CORS headers back, so a normal
      // fetch() throws even when the submission succeeds server-side.
      // "no-cors" lets the request go through; we just can't read the
      // response body (which we don't need — success = no network error).
      mode: "no-cors"
    });

    successOverlay.classList.add("show");

    setTimeout(() => {
      successOverlay.classList.remove("show");
      resetForm();
      sendBtn.disabled = false;
      sendBtn.innerHTML = `<i class="bi bi-send-check"></i> Submit`;
    }, 2200);

  } catch (err) {
    console.error("Feedback submission failed:", err);
    showErrorToast("Something went wrong while sending your feedback. Please check your connection and try again.");
    sendBtn.disabled = false;
    sendBtn.innerHTML = `<i class="bi bi-send-check"></i> Submit`;
  }
});

// ---- Page loader: fade the logo loader out once everything has loaded ----
window.addEventListener("load", () => {
  const loader = document.getElementById("pageLoader");
  setTimeout(() => {
    loader.classList.add("loaded");
  }, 600);
});
