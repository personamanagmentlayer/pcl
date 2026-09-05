# Ruby Expert — Ruby on Rails

Reference material for the `ruby-expert` skill. See [SKILL.md](../SKILL.md).

## Ruby on Rails

### Rails 7+ Application

```ruby
# app/models/user.rb
class User < ApplicationRecord
  # Validations
  validates :email, presence: true, uniqueness: true, format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :name, presence: true, length: { minimum: 2, maximum: 100 }
  validates :age, numericality: { greater_than_or_equal_to: 18 }, allow_nil: true

  # Associations
  has_many :posts, dependent: :destroy
  has_many :comments, dependent: :destroy
  has_many :likes, dependent: :destroy
  has_many :liked_posts, through: :likes, source: :post

  # Scopes
  scope :active, -> { where(active: true) }
  scope :recent, -> { order(created_at: :desc) }
  scope :with_posts, -> { joins(:posts).distinct }

  # Callbacks
  before_save :normalize_email
  after_create :send_welcome_email

  # Enums
  enum role: { user: 0, moderator: 1, admin: 2 }

  # Instance methods
  def full_name
    "#{first_name} #{last_name}"
  end

  def admin?
    role == 'admin'
  end

  private

  def normalize_email
    self.email = email.downcase.strip
  end

  def send_welcome_email
    UserMailer.welcome(self).deliver_later
  end
end

# app/models/post.rb
class Post < ApplicationRecord
  belongs_to :user
  has_many :comments, dependent: :destroy
  has_many :likes, dependent: :destroy
  has_many :liking_users, through: :likes, source: :user

  has_one_attached :cover_image
  has_rich_text :content

  validates :title, presence: true, length: { minimum: 5, maximum: 200 }
  validates :content, presence: true

  scope :published, -> { where(published: true) }
  scope :by_user, ->(user) { where(user: user) }
  scope :search, ->(query) { where('title ILIKE ? OR content ILIKE ?', "%#{query}%", "%#{query}%") }

  before_save :generate_slug

  def publish!
    update!(published: true, published_at: Time.current)
  end

  private

  def generate_slug
    self.slug = title.parameterize
  end
end
```

### Controllers

```ruby
# app/controllers/api/v1/posts_controller.rb
module Api
  module V1
    class PostsController < ApplicationController
      before_action :authenticate_user!, except: [:index, :show]
      before_action :set_post, only: [:show, :update, :destroy]
      before_action :authorize_post, only: [:update, :destroy]

      # GET /api/v1/posts
      def index
        @posts = Post.published
                     .includes(:user, :comments)
                     .page(params[:page])
                     .per(20)

        render json: @posts, each_serializer: PostSerializer
      end

      # GET /api/v1/posts/:id
      def show
        render json: @post, serializer: PostSerializer, include: [:user, :comments]
      end

      # POST /api/v1/posts
      def create
        @post = current_user.posts.build(post_params)

        if @post.save
          render json: @post, serializer: PostSerializer, status: :created
        else
          render json: { errors: @post.errors.full_messages }, status: :unprocessable_entity
        end
      end

      # PATCH/PUT /api/v1/posts/:id
      def update
        if @post.update(post_params)
          render json: @post, serializer: PostSerializer
        else
          render json: { errors: @post.errors.full_messages }, status: :unprocessable_entity
        end
      end

      # DELETE /api/v1/posts/:id
      def destroy
        @post.destroy
        head :no_content
      end

      private

      def set_post
        @post = Post.find(params[:id])
      rescue ActiveRecord::RecordNotFound
        render json: { error: 'Post not found' }, status: :not_found
      end

      def authorize_post
        unless @post.user == current_user || current_user.admin?
          render json: { error: 'Unauthorized' }, status: :forbidden
        end
      end

      def post_params
        params.require(:post).permit(:title, :content, :published, :cover_image)
      end
    end
  end
end
```

### Active Record Queries

```ruby
# Efficient queries
User.includes(:posts).where(posts: { published: true })
User.joins(:posts).group('users.id').having('COUNT(posts.id) > ?', 5)
User.left_joins(:posts).where(posts: { id: nil })  # Users with no posts

# Complex queries
Post.where('created_at > ?', 1.week.ago)
    .where(published: true)
    .order(created_at: :desc)
    .limit(10)

# Find or create
user = User.find_or_create_by(email: 'user@example.com') do |u|
  u.name = 'New User'
  u.role = :user
end

# Upsert (Rails 6+)
User.upsert({ email: 'user@example.com', name: 'Alice' }, unique_by: :email)

# Batch processing
User.find_each(batch_size: 100) do |user|
  user.update_subscription_status
end

# Transactions
ActiveRecord::Base.transaction do
  user.update!(balance: user.balance - amount)
  recipient.update!(balance: recipient.balance + amount)
  Transaction.create!(from: user, to: recipient, amount: amount)
end

# Raw SQL (when needed)
ActiveRecord::Base.connection.execute(
  "SELECT * FROM users WHERE created_at > '2024-01-01'"
)
```

### Background Jobs (Sidekiq)

```ruby
# app/jobs/send_email_job.rb
class SendEmailJob < ApplicationJob
  queue_as :default
  retry_on Net::SMTPServerBusy, wait: :exponentially_longer

  def perform(user_id, email_type)
    user = User.find(user_id)
    case email_type
    when 'welcome'
      UserMailer.welcome(user).deliver_now
    when 'notification'
      UserMailer.notification(user).deliver_now
    end
  end
end

# Usage
SendEmailJob.perform_later(user.id, 'welcome')
SendEmailJob.set(wait: 1.hour).perform_later(user.id, 'notification')
```

### Mailers

```ruby
# app/mailers/user_mailer.rb
class UserMailer < ApplicationMailer
  default from: 'noreply@example.com'

  def welcome(user)
    @user = user
    @url  = 'https://example.com/login'
    mail(to: @user.email, subject: 'Welcome to My App')
  end

  def notification(user, message)
    @user = user
    @message = message
    mail(
      to: @user.email,
      subject: 'New Notification',
      reply_to: 'support@example.com'
    )
  end
end
```

### Routes

```ruby
# config/routes.rb
Rails.application.routes.draw do
  root 'home#index'

  # RESTful resources
  resources :posts do
    member do
      post :publish
      post :like
    end
    collection do
      get :trending
    end
    resources :comments, only: [:create, :destroy]
  end

  # Nested resources
  resources :users do
    resources :posts, only: [:index, :show]
  end

  # Namespaced routes
  namespace :api do
    namespace :v1 do
      resources :posts, only: [:index, :show, :create, :update, :destroy]
      resources :users, only: [:index, :show]
    end
  end

  # Constraints
  constraints(subdomain: 'api') do
    scope module: 'api' do
      resources :posts
    end
  end

  # Custom routes
  get '/about', to: 'pages#about'
  post '/contact', to: 'pages#contact'
end
```
