# Flask Expert — REST API with Flask-RESTful

Reference material for the `flask-expert` skill. See [SKILL.md](../SKILL.md).

## REST API with Flask-RESTful

```python
from flask import Blueprint
from flask_restful import Api, Resource, reqparse, fields, marshal_with
from flask_jwt_extended import jwt_required, get_jwt_identity
from .models import db, User, Post

api_bp = Blueprint('api', __name__)
api = Api(api_bp)

# Request parsers
user_parser = reqparse.RequestParser()
user_parser.add_argument('email', type=str, required=True, help='Email is required')
user_parser.add_argument('password', type=str, required=True, help='Password is required')

post_parser = reqparse.RequestParser()
post_parser.add_argument('title', type=str, required=True)
post_parser.add_argument('content', type=str, required=True)

# Response marshalling
user_fields = {
    'id': fields.Integer,
    'email': fields.String,
    'created_at': fields.DateTime(dt_format='iso8601')
}

post_fields = {
    'id': fields.Integer,
    'title': fields.String,
    'content': fields.String,
    'author': fields.Nested(user_fields),
    'created_at': fields.DateTime(dt_format='iso8601')
}

# Resources
class UserListResource(Resource):
    @marshal_with(user_fields)
    def get(self):
        """Get all users"""
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)

        users = User.query.paginate(page=page, per_page=per_page)
        return users.items

    def post(self):
        """Create new user"""
        args = user_parser.parse_args()

        if User.query.filter_by(email=args['email']).first():
            return {'message': 'Email already exists'}, 400

        user = User(email=args['email'])
        user.set_password(args['password'])

        db.session.add(user)
        db.session.commit()

        return user.to_dict(), 201

class UserResource(Resource):
    @marshal_with(user_fields)
    def get(self, user_id):
        """Get user by ID"""
        user = User.query.get_or_404(user_id)
        return user

    @jwt_required()
    def delete(self, user_id):
        """Delete user"""
        current_user_id = get_jwt_identity()

        if current_user_id != user_id:
            return {'message': 'Unauthorized'}, 403

        user = User.query.get_or_404(user_id)
        db.session.delete(user)
        db.session.commit()

        return '', 204

class PostListResource(Resource):
    @marshal_with(post_fields)
    def get(self):
        """Get all posts"""
        posts = Post.query.order_by(Post.created_at.desc()).all()
        return posts

    @jwt_required()
    def post(self):
        """Create new post"""
        args = post_parser.parse_args()
        current_user_id = get_jwt_identity()

        post = Post(
            title=args['title'],
            content=args['content'],
            user_id=current_user_id
        )

        db.session.add(post)
        db.session.commit()

        return post.to_dict(), 201

# Register resources
api.add_resource(UserListResource, '/users')
api.add_resource(UserResource, '/users/<int:user_id>')
api.add_resource(PostListResource, '/posts')
```
