---
name: document-processing-expert
version: 1.0.0
description: >-
  Read, generate and modify office documents and PDFs from code: PDF extraction and forms,
  Word documents, Excel workbooks and PowerPoint decks. Use when the user mentions PDF,
  DOCX, XLSX, PPTX, Word, Excel, PowerPoint or spreadsheets, wants data extracted from
  documents, needs a report or invoice generated as a file, must fill a form, or when the
  task involves parsing scanned documents, merging or splitting files, or producing a
  document a person will open.
category: tools
tags:
  [
    pdf,
    docx,
    xlsx,
    pptx,
    documents,
    extraction,
    reporting,
    ocr,
    spreadsheets,
    office,
  ]
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash(python:*, python3:*, pip:*, pdftotext:*, qpdf:*, libreoffice:*)
  - Grep
  - Glob
metadata:
  author: PCL Standard Library
  complexity: intermediate
---

# Document Processing Expert

Working with the formats people actually exchange. The recurring mistake is
treating a document as text: these are structured containers, and the structure
is where the meaning lives.

## Core Concepts

### Read the Format, Not the Bytes

`.docx`, `.xlsx` and `.pptx` are ZIP archives of XML parts. PDF is a page
description language, not a document model. Using a library that understands the
format is not a convenience — string manipulation on these files produces output
that opens corrupted.

### Extraction Is Lossy; Decide What Matters

Every extraction discards something: layout, styling, reading order, or the
relationship between a heading and its table. Decide up front whether you need
text, structure, or fidelity, and choose the tool accordingly.

### Generation Is About Templates

Building a document element by element in code produces unmaintainable output
that a designer cannot touch. Fill a template that a human authored, in the tool
they authored it in.

### Untrusted Documents Are Untrusted Input

Documents carry macros, external entities, embedded files and remote references.
A parsing library is an attack surface. Treat every uploaded document as hostile.

## PDF

### Extracting text

```python
import pdfplumber

def extract_pages(path: str) -> list[str]:
    with pdfplumber.open(path) as pdf:
        return [page.extract_text() or "" for page in pdf.pages]
```

`pdfplumber` preserves layout well and extracts tables; `pypdf` is faster for
plain text and page manipulation. If `extract_text()` returns empty on a page
that clearly has content, the page is an image — you need OCR, not a different
parser.

### Extracting tables

```python
with pdfplumber.open(path) as pdf:
    for page in pdf.pages:
        for table in page.extract_tables():
            header, *rows = table
            records = [dict(zip(header, row)) for row in rows]
```

Table extraction is unreliable on borderless or multi-page tables. Validate the
result — column count, expected types, totals that reconcile — rather than
trusting it.

### Manipulating pages

```python
from pypdf import PdfReader, PdfWriter

def extract_range(src: str, dst: str, start: int, end: int) -> None:
    reader, writer = PdfReader(src), PdfWriter()
    for page in reader.pages[start:end]:
        writer.add_page(page)
    with open(dst, "wb") as fh:
        writer.write(fh)
```

Note that removing a page does **not** remove content another page references,
and redacting by drawing a black rectangle leaves the text underneath fully
extractable. Real redaction removes the content stream — use a tool that does.

### Forms

```python
reader = PdfReader("form.pdf")
fields = reader.get_fields()                     # discover names first

writer = PdfWriter(clone_from="form.pdf")
writer.update_page_form_field_values(
    writer.pages[0], {"applicant_name": "A. Dupont", "amount": "1234.50"}
)
```

Flatten the form after filling if the values must not be editable; otherwise the
recipient can change them and the file still looks official.

## Excel

### Reading

```python
import openpyxl

wb = openpyxl.load_workbook("report.xlsx", data_only=True, read_only=True)
sheet = wb["Sales"]
rows = [dict(zip([c.value for c in sheet[1]], [c.value for c in row]))
        for row in sheet.iter_rows(min_row=2)]
```

`data_only=True` returns the last cached formula result; without it you get the
formula string. If the file was never opened in Excel, that cache is empty —
`None` for every computed cell. This is the most common surprise in spreadsheet
processing.

`read_only=True` streams rather than loading the workbook into memory; use it for
anything above a few thousand rows.

### Writing

For data, `pandas` is the shortest path. For anything a person will read —
formatting, formulas, multiple sheets — use `openpyxl` or `xlsxwriter` directly.

```python
from openpyxl.styles import Font
from openpyxl.utils import get_column_letter

ws.append(["Product", "Units", "Revenue"])
for cell in ws[1]:
    cell.font = Font(bold=True)

for row in data:
    ws.append([row.product, row.units, row.revenue])

ws.freeze_panes = "A2"
for i, width in enumerate([32, 10, 14], start=1):
    ws.column_dimensions[get_column_letter(i)].width = width
```

