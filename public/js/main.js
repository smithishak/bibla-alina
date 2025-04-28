let currentPage = 1;
let totalPages = 1;

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const isAdmin = localStorage.getItem('isAdmin') === 'true';
        await checkAuth(); // Проверяем авторизацию перед загрузкой контента
        
        // Проверяем существование элементов перед их использованием
        const searchForm = document.getElementById('searchForm');
        if (searchForm) {
            searchForm.addEventListener('submit', handleSearch);
        }

        const addBookForm = document.getElementById('addBookForm');
        if (addBookForm) {
            addBookForm.addEventListener('submit', handleAddBook);
        }

        // Загружаем книги после проверки авторизации
        await loadBooks();
    } catch (error) {
        console.error('Ошибка инициализации:', error);
    }
});

async function loadBooks(page = 1) {
    try {
        const token = localStorage.getItem('token');
        const searchQuery = document.getElementById('searchInput')?.value || '';
        const response = await fetch(`/api/books?page=${page}&search=${encodeURIComponent(searchQuery)}`, {
            headers: {
                'Authorization': token ? `Bearer ${token}` : '',
            }
        });
        const data = await response.json();
        displayBooks(data.books);
        updatePagination(data.currentPage, data.totalPages);
        currentPage = data.currentPage;
        totalPages = data.totalPages;
    } catch (error) {
        console.error('Ошибка при загрузке книг:', error);
    }
}

function displayBooks(books) {
    const booksListDiv = document.getElementById('booksList');
    const isAdmin = localStorage.getItem('isAdmin') === 'true';
    booksListDiv.innerHTML = '';
    
    books.forEach(book => {
        const bookElement = document.createElement('div');
        bookElement.className = 'catalog-item';
        bookElement.onclick = () => window.location.href = `/book-details.html?id=${book._id}`;
        
        const imageUrl = book.image && book.image.data ? 
            `/api/books/${book._id}/image?${Date.now()}` : 
            '/images/default-book.jpg';

        bookElement.innerHTML = `
            <div class="book-image">
                <img src="${imageUrl}" 
                     alt="${book.title}"
                     onerror="this.src='/images/default-book.jpg'"
                     loading="lazy">
                ${book.pdf ? `<div class="pdf-badge" title="Доступна электронная версия">PDF</div>` : ''}
            </div>
            <div class="book-info">
                <h3 title="${book.title}">${book.title}</h3>
                <p title="Автор: ${book.author}">Автор: ${book.author}</p>
                <p title="Год: ${book.year || 'Не указан'}">Год: ${book.year || 'Не указан'}</p>
                <p title="Жанр: ${book.genre || 'Не указан'}">Жанр: ${book.genre || 'Не указан'}</p>
            </div>
        `;

        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'book-actions-bottom';
        actionsDiv.onclick = (e) => e.stopPropagation();

        // Показываем разные действия в зависимости от роли пользователя
        if (isAdmin) {
            actionsDiv.innerHTML = `
                <div class="status-container">
                    <span class="status ${book.available ? 'available' : 'unavailable'}">
                        ${book.available ? `Доступно: ${book.availableQuantity}/${book.quantity}` : 'Нет в наличии'}
                    </span>
                    ${book.pdf ? `
                        <a href="/api/books/${book._id}/pdf" target="_blank" class="pdf-button" title="Открыть PDF версию">
                            <svg width="16" height="16" viewBox="0 0 16 16">
                                <path fill="currentColor" d="M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5L14 4.5z"/>
                            </svg>
                        </a>
                    ` : ''}
                </div>
                <div class="action-buttons">
                    <button onclick="handleDeleteBook('${book._id}')" class="delete-btn">Удалить</button>
                    <button onclick="handleToggleAvailability('${book._id}', ${!book.available})" class="toggle-btn">
                        ${book.available ? 'Отметить как взятую' : 'Отметить как доступную'}
                    </button>
                </div>
            `;
        } else {
            actionsDiv.innerHTML = `
                <div class="status-container">
                    <span class="status ${book.available ? 'available' : 'unavailable'}">
                        ${book.available ? `Доступно: ${book.availableQuantity}` : 'Нет в наличии'}
                    </span>
                    ${book.pdf ? `
                        <a href="/api/books/${book._id}/pdf" target="_blank" class="pdf-button" title="Открыть PDF версию">
                            <svg width="16" height="16" viewBox="0 0 16 16">
                                <path fill="currentColor" d="M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5L14 4.5z"/>
                            </svg>
                        </a>
                    ` : ''}
                </div>
                ${book.available && book.availableQuantity > 0 ? `
                    <div class="action-buttons">
                        <button onclick="handleBorrowBook('${book._id}')" class="borrow-btn">Взять книгу</button>
                    </div>
                ` : ''}
            `;
        }
        
        bookElement.appendChild(actionsDiv);
        booksListDiv.appendChild(bookElement);
    });
}

