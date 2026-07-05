<template>
  <div class="dashboard-view">
    <div class="dashboard-view__container">
      <header class="dashboard-view__header">
        <h1>Tableau de bord</h1>
        <p class="dashboard-view__subtitle">Suivez votre progression pédagogique</p>
      </header>

      <!-- Stats cards -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-card__icon stat-card__icon--brand">
            <AppIcon name="chat" :size="20" />
          </div>
          <div class="stat-card__content">
            <span class="stat-card__value">{{ statsStore.stats.totalConversations }}</span>
            <span class="stat-card__label">Conversations</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-card__icon stat-card__icon--accent">
            <AppIcon name="list" :size="20" />
          </div>
          <div class="stat-card__content">
            <span class="stat-card__value">{{ statsStore.stats.totalMessages }}</span>
            <span class="stat-card__label">Messages échangés</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-card__icon stat-card__icon--success">
            <AppIcon name="target" :size="20" />
          </div>
          <div class="stat-card__content">
            <span class="stat-card__value">{{ statsStore.successRate }}%</span>
            <span class="stat-card__label">Taux de réussite</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-card__icon stat-card__icon--warning">
            <AppIcon name="clock" :size="20" />
          </div>
          <div class="stat-card__content">
            <span class="stat-card__value">{{ statsStore.formattedTimeSpent }}</span>
            <span class="stat-card__label">Temps passé</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-card__icon stat-card__icon--info">
            <AppIcon name="exercise" :size="20" />
          </div>
          <div class="stat-card__content">
            <span class="stat-card__value">{{ statsStore.stats.totalExercises }}</span>
            <span class="stat-card__label">Exercices réalisés</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-card__icon stat-card__icon--brand">
            <AppIcon name="cpu" :size="20" />
          </div>
          <div class="stat-card__content">
            <span class="stat-card__value">{{ formatTokens(statsStore.stats.tokensUsed) }}</span>
            <span class="stat-card__label">Tokens utilisés</span>
          </div>
        </div>
      </div>

      <!-- Activité 7 jours -->
      <div class="chart-card">
        <div class="chart-card__header">
          <h2>Activité des 7 derniers jours</h2>
          <div class="chart-card__legend">
            <span><i class="legend-dot legend-dot--brand"></i>Messages</span>
            <span><i class="legend-dot legend-dot--accent"></i>Exercices</span>
          </div>
        </div>
        <div class="chart-card__body">
          <canvas ref="activityChartRef"></canvas>
        </div>
      </div>

      <!-- Progression par domaine -->
      <div class="charts-grid">
        <div class="chart-card">
          <div class="chart-card__header">
            <h2><AppIcon name="database" :size="16" /> Progression SQL</h2>
            <span class="badge badge--brand">{{ databaseStats.successRate }}% réussite</span>
          </div>
          <div class="chart-card__body">
            <canvas ref="databaseChartRef"></canvas>
          </div>
        </div>

        <div class="chart-card">
          <div class="chart-card__header">
            <h2><AppIcon name="book" :size="16" /> Progression Français</h2>
            <span class="badge badge--brand">{{ frenchStats.successRate }}% réussite</span>
          </div>
          <div class="chart-card__body">
            <canvas ref="frenchChartRef"></canvas>
          </div>
        </div>
      </div>

      <!-- Répartition par mode -->
      <div class="charts-grid">
        <div class="chart-card">
          <div class="chart-card__header">
            <h2>Répartition des messages par mode</h2>
          </div>
          <div class="chart-card__body chart-card__body--half">
            <canvas ref="modeChartRef"></canvas>
          </div>
        </div>

        <div class="chart-card">
          <div class="chart-card__header">
            <h2>Détail par mode</h2>
          </div>
          <div class="chart-card__body chart-card__body--table">
            <table>
              <thead>
                <tr><th>Mode</th><th>Messages</th><th>Exercices</th><th>Réussite</th></tr>
              </thead>
              <tbody>
                <tr v-for="(m, key) in statsStore.stats.byMode" :key="key">
                  <td>{{ PROFILE_LABELS[key] || key }}</td>
                  <td>{{ m.messages }}</td>
                  <td>{{ m.exercises }}</td>
                  <td>{{ m.exercises ? Math.round(m.succeeded / m.exercises * 100) : 0 }}%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div v-if="statsStore.stats.totalMessages === 0" class="empty-dashboard">
        <AppIcon name="dashboard" :size="40" />
        <h3>Pas encore de données</h3>
        <p>Commencez à discuter avec le chatbot pour voir vos statistiques apparaître ici.</p>
        <BaseButton variant="primary" icon="chat" @click="$router.push('/chat')">
          Démarrer une conversation
        </BaseButton>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed, nextTick } from 'vue'
