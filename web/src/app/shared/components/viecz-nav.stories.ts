import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';
import { RouterTestingModule } from '@angular/router/testing';
import { VieczNavComponent } from './viecz-nav.component';

const meta: Meta<VieczNavComponent> = {
  title: 'viecz/Nav',
  component: VieczNavComponent,
  tags: ['autodocs'],
  decorators: [
    moduleMetadata({ imports: [RouterTestingModule] }),
  ],
};

export default meta;
type Story = StoryObj<VieczNavComponent>;

export const Default: Story = {
  args: {
    logo: 'Viecz',
    links: [
      { label: 'Marketplace', route: '/marketplace', icon: 'store' },
      { label: 'Wallet', route: '/wallet', icon: 'account_balance_wallet' },
      { label: 'Chat', route: '/chat', icon: 'chat' },
    ],
  },
};

export const MinimalLinks: Story = {
  args: {
    logo: 'Viecz',
    links: [
      { label: 'Home', route: '/' },
      { label: 'About', route: '/about' },
    ],
  },
};
