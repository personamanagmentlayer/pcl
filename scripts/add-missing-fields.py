#!/usr/bin/env python3
"""
Add missing tags and allowed-tools fields to skill files.
"""

import re
from pathlib import Path

STDLIB_PATH = Path(__file__).parent.parent / "stdlib"

# Define mappings for tags and allowed-tools based on skill names/categories
SKILL_MAPPINGS = {
    # DevOps
    "docker-expert": {
        "tags": ["devops", "containers", "docker", "infrastructure"],
        "allowed-tools": ["Read", "Write", "Bash", "Grep", "Glob"],
        "version": "1.0.0",
        "category": "devops"
    },

    # Domains
    "5g-expert": {
        "tags": ["telecommunications", "5g", "networking", "wireless"],
        "allowed-tools": ["Read", "Write", "Bash", "WebSearch"]
    },
    "business-intelligence-expert": {
        "tags": ["analytics", "bi", "data-visualization", "reporting"],
        "allowed-tools": ["Read", "Write", "Bash", "WebSearch"]
    },
    "customer-support-expert": {
        "tags": ["customer-service", "support", "communication", "crm"],
        "allowed-tools": ["Read", "Write", "WebSearch"]
    },
    "cybersecurity-expert": {
        "tags": ["security", "cybersecurity", "infosec", "threat-detection"],
        "allowed-tools": ["Read", "Write", "Bash", "Grep", "Glob", "WebSearch"]
    },
    "dynamics365-expert": {
        "tags": ["microsoft", "erp", "crm", "business-apps", "dynamics365"],
        "allowed-tools": ["Read", "Write", "Bash", "WebSearch"]
    },
    "e-learning-expert": {
        "tags": ["education", "e-learning", "online-learning", "lms"],
        "allowed-tools": ["Read", "Write", "WebSearch"]
    },
    "edge-computing-expert": {
        "tags": ["edge-computing", "iot", "distributed-systems", "cloud"],
        "allowed-tools": ["Read", "Write", "Bash", "WebSearch"]
    },
    "gaming-expert": {
        "tags": ["gaming", "game-development", "entertainment", "graphics"],
        "allowed-tools": ["Read", "Write", "Bash", "Grep", "Glob"]
    },
    "hr-tech-expert": {
        "tags": ["hr", "human-resources", "recruiting", "talent-management"],
        "allowed-tools": ["Read", "Write", "WebSearch"]
    },
    "legal-tech-expert": {
        "tags": ["legal", "legaltech", "law", "compliance"],
        "allowed-tools": ["Read", "Write", "WebSearch"]
    },
    "marketing-expert": {
        "tags": ["marketing", "digital-marketing", "advertising", "analytics"],
        "allowed-tools": ["Read", "Write", "WebSearch"]
    },
    "metaverse-expert": {
        "tags": ["metaverse", "vr", "ar", "web3", "virtual-worlds"],
        "allowed-tools": ["Read", "Write", "Bash", "WebSearch"]
    },
    "microsoft365-expert": {
        "tags": ["microsoft", "office365", "m365", "productivity", "cloud"],
        "allowed-tools": ["Read", "Write", "Bash", "WebSearch"]
    },
    "oracle-expert": {
        "tags": ["oracle", "database", "enterprise", "erp"],
        "allowed-tools": ["Read", "Write", "Bash", "Grep", "Glob"]
    },
    "quality-management-expert": {
        "tags": ["quality", "qms", "compliance", "process-improvement"],
        "allowed-tools": ["Read", "Write", "WebSearch"]
    },
    "quantum-algorithms-expert": {
        "tags": ["quantum-computing", "algorithms", "qiskit", "quantum"],
        "allowed-tools": ["Read", "Write", "Bash", "Grep", "Glob"]
    },
    "robotics-expert": {
        "tags": ["robotics", "automation", "ros", "hardware", "embedded"],
        "allowed-tools": ["Read", "Write", "Bash", "Grep", "Glob"]
    },
    "sales-expert": {
        "tags": ["sales", "crm", "business-development", "revenue"],
        "allowed-tools": ["Read", "Write", "WebSearch"]
    },
    "salesforce-expert": {
        "tags": ["salesforce", "crm", "cloud", "business-apps"],
        "allowed-tools": ["Read", "Write", "Bash", "Grep", "Glob", "WebSearch"]
    },
    "sap-expert": {
        "tags": ["sap", "erp", "enterprise", "business-apps"],
        "allowed-tools": ["Read", "Write", "Bash", "WebSearch"]
    },
    "serverless-expert": {
        "tags": ["serverless", "cloud", "faas", "lambda", "cloud-functions"],
        "allowed-tools": ["Read", "Write", "Bash", "Grep", "Glob"]
    },
    "servicenow-expert": {
        "tags": ["servicenow", "itsm", "itom", "workflow", "automation"],
        "allowed-tools": ["Read", "Write", "Bash", "WebSearch"]
    },
    "sharepoint-expert": {
        "tags": ["sharepoint", "microsoft", "collaboration", "intranet", "cms"],
        "allowed-tools": ["Read", "Write", "Bash", "WebSearch"]
    },
    "social-media-expert": {
        "tags": ["social-media", "marketing", "content", "engagement"],
        "allowed-tools": ["Read", "Write", "WebSearch"]
    },
    "supply-chain-expert": {
        "tags": ["supply-chain", "logistics", "operations", "scm"],
        "allowed-tools": ["Read", "Write", "Bash", "WebSearch"]
    },
    "web3-expert": {
        "tags": ["web3", "blockchain", "crypto", "decentralized", "smart-contracts"],
        "allowed-tools": ["Read", "Write", "Bash", "Grep", "Glob"]
    },
    "webassembly-expert": {
        "tags": ["webassembly", "wasm", "web", "performance", "compilation"],
        "allowed-tools": ["Read", "Write", "Bash", "Grep", "Glob"]
    },
    "workday-expert": {
        "tags": ["workday", "hr", "finance", "erp", "cloud"],
        "allowed-tools": ["Read", "Write", "Bash", "WebSearch"]
    },

    # Frameworks
    "android-expert": {
        "allowed-tools": ["Read", "Write", "Edit", "Bash", "Grep", "Glob"]
    },
    "electron-expert": {
        "allowed-tools": ["Read", "Write", "Edit", "Bash", "Grep", "Glob"]
    },
    "flutter-expert": {
        "allowed-tools": ["Read", "Write", "Edit", "Bash", "Grep", "Glob"]
    },
    "ios-expert": {
        "allowed-tools": ["Read", "Write", "Edit", "Bash", "Grep", "Glob"]
    },
    "react-native-expert": {
        "allowed-tools": ["Read", "Write", "Edit", "Bash", "Grep", "Glob"]
    },
    "tauri-expert": {
        "allowed-tools": ["Read", "Write", "Edit", "Bash", "Grep", "Glob"]
    },

    # Languages
    "typescript-expert": {
        "tags": ["typescript", "javascript", "web", "programming", "types"]
    },

    # QA
    "chaos-engineering-expert": {
        "tags": ["chaos-engineering", "reliability", "testing", "sre", "resilience"],
        "allowed-tools": ["Read", "Write", "Bash", "Grep", "Glob"]
    },
    "cypress-expert": {
        "tags": ["testing", "e2e", "cypress", "qa", "automation"],
        "allowed-tools": ["Read", "Write", "Edit", "Bash", "Grep", "Glob"]
    },
    "jest-expert": {
        "tags": ["testing", "unit-testing", "jest", "javascript", "qa"],
        "allowed-tools": ["Read", "Write", "Edit", "Bash", "Grep", "Glob"]
    },
    "load-testing-expert": {
        "tags": ["performance", "load-testing", "testing", "qa", "scalability"],
        "allowed-tools": ["Read", "Write", "Bash", "Grep", "Glob"]
    },
    "playwright-expert": {
        "tags": ["testing", "e2e", "playwright", "qa", "automation"],
        "allowed-tools": ["Read", "Write", "Edit", "Bash", "Grep", "Glob"]
    },
    "selenium-expert": {
        "tags": ["testing", "e2e", "selenium", "qa", "automation"],
        "allowed-tools": ["Read", "Write", "Edit", "Bash", "Grep", "Glob"]
    },

    # Tools
    "code-review-expert": {
        "tags": ["code-review", "quality", "best-practices", "collaboration"]
    },
    "discord-expert": {
        "tags": ["discord", "communication", "community", "bots", "api"],
        "allowed-tools": ["Read", "Write", "Bash", "Grep", "Glob", "WebSearch"]
    },
    "slack-expert": {
        "tags": ["slack", "communication", "collaboration", "bots", "api"],
        "allowed-tools": ["Read", "Write", "Bash", "Grep", "Glob", "WebSearch"]
    },
    "teams-expert": {
        "tags": ["microsoft-teams", "teams", "communication", "collaboration", "microsoft"],
        "allowed-tools": ["Read", "Write", "Bash", "WebSearch"]
    },
    "video-streaming-expert": {
        "tags": ["video", "streaming", "media", "webrtc", "multimedia"],
        "allowed-tools": ["Read", "Write", "Bash", "Grep", "Glob"]
    },
    "webrtc-expert": {
        "tags": ["webrtc", "real-time", "video", "audio", "peer-to-peer"],
        "allowed-tools": ["Read", "Write", "Bash", "Grep", "Glob"]
    },
}

