import { create } from 'storybook/theming/create';

export const lightTheme = create({
  base: 'light',

  // Brand
  brandTitle: 'nhannht-metro-meow',
  brandTarget: '_self',

  // Typography
  fontBase: '"Space Mono", monospace',
  fontCode: '"JetBrains Mono", monospace',

  // Colors
  colorPrimary: '#1a1a1a',
  colorSecondary: '#6b6b6b',

  // UI
  appBg: '#f0ede8',
  appContentBg: '#f0ede8',
  appPreviewBg: '#f0ede8',
  appBorderColor: '#d4d0ca',
  appBorderRadius: 0,

  // Text
  textColor: '#1a1a1a',
  textInverseColor: '#f0ede8',

  // Toolbar
  barTextColor: '#6b6b6b',
  barSelectedColor: '#1a1a1a',
  barHoverColor: '#1a1a1a',
  barBg: '#ffffff',

  // Form
  inputBg: '#ffffff',
  inputBorder: '#d4d0ca',
  inputTextColor: '#1a1a1a',
  inputBorderRadius: 0,
});

export const draculaTheme = create({
  base: 'dark',

  // Brand
  brandTitle: 'nhannht-metro-meow — Dracula',
  brandTarget: '_self',

  // Typography
  fontBase: '"Space Mono", monospace',
  fontCode: '"JetBrains Mono", monospace',

  // Colors
  colorPrimary: '#BD93F9',
  colorSecondary: '#6272A4',

  // UI
  appBg: '#282A36',
  appContentBg: '#282A36',
  appPreviewBg: '#282A36',
  appBorderColor: '#44475A',
  appBorderRadius: 0,

  // Text
  textColor: '#F8F8F2',
  textInverseColor: '#282A36',

  // Toolbar
  barTextColor: '#6272A4',
  barSelectedColor: '#F8F8F2',
  barHoverColor: '#F8F8F2',
  barBg: '#44475A',

  // Form
  inputBg: '#44475A',
  inputBorder: '#6272A4',
  inputTextColor: '#F8F8F2',
  inputBorderRadius: 0,
});

export default lightTheme;
