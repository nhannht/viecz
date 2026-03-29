import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig } from '@storybook/angular';
import { provideTranslocoForTesting } from '../../core/transloco-testing';
import { VieczSmartDeadlineComponent } from './viecz-smart-deadline.component';

const meta: Meta<VieczSmartDeadlineComponent> = {
  title: 'viecz/SmartDeadline',
  component: VieczSmartDeadlineComponent,
  tags: ['autodocs'],
  decorators: [
    applicationConfig({ providers: [provideTranslocoForTesting()] }),
  ],
};

export default meta;
type Story = StoryObj<VieczSmartDeadlineComponent>;

export const Default: Story = {
  args: { label: 'DEADLINE' },
};

export const WithValue: Story = {
  args: { label: 'DEADLINE' },
  render: (args) => ({
    props: { ...args, value: new Date(Date.now() + 86400000).toISOString() },
    template: `<viecz-smart-deadline [label]="label" />`,
  }),
};

export const WithError: Story = {
  args: { label: 'DEADLINE', error: 'Deadline cannot be in the past' },
};

export const Disabled: Story = {
  args: { label: 'DEADLINE' },
  render: (args) => ({
    props: args,
    template: `<viecz-smart-deadline [label]="label" [disabled]="true" />`,
  }),
};
