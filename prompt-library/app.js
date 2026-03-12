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
  },
  {
    id: "prompt-2",
    title: "Blog Post Outline",
    content:
      "Create an outline for a blog post about the benefits of exercise.",
    isFavorite: false,
    createdAt: "2024-02-03",
    rating: 4,
  },
  {
    id: "prompt-3",
    title: "Social Media Caption",
    content: "Generate a catchy caption for a social media post about travel.",
    isFavorite: false,
    createdAt: "2024-03-10",
    rating: 5,
  },
];

const STORAGE_KEY = "promptLibraryData";
let currentFilter = "all"; // or 'favorites'

function saveToStorage(arr) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
}

function loadFromStorage() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      prompts = JSON.parse(raw);
    } catch (e) {
      console.warn("failed to parse stored prompts", e);
    }
  } else {
    // nothing in storage yet — write the initial sample set so that
    // subsequent toggles are persisted
    saveToStorage(prompts);
  }
}

function toggleFavorite(promptId) {
  const prompt = prompts.find((p) => p.id === promptId);
  if (!prompt) return;
  prompt.isFavorite = !prompt.isFavorite;
  saveToStorage(prompts);
  renderPrompts();
}

function setRating(promptId, value) {
  const prompt = prompts.find((p) => p.id === promptId);
  if (!prompt) return;
  prompt.rating = value;
  saveToStorage(prompts);
  renderPrompts();
}

function updateStars(container, rating) {
  const stars = container.querySelectorAll('.star');
  stars.forEach((star, idx) => {
    if (idx < rating) {
      star.classList.add('filled');
    } else {
      star.classList.remove('filled');
    }
  });
}

function createRatingElement(prompt) {
  const wrapper = document.createElement('div');
  wrapper.className = 'rating';
  // create five stars
  for (let i = 1; i <= 5; i++) {
    const star = document.createElement('span');
    star.className = 'star';
    star.dataset.value = i;
    star.innerHTML = '\u2605'; // ★
    if (i <= Math.round(prompt.rating || 0)) {
      star.classList.add('filled');
    }
    star.addEventListener('click', () => setRating(prompt.id, i));
    star.addEventListener('mouseover', () => updateStars(wrapper, i));
    star.addEventListener('mouseout', () => updateStars(wrapper, Math.round(prompt.rating || 0)));
    wrapper.appendChild(star);
  }
  return wrapper;
}

function createCard(prompt) {
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

  div.appendChild(icon);
  div.appendChild(title);
  div.appendChild(content);

  // rating
  div.appendChild(createRatingElement(prompt));

  return div;
}

function renderPrompts() {
  const container = document.getElementById("prompt-container");
  container.innerHTML = "";
  let listToRender = prompts;
  if (currentFilter === "favorites") {
    listToRender = prompts.filter((p) => p.isFavorite);
  }
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
renderPrompts();
