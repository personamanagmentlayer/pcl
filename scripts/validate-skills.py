#!/usr/bin/env python3
"""
PCL Standard Library - Skill Validation Script

Validates all skills in the stdlib for:
- YAML frontmatter syntax
- Required fields
- File structure
- Code block formatting
- Agent Skills v1.0 conformance (naming, description triggers, layout,
  progressive disclosure budgets, reference link integrity)

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

    # --- Agent Skills v1.0 conformance budgets -----------------------------
    # Skill names: lowercase alphanumerics separated by single hyphens.
    NAME_PATTERN = re.compile(r'^[a-z0-9]+(-[a-z0-9]+)*$')
    NAME_MAX_LENGTH = 64
    DESCRIPTION_MAX_LENGTH = 1024
    # Progressive disclosure: SKILL.md is loaded in full on activation, so it
    # stays small; bulk material belongs in references/ loaded on demand.
    SKILL_MAX_LINES = 500
    REFERENCE_MAX_LINES = 1000
    # Phrases that make an activation trigger explicit for the agent.
    TRIGGER_PATTERNS = ('use when', 'use this skill when', 'use this skill for')

    # --- Security rules ----------------------------------------------------
    # A skill's allowed-tools is a capability grant. An unrestricted shell lets
    # any example in the skill run against the user's machine, so tool grants
    # must name the commands they need.
    UNRESTRICTED_SHELL = re.compile(r'^Bash\s*\(\s*\*\s*\)$')
    # Credential literals in examples teach the pattern of inlining secrets and
    # get copied verbatim into real code, so even an obvious placeholder in
    # provider-key shape is wrong. These prefixes are unambiguous, so they are
    # matched wherever they appear rather than only after a known field name.
    SECRET_LITERAL = re.compile(
        r'''(?x)
        ["'](?:
            sk_[A-Za-z0-9_.-]{2,} | rk_[A-Za-z0-9_.-]{2,} | pk_live[A-Za-z0-9_.-]* |
            AKIA[A-Z0-9]{6,} | ghp_[A-Za-z0-9]{6,} | gho_[A-Za-z0-9]{6,} |
            xox[abprs]-[A-Za-z0-9-]{6,} | AIza[A-Za-z0-9_-]{6,} |
            eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}
        )["']
        | -----BEGIN[ A-Z]*PRIVATE\ KEY-----
        ''')
    # A credential-named parameter assigned any string literal. Placeholders are
    # common in documentation, so this is a warning rather than an error - but
    # the habit it teaches is still the wrong one.
    SECRET_ASSIGNMENT = re.compile(
        r'''(?ix)
        \b(api[_-]?key|secret|secret[_-]?key|client[_-]?secret|password|passwd|
           access[_-]?token|auth[_-]?token|private[_-]?key)\b
        \s*[:=]\s*
        ["'](?P<value>[^"'\n]*)["']
        ''')
    # Values that are an indirection rather than a secret: environment lookups,
    # template substitutions, and empty placeholders are the correct pattern.
    SECRET_INDIRECTION = re.compile(
        r'''(?ix)
        ^\s*$
        | \{\{ | \$\{ | \$\( | ^<.*>$ | ^%\w+%$
        | \b(os\.environ|os\.getenv|getenv|env_var|environ\[|lookup\s*\(|
             secrets?manager|vault|process\.env|System\.getenv)\b
        ''')

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

        # Relative links may legitimately point at repository documentation
        # outside stdlib/, but never outside the repository itself.
        self.repo_root = self.stdlib_path.parent

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
        return self._is_within(file_path, self.stdlib_path)

    @staticmethod
    def _is_within(candidate: Path, root: Path) -> bool:
        """
        Return True when candidate resolves inside root.

        Args:
            candidate: Path to test
            root: Directory that must contain it

        Returns:
            True if candidate is inside root, False otherwise
        """
        try:
            return candidate.resolve().is_relative_to(root)
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

            # Structural checks look at the skill as a whole: under progressive
            # disclosure the bulk sections live in references/, not in SKILL.md.
            references = sorted(
                ref for ref in file_path.parent.glob('references/*.md')
                if self._is_safe_path(ref)
            )
            whole = content
            for ref in references:
                try:
                    whole += '\n' + ref.read_text(encoding='utf-8', errors='ignore')
                except (OSError, IOError):
                    continue

            # Check for main heading (in SKILL.md itself, after the frontmatter)
            body = re.sub(r'^---\s*\n.*?\n---\s*\n', '', content, count=1, flags=re.DOTALL)
            if not re.search(r'^# \S', body, re.MULTILINE):
                result['warnings'].append("Missing main heading (# Title)")

            # Check for core concepts section
            if not re.search(r'^## (Core Concepts|Core Expertise|Expertise)', whole, re.M):
                result['warnings'].append("Missing 'Core Concepts' or 'Expertise' section")

            # Check for code examples
            code_blocks = re.findall(r'```[\s\S]*?```', whole)
            if not code_blocks:
                result['warnings'].append("No code examples found")
            elif len(code_blocks) < 2:
                result['warnings'].append("Very few code examples (< 2)")

            # Check for best practices
            if '## Best Practices' not in whole:
                result['warnings'].append("Missing 'Best Practices' section")

            # Check for anti-patterns
            if not re.search(r'^## Anti-?[Pp]atterns', whole, re.M):
                result['warnings'].append("Missing 'Anti-Patterns' section")

            # Check for resources
            if not re.search(r'^## (Resources|References)', whole, re.M):
                result['warnings'].append("Missing 'Resources' section")

            # Check size. A small SKILL.md backed by references is the intended
            # shape, so only flag a skill that is thin overall.
            total_size = file_size + sum(ref.stat().st_size for ref in references)
            if total_size < 5000:
                result['warnings'].append(f"Skill may be too small ({total_size} bytes)")
            elif file_size > 500000:  # More than 500KB
                result['warnings'].append(f"File may be too large ({file_size} bytes)")

            # Agent Skills v1.0 conformance
            self._validate_spec_v1(file_path, content, frontmatter, result)

        except (OSError, IOError) as e:
            result['errors'].append(f"File reading error: {str(e)}")
            result['valid'] = False
        except Exception as e:  # pylint: disable=broad-except
            result['errors'].append(f"Unexpected validation error: {str(e)}")
            result['valid'] = False

        return result

    def _skill_sources(self, file_path: Path, content: str):
        """Yield (label, text) for SKILL.md and each of its reference files.

        Args:
            file_path: Path to the SKILL.md
            content: Already-read SKILL.md content

        Yields:
            Tuples of a short label and the file's text
        """
        yield file_path.name, content
        for ref in sorted(file_path.parent.glob('references/*.md')):
            if not self._is_safe_path(ref):
                continue
            try:
                yield f'references/{ref.name}', ref.read_text(
                    encoding='utf-8', errors='ignore')
            except (OSError, IOError):
                continue

    @staticmethod
    def _strip_code_fences(content: str) -> str:
        """
        Remove fenced code blocks, honouring fences longer than three backticks.

        A naive non-greedy regex closes a ```` fence on the first ``` inside it,
        leaking sample code back into the prose. Track the opening fence length
        and close only on a fence at least as long.

        Args:
            content: Markdown content

        Returns:
            Content with fenced blocks removed
        """
        out: List[str] = []
        fence: Optional[str] = None
        for line in content.split('\n'):
            marker = re.match(r'^\s*(`{3,}|~{3,})', line)
            if fence is None:
                if marker:
                    fence = marker.group(1)
                else:
                    out.append(line)
            elif marker and marker.group(1)[0] == fence[0] and len(marker.group(1)) >= len(fence):
                fence = None
        return '\n'.join(out)

    def _validate_spec_v1(
        self,
        file_path: Path,
        content: str,
        frontmatter: Dict,
        result: Dict
    ) -> None:
        """
        Check Agent Skills v1.0 conformance.

        Covers the rules the generic field checks above cannot express: the
        skill's identity must agree with its location on disk, its description
        must state an activation trigger, and its size must respect the
        progressive-disclosure budget.

        Args:
            file_path: Path to the skill file
            content: Full file content
            frontmatter: Parsed frontmatter mapping
            result: Validation result to append errors/warnings to
        """
        rel = file_path.relative_to(self.stdlib_path)
        parts = rel.parts

        # --- Layout: <category>/<skill-name>/SKILL.md --------------------
        if file_path.name == 'SKILL.md':
            if len(parts) != 3:
                result['errors'].append(
                    f"Unexpected layout: expected <category>/<name>/SKILL.md, got {rel}"
                )
                result['valid'] = False
            slug = parts[-2] if len(parts) >= 2 else ''
        else:
            result['errors'].append(
                "Flat layout: a skill must live in its own directory as "
                f"{rel.parent}/{rel.stem}/SKILL.md"
            )
            result['valid'] = False
            slug = rel.stem
        category_dir = parts[0] if parts else ''

        # --- name -------------------------------------------------------
        name = frontmatter.get('name')
        if isinstance(name, str) and name:
            if len(name) > self.NAME_MAX_LENGTH:
                result['errors'].append(
                    f"Name exceeds {self.NAME_MAX_LENGTH} characters: {len(name)}"
                )
                result['valid'] = False
            if not self.NAME_PATTERN.match(name):
                result['errors'].append(
                    "Name must be lowercase alphanumerics separated by single "
                    f"hyphens (no leading/trailing/consecutive hyphens): {name!r}"
                )
                result['valid'] = False
            if slug and name != slug:
                result['errors'].append(
                    f"Name {name!r} does not match its directory {slug!r}"
                )
                result['valid'] = False

        # --- description ------------------------------------------------
        description = frontmatter.get('description')
        if isinstance(description, str) and description:
            if len(description) > self.DESCRIPTION_MAX_LENGTH:
                result['errors'].append(
                    f"Description exceeds {self.DESCRIPTION_MAX_LENGTH} characters: "
                    f"{len(description)}"
                )
                result['valid'] = False
            lowered = description.lower()
            if not any(trigger in lowered for trigger in self.TRIGGER_PATTERNS):
                result['errors'].append(
                    "Description states no activation trigger; add a "
                    "'Use when ...' clause naming the keywords, file types or "
                    "tasks that should select this skill"
                )
                result['valid'] = False
        elif description is not None and not isinstance(description, str):
            result['errors'].append("Description must be a string")
            result['valid'] = False

        # --- category ---------------------------------------------------
        category = frontmatter.get('category')
        if category and category_dir and category != category_dir:
            result['errors'].append(
                f"Category {category!r} does not match its directory {category_dir!r}"
            )
            result['valid'] = False

        # --- capability grants ------------------------------------------
        declared = frontmatter.get('allowed-tools')
        if isinstance(declared, str):
            declared = [t.strip() for t in declared.split(',')]
        for tool in declared or []:
            if isinstance(tool, str) and self.UNRESTRICTED_SHELL.match(tool.strip()):
                result['errors'].append(
                    "allowed-tools grants an unrestricted shell (Bash(*)); name "
                    "the commands the skill needs, e.g. Bash(python:*, pytest:*)"
                )
                result['valid'] = False

        # --- credential literals ----------------------------------------
        # Checked across the whole skill: an example in references/ is copied
        # just as readily as one in SKILL.md.
        for source, text in self._skill_sources(file_path, content):
            for match in self.SECRET_LITERAL.finditer(text):
                result['errors'].append(
                    f"{source}: credential literal in provider-key shape "
                    f"({match.group(0)[:24]}...); load it from the environment "
                    "or a secrets manager instead"
                )
                result['valid'] = False
            for match in self.SECRET_ASSIGNMENT.finditer(text):
                if self.SECRET_INDIRECTION.search(match.group('value')):
                    continue  # an env/vault lookup or empty placeholder is correct
                result['warnings'].append(
                    f"{source}: {match.group(1)} assigned a string literal; "
                    "prefer os.environ or a secrets manager even in examples"
                )

        # --- progressive disclosure -------------------------------------
        line_count = content.count('\n') + 1
        if line_count > self.SKILL_MAX_LINES:
            result['errors'].append(
                f"SKILL.md is {line_count} lines (budget {self.SKILL_MAX_LINES}); "
                "move detailed material into references/ and link to it"
            )
            result['valid'] = False

        # --- reference files and link integrity -------------------------
        skill_dir = file_path.parent
        for ref in sorted(skill_dir.glob('references/*.md')):
            if not self._is_safe_path(ref):
                continue
            try:
                ref_lines = ref.read_text(encoding='utf-8', errors='ignore').count('\n') + 1
            except (OSError, IOError):
                continue
            if ref_lines > self.REFERENCE_MAX_LINES:
                result['warnings'].append(
                    f"Reference {ref.name} is {ref_lines} lines "
                    f"(budget {self.REFERENCE_MAX_LINES}); consider splitting it"
                )

        # Code samples routinely contain ](...)-looking text; strip fenced and
        # inline code before scanning so they are not mistaken for links.
        prose = re.sub(r'`[^`\n]*`', '', self._strip_code_fences(content))
        for link in re.findall(r'\]\((?!https?://|mailto:|#)([^)\s]+)\)', prose):
            target = (skill_dir / link.split('#')[0]).resolve()
            if not self._is_within(target, self.repo_root):
                result['errors'].append(f"Link escapes the repository: {link}")
                result['valid'] = False
            elif not target.exists():
                result['errors'].append(f"Broken relative link: {link}")
                result['valid'] = False

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
