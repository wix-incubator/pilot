// @ts-check
// `@type` JSDoc annotations allow editor autocompletion and type checking
// (when paired with `@ts-check`).
// There are various equivalent ways to declare your Docusaurus config.
// See: https://docusaurus.io/docs/api/docusaurus-config

import {themes as prismThemes} from 'prism-react-renderer';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Wix Pilot',
  tagline: 'Simplify your testing with intuitive, natural language commands for faster and more efficient automation.',
  favicon: '/img/paper-plane.svg',

  // Set the production url of your site here
  url: 'https://wix-pilot.com',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/',
  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'wix-incubator', // Usually your GitHub org/user name.
  projectName: 'pilot', // Usually your repo name.

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  plugins: ['docusaurus-plugin-sass'],

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          // Please change this to your repo.
          editUrl:
            'https://github.com/wix-incubator/pilot/tree/master/website/',
        },
        theme: {
          customCss: './src/css/custom.scss',
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      // Enable image zoom for documentation
      image: 'img/paper-plane.svg',
      metadata: [
        {name: 'keywords', content: 'testing, automation, natural language, ui testing, test automation, frameworks'},
        {name: 'description', content: 'Write UI tests in natural language with Pilot - simplifying test automation for web and mobile apps.'}
      ],
      colorMode: {
        defaultMode: 'dark',
        disableSwitch: false,
        respectPrefersColorScheme: true,
      },
      navbar: {
        title: 'Wix Pilot',
        hideOnScroll: false,
        style: 'primary',
        items: [
          {
            type: 'doc',
            docId: 'guides/integrating-with-testing-frameworks',
            label: 'Getting Started',
            position: 'right',
          },
          {
            type: 'doc',
            docId: 'guides/pilot-best-practices',
            label: 'Guides',
            position: 'right',
          },
          {
            type: 'doc',
            docId: 'API/basic-interface-overview',
            label: 'API',
            position: 'right'
          },
          {
            type: 'doc',
            label: 'Frameworks',
            docId: 'pages/supported-frameworks',
            position: 'right',
          },
          {
            to: 'https://github.com/wix-incubator/pilot',
            position: 'right',
            className: 'header-github-link',
            'aria-label': 'GitHub repository'
          },
        ],
      },
      footer: {
        style: 'primary',
        links: [
          {
            title: 'Documentation',
            items: [
              {
                label: 'Getting Started',
                to: 'docs/guides/integrating-with-testing-frameworks'
              },
              {
                label: 'Best Practices',
                to: 'docs/guides/pilot-best-practices'
              },
              {
                label: 'API Reference',
                to: 'docs/API/basic-interface-overview'
              }
            ]
          },
          {
            title: 'Community',
            items: [
              {
                label: 'Contributing to Pilot',
                to: 'docs/guides/contributing-to-pilot'
              },
              {
                label: 'Stack Overflow',
                to: 'https://stackoverflow.com/questions/tagged/wix-pilot',
              },
              {
                label: 'Report Issues',
                to: 'https://github.com/wix-incubator/pilot/issues'
              }
            ]
          },
          {
            title: 'More',
            items: [
              {
                label: 'GitHub',
                to: 'https://github.com/wix-incubator/pilot',
                className: 'footer__link-item footer__link-item_git-hub',
              },
              {
                label: 'Supported Frameworks',
                to: 'docs/pages/supported-frameworks'
              }
              // Uncomment when these social links are available
              // {
              //   label: 'Twitter',
              //   to: 'https://twitter.com/WixEng/',
              //   className: 'footer__link-item footer__link-item_twitter',
              // },
              // {
              //   label: 'Discord',
              //   to: 'https://discord.gg/CkD5QKheF5',
              //   className: 'footer__link-item footer__link-item_discord',
              // }
            ]
          }
        ],
        copyright: `Copyright © ${new Date().getFullYear()} Wix. Built with Docusaurus.`,
      },
      docs: {
        sidebar: {
          hideable: true,
          autoCollapseCategories: true,
        },
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
        additionalLanguages: ['bash', 'diff', 'json'],
      },
    }),
};

export default config;
