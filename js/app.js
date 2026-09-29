document.addEventListener("DOMContentLoaded", () => {
    // 1. AUTH & USERNAV
    const userName = localStorage.getItem("user_name");
    
    // Jika belum login, redirect paksa ke login.html
    if (!userName) {
        window.location.href = "login.html";
        return;
    }

    // Tampilkan nama user di navbar
    document.getElementById("user-display-name").textContent = userName;

    // Event Logout
    document.getElementById("btn-logout").addEventListener("click", () => {
        localStorage.removeItem("user_name");
        window.location.href = "login.html";
    });

    // --- STATE APLIKASI ---
    let allProducts = [];
    let filteredProducts = [];
    let displayedCount = 0;
    const BATCH_SIZE = 8; // Jumlah produk per batch (Load More)
    let cart = JSON.parse(localStorage.getItem("cart_items")) || [];

    // DOM ELEMENTS
    const productGrid = document.getElementById("product-grid");
    const categoryFilter = document.getElementById("category-filter");
    const sortFilter = document.getElementById("sort-filter");
    const searchInput = document.getElementById("search-input");
    const btnLoadMore = document.getElementById("btn-load-more");
    const countInfo = document.getElementById("product-count-info");
    const globalError = document.getElementById("global-error");
    const globalLoading = document.getElementById("global-loading");
    const cartBadge = document.getElementById("cart-badge");
    
    // Modal Elements
    const productModal = document.getElementById("product-modal");
    const modalBody = document.getElementById("modal-body");
    const modalClose = document.getElementById("modal-close");

    // Cart Modal Elements
    const btnCart = document.getElementById("btn-cart");
    const cartModal = document.getElementById("cart-modal");
    const cartModalClose = document.getElementById("cart-modal-close");
    const cartItemsContainer = document.getElementById("cart-items-container");
    const cartTotalPrice = document.getElementById("cart-total-price");

    // Inisialisasi Badge Keranjang
    updateCartBadge();

    // 2. FETCH DATA DARI API
    async function fetchProducts() {
    showLoading(true);
    try {
        let fetchedProducts = [];
        let skip = 0;
        let total = Infinity;

        while (fetchedProducts.length < total) {
            const response = await fetch(`https://dummyjson.com/products?limit=30&skip=${skip}`);
            if (!response.ok) throw new Error("Gagal mengambil data produk.");

            const data = await response.json();
            fetchedProducts = fetchedProducts.concat(data.products);
            total = data.total;
            skip += data.products.length;

            if (data.products.length === 0) break;
        }

        allProducts = fetchedProducts;
        filteredProducts = [...allProducts];

        populateCategories(allProducts);
        applyFiltersAndSort();
    } catch (error) {
        showError("Terjadi kesalahan saat memuat katalog: " + error.message);
    } finally {
        showLoading(false);
    }
}

    // 3. RENDER KATEGORI DINAMIS
    function populateCategories(products) {
        // Ambil kategori unik menggunakan FP / Set
        const categories = [...new Set(products.map(p => p.category))];
        categories.sort().forEach(category => {
            const option = document.createElement("option");
            option.value = category;
            option.textContent = category.charAt(0).toUpperCase() + category.slice(1);
            categoryFilter.appendChild(option);
        });
    }

    // 4. CARD GRID
    function renderProducts(isLoadMore = false) {
        if (!isLoadMore) {
            productGrid.innerHTML = "";
            displayedCount = 0;
        }

        const nextBatch = filteredProducts.slice(displayedCount, displayedCount + BATCH_SIZE);
        
        if (filteredProducts.length === 0) {
            productGrid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: #64748b;">Produk tidak ditemukan.</p>`;
            btnLoadMore.style.display = "none";
            countInfo.textContent = "0 dari 0 produk";
            return;
        }

        nextBatch.forEach(product => {
            const card = document.createElement("div");
            card.className = "product-card";
            card.dataset.id = product.id; // Untuk Event Delegation

            const discount = Math.round(product.discountPercentage);

            card.innerHTML = `
                ${discount ? `<span class="discount-badge">-${discount}%</span>` : ''}
                <img src="${product.thumbnail}" alt="${product.title}" loading="lazy">
                <div class="product-info">
                    <span class="product-category">${product.category}</span>
                    <h4 class="product-title">${product.title}</h4>
                    <div class="product-meta">
                        <span class="product-price">$${product.price}</span>
                        <span class="product-rating">★ ${product.rating}</span>
                    </div>
                    <button class="btn-add-cart" data-action="add-cart" data-id="${product.id}">Tambah ke Keranjang</button>
                </div>
            `;
            productGrid.appendChild(card);
        });

        displayedCount += nextBatch.length;
        countInfo.textContent = `Menampilkan ${displayedCount} dari ${filteredProducts.length} produk`;

        // Atur tombol Load More
        if (displayedCount < filteredProducts.length) {
            btnLoadMore.style.display = "inline-block";
        } else {
            btnLoadMore.style.display = "none";
        }
    }

    // 5. FILTER & SORTING 
    function applyFiltersAndSort() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        const selectedCategory = categoryFilter.value;
        const selectedSort = sortFilter.value;

        // Filter Produk
        filteredProducts = allProducts.filter(product => {
            const matchCategory = !selectedCategory || product.category === selectedCategory;
            const matchSearch = !searchTerm || 
                product.title.toLowerCase().includes(searchTerm) || 
                product.category.toLowerCase().includes(searchTerm);
            return matchCategory && matchSearch;
        });

        // Sorting Produk
        if (selectedSort === "price-asc") {
            filteredProducts.sort((a, b) => a.price - b.price);
        } else if (selectedSort === "price-desc") {
            filteredProducts.sort((a, b) => b.price - a.price);
        } else if (selectedSort === "rating-desc") {
            filteredProducts.sort((a, b) => b.rating - a.rating);
        }

        renderProducts(false);
    }

    // 6. DEBOUNCE SEARCH (CLOSURES)
    function debounce(func, delay = 400) {
        let timeoutId;
        return function (...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                func.apply(this, args);
            }, delay);
        };
    }

    const handleSearch = debounce(() => {
        applyFiltersAndSort();
    }, 400);

    // Event Control Listeners
    searchInput.addEventListener("input", handleSearch);
    categoryFilter.addEventListener("change", applyFiltersAndSort);
    sortFilter.addEventListener("change", applyFiltersAndSort);
    btnLoadMore.addEventListener("click", () => renderProducts(true));

    // 7. EVENT DELEGATION UNTUK KARTU & MODAL
    productGrid.addEventListener("click", (event) => {
        const target = event.target;

        // Jika tombol "Tambah ke Keranjang" diklik
        if (target.dataset.action === "add-cart") {
            event.stopPropagation();
            const productId = parseInt(target.dataset.id);
            addToCart(productId);
            return;
        }

        // Jika area kartu produk diklik -> Buka Modal Detail
        const card = target.closest(".product-card");
        if (card) {
            const productId = parseInt(card.dataset.id);
            openModal(productId);
        }
    });

    // 8. KERANJANG BELANJA 
    function showToast(message, duration = 2500) {
      const toast = document.getElementById("toast");
      toast.textContent = message;
      toast.classList.remove("hidden");
      toast.classList.add("show");
      
      clearTimeout(showToast._timer);
      showToast._timer = setTimeout(() => {
      toast.classList.remove("show");
      }, duration);
    }
    
    function addToCart(productId) {
        const product = allProducts.find(p => p.id === productId);
        if (!product) return;

        const existingItem = cart.find(item => item.id === productId);
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            cart.push({ ...product, quantity: 1 });
        }

        localStorage.setItem("cart_items", JSON.stringify(cart));
        updateCartBadge();
        showToast(`"${product.title}" berhasil ditambahkan ke keranjang!`);
    }

    function updateCartBadge() {
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        cartBadge.textContent = totalItems;
    }

    // Buka & Tutup Modal Keranjang
    btnCart.addEventListener("click", () => {
        renderCartItems();
        cartModal.style.display = "flex";
    });

    cartModalClose.addEventListener("click", () => cartModal.style.display = "none");
    cartModal.addEventListener("click", (e) => {
        if (e.target === cartModal) cartModal.style.display = "none";
    });

    // Render isi item di dalam Modal Keranjang
    function renderCartItems() {
        if (cart.length === 0) {
            cartItemsContainer.innerHTML = `<p style="text-align:center; color:#64748b; padding:20px;">Keranjang belanjaanmu kosong.</p>`;
            cartTotalPrice.textContent = "$0.00";
            return;
        }

        cartItemsContainer.innerHTML = "";
        let totalSum = 0;

        cart.forEach(item => {
            const itemTotal = item.price * item.quantity;
            totalSum += itemTotal;

            const div = document.createElement("div");
            div.className = "cart-item";
            div.innerHTML = `
                <div class="cart-item-info">
                    <img src="${item.thumbnail}" alt="${item.title}">
                    <div>
                        <div class="cart-item-title">${item.title}</div>
                        <div class="cart-item-price">$${item.price} x ${item.quantity} = <strong>$${itemTotal.toFixed(2)}</strong></div>
                    </div>
                </div>
                <button class="btn-remove-item" data-id="${item.id}">Hapus</button>
            `;
            cartItemsContainer.appendChild(div);
        });

        cartTotalPrice.textContent = `$${totalSum.toFixed(2)}`;

        // Event Delegation untuk hapus item keranjang (removeItem)
        cartItemsContainer.querySelectorAll(".btn-remove-item").forEach(button => {
            button.addEventListener("click", (e) => {
                const idToRemove = parseInt(e.target.dataset.id);
                removeFromCart(idToRemove);
            });
        });
    }

    // Hapus Item dari Keranjang (removeItem)
    function removeFromCart(productId) {
        cart = cart.filter(item => item.id !== productId);
        localStorage.setItem("cart_items", JSON.stringify(cart));
        updateCartBadge();
        renderCartItems();
    }

    // 9. MODAL DETAIL PRODUK 
    function openModal(productId) {
        const product = allProducts.find(p => p.id === productId);
        if (!product) return;

        modalBody.innerHTML = `
            <img src="${product.thumbnail}" alt="${product.title}">
            <div class="modal-details">
                <span class="product-category">${product.category}</span>
                <h3>${product.title}</h3>
                <p class="brand">Brand: <strong>${product.brand || 'N/A'}</strong> | Rating: ★ ${product.rating}</p>
                <p class="price">$${product.price} <small style="color:#ef4444;">(-${Math.round(product.discountPercentage)}%)</small></p>
                <p style="color:#059669; font-weight:bold; font-size:13px; margin-bottom:8px;">Stok tersedia: ${product.stock}</p>
                <p class="desc">${product.description}</p>
                <button class="btn-add-cart" id="modal-add-cart" data-id="${product.id}">Tambah ke Keranjang</button>
            </div>
        `;

        productModal.style.display = "flex";

        document.getElementById("modal-add-cart").addEventListener("click", () => {
            addToCart(product.id);
        });
    }

    // Close Modal Events
    modalClose.addEventListener("click", () => productModal.style.display = "none");
    productModal.addEventListener("click", (e) => {
        if (e.target === productModal) productModal.style.display = "none";
    });

    // Helper State Functions
    function showLoading(state) {
        globalLoading.style.display = state ? "block" : "none";
    }

    function showError(msg) {
        globalError.textContent = msg;
        globalError.style.display = "block";
    }

    // JALANKAN PERTAMA KALI
    fetchProducts();
});
