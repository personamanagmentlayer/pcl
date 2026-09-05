# Document Processing — Library Selection and Recipes

Reference material for the `document-processing-expert` skill. See [SKILL.md](../SKILL.md).

## Choosing a Library

### PDF

| Library          | Strength                                          | Weakness                           | Licence |
| ---------------- | ------------------------------------------------- | ---------------------------------- | ------- |
| `pypdf`          | Page manipulation, forms, encryption; pure Python | Weak layout-aware extraction       | BSD     |
| `pdfplumber`     | Best-in-class table and layout extraction         | Slower; built on `pdfminer.six`    | MIT     |
| `PyMuPDF` (fitz) | Fastest extraction, rendering, redaction          | AGPL — check before commercial use | AGPL    |
| `reportlab`      | Generating PDFs from scratch                      | Verbose for document-shaped output | BSD     |
| `WeasyPrint`     | HTML/CSS to PDF — the pragmatic generator         | No JavaScript                      | BSD     |
| `qpdf` (CLI)     | Repair, linearise, decrypt, split                 | Not a text extractor               | Apache  |

Rules of thumb: extract text with `pdfplumber`, manipulate pages with `pypdf`,
generate by rendering HTML with `WeasyPrint`, and reach for `PyMuPDF` only when
performance demands it and the licence is acceptable.

### Office formats

| Format       | Read                 | Write                    | Notes                                   |
| ------------ | -------------------- | ------------------------ | --------------------------------------- |
| XLSX         | `openpyxl`, `pandas` | `openpyxl`, `XlsxWriter` | `XlsxWriter` writes faster; cannot read |
| XLS (legacy) | `xlrd`               | —                        | Convert to XLSX first                   |
| DOCX         | `python-docx`        | `python-docx`, `docxtpl` | `docxtpl` for templating                |
| PPTX         | `python-pptx`        | `python-pptx`            | Always start from a template            |
| CSV          | `csv`, `pandas`      | `csv`, `pandas`          | Specify encoding and dialect explicitly |

### JavaScript equivalents

| Task           | Library                             |
| -------------- | ----------------------------------- |
| PDF generation | `pdfkit`, `puppeteer` (HTML to PDF) |
| PDF extraction | `pdf-parse`, `pdfjs-dist`           |
| Excel          | `exceljs`, `sheetjs`                |
| Word           | `docx`, `docxtemplater`             |

## Recipe: HTML to PDF Report

The most maintainable way to produce a formatted report. The layout is CSS, which
a designer can edit and a browser can preview.

```python
from jinja2 import Environment, FileSystemLoader
from weasyprint import HTML, CSS

def render_report(context: dict, out: str) -> None:
    env = Environment(loader=FileSystemLoader("templates"), autoescape=True)
    html = env.get_template("report.html").render(**context)
    HTML(string=html, base_url="templates").write_pdf(
        out, stylesheets=[CSS(filename="templates/print.css")]
    )
```

```css
/* print.css - the parts that matter for paged output */
@page {
  size: A4;
  margin: 20mm 18mm;
  @bottom-right {
    content: 'Page ' counter(page) ' / ' counter(pages);
  }
}

table {
  border-collapse: collapse;
  width: 100%;
}
thead {
  display: table-header-group;
} /* repeat header across pages */
tr {
  break-inside: avoid;
}
h2 {
  break-after: avoid;
} /* never orphan a heading */
```

`autoescape=True` is not optional: report data is user data, and an unescaped
value is injection into the document.

## Recipe: Multi-Sheet Excel Report

```python
import xlsxwriter

def write_report(path: str, summary: list[dict], detail: list[dict]) -> None:
    wb = xlsxwriter.Workbook(path, {"default_date_format": "yyyy-mm-dd"})
    money = wb.add_format({"num_format": "#,##0.00", "align": "right"})
    header = wb.add_format({"bold": True, "bg_color": "#EEEEEE", "border": 1})

    ws = wb.add_worksheet("Summary")
    for col, name in enumerate(["Month", "Orders", "Revenue"]):
        ws.write(0, col, name, header)
    for row, rec in enumerate(summary, start=1):
        ws.write_datetime(row, 0, rec["month"])
        ws.write_number(row, 1, rec["orders"])
        ws.write_number(row, 2, float(rec["revenue"]), money)

    ws.freeze_panes(1, 0)
    ws.autofilter(0, 0, len(summary), 2)
    ws.set_column(0, 0, 12)
    ws.set_column(2, 2, 14)

    chart = wb.add_chart({"type": "column"})
    chart.add_series({
        "categories": ["Summary", 1, 0, len(summary), 0],
        "values":     ["Summary", 1, 2, len(summary), 2],
        "name":       "Revenue",
    })
    ws.insert_chart("E2", chart)

    wb.close()
```

