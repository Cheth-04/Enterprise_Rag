import os
from docling.document_converter import (
    DocumentConverter,
    PdfFormatOption,
    PowerpointFormatOption,
)
from docling.datamodel.pipeline_options import PdfPipelineOptions
from docling.datamodel.base_models import InputFormat


def _make_converter() -> DocumentConverter:
    pdf_opts = PdfPipelineOptions()
    pdf_opts.do_ocr             = False   # skip OCR — saves ~1 GB RAM
    pdf_opts.do_table_structure = False   # skip table ML model — saves ~500 MB RAM
    # If you need tables, flip do_table_structure back to True

    return DocumentConverter(
        format_options={
            InputFormat.PDF:  PdfFormatOption(pipeline_options=pdf_opts),
            InputFormat.PPTX: PowerpointFormatOption(),
        }
    )


# Single converter instance reused across requests
_converter = _make_converter()

_SUPPORTED = {".pdf", ".docx", ".pptx", ".txt"}


def parse_document_to_markdown(file_path: str) -> str:
    ext = os.path.splitext(file_path)[1].lower()

    if ext not in _SUPPORTED:
        raise ValueError(f"Unsupported file type: {ext}")

    if ext == ".txt":
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            return f.read()

    result = _converter.convert(file_path)

    if result is None or result.document is None:
        raise ValueError(f"Docling could not parse {os.path.basename(file_path)}")

    markdown = result.document.export_to_markdown()

    if not markdown or not markdown.strip():
        raise ValueError(
            f"Docling returned empty content for {os.path.basename(file_path)}. "
            "The file may be image-only or corrupted."
        )

    return markdown
