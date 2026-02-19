import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./auth/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'register',
    loadComponent: () => import('./auth/register.component').then(m => m.RegisterComponent),
  },
  {
    path: '',
    loadComponent: () => import('./layout/shell.component').then(m => m.ShellComponent),
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./marketplace/marketplace.component').then(m => m.MarketplaceComponent),
      },
      {
        path: 'tasks/new',
        loadComponent: () =>
          import('./task-form/task-form.component').then(m => m.TaskFormComponent),
      },
      {
        path: 'tasks/:id/edit',
        loadComponent: () =>
          import('./task-form/task-form.component').then(m => m.TaskFormComponent),
      },
      {
        path: 'tasks/:id/apply',
        loadComponent: () =>
          import('./apply-task/apply-task.component').then(m => m.ApplyTaskComponent),
      },
      {
        path: 'tasks/:id',
        loadComponent: () =>
          import('./task-detail/task-detail.component').then(m => m.TaskDetailComponent),
      },
      {
        path: 'wallet',
        loadComponent: () => import('./wallet/wallet.component').then(m => m.WalletComponent),
      },
      {
        path: 'chat',
        loadComponent: () => import('./chat/chat.component').then(m => m.ChatComponent),
      },
      {
        path: 'messages',
        loadComponent: () =>
          import('./chat/conversation-list.component').then(m => m.ConversationListComponent),
      },
      {
        path: 'messages/:conversationId',
        loadComponent: () => import('./chat/chat.component').then(m => m.ChatComponent),
      },
      {
        path: 'my-jobs/:mode',
        loadComponent: () => import('./my-jobs/my-jobs.component').then(m => m.MyJobsComponent),
      },
      {
        path: 'profile/:id',
        loadComponent: () => import('./profile/profile.component').then(m => m.ProfileComponent),
      },
    ],
  },
];
