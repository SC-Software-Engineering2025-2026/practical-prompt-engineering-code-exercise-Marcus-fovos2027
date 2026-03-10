// simple prompt library using localStorage

function getStoredPrompts() {
  const raw = localStorage.getItem("prompts");
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function savePrompts(prompts) {
  localStorage.setItem("prompts", JSON.stringify(prompts));
}

function createCard(prompt, index) {
  const card = document.createElement("div");
  card.className = "card";

  const titleEl = document.createElement("div");
  titleEl.className = "title";
  titleEl.textContent = prompt.title;

  const previewEl = document.createElement("div");
  previewEl.className = "preview";
  const words = prompt.content.trim().split(/\s+/);
  previewEl.textContent =
    words.slice(0, 10).join(" ") + (words.length > 10 ? "..." : "");

  const fullEl = document.createElement("div");
  fullEl.className = "full";
  fullEl.textContent = prompt.content;

  const delBtn = document.createElement("button");
  delBtn.className = "delete-btn";
  delBtn.textContent = "Delete";
  delBtn.addEventListener("click", () => {
    removePrompt(index);
  });

  card.appendChild(titleEl);
  card.appendChild(previewEl);
  card.appendChild(fullEl);
  card.appendChild(delBtn);

  return card;
}

function renderPrompts() {
  const container = document.getElementById("cards-container");
  container.innerHTML = "";
  const prompts = getStoredPrompts();
  prompts.forEach((p, i) => {
    container.appendChild(createCard(p, i));
  });
}

function removePrompt(idx) {
  const prompts = getStoredPrompts();
  prompts.splice(idx, 1);
  savePrompts(prompts);
  renderPrompts();
}

function addPrompt(title, content) {
  const prompts = getStoredPrompts();
  prompts.push({ title, content });
  savePrompts(prompts);
  renderPrompts();
}

window.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("prompt-form");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const title = document.getElementById("title").value.trim();
    const content = document.getElementById("content").value.trim();
    if (title && content) {
      addPrompt(title, content);
      form.reset();
    }
  });

  renderPrompts();
});
