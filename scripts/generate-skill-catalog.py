#!/usr/bin/env python3
"""
PCL Standard Library - Skill Catalog Generator

Generates a searchable catalog of all skills in JSON and YAML formats
for easy discovery and integration.

Security: This script uses safe YAML loading and validates all file paths.
"""

import json
import re
import sys
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

import yaml


class SkillCatalogGenerator:
    """Generate skill catalog from stdlib directory"""

    # Maximum file size to prevent DoS (10MB)
    MAX_FILE_SIZE = 10 * 1024 * 1024
    # Maximum description length
    MAX_DESCRIPTION_LENGTH = 200

    def __init__(self, stdlib_path: str) -> None:
        """
        Initialize the skill catalog generator.

        Args:
            stdlib_path: Path to the stdlib directory

        Raises:
            ValueError: If stdlib_path is not a valid directory
        """
        self.stdlib_path = Path(stdlib_path).resolve()
        if not self.stdlib_path.is_dir():
            raise ValueError(f"Invalid stdlib path: {stdlib_path}")

        self.skills: List[Dict[str, Any]] = []
        self.categories: Dict[str, List[Dict[str, Any]]] = defaultdict(list)

    def find_skill_files(self) -> List[Path]:
        """
        Find all SKILL.md and *-expert.md files.

        Returns:
            List of unique Path objects for skill files

        Raises:
            PermissionError: If directory cannot be accessed
        """
        skill_files: List[Path] = []

        try:
            # Find SKILL.md files
            skill_files.extend(self.stdlib_path.glob("**/SKILL.md"))

            # Find *-expert.md files
            skill_files.extend(self.stdlib_path.glob("**/*-expert.md"))
        except PermissionError as e:
            print(f"Error: Permission denied accessing {self.stdlib_path}: {e}", file=sys.stderr)
            raise

        # Remove duplicates and ensure files are within stdlib_path
        unique_files = set(skill_files)
        validated_files = [
            f for f in unique_files
            if self._is_safe_path(f)
        ]

        return sorted(validated_files)

    def _is_safe_path(self, file_path: Path) -> bool:
        """
        Validate that file path is within stdlib directory (prevent path traversal).

        Args:
            file_path: Path to validate

        Returns:
            True if path is safe, False otherwise
        """
        try:
            resolved_path = file_path.resolve()
            return resolved_path.is_relative_to(self.stdlib_path)
        except (ValueError, OSError):
            return False

    def parse_yaml_frontmatter(self, content: str) -> Dict[str, Any]:
        """
        Extract YAML frontmatter from skill file using safe loading.

        Args:
            content: File content

        Returns:
            Dictionary of frontmatter data, empty dict if not found or invalid

        Security: Uses yaml.safe_load to prevent code execution
        """
        # Match YAML frontmatter between --- markers
        match = re.match(r'^---\s*\n(.*?)\n---\s*\n', content, re.DOTALL)

        if not match:
            return {}

        try:
            # Use safe_load to prevent arbitrary code execution
            frontmatter = yaml.safe_load(match.group(1))
            return frontmatter if isinstance(frontmatter, dict) else {}
        except yaml.YAMLError as e:
            print(f"Warning: YAML parsing error: {e}", file=sys.stderr)
            return {}

    def extract_skill_info(self, file_path: Path) -> Optional[Dict[str, Any]]:
        """
        Extract skill information from a skill file.

        Args:
            file_path: Path to skill file

        Returns:
            Dictionary with skill information, None if extraction fails

        Security: Validates file size and uses safe file reading
        """
        try:
            # Check file size to prevent DoS
            file_size = file_path.stat().st_size
            if file_size > self.MAX_FILE_SIZE:
                print(f"Warning: Skipping large file {file_path} ({file_size} bytes)", file=sys.stderr)
                return None

            # Read file with explicit encoding
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()

            # Parse frontmatter
            frontmatter = self.parse_yaml_frontmatter(content)

            # Determine skill name and category
            relative_path = file_path.relative_to(self.stdlib_path)

            if file_path.name == "SKILL.md":
                skill_name = file_path.parent.name
                category = file_path.parent.parent.name
            else:
                skill_name = file_path.stem  # filename without extension
                category = file_path.parent.name

            # Extract description from frontmatter or content (sanitized)
            description = self._sanitize_string(
                frontmatter.get('description', '')
            )

            if not description:
                # Try to find description in first paragraph
                description = self._extract_description(content)

            # Count lines of code examples
            code_blocks = re.findall(r'```[\s\S]*?```', content)
            total_code_lines = sum(len(block.split('\n')) for block in code_blocks)

            # Sanitize and validate frontmatter fields
            return {
                'name': self._sanitize_string(frontmatter.get('name', skill_name)),
                'version': self._sanitize_string(str(frontmatter.get('version', '1.0.0'))),
                'category': self._sanitize_string(frontmatter.get('category', category)),
                'description': description[:self.MAX_DESCRIPTION_LENGTH],
                'tags': self._sanitize_list(frontmatter.get('tags', [])),
                'allowed_tools': self._sanitize_list(frontmatter.get('allowed-tools', [])),
                'path': str(relative_path).replace('\\', '/'),  # Normalize path separators
                'file_size': file_size,
                'total_lines': len(content.split('\n')),
                'code_examples': len(code_blocks),
                'code_lines': total_code_lines
            }
        except (OSError, IOError) as e:
            print(f"Error reading {file_path}: {e}", file=sys.stderr)
            return None
        except Exception as e:  # pylint: disable=broad-except
            print(f"Unexpected error processing {file_path}: {e}", file=sys.stderr)
            return None

    def _sanitize_string(self, value: Any) -> str:
        """
        Sanitize string value for safe output.

        Args:
            value: Value to sanitize

        Returns:
            Sanitized string
        """
        if not isinstance(value, str):
            value = str(value)
        # Remove control characters except newlines and tabs
        return ''.join(char for char in value if ord(char) >= 32 or char in '\n\t')

    def _sanitize_list(self, value: Any) -> List[str]:
        """
        Sanitize list value for safe output.

        Args:
            value: Value to sanitize

        Returns:
            Sanitized list of strings
        """
        if not isinstance(value, list):
            return []
        return [self._sanitize_string(item) for item in value if item]

    def _extract_description(self, content: str) -> str:
        """
        Extract description from content.

        Args:
            content: File content

        Returns:
            First non-empty, non-heading line
        """
        lines = content.split('\n')
        for line in lines:
            stripped = line.strip()
            if stripped and not stripped.startswith('#') and not stripped.startswith('---'):
                return self._sanitize_string(stripped)
        return ''

    def generate_catalog(self) -> Dict[str, Any]:
        """
        Generate complete skill catalog.

        Returns:
            Dictionary containing complete catalog data
        """
        print("Finding skill files...")
        skill_files = self.find_skill_files()
        print(f"   Found {len(skill_files)} skill files")

        print("\nParsing skills...")
        for file_path in skill_files:
            skill_info = self.extract_skill_info(file_path)
            if skill_info:
                self.skills.append(skill_info)
                self.categories[skill_info['category']].append(skill_info)
                print(f"   + {skill_info['name']}")

        # Sort skills by name
        self.skills.sort(key=lambda x: x['name'])

        # Generate statistics
        total_skills = len(self.skills)
        stats = {
            'total_skills': total_skills,
            'total_categories': len(self.categories),
            'total_code_lines': sum(s['code_lines'] for s in self.skills),
            'total_file_size': sum(s['file_size'] for s in self.skills),
            'avg_lines_per_skill': (
                sum(s['total_lines'] for s in self.skills) // total_skills
                if total_skills > 0 else 0
            ),
            'categories': {cat: len(skills) for cat, skills in self.categories.items()}
        }

        # Get all unique tags
        all_tags: set = set()
        for skill in self.skills:
            all_tags.update(skill.get('tags', []))

        catalog = {
            'version': '2.0.0',
            'generated': datetime.now().strftime('%Y-%m-%d'),
            'statistics': stats,
            'tags': sorted(list(all_tags)),
            'categories': dict(self.categories),
            'skills': self.skills
        }

        return catalog

    def save_catalog(self, catalog: Dict[str, Any], output_dir: Path) -> None:
        """
        Save catalog in JSON and YAML formats.

        Args:
            catalog: Catalog data to save
            output_dir: Output directory path

        Raises:
            OSError: If file writing fails
        """
        # Create output directory with safe permissions
        output_dir.mkdir(parents=True, exist_ok=True, mode=0o755)

        # Save as JSON with safe encoding
        json_path = output_dir / 'skill-catalog.json'
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(catalog, f, indent=2, ensure_ascii=False, sort_keys=True)
        print(f"\nJSON catalog saved to: {json_path}")

        # Save as YAML
        yaml_path = output_dir / 'skill-catalog.yaml'
        with open(yaml_path, 'w', encoding='utf-8') as f:
            yaml.dump(catalog, f, default_flow_style=False, sort_keys=False, allow_unicode=True)
        print(f"YAML catalog saved to: {yaml_path}")

        # Save simplified index (just names and categories)
        index = {
            'version': catalog['version'],
            'total_skills': catalog['statistics']['total_skills'],
            'skills': [
                {
                    'name': s['name'],
                    'category': s['category'],
                    'path': s['path'],
                    'tags': s.get('tags', [])
                }
                for s in catalog['skills']
            ]
        }

        index_path = output_dir / 'skill-index.json'
        with open(index_path, 'w', encoding='utf-8') as f:
            json.dump(index, f, indent=2, ensure_ascii=False, sort_keys=True)
        print(f"Index saved to: {index_path}")

        # Generate README with statistics
        self.generate_catalog_readme(catalog, output_dir)

    def generate_catalog_readme(self, catalog: Dict[str, Any], output_dir: Path) -> None:
        """
        Generate README for catalog directory.

        Args:
            catalog: Catalog data
            output_dir: Output directory path
        """
        stats = catalog['statistics']

        readme_content = f"""# PCL Standard Library - Skill Catalog

Auto-generated catalog of all {stats['total_skills']} skills in the PCL Standard Library.

## 📊 Statistics

- **Total Skills**: {stats['total_skills']}
- **Categories**: {stats['total_categories']}
- **Total Code Lines**: {stats['total_code_lines']:,}
- **Total File Size**: {stats['total_file_size'] // 1024:,} KB
- **Average Lines/Skill**: {stats['avg_lines_per_skill']}

## 📁 Skills by Category

"""

        for category, count in sorted(stats['categories'].items(), key=lambda x: -x[1]):
            readme_content += f"- **{category}**: {count} skills\n"

        readme_content += f"""

## 🏷️ Available Tags

{', '.join(f'`{tag}`' for tag in sorted(catalog['tags']))}

## 📄 Catalog Files

- **skill-catalog.json** - Complete catalog with all metadata (JSON)
- **skill-catalog.yaml** - Complete catalog with all metadata (YAML)
- **skill-index.json** - Lightweight index (names, categories, paths only)

## 🔍 Using the Catalog

### Load catalog in Python

```python
import json

with open('skill-catalog.json', encoding='utf-8') as f:
    catalog = json.load(f)

# Find all Python skills
python_skills = [
    skill for skill in catalog['skills']
    if 'python' in skill['name'].lower() or 'python' in skill.get('tags', [])
]

# Find skills by category
devops_skills = catalog['categories']['devops']

# Search by tag
web_skills = [
    skill for skill in catalog['skills']
    if 'web' in skill.get('tags', [])
]
```

### Load catalog in JavaScript

```javascript
const catalog = require('./skill-catalog.json');

// Find all frontend skills
const frontendSkills = catalog.skills.filter(skill =>
  skill.tags.includes('frontend') || skill.tags.includes('web')
);

// Get category statistics
console.log(catalog.statistics.categories);
```

## 🔗 Related Documentation

- [Standard Library README](../README.md)
- [Skills Inventory](../SKILLS_INVENTORY.md)
- [Directory Structure](../DIRECTORY_STRUCTURE.md)

---

**Generated**: {catalog['generated']}
**Version**: {catalog['version']}
"""

        readme_path = output_dir / 'README.md'
        with open(readme_path, 'w', encoding='utf-8') as f:
            f.write(readme_content)
        print(f"Catalog README saved to: {readme_path}")