# Files that only need allowed-tools (already have tags)
ONLY_ALLOWED_TOOLS = {
    "agtech-expert": {
        "allowed-tools": ["Read", "Write", "Bash", "Grep", "Glob", "WebSearch"]
    },
    "edtech-expert": {
        "allowed-tools": ["Read", "Write", "Bash", "WebSearch"]
    },
    "fintech-expert": {
        "allowed-tools": ["Read", "Write", "Bash", "Grep", "Glob", "WebSearch"]
    },
    "healthtech-expert": {
        "allowed-tools": ["Read", "Write", "Bash", "WebSearch"]
    },
    "legaltech-expert": {
        "allowed-tools": ["Read", "Write", "Bash", "WebSearch"]
    },
    "pharmaceutical-expert": {
        "allowed-tools": ["Read", "Write", "Bash", "WebSearch"]
    },
    "proptech-expert": {
        "allowed-tools": ["Read", "Write", "Bash", "WebSearch"]
    },
    "regtech-expert": {
        "allowed-tools": ["Read", "Write", "Bash", "WebSearch"]
    },
}


def parse_frontmatter(content):
    """Parse YAML frontmatter from markdown content."""
    # Try frontmatter at the beginning
    match = re.match(r'^---\n(.*?\n)---\n', content, re.DOTALL)
    if match:
        frontmatter = match.group(1)
        start_pos = 0
        end_pos = match.end(0)
        return frontmatter, content, start_pos, end_pos

    # Try frontmatter after first heading (# Title\n\n---)
    match = re.match(r'^(#[^\n]+\n+)---\n(.*?\n)---\n', content, re.DOTALL)
    if match:
        heading = match.group(1)
        frontmatter = match.group(2)
        start_pos = len(heading)
        end_pos = match.end(0)
        return frontmatter, content, start_pos, end_pos

    return None, content, 0, 0


