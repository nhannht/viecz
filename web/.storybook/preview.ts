import type { Preview } from '@storybook/angular';
import { applicationConfig, componentWrapperDecorator } from '@storybook/angular';
import { setCompodocJson } from '@storybook/addon-docs/angular';
import { provideTranslocoForTesting } from '../src/app/core/transloco-testing';
import { lightTheme } from './nhannht-metro-theme';
import docJson from './documentation.json';

setCompodocJson(docJson);

const THEME_STYLES: Record<string, string> = {
  light:
    '--color-bg:#f0ede8;--color-fg:#1a1a1a;--color-muted:#6b6b6b;--color-border:#d4d0ca;--color-card:#ffffff;background-color:#f0ede8;color:#1a1a1a;min-height:100%;',
  'sang-sunglass':
    '--color-bg:#e8e4df;--color-fg:#1a1a1a;--color-muted:#6b6b6b;--color-border:rgba(255,255,255,0.3);--color-card:rgba(255,255,255,0.12);background:radial-gradient(ellipse 80% 60% at 20% 30%,rgba(180,140,220,0.25),transparent),radial-gradient(ellipse 70% 50% at 75% 20%,rgba(100,200,220,0.2),transparent),radial-gradient(ellipse 60% 40% at 50% 80%,rgba(240,180,160,0.2),transparent),linear-gradient(135deg,#e8e4df,#ddd8d0);color:#1a1a1a;min-height:100%;',
  dracula:
    '--color-bg:#282A36;--color-fg:#F8F8F2;--color-muted:#6272A4;--color-border:#44475A;--color-card:#44475A;background-color:#282A36;color:#F8F8F2;min-height:100%;',
  'sang-moonriver':
    '--color-bg:#0f0f1a;--color-fg:#e8e8f0;--color-muted:#8888aa;--color-border:rgba(255,255,255,0.1);--color-card:rgba(0,0,0,0.3);background:radial-gradient(ellipse 80% 60% at 25% 25%,rgba(100,60,180,0.3),transparent),radial-gradient(ellipse 70% 50% at 80% 30%,rgba(40,80,180,0.25),transparent),radial-gradient(ellipse 50% 40% at 60% 85%,rgba(60,20,120,0.2),transparent),linear-gradient(135deg,#0f0f1a,#12101f);color:#e8e8f0;min-height:100%;',
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
