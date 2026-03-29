import type { Meta, StoryObj } from '@storybook/angular';
import { VieczButtonComponent } from './viecz-button.component';

const meta: Meta<VieczButtonComponent> = {
  title: 'viecz/Button',
  component: VieczButtonComponent,
  tags: ['autodocs'],
  argTypes: {
    variant: { control: 'select', options: ['primary', 'secondary'] },
  },
};

export default meta;
type Story = StoryObj<VieczButtonComponent>;

export const Primary: Story = {
  args: { variant: 'primary', label: 'Get Started' },
};

export const Secondary: Story = {
  args: { variant: 'secondary', label: 'See How It Works' },
};

export const FullWidth: Story = {
  args: { variant: 'primary', label: 'Start Free', fullWidth: true },
};

export const Disabled: Story = {
  args: { variant: 'primary', label: 'Disabled', disabled: true },
};
