# KIP Knowledge Base Setup

After the core backend is running, install the knowledge base packages:

```bash
# Activate your venv first (in PyCharm terminal):
pip install chromadb sentence-transformers pymupdf beautifulsoup4

# The knowledge base initialises automatically on first server start.
# You'll see: [KIP Knowledge] Seeding knowledge base with initial content...
```

## Adding Documents to KIP's Brain

```bash
# From the backend/ folder, with venv active:

# Add a PDF (e.g. World Bank Zambia report):
python ingest.py "C:/path/to/report.pdf" --category economics --title "World Bank Zambia 2024"

# Add all business plans from a folder:
python ingest.py --folder "C:/path/to/business_plans" --category business

# Add content from a website:
python ingest.py --url https://boz.zm/monetary-policy --category zambia --title "BoZ Monetary Policy"

# Check how many knowledge chunks are loaded:
python ingest.py --stats
```

## Recommended Documents to Add First (Priority 1)

1. Download Zambia 2025 National Budget speech (Ministry of Finance website)
2. Download Bank of Zambia latest Annual Report (boz.zm)
3. Add all 300 business plans from your existing collection
4. Download ZRA SME tax guide (zra.org.zm)
5. Download CEEC programme guide (ceec.org.zm)

Each document added makes KIP smarter immediately.