async function handleBorrowBook(id) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/books/${id}/borrow`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            alert('Книга успешно взята');
            loadBooks();
        } else {
            const error = await response.json();
            alert(error.message || 'Ошибка при взятии книги');
        }
    } catch (error) {
        console.error('Ошибка при взятии книги:', error);
        alert('Ошибка при взятии книги');
    }
}

function updatePagination(currentPage, totalPages) {
    const paginationDiv = document.getElementById('pagination');
    if (!paginationDiv) return;

    let paginationHtml = `
        <button onclick="handlePageChange(1)" ${currentPage === 1 ? 'disabled' : ''}><<</button>
        <button onclick="handlePageChange(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}><</button>
    `;

    for (let i = 1; i <= totalPages; i++) {
        if (
            i === 1 || 
            i === totalPages || 
            (i >= currentPage - 2 && i <= currentPage + 2)
        ) {
            paginationHtml += `
                <button onclick="handlePageChange(${i})" 
                    class="${currentPage === i ? 'active' : ''}">${i}</button>
            `;
        } else if (
            i === currentPage - 3 || 
            i === currentPage + 3
        ) {
            paginationHtml += '<button disabled>...</button>';
        }
    }

    paginationHtml += `
        <button onclick="handlePageChange(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>></button>
        <button onclick="handlePageChange(${totalPages})" ${currentPage === totalPages ? 'disabled' : ''}}>>></button>
    `;

    paginationDiv.innerHTML = paginationHtml;
}

async function handlePageChange(page) {
    if (page < 1 || page > totalPages) return;
    await loadBooks(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function handleAddBook(event) {
    event.preventDefault();
    const token = localStorage.getItem('token');

    const formData = new FormData();
    formData.append('title', document.getElementById('title').value);
    formData.append('author', document.getElementById('author').value);
    formData.append('year', document.getElementById('year').value);
    formData.append('genre', document.getElementById('genre').value);
    formData.append('quantity', document.getElementById('quantity').value);
    
    const imageFile = document.getElementById('image').files[0];
    if (imageFile) {
        formData.append('image', imageFile);
    }

    try {
        const response = await fetch('/api/books', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        if (response.ok) {
            event.target.reset();
            loadBooks();
        } else {
            const error = await response.json();
            alert(error.message || 'Ошибка при добавлении книги');
        }
    } catch (error) {
        console.error('Ошибка при добавлении книги:', error);
    }
}

async function handleDeleteBook(id) {
    if (!confirm('Вы уверены, что хотите удалить эту книгу?')) return;

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
            loadBooks();
        } else {
            const error = await response.json();
            alert(error.message || 'Ошибка при удалении книги');
        }
    } catch (error) {
        console.error('Ошибка при удалении книги:', error);
        alert('Ошибка при удалении книги');
    }
}

async function handleToggleAvailability(id, available) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/books/${id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ available })
        });

        if (response.ok) {
            loadBooks();
        }
    } catch (error) {
        console.error('Ошибка при обновлении статуса книги:', error);
    }
}

async function handleSearch() {
    currentPage = 1; // Сброс на первую страницу при поиске
    await loadBooks(1);
}
