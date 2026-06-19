from __future__ import annotations

from .document_processor.builder import build_segments_for_document
from .document_processor.overlap import resolve_overlaps

__all__ = ["build_segments_for_document", "resolve_overlaps"]
