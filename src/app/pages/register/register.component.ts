import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { environment } from '../../../environments/environment';
import { LoginCreateRequest } from '../../models/login-create.model';
import { LoginService } from '../../services/login.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrls: ['../login/login.component.scss']
})
export class RegisterComponent {
  readonly appVersion = environment.version;
  readonly buildKind = environment.production ? 'Production' : 'Development';

  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly loginService = inject(LoginService);

  firstName = '';
  middleInitial = '';
  lastName = '';
  email = '';
  userAlias = '';
  password = '';
  userType = 'FAMILY';
  zip = '';
  phoneNum = '';

  error = '';
  success = '';
  submitting = false;

  onPhoneChange(value: string): void {
    this.phoneNum = this.formatPhoneNumber(value);
  }

  onSubmit(): void {
    const firstName = this.firstName.trim();
    const lastName = this.lastName.trim();
    const email = this.email.trim();
    const alias = this.userAlias.trim();
    const password = this.password;

    if (alias.length < 6 || alias.length > 20) {
      this.error = 'User alias must be between 6 and 20 characters.';
      this.success = '';
      return;
    }

    if (!password || !firstName || !lastName || !email) {
      this.error = 'First name, last name, email, password, and user alias are required.';
      this.success = '';
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      this.error = 'Enter a valid email address.';
      this.success = '';
      return;
    }

    const payload: LoginCreateRequest = {
      FirstName: firstName,
      MiddleInitial: this.middleInitial.trim(),
      LastName: lastName,
      Email: email,
      UserAlias: alias,
      Password: password,
      UserType: this.userType.trim() || 'FAMILY',
      Zip: this.zip.trim(),
      PhoneNum: this.phoneNum.trim()
    };

    this.error = '';
    this.success = '';
    this.submitting = true;

    this.loginService
      .createLogin(payload)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.submitting = false;
        })
      )
      .subscribe(result => {
        if (!result.ok || result.userId === null || result.userId <= 0) {
          this.error = result.error ?? 'Registration failed. Please check your details and try again.';
          return;
        }

        const infoId =
          result.userInfoId !== null ? `, UserInfo ID ${result.userInfoId}` : '';
        this.success = `Account created (User ID ${result.userId}${infoId}). You can sign in now.`;

        setTimeout(() => {
          void this.router.navigate(['/login'], {
            queryParams: { alias }
          });
        }, 1500);
      });
  }

  private formatPhoneNumber(value: string): string {
    const digits = value.replace(/\D/g, '').slice(0, 10);
    if (digits.length === 0) {
      return '';
    }

    if (digits.length <= 3) {
      return digits;
    }

    if (digits.length <= 6) {
      return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    }

    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
}
