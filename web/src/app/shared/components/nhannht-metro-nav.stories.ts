import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';
import { RouterTestingModule } from '@angular/router/testing';
import { NhannhtMetroNavComponent } from './nhannht-metro-nav.component';

const meta: Meta<NhannhtMetroNavComponent> = {
  title: 'nhannht-metro/Nav',
  component: NhannhtMetroNavComponent,
  tags: ['autodocs'],
  decorators: [
    moduleMetadata({ imports: [RouterTestingModule] }),
  ],
};

export default meta;
type Story = StoryObj<NhannhtMetroNavComponent>;

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
