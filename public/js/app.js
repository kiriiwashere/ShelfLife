document.addEventListener('DOMContentLoaded', () => {

  const AppState = {
    currentUser: null,
    currentView: 'dashboard',
    inventory: [],
    transactions: [],
    projections: [],
    users: [],
    activeWindowDays: 30,
    simulationMultiplier: 1.0,
  };

  const DOM = {
    authPanel: document.getElementById('auth-panel'),
    appWorkspace: document.getElementById('app-workspace'),

    loginForm: document.getElementById('login-form'),
    itemForm: document.getElementById('item-form'),
    transactionForm: document.getElementById('transaction-form'),
    adminCreateUserForm: document.getElementById('admin-create-user-form'),

    sidebarMenu: document.querySelector('.sidebar-menu'),
    currentUsername: document.getElementById('current-username'),
    currentUserrole: document.getElementById('current-userrole'),
    logoutBtn: document.getElementById('logout-btn'),
    viewTitle: document.getElementById('view-title'),
    currentTime: document.getElementById('current-time'),

    itemModal: document.getElementById('item-modal'),
    transactionModal: document.getElementById('transaction-modal'),
    itemModalTitle: document.getElementById('item-modal-title'),
    itemFormSubmitBtn: document.getElementById('item-form-submit-btn'),
    txModalTitle: document.getElementById('tx-modal-title'),

    inventorySearch: document.getElementById('inventory-search'),
    inventoryCategoryFilter:document.getElementById('inventory-category-filter'),

    transactionsSearch: document.getElementById('transactions-search'),
    transactionsTypeFilter: document.getElementById('transactions-type-filter'),

    projectionDaysSelect: document.getElementById('projection-days-select'),
    simulationSlider: document.getElementById('simulation-slider'),
    sliderVal: document.getElementById('slider-val'),
  };

  //clock
  setInterval(() => {
    DOM.currentTime.textContent = new Date().toLocaleTimeString();
  }, 1000);

  //auth
  function checkAuth() {
    const user = API.getCurrentUser();
    if (user) {
      AppState.currentUser = user;
      DOM.currentUsername.textContent = user.username;
      DOM.currentUserrole.textContent = user.role;

      const isAdmin = user.role === 'admin';
      document.querySelectorAll('.admin-only').forEach(el =>
        el.style.display = isAdmin ? 'flex' : 'none'
      );
      document.querySelectorAll('.admin-only-field').forEach(el =>
        el.style.display = isAdmin ? 'block' : 'none'
      );

      DOM.authPanel.style.display = 'none';
      DOM.appWorkspace.style.display = 'grid';

      const route = window.location.hash.substring(1) || 'dashboard';
      navigateTo(route);
    } else {
      AppState.currentUser = null;
      DOM.appWorkspace.style.display = 'none';
      DOM.authPanel.style.display = 'flex';
    }
  }

  DOM.loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    try {
      await API.login(username, password);
      Utils.showNotification('Welcome back', `Signed in as ${username}.`, 'success');
      DOM.loginForm.reset();
      checkAuth();
    } catch (err) {
      Utils.showNotification('Login failed', err.message, 'error');
    }
  });

  DOM.logoutBtn.addEventListener('click', () => {
    API.logout();
    Utils.showNotification('Signed out', 'See you next time.', 'info');
    checkAuth();
  });

  //nav
  DOM.sidebarMenu.querySelectorAll('.menu-item').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      window.location.hash = link.dataset.view;
    });
  });

  window.addEventListener('hashchange', () => {
    if (AppState.currentUser) navigateTo(window.location.hash.substring(1));
  });

  const VIEW_TITLES = {
    dashboard: 'Dashboard',
    inventory: 'Inventory',
    transactions: 'Usage History',
    projections: 'Supply Estimates',
    users: 'User Accounts',
  };

  function navigateTo(viewName) {
    const valid = ['dashboard', 'inventory', 'transactions', 'projections', 'users'];
    if (!valid.includes(viewName)) viewName = 'dashboard';
    if (viewName === 'users' && AppState.currentUser.role !== 'admin') {
      viewName = 'dashboard';
      window.location.hash = 'dashboard';
    }

    AppState.currentView = viewName;

    DOM.sidebarMenu.querySelectorAll('.menu-item').forEach(item =>
      item.classList.toggle('active', item.dataset.view === viewName)
    );
    document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));

    const target = document.getElementById(`view-${viewName}`);
    if (target) target.classList.add('active');

    DOM.viewTitle.textContent = VIEW_TITLES[viewName] || 'ShelfLife';
    loadViewData(viewName);
  }

  //load
  async function loadViewData(viewName) {
    try {
      if (viewName === 'dashboard') {
        await loadDashboard();
      } else if (viewName === 'inventory') {
        await refreshInventory();
      } else if (viewName === 'transactions') {
        const txs = await API.getTransactions();
        AppState.transactions = txs;
        filterAndRenderTransactions();
      } else if (viewName === 'projections') {
        await refreshProjections();
      } else if (viewName === 'users' && AppState.currentUser.role === 'admin') {
        const users = await API.getUsers();
        AppState.users = users;
        Components.renderUsersTable('users-table-body', users, handleDeleteUser);
      }
    } catch (err) {
      Utils.showNotification('Load error', err.message, 'error');
    }
  }

  async function loadDashboard() {
    const [stats, txs] = await Promise.all([
      API.getDashboardStats(),
      API.getTransactions(),
    ]);

    //anim
    Charts.animateCount(document.getElementById('stat-total-items'), stats.totalItems);
    Charts.animateCount(document.getElementById('stat-low-stock'), stats.lowStockCount);
    Charts.animateCount(document.getElementById('stat-out-of-stock'), stats.outOfStockCount);
    Charts.animateCount(document.getElementById('stat-recent-activity'),stats.recentActivityCount);

    const sparkData = buildSparkData(txs);
    Charts.renderSparkline('sparkline-total', sparkData.all, 'var(--purple)');
    Charts.renderSparkline('sparkline-low', sparkData.usage, 'var(--amber)');
    Charts.renderSparkline('sparkline-out', sparkData.usage, 'var(--red)');
    Charts.renderSparkline('sparkline-activity', sparkData.restock, 'var(--teal)');

    Charts.renderCategoryBar('category-bar-chart', stats.categoryCounts || {});
    Charts.renderActivityLine('activity-line-chart', txs);

    Components.renderLowStockAlerts('low-stock-list', stats.lowStockItems, triggerAdjustModal);
    Components.renderRecentTransactions('dashboard-recent-transactions', txs);
  }

  function buildSparkData(txs) {
    const all     = [], usage = [], restock = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const s = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const e = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
      const day = (txs || []).filter(tx => {
        const t = new Date(tx.timestamp);
        return t >= s && t < e;
      });
      all.push(day.length);
      usage.push(day.filter(tx => tx.type === 'usage').length);
      restock.push(day.filter(tx => tx.type === 'restock').length);
    }
    return { all, usage, restock };
  }

  //inv
  async function refreshInventory() {
    const items = await API.getInventory();
    AppState.inventory = items;
    const categories = ['all', ...new Set(items.map(i => i.category).filter(Boolean))];
    const sel = DOM.inventoryCategoryFilter;
    const cur = sel.value;
    sel.innerHTML = categories.map(c =>
      `<option value="${c}">${c === 'all' ? 'All Categories' : c}</option>`
    ).join('');
    if (categories.includes(cur)) sel.value = cur;
    filterAndRenderInventory();
  }

  function filterAndRenderInventory() {
    const search = DOM.inventorySearch.value.toLowerCase().trim();
    const cat    = DOM.inventoryCategoryFilter.value;
    let filtered = AppState.inventory;
    if (cat !== 'all') filtered = filtered.filter(i => i.category === cat);
    if (search) filtered = filtered.filter(i =>
      i.name.toLowerCase().includes(search) ||
      i.sku.toLowerCase().includes(search)  ||
      (i.category || '').toLowerCase().includes(search)
    );

    Components.renderInventoryTable(
      'inventory-table-body', filtered,
      triggerEditModal, handleDeleteItem, triggerAdjustModal
    );
  }

  DOM.inventorySearch.addEventListener('input', filterAndRenderInventory);
  DOM.inventoryCategoryFilter.addEventListener('change', filterAndRenderInventory);

  //transac
  function filterAndRenderTransactions() {
    const search = DOM.transactionsSearch.value.toLowerCase().trim();
    const type   = DOM.transactionsTypeFilter.value;

    let filtered = AppState.transactions;
    if (type !== 'all') filtered = filtered.filter(tx => tx.type === type);
    if (search) filtered = filtered.filter(tx =>
      tx.itemName.toLowerCase().includes(search)   ||
      (tx.itemSku || '').toLowerCase().includes(search) ||
      tx.username.toLowerCase().includes(search)   ||
      (tx.notes || '').toLowerCase().includes(search)
    );

    Components.renderTransactionsTable('transactions-table-body', filtered);
  }

  DOM.transactionsSearch.addEventListener('input', filterAndRenderTransactions);
  DOM.transactionsTypeFilter.addEventListener('change', filterAndRenderTransactions);

  //estimate/proj
  async function refreshProjections() {
    const days = parseInt(DOM.projectionDaysSelect.value);
    AppState.activeWindowDays = days;
    const data = await API.getProjections(days);
    AppState.projections = data.projections;
    renderProjections();
  }

  function renderProjections() {
    Components.renderProjectionsTable(
      'projections-table-body',
      AppState.projections,
      AppState.simulationMultiplier
    );
  }

  DOM.projectionDaysSelect.addEventListener('change', refreshProjections);
  DOM.simulationSlider.addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    DOM.sliderVal.textContent = `${val}%`;
    AppState.simulationMultiplier = val / 100;
    renderProjections();
  });

  //user control
  DOM.adminCreateUserForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('admin-user-name').value;
    const password = document.getElementById('admin-user-password').value;
    const role     = document.getElementById('admin-user-role').value;
    try {
      await API.register(username, password, role);
      Utils.showNotification('Account created', `"${username}" has been registered.`, 'success');
      DOM.adminCreateUserForm.reset();
      loadViewData('users');
    } catch (err) {
      Utils.showNotification('Error', err.message, 'error');
    }
  });

  async function handleDeleteUser(userId) {
    if (!confirm('Delete this user account?')) return;
    try {
      await API.deleteUser(userId);
      Utils.showNotification('Account removed', 'The user has been deleted.', 'success');
      loadViewData('users');
    } catch (err) {
      Utils.showNotification('Failed', err.message, 'error');
    }
  }

  function closeAllModals() {
    DOM.itemModal.classList.remove('active');
    DOM.transactionModal.classList.remove('active');
    DOM.itemForm.reset();
    DOM.transactionForm.reset();
  }

  document.querySelectorAll('.btn-close-modal').forEach(btn => {
    btn.onclick = (e) => { e.preventDefault(); closeAllModals(); };
  });

  [DOM.itemModal, DOM.transactionModal].forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeAllModals();
    });
  });

  document.querySelectorAll('.btn-trigger-add').forEach(btn => {
    btn.onclick = () => {
      DOM.itemModalTitle.textContent = 'Add New Item';
      DOM.itemFormSubmitBtn.textContent = 'Save Item';
      document.getElementById('item-form-id').value = '';
      document.getElementById('item-form-sku').disabled = false;
      DOM.itemModal.classList.add('active');
    };
  });

  async function triggerEditModal(itemId) {
    try {
      const item = await API.getItem(itemId);
      DOM.itemModalTitle.textContent = 'Edit Item';
      DOM.itemFormSubmitBtn.textContent = 'Save Changes';
      document.getElementById('item-form-id').value = item.id;
      document.getElementById('item-form-name').value = item.name;
      const skuInput = document.getElementById('item-form-sku');
      skuInput.value = item.sku;
      skuInput.disabled = true;
      document.getElementById('item-form-category').value = item.category;
      document.getElementById('item-form-quantity').value = item.quantity;
      document.getElementById('item-form-unit').value = item.unit;
      document.getElementById('item-form-safety').value = item.safetyStock;
      DOM.itemModal.classList.add('active');
    } catch (err) {
      Utils.showNotification('Error', err.message, 'error');
    }
  }

  DOM.itemForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('item-form-id').value;
    const name= document.getElementById('item-form-name').value;
    const sku = document.getElementById('item-form-sku').value;
    const category = document.getElementById('item-form-category').value;
    const quantity = parseFloat(document.getElementById('item-form-quantity').value);
    const unit = document.getElementById('item-form-unit').value;
    const safetyStock= parseFloat(document.getElementById('item-form-safety').value);
    const payload = { name, sku, category, quantity, unit, safetyStock };

    try {
      if (id) {
        await API.updateItem(id, payload);
        Utils.showNotification('Item updated', `"${name}" has been saved.`, 'success');
      } else {
        await API.addItem(payload);
        Utils.showNotification('Item added', `"${name}" is now in inventory.`, 'success');
      }
      closeAllModals();
      loadViewData(AppState.currentView);
    } catch (err) {
      Utils.showNotification('Save failed', err.message, 'error');
    }
  });

  //delete
  async function handleDeleteItem(itemId) {
    if (!confirm('Delete this item and all its transaction history?')) return;
    try {
      await API.deleteItem(itemId);
      Utils.showNotification('Item deleted', 'Removed from inventory.', 'success');
      loadViewData(AppState.currentView);
    } catch (err) {
      Utils.showNotification('Failed', err.message, 'error');
    }
  }

  //restock and trigger
  document.querySelectorAll('.btn-trigger-restock').forEach(btn => {
    btn.onclick = () => triggerAdjustModal(null, null, null, 'restock');
  });
  document.querySelectorAll('.btn-trigger-usage').forEach(btn => {
    btn.onclick = () => triggerAdjustModal(null, null, null, 'usage');
  });

  async function triggerAdjustModal(itemId = null, itemName = null, itemUnit = null, defaultType = 'usage') {
    try {
      const items  = await API.getInventory();
      const select = document.getElementById('tx-form-item');
      select.innerHTML = '<option value="">Choose an item…</option>' +
        items.map(i => `<option value="${i.id}" data-unit="${i.unit}">${i.name} (${i.sku})</option>`).join('');
      document.getElementById('tx-form-type').value = defaultType;

      if (itemId) {
        select.value = itemId;
        document.getElementById('tx-unit-label').textContent = itemUnit || 'units';
      } else {
        document.getElementById('tx-unit-label').textContent = 'units';
      }

      select.onchange = () => {
        const opt = select.options[select.selectedIndex];
        document.getElementById('tx-unit-label').textContent = opt.dataset.unit || 'units';
      };

      DOM.txModalTitle.textContent = 'Log Stock Adjustment';
      DOM.transactionModal.classList.add('active');
    } catch (err) {
      Utils.showNotification('Error', err.message, 'error');
    }
  }

  DOM.transactionForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const itemId = document.getElementById('tx-form-item').value;
    const type = document.getElementById('tx-form-type').value;
    const quantity = parseFloat(document.getElementById('tx-form-quantity').value);
    const notes= document.getElementById('tx-form-notes').value;

    try {
      const res = await API.recordTransaction(itemId, type, quantity, notes);
      const tx  = res.transaction;
      Utils.showNotification(
        'Transaction recorded',
        `${type === 'usage' ? 'Used' : 'Restocked'} ${quantity} ${tx.unit} of ${tx.itemName}.`,
        'success'
      );
      closeAllModals();
      loadViewData(AppState.currentView);
    } catch (err) {
      Utils.showNotification('Transaction failed', err.message, 'error');
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAllModals();
  });

  checkAuth();
});
