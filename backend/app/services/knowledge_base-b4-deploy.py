"""
KIP Knowledge Base — RAG (Retrieval-Augmented Generation) Engine

Manages the ChromaDB vector database and provides semantic search
over KIP's knowledge corpus.

On first run, initialises the database with the built-in knowledge texts.
Documents can be added at any time using the ingestion pipeline.
"""

import os
import hashlib
from typing import List, Dict, Optional

# We import with graceful fallback so the app runs even if packages
# aren't installed yet (user will see a warning)
try:
    import chromadb
    from chromadb.config import Settings
    CHROMADB_AVAILABLE = True
except ImportError:
    CHROMADB_AVAILABLE = False

try:
    from sentence_transformers import SentenceTransformer
    ST_AVAILABLE = True
except ImportError:
    ST_AVAILABLE = False

from app.data.initial_knowledge import INITIAL_KNOWLEDGE_TEXTS

DB_PATH = os.path.join(os.path.dirname(__file__), "../../kip_knowledge_db")
COLLECTION_NAME = "kip_knowledge"
EMBEDDING_MODEL = "all-MiniLM-L6-v2"
CHUNK_SIZE = 500      # words per chunk
CHUNK_OVERLAP = 50    # word overlap between chunks
TOP_K = 4             # number of chunks to retrieve per query


class KnowledgeBase:
    """
    KIP's RAG knowledge system.
    Stores document embeddings in ChromaDB and provides semantic search.
    """

    def __init__(self):
        self._client = None
        self._collection = None
        self._embedder = None
        self._ready = False
        self._init()

    def _init(self):
        if not CHROMADB_AVAILABLE:
            print("[KIP Knowledge] ChromaDB not installed. Install with: pip install chromadb")
            return
        if not ST_AVAILABLE:
            print("[KIP Knowledge] sentence-transformers not installed. Install with: pip install sentence-transformers")
            return

        try:
            os.makedirs(DB_PATH, exist_ok=True)
            self._client = chromadb.PersistentClient(path=DB_PATH)
            self._collection = self._client.get_or_create_collection(
                name=COLLECTION_NAME,
                metadata={"hnsw:space": "cosine"}
            )
            self._embedder = SentenceTransformer(EMBEDDING_MODEL)
            self._ready = True

            # Seed with initial knowledge if empty
            if self._collection.count() == 0:
                print("[KIP Knowledge] Seeding knowledge base with initial content...")
                self._seed_initial_knowledge()
                print(f"[KIP Knowledge] Seeded {self._collection.count()} knowledge chunks.")
            else:
                print(f"[KIP Knowledge] Loaded. {self._collection.count()} chunks in database.")

        except Exception as e:
            print(f"[KIP Knowledge] Init error: {e}")
            self._ready = False

    def _seed_initial_knowledge(self):
        """Load the built-in knowledge texts into ChromaDB."""
        for doc in INITIAL_KNOWLEDGE_TEXTS:
            self.add_document(
                text=doc["content"],
                metadata={
                    "source": doc["id"],
                    "category": doc["category"],
                    "subcategory": doc.get("subcategory", ""),
                    "title": doc["title"],
                    "zambia_relevance": doc.get("zambia_relevance", "medium"),
                }
            )

    def _chunk_text(self, text: str) -> List[str]:
        """Split text into overlapping chunks."""
        words = text.split()
        chunks = []
        for i in range(0, len(words), CHUNK_SIZE - CHUNK_OVERLAP):
            chunk = " ".join(words[i:i + CHUNK_SIZE])
            if chunk.strip():
                chunks.append(chunk)
        return chunks

    def add_document(self, text: str, metadata: Dict = None) -> int:
        """
        Add a document to the knowledge base.
        The document is split into chunks and each chunk is embedded.
        Returns the number of chunks added.
        """
        if not self._ready:
            return 0

        chunks = self._chunk_text(text.strip())
        if not chunks:
            return 0

        doc_id = metadata.get("source", hashlib.md5(text.encode()).hexdigest()[:12])

        ids, embeddings, documents, metadatas = [], [], [], []
        for i, chunk in enumerate(chunks):
            chunk_id = f"{doc_id}_chunk_{i}"
            # Skip if already exists
            try:
                existing = self._collection.get(ids=[chunk_id])
                if existing["ids"]:
                    continue
            except:
                pass

            embedding = self._embedder.encode(chunk).tolist()
            ids.append(chunk_id)
            embeddings.append(embedding)
            documents.append(chunk)
            metadatas.append({**(metadata or {}), "chunk_index": i, "doc_id": doc_id})

        if ids:
            self._collection.add(ids=ids, embeddings=embeddings, documents=documents, metadatas=metadatas)

        return len(ids)

    def search(self, query: str, top_k: int = TOP_K,
               category_filter: Optional[str] = None) -> str:
        """
        Search the knowledge base for content relevant to the query.
        Returns formatted text ready for injection into the system prompt.
        """
        if not self._ready:
            return ""

        try:
            query_embedding = self._embedder.encode(query).tolist()

            where = {"category": category_filter} if category_filter else None
            results = self._collection.query(
                query_embeddings=[query_embedding],
                n_results=min(top_k, self._collection.count()),
                where=where,
                include=["documents", "metadatas", "distances"]
            )

            if not results["documents"] or not results["documents"][0]:
                return ""

            retrieved = []
            for doc, meta, dist in zip(
                results["documents"][0],
                results["metadatas"][0],
                results["distances"][0]
            ):
                relevance = 1 - dist  # cosine similarity
                if relevance < 0.2:   # skip low-relevance chunks
                    continue
                title = meta.get("title", meta.get("source", "Knowledge"))
                retrieved.append(f"[{title}]\n{doc.strip()}")

            if not retrieved:
                return ""

            return "\n\n---\n\n".join(retrieved)

        except Exception as e:
            print(f"[KIP Knowledge] Search error: {e}")
            return ""

    def add_pdf(self, pdf_path: str, metadata: Dict = None) -> int:
        """Add a PDF document to the knowledge base."""
        try:
            import fitz  # PyMuPDF
            doc = fitz.open(pdf_path)
            text = ""
            for page in doc:
                text += page.get_text()
            doc.close()
            meta = metadata or {}
            meta["source"] = os.path.basename(pdf_path)
            return self.add_document(text, meta)
        except ImportError:
            print("[KIP Knowledge] PyMuPDF not installed. Run: pip install pymupdf")
            return 0
        except Exception as e:
            print(f"[KIP Knowledge] PDF error: {e}")
            return 0

    def stats(self) -> Dict:
        """Return knowledge base statistics."""
        if not self._ready:
            return {"status": "not_ready", "chunks": 0}
        return {"status": "ready", "chunks": self._collection.count()}


# Singleton instance
_knowledge_base = None

def get_knowledge_base() -> KnowledgeBase:
    global _knowledge_base
    if _knowledge_base is None:
        _knowledge_base = KnowledgeBase()
    return _knowledge_base
