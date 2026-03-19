// sample initial data; in a real app this might come from a server
let prompts = [
  {
    id: "prompt-1",
    title: "Marketing Email Generator",
    content:
      "Write a persuasive marketing email that promotes our new product.",
    isFavorite: false,
    createdAt: "2024-01-15",
    rating: 5,
    notes: "",
  },
  {
    id: "prompt-2",
    title: "Blog Post Outline",
    content:
      "Create an outline for a blog post about the benefits of exercise.",
    isFavorite: false,
    createdAt: "2024-02-03",
    rating: 4,
    notes: "",
  },
  {
    id: "prompt-3",
    title: "Social Media Caption",
    content: "Generate a catchy caption for a social media post about travel.",
    isFavorite: false,
    createdAt: "2024-03-10",
    rating: 5,
    notes: "",
  },
];

const DRAFT_STORAGE_KEY = "promptLibraryDraftNotes";
const STORAGE_KEY = "promptLibraryPrompts";
const EXPORT_VERSION = "1.0";

// -------------------- Metadata tracking --------------------

function isValidISODate(str) {
  if (typeof str !== "string") return false;
  // Quick sanity check + Date.parse
  const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
  return isoRegex.test(str) && !Number.isNaN(Date.parse(str));
}

function estimateTokens(text, isCode) {
  if (typeof text !== "string") {
    throw new Error("estimateTokens: text must be a string");
  }

  const words = text.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const charCount = text.length;

  let min = 0.75 * wordCount;
  let max = 0.25 * charCount;

  if (isCode) {
    min *= 1.3;
    max *= 1.3;
  }

  // Ensure sensible numbers
  min = Math.max(0, Math.round(min));
  max = Math.max(min, Math.round(max));

  const tokens = max;
  let confidence = "high";
  if (tokens > 5000) {
    confidence = "low";
  } else if (tokens > 1000) {
    confidence = "medium";
  }

  return {
    min,
    max,
    confidence,
  };
}

function getIsoNow() {
  return new Date().toISOString();
}

function trackModel(modelName, content) {
  if (typeof modelName !== "string" || modelName.trim() === "") {
    throw new Error("trackModel: modelName must be a non-empty string");
  }
  if (modelName.length > 100) {
    throw new Error("trackModel: modelName must be 100 characters or fewer");
  }
  if (typeof content !== "string") {
    throw new Error("trackModel: content must be a string");
  }

  const createdAt = getIsoNow();
  const tokenEstimate = estimateTokens(content, false);
  return {
    model: modelName.trim(),
    createdAt,
    updatedAt: createdAt,
    tokenEstimate,
  };
}

function updateTimestamps(metadata) {
  if (!metadata || typeof metadata !== "object") {
    throw new Error("updateTimestamps: metadata must be an object");
  }
  if (!isValidISODate(metadata.createdAt)) {
    throw new Error(
      "updateTimestamps: createdAt must be a valid ISO 8601 string",
    );
  }

  const now = getIsoNow();
  if (now < metadata.createdAt) {
    throw new Error(
      "updateTimestamps: updatedAt cannot be earlier than createdAt",
    );
  }

  return {
    ...metadata,
    updatedAt: now,
  };
}

function ensurePromptMetadata(prompt) {
  if (!prompt || typeof prompt !== "object") return;

  if (!prompt.metadata) {
    let createdAt;
    if (isValidISODate(prompt.createdAt)) {
      createdAt = prompt.createdAt;
    } else if (
      typeof prompt.createdAt === "string" &&
      !Number.isNaN(Date.parse(prompt.createdAt))
    ) {
      createdAt = new Date(prompt.createdAt).toISOString();
    } else {
      createdAt = getIsoNow();
    }

    const modelName =
      typeof prompt.model === "string" && prompt.model.trim()
        ? prompt.model.trim()
        : "unknown";

    prompt.metadata = {
      model: modelName,
      createdAt,
      updatedAt: createdAt,
      tokenEstimate: estimateTokens(prompt.content || "", false),
    };
    return;
  }

  // Validate/repair basic expectations
  if (!isValidISODate(prompt.metadata.createdAt)) {
    if (
      typeof prompt.metadata.createdAt === "string" &&
      !Number.isNaN(Date.parse(prompt.metadata.createdAt))
    ) {
      prompt.metadata.createdAt = new Date(
        prompt.metadata.createdAt,
      ).toISOString();
    } else {
      prompt.metadata.createdAt = getIsoNow();
    }
  }

  if (!isValidISODate(prompt.metadata.updatedAt)) {
    if (
      typeof prompt.metadata.updatedAt === "string" &&
      !Number.isNaN(Date.parse(prompt.metadata.updatedAt))
    ) {
      prompt.metadata.updatedAt = new Date(
        prompt.metadata.updatedAt,
      ).toISOString();
    } else {
      prompt.metadata.updatedAt = prompt.metadata.createdAt;
    }
  }

  try {
    prompt.metadata = updateTimestamps(prompt.metadata);
  } catch (e) {
    // If update is invalid, keep existing metadata but ensure updatedAt exists
    if (!prompt.metadata.updatedAt) {
      prompt.metadata.updatedAt = prompt.metadata.createdAt;
    }
  }
}

