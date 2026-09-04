#!/usr/bin/env python3
"""
PCL Standard Library - Inventory & Structure Generator

Regenerates the two documents that describe the library's shape:

  stdlib/SKILLS_INVENTORY.md    complete listing with sizes and references
  stdlib/DIRECTORY_STRUCTURE.md the directory tree and category layout

Both are derived from the tree itself, so they cannot drift. Run after adding,
renaming, or splitting a skill, alongside generate-skill-catalog.py.

Security: This script uses safe YAML loading and reads only inside stdlib/.
"""

import re
import sys
from collections import defaultdict
from datetime import date
from pathlib import Path
from typing import Dict, List

import yaml

CATEGORY_LABELS = {
    'ai': 'AI & Machine Learning',
    'api': 'APIs & Services',
    'cloud': 'Cloud Platforms',
    'data': 'Data & Databases',
    'design': 'Design',
    'devops': 'DevOps & Infrastructure',
    'domains': 'Business & Technology Domains',
    'frameworks': 'Frameworks & Platforms',
    'languages': 'Programming Languages',
    'professional': 'Professional Services',
    'qa': 'QA & Testing',
    'scientific': 'Scientific & Research',
    'security': 'Security & Compliance',
    'tools': 'Tools & Meta-Programming',
}


def collect(stdlib: Path) -> List[Dict]:
    """Read every skill entry point with its frontmatter and reference files."""
    skills = []
    for path in sorted(stdlib.glob('*/*/SKILL.md')):
        text = path.read_text(encoding='utf-8', errors='ignore')
        match = re.match(r'^---\s*\n(.*?)\n---\s*\n', text, re.DOTALL)
        if not match:
            print(f'Warning: {path} has no frontmatter, skipped', file=sys.stderr)
            continue
        try:
            meta = yaml.safe_load(match.group(1)) or {}
        except yaml.YAMLError as exc:
            print(f'Warning: {path}: {exc}', file=sys.stderr)
            continue

        references = sorted(path.parent.glob('references/*.md'))
        skills.append({
            'category': path.parent.parent.name,
            'name': meta.get('name', path.parent.name),
            'version': str(meta.get('version', '')),
            'lines': text.count('\n') + 1,
            'references': [
                (ref.name, ref.read_text(encoding='utf-8', errors='ignore').count('\n') + 1)
                for ref in references
            ],
        })
    return skills


def inventory(skills: List[Dict]) -> str:
    by_category = defaultdict(list)
    for skill in skills:
        by_category[skill['category']].append(skill)

    total_refs = sum(len(s['references']) for s in skills)
    ref_lines = sum(n for s in skills for _, n in s['references'])
    skill_lines = sum(s['lines'] for s in skills)

    out = [
        '# PCL Standard Library — Skills Inventory',
        '',
        f'**{len(skills)} expert skills** across {len(by_category)} categories.',
        '',
        'Generated from the contents of `stdlib/` by',
        '`scripts/generate-skill-inventory.py`. Do not edit by hand — rerun the',
        'script after adding, renaming, or splitting a skill.',
        '',
        '---',
        '',
        '## Layout',
        '',
        'Every skill is a directory holding a `SKILL.md`, grouped by category:',
        '',
        '```',
        'stdlib/<category>/<skill-name>/',
        '├── SKILL.md            # entry point, loaded whenever the skill activates',
        '└── references/         # detailed material, read on demand',
        '```',
        '',
        'This is the Agent Skills v1.0 layout. `SKILL.md` stays within a 500-line',
        'budget so activation stays cheap; the bulk of each skill lives in',
        '`references/` and is read only when needed (progressive disclosure).',
        '',
        f'- Skill entry points: **{len(skills)}** ({skill_lines:,} lines)',
        f'- Reference documents: **{total_refs}** ({ref_lines:,} lines)',
        '',
        'Conformance is enforced by `scripts/validate-skills.py`; the machine-readable',
        'index lives in `stdlib/catalog/`.',
        '',
        '---',
        '',
        '## Distribution by category',
        '',
        '| Category | Skills | References |',
        '| --- | ---: | ---: |',
    ]
    for category in sorted(by_category, key=lambda c: (-len(by_category[c]), c)):
        group = by_category[category]
        label = CATEGORY_LABELS.get(category, category.title())
        refs = sum(len(s['references']) for s in group)
        out.append(f'| {label} (`{category}`) | {len(group)} | {refs} |')
    out.append(f'| **Total** | **{len(skills)}** | **{total_refs}** |')
    out += ['', '---', '', '## Complete listing', '']

    for category in sorted(by_category, key=lambda c: (-len(by_category[c]), c)):
        group = sorted(by_category[category], key=lambda s: s['name'])
        label = CATEGORY_LABELS.get(category, category.title())
        out += [f'### {label} — `{category}/` ({len(group)})', '',
                '| # | Skill | Version | SKILL.md | References |',
                '| ---: | --- | --- | ---: | --- |']
        for n, skill in enumerate(group, 1):
            refs = ', '.join(f'{name} ({size})' for name, size in skill['references']) or '—'
            out.append(f"| {n} | `{skill['name']}` | {skill['version'] or '—'} | "
                       f"{skill['lines']} | {refs} |")
        out.append('')

    out += ['---', '',
            '## Maintenance', '',
            '```bash',
            'python scripts/validate-skills.py          # conformance gate',
            'python scripts/split-skill-references.py   # enforce the SKILL.md budget',
            'python scripts/generate-skill-catalog.py   # rebuild stdlib/catalog/',
            'python scripts/generate-skill-inventory.py # rebuild this file',
            '```',
            '',
            f'**Last generated:** {date.today().isoformat()}']
    return '\n'.join(out) + '\n'


