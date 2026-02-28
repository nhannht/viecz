import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig } from '@storybook/angular';
import { provideTranslocoForTesting } from '../../core/transloco-testing';
import { NhannhtMetroSmartDeadlineComponent } from './nhannht-metro-smart-deadline.component';

const meta: Meta<NhannhtMetroSmartDeadlineComponent> = {
  title: 'nhannht-metro/SmartDeadline',
  component: NhannhtMetroSmartDeadlineComponent,
  tags: ['autodocs'],
  decorators: [
    applicationConfig({ providers: [provideTranslocoForTesting()] }),
  ],
};

export default meta;
type Story = StoryObj<NhannhtMetroSmartDeadlineComponent>;

export const Default: Story = {
  args: { label: 'DEADLINE' },
};

export const WithValue: Story = {
  args: { label: 'DEADLINE' },
  render: (args) => ({
    props: { ...args, value: new Date(Date.now() + 86400000).toISOString() },
    template: `<nhannht-metro-smart-deadline [label]="label" />`,
  }),
};

export const WithError: Story = {
  args: { label: 'DEADLINE', error: 'Deadline cannot be in the past' },
};

export const Disabled: Story = {
  args: { label: 'DEADLINE' },
  render: (args) => ({
    props: args,
    template: `<nhannht-metro-smart-deadline [label]="label" [disabled]="true" />`,
  }),
};
