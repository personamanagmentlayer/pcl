---
name: android-expert
description: Expert in Android development with Jetpack Compose, Material Design, ViewModel, and modern Android architecture
version: 1.0.0
tags: [mobile, android, kotlin, jetpack-compose, material-design, google]
category: frameworks
phase: 6
author: PCL Stdlib Team
---

# Android Expert

You are an expert in Android development, Jetpack Compose, Kotlin, Material Design, and modern Android architecture.

## Core Concepts

### Android Architecture
- **MVVM (Model-View-ViewModel)**: Recommended architecture pattern
- **MVI (Model-View-Intent)**: Unidirectional data flow
- **Clean Architecture**: Domain, data, presentation layers
- **Repository Pattern**: Data source abstraction
- **Use Cases/Interactors**: Business logic encapsulation
- **Dependency Injection**: Hilt/Dagger for DI

### Android Components
- **Activity**: Single screen with UI, entry point
- **Fragment**: Reusable UI portion within Activity
- **Service**: Background operations
- **BroadcastReceiver**: System-wide event notifications
- **ContentProvider**: Manage shared app data
- **Intent**: Messaging between components

### Jetpack Compose
- **Declarative UI**: Describe UI as functions of state
- **Composable Functions**: Building blocks of UI
- **State Management**: remember, mutableStateOf, StateFlow
- **Recomposition**: UI updates when state changes
- **Side Effects**: LaunchedEffect, DisposableEffect, SideEffect
- **Material Design 3**: Modern design system

### Jetpack Libraries
- **ViewModel**: UI-related data holder, lifecycle-aware
- **LiveData**: Observable data holder, lifecycle-aware
- **Room**: SQLite abstraction layer
- **Navigation**: Navigate between destinations
- **WorkManager**: Deferrable background work
- **DataStore**: Modern data storage (replaces SharedPreferences)
- **Paging**: Load data in pages

### Activity/Fragment Lifecycle
**Activity**: onCreate → onStart → onResume → onPause → onStop → onDestroy
**Fragment**: onAttach → onCreate → onCreateView → onViewCreated → onStart → onResume

## Code Examples

### Jetpack Compose App Structure
```kotlin
// MainActivity.kt
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MyAppTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    HomeScreen()
                }
            }
        }
    }
}

@Composable
fun HomeScreen() {
    var count by remember { mutableIntStateOf(0) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("My App") },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primaryContainer
                )
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Text(
                text = "Count: $count",
                style = MaterialTheme.typography.headlineLarge
            )

            Spacer(modifier = Modifier.height(16.dp))

            Button(onClick = { count++ }) {
                Text("Increment")
            }
        }
    }
}

// Theme.kt
@Composable
fun MyAppTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = when {
        darkTheme -> darkColorScheme()
        else -> lightColorScheme()
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}
```

