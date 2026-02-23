import { Meta, StoryObj, moduleMetadata } from '@storybook/angular';
import { FormsModule } from '@angular/forms';
import { NhannhtMetroBankSelectComponent } from './nhannht-metro-bank-select.component';
import { VietQRBank } from '../../core/bank-list';

const mockBanks: VietQRBank[] = [
  { id: 17, name: 'Ngan hang TMCP Ngoai Thuong Viet Nam', code: 'VCB', bin: '970436', shortName: 'Vietcombank', logo: 'https://api.vietqr.io/img/VCB.png', transferSupported: 1, lookupSupported: 1 },
  { id: 43, name: 'Ngan hang TMCP Cong Thuong Viet Nam', code: 'ICB', bin: '970415', shortName: 'VietinBank', logo: 'https://api.vietqr.io/img/ICB.png', transferSupported: 1, lookupSupported: 1 },
  { id: 4, name: 'Ngan hang TMCP Dau Tu va Phat Trien Viet Nam', code: 'BIDV', bin: '970418', shortName: 'BIDV', logo: 'https://api.vietqr.io/img/BIDV.png', transferSupported: 1, lookupSupported: 1 },
  { id: 10, name: 'Ngan hang TMCP Ky Thuong Viet Nam', code: 'TCB', bin: '970407', shortName: 'Techcombank', logo: 'https://api.vietqr.io/img/TCB.png', transferSupported: 1, lookupSupported: 1 },
  { id: 26, name: 'Ngan hang TMCP Quan Doi', code: 'MB', bin: '970422', shortName: 'MBBank', logo: 'https://api.vietqr.io/img/MB.png', transferSupported: 1, lookupSupported: 1 },
];

const meta: Meta<NhannhtMetroBankSelectComponent> = {
  title: 'Components/BankSelect',
  component: NhannhtMetroBankSelectComponent,
  decorators: [
    moduleMetadata({ imports: [FormsModule] }),
  ],
  argTypes: {
    label: { control: 'text' },
    placeholder: { control: 'text' },
    error: { control: 'text' },
  },
};

export default meta;
type Story = StoryObj<NhannhtMetroBankSelectComponent>;

export const Default: Story = {
  args: {
    label: 'Bank',
    placeholder: 'Choose bank account',
    banks: mockBanks,
  },
};

export const WithError: Story = {
  args: {
    label: 'Bank',
    placeholder: 'Choose bank account',
    banks: mockBanks,
    error: 'Please select a bank',
  },
};
