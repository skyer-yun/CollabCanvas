/**
 * CollabCanvas — Design Systems Registry (v1.4)
 * 6 built-in design systems + local file import (CSS / JSON / Markdown)
 */
(function () {
  'use strict';

  // ────────────────────────────────────────────────────────────────
  //  6 Built-in Design Systems
  //  Each system has: name, description, version, tokens (colors/typography/spacing/radius/shadows)
  //  Optional: dark (dark theme overrides), rawMap (original CSS var → cc var mapping)
  // ────────────────────────────────────────────────────────────────

  var SYSTEMS = {

    // ── 1. Ant Design Pro ────────────────────────────────────────
    'ant-design-pro': {
      name: 'Ant Design Pro',
      description: '企业级中后台',
      version: '5.x',
      tokens: {
        colors: [
          { name: '--cc-primary', value: '#1677ff' },
          { name: '--cc-primary-hover', value: '#4096ff' },
          { name: '--cc-success', value: '#52c41a' },
          { name: '--cc-warning', value: '#faad14' },
          { name: '--cc-error', value: '#ff4d4f' },
          { name: '--cc-info', value: '#1677ff' },
          { name: '--cc-text', value: 'rgba(0,0,0,0.88)' },
          { name: '--cc-text-secondary', value: 'rgba(0,0,0,0.65)' },
          { name: '--cc-text-tertiary', value: 'rgba(0,0,0,0.45)' },
          { name: '--cc-bg', value: '#ffffff' },
          { name: '--cc-bg-secondary', value: '#f5f5f5' },
          { name: '--cc-border', value: '#d9d9d9' },
          { name: '--cc-border-secondary', value: '#f0f0f0' },
          { name: '--cc-bg-hover', value: '#e6f4ff' },
          { name: '--cc-bg-success', value: '#f6ffed' },
          { name: '--cc-bg-warning', value: '#fffbe6' },
          { name: '--cc-bg-error', value: '#fff2f0' }
        ],
        typography: [
          { name: '--cc-font-family', value: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans SC', sans-serif" },
          { name: '--cc-font-size-xs', value: '12px' },
          { name: '--cc-font-size-sm', value: '13px' },
          { name: '--cc-font-size-base', value: '14px' },
          { name: '--cc-font-size-lg', value: '16px' },
          { name: '--cc-font-size-xl', value: '20px' },
          { name: '--cc-font-size-2xl', value: '28px' },
          { name: '--cc-line-height', value: '1.5715' },
          { name: '--cc-font-weight-normal', value: '400' },
          { name: '--cc-font-weight-medium', value: '500' },
          { name: '--cc-font-weight-semibold', value: '600' }
        ],
        spacing: [
          { name: '--cc-spacing-xs', value: '4px' },
          { name: '--cc-spacing-sm', value: '8px' },
          { name: '--cc-spacing-md', value: '12px' },
          { name: '--cc-spacing-base', value: '16px' },
          { name: '--cc-spacing-lg', value: '24px' },
          { name: '--cc-spacing-xl', value: '32px' }
        ],
        radius: [
          { name: '--cc-radius-sm', value: '4px' },
          { name: '--cc-radius-base', value: '6px' },
          { name: '--cc-radius-lg', value: '8px' }
        ],
        shadows: [
          { name: '--cc-shadow-sm', value: '0 1px 2px rgba(0,0,0,0.06)' },
          { name: '--cc-shadow-md', value: '0 4px 12px rgba(0,0,0,0.08)' },
          { name: '--cc-shadow-lg', value: '0 8px 24px rgba(0,0,0,0.12)' }
        ]
      },
      aliasMap: {
        '--colorPrimary': '--cc-primary',
        '--colorPrimaryHover': '--cc-primary-hover',
        '--colorSuccess': '--cc-success',
        '--colorWarning': '--cc-warning',
        '--colorError': '--cc-error',
        '--colorInfo': '--cc-info',
        '--colorText': '--cc-text',
        '--colorTextSecondary': '--cc-text-secondary',
        '--colorTextTertiary': '--cc-text-tertiary',
        '--colorBgContainer': '--cc-bg',
        '--colorBgElevated': '--cc-bg-secondary',
        '--colorBorder': '--cc-border',
        '--colorBorderSecondary': '--cc-border-secondary',
        '--colorBgTextHover': '--cc-bg-hover',
        '--fontFamily': '--cc-font-family',
        '--fontSize': '--cc-font-size-base',
        '--fontSizeSM': '--cc-font-size-sm',
        '--fontSizeLG': '--cc-font-size-lg',
        '--fontSizeXL': '--cc-font-size-xl',
        '--lineHeight': '--cc-line-height',
        '--borderRadius': '--cc-radius-base',
        '--boxShadow': '--cc-shadow-sm',
        '--boxShadowSecondary': '--cc-shadow-md'
      },
      dark: {
        colors: [
          { name: '--cc-primary', value: '#1668dc' },
          { name: '--cc-primary-hover', value: '#3c8adb' },
          { name: '--cc-text', value: 'rgba(255,255,255,0.88)' },
          { name: '--cc-text-secondary', value: 'rgba(255,255,255,0.65)' },
          { name: '--cc-bg', value: '#141414' },
          { name: '--cc-bg-secondary', value: '#1f1f1f' },
          { name: '--cc-border', value: '#424242' }
        ]
      }
    },

    // ── 2. TDesign ───────────────────────────────────────────────
    'tdesign': {
      name: 'TDesign',
      description: '腾讯系企业级',
      version: 'Web',
      tokens: {
        colors: [
          { name: '--cc-primary', value: '#0052d9' },
          { name: '--cc-primary-hover', value: '#366ef4' },
          { name: '--cc-primary-active', value: '#003cab' },
          { name: '--cc-primary-disabled', value: '#b5c7ff' },
          { name: '--cc-success', value: '#008858' },
          { name: '--cc-warning', value: '#e37318' },
          { name: '--cc-error', value: '#d54941' },
          { name: '--cc-text', value: 'rgba(0,0,0,0.9)' },
          { name: '--cc-text-secondary', value: 'rgba(0,0,0,0.6)' },
          { name: '--cc-text-placeholder', value: 'rgba(0,0,0,0.4)' },
          { name: '--cc-text-disabled', value: 'rgba(0,0,0,0.26)' },
          { name: '--cc-text-link', value: '#003cab' },
          { name: '--cc-bg', value: '#ffffff' },
          { name: '--cc-bg-secondary', value: '#f3f3f3' },
          { name: '--cc-bg-page', value: '#eeeeee' },
          { name: '--cc-border', value: '#e8e8e8' },
          { name: '--cc-border-secondary', value: '#dddddd' },
          { name: '--cc-brand-light', value: '#f2f3ff' }
        ],
        typography: [
          { name: '--cc-font-family', value: "PingFang SC, Microsoft YaHei, Arial Regular" },
          { name: '--cc-font-size-xs', value: '12px' },
          { name: '--cc-font-size-sm', value: '14px' },
          { name: '--cc-font-size-base', value: '14px' },
          { name: '--cc-font-size-lg', value: '16px' },
          { name: '--cc-font-size-xl', value: '18px' },
          { name: '--cc-font-size-2xl', value: '20px' },
          { name: '--cc-font-size-3xl', value: '24px' },
          { name: '--cc-font-size-4xl', value: '28px' }
        ],
        spacing: [
          { name: '--cc-spacing-xs', value: '4px' },
          { name: '--cc-spacing-sm', value: '8px' },
          { name: '--cc-spacing-md', value: '12px' },
          { name: '--cc-spacing-base', value: '16px' },
          { name: '--cc-spacing-lg', value: '24px' },
          { name: '--cc-spacing-xl', value: '32px' }
        ],
        radius: [
          { name: '--cc-radius-sm', value: '3px' },
          { name: '--cc-radius-base', value: '6px' },
          { name: '--cc-radius-lg', value: '9px' }
        ],
        shadows: [
          { name: '--cc-shadow-sm', value: '0 1px 4px rgba(0,0,0,0.08)' },
          { name: '--cc-shadow-md', value: '0 4px 12px rgba(0,0,0,0.1)' },
          { name: '--cc-shadow-lg', value: '0 8px 24px rgba(0,0,0,0.12)' }
        ]
      },
      aliasMap: {
        '--td-brand-color': '--cc-primary',
        '--td-brand-color-hover': '--cc-primary-hover',
        '--td-brand-color-active': '--cc-primary-active',
        '--td-brand-color-disabled': '--cc-primary-disabled',
        '--td-success-color': '--cc-success',
        '--td-warning-color': '--cc-warning',
        '--td-error-color': '--cc-error',
        '--td-text-color-primary': '--cc-text',
        '--td-text-color-secondary': '--cc-text-secondary',
        '--td-text-color-placeholder': '--cc-text-placeholder',
        '--td-text-color-disabled': '--cc-text-disabled',
        '--td-bg-color-container': '--cc-bg',
        '--td-bg-color-secondarycontainer': '--cc-bg-secondary',
        '--td-bg-color-page': '--cc-bg-page',
        '--td-border-level-2-color': '--cc-border',
        '--td-comp-paddingLR-s': '--cc-spacing-sm',
        '--td-comp-paddingLR-m': '--cc-spacing-md',
        '--td-comp-paddingLR-l': '--cc-spacing-base',
        '--td-radius-small': '--cc-radius-sm',
        '--td-radius-default': '--cc-radius-base',
        '--td-radius-large': '--cc-radius-lg',
        '--td-shadow-1': '--cc-shadow-sm',
        '--td-shadow-2': '--cc-shadow-md',
        '--td-shadow-3': '--cc-shadow-lg',
        '--td-font-family': '--cc-font-family',
        '--td-font-size-link-small': '--cc-font-size-xs',
        '--td-font-size-body-small': '--cc-font-size-sm',
        '--td-font-size-body-medium': '--cc-font-size-base',
        '--td-font-size-body-large': '--cc-font-size-lg'
      },
      dark: {
        colors: [
          { name: '--cc-primary', value: '#4582e6' },
          { name: '--cc-primary-hover', value: '#5e97f0' },
          { name: '--cc-text', value: 'rgba(255,255,255,0.9)' },
          { name: '--cc-text-secondary', value: 'rgba(255,255,255,0.6)' },
          { name: '--cc-bg', value: '#181818' },
          { name: '--cc-bg-secondary', value: '#242424' },
          { name: '--cc-bg-page', value: '#181818' },
          { name: '--cc-border', value: '#393939' }
        ]
      }
    },

    // ── 3. Element Plus ──────────────────────────────────────────
    'element-plus': {
      name: 'Element Plus',
      description: 'Vue 生态 / 政企',
      version: '2.x',
      tokens: {
        colors: [
          { name: '--cc-primary', value: '#409eff' },
          { name: '--cc-primary-light', value: '#79bbff' },
          { name: '--cc-primary-lighter', value: '#a0cfff' },
          { name: '--cc-primary-dark', value: '#337ecc' },
          { name: '--cc-success', value: '#67c23a' },
          { name: '--cc-warning', value: '#e6a23c' },
          { name: '--cc-error', value: '#f56c6c' },
          { name: '--cc-info', value: '#909399' },
          { name: '--cc-text', value: '#303133' },
          { name: '--cc-text-secondary', value: '#606266' },
          { name: '--cc-text-placeholder', value: '#a8abb2' },
          { name: '--cc-text-disabled', value: '#c0c4cc' },
          { name: '--cc-bg', value: '#ffffff' },
          { name: '--cc-bg-secondary', value: '#f2f3f5' },
          { name: '--cc-border', value: '#dcdfe6' },
          { name: '--cc-border-light', value: '#e4e7ed' },
          { name: '--cc-border-lighter', value: '#ebeef5' },
          { name: '--cc-fill', value: '#f0f2f5' }
        ],
        typography: [
          { name: '--cc-font-family', value: '"Helvetica Neue", Helvetica, "PingFang SC", "Microsoft YaHei", sans-serif' },
          { name: '--cc-font-size-xs', value: '12px' },
          { name: '--cc-font-size-sm', value: '13px' },
          { name: '--cc-font-size-base', value: '14px' },
          { name: '--cc-font-size-lg', value: '16px' },
          { name: '--cc-font-size-xl', value: '20px' },
          { name: '--cc-line-height', value: '1.5' }
        ],
        spacing: [
          { name: '--cc-spacing-xs', value: '4px' },
          { name: '--cc-spacing-sm', value: '8px' },
          { name: '--cc-spacing-md', value: '12px' },
          { name: '--cc-spacing-base', value: '16px' },
          { name: '--cc-spacing-lg', value: '20px' },
          { name: '--cc-spacing-xl', value: '24px' },
          { name: '--cc-spacing-2xl', value: '32px' }
        ],
        radius: [
          { name: '--cc-radius-sm', value: '2px' },
          { name: '--cc-radius-base', value: '4px' },
          { name: '--cc-radius-round', value: '20px' }
        ],
        shadows: [
          { name: '--cc-shadow-sm', value: '0 0 6px rgba(0,0,0,0.12)' },
          { name: '--cc-shadow-md', value: '0 0 12px rgba(0,0,0,0.12)' },
          { name: '--cc-shadow-lg', value: '0 12px 32px 4px rgba(0,0,0,0.04), 0 8px 20px rgba(0,0,0,0.08)' }
        ]
      },
      aliasMap: {
        '--el-color-primary': '--cc-primary',
        '--el-color-primary-light-3': '--cc-primary-light',
        '--el-color-primary-light-5': '--cc-primary-lighter',
        '--el-color-primary-dark-2': '--cc-primary-dark',
        '--el-color-success': '--cc-success',
        '--el-color-warning': '--cc-warning',
        '--el-color-danger': '--cc-error',
        '--el-color-info': '--cc-info',
        '--el-text-color-primary': '--cc-text',
        '--el-text-color-regular': '--cc-text-secondary',
        '--el-text-color-placeholder': '--cc-text-placeholder',
        '--el-text-color-disabled': '--cc-text-disabled',
        '--el-bg-color': '--cc-bg',
        '--el-bg-color-page': '--cc-bg-secondary',
        '--el-border-color': '--cc-border',
        '--el-border-color-light': '--cc-border-light',
        '--el-border-color-lighter': '--cc-border-lighter',
        '--el-fill-color': '--cc-fill',
        '--el-font-family': '--cc-font-family',
        '--el-font-size-extra-small': '--cc-font-size-xs',
        '--el-font-size-small': '--cc-font-size-sm',
        '--el-font-size-base': '--cc-font-size-base',
        '--el-font-size-medium': '--cc-font-size-lg',
        '--el-font-size-large': '--cc-font-size-xl',
        '--el-border-radius-base': '--cc-radius-base',
        '--el-border-radius-small': '--cc-radius-sm',
        '--el-border-radius-round': '--cc-radius-round',
        '--el-box-shadow': '--cc-shadow-sm',
        '--el-box-shadow-light': '--cc-shadow-md'
      },
      dark: {
        colors: [
          { name: '--cc-primary', value: '#409eff' },
          { name: '--cc-text', value: '#e5eaf3' },
          { name: '--cc-text-secondary', value: '#cfd3dc' },
          { name: '--cc-bg', value: '#141414' },
          { name: '--cc-bg-secondary', value: '#0a0a0a' },
          { name: '--cc-border', value: '#4c4d4f' },
          { name: '--cc-fill', value: '#303030' }
        ]
      }
    },

    // ── 4. Arco Design ───────────────────────────────────────────
    'arco-design': {
      name: 'Arco Design',
      description: '字节系 / 现代后台',
      version: '2.x',
      tokens: {
        colors: [
          { name: '--cc-primary', value: '#165dff' },
          { name: '--cc-primary-hover', value: '#4080ff' },
          { name: '--cc-primary-active', value: '#0e42d2' },
          { name: '--cc-success', value: '#00b42a' },
          { name: '--cc-warning', value: '#ff7d00' },
          { name: '--cc-error', value: '#f53f3f' },
          { name: '--cc-info', value: '#86909c' },
          { name: '--cc-text', value: '#1d2129' },
          { name: '--cc-text-secondary', value: '#4e5969' },
          { name: '--cc-text-tertiary', value: '#86909c' },
          { name: '--cc-bg', value: '#ffffff' },
          { name: '--cc-bg-secondary', value: '#f7f8fa' },
          { name: '--cc-bg-tertiary', value: '#f2f3f5' },
          { name: '--cc-border', value: '#e5e6eb' },
          { name: '--cc-border-light', value: '#f2f3f5' },
          { name: '--cc-fill', value: '#f7f8fa' }
        ],
        typography: [
          { name: '--cc-font-family', value: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif' },
          { name: '--cc-font-size-xs', value: '12px' },
          { name: '--cc-font-size-sm', value: '13px' },
          { name: '--cc-font-size-base', value: '14px' },
          { name: '--cc-font-size-lg', value: '16px' },
          { name: '--cc-font-size-xl', value: '20px' },
          { name: '--cc-font-size-2xl', value: '36px' },
          { name: '--cc-line-height', value: '1.5715' }
        ],
        spacing: [
          { name: '--cc-spacing-xs', value: '2px' },
          { name: '--cc-spacing-sm', value: '4px' },
          { name: '--cc-spacing-md', value: '8px' },
          { name: '--cc-spacing-base', value: '12px' },
          { name: '--cc-spacing-lg', value: '16px' },
          { name: '--cc-spacing-xl', value: '20px' },
          { name: '--cc-spacing-2xl', value: '24px' },
          { name: '--cc-spacing-3xl', value: '32px' }
        ],
        radius: [
          { name: '--cc-radius-xs', value: '2px' },
          { name: '--cc-radius-sm', value: '4px' },
          { name: '--cc-radius-base', value: '8px' },
          { name: '--cc-radius-lg', value: '16px' }
        ],
        shadows: [
          { name: '--cc-shadow-sm', value: '0 4px 10px rgba(0,0,0,0.1)' },
          { name: '--cc-shadow-md', value: '0 8px 20px rgba(0,0,0,0.1)' },
          { name: '--cc-shadow-lg', value: '0 12px 32px rgba(0,0,0,0.1)' }
        ]
      },
      aliasMap: {
        '--arcoblue-6': '--cc-primary',
        '--arcoblue-5': '--cc-primary-hover',
        '--arcoblue-7': '--cc-primary-active',
        '--color-primary-light-1': '--cc-bg-hover',
        '--green-6': '--cc-success',
        '--orange-6': '--cc-warning',
        '--red-6': '--cc-error',
        '--gray-6': '--cc-info',
        '--color-text-1': '--cc-text',
        '--color-text-2': '--cc-text-secondary',
        '--color-text-3': '--cc-text-tertiary',
        '--color-bg-1': '--cc-bg',
        '--color-bg-2': '--cc-bg-secondary',
        '--color-bg-3': '--cc-bg-tertiary',
        '--color-border': '--cc-border',
        '--color-border-light': '--cc-border-light',
        '--color-fill-2': '--cc-fill',
        '--border-radius-small': '--cc-radius-sm',
        '--border-radius-medium': '--cc-radius-base',
        '--border-radius-large': '--cc-radius-lg'
      },
      dark: {
        colors: [
          { name: '--cc-primary', value: '#3c7eff' },
          { name: '--cc-primary-hover', value: '#5a94ff' },
          { name: '--cc-text', value: '#f5f5f5' },
          { name: '--cc-text-secondary', value: '#c9cdd4' },
          { name: '--cc-bg', value: '#17171a' },
          { name: '--cc-bg-secondary', value: '#232324' },
          { name: '--cc-border', value: '#3d3d3e' },
          { name: '--cc-fill', value: '#262626' }
        ]
      }
    },

    // ── 5. Semi Design ───────────────────────────────────────────
    'semi-design': {
      name: 'Semi Design',
      description: '暗色模式 / SaaS',
      version: '2.x',
      tokens: {
        colors: [
          { name: '--cc-primary', value: '#6b53f4' },
          { name: '--cc-primary-hover', value: '#7d68f6' },
          { name: '--cc-primary-active', value: '#5a40e8' },
          { name: '--cc-primary-disabled', value: '#b8b0f9' },
          { name: '--cc-success', value: '#00b368' },
          { name: '--cc-warning', value: '#e6a23c' },
          { name: '--cc-error', value: '#f93920' },
          { name: '--cc-info', value: '#0077fa' },
          { name: '--cc-text', value: '#141a24' },
          { name: '--cc-text-secondary', value: '#5c6370' },
          { name: '--cc-text-tertiary', value: '#a9aeb8' },
          { name: '--cc-bg', value: '#ffffff' },
          { name: '--cc-bg-secondary', value: '#f9f9f9' },
          { name: '--cc-bg-tertiary', value: '#f1f1f1' },
          { name: '--cc-border', value: '#e1e1e1' },
          { name: '--cc-border-light', value: '#f3f3f3' }
        ],
        typography: [
          { name: '--cc-font-family', value: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif' },
          { name: '--cc-font-size-xs', value: '12px' },
          { name: '--cc-font-size-sm', value: '13px' },
          { name: '--cc-font-size-base', value: '14px' },
          { name: '--cc-font-size-lg', value: '16px' },
          { name: '--cc-font-size-xl', value: '20px' },
          { name: '--cc-font-size-2xl', value: '24px' }
        ],
        spacing: [
          { name: '--cc-spacing-xs', value: '4px' },
          { name: '--cc-spacing-sm', value: '8px' },
          { name: '--cc-spacing-md', value: '12px' },
          { name: '--cc-spacing-base', value: '16px' },
          { name: '--cc-spacing-lg', value: '24px' },
          { name: '--cc-spacing-xl', value: '32px' }
        ],
        radius: [
          { name: '--cc-radius-sm', value: '3px' },
          { name: '--cc-radius-base', value: '6px' },
          { name: '--cc-radius-lg', value: '12px' },
          { name: '--cc-radius-xl', value: '16px' }
        ],
        shadows: [
          { name: '--cc-shadow-sm', value: '0 4px 12px rgba(0,0,0,0.08)' },
          { name: '--cc-shadow-md', value: '0 8px 24px rgba(0,0,0,0.12)' },
          { name: '--cc-shadow-lg', value: '0 12px 48px rgba(0,0,0,0.16)' }
        ]
      },
      aliasMap: {
        '--semi-color-primary': '--cc-primary',
        '--semi-color-primary-hover': '--cc-primary-hover',
        '--semi-color-primary-active': '--cc-primary-active',
        '--semi-color-primary-disabled': '--cc-primary-disabled',
        '--semi-color-success': '--cc-success',
        '--semi-color-warning': '--cc-warning',
        '--semi-color-danger': '--cc-error',
        '--semi-color-info': '--cc-info',
        '--semi-color-text-0': '--cc-text',
        '--semi-color-text-1': '--cc-text-secondary',
        '--semi-color-text-2': '--cc-text-tertiary',
        '--semi-color-bg-0': '--cc-bg',
        '--semi-color-bg-1': '--cc-bg-secondary',
        '--semi-color-bg-2': '--cc-bg-tertiary',
        '--semi-color-border': '--cc-border',
        '--semi-color-border-light': '--cc-border-light',
        '--semi-border-radius-small': '--cc-radius-sm',
        '--semi-border-radius-medium': '--cc-radius-base',
        '--semi-border-radius-large': '--cc-radius-lg',
        '--semi-border-radius-xLarge': '--cc-radius-xl'
      },
      dark: {
        colors: [
          { name: '--cc-primary', value: '#8172ec' },
          { name: '--cc-primary-hover', value: '#9486f0' },
          { name: '--cc-text', value: '#f5f5f5' },
          { name: '--cc-text-secondary', value: '#d9d9d9' },
          { name: '--cc-bg', value: '#141414' },
          { name: '--cc-bg-secondary', value: '#1c1c1c' },
          { name: '--cc-border', value: '#3d3d3d' }
        ]
      }
    },

    // ── 6. shadcn/ui ─────────────────────────────────────────────
    'shadcn-ui': {
      name: 'shadcn/ui',
      description: 'React + Tailwind',
      version: 'latest',
      tokens: {
        colors: [
          { name: '--cc-primary', value: '#0f172a' },
          { name: '--cc-primary-hover', value: '#1e293b' },
          { name: '--cc-primary-foreground', value: '#f8fafc' },
          { name: '--cc-secondary', value: '#f1f5f9' },
          { name: '--cc-secondary-foreground', value: '#0f172a' },
          { name: '--cc-destructive', value: '#ef4444' },
          { name: '--cc-muted', value: '#f1f5f9' },
          { name: '--cc-muted-foreground', value: '#64748b' },
          { name: '--cc-accent', value: '#f1f5f9' },
          { name: '--cc-text', value: '#0f172a' },
          { name: '--cc-text-secondary', value: '#64748b' },
          { name: '--cc-bg', value: '#ffffff' },
          { name: '--cc-bg-secondary', value: '#f8fafc' },
          { name: '--cc-border', value: '#e2e8f0' },
          { name: '--cc-ring', value: '#0f172a' }
        ],
        typography: [
          { name: '--cc-font-family', value: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
          { name: '--cc-font-size-xs', value: '12px' },
          { name: '--cc-font-size-sm', value: '14px' },
          { name: '--cc-font-size-base', value: '16px' },
          { name: '--cc-font-size-lg', value: '18px' },
          { name: '--cc-font-size-xl', value: '20px' },
          { name: '--cc-font-size-2xl', value: '24px' },
          { name: '--cc-font-size-3xl', value: '30px' },
          { name: '--cc-font-size-4xl', value: '36px' },
          { name: '--cc-line-height', value: '1.5' }
        ],
        spacing: [
          { name: '--cc-spacing-xs', value: '4px' },
          { name: '--cc-spacing-sm', value: '8px' },
          { name: '--cc-spacing-md', value: '12px' },
          { name: '--cc-spacing-base', value: '16px' },
          { name: '--cc-spacing-lg', value: '24px' },
          { name: '--cc-spacing-xl', value: '32px' },
          { name: '--cc-spacing-2xl', value: '48px' }
        ],
        radius: [
          { name: '--cc-radius-sm', value: '6px' },
          { name: '--cc-radius-base', value: '8px' },
          { name: '--cc-radius-lg', value: '12px' }
        ],
        shadows: [
          { name: '--cc-shadow-sm', value: '0 1px 2px rgba(0,0,0,0.05)' },
          { name: '--cc-shadow-md', value: '0 4px 6px rgba(0,0,0,0.1)' },
          { name: '--cc-shadow-lg', value: '0 10px 15px rgba(0,0,0,0.1)' }
        ]
      },
      aliasMap: {
        '--primary': '--cc-primary',
        '--primary-foreground': '--cc-primary-foreground',
        '--secondary': '--cc-secondary',
        '--secondary-foreground': '--cc-secondary-foreground',
        '--destructive': '--cc-destructive',
        '--muted': '--cc-muted',
        '--muted-foreground': '--cc-muted-foreground',
        '--accent': '--cc-accent',
        '--foreground': '--cc-text',
        '--card-foreground': '--cc-text-secondary',
        '--background': '--cc-bg',
        '--card': '--cc-bg-secondary',
        '--border': '--cc-border',
        '--ring': '--cc-ring',
        '--radius': '--cc-radius-base'
      },
      dark: {
        colors: [
          { name: '--cc-primary', value: '#f8fafc' },
          { name: '--cc-primary-foreground', value: '#0f172a' },
          { name: '--cc-secondary', value: '#1e293b' },
          { name: '--cc-secondary-foreground', value: '#f8fafc' },
          { name: '--cc-destructive', value: '#7f1d1d' },
          { name: '--cc-muted', value: '#1e293b' },
          { name: '--cc-muted-foreground', value: '#94a3b8' },
          { name: '--cc-text', value: '#f8fafc' },
          { name: '--cc-text-secondary', value: '#94a3b8' },
          { name: '--cc-bg', value: '#0f172a' },
          { name: '--cc-bg-secondary', value: '#1e293b' },
          { name: '--cc-border', value: '#1e293b' }
        ]
      }
    }
  };

  // ────────────────────────────────────────────────────────────────
  //  CCDesignSystems Class
  // ────────────────────────────────────────────────────────────────

  function CCDesignSystems(state, bus) {
    this.state = state;
    this.bus = bus;
    this._customSystems = [];
  }

  /**
   * List all available systems (built-in + custom).
   * @returns {Array<{id, name, description, version, tokenCount}>}
   */
  CCDesignSystems.prototype.listSystems = function () {
    var result = [];
    var ids = Object.keys(SYSTEMS);
    for (var i = 0; i < ids.length; i++) {
      var id = ids[i];
      var sys = SYSTEMS[id];
      var count = 0;
      var cats = ['colors', 'typography', 'spacing', 'radius', 'shadows'];
      for (var j = 0; j < cats.length; j++) {
        if (sys.tokens[cats[j]]) count += sys.tokens[cats[j]].length;
      }
      result.push({ id: id, name: sys.name, description: sys.description, version: sys.version, tokenCount: count });
    }
    for (var k = 0; k < this._customSystems.length; k++) {
      var cs = this._customSystems[k];
      var cc = 0;
      for (var m = 0; m < cats.length; m++) {
        if (cs.tokens[cats[m]]) cc += cs.tokens[cats[m]].length;
      }
      result.push({ id: cs.id, name: cs.name, description: cs.description || '自定义导入', version: '-', tokenCount: cc });
    }
    return result;
  };

  /**
   * Get a system's tokens (flat array, optionally with dark overrides).
   * @param {string} id - System ID
   * @param {Object} [options] - { dark: Boolean }
   * @returns {Array|null} flat token array [{name, value, category}]
   */
  CCDesignSystems.prototype.getTokens = function (id, options) {
    var sys = SYSTEMS[id] || this._findCustom(id);
    if (!sys) return null;

    var opts = options || {};
    var tokens = [];
    var categories = ['colors', 'typography', 'spacing', 'radius', 'shadows'];

    for (var i = 0; i < categories.length; i++) {
      var cat = categories[i];
      var items = sys.tokens[cat];
      if (!items) continue;
      for (var j = 0; j < items.length; j++) {
        tokens.push({ name: items[j].name, value: items[j].value, category: cat });
      }
    }

    // Apply dark overrides
    if (opts.dark && sys.dark && sys.dark.colors) {
      var darkColors = sys.dark.colors;
      for (var k = 0; k < darkColors.length; k++) {
        var dc = darkColors[k];
        for (var t = 0; t < tokens.length; t++) {
          if (tokens[t].name === dc.name && tokens[t].category === 'colors') {
            tokens[t].value = dc.value;
            break;
          }
        }
      }
    }

    return tokens;
  };

  /**
   * Apply a design system: write tokens to state + CSS :root.
   * @param {string} id - System ID
   * @param {Object} [options] - { dark: Boolean }
   */
  CCDesignSystems.prototype.applySystem = function (id, options) {
    var tokens = this.getTokens(id, options);
    if (!tokens) return false;

    // Group by category for state
    var grouped = { colors: [], typography: [], spacing: [], radius: [], shadows: [] };
    for (var i = 0; i < tokens.length; i++) {
      var t = tokens[i];
      if (grouped[t.category]) grouped[t.category].push(t);
    }

    // Update state
    this.state.batch();
    this.state.set('tokens.colors', grouped.colors);
    this.state.set('tokens.typography', grouped.typography);
    this.state.set('tokens.spacing', grouped.spacing);
    this.state.set('tokens.radius', grouped.radius);
    this.state.set('tokens.shadows', grouped.shadows);
    this.state.set('settings.activeDesignSystem', id);
    this.state.endBatch();

    // Write CSS variables to :root
    var root = document.documentElement;
    for (var j = 0; j < tokens.length; j++) {
      root.style.setProperty(tokens[j].name, tokens[j].value);
    }

    return true;
  };

  /**
   * Clear active design system and restore defaults.
   */
  CCDesignSystems.prototype.clearActive = function () {
    var defaults = {
      '--cc-primary': '#1677ff',
      '--cc-primary-hover': '#4096ff',
      '--cc-success': '#52c41a',
      '--cc-warning': '#faad14',
      '--cc-error': '#ff4d4f',
      '--cc-text': 'rgba(0,0,0,0.88)',
      '--cc-text-secondary': 'rgba(0,0,0,0.65)',
      '--cc-bg': '#ffffff',
      '--cc-bg-secondary': '#f5f5f5',
      '--cc-border': '#d9d9d9',
      '--cc-radius-base': '6px',
      '--cc-font-size-base': '14px',
      '--cc-font-family': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    };
    var root = document.documentElement;
    var keys = Object.keys(defaults);
    for (var i = 0; i < keys.length; i++) {
      root.style.setProperty(keys[i], defaults[keys[i]]);
    }

    this.state.batch();
    this.state.set('tokens.colors', []);
    this.state.set('tokens.typography', []);
    this.state.set('tokens.spacing', []);
    this.state.set('tokens.radius', []);
    this.state.set('tokens.shadows', []);
    this.state.set('settings.activeDesignSystem', null);
    this.state.endBatch();
  };

  // ── Local File Import ──────────────────────────────────────────

  /**
   * Parse CSS text into token categories.
   * @param {string} text - CSS text with :root or --variable declarations
   * @param {string} [name] - System name for the imported tokens
   * @returns {{tokens: Object, id: string, name: string}}
   */
  CCDesignSystems.prototype.parseCSS = function (text, name) {
    var tokens = { colors: [], typography: [], spacing: [], radius: [], shadows: [] };
    var re = /(--[\w-]+)\s*:\s*([^;{}]+)/g;
    var match;
    while ((match = re.exec(text)) !== null) {
      var varName = match[1].trim();
      var varValue = match[2].trim();
      var cat = this._guessCategory(varName, varValue);
      tokens[cat].push({ name: varName, value: varValue });
    }
    var id = 'custom-' + Date.now();
    return { tokens: tokens, id: id, name: name || '自定义 CSS' };
  };

  /**
   * Parse JSON into tokens.
   * Supports flat {key: val} and nested {colors: {...}, typography: {...}}.
   * Also supports Axhub theme.json {tokens: {palette, typography, radius}}.
   */
  CCDesignSystems.prototype.parseJSON = function (jsonStr, name) {
    var data;
    try { data = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr; }
    catch (e) { return null; }

    var tokens = { colors: [], typography: [], spacing: [], radius: [], shadows: [] };

    // Axhub theme.json format
    if (data.tokens && (data.tokens.palette || data.tokens.typography)) {
      var t = data.tokens;
      if (t.palette) {
        var pKeys = Object.keys(t.palette);
        for (var i = 0; i < pKeys.length; i++) {
          tokens.colors.push({ name: '--cc-' + pKeys[i], value: String(t.palette[pKeys[i]]) });
        }
      }
      if (t.typography) {
        var tyKeys = Object.keys(t.typography);
        for (var j = 0; j < tyKeys.length; j++) {
          tokens.typography.push({ name: '--cc-' + tyKeys[j], value: String(t.typography[tyKeys[j]]) });
        }
      }
      if (t.radius) {
        var rKeys = Object.keys(t.radius);
        for (var k = 0; k < rKeys.length; k++) {
          tokens.radius.push({ name: '--cc-' + rKeys[k], value: String(t.radius[rKeys[k]]) });
        }
      }
      if (t.spacing) {
        var sKeys = Object.keys(t.spacing);
        for (var l = 0; l < sKeys.length; l++) {
          tokens.spacing.push({ name: '--cc-' + sKeys[l], value: String(t.spacing[sKeys[l]]) });
        }
      }
      if (t.shadows) {
        var shKeys = Object.keys(t.shadows);
        for (var m = 0; m < shKeys.length; m++) {
          tokens.shadows.push({ name: '--cc-' + shKeys[m], value: String(t.shadows[shKeys[m]]) });
        }
      }
    } else {
      // Standard nested format: {colors: {key: val}, typography: {key: val}}
      var categories = ['colors', 'typography', 'spacing', 'radius', 'shadows'];
      for (var n = 0; n < categories.length; n++) {
        var cat = categories[n];
        if (data[cat] && typeof data[cat] === 'object') {
          var cKeys = Object.keys(data[cat]);
          for (var o = 0; o < cKeys.length; o++) {
            tokens[cat].push({ name: '--cc-' + cKeys[o], value: String(data[cat][cKeys[o]]) });
          }
        }
      }
      // Flat format fallback
      if (tokens.colors.length + tokens.typography.length + tokens.spacing.length + tokens.radius.length + tokens.shadows.length === 0) {
        var fKeys = Object.keys(data);
        for (var p = 0; p < fKeys.length; p++) {
          if (typeof data[fKeys[p]] !== 'string') continue;
          var fCat = this._guessCategory(fKeys[p], data[fKeys[p]]);
          tokens[fCat].push({ name: '--cc-' + fKeys[p], value: data[fKeys[p]] });
        }
      }
    }

    var id = 'custom-' + Date.now();
    return { tokens: tokens, id: id, name: name || '自定义 JSON' };
  };

  /**
   * Parse Markdown: extract ```css :root {} ``` blocks.
   */
  CCDesignSystems.prototype.parseMarkdown = function (text, name) {
    var cssBlocks = [];
    // Match ```css ... ``` or ``` ... ``` blocks that contain :root
    var re = /```(?:css)?\s*\n([\s\S]*?)```/g;
    var match;
    while ((match = re.exec(text)) !== null) {
      if (match[1].indexOf(':root') !== -1 || match[1].indexOf('--') !== -1) {
        cssBlocks.push(match[1]);
      }
    }
    if (cssBlocks.length === 0) return null;

    var combined = cssBlocks.join('\n');
    return this.parseCSS(combined, name || '自定义 Markdown');
  };

  /**
   * Auto-detect format and parse.
   * @param {string} text - File content
   * @param {string} [filename] - Filename for format hint
   * @returns {Object|null} parsed result
   */
  CCDesignSystems.prototype.importAuto = function (text, filename) {
    var ext = filename ? filename.split('.').pop().toLowerCase() : '';
    var trimmed = (text || '').trim();

    // By extension
    if (ext === 'json') return this.parseJSON(trimmed, filename);
    if (ext === 'md' || ext === 'markdown') return this.parseMarkdown(trimmed, filename);
    if (ext === 'css') return this.parseCSS(trimmed, filename);

    // Auto-detect by content
    if (trimmed.charAt(0) === '{') {
      var jsonResult = this.parseJSON(trimmed, filename);
      if (jsonResult) return jsonResult;
    }
    if (trimmed.indexOf('```css') !== -1 || trimmed.indexOf('```\n') !== -1) {
      var mdResult = this.parseMarkdown(trimmed, filename);
      if (mdResult) return mdResult;
    }
    // Default: treat as CSS
    return this.parseCSS(trimmed, filename);
  };

  /**
   * Register a custom system (after import).
   */
  CCDesignSystems.prototype.registerCustom = function (parsed) {
    var sys = {
      id: parsed.id,
      name: parsed.name,
      description: '自定义导入',
      version: '-',
      tokens: parsed.tokens,
      dark: null
    };
    this._customSystems.push(sys);
    return sys;
  };

  // ── Export ─────────────────────────────────────────────────────

  /**
   * Export current tokens as CSS :root block.
   * @returns {string}
   */
  CCDesignSystems.prototype.exportCSS = function () {
    var lines = [':root {'];
    var categories = ['colors', 'typography', 'spacing', 'radius', 'shadows'];
    var catLabels = { colors: 'Colors', typography: 'Typography', spacing: 'Spacing', radius: 'Border Radius', shadows: 'Shadows' };

    for (var i = 0; i < categories.length; i++) {
      var cat = categories[i];
      var tokens = this.state.get('tokens.' + cat) || [];
      if (tokens.length === 0) continue;
      lines.push('  /* ' + catLabels[cat] + ' */');
      for (var j = 0; j < tokens.length; j++) {
        lines.push('  ' + tokens[j].name + ': ' + tokens[j].value + ';');
      }
      lines.push('');
    }

    lines.push('}');
    return lines.join('\n');
  };

  /**
   * Export current tokens as JSON.
   * @returns {string}
   */
  CCDesignSystems.prototype.exportJSON = function () {
    var result = {};
    var categories = ['colors', 'typography', 'spacing', 'radius', 'shadows'];
    for (var i = 0; i < categories.length; i++) {
      var cat = categories[i];
      var tokens = this.state.get('tokens.' + cat) || [];
      if (tokens.length === 0) continue;
      result[cat] = {};
      for (var j = 0; j < tokens.length; j++) {
        // Strip --cc- prefix for cleaner JSON keys
        var key = tokens[j].name.replace(/^--cc-/, '');
        result[cat][key] = tokens[j].value;
      }
    }
    return JSON.stringify(result, null, 2);
  };

  // ── System Detection (v1.5) ────────────────────────────────────

  /**
   * Detect which design system is used in the given HTML.
   * Scans for known CSS variable prefixes and class naming patterns.
   * @param {string} html - HTML source text
   * @returns {{id: string, confidence: number}|null}
   */
  CCDesignSystems.prototype.detectSystem = function (html) {
    if (!html) return null;

    // Detection patterns: CSS variable prefixes + class name patterns
    var patterns = {
      'ant-design-pro': {
        vars: ['--colorPrimary', '--colorSuccess', '--colorWarning', '--colorError', '--colorBgContainer', '--colorBorder', '--colorText'],
        classes: ['ant-', 'anticon']
      },
      'tdesign': {
        vars: ['--td-brand-color', '--td-success-color', '--td-warning-color', '--td-error-color', '--td-text-color-primary', '--td-bg-color-container'],
        classes: ['t-', 't-button', 't-input', 't-table']
      },
      'element-plus': {
        vars: ['--el-color-primary', '--el-color-success', '--el-color-warning', '--el-color-danger', '--el-text-color-primary', '--el-bg-color'],
        classes: ['el-button', 'el-input', 'el-table', 'el-form', 'el-row']
      },
      'arco-design': {
        vars: ['--arcoblue-6', '--color-text-1', '--color-bg-1', '--color-border'],
        classes: ['arco-', 'arco-btn', 'arco-input', 'arco-table']
      },
      'semi-design': {
        vars: ['--semi-color-primary', '--semi-color-success', '--semi-color-warning', '--semi-color-danger', '--semi-color-text-0', '--semi-color-bg-0'],
        classes: ['semi-', 'semi-button', 'semi-input']
      },
      'shadcn-ui': {
        vars: ['--primary:', '--secondary:', '--destructive:', '--muted:', '--accent:', '--ring:', '--radius:'],
        classes: ['bg-primary', 'bg-secondary', 'text-primary', 'border-border', 'bg-destructive', 'bg-muted']
      }
    };

    var bestId = null;
    var bestScore = 0;
    var ids = Object.keys(patterns);

    for (var i = 0; i < ids.length; i++) {
      var id = ids[i];
      var p = patterns[id];
      var score = 0;

      // Check CSS variables
      for (var v = 0; v < p.vars.length; v++) {
        if (html.indexOf(p.vars[v]) !== -1) score += 3;
      }

      // Check class names
      for (var c = 0; c < p.classes.length; c++) {
        var regex = new RegExp('\\b' + p.classes[c].replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        var matches = html.match(regex);
        if (matches) score += Math.min(matches.length, 5);
      }

      if (score > bestScore) {
        bestScore = score;
        bestId = id;
      }
    }

    if (bestScore < 3) return null;

    // Confidence: 0-1 based on score
    var confidence = Math.min(bestScore / 30, 1);
    return { id: bestId, confidence: confidence };
  };

  /**
   * Get aliasMap for a system.
   * @param {string} id - System ID
   * @returns {Object|null} alias map {originalVar: ccVar}
   */
  CCDesignSystems.prototype.getAliasMap = function (id) {
    var sys = SYSTEMS[id];
    return sys ? (sys.aliasMap || null) : null;
  };

  // ── Internal helpers ───────────────────────────────────────────

  CCDesignSystems.prototype._findCustom = function (id) {
    for (var i = 0; i < this._customSystems.length; i++) {
      if (this._customSystems[i].id === id) return this._customSystems[i];
    }
    return null;
  };

  CCDesignSystems.prototype._guessCategory = function (name, value) {
    var n = name.toLowerCase();
    var v = (value || '').toLowerCase();
    if (/color|colour|bg|background|fill|primary|success|warning|error|danger|destructive|muted|accent|ring/i.test(n)) return 'colors';
    if (/^#|rgb|hsl|rgba|hsla/.test(v)) return 'colors';
    if (/font|text-size|line-height|letter|weight/i.test(n)) return 'typography';
    if (/shadow/i.test(n) || /shadow/i.test(v)) return 'shadows';
    if (/radius|round/i.test(n)) return 'radius';
    return 'spacing';
  };

  // ── Export to global ───────────────────────────────────────────
  window.CCDesignSystems = CCDesignSystems;
})();
