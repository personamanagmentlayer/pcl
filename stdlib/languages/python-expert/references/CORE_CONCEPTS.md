# Python Expert — Core Expertise

Reference material for the `python-expert` skill. See [SKILL.md](../SKILL.md).

## Core Expertise

### Modern Python (3.12+)

**Type Hints and Static Typing:**

```python
from typing import TypeVar, Generic, Protocol, TypedDict, Literal
from collections.abc import Callable, Sequence, Iterable

# Type aliases
UserId = int
Username = str

# TypedDict for structured dictionaries
class UserDict(TypedDict):
    id: UserId
    name: Username
    email: str
    age: int

# Generic types
T = TypeVar('T')

class Stack(Generic[T]):
    def __init__(self) -> None:
        self._items: list[T] = []

    def push(self, item: T) -> None:
        self._items.append(item)

    def pop(self) -> T | None:
        return self._items.pop() if self._items else None

# Protocol for structural subtyping
class Drawable(Protocol):
    def draw(self) -> None: ...

def render(item: Drawable) -> None:
    item.draw()

# Literal types
def set_mode(mode: Literal["read", "write", "append"]) -> None:
    pass

# Union types (Python 3.10+)
def process(value: int | str | None) -> str:
    match value:
        case int(n):
            return f"Number: {n}"
        case str(s):
            return f"String: {s}"
        case None:
            return "No value"
```

**Pattern Matching (3.10+):**

```python
def handle_command(command: dict) -> str:
    match command:
        case {"action": "create", "resource": resource, "data": data}:
            return f"Creating {resource} with {data}"
        case {"action": "update", "resource": resource, "id": id, "data": data}:
            return f"Updating {resource} {id} with {data}"
        case {"action": "delete", "resource": resource, "id": id}:
            return f"Deleting {resource} {id}"
        case {"action": "list", "resource": resource}:
            return f"Listing {resource}"
        case _:
            return "Unknown command"

# Match with guards
def categorize_number(n: int) -> str:
    match n:
        case n if n < 0:
            return "negative"
        case 0:
            return "zero"
        case n if n > 100:
            return "large positive"
        case n:
            return "small positive"
```

**Structural Pattern Matching:**

```python
class Point:
    __match_args__ = ('x', 'y')

    def __init__(self, x: int, y: int):
        self.x = x
        self.y = y

def describe_point(point: Point) -> str:
    match point:
        case Point(0, 0):
            return "Origin"
        case Point(0, y):
            return f"On Y-axis at {y}"
        case Point(x, 0):
            return f"On X-axis at {x}"
        case Point(x, y):
            return f"At ({x}, {y})"
```

**Dataclasses and Attrs:**

```python
from dataclasses import dataclass, field
from datetime import datetime

@dataclass(frozen=True, slots=True)  # Immutable, memory-efficient
class User:
    id: int
    name: str
    email: str
    created_at: datetime = field(default_factory=datetime.now)
    metadata: dict = field(default_factory=dict)

    def __post_init__(self):
        # Validation
        if not self.email or '@' not in self.email:
            raise ValueError("Invalid email")

# Using attrs (more feature-rich)
from attrs import define, field

@define
class Product:
    id: int
    name: str
    price: float = field(validator=lambda i, a, v: v > 0)
    tags: list[str] = field(factory=list)
```

### Async Programming

**Async/Await:**

```python
import asyncio
import aiohttp
from typing import List

async def fetch_url(session: aiohttp.ClientSession, url: str) -> str:
    async with session.get(url) as response:
        return await response.text()

async def fetch_all(urls: List[str]) -> List[str]:
    async with aiohttp.ClientSession() as session:
        tasks = [fetch_url(session, url) for url in urls]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        return results

# Run async code
urls = ["https://example.com", "https://example.org"]
results = asyncio.run(fetch_all(urls))

# Async context managers
class AsyncResource:
    async def __aenter__(self):
        await self.connect()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.disconnect()

    async def connect(self):
        await asyncio.sleep(0.1)  # Simulate connection

    async def disconnect(self):
        await asyncio.sleep(0.1)  # Simulate disconnection

# Usage
async def use_resource():
    async with AsyncResource() as resource:
        # Use resource
        pass

# Async iterators
class AsyncRange:
    def __init__(self, start: int, stop: int):
        self.current = start
        self.stop = stop

    def __aiter__(self):
        return self

    async def __anext__(self):
        if self.current >= self.stop:
            raise StopAsyncIteration
        await asyncio.sleep(0.1)
        self.current += 1
        return self.current - 1

# Usage
async def iterate():
    async for i in AsyncRange(0, 5):
        print(i)
```

**Concurrent Execution:**