def main() -> int:
    """
    Main entry point.

    Returns:
        Exit code (0 for success, 1 for error)
    """
    try:
        # Determine stdlib path
        script_dir = Path(__file__).parent.resolve()
        stdlib_path = script_dir.parent / 'stdlib'
        output_dir = stdlib_path / 'catalog'

        print("=" * 60)
        print("PCL Standard Library - Skill Catalog Generator")
        print("=" * 60)
        print(f"\nStdlib path: {stdlib_path}")
        print(f"Output path: {output_dir}\n")

        # Validate stdlib path exists
        if not stdlib_path.is_dir():
            print(f"Error: Stdlib directory not found: {stdlib_path}", file=sys.stderr)
            return 1

        # Generate catalog
        generator = SkillCatalogGenerator(str(stdlib_path))
        catalog = generator.generate_catalog()

        # Save catalog
        generator.save_catalog(catalog, output_dir)

        print("\n" + "=" * 60)
        print("Catalog generation complete!")
        print("=" * 60)
        print(f"\nGenerated catalog with {catalog['statistics']['total_skills']} skills")
        print(f"Files saved to: {output_dir}")

        return 0

    except KeyboardInterrupt:
        print("\n\nOperation cancelled by user", file=sys.stderr)
        return 130
    except Exception as e:  # pylint: disable=broad-except
        print(f"\nError: {e}", file=sys.stderr)
        return 1


if __name__ == '__main__':
    sys.exit(main())