function touchPromptMetadata(prompt) {
  if (!prompt || typeof prompt !== "object") return;
  if (!prompt.metadata) {
    ensurePromptMetadata(prompt);
    return;
  }

  try {
    prompt.metadata = updateTimestamps(prompt.metadata);
  } catch (e) {
    console.error("Failed to touch prompt metadata:", e);
  }
}

function saveDraftNotes(promptId, notes) {
  const drafts = JSON.parse(sessionStorage.getItem(DRAFT_STORAGE_KEY) || "{}");
  drafts[promptId] = notes;
  sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(drafts));
}

function loadDraftNotes(promptId) {
  const drafts = JSON.parse(sessionStorage.getItem(DRAFT_STORAGE_KEY) || "{}");
  return drafts[promptId] || "";
}

function clearDraftNotes(promptId) {
  const drafts = JSON.parse(sessionStorage.getItem(DRAFT_STORAGE_KEY) || "{}");
  delete drafts[promptId];
  sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(drafts));
}

function saveToStorage(arr) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
}

function loadFromStorage() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        prompts = parsed;
      } else {
        console.warn("Stored prompts not an array; resetting to defaults");
      }
    } catch (e) {
      console.warn("failed to parse stored prompts", e);
    }
  }

  // If we didn't load a valid array, persist the initial sample prompts.
  if (!Array.isArray(prompts)) {
    prompts = [];
  }

  // Ensure every prompt has structured metadata
  prompts.forEach((p) => ensurePromptMetadata(p));
  saveToStorage(prompts);
}

function computeExportStats(arr) {
  const totalPrompts = Array.isArray(arr) ? arr.length : 0;
  const validRatings = (Array.isArray(arr) ? arr : [])
    .map((p) => (typeof p.rating === "number" ? p.rating : NaN))
    .filter(Number.isFinite);
  const averageRating =
    validRatings.length > 0
      ? validRatings.reduce((sum, r) => sum + r, 0) / validRatings.length
      : null;

  const modelCounts = (Array.isArray(arr) ? arr : []).reduce((acc, p) => {
    const model =
      (p.metadata?.model || p.model || "unknown").toString().trim() ||
      "unknown";
    acc[model] = (acc[model] || 0) + 1;
    return acc;
  }, {});

  const mostUsedModel = Object.keys(modelCounts).reduce((best, model) => {
    if (!best) return model;
    return modelCounts[model] > modelCounts[best] ? model : best;
  }, null);

  return {
    totalPrompts,
    averageRating,
    mostUsedModel,
  };
}

function validatePromptObject(prompt) {
  if (!prompt || typeof prompt !== "object") {
    throw new Error("Each prompt must be an object");
  }
  if (typeof prompt.id !== "string" || !prompt.id.trim()) {
    throw new Error("Prompt is missing a valid id");
  }
  if (typeof prompt.title !== "string") {
    throw new Error(`Prompt (${prompt.id}) is missing a title`);
  }
  if (typeof prompt.content !== "string") {
    throw new Error(`Prompt (${prompt.id}) is missing content`);
  }
  // ensure metadata exists for export/import purpose
  ensurePromptMetadata(prompt);
  return true;
}

