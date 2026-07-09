/* ==========================================================
   YES ACADEMY — Student Feedback Form logic
   ========================================================== */

// ---- CONFIG: Google Apps Script Web App URL (deployed as a POST endpoint) ----
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzfzfYTV2gXfCyZD99pEmuHBYKL9J5WD7EFfJalcFoy_3WXq536WGMiJi8aG6At59-qRw/exec";

// ---- Numeric rating scale (replaces the old 5-star system) ----
// value -> label shown on each numbered card
const RATING_SCALE = [
  { value: 1, label: "Bad" },
  { value: 2, label: "Average" },
  { value: 3, label: "Good" },
  { value: 4, label: "Very Good" },
  { value: 5, label: "Excellent" }
];

// ---- Rating question sets per feedback category ----
const RATING_SETS = {
  "PTE Mock Test": [
    { id: "difficulty", label: "Mock Test Difficulty" },
    { id: "accuracy", label: "Accuracy of Evaluation" },
    { id: "speaking", label: "Speaking Feedback Quality" },
    { id: "writing", label: "Writing Feedback Quality" },
    { id: "facility", label: "Equipment Quality & Facility Satisfaction" },
    { id: "overall", label: "Overall Satisfaction" }
  ],
  "IELTS Mock Test": [
    { id: "quality", label: "Mock Test Quality" },
    { id: "bandAccuracy", label: "Band Score Accuracy" },
    { id: "examinerFeedback", label: "Examiner Feedback" },
    { id: "facility", label: "Equipment Quality & Facility Satisfaction" },
    { id: "overall", label: "Overall Satisfaction" }
  ],
  "Class Experience": [
    { id: "teacherExplanation", label: "Teacher's Explanation" },
    { id: "classEnvironment", label: "Class Environment" },
    { id: "learningMaterials", label: "Learning Materials" },
    { id: "overall", label: "Overall Class Experience" }
  ],
  "Service Experience": [
    { id: "staffBehaviour", label: "Staff Behaviour" },
    { id: "admissionProcess", label: "Admission Process" },
    { id: "communication", label: "Communication" },
    { id: "overall", label: "Overall Service" }
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

document.getElementById("year").textContent = new Date().getFullYear();

// ---- Build numeric rating widget for a question (1 Good / 2 Very Good / 3 Excellent / 4 Wonderful) ----
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

// ---- Highlight only the chosen numeric card, using YES ACADEMY theme colors ----
function updateNumericSelection(numericRow, value) {
  [...numericRow.children].forEach((btn) => {
    const v = Number(btn.dataset.value);
    btn.classList.toggle("selected", v === value);
  });
}

// ---- Render ratings for chosen category ----
function renderRatings(category) {
  ratingsContainer.innerHTML = "";
  Object.keys(ratingValues).forEach(k => delete ratingValues[k]);

  const questions = RATING_SETS[category] || [];
  questions.forEach(q => ratingsContainer.appendChild(buildRatingGroup(q)));

  if (questions.length) {
    ratingsSection.hidden = false;
    suggestionsSection.hidden = false;
    setActiveStep(2);
  } else {
    ratingsSection.hidden = true;
    suggestionsSection.hidden = true;
  }
}

function checkRatingsComplete(totalCount) {
  const category = categorySelect.value;
  const total = (RATING_SETS[category] || []).length;
  const answered = Object.keys(ratingValues).length;
  if (answered >= total && total > 0) {
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

// ---- Category change handler ----
categorySelect.addEventListener("change", () => {
  renderRatings(categorySelect.value);
});

// ---- Course change: reveal Batch Number field + advance ribbon once both basics chosen ----
const batchWrap = document.getElementById("batchWrap");

function checkBasicsComplete() {
  // Show the optional Batch Number field as soon as a course is picked
  batchWrap.hidden = !courseSelect.value;

  if (courseSelect.value && categorySelect.value) {
    if (ratingsSection.hidden === false) setActiveStep(2);
  }
}
courseSelect.addEventListener("change", checkBasicsComplete);

// ---- Character counter for suggestions ----
suggestionsField.addEventListener("input", () => {
  charCountEl.textContent = suggestionsField.value.length;
});

// ---- Convert a numeric rating (1-4) into its "N - Label" text for the message ----
function ratingText(value) {
  const entry = RATING_SCALE.find(r => r.value === value);
  return entry ? `${entry.value} - ${entry.label}` : "Not rated";
}

// ---- Build the JSON payload for the Google Sheet submission ----
function buildPayload() {
  const name = document.getElementById("studentName").value.trim();
  const course = courseSelect.value;
  const batch = document.getElementById("batchNumber").value.trim();
  const category = categorySelect.value;
  const suggestions = suggestionsField.value.trim();
  const questions = RATING_SETS[category] || [];

  // Collect every rating question as its own labeled field
  const ratings = {};
  questions.forEach(q => {
    ratings[q.label] = ratingText(ratingValues[q.id] || 0);
  });

  return {
    name: name || "Not provided",
    course: course,
    batchNumber: batch || "Not provided",
    category: category,
    ratings: ratings,
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
    // Briefly highlight missing rating groups
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

// ---- Submit handler: POST feedback to the Google Apps Script Web App ----
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!validateForm()) return;

  sendBtn.disabled = true;
  sendBtn.innerHTML = `<i class="bi bi-hourglass-split"></i> Sending...`;

  const payload = buildPayload();

  try {
    await fetch(SCRIPT_URL, {
      method: "POST",
      // Apps Script Web Apps don't support CORS preflight well, so we send
      // a "simple request" content type and read the response as opaque.
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    });

    // Show the premium success animation
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
  // Small delay so the premium pulse animation is visible even on fast connections
  setTimeout(() => {
    loader.classList.add("loaded");
  }, 600);
});
