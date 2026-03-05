import type { Preview } from '@storybook/angular';
import { applicationConfig, componentWrapperDecorator } from '@storybook/angular';
import { setCompodocJson } from '@storybook/addon-docs/angular';
import { provideTranslocoForTesting } from '../src/app/core/transloco-testing';
import { lightTheme, draculaTheme } from './nhannht-metro-theme';
import docJson from './documentation.json';

setCompodocJson(docJson);

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
    // Apply .dracula class + CSS variables to story wrapper
    componentWrapperDecorator(
      (story) => `<div [class]="themeClass" [style]="themeStyles">${story}</div>`,
      ({ globals }) => {
        const isDracula = globals['theme'] === 'dracula';
        return {
          themeClass: isDracula ? 'dracula' : '',
          themeStyles: isDracula
            ? '--color-bg:#282A36;--color-fg:#F8F8F2;--color-muted:#6272A4;--color-border:#44475A;--color-card:#44475A;background-color:#282A36;color:#F8F8F2;min-height:100%;'
            : '--color-bg:#f0ede8;--color-fg:#1a1a1a;--color-muted:#6b6b6b;--color-border:#d4d0ca;--color-card:#ffffff;background-color:#f0ede8;color:#1a1a1a;min-height:100%;',
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
