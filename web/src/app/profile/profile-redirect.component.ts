import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-profile-redirect',
  standalone: true,
  template: '',
})
export class ProfileRedirectComponent implements OnInit {
  private router = inject(Router);
  private auth = inject(AuthService);

  ngOnInit() {
    const user = this.auth.currentUser();
    if (user) {
      this.router.navigate(['/profile', user.id], { replaceUrl: true });
    } else {
      this.router.navigate(['/phone'], { replaceUrl: true });
    }
  }
}
