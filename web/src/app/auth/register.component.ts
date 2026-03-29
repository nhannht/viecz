import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-register',
  standalone: true,
  template: '',
})
export class RegisterComponent implements OnInit {
  private router = inject(Router);

  ngOnInit() {
    this.router.navigate(['/login']);
  }
}
