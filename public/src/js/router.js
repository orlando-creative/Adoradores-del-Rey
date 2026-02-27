// router.js
import { createRouter, createWebHistory } from 'vue-router';
import Home from '../views/Home.vue';
import Songs from '../modules/songs/songs-ui.js';
import Repertoire from '../modules/repertoire/repertoire-ui.js';
import Auth from '../auth/auth-ui.js';

const routes = [
    { path: '/', component: Home },
    { path: '/songs', component: Songs },
    { path: '/repertoire', component: Repertoire },
    { path: '/auth', component: Auth }
];

const router = createRouter({
    history: createWebHistory(),
    routes
});

export default router;