import { Chart, registerables } from 'chart.js'
import AppIcon from '@/components/ui/AppIcon.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { useStatsStore } from '@/stores/stats'
import { useThemeStore } from '@/stores/theme'
import { PROFILE_LABELS } from '@/services/prompts'

Chart.register(...registerables)

const statsStore = useStatsStore()
const themeStore = useThemeStore()

const activityChartRef = ref(null)
const databaseChartRef = ref(null)
const frenchChartRef = ref(null)
const modeChartRef = ref(null)

let charts = []

const databaseStats = computed(() => {
  const arr = statsStore.stats.progression.database
  const success = arr.filter(x => x.success).length
  const total = arr.length
  return {
    total,
    success,
    failed: total - success,
    successRate: total ? Math.round(success / total * 100) : 0
  }
})

const frenchStats = computed(() => {
  const arr = statsStore.stats.progression.french
  const success = arr.filter(x => x.success).length
  const total = arr.length
  return {
    total,
    success,
    failed: total - success,
    successRate: total ? Math.round(success / total * 100) : 0
  }
})

function formatTokens(n) {
  if (!n) return '0'
  if (n < 1000) return String(n)
  if (n < 1000000) return (n / 1000).toFixed(1) + 'k'
  return (n / 1000000).toFixed(2) + 'M'
}

function getChartColors() {
  const isDark = themeStore.isDark
  return {
    text: isDark ? '#b8c0cc' : '#4b5563',
    grid: isDark ? '#2a313c' : '#e5e7eb',
    brand: '#6366f1',
    accent: '#a855f7',
    success: '#10b981',
    warning: '#f59e0b',
    info: '#3b82f6',
    danger: '#ef4444'
  }
}

function buildActivityChart() {
  if (!activityChartRef.value) return
  const colors = getChartColors()
  const days = statsStore.last7Days

  new Chart(activityChartRef.value, {
    type: 'bar',
    data: {
      labels: days.map(d => d.label),
      datasets: [
        {
          label: 'Messages',
          data: days.map(d => d.messages),
          backgroundColor: colors.brand,
          borderRadius: 6
        },
        {
          label: 'Exercices',
          data: days.map(d => d.exercises),
          backgroundColor: colors.accent,
          borderRadius: 6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { mode: 'index', intersect: false }
      },
      scales: {
        x: { ticks: { color: colors.text }, grid: { display: false } },
        y: {
          beginAtZero: true,
          ticks: { color: colors.text, precision: 0 },
          grid: { color: colors.grid }
        }
      }
    }
  })
}

function buildProgressionChart(canvasRef, data, color) {
  if (!canvasRef) return
  const colors = getChartColors()

  // Regroupe par jour (succès vs échecs)
  const byDay = {}
  for (const item of data) {
    const day = item.date.slice(0, 10)
    if (!byDay[day]) byDay[day] = { success: 0, failed: 0 }
    if (item.success) byDay[day].success++
    else byDay[day].failed++
  }

  // 14 derniers jours
  const labels = []
  const successData = []
  const failedData = []
  for (let i = 13; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    labels.push(d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'numeric' }))
    successData.push(byDay[key]?.success || 0)
    failedData.push(byDay[key]?.failed || 0)
  }

  new Chart(canvasRef, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Réussites',
          data: successData,
          borderColor: colors.success,
          backgroundColor: colors.success + '22',
          fill: true,
          tension: 0.3,
          pointRadius: 3
        },
        {
          label: 'Échecs',
          data: failedData,
          borderColor: colors.danger,
          backgroundColor: colors.danger + '22',
          fill: true,
          tension: 0.3,
          pointRadius: 3
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: colors.text, boxWidth: 12 } },
        tooltip: { mode: 'index', intersect: false }
      },
      scales: {
        x: { ticks: { color: colors.text }, grid: { display: false } },
        y: {
          beginAtZero: true,
          ticks: { color: colors.text, precision: 0 },
          grid: { color: colors.grid }
        }
      }
    }
  })
}

function buildModeChart() {
  if (!modeChartRef.value) return
  const colors = getChartColors()
  const byMode = statsStore.stats.byMode
  const labels = []
  const data = []
  const colorMap = {
    database: colors.brand,
    french: colors.accent,
    mixed: colors.info,
    free: colors.text
  }
  const bgColors = []

  for (const [key, value] of Object.entries(byMode)) {
    if (value.messages > 0) {
      labels.push(PROFILE_LABELS[key] || key)
      data.push(value.messages)
      bgColors.push(colorMap[key] || colors.brand)
    }
  }

  if (data.length === 0) {
    labels.push('Aucune donnée')
    data.push(1)
    bgColors.push(colors.grid)
  }

  new Chart(modeChartRef.value, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: bgColors,
        borderColor: 'transparent',
        borderWidth: 2,
        hoverOffset: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: colors.text, padding: 12, boxWidth: 12, font: { size: 11 } }
        }
      },
      cutout: '60%'
    }
  })
}