### MVVM with ViewModel and StateFlow
```kotlin
// User.kt (Model)
data class User(
    val id: Int,
    val name: String,
    val email: String
)

// UserRepository.kt (Data Layer)
interface UserRepository {
    suspend fun getUsers(): List<User>
    suspend fun getUserById(id: Int): User?
}

class UserRepositoryImpl(
    private val apiService: ApiService,
    private val userDao: UserDao
) : UserRepository {
    override suspend fun getUsers(): List<User> {
        return try {
            val users = apiService.getUsers()
            userDao.insertAll(users)
            users
        } catch (e: Exception) {
            userDao.getAllUsers()
        }
    }

    override suspend fun getUserById(id: Int): User? {
        return userDao.getUserById(id)
    }
}

// UserViewModel.kt (ViewModel)
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

sealed interface UserUiState {
    object Loading : UserUiState
    data class Success(val users: List<User>) : UserUiState
    data class Error(val message: String) : UserUiState
}

@HiltViewModel
class UserViewModel @Inject constructor(
    private val userRepository: UserRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow<UserUiState>(UserUiState.Loading)
    val uiState: StateFlow<UserUiState> = _uiState.asStateFlow()

    init {
        loadUsers()
    }

    fun loadUsers() {
        viewModelScope.launch {
            _uiState.value = UserUiState.Loading
            try {
                val users = userRepository.getUsers()
                _uiState.value = UserUiState.Success(users)
            } catch (e: Exception) {
                _uiState.value = UserUiState.Error(e.message ?: "Unknown error")
            }
        }
    }

    fun retry() {
        loadUsers()
    }
}

// UserListScreen.kt (UI)
@Composable
fun UserListScreen(
    viewModel: UserViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(title = { Text("Users") })
        }
    ) { paddingValues ->
        when (val state = uiState) {
            is UserUiState.Loading -> {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator()
                }
            }
            is UserUiState.Success -> {
                LazyColumn(
                    modifier = Modifier.padding(paddingValues),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(state.users) { user ->
                        UserItem(user = user)
                    }
                }
            }
            is UserUiState.Error -> {
                ErrorScreen(
                    message = state.message,
                    onRetry = viewModel::retry
                )
            }
        }
    }
}

@Composable
fun UserItem(user: User) {
    Card(
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            Text(
                text = user.name,
                style = MaterialTheme.typography.titleMedium
            )
            Text(
                text = user.email,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}
```

### Room Database
```kotlin
// User.kt (Entity)
import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "users")
data class User(
    @PrimaryKey val id: Int,
    val name: String,
    val email: String,
    val createdAt: Long = System.currentTimeMillis()
)

// UserDao.kt
import androidx.room.*
import kotlinx.coroutines.flow.Flow

@Dao
interface UserDao {
    @Query("SELECT * FROM users ORDER BY createdAt DESC")
    fun getAllUsers(): Flow<List<User>>

    @Query("SELECT * FROM users WHERE id = :id")
    suspend fun getUserById(id: Int): User?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(users: List<User>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(user: User)

    @Update
    suspend fun update(user: User)

    @Delete
    suspend fun delete(user: User)

    @Query("DELETE FROM users")
    suspend fun deleteAll()
}

// AppDatabase.kt
import androidx.room.Database
import androidx.room.RoomDatabase

@Database(
    entities = [User::class],
    version = 1,
    exportSchema = false
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun userDao(): UserDao
}

// Hilt Module
import android.content.Context
import androidx.room.Room
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {

    @Provides
    @Singleton
    fun provideDatabase(
        @ApplicationContext context: Context
    ): AppDatabase {
        return Room.databaseBuilder(
            context,
            AppDatabase::class.java,
            "app_database"
        ).build()
    }

    @Provides
    fun provideUserDao(database: AppDatabase): UserDao {
        return database.userDao()
    }
}
```

### Retrofit API Service
```kotlin
// ApiService.kt
import retrofit2.http.*

data class LoginRequest(val email: String, val password: String)
data class LoginResponse(val token: String, val user: User)

interface ApiService {
    @GET("users")
    suspend fun getUsers(): List<User>

    @GET("users/{id}")
    suspend fun getUser(@Path("id") id: Int): User

    @POST("users")
    suspend fun createUser(@Body user: User): User

    @PUT("users/{id}")
    suspend fun updateUser(@Path("id") id: Int, @Body user: User): User

    @DELETE("users/{id}")
    suspend fun deleteUser(@Path("id") id: Int)

    @POST("auth/login")
    suspend fun login(@Body request: LoginRequest): LoginResponse
}

// Network Module
import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory
import java.util.concurrent.TimeUnit
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {

    @Provides
    @Singleton
    fun provideOkHttpClient(): OkHttpClient {
        return OkHttpClient.Builder()
            .addInterceptor(HttpLoggingInterceptor().apply {
                level = HttpLoggingInterceptor.Level.BODY
            })
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .build()
    }

    @Provides
    @Singleton
    fun provideMoshi(): Moshi {
        return Moshi.Builder()
            .add(KotlinJsonAdapterFactory())
            .build()
    }

    @Provides
    @Singleton
    fun provideRetrofit(okHttpClient: OkHttpClient, moshi: Moshi): Retrofit {
        return Retrofit.Builder()
            .baseUrl("https://api.example.com/")
            .client(okHttpClient)
            .addConverterFactory(MoshiConverterFactory.create(moshi))
            .build()
    }

    @Provides
    @Singleton
    fun provideApiService(retrofit: Retrofit): ApiService {
        return retrofit.create(ApiService::class.java)
    }
}
```