```python
import asyncio
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor

# CPU-bound work in processes
def cpu_intensive(n: int) -> int:
    return sum(i * i for i in range(n))

async def run_cpu_tasks():
    loop = asyncio.get_event_loop()
    with ProcessPoolExecutor() as pool:
        results = await asyncio.gather(*[
            loop.run_in_executor(pool, cpu_intensive, 1_000_000)
            for _ in range(4)
        ])
    return results

# I/O-bound work in threads
async def run_io_tasks():
    loop = asyncio.get_event_loop()
    with ThreadPoolExecutor() as pool:
        results = await asyncio.gather(*[
            loop.run_in_executor(pool, blocking_io_function)
            for _ in range(10)
        ])
    return results
```

### Web Frameworks

**FastAPI (Modern, Async):**

```python
from fastapi import FastAPI, HTTPException, Depends, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.ext.asyncio import AsyncSession

app = FastAPI(title="My API", version="1.0.0")

# Pydantic models for validation
class UserCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    age: int = Field(..., ge=0, le=150)

class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    age: int

    class Config:
        from_attributes = True

# Dependency injection
security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> User:
    # Verify token and return user
    user = await verify_token(credentials.credentials)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    return user

# Routes
@app.get("/users", response_model=list[UserResponse])
async def get_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    users = await db.execute(
        select(User).offset(skip).limit(limit)
    )
    return users.scalars().all()

@app.get("/users/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@app.post("/users", response_model=UserResponse, status_code=201)
async def create_user(
    user: UserCreate,
    db: AsyncSession = Depends(get_db)
):
    db_user = User(**user.dict())
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    return db_user

@app.put("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user: UserCreate,
    db: AsyncSession = Depends(get_db)
):
    db_user = await db.get(User, user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    for key, value in user.dict().items():
        setattr(db_user, key, value)

    await db.commit()
    await db.refresh(db_user)
    return db_user

@app.delete("/users/{user_id}", status_code=204)
async def delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_db)
):
    db_user = await db.get(User, user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    await db.delete(db_user)
    await db.commit()
```

**SQLAlchemy 2.0 (Async):**

```python
from sqlalchemy import select, and_, or_
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.ext.asyncio import async_sessionmaker
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

class Base(DeclarativeBase):
    pass

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(index=True)
    email: Mapped[str] = mapped_column(unique=True)
    age: Mapped[int]

    posts: Mapped[list["Post"]] = relationship(back_populates="user")

class Post(Base):
    __tablename__ = "posts"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str]
    content: Mapped[str]
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))

    user: Mapped[User] = relationship(back_populates="posts")

# Database setup
engine = create_async_engine("postgresql+asyncpg://localhost/mydb")
async_session = async_sessionmaker(engine, class_=AsyncSession)

# Queries
async def get_users():
    async with async_session() as session:
        result = await session.execute(
            select(User).where(User.age > 18).order_by(User.name)
        )
        return result.scalars().all()

async def get_user_with_posts(user_id: int):
    async with async_session() as session:
        result = await session.execute(
            select(User)
            .where(User.id == user_id)
            .options(selectinload(User.posts))
        )
        return result.scalar_one_or_none()
```

### Testing

**Pytest:**

```python
import pytest
from unittest.mock import Mock, patch, AsyncMock

# Fixtures
@pytest.fixture
def user():
    return User(id=1, name="Alice", email="alice@example.com")

@pytest.fixture
async def db_session():
    async with async_session() as session:
        yield session
        await session.rollback()

# Parametrized tests
@pytest.mark.parametrize("input,expected", [
    ("", False),
    ("invalid", False),
    ("test@example.com", True),
    ("user+tag@domain.co.uk", True),
])
def test_email_validation(input, expected):
    assert is_valid_email(input) == expected

# Async tests
@pytest.mark.asyncio
async def test_fetch_user(db_session):
    user = User(name="Alice", email="alice@example.com", age=30)
    db_session.add(user)
    await db_session.commit()

    result = await get_user(user.id, db_session)
    assert result.name == "Alice"

# Mocking
def test_api_call():
    with patch('requests.get') as mock_get:
        mock_get.return_value.json.return_value = {"id": 1, "name": "Alice"}

        result = fetch_user_data(1)

        assert result["name"] == "Alice"
        mock_get.assert_called_once_with("https://api.example.com/users/1")

# Async mocking
@pytest.mark.asyncio
async def test_async_api_call():
    with patch('aiohttp.ClientSession.get') as mock_get:
        mock_response = AsyncMock()
        mock_response.json.return_value = {"id": 1, "name": "Alice"}
        mock_get.return_value.__aenter__.return_value = mock_response

        result = await fetch_user_async(1)
        assert result["name"] == "Alice"

# Test classes
class TestUserService:
    @pytest.fixture(autouse=True)
    def setup(self):
        self.service = UserService()

    def test_create_user(self, user):
        result = self.service.create(user)
        assert result.id is not None

    def test_invalid_email_raises_error(self):
        with pytest.raises(ValidationError):
            self.service.create(User(name="Test", email="invalid"))
```
