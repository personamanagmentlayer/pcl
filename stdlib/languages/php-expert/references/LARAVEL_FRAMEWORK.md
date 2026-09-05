# PHP Expert — Laravel Framework

Reference material for the `php-expert` skill. See [SKILL.md](../SKILL.md).

## Laravel Framework

### Models

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class User extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'name',
        'email',
        'password',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'is_admin' => 'boolean',
        'settings' => 'array',
    ];

    // Relationships
    public function posts(): HasMany
    {
        return $this->hasMany(Post::class);
    }

    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(Role::class);
    }

    // Accessors (Laravel 9+)
    protected function name(): Attribute
    {
        return Attribute::make(
            get: fn (string $value) => ucfirst($value),
            set: fn (string $value) => strtolower($value),
        );
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('active', true);
    }

    public function scopeAdmins($query)
    {
        return $query->where('is_admin', true);
    }

    // Methods
    public function isAdmin(): bool
    {
        return $this->is_admin;
    }
}

// Usage
$users = User::active()->get();
$admins = User::admins()->get();
$user = User::with('posts', 'roles')->find(1);
```

### Controllers

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StorePostRequest;
use App\Http\Requests\UpdatePostRequest;
use App\Http\Resources\PostResource;
use App\Models\Post;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class PostController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:api')->except(['index', 'show']);
    }

    public function index(): AnonymousResourceCollection
    {
        $posts = Post::with('user')
            ->published()
            ->latest()
            ->paginate(20);

        return PostResource::collection($posts);
    }

    public function show(Post $post): PostResource
    {
        $post->load(['user', 'comments.user']);
        return new PostResource($post);
    }

    public function store(StorePostRequest $request): JsonResponse
    {
        $post = $request->user()->posts()->create(
            $request->validated()
        );

        return response()->json(
            new PostResource($post),
            201
        );
    }

    public function update(UpdatePostRequest $request, Post $post): PostResource
    {
        $this->authorize('update', $post);

        $post->update($request->validated());

        return new PostResource($post);
    }

    public function destroy(Post $post): JsonResponse
    {
        $this->authorize('delete', $post);

        $post->delete();

        return response()->json(null, 204);
    }
}
```

### Form Requests

```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StorePostRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:200'],
            'content' => ['required', 'string', 'min:100'],
            'published' => ['sometimes', 'boolean'],
            'tags' => ['sometimes', 'array'],
            'tags.*' => ['string', 'max:50'],
        ];
    }

    public function messages(): array
    {
        return [
            'title.required' => 'Please provide a title for your post',
            'content.min' => 'Post content must be at least 100 characters',
        ];
    }
}
```

### API Resources

```php
<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PostResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'slug' => $this->slug,
            'content' => $this->when(
                $request->routeIs('posts.show'),
                $this->content
            ),
            'excerpt' => $this->excerpt,
            'published' => $this->published,
            'published_at' => $this->published_at?->toIso8601String(),
            'author' => new UserResource($this->whenLoaded('user')),
            'comments' => CommentResource::collection(
                $this->whenLoaded('comments')
            ),
            'tags' => $this->tags,
            'created_at' => $this->created_at->toIso8601String(),
            'updated_at' => $this->updated_at->toIso8601String(),
        ];
    }
}
```

### Eloquent Queries

```php
<?php

// Basic queries
$users = User::all();
$user = User::find(1);
$user = User::where('email', 'user@example.com')->first();

// Complex queries
$posts = Post::where('published', true)
    ->where('created_at', '>', now()->subWeek())
    ->orderBy('created_at', 'desc')
    ->limit(10)
    ->get();

// Eager loading (avoid N+1)
$posts = Post::with(['user', 'comments.user'])->get();

// Lazy eager loading
$posts = Post::all();
$posts->load('user');

// Conditional loading
$posts = Post::with([
    'user' => function ($query) {
        $query->select('id', 'name', 'email');
    },
    'comments' => function ($query) {
        $query->latest()->limit(5);
    },
])->get();

// Aggregates
$count = Post::where('published', true)->count();
$sum = Order::where('status', 'completed')->sum('total');
$avg = Product::avg('price');

// Chunk processing
Post::chunk(100, function ($posts) {
    foreach ($posts as $post) {
        // Process post
    }
});

// Transactions
DB::transaction(function () use ($data) {
    $user = User::create($data['user']);
    $profile = $user->profile()->create($data['profile']);
    $user->roles()->attach($data['roles']);
});
```

### Migrations

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('posts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->string('slug')->unique();
            $table->text('content');
            $table->text('excerpt')->nullable();
            $table->boolean('published')->default(false);
            $table->timestamp('published_at')->nullable();
            $table->json('tags')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('published');
            $table->index('published_at');
            $table->index(['user_id', 'published']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('posts');
    }
};
```

### Jobs (Queues)

```php
<?php

namespace App\Jobs;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class SendWelcomeEmail implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public User $user,
    ) {}

    public function handle(): void
    {
        Mail::to($this->user->email)
            ->send(new WelcomeEmail($this->user));
    }

    public function failed(\Throwable $exception): void
    {
        // Handle job failure
        Log::error('Failed to send welcome email', [
            'user_id' => $this->user->id,
            'error' => $exception->getMessage(),
        ]);
    }
}

// Dispatch job
SendWelcomeEmail::dispatch($user);
SendWelcomeEmail::dispatch($user)->delay(now()->addMinutes(10));
SendWelcomeEmail::dispatch($user)->onQueue('emails');
```

### Events and Listeners

```php
<?php

// Event
namespace App\Events;

use App\Models\Post;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class PostPublished
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public Post $post,
    ) {}
}

// Listener
namespace App\Listeners;

use App\Events\PostPublished;
use App\Notifications\NewPostNotification;

class NotifyFollowers
{
    public function handle(PostPublished $event): void
    {
        $followers = $event->post->user->followers;

        foreach ($followers as $follower) {
            $follower->notify(new NewPostNotification($event->post));
        }
    }
}

// Register in EventServiceProvider
protected $listen = [
    PostPublished::class => [
        NotifyFollowers::class,
    ],
];

// Dispatch event
PostPublished::dispatch($post);
```
