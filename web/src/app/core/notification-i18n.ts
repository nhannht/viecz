import { TranslocoService } from '@jsverse/transloco';
import { Notification } from './models';

/**
 * Resolves notification title and message to the current locale.
 * If `params` exists, uses Transloco to interpolate `notificationContent.<type>.title/message`.
 * Falls back to server-provided English text for old notifications without params.
 */
export function resolveNotification(
  transloco: TranslocoService,
  n: Notification,
): { title: string; message: string } {
  if (!n.params) {
    return { title: n.title, message: n.message };
  }

  const titleKey = `notificationContent.${n.type}.title`;
  const messageKey = `notificationContent.${n.type}.message`;

  const title = transloco.translate(titleKey, n.params);
  const message = transloco.translate(messageKey, n.params);

  // If Transloco returns the key itself (missing translation), fall back to server text
  const resolvedTitle = title === titleKey ? n.title : title;
  const resolvedMessage = message === messageKey ? n.message : message;

  return { title: resolvedTitle, message: resolvedMessage };
}
