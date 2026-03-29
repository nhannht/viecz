import type { Meta, StoryObj } from '@storybook/angular';
import { VieczSpinnerComponent } from './viecz-spinner.component';

const meta: Meta<VieczSpinnerComponent> = {
  title: 'viecz/Spinner',
  component: VieczSpinnerComponent,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'radio',
      options: ['sm', 'md', 'lg'],
    },
  },
  decorators: [
    (story) => ({
      ...story,
      template: `<div style="background:#f0ede8;padding:2rem;display:flex;align-items:center;justify-content:center;min-height:300px">${story().template || '<viecz-spinner [size]="size" [label]="label" />'}</div>`,
    }),
  ],
};

export default meta;
type Story = StoryObj<VieczSpinnerComponent>;

export const Default: Story = {
  args: { size: 'md' },
};

export const Small: Story = {
  args: { size: 'sm' },
};

export const Large: Story = {
  args: { size: 'lg' },
};
