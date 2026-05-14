"""
KIP Knowledge Base — ChromaDB RAG layer
Reads CHROMA_PATH from environment (set by startup.py on Railway,
or defaults to local kip_knowledge_db/ for development).
"""
import os
import chromadb
from chromadb.utils import embedding_functions

# ── Path resolution ───────────────────────────────────────────────────────────
# On Railway: startup.py sets CHROMA_PATH=/data/chroma_db
# Locally:    defaults to ./kip_knowledge_db
_DEFAULT = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "kip_knowledge_db")
CHROMA_PATH = os.getenv("CHROMA_PATH", _DEFAULT)

_client     = None
_collection = None


def get_knowledge_base():
    global _client, _collection
    if _collection is not None:
        return _KnowledgeBase(_collection)

    try:
        ef = embedding_functions.SentenceTransformerEmbeddingFunction(
            model_name="sentence-transformers/all-MiniLM-L6-v2"
        )
        _client = chromadb.PersistentClient(path=CHROMA_PATH)
        _collection = _client.get_or_create_collection(
            name="kip_knowledge",
            embedding_function=ef,
        )
        print(f"[KIP Knowledge] Loaded. {_collection.count()} chunks in database.")
        print(f"[KIP Knowledge] Path: {CHROMA_PATH}")
    except Exception as e:
        print(f"[KIP Knowledge] Failed to load: {e}. Returning empty KB.")
        _collection = None

    return _KnowledgeBase(_collection)


class _KnowledgeBase:
    def __init__(self, collection):
        self._col = collection

    def search(self, query: str, top_k: int = 4) -> str:
        if not self._col or not query.strip():
            return ""
        try:
            results = self._col.query(
                query_texts=[query],
                n_results=min(top_k, self._col.count() or 1),
            )
            docs = results.get("documents", [[]])[0]
            return "\n\n---\n\n".join(docs) if docs else ""
        except Exception as e:
            print(f"[KIP Knowledge] Search error: {e}")
            return ""
