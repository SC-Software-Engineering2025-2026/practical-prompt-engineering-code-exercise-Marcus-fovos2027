// filepath: /Users/marcusfovos/version_control/practical-prompt-engineering-code-exercise-Marcus-fovos2027/script.js
const STORAGE_KEY = "promptLibrary.prompts";

const $ = (sel) => document.querySelector(sel);
const saveBtn = $("#saveBtn");
const clearBtn = $("#clearBtn");
const titleInput = $("#title");
const promptInput = $("#prompt");
const promptsList = $("#promptsList");
const emptyMsg = $("#empty");

function loadPrompts() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}
function persist(prompts) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prompts));
}

function render() {
  const prompts = loadPrompts();
  promptsList.innerHTML = "";
  emptyMsg.style.display = prompts.length ? "none" : "block";

  [...prompts].reverse().forEach((p) => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <div class="meta">
        <h3>${escapeHtml(p.title)}</h3>
        <p class="preview">${escapeHtml(truncate(p.prompt, 280))}</p>
      </div>
      <div class="controls">
        <button class="small-btn copy" data-id="${p.id}">Copy</button>
        <button class="small-btn del" data-id="${p.id}">Delete</button>
      </div>
    `;
    promptsList.appendChild(card);
  });
}

function truncate(s, n) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}
function escapeHtml(s) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function addPrompt(title, prompt) {
  const list = loadPrompts();
  list.push({
    id: Date.now().toString(),
    title,
    prompt,
    created: new Date().toISOString(),
  });
  persist(list);
  render();
}

function deletePrompt(id) {
  let list = loadPrompts();
  list = list.filter((p) => p.id !== id);
  persist(list);
  render();
}

function copyPromptText(id) {
  const list = loadPrompts();
  const p = list.find((x) => x.id === id);
  if (!p) return;
  navigator.clipboard?.writeText(p.prompt).catch(() => {});
}

document.addEventListener("click", (e) => {
  const del = e.target.closest(".del");
  const copy = e.target.closest(".copy");
  if (del) {
    const id = del.dataset.id;
    if (confirm("Delete this prompt?")) deletePrompt(id);
  } else if (copy) {
    copyPromptText(copy.dataset.id);
  }
});

saveBtn.addEventListener("click", () => {
  const title = titleInput.value.trim();
  const prompt = promptInput.value.trim();
  if (!title || !prompt) {
    alert("Please enter both a title and a prompt.");
    return;
  }
  addPrompt(title, prompt);
  titleInput.value = "";
  promptInput.value = "";
  titleInput.focus();
});

clearBtn.addEventListener("click", () => {
  titleInput.value = "";
  promptInput.value = "";
  titleInput.focus();
});

document.addEventListener("DOMContentLoaded", render);
