import type { Preview } from '@storybook/angular';
import { applicationConfig, componentWrapperDecorator } from '@storybook/angular';
import { setCompodocJson } from '@storybook/addon-docs/angular';
import { provideTranslocoForTesting } from '../src/app/core/transloco-testing';
import { lightTheme } from './metro-theme';
import docJson from '../.storybook/documentation.json';

setCompodocJson(docJson);

const THEME_STYLES: Record<string, string> = {
  light:
    '--color-bg:#f0ede8;--color-fg:#1a1a1a;--color-muted:#6b6b6b;--color-border:#d4d0ca;--color-card:#ffffff;font-family:"Space Mono",monospace;background-color:#f0ede8;color:#1a1a1a;min-height:100%;',
  dracula:
    '--color-bg:#282A36;--color-fg:#F8F8F2;--color-muted:#6272A4;--color-border:#44475A;--color-card:#44475A;font-family:"Space Mono",monospace;background-color:#282A36;color:#F8F8F2;min-height:100%;',
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
          { value: 'dracula', title: 'Dracula' },
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
