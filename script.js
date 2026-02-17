const API_URL = 'http://localhost:8080/api';
let token = localStorage.getItem('chat_token');
let pollInterval;

// DOM Elements
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const messageForm = document.getElementById('message-form');
const messagesList = document.getElementById('messages-list');
const authError = document.getElementById('auth-error');
const chatError = document.getElementById('chat-error');

// Navigation Logic
if (document.getElementById('show-register')) {
    document.getElementById('show-register').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('login-section').classList.add('hidden');
        document.getElementById('register-section').classList.remove('hidden');
        if (authError) authError.textContent = '';
    });
}

if (document.getElementById('show-login')) {
    document.getElementById('show-login').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('register-section').classList.add('hidden');
        document.getElementById('login-section').classList.remove('hidden');
        if (authError) authError.textContent = '';
    });
}

// Authentication
async function handleAuth(endpoint, data) {
    try {
        const response = await fetch(`${API_URL}/auth/${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (!response.ok) throw new Error('Authentication failed');

        token = result.token;
        const name = result.name;
        localStorage.setItem('chat_token', token);
        localStorage.setItem('chat_user_name', name);

        // Redirect to Chat Page
        window.location.href = 'index.html';

    } catch (err) {
        if (authError) authError.textContent = err.message || 'An error occurred';
    }
}

if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        handleAuth('login', { email, password });
    });
}

if (registerForm) {
    registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('reg-name').value;
        const email = document.getElementById('reg-email').value;
        const password = document.getElementById('reg-password').value;
        handleAuth('register', { name, email, password });
    });
}

// Chat Logic
async function fetchMessages() {
    if (!token) return;
    try {
        const response = await fetch(`${API_URL}/messages`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.status === 403) {
            // Token invalid/expired
            localStorage.removeItem('chat_token');
            localStorage.removeItem('chat_user_name');
            token = null;
            window.location.href = 'login.html';
            return;
        }

        const messages = await response.json();
        renderMessages(messages);
    } catch (err) {
        console.error('Failed to fetch messages', err);
    }
}

function renderMessages(messages) {
    if (!messagesList) return;

    // Check if we are scrolled to bottom
    const isScrolledToBottom = messagesList.scrollHeight - messagesList.clientHeight <= messagesList.scrollTop + 1;

    messagesList.innerHTML = messages.map(msg => `
        <div class="message">
            <div class="sender">${escapeHtml(msg.sender || 'Unknown')}</div>
            <div class="content">${escapeHtml(msg.content)}</div>
            <div class="time">${new Date(msg.timestamp).toLocaleTimeString()}</div>
        </div>
    `).join('');

    // Auto scroll to bottom if already at bottom or first load
    if (isScrolledToBottom || messagesList.scrollTop === 0) {
        messagesList.scrollTop = messagesList.scrollHeight;
    }
}

if (messageForm) {
    messageForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = document.getElementById('message-input');
        const content = input.value;

        try {
            await fetch(`${API_URL}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    sender: localStorage.getItem('chat_user_name') || 'Unknown',
                    content: content
                })
            });
            input.value = '';
            fetchMessages(); // Immediate update
        } catch (err) {
            if (chatError) chatError.textContent = 'Failed to send message';
        }
    });
}

function startPolling() {
    fetchMessages(); // Initial fetch
    if (!pollInterval) {
        pollInterval = setInterval(fetchMessages, 3000);
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initialize Page
function initPage() {
    // Shared Logic
    const token = localStorage.getItem('chat_token');

    // Check if we are on the Chat Page (index.html)
    if (document.getElementById('messages-list')) {
        if (!token) {
            window.location.href = 'login.html';
            return;
        }

        // Display User Info
        const userDisplay = document.getElementById('user-display');
        if (userDisplay) {
            const name = localStorage.getItem('chat_user_name') || 'User';
            userDisplay.textContent = `${name}`;
        }

        // Setup Logout
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                localStorage.removeItem('chat_token');
                localStorage.removeItem('chat_user_name');
                window.location.href = 'login.html';
            });
        }

        // Start Polling
        startPolling();
    }
}

// Run Initialization
initPage();
