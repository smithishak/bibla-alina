document.addEventListener('DOMContentLoaded', () => {
    loadUsers();

    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });

    document.getElementById('addUserForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = {
            fullName: document.getElementById('fullName').value,
            class: document.getElementById('class').value,
            username: document.getElementById('username').value,
            password: document.getElementById('password').value
        };

        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (response.ok) {
                document.getElementById('addUserForm').reset();
                loadUsers(); // Перезагружаем список пользователей
                alert('Пользователь успешно создан');
            } else {
                alert(data.message || 'Ошибка при создании пользователя');
            }
        } catch (error) {
            console.error('Ошибка:', error);
            alert('Ошибка сервера при создании пользователя');
        }
    });
});

async function loadUsers(searchQuery = '') {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/auth/users?search=${encodeURIComponent(searchQuery)}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const users = await response.json();
            displayUsers(users);
        }
    } catch (error) {
        console.error('Ошибка при загрузке пользователей:', error);
    }
}

function displayUsers(users) {
    const usersListDiv = document.getElementById('usersList');
    usersListDiv.innerHTML = users.map(user => `
        <div class="user-card">
            <div class="user-info">
                <h3>${user.username}</h3>
                <p>Полное имя: ${user.fullName || 'Не указано'}</p>
                <p>Класс: ${user.class}</p>
                <p>Взято книг: ${user.borrowedBooks?.length || 0}</p>
            </div>
            <div class="user-actions">
                ${!user.isAdmin ? `
                    <button onclick="window.location.href='/user-details.html?id=${user._id}'" class="view-btn">
                        Просмотр книг
                    </button>
                    <button onclick="handleDeleteUser('${user._id}')" class="delete-btn">
                        Удалить пользователя
                    </button>
                ` : ''}
            </div>
        </div>
    `).join('');
}

async function handleDeleteUser(userId) {
    if (!confirm('Вы уверены, что хотите удалить этого пользователя?')) {
        return;
    }

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/auth/users/${userId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            loadUsers();
        } else {
            const error = await response.json();
            alert(error.message || 'Ошибка при удалении пользователя');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        alert('Ошибка при удалении пользователя');
    }
}

function handleSearch() {
    const searchQuery = document.getElementById('searchInput').value;
    loadUsers(searchQuery);
}