def structure(skills: List[Dict]) -> str:
    by_category = defaultdict(list)
    for skill in skills:
        by_category[skill['category']].append(skill)

    out = [
        '# PCL Standard Library — Directory Structure',
        '',
        f'**{len(skills)} expert skills across {len(by_category)} categories.**',
        '',
        'Generated by `scripts/generate-skill-inventory.py`. Do not edit by hand.',
        '',
        '## Organisation',
        '',
        '```',
        'stdlib/',
    ]
    categories = sorted(by_category)
    for n, category in enumerate(categories):
        last_category = n == len(categories) - 1
        stem = '└──' if last_category else '├──'
        pipe = '    ' if last_category else '│   '
        label = CATEGORY_LABELS.get(category, category.title())
        out.append(f'{stem} {category}/{" " * max(1, 16 - len(category))}'
                   f'# {label} ({len(by_category[category])} skills)')
        group = sorted(by_category[category], key=lambda s: s['name'])
        shown = group[:3]
        for m, skill in enumerate(shown):
            leaf = '└──' if (m == len(shown) - 1 and len(group) <= 3) else '├──'
            out.append(f'{pipe}{leaf} {skill["name"]}/')
            out.append(f'{pipe}│   ├── SKILL.md')
            out.append(f'{pipe}│   └── references/')
        if len(group) > 3:
            out.append(f'{pipe}└── ... {len(group) - 3} more')
    out += ['└── catalog/            # generated index (JSON + YAML)', '```', '']

    out += ['## Skill anatomy', '',
            '```',
            'stdlib/<category>/<skill-name>/',
            '├── SKILL.md            # required entry point (< 500 lines)',
            '└── references/         # optional, read on demand',
            '    ├── CORE_CONCEPTS.md',
            '    ├── EXAMPLES.md',
            '    ├── BEST_PRACTICES.md',
            '    └── ANTI_PATTERNS.md',
            '```',
            '',
            'The directory name must equal the `name:` field in the frontmatter, and',
            'the `category:` field must equal the parent directory name. Both rules',
            'are checked by `scripts/validate-skills.py`.',
            '',
            '## Categories', '',
            '| Directory | Contents | Skills |',
            '| --- | --- | ---: |']
    for category in categories:
        out.append(f'| `{category}/` | {CATEGORY_LABELS.get(category, category.title())} '
                   f'| {len(by_category[category])} |')
    out += ['', f'**Last generated:** {date.today().isoformat()}']
    return '\n'.join(out) + '\n'


def main() -> int:
    stdlib = Path(__file__).parent.parent / 'stdlib'
    if not stdlib.is_dir():
        print(f'Error: stdlib not found at {stdlib}', file=sys.stderr)
        return 1

    skills = collect(stdlib)
    if not skills:
        print('Error: no skills found', file=sys.stderr)
        return 1

    (stdlib / 'SKILLS_INVENTORY.md').write_text(
        inventory(skills), encoding='utf-8', newline='\n')
    (stdlib / 'DIRECTORY_STRUCTURE.md').write_text(
        structure(skills), encoding='utf-8', newline='\n')

    print(f'Wrote SKILLS_INVENTORY.md and DIRECTORY_STRUCTURE.md for {len(skills)} skills')
    return 0


if __name__ == '__main__':
    sys.exit(main())
