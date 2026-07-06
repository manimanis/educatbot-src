import { createRouter, createWebHashHistory } from 'vue-router'

// Routes de l'application
// Hash history utilisée pour fonctionner sans configuration serveur (100% frontend)
const routes = [
  {
    path: '/',
    redirect: '/chat'
  },
  {
    path: '/chat',
    name: 'chat',
    component: () => import('@/views/ChatView.vue'),
    meta: { title: 'Conversation', icon: 'chat' }
  },
  {
    path: '/exercises',
    name: 'exercises',
    component: () => import('@/views/ExercisesView.vue'),
    meta: { title: 'Exercices', icon: 'exercise' }
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    component: () => import('@/views/DashboardView.vue'),
    meta: { title: 'Tableau de bord', icon: 'dashboard' }
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('@/views/SettingsView.vue'),
    meta: { title: 'Paramètres', icon: 'settings' }
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/chat'
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  }
})

router.afterEach((to) => {
  document.title = to.meta?.title
    ? `${to.meta.title} — ÉduChatBot`
    : 'ÉduChatBot — SQL, Français & Algorithmique'
})

export default router
