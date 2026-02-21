import type { Meta, StoryObj } from '@storybook/angular';
import { NhannhtMetroMenuComponent } from './nhannht-metro-menu.component';

const meta: Meta<NhannhtMetroMenuComponent> = {
  title: 'nhannht-metro/Menu',
  component: NhannhtMetroMenuComponent,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<NhannhtMetroMenuComponent>;

export const Open: Story = {
  args: { open: true },
  render: (args) => ({
    props: args,
    template: `
      <div style="position: relative; display: inline-block;">
        <button class="font-body text-[13px] px-4 py-2 border border-border bg-card cursor-pointer">
          Account ▾
        </button>
        <nhannht-metro-menu [open]="open">
          <button class="nhannht-metro-menu-item">Profile</button>
          <button class="nhannht-metro-menu-item">Settings</button>
          <button class="nhannht-metro-menu-item">Logout</button>
        </nhannht-metro-menu>
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
        <nhannht-metro-menu [open]="open">
          <button class="nhannht-metro-menu-item">Profile</button>
          <button class="nhannht-metro-menu-item">Logout</button>
        </nhannht-metro-menu>
      </div>
    `,
  }),
};
