import { addons } from 'storybook/manager-api';
import { lightTheme, draculaTheme } from './metro-theme';

const THEME_MAP: Record<string, typeof lightTheme> = {
  light: lightTheme,
  dracula: draculaTheme,
};

addons.setConfig({
  theme: lightTheme,
});

addons.register('nhannht-metro-theme-switcher', (api) => {
  const channel = api.getChannel();
  if (!channel) return;

  channel.on('globalsUpdated', ({ globals }: { globals: Record<string, string> }) => {
    const theme = THEME_MAP[globals['theme']] || lightTheme;
    addons.setConfig({ theme });
  });
});
