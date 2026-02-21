import type { Meta, StoryObj } from '@storybook/angular';
import { NhannhtMetroTabsComponent } from './nhannht-metro-tabs.component';

const meta: Meta<NhannhtMetroTabsComponent> = {
  title: 'nhannht-metro/Tabs',
  component: NhannhtMetroTabsComponent,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<NhannhtMetroTabsComponent>;

export const Default: Story = {
  args: {
    tabs: [
      { value: 'posted', label: 'POSTED' },
      { value: 'applied', label: 'APPLIED' },
      { value: 'active', label: 'ACTIVE' },
    ],
    activeTab: 'posted',
  },
};