function buildAllCharts() {
  // Détruit les anciens
  charts.forEach(c => c.destroy?.())
  charts = []

  // Construit les nouveaux après le prochain tick
  nextTick(() => {
    if (activityChartRef.value) {
      const chart = buildActivityChart()
      if (chart) charts.push(chart)
    }
    if (databaseChartRef.value) {
      const chart = buildProgressionChart(
        databaseChartRef.value,
        statsStore.stats.progression.database,
        'database'
      )
      if (chart) charts.push(chart)
    }
    if (frenchChartRef.value) {
      const chart = buildProgressionChart(
        frenchChartRef.value,
        statsStore.stats.progression.french,
        'french'
      )
      if (chart) charts.push(chart)
    }
    if (modeChartRef.value) {
      const chart = buildModeChart()
      if (chart) charts.push(chart)
    }
  })
}

onMounted(buildAllCharts)

onBeforeUnmount(() => {
  charts.forEach(c => c.destroy?.())
})
</script>

<style scoped>
.dashboard-view {
  height: 100%;
  overflow-y: auto;
  padding: var(--space-6) var(--space-4);
}
.dashboard-view__container {
  max-width: 1100px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.dashboard-view__header h1 {
  font-size: var(--fs-2xl);
  font-weight: 600;
  color: var(--text-primary);
}
.dashboard-view__subtitle {
  color: var(--text-secondary);
  font-size: var(--fs-sm);
  margin-top: 4px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: var(--space-3);
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: var(--space-4);
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
}
.stat-card__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px; height: 40px;
  border-radius: var(--radius-md);
  flex-shrink: 0;
}
.stat-card__icon--brand   { background: rgba(99,102,241,0.12); color: var(--brand-600); }
.stat-card__icon--accent  { background: rgba(168,85,247,0.12); color: var(--accent-600); }
.stat-card__icon--success { background: rgba(16,185,129,0.12); color: var(--success); }
.stat-card__icon--warning { background: rgba(245,158,11,0.12); color: var(--warning); }
.stat-card__icon--info    { background: rgba(59,130,246,0.12); color: var(--info); }

.stat-card__content { display: flex; flex-direction: column; }
.stat-card__value {
  font-size: var(--fs-2xl);
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1;
  font-variant-numeric: tabular-nums;
}
.stat-card__label {
  font-size: var(--fs-xs);
  color: var(--text-muted);
  margin-top: 2px;
}

.chart-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: var(--space-4);
}
.chart-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-3);
  flex-wrap: wrap;
  gap: 8px;
}
.chart-card__header h2 {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: var(--fs-base);
  font-weight: 600;
  color: var(--text-primary);
}
.chart-card__header svg { color: var(--brand-600); }

.chart-card__legend {
  display: flex;
  gap: 12px;
  font-size: var(--fs-xs);
  color: var(--text-secondary);
}
.legend-dot {
  display: inline-block;
  width: 10px; height: 10px;
  border-radius: 3px;
  margin-right: 4px;
  vertical-align: middle;
}
.legend-dot--brand { background: var(--brand-500); }
.legend-dot--accent { background: var(--accent-500); }

.chart-card__body {
  position: relative;
  height: 240px;
}
.chart-card__body--half { height: 260px; }

.chart-card__body--table {
  height: auto;
}

.chart-card__body--table table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--fs-sm);
}
.chart-card__body--table th,
.chart-card__body--table td {
  padding: 8px 10px;
  text-align: left;
  border-bottom: 1px solid var(--border-color);
}
.chart-card__body--table th {
  color: var(--text-muted);
  font-weight: 500;
  font-size: var(--fs-xs);
}
.chart-card__body--table td { color: var(--text-primary); }

.charts-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
}
@media (max-width: 768px) {
  .charts-grid { grid-template-columns: 1fr; }
}

.empty-dashboard {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: var(--space-12) var(--space-4);
  text-align: center;
  color: var(--text-muted);
}
.empty-dashboard svg { color: var(--brand-600); }
.empty-dashboard h3 {
  font-size: var(--fs-xl);
  color: var(--text-primary);
}
.empty-dashboard p { color: var(--text-secondary); max-width: 400px; }
</style>
