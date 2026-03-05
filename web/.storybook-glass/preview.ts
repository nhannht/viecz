import type { Preview } from '@storybook/angular';
import { applicationConfig, componentWrapperDecorator } from '@storybook/angular';
import { setCompodocJson } from '@storybook/addon-docs/angular';
import { provideTranslocoForTesting } from '../src/app/core/transloco-testing';
import { sangFrostglassTheme } from './glass-theme';
import docJson from '../.storybook/documentation.json';

setCompodocJson(docJson);

const THEME_STYLES: Record<string, string> = {
  'sang-frostglass':
    '--color-bg:#FCFCF9;--color-fg:#191C1D;--color-muted:#5E6C70;--color-border:rgba(255,255,255,0.5);--color-card:rgba(255,255,255,0.6);font-family:"Inter",sans-serif;background:radial-gradient(ellipse at 20% 20%,rgba(50,184,198,0.08) 0%,transparent 50%),radial-gradient(ellipse at 80% 80%,rgba(33,128,141,0.06) 0%,transparent 50%),radial-gradient(ellipse at 50% 50%,rgba(255,255,255,0.9) 0%,#FCFCF9 100%);color:#191C1D;min-height:100%;',
};

const preview: Preview = {
  globalTypes: {},
  initialGlobals: {
    theme: 'sang-frostglass',
  },
  decorators: [
    applicationConfig({
      providers: [provideTranslocoForTesting()],
    }),
    componentWrapperDecorator(
      (story) => `<div class="sang-frostglass" [style]="themeStyles">${story}</div>`,
      () => ({
        themeStyles: THEME_STYLES['sang-frostglass'],
      }),
    ),
  ],
  parameters: {
    docs: {
      theme: sangFrostglassTheme,
    },
    backgrounds: { disable: true },
  },
};

export default preview;