Write numbers as numbers and dates as dates, then apply a number format. A
right-aligned string that looks like a total cannot be summed, and every
recipient will try.

## Word

```python
from docx import Document

doc = Document("template.docx")

for paragraph in doc.paragraphs:
    for key, value in context.items():
        if f"{{{{{key}}}}}" in paragraph.text:
            replace_preserving_runs(paragraph, f"{{{{{key}}}}}", value)
```

Naive `paragraph.text = ...` destroys all formatting in the paragraph, because
text is split across _runs_ that carry the styling. Word also splits a
placeholder across runs unpredictably, which is why `{{name}}` often fails to
match. For anything beyond trivial substitution use `docxtpl`, which handles runs
and supports loops and conditionals in the template.

```python
from docxtpl import DocxTemplate

tpl = DocxTemplate("invoice_template.docx")
tpl.render({"customer": customer, "lines": lines, "total": total})
tpl.save("invoice.docx")
```

## PowerPoint

```python
from pptx import Presentation
from pptx.util import Inches, Pt

prs = Presentation("brand_template.pptx")     # keeps master, theme, fonts
slide = prs.slides.add_slide(prs.slide_layouts[1])
slide.shapes.title.text = "Q3 Results"
slide.placeholders[1].text = "Revenue up 12% year on year"
```

Always start from the organisation's template so the master and theme are
inherited. Populate placeholders from the layout rather than adding free-floating
text boxes, or the deck will not survive a theme change.

## Scanned Documents and OCR

```python
import pytesseract
from pdf2image import convert_from_path

def ocr_pdf(path: str, dpi: int = 300, lang: str = "eng") -> list[str]:
    return [pytesseract.image_to_string(img, lang=lang)
            for img in convert_from_path(path, dpi=dpi)]
```

Quality is decided before OCR runs: 300 DPI minimum, deskew, increase contrast,
binarise. Set the language explicitly — the default assumes English and mangles
accented text. Treat OCR output as low-confidence and validate anything numeric.

## Security

- **Never open an untrusted document with macros enabled**, and never convert one
  with an office suite that executes them.
- **Disable external entity resolution** when parsing the XML inside these
  containers — XXE applies to `.docx` and `.xlsx` as much as to any XML.
- **Enforce size and page limits.** A crafted "zip bomb" or a PDF with recursive
  references exhausts memory during parse.
- **Parse in a sandbox** with no network, a memory limit and a timeout.
- **Strip metadata before distribution.** Author, revision history, tracked
  changes and comments routinely leak information the sender did not intend.
- **Redact by removing content**, not by drawing over it.

```python
def safe_load(path: str, max_bytes: int = 50_000_000, max_pages: int = 2000):
    if os.path.getsize(path) > max_bytes:
        raise ValueError("document exceeds size limit")
    reader = PdfReader(path)
    if len(reader.pages) > max_pages:
        raise ValueError("document exceeds page limit")
    return reader
```

## Best Practices

- **Validate after extraction, always.** Check field presence, types, and domain
  invariants such as line items summing to the stated total.
- **Keep provenance** — file, page, cell — so any extracted value can be traced
  back and shown to a reviewer.
- **Stream large files.** Loading a 200 MB workbook into memory to read column A
  is avoidable.
- **Generate from templates** authored by whoever owns the layout.
- **Test with real documents**, including the ugly ones: multi-page tables,
  merged cells, right-to-left text, and files produced by older software.
- **Prefer a native library to a headless office suite.** LibreOffice conversion
  is a heavyweight fallback, not a default.

## Anti-Patterns

- **Regex over PDF bytes** — works on one file and fails on the next.
- **Assuming extracted text is in reading order** — multi-column layouts are not.
- **Writing numbers as strings** into spreadsheets.
- **Rebuilding a branded document in code** instead of filling a template.
- **Trusting `data_only=True`** without checking the cache is populated.
- **Black rectangles as redaction** — the text is still there.
- **Ignoring encoding** — mojibake in a generated invoice reaches the customer.

## Reference Documentation

- [Library Selection and Recipes](references/LIBRARIES.md) — comparison of the
  Python and JavaScript libraries per format, with complete recipes for
  reporting, merging, conversion and batch processing

## Resources

- [pypdf](https://pypdf.readthedocs.io/) and [pdfplumber](https://github.com/jsvine/pdfplumber)
- [openpyxl](https://openpyxl.readthedocs.io/) and [XlsxWriter](https://xlsxwriter.readthedocs.io/)
- [python-docx](https://python-docx.readthedocs.io/) and [docxtpl](https://docxtpl.readthedocs.io/)
- [python-pptx](https://python-pptx.readthedocs.io/)
- [Tesseract OCR](https://tesseract-ocr.github.io/)
