from docling.document_converter import DocumentConverter


def parse_document_to_markdown(file_path: str) -> str:

    converter = DocumentConverter()

    result = converter.convert(file_path)

    document = result.document

    markdown_text = document.export_to_markdown()

    return markdown_text
