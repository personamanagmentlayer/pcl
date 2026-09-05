# Ansible Expert — Roles

Reference material for the `ansible-expert` skill. See [SKILL.md](../SKILL.md).

## Roles

### Role Structure

```
roles/
└── webserver/
    ├── defaults/
    │   └── main.yml         # Default variables
    ├── files/
    │   └── app.conf         # Static files
    ├── handlers/
    │   └── main.yml         # Handlers
    ├── meta/
    │   └── main.yml         # Role metadata and dependencies
    ├── tasks/
    │   └── main.yml         # Main task list
    ├── templates/
    │   └── nginx.conf.j2    # Jinja2 templates
    ├── tests/
    │   └── test.yml         # Role tests
    └── vars/
        └── main.yml         # Role variables
```

### Example Role

```yaml
# roles/webserver/defaults/main.yml
---
nginx_port: 80
nginx_user: www-data
document_root: /var/www/html

# roles/webserver/tasks/main.yml
---
- name: Install nginx
  apt:
    name: nginx
    state: present
    update_cache: yes

- name: Copy nginx configuration
  template:
    src: nginx.conf.j2
    dest: /etc/nginx/nginx.conf
    mode: '0644'
  notify: Restart nginx

- name: Create document root
  file:
    path: "{{ document_root }}"
    state: directory
    owner: "{{ nginx_user }}"
    mode: '0755'

- name: Start nginx
  systemd:
    name: nginx
    state: started
    enabled: yes

# roles/webserver/handlers/main.yml
---
- name: Restart nginx
  systemd:
    name: nginx
    state: restarted

# roles/webserver/templates/nginx.conf.j2
user {{ nginx_user }};
worker_processes auto;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    server {
        listen {{ nginx_port }};
        server_name {{ ansible_hostname }};

        root {{ document_root }};
        index index.html;

        location / {
            try_files $uri $uri/ =404;
        }
    }
}

# Use role in playbook
---
- name: Configure web servers
  hosts: webservers
  become: yes
  roles:
    - role: webserver
      vars:
        nginx_port: 8080
        document_root: /var/www/myapp
```

### Role Dependencies

```yaml
# roles/app/meta/main.yml
---
dependencies:
  - role: common
  - role: nginx
    vars:
      nginx_port: 8080
  - role: postgresql
    when: database_enabled | default(false)
```
