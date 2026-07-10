import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AuthGuard } from '../../services/auth.guard';
import { AuthUserService } from '../../services/auth-user.service';
import { LoginService } from '../../services/login.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink]
})
export class LoginComponent {
  readonly appVersion = environment.version;
  readonly buildKind = environment.production ? 'Production' : 'Development';

  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly loginService = inject(LoginService);
  private readonly authUserService = inject(AuthUserService);

  login = this.route.snapshot.queryParamMap.get('alias') ?? '';
  password = '';
  error = '';
  submitting = false;

  onSubmit(): void {
    const alias = this.login.trim();
    const password = this.password;

    if (alias.length < 6 || alias.length > 20) {
      this.error = 'Login alias must be between 6 and 20 characters.';
      return;
    }

    if (!password) {
      this.error = 'Password is required.';
      return;
    }

    this.error = '';
    this.submitting = true;

    this.loginService
      .verifyAlias(alias, password)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.submitting = false;
        })
      )
      .subscribe(result => {
        if (!result.ok || result.userId === null) {
          this.error = result.error ?? 'Invalid login or password.';
          return;
        }

        localStorage.setItem('authToken', 'rapidcms-session');
        AuthGuard.login();
        this.authUserService.setUser({
          UserId: result.userId,
          UserAlias: alias,
          UserEmail: result.userEmail,
          UserPhone: result.userPhone
        });

        const redirectUrl = localStorage.getItem('postLoginRedirect');
        localStorage.removeItem('postLoginRedirect');
        if (redirectUrl && redirectUrl !== '/login') {
          this.router.navigateByUrl(redirectUrl);
        } else {
          this.router.navigate(['/overview']);
        }
      });
  }
}
