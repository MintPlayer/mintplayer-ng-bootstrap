import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './styles.css';
import router from './router';
import { createApp } from 'vue';
import App from './app/App.vue';

const app = createApp(App);
app.use(router);
app.mount('#root');
