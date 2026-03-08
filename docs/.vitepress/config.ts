import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'willhaben-cli',
  description: 'Unofficial CLI for willhaben.at - Austrian marketplace',

  base: '/willhaben-cli/',

  head: [
    ['meta', { name: 'theme-color', content: '#03A4E8' }],
    ['meta', { name: 'og:type', content: 'website' }],
    ['meta', { name: 'og:site_name', content: 'willhaben-cli' }],
  ],

  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'Commands', link: '/commands/' },
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Introduction',
          items: [
            { text: 'Getting Started', link: '/guide/getting-started' },
            { text: 'Installation', link: '/guide/installation' },
            { text: 'Configuration', link: '/guide/configuration' },
          ]
        }
      ],
      '/commands/': [
        {
          text: 'Commands',
          items: [
            { text: 'Overview', link: '/commands/' },
            { text: 'login', link: '/commands/login' },
            { text: 'logout', link: '/commands/logout' },
            { text: 'whoami', link: '/commands/whoami' },
            { text: 'list', link: '/commands/list' },
            { text: 'get', link: '/commands/get' },
            { text: 'publish', link: '/commands/publish' },
            { text: 'update', link: '/commands/update' },
            { text: 'delete', link: '/commands/delete' },
            { text: 'images', link: '/commands/images' },
            { text: 'config', link: '/commands/config' },
          ]
        }
      ],
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/tomLadder/willhaben-cli' }
    ],

    footer: {
      message: 'Released under the MIT License. Not affiliated with willhaben.',
      copyright: 'Made with ❤️ in Austria'
    },

    search: {
      provider: 'local'
    }
  }
})
