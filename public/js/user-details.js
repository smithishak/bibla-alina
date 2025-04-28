document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('id');
    if (!userId) {
        window.location.href = '/users.html';
        return;
    }

    await loadUserDetails(userId);
});

async function loadUserDetails(userId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/auth/users/${userId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error(await response.text());
        }

        const userData = await response.json();
        displayUserDetails(userData);
    } catch (error) {
        console.error('Ошибка:', error);
        document.getElementById('userInfo').innerHTML = `
            <div class="error-message">
                Ошибка при загрузке данных пользователя: ${error.message}
            </div>
        `;
    }
}

function displayUserDetails(user) {
    const userInfo = document.getElementById('userInfo');
    const borrowedBooks = document.getElementById('borrowedBooks');

    userInfo.innerHTML = `
        <h2>Информация о пользователе</h2>
        <div class="info-grid">
            <p><strong>Имя пользователя:</strong> ${user.username}</p>
            <p><strong>ФИО:</strong> ${user.fullName || 'Не указано'}</p>
            <p><strong>Класс:</strong> ${user.class || 'Не указан'}</p>
            <p><strong>Всего взято книг:</strong> ${user.borrowedBooks?.length || 0}</p>
        </div>
    `;

    if (user.borrowedBooks && user.borrowedBooks.length > 0) {
        const validBooks = user.borrowedBooks.filter(item => item && item.book);
        
        if (validBooks.length > 0) {
            borrowedBooks.innerHTML = `
                <h2>Взятые книги</h2>
                <div class="borrowed-books-grid">
                    ${validBooks.map(item => `
                        <div class="borrowed-book-card">
                            <div class="book-image">
                                <img src="/api/books/${item.book._id}/image" 
                                     alt="${item.book.title}"
                                     onerror="this.src='/images/default-book.jpg'">
                            </div>
                            <div class="book-info">
                                <h3>${item.book.title}</h3>
                                <p>Автор: ${item.book.author}</p>
                                <p>Взята: ${new Date(item.borrowDate).toLocaleDateString()}</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        } else {
            borrowedBooks.innerHTML = '<p>Нет активных книг на руках</p>';
        }
    } else {
        borrowedBooks.innerHTML = '<p>У пользователя нет взятых книг</p>';
    }
}
