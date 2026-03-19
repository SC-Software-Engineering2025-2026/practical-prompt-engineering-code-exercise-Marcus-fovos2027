// JavaScript logic for the prompt saving application

// Function to save a prompt to localStorage
function savePrompt() {
    const promptInput = document.getElementById('promptInput');
    const promptTitle = promptInput.value.trim();
    
    if (promptTitle) {
        let prompts = JSON.parse(localStorage.getItem('prompts')) || [];
        prompts.push(promptTitle);
        localStorage.setItem('prompts', JSON.stringify(prompts));
        promptInput.value = '';
        displayPrompts();
    }
}

// Function to retrieve and display saved prompts
function displayPrompts() {
    const promptsContainer = document.getElementById('promptsContainer');
    promptsContainer.innerHTML = '';
    const prompts = JSON.parse(localStorage.getItem('prompts')) || [];
    
    prompts.forEach((prompt, index) => {
        const promptElement = document.createElement('div');
        promptElement.className = 'prompt';
        promptElement.innerHTML = `
            <span>${prompt}</span>
            <button onclick="deletePrompt(${index})">Delete</button>
        `;
        promptsContainer.appendChild(promptElement);
    });
}

// Function to delete a prompt from localStorage
function deletePrompt(index) {
    let prompts = JSON.parse(localStorage.getItem('prompts')) || [];
    prompts.splice(index, 1);
    localStorage.setItem('prompts', JSON.stringify(prompts));
    displayPrompts();
}

// Event listener for the form submission
document.getElementById('promptForm').addEventListener('submit', function(event) {
    event.preventDefault();
    savePrompt();
});

// Initial display of prompts when the page loads
window.onload = displayPrompts;