document.addEventListener('DOMContentLoaded', loadUserProfile);

async function loadUserProfile() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/auth/profile', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Ошибка загрузки профиля');
        }

        const user = await response.json();
        displayUserInfo(user);
        displayBorrowedBooks(user.borrowedBooks);
    } catch (error) {
        console.error('Ошибка:', error);
    }
}

function displayUserInfo(user) {
    document.getElementById('username').textContent = user.username;
    document.getElementById('userRole').textContent = user.isAdmin ? 'Администратор' : 'Читатель';
    document.getElementById('registrationDate').textContent = new Date(user.createdAt).toLocaleDateString();
}

function displayBorrowedBooks(borrowedBooks) {
    const borrowedBooksContainer = document.getElementById('borrowedBooks');
    if (!borrowedBooks || borrowedBooks.length === 0) {
        borrowedBooksContainer.innerHTML = '<p>Нет взятых книг</p>';
        return;
    }

    const booksHTML = borrowedBooks.map(item => {
        if (!item || !item.book) {
            return '';
        }

        const pdfButton = item.book.pdf ? `
            <a href="/api/books/${item.book._id}/pdf" 
               class="download-btn" 
               onclick="event.stopPropagation()" 
               title="Скачать PDF версию"
               download="${item.book.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 12.5l-4-4h2.5V3h3v5.5H14l-4 4zm7-7.5v11H3V5h4v1.5H4.5v8h11v-8H14V5h3z"/>
                </svg>
                Скачать PDF
            </a>
        ` : '';

        return `
            <div class="borrowed-book-card" onclick="goToBookDetails('${item.book._id}')">
                <div class="book-image">
                    <img src="/api/books/${item.book._id}/image" 
                         alt="${item.book.title}" 
                         onerror="this.src='/images/default-book.jpg'">
                    ${item.book.pdf ? `<div class="pdf-badge" title="Доступна электронная версия">PDF</div>` : ''}
                </div>
                <div class="book-info">
                    <h3>${item.book.title}</h3>
                    <p>Автор: ${item.book.author}</p>
                    <p>Взята: ${new Date(item.borrowDate).toLocaleDateString()}</p>
                    <div class="borrowed-book-actions">
                        ${pdfButton}
                        <button onclick="handleReturnBook('${item.book._id}', event)" class="return-btn">
                            Вернуть книгу
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).filter(html => html !== '').join('');

    borrowedBooksContainer.innerHTML = booksHTML;
}

async function handleReturnBook(bookId, event) {
    event.stopPropagation(); // Предотвращаем переход на страницу книги
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/books/${bookId}/return`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            loadUserProfile(); // Перезагружаем профиль
        } else {
            const error = await response.json();
            alert(error.message || 'Ошибка при возврате книги');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        alert('Ошибка при возврате книги');
    }
}

function goToBookDetails(bookId) {
    window.location.href = `/book-details.html?id=${bookId}`;
}
