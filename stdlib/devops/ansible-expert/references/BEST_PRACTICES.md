# Ansible Expert — Best Practices

Reference material for the `ansible-expert` skill. See [SKILL.md](../SKILL.md).

## Best Practices

### Playbook Organization

```
ansible-project/
├── ansible.cfg
├── inventory/
│   ├── production/
│   │   ├── hosts.yml
│   │   └── group_vars/
│   └── staging/
│       ├── hosts.yml
│       └── group_vars/
├── playbooks/
│   ├── site.yml
│   ├── webservers.yml
│   └── databases.yml
├── roles/
│   ├── common/
│   ├── nginx/
│   └── postgresql/
├── group_vars/
│   ├── all.yml
│   └── webservers.yml
├── host_vars/
└── files/
```

### Idempotency

```yaml
# ❌ Not idempotent
- name: Add line to file
  shell: echo "server {{ ansible_hostname }}" >> /etc/hosts

# ✅ Idempotent
- name: Add line to file
  lineinfile:
    path: /etc/hosts
    line: 'server {{ ansible_hostname }}'
    state: present
```

### Performance

- Use `strategy: free` for faster execution
- Enable pipelining in ansible.cfg
- Use `async` for long-running tasks
- Disable fact gathering when not needed
- Use `serial` for rolling updates

```yaml
# ansible.cfg
[defaults]
forks = 20
host_key_checking = False
pipelining = True
gathering = smart
fact_caching = jsonfile
fact_caching_connection = /tmp/ansible_facts
fact_caching_timeout = 86400

# Playbook with performance optimizations
---
- name: Fast deployment
  hosts: webservers
  strategy: free
  gather_facts: no
  serial: 5  # Deploy to 5 hosts at a time

  tasks:
    - name: Long running task
      command: /usr/local/bin/build.sh
      async: 3600
      poll: 0
      register: build_job

    - name: Check build status
      async_status:
        jid: "{{ build_job.ansible_job_id }}"
      register: job_result
      until: job_result.finished
      retries: 60
      delay: 30
```

### Security

- Use Ansible Vault for secrets
- Use `no_log: yes` for sensitive tasks
- Set proper file permissions
- Use `become` sparingly
- Validate SSL certificates
- Use SSH keys, not passwords
