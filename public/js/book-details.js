document.addEventListener('DOMContentLoaded', async () => {
    checkAuth();
    const urlParams = new URLSearchParams(window.location.search);
    const bookId = urlParams.get('id');
    if (!bookId) {
        window.location.href = '/';
        return;
    }
    await loadBookDetails(bookId);
});

async function loadBookDetails(bookId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/books/${bookId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Книга не найдена');
        }

        const book = await response.json();
        displayBookDetails(book);
    } catch (error) {
        console.error('Ошибка:', error);
        document.getElementById('bookDetails').innerHTML = `
            <div class="error-message">Ошибка при загрузке данных книги</div>
        `;
    }
}

async function handleBorrowBook(bookId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/books/${bookId}/borrow`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            alert('Книга успешно взята');
            loadBookDetails(bookId);
        } else {
            const error = await response.json();
            alert(error.message || 'Ошибка при взятии книги');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        alert('Ошибка при взятии книги');
    }
}

async function handleDeleteBook(id) {
    if (!confirm('Вы уверены, что хотите удалить эту книгу?')) {
        return;
    }

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/books/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            alert('Книга успешно удалена');
            window.location.href = '/';
        } else {
            const error = await response.json();
            alert(error.message || 'Ошибка при удалении книги');
        }
    } catch (error) {
        console.error('Ошибка при удалении книги:', error);
        alert('Ошибка при удалении книги');
    }
}

function displayBookDetails(book) {
    const isAdmin = localStorage.getItem('isAdmin') === 'true';
    const token = localStorage.getItem('token');
    const bookDetailsDiv = document.getElementById('bookDetails');

    bookDetailsDiv.innerHTML = `
        <div class="book-detail-header">
            <div class="book-detail-image">
                <img src="/api/books/${book._id}/image" alt="${book.title}" onerror="this.src='/images/default-book.jpg'">
            </div>
            <div class="book-detail-info">
                <h1>${book.title}</h1>
                <p class="author">Автор: ${book.author}</p>
                <p>Год издания: ${book.year || 'Не указан'}</p>
                <p>Жанр: ${book.genre || 'Не указан'}</p>
                <div class="book-status">
                    <p class="status ${book.available ? 'available' : 'unavailable'}">
                        ${book.available ? `Доступно: ${book.availableQuantity}/${book.quantity}` : 'Нет в наличии'}
                    </p>
                </div>

                <div class="book-actions">
                    ${book.pdfPath ? `
                        <a href="javascript:void(0)" 
                           onclick="downloadPDF('${book._id}', '${book.title}')"
                           class="download-btn">
                            <svg viewBox="0 0 24 24" width="24" height="24">
                                <path fill="currentColor" d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
                            </svg>
                            Скачать PDF
                        </a>
                    ` : ''}

                    ${!isAdmin && book.available && book.availableQuantity > 0 ? `
                        <button onclick="handleBorrowBook('${book._id}')" class="borrow-btn">
                            Взять книгу
                        </button>
                    ` : ''}

                    ${isAdmin ? `
                        <button onclick="handleDeleteBook('${book._id}')" class="delete-btn">
                            Удалить книгу
                        </button>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
}

async function downloadPDF(bookId, title) {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`/api/books/${bookId}/pdf`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            // Создаем blob из полученных данных
            const blob = await response.blob();
            // Создаем временную ссылку для скачивания
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
            document.body.appendChild(a);
            a.click();
            // Очищаем
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } else {
            alert('Ошибка при скачивании файла');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        alert('Ошибка при скачивании файла');
    }
}
