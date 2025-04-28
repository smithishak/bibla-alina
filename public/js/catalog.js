let currentPage = 1;
let totalPages = 1;

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadBooks();
    loadFilters();

    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });
});

async function loadFilters() {
    try {
        const response = await fetch('/api/books');
        const data = await response.json();
        const books = data.books;

        // Заполняем фильтр жанров
        const genres = [...new Set(books.map(book => book.genre).filter(Boolean))];
        const genreSelect = document.getElementById('genreFilter');
        genres.forEach(genre => {
            const option = document.createElement('option');
            option.value = genre;
            option.textContent = genre;
            genreSelect.appendChild(option);
        });

        // Заполняем фильтр годов
        const years = [...new Set(books.map(book => book.year).filter(Boolean))].sort();
        const yearSelect = document.getElementById('yearFilter');
        years.forEach(year => {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            yearSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Ошибка при загрузке фильтров:', error);
    }
}

function getFilterParams() {
    const searchQuery = document.getElementById('searchInput').value;
    const genre = document.getElementById('genreFilter').value;
    const year = document.getElementById('yearFilter').value;
    const available = document.getElementById('availabilityFilter').value;

    const params = new URLSearchParams();
    if (searchQuery) params.append('search', searchQuery);
    if (genre) params.append('genre', genre);
    if (year) params.append('year', year);
    if (available) params.append('available', available);
    params.append('page', currentPage);

    return params;
}

async function handleSearch() {
    currentPage = 1;
    await loadBooks(1);
}

async function loadBooks(page = 1) {
    try {
        currentPage = page;
        const token = localStorage.getItem('token');
        const searchQuery = document.getElementById('searchInput')?.value || '';
        const params = getFilterParams();
        const response = await fetch(`/api/books?page=${page}&search=${encodeURIComponent(searchQuery)}&${params}`, {
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
    booksListDiv.innerHTML = '';

    books.forEach(book => {
        const bookElement = document.createElement('div');
        bookElement.className = 'catalog-item';
        bookElement.innerHTML = `
            <div class="book-image">
                <img src="${book.image || '/images/default-book.jpg'}" alt="${book.title}">
            </div>
            <div class="book-info">
                <h3 title="${book.title}">${book.title}</h3>
                <p title="Автор: ${book.author}">Автор: ${book.author}</p>
                <p title="Год: ${book.year || 'Не указан'}">Год: ${book.year || 'Не указан'}</p>
                <p title="Жанр: ${book.genre || 'Не указан'}">Жанр: ${book.genre || 'Не указан'}</p>
            </div>
            <div class="book-actions-bottom">
                <span class="status ${book.available ? 'available' : 'unavailable'}">
                    ${book.available ? 'Доступна' : 'Занята'}
                </span>
                <button class="borrow-btn" 
                        onclick="handleBorrowBook('${book._id}')"
                        ${!book.available ? 'disabled' : ''}>
                    ${book.available ? 'Взять' : 'Недоступна'}
                </button>
            </div>
        `;
        booksListDiv.appendChild(bookElement);
    });
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

        const data = await response.json();
        
        if (response.ok) {
            await loadBooks(currentPage);
            alert('Книга успешно взята');
        } else {
            alert(data.message || 'Ошибка при получении книги');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        alert('Ошибка при попытке взять книгу');
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
        if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
            paginationHtml += `
                <button onclick="handlePageChange(${i})" 
                    class="${currentPage === i ? 'active' : ''}">${i}</button>
            `;
        } else if (i === currentPage - 3 || i === currentPage + 3) {
            paginationHtml += '<button disabled>...</button>';
        }
    }

    paginationHtml += `
        <button onclick="handlePageChange(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>></button>
        <button onclick="handlePageChange(${totalPages})" ${currentPage === totalPages ? 'disabled' : ''}>></button>
    `;

    paginationDiv.innerHTML = paginationHtml;
}

async function handlePageChange(page) {
    if (page < 1 || page > totalPages) return;
    await loadBooks(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
