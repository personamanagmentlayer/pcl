# Angular Expert — Code Examples

Reference material for the `angular-expert` skill. See [SKILL.md](../SKILL.md).

## Code Examples

### Installation and Setup

```bash
# Install Angular CLI
npm install -g @angular/cli

# Verify installation
ng version

# Create new application
ng new my-app
cd my-app

# Serve development server
ng serve
# or with specific port
ng serve --port 4300 --open

# Generate components, services, etc.
ng generate component components/header
ng generate service services/user
ng generate module features/dashboard --routing
ng generate guard guards/auth
ng generate pipe pipes/capitalize
ng generate directive directives/highlight

# Build for production
ng build --configuration production

# Run tests
ng test

# Run e2e tests
ng e2e

# Lint code
ng lint

# Add packages
ng add @angular/material
ng add @ngrx/store
```

### Component Basics

```typescript
// app.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'My Angular App';
  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    console.log('Component initialized');
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}

// user.component.ts
import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
} from '@angular/core';

interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'user';
}

@Component({
  selector: 'app-user',
  template: `
    <div class="user-card">
      <h3>{{ user.name }}</h3>
      <p>{{ user.email }}</p>
      <span class="badge">{{ user.role }}</span>
      <button (click)="onEdit()">Edit</button>
      <button (click)="onDelete()">Delete</button>
    </div>
  `,
  styles: [
    `
      .user-card {
        padding: 20px;
        border: 1px solid #ddd;
        border-radius: 8px;
        margin-bottom: 10px;
      }
      .badge {
        background: #007bff;
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
      }
    `,
  ],
})
export class UserComponent implements OnChanges {
  @Input() user!: User;
  @Input() editable: boolean = true;
  @Output() edit = new EventEmitter<User>();
  @Output() delete = new EventEmitter<number>();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['user']) {
      console.log('User changed:', changes['user'].currentValue);
    }
  }

  onEdit(): void {
    this.edit.emit(this.user);
  }

  onDelete(): void {
    this.delete.emit(this.user.id);
  }
}

// Standalone component (Angular 14+)
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-counter',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div>
      <h2>Count: {{ count }}</h2>
      <button (click)="increment()">+</button>
      <button (click)="decrement()">-</button>
      <button (click)="reset()">Reset</button>
    </div>
  `,
})
export class CounterComponent {
  count = 0;

  increment(): void {
    this.count++;
  }

  decrement(): void {
    this.count--;
  }

  reset(): void {
    this.count = 0;
  }
}
```

### Services and Dependency Injection

```typescript
// services/user.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { catchError, map, tap, retry, shareReplay } from 'rxjs/operators';

interface User {
  id: number;
  name: string;
  email: string;
}

@Injectable({
  providedIn: 'root', // Singleton service
})
export class UserService {
  private apiUrl = 'https://api.example.com/users';
  private usersSubject = new BehaviorSubject<User[]>([]);
  public users$ = this.usersSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadUsers();
  }

  private loadUsers(): void {
    this.getUsers().subscribe((users) => {
      this.usersSubject.next(users);
    });
  }

  getUsers(): Observable<User[]> {
    return this.http
      .get<User[]>(this.apiUrl)
      .pipe(retry(3), shareReplay(1), catchError(this.handleError));
  }

  getUserById(id: number): Observable<User> {
    return this.http
      .get<User>(`${this.apiUrl}/${id}`)
      .pipe(catchError(this.handleError));
  }

  createUser(user: Omit<User, 'id'>): Observable<User> {
    return this.http
      .post<User>(this.apiUrl, user, {
        headers: new HttpHeaders({
          'Content-Type': 'application/json',
        }),
      })
      .pipe(
        tap((newUser) => {
          const users = this.usersSubject.value;
          this.usersSubject.next([...users, newUser]);
        }),
        catchError(this.handleError)
      );
  }

  updateUser(id: number, user: Partial<User>): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/${id}`, user).pipe(
      tap((updatedUser) => {
        const users = this.usersSubject.value;
        const index = users.findIndex((u) => u.id === id);
        if (index !== -1) {
          users[index] = updatedUser;
          this.usersSubject.next([...users]);
        }
      }),
      catchError(this.handleError)
    );
  }

  deleteUser(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      tap(() => {
        const users = this.usersSubject.value.filter((u) => u.id !== id);
        this.usersSubject.next(users);
      }),
      catchError(this.handleError)
    );
  }

  searchUsers(query: string): Observable<User[]> {
    const params = new HttpParams().set('q', query);
    return this.http
      .get<User[]>(this.apiUrl, { params })
      .pipe(catchError(this.handleError));
  }

  private handleError(error: any): Observable<never> {
    console.error('An error occurred:', error);
    return throwError(() => new Error('Something went wrong'));
  }
}

// services/logger.service.ts
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class LoggerService {
  log(message: string): void {
    console.log(`[LOG] ${new Date().toISOString()}: ${message}`);
  }

  error(message: string, error?: any): void {
    console.error(`[ERROR] ${new Date().toISOString()}: ${message}`, error);
  }

  warn(message: string): void {
    console.warn(`[WARN] ${new Date().toISOString()}: ${message}`);
  }
}

// Providing services at different levels
@Component({
  selector: 'app-feature',
  providers: [UserService], // Component-level (new instance per component)
})
export class FeatureComponent {
  constructor(private userService: UserService) {}
}
```

