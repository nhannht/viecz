import { create } from 'storybook/theming/create';

export const sangFrostglassTheme = create({
  base: 'light',

  // Brand
  brandTitle: 'viecz design system — Frostglass',
  brandTarget: '_self',

  // Typography
  fontBase: '"Inter", sans-serif',
  fontCode: '"JetBrains Mono", monospace',

  // Colors — MCSV teal palette
  colorPrimary: '#21808D',
  colorSecondary: '#32B8C6',

  // UI
  appBg: '#FCFCF9',
  appContentBg: '#FCFCF9',
  appPreviewBg: '#FCFCF9',
  appBorderColor: 'rgba(255,255,255,0.5)',
  appBorderRadius: 12,

  // Text
  textColor: '#191C1D',
  textInverseColor: '#FCFCF9',

  // Toolbar
  barTextColor: '#5E6C70',
  barSelectedColor: '#21808D',
  barHoverColor: '#21808D',
  barBg: 'rgba(255,255,255,0.6)',

  // Form
  inputBg: 'rgba(255,255,255,0.6)',
  inputBorder: 'rgba(255,255,255,0.5)',
  inputTextColor: '#191C1D',
  inputBorderRadius: 12,
});

export default sangFrostglassTheme;
