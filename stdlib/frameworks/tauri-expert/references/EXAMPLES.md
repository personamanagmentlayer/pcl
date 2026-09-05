# Tauri Expert — Code Examples

Reference material for the `tauri-expert` skill. See [SKILL.md](../SKILL.md).

## Code Examples

### Basic Tauri App Structure

```toml
# Cargo.toml
[package]
name = "my-tauri-app"
version = "0.1.0"
edition = "2021"

[dependencies]
tauri = { version = "1.5", features = ["shell-open"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"

[build-dependencies]
tauri-build = { version = "1.5", features = [] }
```

```rust
// src-tauri/main.rs
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;

#[derive(Clone, serde::Serialize)]
struct Payload {
    message: String,
}

// Basic command
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

// Command with error handling
#[tauri::command]
fn divide(a: f64, b: f64) -> Result<f64, String> {
    if b == 0.0 {
        Err("Cannot divide by zero".to_string())
    } else {
        Ok(a / b)
    }
}

// Async command
#[tauri::command]
async fn fetch_data(url: String) -> Result<String, String> {
    reqwest::get(&url)
        .await
        .map_err(|e| e.to_string())?
        .text()
        .await
        .map_err(|e| e.to_string())
}

// Command with app state
struct AppState {
    counter: std::sync::Mutex<i32>,
}

#[tauri::command]
fn increment_counter(state: tauri::State<AppState>) -> i32 {
    let mut counter = state.counter.lock().unwrap();
    *counter += 1;
    *counter
}

fn main() {
    tauri::Builder::default()
        .manage(AppState {
            counter: std::sync::Mutex::new(0),
        })
        .setup(|app| {
            // Emit event on startup
            app.emit_all("app-started", Payload {
                message: "App has started!".into(),
            }).unwrap();
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            divide,
            fetch_data,
            increment_counter
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

```json
// tauri.conf.json
{
  "build": {
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build",
    "devPath": "http://localhost:5173",
    "distDir": "../dist"
  },
  "package": {
    "productName": "My Tauri App",
    "version": "0.1.0"
  },
  "tauri": {
    "allowlist": {
      "all": false,
      "shell": {
        "all": false,
        "open": true
      },
      "fs": {
        "all": false,
        "readFile": true,
        "writeFile": true,
        "scope": ["$APPDATA/*"]
      },
      "dialog": {
        "all": false,
        "open": true,
        "save": true
      },
      "http": {
        "all": false,
        "request": true,
        "scope": ["https://api.example.com/*"]
      }
    },
    "bundle": {
      "active": true,
      "category": "DeveloperTool",
      "copyright": "Copyright (c) 2024",
      "identifier": "com.example.myapp",
      "icon": [
        "icons/32x32.png",
        "icons/128x128.png",
        "icons/icon.icns",
        "icons/icon.ico"
      ],
      "targets": "all"
    },
    "security": {
      "csp": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
    },
    "windows": [
      {
        "fullscreen": false,
        "resizable": true,
        "title": "My Tauri App",
        "width": 800,
        "height": 600
      }
    ]
  }
}
```

### Frontend Integration (React + TypeScript)

```typescript
// src/App.tsx
import { useState } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { listen } from '@tauri-apps/api/event';
import { open } from '@tauri-apps/api/dialog';
import { readTextFile, writeTextFile } from '@tauri-apps/api/fs';

interface Payload {
  message: string;
}