### RxJS Patterns

```typescript
// rxjs-patterns.ts
import {
  Observable, Subject, BehaviorSubject, ReplaySubject, AsyncSubject,
  fromEvent, interval, of, from, combineLatest, merge, concat, forkJoin,
  race, zip, EMPTY, throwError
} from 'rxjs';
import {
  map, filter, take, takeUntil, takeWhile, skip, debounceTime, throttleTime,
  distinctUntilChanged, switchMap, mergeMap, concatMap, exhaustMap,
  catchError, retry, tap, finalize, shareReplay, scan, reduce,
  startWith, withLatestFrom, combineLatestWith
} from 'rxjs/operators';

// Search with debounce
class SearchService {
  search(term: string): Observable<any[]> {
    return this.http.get<any[]>(`/api/search?q=${term}`);
  }

  constructor(private http: any) {}
}

// In component
searchTerm$ = new Subject<string>();
results$ = this.searchTerm$.pipe(
  debounceTime(300),
  distinctUntilChanged(),
  switchMap(term => {
    if (!term.trim()) {
      return of([]);
    }
    return this.searchService.search(term).pipe(
      catchError(() => of([]))
    );
  })
);

// Combining multiple streams
user$ = this.userService.getCurrentUser();
permissions$ = this.permissionService.getPermissions();
settings$ = this.settingsService.getSettings();

viewModel$ = combineLatest([
  this.user$,
  this.permissions$,
  this.settings$
]).pipe(
  map(([user, permissions, settings]) => ({
    user,
    permissions,
    settings,
    canEdit: permissions.includes('edit')
  }))
);

// Error handling and retry
data$ = this.http.get('/api/data').pipe(
  retry({
    count: 3,
    delay: 1000
  }),
  catchError(error => {
    this.logger.error('Failed to fetch data', error);
    return of(null);
  })
);

// Unsubscribe pattern
private destroy$ = new Subject<void>();

ngOnInit(): void {
  this.dataService.getData()
    .pipe(takeUntil(this.destroy$))
    .subscribe(data => {
      console.log(data);
    });
}

ngOnDestroy(): void {
  this.destroy$.next();
  this.destroy$.complete();
}

// Higher-order mapping operators
// switchMap: Cancel previous, use latest
searchResults$ = this.searchTerm$.pipe(
  switchMap(term => this.search(term))
);

// mergeMap: Run all concurrently
uploadedFiles$ = this.files$.pipe(
  mergeMap(file => this.uploadFile(file))
);

// concatMap: Run sequentially in order
processedItems$ = this.items$.pipe(
  concatMap(item => this.processItem(item))
);

// exhaustMap: Ignore new until current completes
saveClicks$ = this.saveButton$.pipe(
  exhaustMap(() => this.saveData())
);

// Advanced patterns
// Pagination
page$ = new BehaviorSubject<number>(1);
pageSize = 10;

pagedData$ = this.page$.pipe(
  switchMap(page =>
    this.getData(page, this.pageSize)
  ),
  shareReplay(1)
);

// Polling
polling$ = interval(5000).pipe(
  switchMap(() => this.fetchData()),
  takeUntil(this.destroy$)
);

// State management with scan
actions$ = new Subject<{type: string, payload: any}>();

state$ = this.actions$.pipe(
  scan((state, action) => {
    switch (action.type) {
      case 'ADD':
        return { ...state, items: [...state.items, action.payload] };
      case 'REMOVE':
        return {
          ...state,
          items: state.items.filter(i => i.id !== action.payload)
        };
      default:
        return state;
    }
  }, { items: [] })
);
```

### Reactive Forms

