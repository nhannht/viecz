import type { Meta, StoryObj } from '@storybook/angular';
import { VieczMenuComponent } from './viecz-menu.component';

const meta: Meta<VieczMenuComponent> = {
  title: 'viecz/Menu',
  component: VieczMenuComponent,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<VieczMenuComponent>;

export const Open: Story = {
  args: { open: true },
  render: (args) => ({
    props: args,
    template: `
      <div style="position: relative; display: inline-block;">
        <button class="font-body text-[13px] px-4 py-2 border border-border bg-card cursor-pointer">
          Account ▾
        </button>
        <viecz-menu [open]="open">
          <button class="viecz-menu-item">Profile</button>
          <button class="viecz-menu-item">Settings</button>
          <button class="viecz-menu-item">Logout</button>
        </viecz-menu>
      </div>
    `,
  }),
};

export const Closed: Story = {
  args: { open: false },
  render: (args) => ({
    props: args,
    template: `
      <div style="position: relative; display: inline-block;">
        <button class="font-body text-[13px] px-4 py-2 border border-border bg-card cursor-pointer">
          Account ▾
        </button>
        <viecz-menu [open]="open">
          <button class="viecz-menu-item">Profile</button>
          <button class="viecz-menu-item">Logout</button>
        </viecz-menu>
      </div>
    `,
  }),
};
