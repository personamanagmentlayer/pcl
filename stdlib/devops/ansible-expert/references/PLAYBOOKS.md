# Ansible Expert — Playbooks

Reference material for the `ansible-expert` skill. See [SKILL.md](../SKILL.md).

## Playbooks

### Basic Playbook

```yaml
# playbooks/webserver.yml
---
- name: Configure web servers
  hosts: webservers
  become: yes
  vars:
    app_port: 8080
    app_user: webapp

  tasks:
    - name: Install nginx
      apt:
        name: nginx
        state: present
        update_cache: yes

    - name: Start and enable nginx
      systemd:
        name: nginx
        state: started
        enabled: yes

    - name: Copy nginx configuration
      template:
        src: templates/nginx.conf.j2
        dest: /etc/nginx/sites-available/default
        mode: '0644'
      notify: Reload nginx

    - name: Create application user
      user:
        name: '{{ app_user }}'
        state: present
        shell: /bin/bash

  handlers:
    - name: Reload nginx
      systemd:
        name: nginx
        state: reloaded
```

### Advanced Playbook

```yaml
# playbooks/deploy-app.yml
---
- name: Deploy application
  hosts: webservers
  become: yes
  vars:
    app_name: myapp
    app_version: "{{ version | default('latest') }}"
    app_port: 8080
    deploy_user: deployer

  pre_tasks:
    - name: Check if required variables are defined
      assert:
        that:
          - app_name is defined
          - app_version is defined
        fail_msg: 'Required variables are not defined'

  tasks:
    - name: Create deployment directory
      file:
        path: '/opt/{{ app_name }}'
        state: directory
        owner: '{{ deploy_user }}'
        group: '{{ deploy_user }}'
        mode: '0755'

    - name: Download application artifact
      get_url:
        url: 'https://artifacts.example.com/{{ app_name }}/{{ app_version }}/{{ app_name }}.jar'
        dest: '/opt/{{ app_name }}/{{ app_name }}-{{ app_version }}.jar'
        mode: '0644'
      register: download_result

    - name: Create systemd service
      template:
        src: templates/app.service.j2
        dest: '/etc/systemd/system/{{ app_name }}.service'
        mode: '0644'
      notify:
        - Reload systemd
        - Restart application

    - name: Enable application service
      systemd:
        name: '{{ app_name }}'
        enabled: yes

    - name: Wait for application to start
      wait_for:
        port: '{{ app_port }}'
        delay: 5
        timeout: 60
      when: download_result.changed

    - name: Check application health
      uri:
        url: 'http://localhost:{{ app_port }}/health'
        status_code: 200
      retries: 3
      delay: 5

  post_tasks:
    - name: Clean up old versions
      shell: |
        cd /opt/{{ app_name }}
        ls -t {{ app_name }}-*.jar | tail -n +4 | xargs -r rm
      args:
        executable: /bin/bash

  handlers:
    - name: Reload systemd
      systemd:
        daemon_reload: yes

    - name: Restart application
      systemd:
        name: '{{ app_name }}'
        state: restarted
```

### Conditionals and Loops

```yaml
---
- name: Conditional and loop examples
  hosts: all
  tasks:
    - name: Install package (Debian)
      apt:
        name: '{{ item }}'
        state: present
      loop:
        - nginx
        - postgresql
        - redis
      when: ansible_os_family == "Debian"

    - name: Install package (RedHat)
      yum:
        name: '{{ item }}'
        state: present
      loop:
        - nginx
        - postgresql
        - redis
      when: ansible_os_family == "RedHat"

    - name: Create users
      user:
        name: '{{ item.name }}'
        state: present
        groups: '{{ item.groups }}'
      loop:
        - { name: 'alice', groups: 'wheel' }
        - { name: 'bob', groups: 'users' }
        - { name: 'charlie', groups: 'developers' }

    - name: Configure services
      systemd:
        name: '{{ item.name }}'
        state: '{{ item.state }}'
        enabled: '{{ item.enabled }}'
      loop:
        - { name: 'nginx', state: 'started', enabled: yes }
        - { name: 'postgresql', state: 'started', enabled: yes }
        - { name: 'redis', state: 'started', enabled: yes }

    - name: Set fact based on condition
      set_fact:
        environment_type: "{{ 'production' if inventory_hostname in groups['production'] else 'development' }}"

    - name: Debug conditional
      debug:
        msg: 'This is a {{ environment_type }} server'
```