```typescript
// user-form.component.ts
import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormArray,
  FormControl,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'app-user-form',
  template: `
    <form [formGroup]="userForm" (ngSubmit)="onSubmit()">
      <div>
        <label>Name:</label>
        <input formControlName="name" type="text" />
        <div *ngIf="name.invalid && name.touched">
          <small *ngIf="name.errors?.['required']">Name is required</small>
          <small *ngIf="name.errors?.['minlength']">
            Name must be at least 3 characters
          </small>
        </div>
      </div>

      <div>
        <label>Email:</label>
        <input formControlName="email" type="email" />
        <div *ngIf="email.invalid && email.touched">
          <small *ngIf="email.errors?.['required']">Email is required</small>
          <small *ngIf="email.errors?.['email']">Invalid email format</small>
          <small *ngIf="email.errors?.['emailTaken']"
            >Email already taken</small
          >
        </div>
      </div>

      <div>
        <label>Password:</label>
        <input formControlName="password" type="password" />
      </div>

      <div>
        <label>Confirm Password:</label>
        <input formControlName="confirmPassword" type="password" />
        <div
          *ngIf="
            userForm.errors?.['passwordMismatch'] && confirmPassword.touched
          "
        >
          <small>Passwords do not match</small>
        </div>
      </div>

      <div formGroupName="address">
        <h3>Address</h3>
        <input formControlName="street" placeholder="Street" />
        <input formControlName="city" placeholder="City" />
        <input formControlName="zipCode" placeholder="Zip Code" />
      </div>

      <div>
        <h3>Phone Numbers</h3>
        <div formArrayName="phoneNumbers">
          <div *ngFor="let phone of phoneNumbers.controls; let i = index">
            <input [formControlName]="i" />
            <button type="button" (click)="removePhone(i)">Remove</button>
          </div>
        </div>
        <button type="button" (click)="addPhone()">Add Phone</button>
      </div>

      <button type="submit" [disabled]="userForm.invalid">Submit</button>
    </form>

    <pre>{{ userForm.value | json }}</pre>
  `,
})
export class UserFormComponent implements OnInit {
  userForm!: FormGroup;

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.userForm = this.fb.group(
      {
        name: ['', [Validators.required, Validators.minLength(3)]],
        email: [
          '',
          [Validators.required, Validators.email],
          [this.emailValidator],
        ],
        password: ['', [Validators.required, Validators.minLength(8)]],
        confirmPassword: ['', Validators.required],
        address: this.fb.group({
          street: [''],
          city: [''],
          zipCode: ['', Validators.pattern(/^\d{5}$/)],
        }),
        phoneNumbers: this.fb.array([]),
      },
      { validators: this.passwordMatchValidator }
    );

    // React to form changes
    this.userForm.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe((value) => {
        console.log('Form changed:', value);
      });

    // Watch specific field
    this.email.valueChanges.subscribe((value) => {
      console.log('Email changed:', value);
    });
  }

  get name(): FormControl {
    return this.userForm.get('name') as FormControl;
  }

  get email(): FormControl {
    return this.userForm.get('email') as FormControl;
  }

  get password(): FormControl {
    return this.userForm.get('password') as FormControl;
  }

  get confirmPassword(): FormControl {
    return this.userForm.get('confirmPassword') as FormControl;
  }

  get phoneNumbers(): FormArray {
    return this.userForm.get('phoneNumbers') as FormArray;
  }

  addPhone(): void {
    this.phoneNumbers.push(this.fb.control(''));
  }

  removePhone(index: number): void {
    this.phoneNumbers.removeAt(index);
  }

  // Custom validator
  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');

    if (!password || !confirmPassword) {
      return null;
    }

    return password.value === confirmPassword.value
      ? null
      : { passwordMismatch: true };
  }

  // Async validator
  emailValidator(
    control: AbstractControl
  ): Observable<ValidationErrors | null> {
    return this.checkEmailExists(control.value).pipe(
      map((exists) => (exists ? { emailTaken: true } : null))
    );
  }

  private checkEmailExists(email: string): Observable<boolean> {
    // Simulate API call
    return of(false);
  }

  onSubmit(): void {
    if (this.userForm.valid) {
      console.log('Form submitted:', this.userForm.value);
    } else {
      this.userForm.markAllAsTouched();
    }
  }
}
```

### Route Guards and Interceptors

```typescript
// guards/auth.guard.ts
import { Injectable } from '@angular/core';
import {
  CanActivate,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  Router,
} from '@angular/router';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    return this.authService.isAuthenticated$.pipe(
      take(1),
      map((isAuthenticated) => {
        if (isAuthenticated) {
          return true;
        }
        this.router.navigate(['/login'], {
          queryParams: { returnUrl: state.url },
        });
        return false;
      })
    );
  }
}

// guards/role.guard.ts
import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot } from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class RoleGuard implements CanActivate {
  constructor(private authService: AuthService) {}

  canActivate(route: ActivatedRouteSnapshot): Observable<boolean> {
    const requiredRole = route.data['role'];

    return this.authService.currentUser$.pipe(
      map((user) => user?.role === requiredRole)
    );
  }
}

// interceptors/auth.interceptor.ts
import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private authService: AuthService) {}

  intercept(
    req: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    const token = this.authService.getToken();

    if (token) {
      req = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
        },
      });
    }

    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          return this.authService.refreshToken().pipe(
            switchMap((newToken) => {
              const clonedReq = req.clone({
                setHeaders: {
                  Authorization: `Bearer ${newToken}`,
                },
              });
              return next.handle(clonedReq);
            }),
            catchError((refreshError) => {
              this.authService.logout();
              return throwError(() => refreshError);
            })
          );
        }
        return throwError(() => error);
      })
    );
  }
}

// interceptors/logging.interceptor.ts
import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap, finalize } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements HttpInterceptor {
  intercept(
    req: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    const started = Date.now();

    return next.handle(req).pipe(
      tap({
        next: (event) => console.log(`Request for ${req.url} succeeded`),
        error: (error) => console.error(`Request for ${req.url} failed`),
      }),
      finalize(() => {
        const elapsed = Date.now() - started;
        console.log(`Request for ${req.url} took ${elapsed}ms`);
      })
    );
  }
}

// Register in module
import { HTTP_INTERCEPTORS } from '@angular/common/http';

@NgModule({
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: LoggingInterceptor, multi: true },
  ],
})
export class AppModule {}
```
