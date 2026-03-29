import type { Meta, StoryObj } from '@storybook/angular';
import { VieczStepComponent } from './viecz-step.component';

const meta: Meta<VieczStepComponent> = {
  title: 'viecz/Step',
  component: VieczStepComponent,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<VieczStepComponent>;

export const First: Story = {
  args: {
    number: '01',
    title: 'Connect Your Workflow',
    description: 'Link your tools and services. Meow integrates with calendars, project boards, email, and more.',
  },
};

export const Second: Story = {
  args: {
    number: '02',
    title: 'Let Meow Learn',
    description: 'The AI observes your patterns, understands your priorities, and builds a model of your work style.',
  },
};

export const StepSequence: Story = {
  render: () => ({
    template: `
      <div style="display: flex; flex-direction: column; gap: 48px; max-width: 700px;">
        <viecz-step number="01" title="Post a Task"
          description="Describe what you need done, set a budget, and publish to the marketplace." />
        <viecz-step number="02" title="Choose a Tasker"
          description="Review applications, compare profiles, and pick the best fit for your task." />
        <viecz-step number="03" title="Get It Done"
          description="Your payment is held in escrow until the task is completed to your satisfaction." />
      </div>
    `,
  }),
};
