const Utils = (() => {

  function formatDate(isoString) {
    if (!isoString) return 'N/A';
    const date = new Date(isoString);
    return date.toLocaleDateString(undefined, {
      month: 'short', day: 'numeric', year: 'numeric'
    }) + ' ' + date.toLocaleTimeString(undefined, {
      hour: '2-digit', minute: '2-digit'
    });
  }

  function formatDateOnly(isoString) {
    if (!isoString) return 'N/A';
    const date = new Date(isoString);
    return date.toLocaleDateString(undefined, {
      month: 'short', day: 'numeric', year: 'numeric'
    });
  }

  function formatNum(value) {
    const num = parseFloat(value);
    if (isNaN(num)) return '0';
    return Number.isInteger(num) ? num.toString() : num.toFixed(2);
  }

  function showNotification(title, message, type = 'info') {
    const container = document.getElementById('notification-container');
    if (!container) return;

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;

    const icons = {
      info: 'fa-circle-info',
      success: 'fa-circle-check',
      warning: 'fa-triangle-exclamation',
      error: 'fa-circle-exclamation',
    };
    const iconClass = icons[type] || 'fa-circle-info';

    const iconColors = {
      info: 'var(--teal)',
      success: 'var(--green)',
      warning: 'var(--amber)',
      error: 'var(--red)',
    };

    notification.innerHTML = `
      <i class="fa-solid ${iconClass}" style="color:${iconColors[type] || 'var(--teal)'};font-size:16px;margin-top:1px;flex-shrink:0;"></i>
      <div class="notification-content">
        <h4>${title}</h4>
        <p>${message}</p>
      </div>
      <button class="notification-close"><i class="fa-solid fa-xmark"></i></button>
    `;

    notification.querySelector('.notification-close').onclick = () => dismiss(notification);
    container.appendChild(notification);

    setTimeout(() => dismiss(notification), 5000);
  }

  function dismiss(el) {
    if (!el.parentElement) return;
    el.style.animation = 'slideIn 0.25s cubic-bezier(0.25, 0.8, 0.25, 1) reverse';
    setTimeout(() => el.remove(), 250);
  }

  return { formatDate, formatDateOnly, formatNum, showNotification };
})();
