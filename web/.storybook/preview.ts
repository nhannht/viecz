import type { Preview } from '@storybook/angular';
import { applicationConfig } from '@storybook/angular';
import { setCompodocJson } from '@storybook/addon-docs/angular';
import { provideTranslocoForTesting } from '../src/app/core/transloco-testing';
import docJson from './documentation.json';

setCompodocJson(docJson);

const preview: Preview = {
  decorators: [
    applicationConfig({
      providers: [provideTranslocoForTesting()],
    }),
  ],
  parameters: {
    backgrounds: {
      default: 'nhannht-metro',
      values: [
        { name: 'nhannht-metro', value: '#f0ede8' },
        { name: 'white', value: '#ffffff' },
        { name: 'dark', value: '#1a1a1a' },
      ],
    },
  },
};

export default preview;
