import type { Meta, StoryObj } from '@storybook/angular';
import { VieczTabsComponent } from './viecz-tabs.component';

const meta: Meta<VieczTabsComponent> = {
  title: 'viecz/Tabs',
  component: VieczTabsComponent,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<VieczTabsComponent>;

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
