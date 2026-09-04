---
name: ruby-expert
version: 1.1.0
description: >-
  Expert-level Ruby development with Rails, modern features, testing, and best practices.
  Use when the user mentions Ruby on Rails, RSpec, gem, Sinatra, or metaprogramming, or
  when the task involves Ruby 3+ Features, Object-Oriented, Functional Features, or Pattern
  Matching.
category: languages
tags: [ruby, rails, rspec, gem, sinatra, metaprogramming]
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash(ruby:*, gem:*, bundle:*, rails:*)
---

# Ruby Expert

Expert guidance for Ruby development, including Ruby 3+ features, Rails framework, testing with RSpec, and Ruby best practices.

## Core Concepts

### Ruby 3+ Features

- Pattern matching
- Ractors (parallel execution)
- Fibers (cooperative concurrency)
- Type signatures (RBS)
- Endless methods
- Numbered block parameters
- Hash literal value omission

### Object-Oriented

- Everything is an object
- Classes and modules
- Inheritance and mixins
- Method visibility (public, private, protected)
- Singleton methods and eigenclasses
- Duck typing

### Functional Features

- Blocks, procs, and lambdas
- Higher-order functions (map, reduce, select)
- Enumerables
- Lazy evaluation

## Modern Ruby Syntax

### Pattern Matching (Ruby 3.0+)

```ruby
# Case/in pattern matching
def process_response(response)
  case response
  in { status: 200, body: }
    puts "Success: #{body}"
  in { status: 404 }
    puts "Not found"
  in { status: 500..599, error: message }
    puts "Server error: #{message}"
  else
    puts "Unknown response"
  end
end

# Rightward assignment
response = { status: 200, body: "OK" }
response => { status:, body: }
puts status  # 200
puts body    # "OK"

# Array pattern matching
def summarize(data)
  case data
  in []
    "Empty"
  in [item]
    "Single item: #{item}"
  in [first, *rest]
    "First: #{first}, Rest: #{rest.length} items"
  end
end
```

### Endless Methods

```ruby
# Single-line method definition
def greet(name) = "Hello, #{name}!"

def square(x) = x * x

def full_name = "#{first_name} #{last_name}"

class User
  attr_reader :name, :email

  def initialize(name:, email:) = (@name = name; @email = email)

  def admin? = @role == :admin
end
```

### Numbered Block Parameters

```ruby
# Use _1, _2, etc. for block parameters
[1, 2, 3].map { _1 * 2 }  # [2, 4, 6]

{ a: 1, b: 2 }.map { "#{_1}: #{_2}" }  # ["a: 1", "b: 2"]

users.sort_by { [_1.last_name, _1.first_name] }
```

### Hash Literal Value Omission

```ruby
name = "Alice"
age = 30
email = "alice@example.com"

# Before
user = { name: name, age: age, email: email }

# After (Ruby 3.1+)
user = { name:, age:, email: }
```

## Testing with RSpec

### Model Specs

```ruby
# spec/models/user_spec.rb
require 'rails_helper'

RSpec.describe User, type: :model do
  describe 'validations' do
    it { should validate_presence_of(:email) }
    it { should validate_uniqueness_of(:email) }
    it { should validate_presence_of(:name) }
    it { should validate_length_of(:name).is_at_least(2).is_at_most(100) }
  end

  describe 'associations' do
    it { should have_many(:posts).dependent(:destroy) }
    it { should have_many(:comments).dependent(:destroy) }
  end

  describe '#full_name' do
    it 'returns the full name' do
      user = User.new(first_name: 'Alice', last_name: 'Smith')
      expect(user.full_name).to eq('Alice Smith')
    end
  end

  describe '#admin?' do
    it 'returns true for admin users' do
      user = User.new(role: :admin)
      expect(user).to be_admin
    end

    it 'returns false for regular users' do
      user = User.new(role: :user)
      expect(user).not_to be_admin
    end
  end

  describe 'callbacks' do
    it 'normalizes email before save' do
      user = create(:user, email: ' Alice@Example.COM ')
      expect(user.email).to eq('alice@example.com')
    end

    it 'sends welcome email after create' do
      expect {
        create(:user)
      }.to have_enqueued_job(SendEmailJob).with(anything, 'welcome')
    end
  end
end
```

### Controller Specs

```ruby
# spec/controllers/posts_controller_spec.rb
require 'rails_helper'

RSpec.describe PostsController, type: :controller do
  let(:user) { create(:user) }
  let(:post) { create(:post, user: user) }

  describe 'GET #index' do
    it 'returns a success response' do
      get :index
      expect(response).to have_http_status(:success)
    end

    it 'assigns @posts' do
      post1 = create(:post, published: true)
      post2 = create(:post, published: true)
      get :index
      expect(assigns(:posts)).to match_array([post1, post2])
    end
  end

  describe 'POST #create' do
    context 'when authenticated' do
      before { sign_in user }

      context 'with valid params' do
        let(:valid_params) { { post: { title: 'Test Post', content: 'Content' } } }

        it 'creates a new post' do
          expect {
            post :create, params: valid_params
          }.to change(Post, :count).by(1)
        end

        it 'returns created status' do
          post :create, params: valid_params
          expect(response).to have_http_status(:created)
        end
      end

      context 'with invalid params' do
        let(:invalid_params) { { post: { title: '' } } }

        it 'does not create a post' do
          expect {
            post :create, params: invalid_params
          }.not_to change(Post, :count)
        end

        it 'returns unprocessable entity status' do
          post :create, params: invalid_params
          expect(response).to have_http_status(:unprocessable_entity)
        end
      end
    end

    context 'when not authenticated' do
      it 'returns unauthorized status' do
        post :create, params: { post: { title: 'Test' } }
        expect(response).to have_http_status(:unauthorized)
      end
    end
  end
end
```