function createExportPayload() {
  // Refresh from storage to ensure latest user changes are included.
  loadFromStorage();

  // Clone prompts so we don't mutate application state during export.
  const payloadPrompts = JSON.parse(JSON.stringify(prompts));
  payloadPrompts.forEach((p) => validatePromptObject(p));

  return {
    version: EXPORT_VERSION,
    exportedAt: getIsoNow(),
    stats: computeExportStats(payloadPrompts),
    prompts: payloadPrompts,
  };
}

function downloadJsonBlob(obj, filename) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function exportPrompts() {
  try {
    const payload = createExportPayload();
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `prompt-library-export-${timestamp}.json`;
    downloadJsonBlob(payload, filename);
    alert(`Export successful! File downloaded as ${filename}`);
  } catch (e) {
    console.error(e);
    alert(`Export failed: ${e.message}`);
  }
}

function isCompatibleExportVersion(version) {
  if (typeof version !== "string") return false;
  const [major] = version.split(".");
  const [ourMajor] = EXPORT_VERSION.split(".");
  return major === ourMajor;
}

function validateImportPayload(payload) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Import file is not a valid JSON object");
  }
  if (typeof payload.version !== "string") {
    throw new Error("Import file is missing a version");
  }
  if (!Array.isArray(payload.prompts)) {
    throw new Error("Import file is missing prompts array");
  }
  payload.prompts.forEach(validatePromptObject);
}

function restoreFromBackup(backup) {
  if (backup == null) {
    localStorage.removeItem(STORAGE_KEY);
  } else {
    localStorage.setItem(STORAGE_KEY, backup);
  }
}

function importPromptsFromObject(imported) {
  validateImportPayload(imported);

  if (!isCompatibleExportVersion(imported.version)) {
    const proceed = confirm(
      `This file was exported with version ${imported.version}, which may not be fully compatible with this app (expected ${EXPORT_VERSION}). Click OK to continue or Cancel to abort.`,
    );
    if (!proceed) {
      return;
    }
  }

  const existingById = new Map(prompts.map((p) => [p.id, p]));
  const incomingById = new Map();
  imported.prompts.forEach((p) => {
    if (incomingById.has(p.id)) {
      throw new Error(`Import file contains duplicate prompt id: ${p.id}`);
    }
    incomingById.set(p.id, p);
  });

  const duplicateIds = imported.prompts
    .map((p) => p.id)
    .filter((id) => existingById.has(id));

  let overwriteExisting = false;
  if (duplicateIds.length > 0) {
    overwriteExisting = confirm(
      `${duplicateIds.length} prompts already exist in your library. Click OK to overwrite existing prompts with imported ones, or Cancel to keep existing prompts and only add new ones.`,
    );
  }

  const backup = localStorage.getItem(STORAGE_KEY);
  try {
    const merged = [...prompts];
    const indexById = new Map(merged.map((p, idx) => [p.id, idx]));

    imported.prompts.forEach((incoming) => {
      const existingIndex = indexById.get(incoming.id);
      if (existingIndex != null) {
        if (overwriteExisting) {
          merged[existingIndex] = incoming;
        }
      } else {
        merged.push(incoming);
      }
    });

    prompts = merged;
    prompts.forEach((p) => ensurePromptMetadata(p));
    saveToStorage(prompts);
    renderPrompts();
    alert("Import successful!");
  } catch (e) {
    console.error(e);
    restoreFromBackup(backup);
    try {
      prompts = backup ? JSON.parse(backup) : [];
    } catch {
      prompts = [];
    }
    renderPrompts();
    alert(`Import failed: ${e.message}`);
  }
}

function handleImportFileChange(event) {
  const file = (event.target.files || [])[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const text = reader.result;
      const parsed = JSON.parse(text);
      importPromptsFromObject(parsed);
    } catch (e) {
      console.error(e);
      alert(`Failed to import: ${e.message}`);
    }
  };
  reader.onerror = () => {
    alert("Failed to read import file.");
  };
  reader.readAsText(file);

  // Reset so the same file can be selected again later
  event.target.value = "";
}

function setupImportExportButtons() {
  const exportBtn = document.getElementById("export-btn");
  const importBtn = document.getElementById("import-btn");
  const importFile = document.getElementById("import-file");

  if (exportBtn) {
    exportBtn.addEventListener("click", exportPrompts);
  }
  if (importBtn && importFile) {
    importBtn.addEventListener("click", () => importFile.click());
    importFile.addEventListener("change", handleImportFileChange);
  }
}

