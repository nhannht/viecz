import type { Meta, StoryObj } from '@storybook/angular';
import { NhannhtMetroPriceCardComponent } from './nhannht-metro-price-card.component';

const meta: Meta<NhannhtMetroPriceCardComponent> = {
  title: 'nhannht-metro/PriceCard',
  component: NhannhtMetroPriceCardComponent,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<NhannhtMetroPriceCardComponent>;

export const Free: Story = {
  args: {
    tier: 'FREE',
    price: '$0',
    period: '/mo',
    description: 'For individuals getting started',
    features: ['5 automated tasks', 'Basic AI suggestions', '1 integration', 'Community support'],
    ctaLabel: 'Start Free',
  },
};

export const Pro: Story = {
  args: {
    tier: 'PRO',
    price: '$19',
    period: '/mo',
    description: 'For professionals',
    features: ['Unlimited tasks', 'Advanced AI', '10 integrations', 'Priority support'],
    ctaLabel: 'Get Pro',
    featured: true,
  },
};

export const Team: Story = {
  args: {
    tier: 'TEAM',
    price: '$49',
    period: '/mo',
    description: 'For teams up to 20',
    features: ['Everything in Pro', 'Team collaboration', 'Admin dashboard', 'Custom integrations'],
    ctaLabel: 'Contact Us',
  },
};

export const PricingGrid: Story = {
  render: () => ({
    template: `
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; max-width: 900px;">
        <nhannht-metro-price-card
          tier="FREE" price="$0" period="/mo"
          description="For individuals getting started"
          [features]="['5 tasks', 'Basic AI', '1 integration', 'Community support']"
          ctaLabel="Start Free"
        />
        <nhannht-metro-price-card
          tier="PRO" price="$19" period="/mo"
          description="For professionals"
          [features]="['Unlimited tasks', 'Advanced AI', '10 integrations', 'Priority support']"
          ctaLabel="Get Pro"
          [featured]="true"
        />
        <nhannht-metro-price-card
          tier="TEAM" price="$49" period="/mo"
          description="For teams up to 20"
          [features]="['Everything in Pro', 'Team collaboration', 'Admin dashboard', 'Custom integrations']"
          ctaLabel="Contact Us"
        />
      </div>
    `,
  }),
};
