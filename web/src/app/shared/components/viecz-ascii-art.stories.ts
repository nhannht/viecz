import type { Meta, StoryObj } from '@storybook/angular';
import { VieczAsciiArtComponent } from './viecz-ascii-art.component';

const meta: Meta<VieczAsciiArtComponent> = {
  title: 'viecz/AsciiArt',
  component: VieczAsciiArtComponent,
  tags: ['autodocs'],
  argTypes: {
    width: { control: 'number' },
    height: { control: 'number' },
  },
};

export default meta;
type Story = StoryObj<VieczAsciiArtComponent>;

export const Default: Story = {
  args: {
    src: '/mascot.png',
    width: 452,
    height: 380,
    alt: 'Mascot',
  },
};

export const Small: Story = {
  args: {
    src: '/mascot.png',
    width: 200,
    height: 168,
    alt: 'Small mascot',
  },
};

export const Large: Story = {
  args: {
    src: '/mascot.png',
    width: 800,
    height: 672,
    alt: 'Large mascot',
  },
};
