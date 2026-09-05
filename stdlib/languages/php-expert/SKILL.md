---
name: php-expert
version: 1.1.0
description: >-
  Expert-level PHP development with PHP 8+, Laravel, Composer, and modern best practices.
  Use when the user mentions Laravel, Composer, Symfony, PHPUnit, or PSR standards, or when
  the task involves PHP 8+ Features, Object-Oriented PHP, Modern PHP, or Constructor
  Property Promotion.
category: languages
tags: [php, laravel, composer, symfony, phpunit, psr]
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash(php:*, composer:*, artisan:*)
---

# PHP Expert

Expert guidance for modern PHP development including PHP 8+ features, Laravel framework, Composer dependency management, and PHP best practices.

## Core Concepts

### PHP 8+ Features

- Union types and mixed type
- Named arguments
- Attributes (annotations)
- Constructor property promotion
- Match expressions
- Nullsafe operator
- JIT compiler
- Fibers (PHP 8.1+)
- Readonly properties and classes

### Object-Oriented PHP

- Classes and objects
- Interfaces and abstract classes
- Traits
- Namespaces
- Autoloading (PSR-4)
- Type declarations
- Visibility modifiers

### Modern PHP

- Strict types
- Return type declarations
- Property type declarations
- Enums (PHP 8.1+)
- First-class callable syntax

## Testing with PHPUnit

### Feature Tests

```php
<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Post;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PostControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_list_posts(): void
    {
        Post::factory()->count(3)->create(['published' => true]);
        Post::factory()->create(['published' => false]);

        $response = $this->getJson('/api/posts');

        $response->assertOk()
            ->assertJsonCount(3, 'data');
    }

    public function test_can_create_post_when_authenticated(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user, 'api')
            ->postJson('/api/posts', [
                'title' => 'Test Post',
                'content' => 'Test content with enough characters to pass validation.',
            ]);

        $response->assertCreated()
            ->assertJsonPath('data.title', 'Test Post');

        $this->assertDatabaseHas('posts', [
            'title' => 'Test Post',
            'user_id' => $user->id,
        ]);
    }

    public function test_cannot_create_post_when_not_authenticated(): void
    {
        $response = $this->postJson('/api/posts', [
            'title' => 'Test Post',
            'content' => 'Test content',
        ]);

        $response->assertUnauthorized();
    }

    public function test_validates_post_creation(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user, 'api')
            ->postJson('/api/posts', [
                'title' => '', // Invalid
                'content' => 'Short', // Too short
            ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['title', 'content']);
    }

    public function test_can_update_own_post(): void
    {
        $user = User::factory()->create();
        $post = Post::factory()->create(['user_id' => $user->id]);

        $response = $this->actingAs($user, 'api')
            ->putJson("/api/posts/{$post->id}", [
                'title' => 'Updated Title',
                'content' => 'Updated content with enough characters.',
            ]);

        $response->assertOk();
        $this->assertDatabaseHas('posts', [
            'id' => $post->id,
            'title' => 'Updated Title',
        ]);
    }

    public function test_cannot_update_other_user_post(): void
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();
        $post = Post::factory()->create(['user_id' => $otherUser->id]);

        $response = $this->actingAs($user, 'api')
            ->putJson("/api/posts/{$post->id}", [
                'title' => 'Updated Title',
            ]);

        $response->assertForbidden();
    }
}
```

### Unit Tests

```php
<?php

namespace Tests\Unit;

use App\Models\User;
use App\Models\Post;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_has_posts(): void
    {
        $user = User::factory()->create();
        $posts = Post::factory()->count(3)->create(['user_id' => $user->id]);

        $this->assertCount(3, $user->posts);
        $this->assertTrue($user->posts->contains($posts->first()));
    }

    public function test_is_admin_returns_true_for_admin_users(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $user = User::factory()->create(['is_admin' => false]);

        $this->assertTrue($admin->isAdmin());
        $this->assertFalse($user->isAdmin());
    }
}
```

### Factories

```php
<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class PostFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'title' => fake()->sentence(),
            'slug' => fake()->slug(),
            'content' => fake()->paragraphs(5, true),
            'excerpt' => fake()->paragraph(),
            'published' => false,
            'published_at' => null,
            'tags' => fake()->words(3),
        ];
    }

    public function published(): static
    {
        return $this->state(fn (array $attributes) => [
            'published' => true,
            'published_at' => now(),
        ]);
    }

    public function withUser(User $user): static
    {
        return $this->state(fn (array $attributes) => [
            'user_id' => $user->id,
        ]);
    }
}
```

## Best Practices

### Type Safety

```php
<?php
declare(strict_types=1);

// Always use strict types
// Use type declarations for parameters and return types
// Use property types where possible
```

### Dependency Injection

```php
<?php

// Use constructor injection
class UserService
{
    public function __construct(
        private UserRepository $repository,
        private EventDispatcher $dispatcher,
    ) {}

    public function createUser(array $data): User
    {
        $user = $this->repository->create($data);
        $this->dispatcher->dispatch(new UserCreated($user));
        return $user;
    }
}
```

### PSR Standards

- PSR-1: Basic Coding Standard
- PSR-4: Autoloading Standard
- PSR-12: Extended Coding Style
- PSR-7: HTTP Message Interface

## Anti-Patterns to Avoid

❌ **Not using strict types**: Always declare(strict_types=1)
❌ **Fat controllers**: Extract logic to services
❌ **N+1 queries**: Use eager loading
❌ **No type declarations**: Use types everywhere
❌ **Ignoring PSR standards**: Follow PSR-4, PSR-12
❌ **Direct DB queries in controllers**: Use repositories
❌ **Missing validation**: Always validate input
❌ **No tests**: Write tests for critical code

## Reference Documentation

Detailed material lives alongside this skill and is read on demand:

- [Laravel Framework](references/LARAVEL_FRAMEWORK.md) — Models, Controllers, Form Requests, API Resources, Eloquent Queries, Migrations, Jobs (Queues), Events and Listeners
- [Modern PHP 8+ Syntax](references/MODERN_PHP_8_SYNTAX.md) — Constructor Property Promotion, Named Arguments, Union Types and Mixed, Match Expression, Nullsafe Operator, Attributes (Annotations), Enums (PHP 8.1+), Readonly Properties and Classes

## Resources

- PHP Documentation: https://www.php.net/docs.php
- Laravel Documentation: https://laravel.com/docs
- Composer: https://getcomposer.org/
- PSR Standards: https://www.php-fig.org/psr/
- PHPUnit: https://phpunit.de/