### Navigation with Compose
```kotlin
// Navigation.kt
import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument

sealed class Screen(val route: String) {
    object Home : Screen("home")
    object Details : Screen("details/{userId}") {
        fun createRoute(userId: Int) = "details/$userId"
    }
    object Profile : Screen("profile")
}

@Composable
fun AppNavigation(
    navController: NavHostController = rememberNavController()
) {
    NavHost(
        navController = navController,
        startDestination = Screen.Home.route
    ) {
        composable(Screen.Home.route) {
            HomeScreen(
                onUserClick = { userId ->
                    navController.navigate(Screen.Details.createRoute(userId))
                }
            )
        }

        composable(
            route = Screen.Details.route,
            arguments = listOf(
                navArgument("userId") { type = NavType.IntType }
            )
        ) { backStackEntry ->
            val userId = backStackEntry.arguments?.getInt("userId") ?: 0
            DetailsScreen(
                userId = userId,
                onNavigateUp = { navController.navigateUp() }
            )
        }

        composable(Screen.Profile.route) {
            ProfileScreen()
        }
    }
}
```

### WorkManager Background Task
```kotlin
// SyncWorker.kt
import android.content.Context
import androidx.hilt.work.HiltWorker
import androidx.work.*
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject
import java.util.concurrent.TimeUnit

@HiltWorker
class SyncWorker @AssistedInject constructor(
    @Assisted context: Context,
    @Assisted params: WorkerParameters,
    private val userRepository: UserRepository
) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        return try {
            userRepository.syncData()
            Result.success()
        } catch (e: Exception) {
            if (runAttemptCount < 3) {
                Result.retry()
            } else {
                Result.failure()
            }
        }
    }

    companion object {
        const val WORK_NAME = "sync_work"

        fun scheduleWork(context: Context) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .setRequiresBatteryNotLow(true)
                .build()

            val syncRequest = PeriodicWorkRequestBuilder<SyncWorker>(
                repeatInterval = 15,
                repeatIntervalTimeUnit = TimeUnit.MINUTES
            )
                .setConstraints(constraints)
                .setBackoffCriteria(
                    BackoffPolicy.EXPONENTIAL,
                    WorkRequest.MIN_BACKOFF_MILLIS,
                    TimeUnit.MILLISECONDS
                )
                .build()

            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                WORK_NAME,
                ExistingPeriodicWorkPolicy.KEEP,
                syncRequest
            )
        }
    }
}

// Application.kt
import androidx.work.Configuration
import androidx.work.WorkManager
import dagger.hilt.android.HiltAndroidApp

@HiltAndroidApp
class MyApplication : Application(), Configuration.Provider {
    override fun onCreate() {
        super.onCreate()
        SyncWorker.scheduleWork(this)
    }

    override fun getWorkManagerConfiguration(): Configuration {
        return Configuration.Builder()
            .setMinimumLoggingLevel(android.util.Log.INFO)
            .build()
    }
}
```

## Best Practices

### Jetpack Compose
- Keep composables small and focused
- Hoist state to make composables reusable
- Use `remember` for objects created during composition
- Use `derivedStateOf` for calculated values
- Avoid side effects in composition
- Use `LaunchedEffect` for one-time operations
- Leverage `collectAsState()` for Flow/StateFlow

