#!/usr/bin/env python3
"""
KIP Knowledge Ingestion Pipeline
=================================
For Adding any document to KIP's knowledge base with one command.

Usage:
  # Add a PDF:
  python ingest.py document.pdf --category economics --title "World Bank Zambia Report"

  # Add a website URL:
  python ingest.py --url https://boz.zm/reports --category zambia --title "Bank of Zambia Report"

  # Add all PDFs in a folder:
  python ingest.py --folder ./business_plans --category business

  # Check knowledge base stats:
  python ingest.py --stats

After ingestion, KIP immediately has access to the new knowledge.
No restart required.
"""

import sys
import os
import argparse

# Add parent to path so imports work
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("DATABASE_URL", "sqlite:///./kip.db")

from app.services.knowledge_base import get_knowledge_base


def main():
    parser = argparse.ArgumentParser(description="KIP Knowledge Ingestion Pipeline")
    parser.add_argument("path", nargs="?", help="Path to PDF file to ingest")
    parser.add_argument("--url", help="URL to scrape and ingest")
    parser.add_argument("--folder", help="Folder of PDFs to ingest")
    parser.add_argument("--category", default="general",
                        choices=["economics", "finance", "business", "zambia", "news", "general"],
                        help="Knowledge category")
    parser.add_argument("--title", default="", help="Document title")
    parser.add_argument("--stats", action="store_true", help="Show knowledge base statistics")
    parser.add_argument("--text", help="Ingest raw text string directly")

    args = parser.parse_args()

    print("\n╔══════════════════════════════════════════╗")
    print("║   KIP Knowledge Ingestion Pipeline        ║")
    print("╚══════════════════════════════════════════╝\n")

    kb = get_knowledge_base()

    if args.stats:
        stats = kb.stats()
        print(f"Knowledge Base Status: {stats['status']}")
        print(f"Total chunks in database: {stats['chunks']}")
        return

    if args.text:
        chunks = kb.add_document(
            args.text,
            {"source": "manual_input", "category": args.category, "title": args.title or "Manual Input"}
        )
        print(f"✓  Added {chunks} chunks from text input.")
        return

    if args.folder:
        import glob
        pdfs = glob.glob(os.path.join(args.folder, "**/*.pdf"), recursive=True)
        pdfs += glob.glob(os.path.join(args.folder, "*.pdf"))
        pdfs = list(set(pdfs))
        print(f"Found {len(pdfs)} PDF files in {args.folder}")
        total = 0
        for pdf in pdfs:
            chunks = kb.add_pdf(pdf, {
                "category": args.category,
                "title": os.path.splitext(os.path.basename(pdf))[0]
            })
            total += chunks
            print(f"  ✓  {os.path.basename(pdf)} — {chunks} chunks")
        print(f"\nTotal: {total} chunks added from {len(pdfs)} files.")
        return

    if args.url:
        try:
            from bs4 import BeautifulSoup
            import urllib.request
            print(f"Fetching: {args.url}")
            req = urllib.request.Request(args.url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=15) as resp:
                html = resp.read()
            soup = BeautifulSoup(html, "html.parser")
            for tag in soup(["script", "style", "nav", "footer", "header"]):
                tag.decompose()
            text = soup.get_text(separator=" ", strip=True)
            if len(text) < 100:
                print("Warning: Very little text extracted from URL.")
            chunks = kb.add_document(text, {
                "source": args.url,
                "category": args.category,
                "title": args.title or args.url
            })
            print(f"✓  Added {chunks} chunks from {args.url}")
        except ImportError:
            print("beautifulsoup4 not installed. Run: pip install beautifulsoup4")
        except Exception as e:
            print(f"Error fetching URL: {e}")
        return

    if args.path:
        if not os.path.exists(args.path):
            print(f"File not found: {args.path}")
            return
        chunks = kb.add_pdf(args.path, {
            "category": args.category,
            "title": args.title or os.path.splitext(os.path.basename(args.path))[0]
        })
        print(f"✓  Added {chunks} chunks from {args.path}")
        print(f"\nKIP now has access to this knowledge immediately.")
        return

    parser.print_help()


if __name__ == "__main__":
    main()
