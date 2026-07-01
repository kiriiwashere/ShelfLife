const Components = (() => {
  function renderLowStockAlerts(containerId, items, onActionClick) {
    const container = document.getElementById(containerId);
    if (!container) return;

    //update badge count
    const badge = document.getElementById('alert-count-badge');
    if (badge) badge.textContent = items ? items.length : 0;

    if (!items || items.length === 0) {
      container.innerHTML = `
        <div class="centered-flex text-muted" style="height: 100px; flex-direction: column; gap: 8px;">
          <i class="fa-regular fa-face-smile" style="font-size: 22px; color: var(--green);"></i>
          <p style="font-size: 12px;">All stock levels are stable.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = items.map(item => `
      <div class="low-stock-alert-item">
        <div class="warning-meta">
          <h4>${item.name}</h4>
          <p>${item.sku} &middot; ${item.category}</p>
        </div>
        <div style="display: flex; align-items: center; gap: 9px;">
          <span class="warning-badge">${item.quantity} / ${item.safetyStock} ${item.unit}</span>
          <button class="btn-table-action adjust"
                  data-id="${item.id}"
                  data-name="${item.name}"
                  data-unit="${item.unit}"
                  title="Restock this item">
            <i class="fa-solid fa-truck-ramp-box"></i>
          </button>
        </div>
      </div>
    `).join('');

    container.querySelectorAll('.btn-table-action.adjust').forEach(btn => {
      btn.onclick = () => onActionClick(btn.dataset.id, btn.dataset.name, btn.dataset.unit);
    });
  }

  function renderRecentTransactions(containerId, txs) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!txs || txs.length === 0) {
      container.innerHTML = `
        <div class="centered-flex text-muted" style="height: 100px;">
          <p style="font-size: 12px;">No recent transaction logs found.</p>
        </div>
      `;
      return;
    }

    const recent = [...txs]
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 6);

    container.innerHTML = recent.map(tx => {
      const isUsage = tx.type === 'usage';
      const typeLabel = isUsage ? 'Dispensed' : 'Restocked';
      const qty = isUsage ? `-${tx.quantity}` : `+${tx.quantity}`;
      return `
        <div class="tx-list-item">
          <div class="tx-item-info">
            <h4>${tx.itemName}</h4>
            <span>${Utils.formatDate(tx.timestamp)} &middot; ${tx.username}</span>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <span class="tx-badge ${tx.type}">${typeLabel}</span>
            <strong class="${isUsage ? 'text-red' : 'text-green'}" style="font-family:'JetBrains Mono',monospace; font-size:12px;">${qty} ${tx.unit}</strong>
          </div>
        </div>
      `;
    }).join('');
  }

  //fallback
  function renderCategoryChart(containerId, categoryCounts) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const categories = Object.keys(categoryCounts);
    if (categories.length === 0) {
      container.innerHTML = `<p class="text-muted" style="font-size:12px;">No inventory data available.</p>`;
      return;
    }

    const totalItems = Object.values(categoryCounts).reduce((a, b) => a + b, 0);
    const colors = [
      'var(--purple)', 'var(--teal)', 'var(--amber)',
      'var(--red)', 'var(--green)', '#60a5fa', '#f472b6', '#a3e635'
    ];

    container.innerHTML = categories.map((cat, i) => {
      const count = categoryCounts[cat];
      const pct   = Math.round((count / totalItems) * 100);
      const color = colors[i % colors.length];
      return `
        <div class="donut-segment">
          <div class="segment-label">
            <span class="segment-dot" style="background:${color};box-shadow:0 0 6px ${color};"></span>
            <span>${cat}</span>
          </div>
          <span class="segment-val">${count} <span class="text-muted">(${pct}%)</span></span>
        </div>
      `;
    }).join('');
  }

  function renderInventoryTable(tableBodyId, items, onEdit, onDelete, onAdjust) {
    const tbody = document.getElementById(tableBodyId);
    if (!tbody) return;

    if (!items || items.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted" style="padding:32px;">No inventory items found. Add some to get started.</td></tr>`;
      return;
    }

    tbody.innerHTML = items.map(item => {
      let statusClass ='stable';
      let statusLabel = 'In Stock';

      if (item.quantity === 0) {
        statusClass = 'depleted';
        statusLabel = 'Out of Stock';
      } else if (item.quantity <= item.safetyStock) {
        statusClass = 'critical';
        statusLabel= 'Low Stock';
      }

      const pct = item.safetyStock > 0
        ? Math.min(100, Math.round((item.quantity / (item.safetyStock * 3)) * 100))
        : 100;
      const barColor = statusClass === 'stable' ? 'var(--green)' : statusClass === 'critical' ? 'var(--red)' : 'var(--amber)';

      return `
        <tr data-id="${item.id}">
          <td>
            <div class="item-meta">
              <span class="item-name-text">${item.name}</span>
            </div>
          </td>
          <td><span class="item-sku-sub">${item.sku}</span></td>
          <td><span style="font-size:11px;">${item.category}</span></td>
          <td class="text-right">
            <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;">
              <strong class="mono">${Utils.formatNum(item.quantity)}</strong>
              <div style="width:60px;height:3px;background:rgba(255,255,255,0.08);border-radius:2px;">
                <div style="width:${pct}%;height:100%;background:${barColor};border-radius:2px;transition:width 0.4s;"></div>
              </div>
            </div>
          </td>
          <td class="text-right text-muted mono" style="font-size:11px;">${Utils.formatNum(item.safetyStock)} ${item.unit}</td>
          <td><span class="status-pill ${statusClass}">${statusLabel}</span></td>
          <td class="text-center">
            <div class="actions-cell">
              <button class="btn-table-action adjust" data-id="${item.id}" title="Manage stock"><i class="fa-solid fa-right-left"></i></button>
              <button class="btn-table-action edit" data-id="${item.id}" title="Edit item"><i class="fa-regular fa-pen-to-square"></i></button>
              <button class="btn-table-action delete" data-id="${item.id}" title="Delete item"><i class="fa-regular fa-trash-can"></i></button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('.btn-table-action.edit').forEach(btn => {
      btn.onclick = () => onEdit(btn.dataset.id);
    });
    tbody.querySelectorAll('.btn-table-action.delete').forEach(btn => {
      btn.onclick =() => onDelete(btn.dataset.id);
    });
    tbody.querySelectorAll('.btn-table-action.adjust').forEach(btn => {
      btn.onclick = () => onAdjust(btn.dataset.id);
    });
  }

  function renderTransactionsTable(tableBodyId, txs) {
    const tbody = document.getElementById(tableBodyId);
    if (!tbody) return;

    if (!txs || txs.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted" style="padding:32px;">No transaction logs available.</td></tr>`;
      return;
    }

    const sorted = [...txs].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    tbody.innerHTML = sorted.map(tx => {
      const isUsage = tx.type === 'usage';
      const label= isUsage ? 'Usage' : 'Restock';
      const qtyClass = isUsage ? 'text-red' : 'text-green';
      const prefix = isUsage ? '−' : '+';

      return `
        <tr>
          <td><span class="text-muted mono" style="font-size:11px;">${Utils.formatDate(tx.timestamp)}</span></td>
          <td><span class="item-sku-sub">${tx.itemSku || '—'}</span></td>
          <td><strong style="font-size:12px;">${tx.itemName}</strong></td>
          <td><span class="tx-badge ${tx.type}">${label}</span></td>
          <td class="text-right">
            <strong class="${qtyClass} mono">${prefix}${tx.quantity}</strong>
            <span class="text-muted" style="font-size:10px;"> ${tx.unit}</span>
          </td>
          <td style="font-size:12px;">${tx.username}</td>
          <td class="text-muted" style="font-size:11px; max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${tx.notes || '—'}</td>
        </tr>
      `;
    }).join('');
  }

  function renderProjectionsTable(tableBodyId, projections, multiplier = 1.0) {
    const tbody = document.getElementById(tableBodyId);
    if (!tbody) return;

    if (!projections || projections.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted" style="padding:32px;">No projection data found.</td></tr>`;
      return;
    }

    tbody.innerHTML = projections.map(proj => {
      const simAvg = proj.avgDailyUsage * multiplier;
      const now = new Date();
      let simDays = -1, simDate = null;
      let status = 'Stable', statusClass = 'stable';

      if (proj.quantity === 0) {
        simDays = 0; simDate = now.toISOString();
        status = 'Depleted'; statusClass = 'depleted';
      } else if (simAvg > 0) {
        simDays = proj.quantity / simAvg;
        const dep = new Date();
        dep.setDate(now.getDate() + Math.round(Math.min(simDays, 36500)));
        simDate = dep.toISOString();

        if (simDays <= 3) { status = 'Critical'; statusClass = 'critical'; }
        else if (simDays <= 7) { status = 'Warning';  statusClass = 'warning'; }
        else if (proj.quantity <= proj.safetyStock) { status = 'Low Stock'; statusClass = 'warning'; }
      } else {
        status = proj.quantity <= proj.safetyStock ? 'Low Stock' : 'Stable';
        statusClass = proj.quantity <= proj.safetyStock ? 'warning'   : 'stable';
      }

      const lifespanText = simDays === 0 ? 'Empty'
        : simDays > 0 ? `${simDays.toFixed(1)} days` : 'Indefinite';

      const depDateText = simDays === 0 ? 'Immediately'
        : simDate ? Utils.formatDateOnly(simDate) : 'N/A';

      const depColor = statusClass === 'critical' || statusClass === 'depleted'
        ? 'var(--red)' : statusClass === 'warning' ? 'var(--amber)' : 'var(--green)';

      return `
        <tr>
          <td>
            <div class="item-meta">
              <span class="item-name-text">${proj.name}</span>
              <span class="item-sku-sub">SKU: ${proj.sku} &middot; ${proj.category}</span>
            </div>
          </td>
          <td class="text-right">
            <strong class="mono">${Utils.formatNum(proj.quantity)}</strong>
            <span class="text-muted" style="font-size:10px;"> / ${Utils.formatNum(proj.safetyStock)} ${proj.unit}</span>
          </td>
          <td class="text-right mono" style="font-size:11px;">
            ${simAvg.toFixed(2)} ${proj.unit}/day
            ${multiplier !== 1.0 ? `<br><span class="text-muted" style="text-decoration:line-through;font-size:10px;">${proj.avgDailyUsage.toFixed(2)}</span>` : ''}
          </td>
          <td class="text-right">
            <strong class="mono" style="font-size:12px;">${lifespanText}</strong>
          </td>
          <td><span class="status-pill ${statusClass}">${status}</span></td>
          <td>
            <span style="color:${depColor};font-size:12px;">
              <i class="fa-regular fa-calendar-clock" style="margin-right:4px;"></i>${depDateText}
            </span>
          </td>
        </tr>
      `;
    }).join('');
  }

  function renderUsersTable(tableBodyId, users, onDelete) {
    const tbody = document.getElementById(tableBodyId);
    if (!tbody) return;

    if (!users || users.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted" style="padding:32px;">No system accounts found.</td></tr>`;
      return;
    }

    tbody.innerHTML = users.map(user => `
      <tr>
        <td><strong style="font-size:13px;">${user.username}</strong></td>
        <td><span class="status-pill ${user.role === 'admin' ? 'stable' : 'depleted'}">${user.role}</span></td>
        <td><span class="text-muted mono" style="font-size:11px;">${Utils.formatDate(user.createdAt)}</span></td>
        <td class="text-center">
          ${user.username === 'admin'
            ? `<span class="text-muted" style="font-size:10px;">Protected</span>`
            : `<button class="btn-table-action delete" data-id="${user.id}" title="Delete account"><i class="fa-regular fa-trash-can"></i></button>`
          }
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('.btn-table-action.delete').forEach(btn => {
      btn.onclick = () => onDelete(btn.dataset.id);
    });
  }

  return {
    renderLowStockAlerts,
    renderRecentTransactions,
    renderCategoryChart,
    renderInventoryTable,
    renderTransactionsTable,
    renderProjectionsTable,
    renderUsersTable,
  };
})();