function toggleFavorite(promptId) {
  const prompt = prompts.find((p) => p.id === promptId);
  if (!prompt) return;
  prompt.isFavorite = !prompt.isFavorite;
  touchPromptMetadata(prompt);
  saveToStorage(prompts);
  renderPrompts();
}

function setRating(promptId, value) {
  const prompt = prompts.find((p) => p.id === promptId);
  if (!prompt) return;
  prompt.rating = value;
  touchPromptMetadata(prompt);
  saveToStorage(prompts);
  renderPrompts();
}

function updateStars(container, rating) {
  const stars = container.querySelectorAll(".star");
  stars.forEach((star, idx) => {
    if (idx < rating) {
      star.classList.add("filled");
    } else {
      star.classList.remove("filled");
    }
  });
}

function saveNotes(promptId, notes) {
  const prompt = prompts.find((p) => p.id === promptId);
  if (!prompt) return;
  try {
    prompt.notes = notes;
    touchPromptMetadata(prompt);
    saveToStorage(prompts);
  } catch (e) {
    if (e.name === "QuotaExceededError") {
      alert("Storage quota exceeded. Unable to save notes.");
    } else {
      console.error("Error saving notes:", e);
    }
  }
}

function deleteNotes(promptId) {
  if (confirm("Are you sure you want to delete these notes?")) {
    const prompt = prompts.find((p) => p.id === promptId);
    if (!prompt) return;
    prompt.notes = "";
    clearDraftNotes(promptId);
    saveToStorage(prompts);
    renderPrompts();
  }
}

function toggleNotesPanel(card, promptId) {
  const notesPanel = card.querySelector(".notes-panel");
  const isVisible = notesPanel.style.display === "block";
  notesPanel.style.display = isVisible ? "none" : "block";
  if (!isVisible) {
    const prompt = prompts.find((p) => p.id === promptId);
    const textarea = notesPanel.querySelector(".notes-textarea");
    const draft = loadDraftNotes(promptId);
    textarea.value = draft || prompt.notes || "";
    updateCharCounter(textarea);
  }
}

function updateCharCounter(textarea) {
  const counter = textarea.parentElement.querySelector(".char-counter");
  const length = textarea.value.length;
  counter.textContent = `${length}/500`;
  counter.style.color = length > 500 ? "red" : "#666";
}

function createRatingElement(prompt) {
  const wrapper = document.createElement("div");
  wrapper.className = "rating";
  // create five stars
  for (let i = 1; i <= 5; i++) {
    const star = document.createElement("span");
    star.className = "star";
    star.dataset.value = i;
    star.innerHTML = "\u2605"; // ★
    if (i <= Math.round(prompt.rating || 0)) {
      star.classList.add("filled");
    }
    star.addEventListener("click", () => setRating(prompt.id, i));
    star.addEventListener("mouseover", () => updateStars(wrapper, i));
    star.addEventListener("mouseout", () =>
      updateStars(wrapper, Math.round(prompt.rating || 0)),
    );
    wrapper.appendChild(star);
  }
  return wrapper;
}

