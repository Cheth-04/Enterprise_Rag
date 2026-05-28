import os
import fitz  # PyMuPDF — lightweight, page-by-page PDF extraction
from docling.document_converter import DocumentConverter, PowerpointFormatOption
from docling.datamodel.base_models import InputFormat

# Docling is only used for DOCX and PPTX — not PDF
_docling_converter = DocumentConverter(
    format_options={
        InputFormat.PPTX: PowerpointFormatOption(),
    }
)

_SUPPORTED = {".pdf", ".docx", ".pptx", ".txt", ".md"}

def parse_document_to_markdown(file_path: str) -> str:
    """
    Converts documents to plain text / markdown.
    PDF  → PyMuPDF  (page-by-page, <100 MB RAM regardless of file size)
    DOCX → Docling
    PPTX → Docling
    TXT  → read directly
    MD   → read directly
    """
    ext = os.path.splitext(file_path)[1].lower()
    if ext not in _SUPPORTED:
        raise ValueError(f"Unsupported file type: {ext}")

    if ext in (".txt", ".md"):
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            return f.read()

    if ext == ".pdf":
        return _parse_pdf(file_path)

    # DOCX / PPTX via Docling
    result = _docling_converter.convert(file_path)
    if result is None or result.document is None:
        raise ValueError(f"Docling could not parse {os.path.basename(file_path)}")
    markdown = result.document.export_to_markdown()
    if not markdown or not markdown.strip():
        raise ValueError(
            f"No text extracted from {os.path.basename(file_path)}. "
            "File may be image-only or corrupted."
        )
    return markdown


def _parse_pdf(file_path: str) -> str:
    """
    Extracts text from a PDF using PyMuPDF.
    Processes one page at a time — constant memory regardless of file size.
    Raises ValueError if the PDF yields no text (scanned/image-only).
    """
    doc = fitz.open(file_path)
    pages: list[str] = []
    try:
        for page in doc:
            text = page.get_text("text")   # plain text per page
            if text.strip():
                pages.append(text.strip())
    finally:
        doc.close()
    if not pages:
        raise ValueError(
            "No text could be extracted from this PDF. "
            "It may be a scanned image — try running OCR on it first."
        )
    return "\n\n".join(pages)
