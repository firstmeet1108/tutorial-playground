export const initFiles = {
  'package.json': {
    file: {
      contents: `
{
  "name": "vite-starter",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "devDependencies": {
    "vite": "^4.0.4",
    "vue": "^3.3.10",
    "@vitejs/plugin-vue": "^4.0.4"
  }
}`
    }
  },
  'index.html': {
    file: {
      contents: `
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Vite App</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>`
    }
  },
  'vite.config.js': {
    file: {
      contents: `
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
})
      `
    }
  },
  src: {
    directory: {
      'main.js': {
        file: {
          contents: `
            import { createApp } from 'vue'
            import App from './App.vue'

            createApp(App).mount('#app')
          `
        }
      },
      'App.vue': {
        file: {
          contents: `
            <template>
              <h1>Hello World</h1>
            </template>
          `
        }
      }
    }
  }
};
