from app.config import settings


def chunk_text(text: str) -> list[str]:
    """
    Splits text into overlapping chunks, preserving paragraph
    boundaries where possible.

    Strategy:
      1. Split on double-newlines (paragraphs / slide breaks).
      2. Accumulate paragraphs until chunk_size is reached.
      3. Apply overlap by carrying the last paragraph(s) forward.
    """
    chunk_size = settings.chunk_size
    overlap    = settings.chunk_overlap

    # Normalise line endings, collapse 3+ blank lines to 2
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    while "\n\n\n" in text:
        text = text.replace("\n\n\n", "\n\n")

    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]

    if not paragraphs:
        return []

    chunks: list[str] = []
    current_parts: list[str] = []
    current_len = 0

    for para in paragraphs:
        para_len = len(para)

        # If a single paragraph exceeds chunk_size, hard-split it
        if para_len > chunk_size:
            # Flush current buffer first
            if current_parts:
                chunks.append("\n\n".join(current_parts))
                current_parts = []
                current_len = 0

            for i in range(0, para_len, chunk_size - overlap):
                sub = para[i : i + chunk_size].strip()
                if sub:
                    chunks.append(sub)
            continue

        # Would adding this paragraph exceed chunk_size?
        if current_len + para_len + 2 > chunk_size and current_parts:
            chunks.append("\n\n".join(current_parts))

            # Overlap: keep last paragraph(s) that fit within overlap budget
            overlap_parts: list[str] = []
            overlap_len = 0
            for p in reversed(current_parts):
                if overlap_len + len(p) <= overlap:
                    overlap_parts.insert(0, p)
                    overlap_len += len(p)
                else:
                    break

            current_parts = overlap_parts
            current_len   = overlap_len

        current_parts.append(para)
        current_len += para_len + 2  # +2 for "\n\n"

    # Flush remainder
    if current_parts:
        chunks.append("\n\n".join(current_parts))

    return chunks
