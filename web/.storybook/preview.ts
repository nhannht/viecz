import type { Preview } from '@storybook/angular';
import { applicationConfig, componentWrapperDecorator } from '@storybook/angular';
import { setCompodocJson } from '@storybook/addon-docs/angular';
import { provideTranslocoForTesting } from '../src/app/core/transloco-testing';
import { lightTheme } from './nhannht-metro-theme';
import docJson from './documentation.json';

setCompodocJson(docJson);

const THEME_STYLES: Record<string, string> = {
  light:
    '--color-bg:#f0ede8;--color-fg:#1a1a1a;--color-muted:#6b6b6b;--color-border:#d4d0ca;--color-card:#ffffff;font-family:"Space Mono",monospace;background-color:#f0ede8;color:#1a1a1a;min-height:100%;',
  'sang-sunglass':
    '--color-bg:#FCFCF9;--color-fg:#191C1D;--color-muted:#5E6C70;--color-border:rgba(255,255,255,0.5);--color-card:rgba(255,255,255,0.6);font-family:"Inter",sans-serif;background:radial-gradient(ellipse at 20% 20%,rgba(50,184,198,0.08) 0%,transparent 50%),radial-gradient(ellipse at 80% 80%,rgba(33,128,141,0.06) 0%,transparent 50%),radial-gradient(ellipse at 50% 50%,rgba(255,255,255,0.9) 0%,#FCFCF9 100%);color:#191C1D;min-height:100%;',
  dracula:
    '--color-bg:#282A36;--color-fg:#F8F8F2;--color-muted:#6272A4;--color-border:#44475A;--color-card:#44475A;font-family:"Space Mono",monospace;background-color:#282A36;color:#F8F8F2;min-height:100%;',
  'sang-moonriver':
    '--color-bg:#0D1117;--color-fg:#E6EDF3;--color-muted:#5E8C96;--color-border:rgba(50,184,198,0.15);--color-card:rgba(255,255,255,0.06);font-family:"Inter",sans-serif;background:radial-gradient(ellipse at 20% 20%,rgba(50,184,198,0.12) 0%,transparent 50%),radial-gradient(ellipse at 80% 80%,rgba(33,128,141,0.1) 0%,transparent 50%),radial-gradient(ellipse at 50% 50%,rgba(26,104,111,0.08) 0%,#0D1117 100%);color:#E6EDF3;min-height:100%;',
};

const preview: Preview = {
  globalTypes: {
    theme: {
      description: 'Global theme for components',
      toolbar: {
        title: 'Theme',
        icon: 'paintbrush',
        items: [
          { value: 'light', title: 'Light' },
          { value: 'sang-sunglass', title: 'Sang Sunglass' },
          { value: 'dracula', title: 'Dracula' },
          { value: 'sang-moonriver', title: 'Sang Moonriver' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    theme: 'light',
  },
  decorators: [
    applicationConfig({
      providers: [provideTranslocoForTesting()],
    }),
    componentWrapperDecorator(
      (story) => `<div [class]="themeClass" [style]="themeStyles">${story}</div>`,
      ({ globals }) => {
        const theme = globals['theme'] || 'light';
        return {
          themeClass: theme === 'light' ? '' : theme,
          themeStyles: THEME_STYLES[theme] || THEME_STYLES['light'],
        };
      },
    ),
  ],
  parameters: {
    docs: {
      theme: lightTheme,
    },
    backgrounds: { disable: true },
  },
};

export default preview;
