import type { Meta, StoryObj } from '@storybook/angular';
import { NhannhtMetroCardComponent } from './nhannht-metro-card.component';

const meta: Meta<NhannhtMetroCardComponent> = {
  title: 'nhannht-metro/Card',
  component: NhannhtMetroCardComponent,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<NhannhtMetroCardComponent>;

export const Default: Story = {
  render: (args) => ({
    props: args,
    template: `
      <nhannht-metro-card>
        <h3 class="font-display text-[11px] tracking-[1px] mb-3">TASK MANAGER</h3>
        <p class="font-body text-[13px] text-muted leading-[1.7]">Organize and track tasks with ease.</p>
      </nhannht-metro-card>
    `,
  }),
};

export const Featured: Story = {
  render: (args) => ({
    props: { ...args, featured: true },
    template: `
      <nhannht-metro-card [featured]="featured">
        <h3 class="font-display text-[11px] tracking-[1px] mb-3">HIGHLIGHTED</h3>
        <p class="font-body text-[13px] text-muted leading-[1.7]">This card has a featured border.</p>
      </nhannht-metro-card>
    `,
  }),
};

export const Hoverable: Story = {
  render: (args) => ({
    props: { ...args, hoverable: true },
    template: `
      <nhannht-metro-card [hoverable]="hoverable">
        <h3 class="font-display text-[11px] tracking-[1px] mb-3">HOVER ME</h3>
        <p class="font-body text-[13px] text-muted leading-[1.7]">Hover to see the effect.</p>
      </nhannht-metro-card>
    `,
  }),
};
