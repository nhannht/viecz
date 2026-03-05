import { addons } from 'storybook/manager-api';
import { lightTheme, draculaTheme, sangSunglassTheme, sangMoonriverTheme } from './nhannht-metro-theme';

const THEME_MAP: Record<string, typeof lightTheme> = {
  light: lightTheme,
  'sang-sunglass': sangSunglassTheme,
  dracula: draculaTheme,
  'sang-moonriver': sangMoonriverTheme,
};

addons.setConfig({
  theme: lightTheme,
});

// Switch the entire manager UI theme when the toolbar theme toggle changes
addons.register('nhannht-metro-theme-switcher', (api) => {
  const channel = api.getChannel();
  if (!channel) return;

  channel.on('globalsUpdated', ({ globals }: { globals: Record<string, string> }) => {
    const theme = THEME_MAP[globals['theme']] || lightTheme;
    addons.setConfig({ theme });
  });
});
