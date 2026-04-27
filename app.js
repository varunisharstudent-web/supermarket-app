// app.js
document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    
    // Default Mock Data
    const defaultProducts = [
        { id: 1, name: 'Organic Bananas', category: 'Produce', cost: 0.5, price: 1.2, stock: 150, pastSales: 300, expiry: '2026-05-01' },
        { id: 2, name: 'Whole Milk 1 Gal', category: 'Dairy', cost: 2.0, price: 3.5, stock: 12, pastSales: 150, expiry: '2026-04-28' }, // Low Stock & Smart Restock
        { id: 3, name: 'Sourdough Bread', category: 'Bakery', cost: 1.5, price: 4.0, stock: 5, pastSales: 80, expiry: '2026-04-26' }, // Low Stock
        { id: 4, name: 'Eggs 1 Dozen', category: 'Dairy', cost: 1.8, price: 3.0, stock: 0, pastSales: 200, expiry: '2026-05-15' }, // Out of Stock
        { id: 5, name: 'Coffee Beans', category: 'Beverages', cost: 5.0, price: 12.0, stock: 45, pastSales: 50, expiry: '2027-01-01' },
    ];

    const defaultStaff = [
        { id: 1, name: 'Alice Smith', role: 'Manager', shift: 'Morning', status: 'Active' },
        { id: 2, name: 'Bob Jones', role: 'Cashier', shift: 'Morning', status: 'Active' },
        { id: 3, name: 'Charlie Brown', role: 'Stocker', shift: 'Evening', status: 'On Leave' },
    ];

    const defaultSales = [
        { date: '2026-04-20', revenue: 1200, cost: 700, profit: 500 },
        { date: '2026-04-21', revenue: 1350, cost: 800, profit: 550 },
        { date: '2026-04-22', revenue: 1100, cost: 650, profit: 450 },
        { date: '2026-04-23', revenue: 1500, cost: 850, profit: 650 },
        { date: '2026-04-24', revenue: 900, cost: 500, profit: 400 },
    ];

    // State
    let products = null;
    try { products = JSON.parse(localStorage.getItem('sm_products')); } catch(e){}
    if (!Array.isArray(products)) products = defaultProducts;

    let staff = null;
    try { staff = JSON.parse(localStorage.getItem('sm_staff')); } catch(e){}
    if (!Array.isArray(staff)) staff = defaultStaff;

    let sales = null;
    try { sales = JSON.parse(localStorage.getItem('sm_sales')); } catch(e){}
    if (!Array.isArray(sales)) sales = defaultSales;
    
    let cart = [];

    function saveData() {
        localStorage.setItem('sm_products', JSON.stringify(products));
        localStorage.setItem('sm_staff', JSON.stringify(staff));
        localStorage.setItem('sm_sales', JSON.stringify(sales));
    }

    // Navigation Logic (Moved up to ensure it always binds)
    const navItems = document.querySelectorAll('.nav-item[data-target]');
    const pageViews = document.querySelectorAll('.page-view');
    const pageTitle = document.getElementById('page-title');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const target = item.getAttribute('data-target');
            
            navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');

            pageViews.forEach(p => {
                p.classList.remove('active');
                p.classList.add('hidden');
            });

            const targetView = document.getElementById(`${target}-view`);
            if (targetView) {
                targetView.classList.remove('hidden');
                targetView.classList.add('active');
            }

            if (pageTitle) pageTitle.textContent = item.textContent.trim();
            if(target === 'dashboard') {
                try { updateDashboard(); } catch(err) { console.error(err); }
            }
        });
    });

    // Auth Logic
    const loginForm = document.getElementById('login-form');
    const logoutBtn = document.getElementById('logout-btn');
    const loginView = document.getElementById('login-view');
    const appView = document.getElementById('app-view');

    if (localStorage.getItem('sm_auth') === 'true') {
        if (loginView) { loginView.classList.remove('active'); loginView.classList.add('hidden'); }
        if (appView) { appView.classList.remove('hidden'); appView.classList.add('active'); }
        initApp();
    }

    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            localStorage.setItem('sm_auth', 'true');
            if (loginView) { loginView.classList.remove('active'); loginView.classList.add('hidden'); }
            if (appView) { appView.classList.remove('hidden'); appView.classList.add('active'); }
            initApp();
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('sm_auth');
            if (appView) { appView.classList.remove('active'); appView.classList.add('hidden'); }
            if (loginView) { loginView.classList.remove('hidden'); loginView.classList.add('active'); }
        });
    }

    let salesChartInstance = null;
    let categoryChartInstance = null;

    function initApp() {
        try { updateDashboard(); } catch(e) { console.error('Dashboard Error:', e); }
        try { renderInventory(); } catch(e) { console.error('Inventory Error:', e); }
        try { renderStaff(); } catch(e) { console.error('Staff Error:', e); }
        try { renderSales(); } catch(e) { console.error('Sales Error:', e); }
        try { updateNotifications(); } catch(e) { console.error('Notifications Error:', e); }
        try { renderBillingProducts(); } catch(e) { console.error('Billing Error:', e); }
        try { renderCart(); } catch(e) { console.error('Cart Error:', e); }
    }

    // Dashboard
    function updateDashboard() {
        const totalStock = products.reduce((sum, p) => sum + p.stock, 0);
        const lowStockCount = products.filter(p => p.stock < 20).length;
        
        let todaySales = { revenue: 0, profit: 0 };
        let yesterdaySales = { revenue: 0, profit: 0 };
        
        if (sales.length > 0) {
            todaySales = sales[sales.length - 1];
            if (sales.length > 1) {
                yesterdaySales = sales[sales.length - 2];
            }
        }

        // Calculate trends
        function getTrendHtml(current, previous, inverse = false) {
            if (previous === 0 && current === 0) return '<span class="trend neutral">--</span>';
            if (previous === 0) return `<span class="trend ${inverse ? 'negative' : 'positive'}"><i data-lucide="${inverse ? 'arrow-down-right' : 'arrow-up-right'}" style="width:12px;"></i> +100%</span>`;
            
            const pct = ((current - previous) / previous) * 100;
            const formattedPct = Math.abs(pct).toFixed(1) + '%';
            
            if (pct > 0) {
                return `<span class="trend ${inverse ? 'negative' : 'positive'}"><i data-lucide="arrow-up-right" style="width:12px;"></i> +${formattedPct}</span>`;
            } else if (pct < 0) {
                return `<span class="trend ${inverse ? 'positive' : 'negative'}"><i data-lucide="arrow-down-right" style="width:12px;"></i> -${formattedPct}</span>`;
            }
            return '<span class="trend neutral">0%</span>';
        }

        document.getElementById('metric-stock').textContent = totalStock;
        document.getElementById('metric-sales').textContent = `$${todaySales.revenue.toFixed(2)}`;
        document.getElementById('metric-profit').textContent = `$${todaySales.profit.toFixed(2)}`;
        document.getElementById('metric-low-stock').textContent = lowStockCount;

        // Populate trends
        document.getElementById('trend-sales').innerHTML = getTrendHtml(todaySales.revenue, yesterdaySales.revenue);
        document.getElementById('trend-profit').innerHTML = getTrendHtml(todaySales.profit, yesterdaySales.profit);
        
        // Mock stock trend (static example since we don't track historical stock total)
        document.getElementById('trend-stock').innerHTML = '<span class="trend positive"><i data-lucide="arrow-up-right" style="width:12px;"></i> +2.1%</span>';
        // Low stock trend
        document.getElementById('trend-low-stock').innerHTML = `<span class="trend ${lowStockCount > 5 ? 'negative' : 'positive'}"><i data-lucide="${lowStockCount > 5 ? 'arrow-up-right' : 'arrow-down-right'}" style="width:12px;"></i></span>`;

        renderDashboardInsights();
        renderCharts();
        if (typeof lucide !== 'undefined') { lucide.createIcons(); }
    }

    function renderDashboardInsights() {
        // Top Products
        const topList = document.getElementById('top-products-list');
        if (topList) {
            const sorted = [...products].sort((a, b) => b.pastSales - a.pastSales).slice(0, 5);
            topList.innerHTML = sorted.map(p => `
                <li>
                    <div class="insight-item-info">
                        <span class="insight-item-name">${p.name}</span>
                        <span class="insight-item-meta">${p.category}</span>
                    </div>
                    <span class="insight-item-val val-high">${p.pastSales} sold</span>
                </li>
            `).join('') || '<li><span class="text-muted">No data</span></li>';
        }

        // Dead Stock (Stock > 10, pastSales <= 10)
        const deadList = document.getElementById('dead-stock-list');
        if (deadList) {
            const dead = products.filter(p => p.stock > 10 && p.pastSales <= 20).sort((a,b) => b.stock - a.stock).slice(0, 5);
            deadList.innerHTML = dead.map(p => `
                <li>
                    <div class="insight-item-info">
                        <span class="insight-item-name">${p.name}</span>
                        <span class="insight-item-meta">${p.stock} in stock</span>
                    </div>
                    <span class="insight-item-val val-dead">${p.pastSales} sold</span>
                </li>
            `).join('') || '<li><span style="color: var(--neon-green);">No dead stock found!</span></li>';
        }

        // Smart Restock Table
        const restockTbody = document.getElementById('dashboard-restock-tbody');
        if (restockTbody) {
            const restocks = products.filter(p => p.stock < 20 && p.pastSales > 100);
            restockTbody.innerHTML = restocks.map(p => {
                // Calculate suggested qty: 1.5x past sales minus current stock (simple logic)
                let suggested = Math.ceil((p.pastSales * 1.5) - p.stock);
                if (suggested < 10) suggested = 10; // min order qty

                return `
                <tr>
                    <td style="font-weight: 600;">${p.name}</td>
                    <td style="color: var(--neon-red);">${p.stock}</td>
                    <td style="color: var(--neon-green);">${p.pastSales}</td>
                    <td style="font-weight: bold; color: var(--neon-cyan);">${suggested}</td>
                    <td style="font-size: 0.8rem; color: var(--text-muted);">High demand, running out</td>
                </tr>
                `;
            }).join('') || '<tr><td colspan="5" style="text-align:center; color: var(--text-muted);">Inventory looks healthy. No smart restocks needed.</td></tr>';
        }
    }

    function renderCharts() {
        if (typeof Chart === 'undefined') {
            console.error("Chart.js failed to load. Charts will not be rendered.");
            return;
        }

        const salesCanvas = document.getElementById('salesChart');
        const categoryCanvas = document.getElementById('categoryChart');
        if (!salesCanvas || !categoryCanvas) return;

        const ctxSales = salesCanvas.getContext('2d');
        const ctxCategory = categoryCanvas.getContext('2d');

        if (salesChartInstance) salesChartInstance.destroy();
        if (categoryChartInstance) categoryChartInstance.destroy();

        const labels = sales.map(s => s.date.slice(5));
        const revenues = sales.map(s => s.revenue);
        const profits = sales.map(s => s.profit);

        Chart.defaults.color = '#94a3b8';
        Chart.defaults.borderColor = 'rgba(255,255,255,0.1)';

        salesChartInstance = new Chart(ctxSales, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Revenue',
                        data: revenues,
                        borderColor: '#00f3ff',
                        backgroundColor: 'rgba(0, 243, 255, 0.1)',
                        borderWidth: 2,
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'Profit',
                        data: profits,
                        borderColor: '#39ff14',
                        borderWidth: 2,
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'top' } }
            }
        });

        // Category breakdown
        const catData = {};
        products.forEach(p => {
            catData[p.category] = (catData[p.category] || 0) + p.stock;
        });

        categoryChartInstance = new Chart(ctxCategory, {
            type: 'doughnut',
            data: {
                labels: Object.keys(catData),
                datasets: [{
                    data: Object.values(catData),
                    backgroundColor: ['#00f3ff', '#ff00ea', '#39ff14', '#ff073a', '#f59e0b'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: { position: 'right' }
                }
            }
        });
    }

    // Inventory
    const inventoryTbody = document.getElementById('inventory-tbody');
    const searchInventory = document.getElementById('search-inventory');
    const filterInventory = document.getElementById('filter-inventory');

    function renderInventory() {
        const query = searchInventory.value.toLowerCase();
        const filter = filterInventory.value;

        inventoryTbody.innerHTML = '';
        products.forEach(p => {
            if (!p.name.toLowerCase().includes(query)) return;
            
            let status = 'ok';
            let statusText = 'In Stock';
            let isSmartRestock = false;

            if (p.stock === 0) {
                status = 'out';
                statusText = 'Out of Stock';
            } else if (p.stock < 20) {
                status = 'low';
                statusText = 'Low Stock';
            }

            // Smart Restock: Low stock (<20) and high past sales (>100)
            if (p.stock < 20 && p.pastSales > 100) {
                isSmartRestock = true;
            }

            if (filter === 'low' && status !== 'low') return;
            if (filter === 'out' && status !== 'out') return;
            if (filter === 'restock' && !isSmartRestock) return;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>#${p.id}</td>
                <td>${p.name} ${isSmartRestock ? '<i data-lucide="zap" class="neon-icon" style="width:14px; margin-left:5px;" title="Smart Restock Suggested"></i>' : ''}</td>
                <td>${p.category}</td>
                <td>$${p.price.toFixed(2)}</td>
                <td>${p.stock}</td>
                <td>${p.expiry || 'N/A'}</td>
                <td><span class="status-badge status-${status}">${statusText}</span></td>
                <td>
                    <button class="icon-btn edit-btn" data-id="${p.id}"><i data-lucide="edit"></i></button>
                    <button class="icon-btn delete-btn" data-id="${p.id}"><i data-lucide="trash-2"></i></button>
                </td>
            `;
            inventoryTbody.appendChild(tr);
        });
        if (typeof lucide !== 'undefined') { lucide.createIcons(); }

        // Attach edit/delete handlers
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.currentTarget.getAttribute('data-id'));
                openProductModal(products.find(p => p.id === id));
            });
        });
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.currentTarget.getAttribute('data-id'));
                products = products.filter(p => p.id !== id);
                saveData();
                renderInventory();
                updateDashboard();
                updateNotifications();
            });
        });
    }

    if (searchInventory) searchInventory.addEventListener('input', renderInventory);
    if (filterInventory) filterInventory.addEventListener('change', renderInventory);

    // Product Modal
    const productModal = document.getElementById('product-modal');
    const productForm = document.getElementById('product-form');
    const closeModals = document.querySelectorAll('.close-modal');

    const addProductBtn = document.getElementById('add-product-btn');
    if (addProductBtn) {
        addProductBtn.addEventListener('click', () => {
            openProductModal();
        });
    }

    closeModals.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.currentTarget.closest('.modal').classList.add('hidden');
        });
    });

    function openProductModal(prod = null) {
        document.getElementById('product-modal-title').textContent = prod ? 'Edit Product' : 'Add Product';
        document.getElementById('prod-id').value = prod ? prod.id : '';
        document.getElementById('prod-name').value = prod ? prod.name : '';
        document.getElementById('prod-category').value = prod ? prod.category : '';
        document.getElementById('prod-cost').value = prod ? prod.cost : '';
        document.getElementById('prod-price').value = prod ? prod.price : '';
        document.getElementById('prod-stock').value = prod ? prod.stock : '';
        document.getElementById('prod-expiry').value = prod && prod.expiry ? prod.expiry : '';
        productModal.classList.remove('hidden');
    }

    productForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('prod-id').value;
        const newProd = {
            id: id ? parseInt(id) : Date.now(),
            name: document.getElementById('prod-name').value,
            category: document.getElementById('prod-category').value,
            cost: parseFloat(document.getElementById('prod-cost').value),
            price: parseFloat(document.getElementById('prod-price').value),
            stock: parseInt(document.getElementById('prod-stock').value),
            expiry: document.getElementById('prod-expiry').value,
            pastSales: id ? products.find(p => p.id == id).pastSales : 0
        };

        if (id) {
            products = products.map(p => p.id == id ? newProd : p);
        } else {
            products.push(newProd);
        }

        saveData();
        renderInventory();
        updateDashboard();
        updateNotifications();
        if (productModal) productModal.classList.add('hidden');
    });

    // Staff
    const staffTbody = document.getElementById('staff-tbody');
    function renderStaff() {
        staffTbody.innerHTML = '';
        staff.forEach(s => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>#${s.id}</td>
                <td>${s.name}</td>
                <td>${s.role}</td>
                <td>${s.shift}</td>
                <td><span class="status-badge ${s.status==='Active' ? 'status-ok' : 'status-low'}">${s.status}</span></td>
                <td>
                    <button class="icon-btn edit-staff-btn" data-id="${s.id}" title="Edit"><i data-lucide="edit"></i></button>
                    <button class="icon-btn delete-staff-btn" data-id="${s.id}" title="Delete"><i data-lucide="trash-2"></i></button>
                </td>
            `;
            staffTbody.appendChild(tr);
        });
        if (typeof lucide !== 'undefined') { lucide.createIcons(); }

        document.querySelectorAll('.edit-staff-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.currentTarget.getAttribute('data-id'));
                openStaffModal(staff.find(s => s.id === id));
            });
        });
        document.querySelectorAll('.delete-staff-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.currentTarget.getAttribute('data-id'));
                staff = staff.filter(s => s.id !== id);
                saveData();
                renderStaff();
            });
        });
    }

    // Staff Modal Logic
    const staffModal = document.getElementById('staff-modal');
    const staffForm = document.getElementById('staff-form');

    const addStaffBtn = document.getElementById('add-staff-btn');
    if (addStaffBtn) {
        addStaffBtn.addEventListener('click', () => {
            openStaffModal();
        });
    }

    function openStaffModal(s = null) {
        document.getElementById('staff-modal-title').textContent = s ? 'Edit Staff' : 'Add Staff';
        document.getElementById('staff-id').value = s ? s.id : '';
        document.getElementById('staff-name').value = s ? s.name : '';
        document.getElementById('staff-role').value = s ? s.role : 'Cashier';
        document.getElementById('staff-shift').value = s ? s.shift : '';
        document.getElementById('staff-status').value = s ? s.status : 'Active';
        staffModal.classList.remove('hidden');
    }

    staffForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('staff-id').value;
        const newStaff = {
            id: id ? parseInt(id) : Date.now(),
            name: document.getElementById('staff-name').value,
            role: document.getElementById('staff-role').value,
            shift: document.getElementById('staff-shift').value,
            status: document.getElementById('staff-status').value
        };

        if (id) {
            staff = staff.map(s => s.id == id ? newStaff : s);
        } else {
            staff.push(newStaff);
        }

        saveData();
        renderStaff();
        staffModal.classList.add('hidden');
    });

    // Sales
    const salesTbody = document.getElementById('sales-log-tbody');
    function renderSales() {
        salesTbody.innerHTML = '';
        sales.forEach(s => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${s.date}</td>
                <td>$${s.revenue.toFixed(2)}</td>
                <td>$${s.cost.toFixed(2)}</td>
                <td style="color: var(--neon-green)">+$${s.profit.toFixed(2)}</td>
            `;
            salesTbody.appendChild(tr);
        });
    }

    // Notifications
    function updateNotifications() {
        const notifyBtn = document.getElementById('notify-btn');
        const badge = document.getElementById('notify-badge');
        const dropdown = document.getElementById('notification-dropdown');
        
        let alerts = [];
        products.forEach(p => {
            if(p.stock === 0) alerts.push({ text: `${p.name} is out of stock!`, type: 'alert' });
            else if(p.stock < 20) alerts.push({ text: `${p.name} is running low (${p.stock} left).`, type: 'warn' });
            
            if(p.stock < 20 && p.pastSales > 100) {
                alerts.push({ text: `Smart Restock: High demand for ${p.name}. Order now!`, type: 'info' });
            }

            if (p.expiry) {
                const daysToExpire = (new Date(p.expiry) - new Date()) / (1000 * 60 * 60 * 24);
                if (daysToExpire < 0) {
                    alerts.push({ text: `${p.name} has EXPIRED!`, type: 'alert' });
                } else if (daysToExpire <= 7) {
                    alerts.push({ text: `${p.name} expires in ${Math.ceil(daysToExpire)} days.`, type: 'warn' });
                }
            }
        });

        badge.textContent = alerts.length;
        if(alerts.length === 0) badge.classList.add('hidden');
        else badge.classList.remove('hidden');

        dropdown.innerHTML = alerts.map(a => `
            <div class="notification-item">
                <i data-lucide="${a.type==='alert'?'alert-circle':(a.type==='warn'?'alert-triangle':'zap')}" class="${a.type==='alert'?'neon-text':''}" style="color: ${a.type==='alert'?'var(--neon-red)':(a.type==='warn'?'#ffa500':'var(--neon-cyan)')}"></i>
                <span>${a.text}</span>
            </div>
        `).join('') || '<div class="notification-item">No new notifications</div>';

        if (typeof lucide !== 'undefined') { lucide.createIcons(); }
    }

    // Toggle Notifications
    const notifyBtnElement = document.getElementById('notify-btn');
    if (notifyBtnElement) {
        notifyBtnElement.addEventListener('click', () => {
            const dropdown = document.getElementById('notification-dropdown');
            if (dropdown) dropdown.classList.toggle('hidden');
        });
    }

    // --- Billing (POS) Logic ---
    const billingProductGrid = document.getElementById('billing-product-grid');
    const billingSearch = document.getElementById('billing-search');
    const cartItemsContainer = document.getElementById('cart-items');
    
    function renderBillingProducts() {
        const query = billingSearch.value.toLowerCase();
        billingProductGrid.innerHTML = '';
        
        products.forEach(p => {
            if (!p.name.toLowerCase().includes(query)) return;
            if (p.stock <= 0) return; // Don't show out of stock items in POS
            
            const div = document.createElement('div');
            div.className = 'billing-item glow-border';
            div.innerHTML = `
                <h4>${p.name}</h4>
                <p>$${p.price.toFixed(2)}</p>
                <div class="stock-info">Stock: ${p.stock}</div>
            `;
            div.addEventListener('click', () => addToCart(p));
            billingProductGrid.appendChild(div);
        });
    }

    if(billingSearch) {
        billingSearch.addEventListener('input', renderBillingProducts);
    }

    function addToCart(product) {
        const existing = cart.find(item => item.id === product.id);
        if (existing) {
            if (existing.qty < product.stock) existing.qty++;
            else alert("Cannot add more than available stock!");
        } else {
            cart.push({ ...product, qty: 1 });
        }
        renderCart();
    }

    // Expose globally for onclick handlers
    window.updateCartQty = function(id, delta) {
        const item = cart.find(i => i.id === id);
        if(!item) return;
        
        const product = products.find(p => p.id === id);
        
        item.qty += delta;
        if (item.qty <= 0) {
            cart = cart.filter(i => i.id !== id);
        } else if (item.qty > product.stock) {
            item.qty = product.stock;
            alert("Maximum stock reached!");
        }
        renderCart();
    };

    function renderCart() {
        if(!cartItemsContainer) return;
        cartItemsContainer.innerHTML = '';
        let subtotal = 0;

        cart.forEach(item => {
            subtotal += item.price * item.qty;
            const div = document.createElement('div');
            div.className = 'cart-item';
            div.innerHTML = `
                <div class="cart-item-info">
                    <h4>${item.name}</h4>
                    <p>$${item.price.toFixed(2)} x ${item.qty}</p>
                </div>
                <div class="cart-item-actions">
                    <button class="cart-qty-btn" onclick="updateCartQty(${item.id}, -1)">-</button>
                    <span>${item.qty}</span>
                    <button class="cart-qty-btn" onclick="updateCartQty(${item.id}, 1)">+</button>
                </div>
            `;
            cartItemsContainer.appendChild(div);
        });

        const tax = subtotal * 0.05; // 5% tax
        const total = subtotal + tax;

        document.getElementById('cart-subtotal').textContent = '$' + subtotal.toFixed(2);
        document.getElementById('cart-tax').textContent = '$' + tax.toFixed(2);
        document.getElementById('cart-total').textContent = '$' + total.toFixed(2);
    }

    const checkoutBtn = document.getElementById('checkout-btn');
    if(checkoutBtn) {
        checkoutBtn.addEventListener('click', () => {
            if (cart.length === 0) {
                alert("Cart is empty!");
                return;
            }

            let totalRevenue = 0;
            let totalCost = 0;

            // Deduct stock and calculate profit
            cart.forEach(cartItem => {
                const prod = products.find(p => p.id === cartItem.id);
                if(prod) {
                    prod.stock -= cartItem.qty;
                    prod.pastSales += cartItem.qty;
                    totalRevenue += (cartItem.price * cartItem.qty);
                    totalCost += (cartItem.cost * cartItem.qty);
                }
            });

            const profit = totalRevenue - totalCost;

            // Add to today's sales (or create new entry)
            const today = new Date().toISOString().split('T')[0];
            const existingSale = sales.find(s => s.date === today);
            if (existingSale) {
                existingSale.revenue += totalRevenue;
                existingSale.cost += totalCost;
                existingSale.profit += profit;
            } else {
                sales.push({ date: today, revenue: totalRevenue, cost: totalCost, profit: profit });
            }

            saveData();
            cart = [];
            renderCart();
            renderBillingProducts();
            updateDashboard();
            renderInventory();
            renderSales();
            updateNotifications();
            
            alert("Checkout successful!");
        });
    }

    // --- Audit Logic ---
    const auditBtn = document.getElementById('audit-btn');
    const auditModal = document.getElementById('audit-modal');
    const auditForm = document.getElementById('audit-form');
    const auditProduct = document.getElementById('audit-product');
    const auditRecorded = document.getElementById('audit-recorded');
    
    if (auditBtn) {
        auditBtn.addEventListener('click', () => {
            auditProduct.innerHTML = '<option value="" disabled selected>Select a product...</option>';
            products.forEach(p => {
                auditProduct.innerHTML += `<option value="${p.id}">${p.name} (ID: ${p.id})</option>`;
            });
            document.getElementById('audit-actual').value = '';
            auditRecorded.value = '';
            auditModal.classList.remove('hidden');
        });
    }

    if (auditProduct) {
        auditProduct.addEventListener('change', (e) => {
            const id = parseInt(e.target.value);
            const prod = products.find(p => p.id === id);
            if (prod) {
                auditRecorded.value = prod.stock;
            }
        });
    }

    if (auditForm) {
        auditForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const id = parseInt(auditProduct.value);
            const actual = parseInt(document.getElementById('audit-actual').value);
            const prod = products.find(p => p.id === id);
            
            if (prod) {
                const diff = actual - prod.stock;
                let audits = JSON.parse(localStorage.getItem('sm_audits') || '[]');
                audits.push({ date: new Date().toISOString(), productId: id, productName: prod.name, recorded: prod.stock, actual: actual, difference: diff });
                localStorage.setItem('sm_audits', JSON.stringify(audits));
                
                prod.stock = actual; // update stock
                saveData();
                renderInventory();
                updateDashboard();
                updateNotifications();
                alert(`Audit saved. Difference: ${diff > 0 ? '+' : ''}${diff}`);
            }
            auditModal.classList.add('hidden');
        });
    }

    // --- Reports Logic ---
    function downloadCSV(filename, data) {
        const blob = new Blob([data], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('hidden', '');
        a.setAttribute('href', url);
        a.setAttribute('download', filename);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    const reportSalesBtn = document.getElementById('report-sales-btn');
    if (reportSalesBtn) {
        reportSalesBtn.addEventListener('click', () => {
            let csv = 'Date,Total Revenue,Total Cost,Net Profit\n';
            sales.forEach(s => {
                csv += `${s.date},${s.revenue},${s.cost},${s.profit}\n`;
            });
            downloadCSV('sales_report.csv', csv);
        });
    }

    const reportAuditBtn = document.getElementById('report-audit-btn');
    if (reportAuditBtn) {
        reportAuditBtn.addEventListener('click', () => {
            let csv = 'Date,Product ID,Product Name,Recorded Stock,Actual Stock,Difference\n';
            let audits = JSON.parse(localStorage.getItem('sm_audits') || '[]');
            audits.forEach(a => {
                csv += `${a.date},${a.productId},"${a.productName}",${a.recorded},${a.actual},${a.difference}\n`;
            });
            downloadCSV('inventory_audit.csv', csv);
        });
    }

    const reportRestockBtn = document.getElementById('report-restock-btn');
    if (reportRestockBtn) {
        reportRestockBtn.addEventListener('click', () => {
            let csv = 'Product ID,Product Name,Category,Current Stock,Past Sales\n';
            products.forEach(p => {
                if (p.stock < 20 && p.pastSales > 100) {
                    csv += `${p.id},"${p.name}",${p.category},${p.stock},${p.pastSales}\n`;
                }
            });
            downloadCSV('smart_restock.csv', csv);
        });
    }
});
