#!/usr/bin/env python3
"""
PCL Standard Library - Progressive Disclosure Splitter

Agent Skills v1.0 loads a SKILL.md body in full whenever the skill activates,
so it must stay small; bulk material belongs in references/ that are read only
when needed. This tool moves the heaviest sections of an oversized SKILL.md
into references/ and leaves an index behind.

Guarantees:
- Lossless. Every body line of the original file lands in exactly one output
  file. The move is verified line by line and the tool aborts before writing
  if the accounting does not balance.
- Deterministic. Sections are selected by a fixed priority, then by size.
- Idempotent. A skill already under budget is left untouched.

Usage:
    python scripts/split-skill-references.py [--dry-run] [--budget N] [PATH ...]

With no PATH, every skill in stdlib/ is considered.

Security: reads and writes only inside the stdlib tree; no shell execution.
"""

import argparse
import re
import sys
from pathlib import Path
from typing import Dict, List, Optional, Tuple

# Sections are moved out in this order until the budget is met. Guidance
# sections (Best Practices, Anti-Patterns) and short tail matter (Resources)
# stay in SKILL.md as long as the budget allows.
EXTRACTION_PRIORITY = [
    (re.compile(r'^(code|implementation|usage)\s+examples?$', re.I), 'EXAMPLES.md'),
    (re.compile(r'^core\s+(expertise|concepts?|competenc(y|ies))$', re.I), 'CORE_CONCEPTS.md'),
    (re.compile(r'^(approach|methodology)$', re.I), 'CORE_CONCEPTS.md'),
    (re.compile(r'^common\s+(patterns?|tasks?)$', re.I), 'PATTERNS.md'),
    (re.compile(r'^best\s+practices$', re.I), 'BEST_PRACTICES.md'),
    (re.compile(r'^anti-?patterns?(\s+to\s+avoid)?$', re.I), 'ANTI_PATTERNS.md'),
]
# Never moved: without these the skill stops describing itself.
PINNED = re.compile(
    r'^(learning\s+objectives|prerequisites|when\s+to\s+use.*|resources|references?|'
    r'reference\s+documentation)$', re.I)

DEFAULT_BUDGET = 500
REFERENCE_BUDGET = 1000
# A section smaller than this is not worth a separate reference file.
MIN_MOVE_LINES = 40
INDEX_HEADING = '## Reference Documentation'


class Section:
    """One H2 section of a skill body."""

    def __init__(self, title: str, start: int, lines: List[str]) -> None:
        self.title = title
        self.start = start
        self.lines = lines

    def __len__(self) -> int:
        return len(self.lines)

    def subtopics(self, limit: int = 8) -> List[str]:
        """H3 headings inside this section, for the index entry."""
        found = []
        for line in self.lines:
            if line.startswith('### '):
                topic = re.sub(r'^\d+[.)]\s*', '', line[4:].strip()).rstrip(':')
                if topic and topic not in found:
                    found.append(topic)
            if len(found) >= limit:
                break
        return found


def strip_fenced(lines: List[str]) -> List[bool]:
    """Return a mask marking lines that sit inside a fenced code block."""
    inside, fence = [], None
    for line in lines:
        marker = re.match(r'^\s*(`{3,}|~{3,})', line)
        if marker:
            token = marker.group(1)
            if fence is None:
                fence = token
                inside.append(True)
                continue
            if token[0] == fence[0] and len(token) >= len(fence):
                fence = None
            inside.append(True)
            continue
        inside.append(fence is not None)
    return inside


def parse(path: Path) -> Tuple[str, List[str], List[Section]]:
    """Split a skill into (frontmatter, preamble lines, H2 sections)."""
    text = path.read_text(encoding='utf-8')
    match = re.match(r'^(---\n.*?\n---\n)(.*)$', text, re.DOTALL)
    if not match:
        raise ValueError(f'{path}: no YAML frontmatter')
    frontmatter, body = match.group(1), match.group(2)

    lines = body.split('\n')
    masked = strip_fenced(lines)
    heads = [i for i, line in enumerate(lines)
             if line.startswith('## ') and not masked[i]]

    preamble = lines[:heads[0]] if heads else lines
    sections = []
    for n, start in enumerate(heads):
        stop = heads[n + 1] if n + 1 < len(heads) else len(lines)
        sections.append(Section(lines[start][3:].strip(), start, lines[start:stop]))
    return frontmatter, preamble, sections


def classify(section: Section) -> Tuple[int, Optional[str]]:
    """Return (priority, target filename); priority -1 means never move."""
    if PINNED.match(section.title):
        return -1, None
    for rank, (pattern, filename) in enumerate(EXTRACTION_PRIORITY):
        if pattern.match(section.title):
            return rank, filename
    slug = re.sub(r'[^a-z0-9]+', '-', section.title.lower()).strip('-')
    return len(EXTRACTION_PRIORITY), (slug.upper().replace('-', '_') or 'DETAILS') + '.md'


def chunk_reference(title: str, lines: List[str]) -> List[List[str]]:
    """Split an oversized reference at H3 boundaries, keeping parts whole."""
    if len(lines) <= REFERENCE_BUDGET:
        return [lines]
    masked = strip_fenced(lines)
    breaks = [i for i, line in enumerate(lines)
              if line.startswith('### ') and not masked[i] and i > 0]
    if not breaks:
        return [lines]

    parts, current, start = [], 0, 0
    for point in breaks:
        if point - start >= REFERENCE_BUDGET:
            parts.append(lines[start:current or point])
            start = current or point
        current = point
    parts.append(lines[start:])
    return [p for p in parts if p]