function App() {
  const [greetMsg, setGreetMsg] = useState('');
  const [name, setName] = useState('');
  const [counter, setCounter] = useState(0);

  // Call Rust command
  async function greet() {
    try {
      const msg = await invoke<string>('greet', { name });
      setGreetMsg(msg);
    } catch (error) {
      console.error('Error calling greet:', error);
    }
  }

  // Call async command with error handling
  async function fetchData() {
    try {
      const data = await invoke<string>('fetch_data', {
        url: 'https://api.example.com/data'
      });
      console.log('Fetched data:', data);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  }

  // Increment counter
  async function increment() {
    try {
      const newCount = await invoke<number>('increment_counter');
      setCounter(newCount);
    } catch (error) {
      console.error('Error incrementing:', error);
    }
  }

  // File operations
  async function openFile() {
    try {
      const selected = await open({
        multiple: false,
        filters: [{
          name: 'Text Files',
          extensions: ['txt', 'md']
        }]
      });

      if (selected && typeof selected === 'string') {
        const contents = await readTextFile(selected);
        console.log('File contents:', contents);
      }
    } catch (error) {
      console.error('Error opening file:', error);
    }
  }

  // Listen to events
  useState(() => {
    const unlisten = listen<Payload>('app-started', (event) => {
      console.log('App started event:', event.payload.message);
    });

    return () => {
      unlisten.then(fn => fn());
    };
  }, []);

  return (
    <div className="container">
      <h1>Welcome to Tauri!</h1>

      <div className="row">
        <input
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          placeholder="Enter a name..."
        />
        <button onClick={greet}>Greet</button>
      </div>

      <p>{greetMsg}</p>

      <div className="row">
        <p>Counter: {counter}</p>
        <button onClick={increment}>Increment</button>
      </div>

      <div className="row">
        <button onClick={openFile}>Open File</button>
        <button onClick={fetchData}>Fetch Data</button>
      </div>
    </div>
  );
}

export default App;
```

### Advanced Rust Commands

```rust
// src-tauri/src/database.rs
use serde::{Deserialize, Serialize};
use std::sync::Mutex;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct User {
    pub id: i32,
    pub name: String,
    pub email: String,
}

pub struct Database {
    users: Mutex<Vec<User>>,
}

impl Database {
    pub fn new() -> Self {
        Database {
            users: Mutex::new(Vec::new()),
        }
    }

    pub fn add_user(&self, user: User) -> Result<(), String> {
        let mut users = self.users.lock().unwrap();
        users.push(user);
        Ok(())
    }

    pub fn get_users(&self) -> Vec<User> {
        let users = self.users.lock().unwrap();
        users.clone()
    }

    pub fn get_user(&self, id: i32) -> Option<User> {
        let users = self.users.lock().unwrap();
        users.iter().find(|u| u.id == id).cloned()
    }

    pub fn update_user(&self, id: i32, updated: User) -> Result<(), String> {
        let mut users = self.users.lock().unwrap();
        if let Some(user) = users.iter_mut().find(|u| u.id == id) {
            *user = updated;
            Ok(())
        } else {
            Err("User not found".to_string())
        }
    }

    pub fn delete_user(&self, id: i32) -> Result<(), String> {
        let mut users = self.users.lock().unwrap();
        if let Some(pos) = users.iter().position(|u| u.id == id) {
            users.remove(pos);
            Ok(())
        } else {
            Err("User not found".to_string())
        }
    }
}

// src-tauri/src/main.rs
mod database;
use database::{Database, User};

#[tauri::command]
fn add_user(db: tauri::State<Database>, user: User) -> Result<(), String> {
    db.add_user(user)
}

#[tauri::command]
fn get_users(db: tauri::State<Database>) -> Vec<User> {
    db.get_users()
}

#[tauri::command]
fn get_user(db: tauri::State<Database>, id: i32) -> Option<User> {
    db.get_user(id)
}

#[tauri::command]
fn update_user(db: tauri::State<Database>, id: i32, user: User) -> Result<(), String> {
    db.update_user(id, user)
}

#[tauri::command]
fn delete_user(db: tauri::State<Database>, id: i32) -> Result<(), String> {
    db.delete_user(id)
}

fn main() {
    tauri::Builder::default()
        .manage(Database::new())
        .invoke_handler(tauri::generate_handler![
            add_user,
            get_users,
            get_user,
            update_user,
            delete_user
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### Window Management

```rust
// src-tauri/src/main.rs
use tauri::{CustomMenuItem, Menu, MenuItem, Submenu, WindowBuilder, WindowUrl};

#[tauri::command]
fn create_new_window(app: tauri::AppHandle) -> Result<(), String> {
    WindowBuilder::new(
        &app,
        "new-window",
        WindowUrl::App("index.html".into())
    )
    .title("New Window")
    .inner_size(600.0, 400.0)
    .build()
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
fn close_window(window: tauri::Window) -> Result<(), String> {
    window.close().map_err(|e| e.to_string())
}

fn main() {
    let quit = CustomMenuItem::new("quit".to_string(), "Quit");
    let close = CustomMenuItem::new("close".to_string(), "Close");
    let submenu = Submenu::new("File", Menu::new().add_item(close).add_item(quit));
    let menu = Menu::new()
        .add_native_item(MenuItem::Copy)
        .add_item(CustomMenuItem::new("hide", "Hide"))
        .add_submenu(submenu);

    tauri::Builder::default()
        .menu(menu)
        .on_menu_event(|event| match event.menu_item_id() {
            "quit" => {
                std::process::exit(0);
            }
            "close" => {
                event.window().close().unwrap();
            }
            _ => {}
        })
        .invoke_handler(tauri::generate_handler![
            create_new_window,
            close_window
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### System Tray

```rust
use tauri::{CustomMenuItem, SystemTray, SystemTrayMenu, SystemTrayEvent};
use tauri::Manager;

fn main() {
    let quit = CustomMenuItem::new("quit".to_string(), "Quit");
    let hide = CustomMenuItem::new("hide".to_string(), "Hide");
    let show = CustomMenuItem::new("show".to_string(), "Show");
    let tray_menu = SystemTrayMenu::new()
        .add_item(show)
        .add_item(hide)
        .add_native_item(SystemTrayMenuItem::Separator)
        .add_item(quit);

    let system_tray = SystemTray::new().with_menu(tray_menu);

    tauri::Builder::default()
        .system_tray(system_tray)
        .on_system_tray_event(|app, event| match event {
            SystemTrayEvent::LeftClick {
                position: _,
                size: _,
                ..
            } => {
                let window = app.get_window("main").unwrap();
                window.show().unwrap();
                window.set_focus().unwrap();
            }
            SystemTrayEvent::MenuItemClick { id, .. } => {
                match id.as_str() {
                    "quit" => {
                        std::process::exit(0);
                    }
                    "hide" => {
                        let window = app.get_window("main").unwrap();
                        window.hide().unwrap();
                    }
                    "show" => {
                        let window = app.get_window("main").unwrap();
                        window.show().unwrap();
                    }
                    _ => {}
                }
            }
            _ => {}
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### Tauri Plugins

```toml
# Cargo.toml - Add plugins
[dependencies]
tauri-plugin-fs-extra = "1.0"
tauri-plugin-sql = { version = "1.0", features = ["sqlite"] }
tauri-plugin-store = "1.0"
tauri-plugin-notification = "1.0"
```

```rust
// src-tauri/src/main.rs
use tauri_plugin_sql::{Migration, MigrationKind, TauriSql};

fn main() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "create_initial_tables",
            sql: "CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, email TEXT);",
            kind: MigrationKind::Up,
        }
    ];

    tauri::Builder::default()
        .plugin(TauriSql::default().add_migrations("sqlite:app.db", migrations))
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_notification::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

```typescript
// Frontend - Using plugins
import Database from 'tauri-plugin-sql-api';
import { Store } from 'tauri-plugin-store-api';
import { sendNotification } from '@tauri-apps/api/notification';

// Database
const db = await Database.load('sqlite:app.db');
await db.execute('INSERT INTO users (name, email) VALUES (?, ?)', [
  'John',
  'john@example.com',
]);
const users = await db.select('SELECT * FROM users');

// Store
const store = new Store('.settings.dat');
await store.set('theme', 'dark');
const theme = await store.get('theme');

// Notification
sendNotification({ title: 'Tauri', body: 'Hello from Tauri!' });
```
