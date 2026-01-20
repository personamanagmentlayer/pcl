#!/usr/bin/env python3
"""
PCL Standard Library - Skill Validation Script

Validates all skills in the stdlib for:
- YAML frontmatter syntax
- Required fields
- File structure
- Code block formatting

Security: This script uses safe YAML loading and validates all file paths.
"""

import re
import sys
from collections import Counter
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import yaml


class SkillValidator:
    """Validate PCL skills with security best practices"""

    REQUIRED_FIELDS = ['name', 'version', 'description', 'category']
    RECOMMENDED_FIELDS = ['tags', 'allowed-tools']

    # Maximum file size to prevent DoS (10MB)
    MAX_FILE_SIZE = 10 * 1024 * 1024

    def __init__(self, stdlib_path: str) -> None:
        """
        Initialize the skill validator.

        Args:
            stdlib_path: Path to the stdlib directory

        Raises:
            ValueError: If stdlib_path is not a valid directory
        """
        self.stdlib_path = Path(stdlib_path).resolve()
        if not self.stdlib_path.is_dir():
            raise ValueError(f"Invalid stdlib path: {stdlib_path}")

        self.errors: List[str] = []
        self.warnings: List[str] = []
        self.stats: Counter = Counter()

    def find_skill_files(self) -> List[Path]:
        """
        Find all skill files.

        Returns:
            List of unique Path objects for skill files

        Raises:
            PermissionError: If directory cannot be accessed
        """
        skill_files: List[Path] = []

        try:
            skill_files.extend(self.stdlib_path.glob("**/SKILL.md"))
            skill_files.extend(self.stdlib_path.glob("**/*-expert.md"))
        except PermissionError as e:
            print(f"Error: Permission denied accessing {self.stdlib_path}: {e}", file=sys.stderr)
            raise

        # Remove duplicates and validate paths
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

    def extract_yaml_frontmatter(self, content: str) -> Tuple[Dict, bool]:
        """
        Extract and validate YAML frontmatter using safe loading.

        Args:
            content: File content

        Returns:
            Tuple of (frontmatter dict, validity boolean)

        Security: Uses yaml.safe_load to prevent code execution
        """
        match = re.match(r'^---\s*\n(.*?)\n---\s*\n', content, re.DOTALL)

        if not match:
            return {}, False

        try:
            # Use safe_load to prevent arbitrary code execution
            frontmatter = yaml.safe_load(match.group(1))
            if not isinstance(frontmatter, dict):
                return {}, False
            return frontmatter, True
        except yaml.YAMLError as e:
            print(f"Warning: YAML parsing error: {e}", file=sys.stderr)
            return {}, False

    def validate_skill(self, file_path: Path) -> Dict:
        """
        Validate a single skill file.

        Args:
            file_path: Path to skill file

        Returns:
            Dictionary with validation results

        Security: Validates file size and uses safe file reading
        """
        result = {
            'path': str(file_path.relative_to(self.stdlib_path)),
            'errors': [],
            'warnings': [],
            'valid': True
        }

        try:
            # Check file size to prevent DoS
            file_size = file_path.stat().st_size
            if file_size > self.MAX_FILE_SIZE:
                result['errors'].append(f"File too large ({file_size} bytes, max {self.MAX_FILE_SIZE})")
                result['valid'] = False
                return result

            # Read file with explicit encoding
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()

            # Check for YAML frontmatter
            frontmatter, yaml_valid = self.extract_yaml_frontmatter(content)

            if not yaml_valid and not frontmatter:
                result['errors'].append("Missing or invalid YAML frontmatter")
                result['valid'] = False
                return result

            if not yaml_valid:
                result['errors'].append("Invalid YAML syntax in frontmatter")
                result['valid'] = False

            # Check required fields
            for field in self.REQUIRED_FIELDS:
                if field not in frontmatter:
                    result['errors'].append(f"Missing required field: {field}")
                    result['valid'] = False

            # Check recommended fields
            for field in self.RECOMMENDED_FIELDS:
                if field not in frontmatter:
                    result['warnings'].append(f"Missing recommended field: {field}")

            # Validate field values
            if 'version' in frontmatter:
                version = frontmatter['version']
                if not re.match(r'^\d+\.\d+\.\d+$', str(version)):
                    result['warnings'].append(
                        f"Version should follow semantic versioning (x.y.z): {version}"
                    )

            if 'name' in frontmatter:
                name = frontmatter['name']
                if not isinstance(name, str) or not name:
                    result['errors'].append("Name must be a non-empty string")
                    result['valid'] = False

            # Check content structure
            if not content.strip():
                result['errors'].append("File is empty")
                result['valid'] = False
                return result

            # Check for main heading
            content_after_frontmatter = content.split('\n---\n')[-1]
            if '# ' not in content_after_frontmatter:
                result['warnings'].append("Missing main heading (# Title)")

            # Check for core concepts section
            if '## Core Concepts' not in content and '## Expertise' not in content:
                result['warnings'].append("Missing 'Core Concepts' or 'Expertise' section")

            # Check for code examples
            code_blocks = re.findall(r'```[\s\S]*?```', content)
            if not code_blocks:
                result['warnings'].append("No code examples found")
            elif len(code_blocks) < 2:
                result['warnings'].append("Very few code examples (< 2)")

            # Check for best practices
            if '## Best Practices' not in content:
                result['warnings'].append("Missing 'Best Practices' section")

            # Check for anti-patterns
            if '## Anti-Patterns' not in content and '## Anti-patterns' not in content:
                result['warnings'].append("Missing 'Anti-Patterns' section")

            # Check for resources
            if '## Resources' not in content:
                result['warnings'].append("Missing 'Resources' section")

            # Check file size
            if file_size < 5000:  # Less than 5KB
                result['warnings'].append(f"File may be too small ({file_size} bytes)")
            elif file_size > 500000:  # More than 500KB
                result['warnings'].append(f"File may be too large ({file_size} bytes)")

        except (OSError, IOError) as e:
            result['errors'].append(f"File reading error: {str(e)}")
            result['valid'] = False
        except Exception as e:  # pylint: disable=broad-except
            result['errors'].append(f"Unexpected validation error: {str(e)}")
            result['valid'] = False

        return result

    def validate_all(self) -> Dict:
        """
        Validate all skills.

        Returns:
            Dictionary with validation summary
        """
        print("Finding skill files...")
        skill_files = self.find_skill_files()
        print(f"Found {len(skill_files)} skill files\n")

        print("Validating skills...")
        results: List[Dict] = []
        valid_count = 0
        error_count = 0
        warning_count = 0

        for file_path in skill_files:
            result = self.validate_skill(file_path)
            results.append(result)

            if result['valid']:
                valid_count += 1
                print(f"  [OK] {result['path']}")
            else:
                error_count += 1
                print(f"  [ERROR] {result['path']}")

            warning_count += len(result['warnings'])

        # Print detailed results
        self._print_results(results, error_count, warning_count, len(skill_files))

        return {
            'total': len(skill_files),
            'valid': valid_count,
            'errors': error_count,
            'warnings': warning_count,
            'results': results
        }

    def _print_results(
        self,
        results: List[Dict],
        error_count: int,
        warning_count: int,
        total_files: int
    ) -> None:
        """
        Print validation results.

        Args:
            results: List of validation results
            error_count: Number of errors
            warning_count: Number of warnings
            total_files: Total number of files validated
        """
        print("\n" + "=" * 70)
        print("VALIDATION RESULTS")
        print("=" * 70)

        # Print errors
        if error_count > 0:
            print(f"\nERRORS ({error_count} skills with errors):")
            print("-" * 70)
            for result in results:
                if not result['valid']:
                    print(f"\n{result['path']}:")
                    for error in result['errors']:
                        print(f"  - ERROR: {error}")

        # Print warnings
        if warning_count > 0:
            print(f"\nWARNINGS ({warning_count} total warnings):")
            print("-" * 70)
            for result in results:
                if result['warnings']:
                    print(f"\n{result['path']}:")
                    for warning in result['warnings']:
                        print(f"  - WARNING: {warning}")

        # Summary
        print("\n" + "=" * 70)
        print("SUMMARY")
        print("=" * 70)
        print(f"Total skills: {total_files}")
        print(f"Valid skills: {total_files - error_count}")
        print(f"Skills with errors: {error_count}")
        print(f"Total warnings: {warning_count}")
        print(f"\nValidation: {'PASSED' if error_count == 0 else 'FAILED'}")
        print("=" * 70)


def main() -> int:
    """
    Main entry point.

    Returns:
        Exit code (0 if passed, 1 if failed)
    """
    try:
        script_dir = Path(__file__).parent.resolve()
        stdlib_path = script_dir.parent / 'stdlib'

        print("=" * 70)
        print("PCL Standard Library - Skill Validator")
        print("=" * 70)
        print(f"\nStdlib path: {stdlib_path}\n")

        # Validate stdlib path exists
        if not stdlib_path.is_dir():
            print(f"Error: Stdlib directory not found: {stdlib_path}", file=sys.stderr)
            return 1

        validator = SkillValidator(str(stdlib_path))
        summary = validator.validate_all()

        # Exit with error code if validation failed
        return 0 if summary['errors'] == 0 else 1

    except KeyboardInterrupt:
        print("\n\nOperation cancelled by user", file=sys.stderr)
        return 130
    except Exception as e:  # pylint: disable=broad-except
        print(f"\nError: {e}", file=sys.stderr)
        return 1


if __name__ == '__main__':
    sys.exit(main())