def build_index(entries: List[Tuple[str, Section]]) -> List[str]:
    """The Reference Documentation section left behind in SKILL.md."""
    out = [INDEX_HEADING, '',
           'Detailed material lives alongside this skill and is read on demand:', '']
    for filename, section in entries:
        topics = section.subtopics()
        detail = f' — {", ".join(topics)}' if topics else ''
        out.append(f'- [{section.title}](references/{filename}){detail}')
    out.append('')
    return out


def split_skill(path: Path, budget: int, dry_run: bool) -> Optional[Dict]:
    """Move sections of one skill into references/. Returns a report or None."""
    frontmatter, preamble, sections = parse(path)
    total = frontmatter.count('\n') + sum(len(s) for s in sections) + len(preamble)
    if total <= budget:
        return None

    ranked = sorted(
        ((classify(s), s) for s in sections),
        key=lambda item: (item[0][0], -len(item[1]))
    )

    moved: List[Tuple[str, Section]] = []
    remaining = total
    # First pass ignores sections too small to be worth a round trip to disk;
    # a second pass lifts that floor only if the budget is still not met.
    for floor in (MIN_MOVE_LINES, 0):
        for (rank, filename), section in ranked:
            if remaining <= budget:
                break
            if rank < 0 or filename is None or len(section) < floor:
                continue
            if any(s is section for _, s in moved):
                continue
            moved.append((filename, section))
            remaining -= len(section)
        if remaining <= budget:
            break

    if not moved:
        return {'path': str(path), 'skipped': 'nothing movable', 'lines': total}

    moved_titles = {id(s) for _, s in moved}
    kept = [s for s in sections if id(s) not in moved_titles]

    # index goes before Resources when there is one, else at the end
    index = build_index(moved)
    tail_at = next((i for i, s in enumerate(kept)
                    if re.match(r'^(resources|references?)$', s.title, re.I)), len(kept))

    new_body: List[str] = list(preamble)
    for section in kept[:tail_at]:
        new_body.extend(section.lines)
    new_body.extend(index)
    for section in kept[tail_at:]:
        new_body.extend(section.lines)

    # group sections that share a target file, preserving document order
    grouped: Dict[str, List[Section]] = {}
    for filename, section in moved:
        grouped.setdefault(filename, []).append(section)
    for group in grouped.values():
        group.sort(key=lambda s: s.start)

    # --- lossless accounting -------------------------------------------
    original_body = list(preamble)
    for section in sections:
        original_body.extend(section.lines)
    accounted = list(preamble)
    for section in kept:
        accounted.extend(section.lines)
    for group in grouped.values():
        for section in group:
            accounted.extend(section.lines)
    if sorted(accounted) != sorted(original_body):
        raise AssertionError(f'{path}: line accounting does not balance; refusing to write')

    written = []
    ref_dir = path.parent / 'references'
    for filename, group in grouped.items():
        body: List[str] = []
        for section in group:
            body.extend(section.lines)
        title = next((line[2:].strip() for line in preamble if line.startswith('# ')),
                     path.parent.name.replace('-', ' ').title())
        for n, chunk in enumerate(chunk_reference(filename, body)):
            name = filename if n == 0 else filename.replace('.md', f'-{n + 1}.md')
            header = [f'# {title} — {group[0].title}'
                      + (f' (part {n + 1})' if n else ''), '',
                      f'Reference material for the `{path.parent.name}` skill. '
                      f'See [SKILL.md](../SKILL.md).', '']
            written.append((ref_dir / name, header + chunk))

    if not dry_run:
        ref_dir.mkdir(exist_ok=True)
        path.write_text(frontmatter + '\n'.join(new_body).rstrip('\n') + '\n',
                        encoding='utf-8', newline='\n')
        for target, content in written:
            target.write_text('\n'.join(content).rstrip('\n') + '\n',
                              encoding='utf-8', newline='\n')

    return {
        'path': str(path),
        'before': total,
        'after': frontmatter.count('\n') + len(new_body),
        'moved': [(f, s.title, len(s)) for f, s in moved],
        'files': [str(t.relative_to(path.parent)) for t, _ in written],
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('paths', nargs='*', help='SKILL.md files (default: all of stdlib)')
    parser.add_argument('--budget', type=int, default=DEFAULT_BUDGET,
                        help=f'maximum SKILL.md lines (default {DEFAULT_BUDGET})')
    parser.add_argument('--dry-run', action='store_true', help='report without writing')
    args = parser.parse_args()

    stdlib = Path(__file__).parent.parent / 'stdlib'
    if args.paths:
        targets = [Path(p).resolve() for p in args.paths]
        for target in targets:
            if not target.is_relative_to(stdlib.resolve()):
                print(f'Error: {target} is outside {stdlib}', file=sys.stderr)
                return 1
    else:
        targets = sorted(stdlib.glob('*/*/SKILL.md'))

    reports, failures = [], 0
    for target in targets:
        try:
            report = split_skill(target, args.budget, args.dry_run)
        except (ValueError, AssertionError) as exc:
            print(f'  [FAIL] {exc}', file=sys.stderr)
            failures += 1
            continue
        if report:
            reports.append(report)

    for report in reports:
        rel = Path(report['path']).parent.name
        if 'skipped' in report:
            print(f"  [SKIP] {rel}: {report['skipped']} ({report['lines']} lines)")
            continue
        print(f"  [SPLIT] {rel}: {report['before']} -> {report['after']} lines, "
              f"{len(report['files'])} reference file(s)")
        for filename, title, size in report['moved']:
            print(f"            {title} ({size} lines) -> references/{filename}")

    split = [r for r in reports if 'skipped' not in r]
    print(f"\n{'Would split' if args.dry_run else 'Split'} {len(split)} skill(s); "
          f"{len(reports) - len(split)} skipped; {failures} failure(s)")
    return 1 if failures else 0


if __name__ == '__main__':
    sys.exit(main())