def add_fields_to_frontmatter(frontmatter, fields_to_add):
    """Add missing fields to frontmatter."""
    lines = frontmatter.split('\n')

    # Find where to insert fields (after description or name)
    insert_idx = -1
    for i, line in enumerate(lines):
        if line.startswith('description:') or line.startswith('name:'):
            insert_idx = i + 1
            # If description is multi-line (quoted), find the end
            if line.startswith('description:') and ('"' in line or "'" in line):
                quote_char = '"' if '"' in line else "'"
                if line.count(quote_char) == 1:  # Multi-line
                    for j in range(i + 1, len(lines)):
                        if quote_char in lines[j]:
                            insert_idx = j + 1
                            break

    if insert_idx == -1:
        insert_idx = 0

    # Add fields
    new_lines = []
    for field, value in fields_to_add.items():
        if field == "tags":
            new_lines.append(f"tags: {value}")
        elif field == "allowed-tools":
            new_lines.append("allowed-tools:")
            for tool in value:
                new_lines.append(f"  - {tool}")
        elif field in ["version", "category"]:
            new_lines.append(f"{field}: {value}")

    # Insert the new lines
    lines = lines[:insert_idx] + new_lines + lines[insert_idx:]
    return '\n'.join(lines)


def update_skill_file(file_path, updates):
    """Update a skill file with missing fields."""
    print(f"Updating {file_path}...")

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    frontmatter, full_content, start_pos, end_pos = parse_frontmatter(content)
    if frontmatter is None:
        print("  ERROR: No frontmatter found")
        return False

    # Check if fields already exist
    fields_to_add = {}
    for field, value in updates.items():
        if field == "tags":
            if not re.search(r'^tags:', frontmatter, re.MULTILINE):
                fields_to_add[field] = value
        elif field == "allowed-tools":
            if not re.search(r'^allowed-tools:', frontmatter, re.MULTILINE):
                fields_to_add[field] = value
        elif field in ["version", "category"]:
            # Check if not already at root level
            if not re.search(f'^{field}:', frontmatter, re.MULTILINE):
                fields_to_add[field] = value

    if not fields_to_add:
        print("  SKIP: All fields already present")
        return False

    # Update frontmatter
    updated_frontmatter = add_fields_to_frontmatter(frontmatter, fields_to_add)

    # Reconstruct content based on where frontmatter was
    if start_pos == 0:
        # Frontmatter at beginning
        updated_content = f"---\n{updated_frontmatter}---\n" + full_content[end_pos:]
    else:
        # Frontmatter after heading
        heading = full_content[:start_pos]
        updated_content = heading + f"---\n{updated_frontmatter}---\n" + full_content[end_pos:]

    # Write back
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(updated_content)

    print(f"  SUCCESS: Added {', '.join(fields_to_add.keys())}")
    return True


def main():
    """Main function to update all skills."""
    updated_count = 0
    skipped_count = 0
    error_count = 0

    # Combine all mappings
    all_mappings = {**SKILL_MAPPINGS, **ONLY_ALLOWED_TOOLS}

    for skill_name, updates in all_mappings.items():
        # Find the file
        found_files = list(STDLIB_PATH.rglob(f"{skill_name}.md")) + \
                     list(STDLIB_PATH.rglob(f"{skill_name}/SKILL.md"))

        if not found_files:
            print(f"WARNING: Could not find file for {skill_name}")
            error_count += 1
            continue

        file_path = found_files[0]
        try:
            if update_skill_file(file_path, updates):
                updated_count += 1
            else:
                skipped_count += 1
        except Exception as e:
            print(f"  ERROR: {e}")
            error_count += 1

    print("\n" + "="*70)
    print("SUMMARY")
    print("="*70)
    print(f"Updated: {updated_count}")
    print(f"Skipped: {skipped_count}")
    print(f"Errors: {error_count}")
    print("="*70)


if __name__ == "__main__":
    main()
