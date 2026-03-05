import { addons } from 'storybook/manager-api';
import { lightTheme, draculaTheme } from './nhannht-metro-theme';

addons.setConfig({
  theme: lightTheme,
});

// Switch the entire manager UI theme when the toolbar theme toggle changes
addons.register('nhannht-metro-theme-switcher', (api) => {
  const channel = api.getChannel();
  if (!channel) return;

  channel.on('globalsUpdated', ({ globals }: { globals: Record<string, string> }) => {
    const theme = globals['theme'] === 'dracula' ? draculaTheme : lightTheme;
    addons.setConfig({ theme });
  });
});
