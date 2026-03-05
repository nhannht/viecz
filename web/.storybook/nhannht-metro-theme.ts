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

export const sangSunglassTheme = create({
  base: 'light',

  // Brand
  brandTitle: 'nhannht-metro-meow — Sunglass',
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

export const sangMoonriverTheme = create({
  base: 'dark',

  // Brand
  brandTitle: 'nhannht-metro-meow — Moonriver',
  brandTarget: '_self',

  // Typography
  fontBase: '"Inter", sans-serif',
  fontCode: '"JetBrains Mono", monospace',

  // Colors — dark teal palette
  colorPrimary: '#32B8C6',
  colorSecondary: '#5E8C96',

  // UI
  appBg: '#0D1117',
  appContentBg: '#0D1117',
  appPreviewBg: '#0D1117',
  appBorderColor: 'rgba(50,184,198,0.15)',
  appBorderRadius: 12,

  // Text
  textColor: '#E6EDF3',
  textInverseColor: '#0D1117',

  // Toolbar
  barTextColor: '#5E8C96',
  barSelectedColor: '#32B8C6',
  barHoverColor: '#32B8C6',
  barBg: 'rgba(255,255,255,0.06)',

  // Form
  inputBg: 'rgba(255,255,255,0.06)',
  inputBorder: 'rgba(50,184,198,0.15)',
  inputTextColor: '#E6EDF3',
  inputBorderRadius: 12,
});

export default lightTheme;
