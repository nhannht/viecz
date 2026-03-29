import type { Meta, StoryObj } from '@storybook/angular';
import { VieczCardComponent } from './viecz-card.component';

const meta: Meta<VieczCardComponent> = {
  title: 'viecz/Card',
  component: VieczCardComponent,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<VieczCardComponent>;

export const Default: Story = {
  render: (args) => ({
    props: args,
    template: `
      <viecz-card>
        <h3 class="font-display text-[11px] tracking-[1px] mb-3">TASK MANAGER</h3>
        <p class="font-body text-[13px] text-muted leading-[1.7]">Organize and track tasks with ease.</p>
      </viecz-card>
    `,
  }),
};

export const Featured: Story = {
  render: (args) => ({
    props: { ...args, featured: true },
    template: `
      <viecz-card [featured]="featured">
        <h3 class="font-display text-[11px] tracking-[1px] mb-3">HIGHLIGHTED</h3>
        <p class="font-body text-[13px] text-muted leading-[1.7]">This card has a featured border.</p>
      </viecz-card>
    `,
  }),
};

export const Hoverable: Story = {
  render: (args) => ({
    props: { ...args, hoverable: true },
    template: `
      <viecz-card [hoverable]="hoverable">
        <h3 class="font-display text-[11px] tracking-[1px] mb-3">HOVER ME</h3>
        <p class="font-body text-[13px] text-muted leading-[1.7]">Hover to see the effect.</p>
      </viecz-card>
    `,
  }),
};
