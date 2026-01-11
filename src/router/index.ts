import { createRouter, createWebHistory } from 'vue-router'
import DeploymentsView from '../views/DeploymentsView.vue'
import DeploymentDetailView from '../views/DeploymentDetailView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/deployments'
    },
    {
      path: '/deployments',
      name: 'deployments',
      component: DeploymentsView,
    },
    {
      path: '/deployment/:twinId/:contractId',
      name: 'deployment-detail',
      component: DeploymentDetailView,
      props: true
    },
  ],
})

export default router