function createCard(prompt) {
  ensurePromptMetadata(prompt);

  const div = document.createElement("div");
  div.className = "card";

  const icon = document.createElement("span");
  icon.className = "favorite-icon";
  icon.innerHTML = prompt.isFavorite ? "&#x2665;" : "&#x2661;";
  if (prompt.isFavorite) icon.classList.add("favorited");
  icon.addEventListener("click", () => {
    toggleFavorite(prompt.id);
  });

  const title = document.createElement("h2");
  title.textContent = prompt.title;

  const content = document.createElement("p");
  content.textContent = prompt.content;

  const metadataContainer = document.createElement("div");
  metadataContainer.className = "metadata";

  const modelLine = document.createElement("div");
  modelLine.className = "metadata-row";
  modelLine.innerHTML =
    '<span class="metadata-label">Model:</span> ' +
    (prompt.metadata?.model || "unknown");

  const formatDate = (iso) => {
    try {
      return new Date(iso).toLocaleString();
    } catch (e) {
      return iso;
    }
  };

  const createdLine = document.createElement("div");
  createdLine.className = "metadata-row";
  createdLine.innerHTML =
    '<span class="metadata-label">Created:</span> ' +
    formatDate(prompt.metadata?.createdAt || "");

  const updatedLine = document.createElement("div");
  updatedLine.className = "metadata-row";
  updatedLine.innerHTML =
    '<span class="metadata-label">Updated:</span> ' +
    formatDate(prompt.metadata?.updatedAt || "");

  const token = prompt.metadata?.tokenEstimate || {
    min: 0,
    max: 0,
    confidence: "low",
  };
  const tokenLine = document.createElement("div");
  tokenLine.className = "metadata-row token-estimate";
  tokenLine.textContent = `Tokens: ${token.min} - ${token.max} (${token.confidence})`;
  tokenLine.classList.add(`confidence-${token.confidence}`);

  metadataContainer.appendChild(modelLine);
  metadataContainer.appendChild(createdLine);
  metadataContainer.appendChild(updatedLine);
  metadataContainer.appendChild(tokenLine);

  // notes icon
  const notesIcon = document.createElement("span");
  notesIcon.className = "notes-icon";
  notesIcon.innerHTML = "📝";
  notesIcon.title = "Toggle notes";
  notesIcon.addEventListener("click", () => toggleNotesPanel(div, prompt.id));

  // notes panel
  const notesPanel = document.createElement("div");
  notesPanel.className = "notes-panel";
  notesPanel.style.display = "none";

  const textarea = document.createElement("textarea");
  textarea.className = "notes-textarea";
  textarea.placeholder = "Add notes here...";
  textarea.maxLength = 500;
  textarea.value = prompt.notes || "";
  textarea.addEventListener("input", () => {
    updateCharCounter(textarea);
    saveDraftNotes(prompt.id, textarea.value);
  });

  const charCounter = document.createElement("div");
  charCounter.className = "char-counter";
  charCounter.textContent = `${textarea.value.length}/500`;

  const saveBtn = document.createElement("button");
  saveBtn.className = "notes-save-btn";
  saveBtn.textContent = "Save";
  saveBtn.addEventListener("click", () => {
    saveNotes(prompt.id, textarea.value);
    clearDraftNotes(prompt.id);
    // visual feedback
    saveBtn.textContent = "Saved!";
    saveBtn.style.backgroundColor = "#4CAF50";
    setTimeout(() => {
      saveBtn.textContent = "Save";
      saveBtn.style.backgroundColor = "";
    }, 1000);
  });

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "notes-delete-btn";
  deleteBtn.textContent = "Delete";
  deleteBtn.addEventListener("click", () => deleteNotes(prompt.id));

  notesPanel.appendChild(textarea);
  notesPanel.appendChild(charCounter);
  notesPanel.appendChild(saveBtn);
  notesPanel.appendChild(deleteBtn);

  div.appendChild(icon);
  div.appendChild(notesIcon);
  div.appendChild(title);
  div.appendChild(content);
  div.appendChild(metadataContainer);

  // rating
  div.appendChild(createRatingElement(prompt));

  div.appendChild(notesPanel);

  return div;
}

function renderPrompts() {
  const container = document.getElementById("prompt-container");
  container.innerHTML = "";
  let listToRender = prompts;
  if (currentFilter === "favorites") {
    listToRender = prompts.filter((p) => p.isFavorite);
  }

  // Sort by createdAt descending (newest first)
  listToRender = listToRender.slice().sort((a, b) => {
    const aCreated = (a.metadata?.createdAt || a.createdAt || "").toString();
    const bCreated = (b.metadata?.createdAt || b.createdAt || "").toString();
    return bCreated.localeCompare(aCreated);
  });

  if (listToRender.length === 0) {
    const msg = document.createElement("p");
    msg.textContent = "No prompts to show.";
    container.appendChild(msg);
    return;
  }
  listToRender.forEach((p) => {
    container.appendChild(createCard(p));
  });
}

function setupFilterButtons() {
  const allBtn = document.getElementById("filter-all");
  const favBtn = document.getElementById("filter-favorites");

  allBtn.addEventListener("click", () => {
    currentFilter = "all";
    allBtn.classList.add("active");
    favBtn.classList.remove("active");
    renderPrompts();
  });

  favBtn.addEventListener("click", () => {
    currentFilter = "favorites";
    favBtn.classList.add("active");
    allBtn.classList.remove("active");
    renderPrompts();
  });
}

// initialize
loadFromStorage();
setupFilterButtons();
setupImportExportButtons();
renderPrompts();
