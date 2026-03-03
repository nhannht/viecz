import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./auth/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'register',
    redirectTo: 'phone',
    pathMatch: 'full',
  },
  {
    path: 'phone',
    loadComponent: () => import('./auth/phone-login.component').then(m => m.PhoneLoginComponent),
  },
  {
    path: 'report',
    loadComponent: () => import('./report/report.component').then(m => m.ReportComponent),
  },
  {
    path: '',
    loadComponent: () => import('./layout/shell.component').then(m => m.ShellComponent),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./marketplace/marketplace.component').then(m => m.MarketplaceComponent),
      },
      {
        path: 'tasks/new',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./task-form/task-form.component').then(m => m.TaskFormComponent),
      },
      {
        path: 'tasks/:id/edit',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./task-form/task-form.component').then(m => m.TaskFormComponent),
      },
      {
        path: 'tasks/:id/apply',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./apply-task/apply-task.component').then(m => m.ApplyTaskComponent),
      },
      {
        path: 'tasks/:id',
        loadComponent: () =>
          import('./task-detail/task-detail.component').then(m => m.TaskDetailComponent),
      },
      {
        path: 'verify-email',
        loadComponent: () =>
          import('./verify-email/verify-email.component').then(m => m.VerifyEmailComponent),
      },
      {
        path: 'payment/return',
        loadComponent: () =>
          import('./payment-return/payment-return.component').then(
            m => m.PaymentReturnComponent,
          ),
      },
      {
        path: 'payment/checkout',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./payment-checkout/payment-checkout.component').then(
            m => m.PaymentCheckoutComponent,
          ),
      },
      {
        path: 'wallet',
        canActivate: [authGuard],
        loadComponent: () => import('./wallet/wallet.component').then(m => m.WalletComponent),
      },
      {
        path: 'chat',
        redirectTo: 'messages',
        pathMatch: 'full',
      },
      {
        path: 'messages',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./chat/conversation-list.component').then(m => m.ConversationListComponent),
      },
      {
        path: 'messages/:conversationId',
        canActivate: [authGuard],
        loadComponent: () => import('./chat/chat.component').then(m => m.ChatComponent),
      },
      {
        path: 'my-jobs/:mode',
        canActivate: [authGuard],
        loadComponent: () => import('./my-jobs/my-jobs.component').then(m => m.MyJobsComponent),
      },
      {
        path: 'notifications',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./notifications/notification-list.component').then(
            m => m.NotificationListComponent,
          ),
      },
      {
        path: 'profile',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./profile/profile-redirect.component').then(m => m.ProfileRedirectComponent),
      },
      {
        path: 'profile/:id',
        canActivate: [authGuard],
        loadComponent: () => import('./profile/profile.component').then(m => m.ProfileComponent),
      },
    ],
  },
];
