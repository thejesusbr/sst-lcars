import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import App from './App.vue'
import './assets/css/colors.css'
import './assets/css/lcars-sdk.css'
import './assets/css/theme.css'
import './assets/css/module.css'
import './assets/css/widgets.css'
import './assets/css/themes/tos.css'
import './assets/css/themes/first-contact.css'
import './assets/css/themes/nemesis.css'
import './assets/css/themes/enterprise-nx01.css'
import './assets/css/themes/29th-century.css'
import './assets/css/themes/23rd-century.css'
import './assets/css/themes/picard.css'

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

createApp(App).use(pinia).mount('#app')
