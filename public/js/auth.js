let currentUser = null;

async function handleLogin(event) {
    event.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    if (!username || !password) {
        showError('Пожалуйста, заполните все поля');
        return;
    }

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('isAdmin', data.isAdmin);
            // Редирект в зависимости от роли
            window.location.replace(data.isAdmin ? '/' : '/catalog.html');
        } else {
            showError(data.message || 'Ошибка авторизации');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showError('Ошибка соединения с сервером');
    }
}

function showError(message) {
    const loginError = document.getElementById('loginError');
    loginError.textContent = message;
    loginError.style.display = 'block';
}

function hideError() {
    const loginError = document.getElementById('loginError');
    loginError.style.display = 'none';
}

function updateUI() {
    const loginForm = document.getElementById('loginForm');
    const userInfo = document.getElementById('userInfo');
    const mainContent = document.getElementById('mainContent');
    const userRole = document.getElementById('userRole');
    const adminElements = document.querySelectorAll('.admin-only');

    if (currentUser) {
        loginForm.style.display = 'none';
        userInfo.style.display = 'block';
        mainContent.style.display = 'block';
        userRole.textContent = `Роль: ${currentUser.isAdmin ? 'Администратор' : 'Студент'}`;

        // Показываем/скрываем элементы для админа
        adminElements.forEach(element => {
            element.style.display = currentUser.isAdmin ? 'block' : 'none';
        });

        // Особая обработка для навигационных ссылок
        const adminNavLinks = document.querySelectorAll('.nav-link.admin-only');
        adminNavLinks.forEach(link => {
            link.style.display = currentUser.isAdmin ? 'inline-block' : 'none';
        });

        const bookForm = document.querySelector('.book-form');
        if (bookForm) {
            bookForm.style.display = currentUser.isAdmin ? 'block' : 'none';
        }
    } else {
        loginForm.style.display = 'block';
        userInfo.style.display = 'none';
        mainContent.style.display = 'none';
    }
}

// Инициализация на странице логина
if (document.getElementById('loginForm')) {
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
}

// Выход
function handleLogout() {
    // Очищаем данные авторизации
    localStorage.removeItem('token');
    localStorage.removeItem('isAdmin');
    currentUser = null;

    // Принудительный редирект на страницу входа
    window.location.replace('/login.html');
}

// Проверка авторизации
async function checkAuth() {
    if (window.location.pathname === '/login.html') {
        return true;
    }

    const token = localStorage.getItem('token');
    if (!token) {
        window.location.replace('/login.html');
        return false;
    }

    try {
        const response = await fetch('/api/auth/profile', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            updateNavigation(); // Add this line to update navigation after successful auth check
            return true;
        }

        localStorage.removeItem('token');
        localStorage.removeItem('isAdmin');
        window.location.replace('/login.html');
        return false;
    } catch (error) {
        console.error('Ошибка проверки авторизации:', error);
        return false;
    }
}

function updateNavigation() {
    const isAdmin = localStorage.getItem('isAdmin') === 'true';
    
    // Update admin elements visibility
    document.querySelectorAll('.admin-only').forEach(element => {
        element.style.display = isAdmin ? 'block' : 'none';
    });

    // Set user role text
    const roleText = isAdmin ? 'Администратор' : 'Студент';
    const userRoleElement = document.getElementById('userRole');
    const userRoleMobileElement = document.getElementById('userRoleMobile');
    
    if (userRoleElement) userRoleElement.textContent = roleText;
    if (userRoleMobileElement) userRoleMobileElement.textContent = roleText;
}

// Обновляем обработчик загрузки страницы
document.addEventListener('DOMContentLoaded', () => {
    // Проверяем авторизацию
    if (!checkAuth()) return;

    const isAdmin = localStorage.getItem('isAdmin') === 'true';
    const adminElements = document.querySelectorAll('.admin-only');
    adminElements.forEach(element => {
        element.style.display = isAdmin ? 'block' : 'none';
    });

    const adminNavLinks = document.querySelectorAll('.nav-link.admin-only');
    adminNavLinks.forEach(link => {
        link.style.display = isAdmin ? 'inline-block' : 'none';
    });
});