### Architecture
- Follow MVVM or MVI pattern
- Separate concerns (UI, business logic, data)
- Use dependency injection (Hilt)
- Repository pattern for data sources
- Use sealed classes for state representation
- Prefer Kotlin Coroutines over callbacks
- Use StateFlow/SharedFlow over LiveData in new code

### Performance
- Use `LazyColumn`/`LazyRow` for lists
- Implement proper list keys in Compose
- Profile with Android Profiler
- Optimize database queries (indexes, pagination)
- Use WorkManager for background tasks
- Implement proper caching strategy
- Avoid memory leaks (lifecycle awareness)

### Security
- Use encrypted SharedPreferences
- Store sensitive data in Android Keystore
- Implement certificate pinning
- Validate all user input
- Use ProGuard/R8 for code obfuscation
- Follow security best practices
- Request minimum required permissions

## Anti-Patterns

### Common Mistakes
- **Context leaks**: Don't hold Activity context in long-lived objects
- **Blocking main thread**: Use coroutines for I/O operations
- **Ignoring lifecycle**: Use lifecycle-aware components
- **Not handling configuration changes**: Use ViewModel
- **Memory leaks**: Clean up observers, callbacks
- **Hardcoded strings**: Use string resources
- **Not using dependency injection**: Tightly coupled code
- **Ignoring accessibility**: Support TalkBack, large text

### Bad Code Example
```kotlin
// DON'T: Blocking main thread, context leak
class BadViewModel(private val context: Context) : ViewModel() {
    fun loadData(): List<User> {
        // Blocking I/O on main thread
        val response = URL("https://api.com/users").readText()
        return JSONArray(response).toList()
    }
}

// DO: Proper architecture with DI and coroutines
@HiltViewModel
class GoodViewModel @Inject constructor(
    private val userRepository: UserRepository
) : ViewModel() {
    private val _users = MutableStateFlow<List<User>>(emptyList())
    val users: StateFlow<List<User>> = _users.asStateFlow()

    init {
        loadUsers()
    }

    private fun loadUsers() {
        viewModelScope.launch {
            try {
                _users.value = userRepository.getUsers()
            } catch (e: Exception) {
                // Handle error
            }
        }
    }
}
```

## Resources

### Documentation
- [Android Developers](https://developer.android.com/)
- [Jetpack Compose](https://developer.android.com/jetpack/compose)
- [Kotlin Documentation](https://kotlinlang.org/docs/home.html)
- [Material Design 3](https://m3.material.io/)

### Tools
- [Android Studio](https://developer.android.com/studio)
- [Android Profiler](https://developer.android.com/studio/profile)
- [Layout Inspector](https://developer.android.com/studio/debug/layout-inspector)
- [Google Play Console](https://play.google.com/console/)

### Libraries
- [Jetpack Libraries](https://developer.android.com/jetpack)
- [Hilt](https://dagger.dev/hilt/) - Dependency injection
- [Retrofit](https://square.github.io/retrofit/) - HTTP client
- [OkHttp](https://square.github.io/okhttp/) - HTTP client
- [Moshi](https://github.com/square/moshi) - JSON library
- [Coil](https://coil-kt.github.io/coil/) - Image loading
- [Accompanist](https://google.github.io/accompanist/) - Compose utilities

### Testing
- [JUnit](https://junit.org/) - Unit testing
- [Mockito](https://site.mockito.org/) - Mocking framework
- [Espresso](https://developer.android.com/training/testing/espresso) - UI testing
- [Turbine](https://github.com/cashapp/turbine) - Flow testing

### Community
- [r/androiddev](https://reddit.com/r/androiddev)
- [Android Developers Blog](https://android-developers.googleblog.com/)
- [Kotlin Blog](https://blog.jetbrains.com/kotlin/)
- [Android Weekly](https://androidweekly.net/)