Use `write_number` and `write_datetime` rather than `write`: the generic method
infers a type, and a numeric string stored as text breaks every downstream sum.

## Recipe: Streaming a Large Workbook

```python
import openpyxl

def iter_rows(path: str, sheet: str):
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    try:
        ws = wb[sheet]
        header = [c.value for c in next(ws.iter_rows(max_row=1))]
        for row in ws.iter_rows(min_row=2, values_only=True):
            if any(v is not None for v in row):        # skip blank filler rows
                yield dict(zip(header, row))
    finally:
        wb.close()                                     # read_only holds file handles
```

The `close()` in a `finally` matters: read-only mode keeps the archive open, and
leaked handles exhaust the process limit during batch runs.

## Recipe: Merging and Splitting PDFs

```python
from pypdf import PdfReader, PdfWriter

def merge(paths: list[str], out: str) -> None:
    writer = PdfWriter()
    for path in paths:
        reader = PdfReader(path)
        if reader.is_encrypted and not reader.decrypt(""):
            raise ValueError(f"{path} is password protected")
        for page in reader.pages:
            writer.add_page(page)
    writer.add_metadata({"/Producer": "invoice-service", "/Title": "Merged"})
    with open(out, "wb") as fh:
        writer.write(fh)


def split_by_bookmark(path: str, out_dir: str) -> list[str]:
    reader = PdfReader(path)
    bounds = [(o.title, reader.get_destination_page_number(o))
              for o in reader.outline if hasattr(o, "title")]
    written = []
    for i, (title, start) in enumerate(bounds):
        end = bounds[i + 1][1] if i + 1 < len(bounds) else len(reader.pages)
        writer = PdfWriter()
        for page in reader.pages[start:end]:
            writer.add_page(page)
        target = f"{out_dir}/{slugify(title)}.pdf"
        with open(target, "wb") as fh:
            writer.write(fh)
        written.append(target)
    return written
```

## Recipe: Format Conversion

When no native library covers the conversion, LibreOffice headless is the
reliable fallback. It is slow and stateful — one instance per conversion, in a
sandbox.

```python
import subprocess, tempfile, pathlib

def convert(src: str, target_format: str = "pdf") -> bytes:
    with tempfile.TemporaryDirectory() as tmp:
        subprocess.run(
            ["libreoffice", "--headless", "--nologo", "--norestore",
             f"-env:UserInstallation=file://{tmp}/profile",   # isolate the profile
             "--convert-to", target_format, "--outdir", tmp, src],
            check=True, timeout=120,
            stdout=subprocess.DEVNULL, stderr=subprocess.PIPE,
        )
        produced = pathlib.Path(tmp) / (pathlib.Path(src).stem + f".{target_format}")
        return produced.read_bytes()
```

The isolated `UserInstallation` profile is what makes concurrent conversions
safe; without it, parallel invocations corrupt each other's state. Run this with
macros disabled and no network.

## Recipe: Metadata Hygiene

```python
from pypdf import PdfReader, PdfWriter

def strip_metadata(src: str, dst: str) -> None:
    reader, writer = PdfReader(src), PdfWriter()
    for page in reader.pages:
        writer.add_page(page)
    writer.add_metadata({})            # drop author, producer, creation dates
    with open(dst, "wb") as fh:
        writer.write(fh)
```

For Office files, also remove tracked changes, comments and document properties
before distribution — `docProps/core.xml` and `docProps/app.xml` inside the ZIP
carry author names, edit time and template paths.

## Batch Processing

```python
from concurrent.futures import ProcessPoolExecutor, as_completed

def process_all(paths: list[str], workers: int = 4) -> tuple[list, list]:
    ok, failed = [], []
    with ProcessPoolExecutor(max_workers=workers) as pool:
        futures = {pool.submit(process_one, p): p for p in paths}
        for future in as_completed(futures):
            path = futures[future]
            try:
                ok.append(future.result(timeout=60))
            except Exception as exc:               # one bad file must not stop the batch
                failed.append((path, repr(exc)))
    return ok, failed
```

Use processes rather than threads — most of these libraries are CPU-bound and
some are not thread-safe. Always report the failures explicitly; a batch that
silently drops six files is worse than one that stops.