### Request Specs

```ruby
# spec/requests/api/v1/posts_spec.rb
require 'rails_helper'

RSpec.describe 'Api::V1::Posts', type: :request do
  let(:user) { create(:user) }
  let(:headers) { { 'Authorization' => "Bearer #{user.auth_token}" } }

  describe 'GET /api/v1/posts' do
    before do
      create_list(:post, 3, published: true)
      create(:post, published: false)
    end

    it 'returns published posts' do
      get '/api/v1/posts'
      expect(response).to have_http_status(:success)
      expect(JSON.parse(response.body).length).to eq(3)
    end

    it 'paginates results' do
      create_list(:post, 25, published: true)
      get '/api/v1/posts', params: { page: 2 }
      expect(JSON.parse(response.body).length).to eq(8)  # 28 total, 20 per page
    end
  end

  describe 'POST /api/v1/posts' do
    context 'with valid params' do
      let(:valid_params) do
        { post: { title: 'Test Post', content: 'Content' } }
      end

      it 'creates a post' do
        expect {
          post '/api/v1/posts', params: valid_params, headers: headers
        }.to change(Post, :count).by(1)
      end

      it 'returns the created post' do
        post '/api/v1/posts', params: valid_params, headers: headers
        expect(response).to have_http_status(:created)
        expect(JSON.parse(response.body)['title']).to eq('Test Post')
      end
    end
  end
end
```

### FactoryBot

```ruby
# spec/factories/users.rb
FactoryBot.define do
  factory :user do
    sequence(:email) { |n| "user#{n}@example.com" }
    name { Faker::Name.name }
    password { 'password123' }
    role { :user }

    trait :admin do
      role { :admin }
    end

    trait :with_posts do
      transient do
        posts_count { 5 }
      end

      after(:create) do |user, evaluator|
        create_list(:post, evaluator.posts_count, user: user)
      end
    end
  end

  factory :post do
    association :user
    title { Faker::Lorem.sentence }
    content { Faker::Lorem.paragraph }
    published { false }

    trait :published do
      published { true }
      published_at { Time.current }
    end
  end
end

# Usage
user = create(:user)
admin = create(:user, :admin)
user_with_posts = create(:user, :with_posts, posts_count: 10)
published_post = create(:post, :published)
```

## Metaprogramming

```ruby
# Define methods dynamically
class User
  %w[name email phone].each do |attr|
    define_method("#{attr}_present?") do
      send(attr).present?
    end
  end
end

# Method missing
class Configuration
  def initialize
    @settings = {}
  end

  def method_missing(method, *args)
    method_name = method.to_s
    if method_name.end_with?('=')
      @settings[method_name.chomp('=')] = args.first
    else
      @settings[method_name]
    end
  end

  def respond_to_missing?(method, include_private = false)
    true
  end
end

config = Configuration.new
config.api_key = 'secret'
config.api_key  # => 'secret'

# Class macros
module Timestampable
  def self.included(base)
    base.extend(ClassMethods)
  end

  module ClassMethods
    def timestampable
      before_save :set_timestamps

      define_method(:set_timestamps) do
        self.updated_at = Time.current
        self.created_at ||= Time.current
      end
    end
  end
end

class Post
  include Timestampable
  timestampable
end
```

## Best Practices

### Code Style

- Follow Ruby Style Guide
- Use 2-space indentation
- Prefer symbols over strings for keys
- Use `snake_case` for methods and variables
- Use `CamelCase` for classes
- Use meaningful variable names

### Performance

- Use `includes` to avoid N+1 queries
- Add database indexes on foreign keys
- Use `select` to load only needed columns
- Use `find_each` for large datasets
- Cache expensive computations

### Security

- Use strong parameters in controllers
- Sanitize user input
- Protect against SQL injection (use parameterized queries)
- Use CSRF protection
- Implement authentication and authorization
- Keep dependencies updated

## Anti-Patterns to Avoid

❌ **Fat models**: Extract logic to service objects
❌ **N+1 queries**: Use `includes` or `eager_load`
❌ **Long controller actions**: Extract to services
❌ **Missing indexes**: Add indexes on foreign keys
❌ **Skipping validations**: Always validate data
❌ **Exposing internals**: Use serializers for API responses
❌ **Global state**: Avoid global variables and class variables

## Reference Documentation

Detailed material lives alongside this skill and is read on demand:

- [Ruby on Rails](references/RUBY_ON_RAILS.md) — Rails 7+ Application, Controllers, Active Record Queries, Background Jobs (Sidekiq), Mailers, Routes

## Resources

- Ruby Documentation: https://ruby-doc.org/
- Rails Guides: https://guides.rubyonrails.org/
- RSpec: https://rspec.info/
- Ruby Style Guide: https://rubystyle.guide/
- Rails API: https://api.rubyonrails.org/
