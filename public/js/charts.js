const Charts = (() => {
  let categoryChartInstance = null;
  let activityChartInstance = null;
  const AMBER = 'hsl(38, 95%, 54%)';
  const TEAL = 'hsl(185, 85%, 50%)';
  const RED = 'hsl(4, 80%, 62%)';
  const PURPLE = 'hsl(262, 80%, 68%)';
  const GREEN = 'hsl(145, 72%, 48%)';
  const PALETTE = [PURPLE, TEAL, AMBER, RED, GREEN,
    'hsl(215,70%,60%)', 'hsl(320,70%,62%)', 'hsl(170,65%,48%)'];

  //chart defaults
  Chart.defaults.color = 'hsl(215, 10%, 45%)';
  Chart.defaults.font.family = "'Plus Jakarta Sans', sans-serif";
  Chart.defaults.font.size = 11;

  function tooltipStyle() {
    return {
      backgroundColor: 'rgba(12,18,36,0.92)',
      titleColor: 'hsl(210,20%,94%)',
      bodyColor: 'hsl(215,15%,65%)',
      borderColor: 'rgba(255,255,255,0.1)',
      borderWidth: 1,
      padding: 10,
      cornerRadius: 8,
      displayColors: true,
      boxWidth: 8, boxHeight: 8, boxPadding: 4,
    };
  }

  //chart bars
  function renderCategoryBar(canvasId, categoryCounts) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const categories = Object.keys(categoryCounts);
    if (categories.length === 0) {
      canvas.style.display = 'none';
      const fallback = document.getElementById('category-fallback-chart');
      if (fallback) fallback.style.display = 'flex';
      return;
    }

    canvas.style.display = 'block';
    const values = categories.map(c => categoryCounts[c]);
    const colors = categories.map((_, i) => PALETTE[i % PALETTE.length]);
    const alphaColors = colors.map(c => c.replace('hsl(', 'hsla(').replace(')', ', 0.18)'));

    if (categoryChartInstance) {
      categoryChartInstance.destroy();
      categoryChartInstance = null;
    }

    categoryChartInstance = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: categories,
        datasets: [{
          label: 'Items',
          data: values,
          backgroundColor: alphaColors,
          borderColor: colors,
          borderWidth: 1.5,
          borderRadius: 6,
          borderSkipped: false,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        animation: { duration: 600, easing: 'easeOutQuart' },
        plugins: {
          legend: { display: false },
          tooltip: { ...tooltipStyle(), callbacks: {
            label: ctx => ` ${ctx.parsed.y} item${ctx.parsed.y !== 1 ? 's' : ''}`
          }}
        },
        scales: {
          x: {
            grid: { color: 'rgba(255,255,255,0.04)', drawBorder: false },
            ticks: { color: 'hsl(215,10%,45%)', font: { size: 11 } },
            border: { color: 'rgba(255,255,255,0.06)' }
          },
          y: {
            beginAtZero: true,
            ticks: {
              color: 'hsl(215,10%,45%)', stepSize: 1,
              font: { family: "'JetBrains Mono', monospace", size: 10 }
            },
            grid: { color: 'rgba(255,255,255,0.05)', drawBorder: false },
            border: { dash: [4, 4], color: 'transparent' }
          }
        }
      }
    });
  }

  //activityt
  function renderActivityLine(canvasId, transactions) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const days = [];
    const usageCounts = [];
    const restockCounts = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      days.push(dateStr);

      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const dayEnd   = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
      const dayTxs = (transactions || []).filter(tx => {
        const t = new Date(tx.timestamp);
        return t >= dayStart && t < dayEnd;
      });

      usageCounts.push(dayTxs.filter(tx => tx.type === 'usage').length);
      restockCounts.push(dayTxs.filter(tx => tx.type === 'restock').length);
    }

    if (activityChartInstance) {
      activityChartInstance.destroy();
      activityChartInstance = null;
    }

    activityChartInstance = new Chart(canvas, {
      type: 'line',
      data: {
        labels: days,
        datasets: [
          {
            label: 'Restocks',
            data: restockCounts,
            borderColor: TEAL,
            backgroundColor: 'rgba(20, 210, 222, 0.08)',
            pointBackgroundColor: TEAL,
            pointBorderColor: 'transparent',
            pointRadius: 4,
            pointHoverRadius: 6,
            borderWidth: 2,
            tension: 0.4,
            fill: true,
          },
          {
            label: 'Usage',
            data: usageCounts,
            borderColor: RED,
            backgroundColor: 'rgba(239, 68, 68, 0.07)',
            pointBackgroundColor: RED,
            pointBorderColor: 'transparent',
            pointRadius: 4,
            pointHoverRadius: 6,
            borderWidth: 2,
            tension: 0.4,
            fill: true,
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        interaction: { mode: 'index', intersect: false },
        animation: { duration: 700, easing: 'easeOutQuart' },
        plugins: {
          legend: { display: false },
          tooltip: tooltipStyle()
        },
        scales: {
          x: {
            grid: { color: 'rgba(255,255,255,0.04)', drawBorder: false },
            ticks: { color: 'hsl(215,10%,45%)', font: { size: 10 } },
            border: { color: 'rgba(255,255,255,0.06)' }
          },
          y: {
            beginAtZero: true,
            ticks: {
              color: 'hsl(215,10%,45%)', stepSize: 1,
              font: { family: "'JetBrains Mono', monospace", size: 10 }
            },
            grid: { color: 'rgba(255,255,255,0.05)', drawBorder: false },
            border: { dash: [4, 4], color: 'transparent' }
          }
        }
      }
    });
  }

  function renderSparkline(containerId, values, color) {
    const container = document.getElementById(containerId);
    if (!container || !values || values.length < 2) return;

    const W = container.offsetWidth || 200;
    const H = 36;
    const max = Math.max(...values, 1);
    const min = Math.min(...values, 0);
    const range = max - min || 1;

    const pts = values.map((v, i) => {
      const x = (i / (values.length - 1)) * W;
      const y = H - ((v - min) / range) * (H - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    const polyline = pts.join(' ');
    const fillPts = `0,${H} ${polyline} ${W},${H}`;
    container.innerHTML = `
      <svg width="100%" height="${H}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="sg-${containerId}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${color}" stop-opacity="0.35"/>
            <stop offset="100%" stop-color="${color}" stop-opacity="0.0"/>
          </linearGradient>
        </defs>
        <polygon points="${fillPts}" fill="url(#sg-${containerId})"/>
        <polyline points="${polyline}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>
      </svg>
    `;
  }

  function animateCount(el, target) {
    if (!el) return;
    const start = parseInt(el.textContent) || 0;
    const duration = 550;
    const startTime = performance.now();

    function update(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(start + (target - start) * eased);
      if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
  }

  return {
    renderCategoryBar,
    renderActivityLine,
    renderSparkline,
    animateCount,
  };
})();
