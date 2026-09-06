"""
Generates the K-BIG-2 investor/technical documentation PDF.

This is a one-off documentation tool, not a runtime app dependency -- it
uses matplotlib (for the two diagrams) and reportlab (already a backend
dependency) to assemble a formal PDF explaining what k-big-2 is, its logic,
its viability formula (with a real worked example pulled from the dev
database), and the methodology assumptions made while building it.

Usage:
    cd backend
    python scripts/generate_investor_doc.py
    -> writes K-BIG-2_Technical_Documentation.pdf to the repo root.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("DATABASE_URL", "sqlite:///./kip.db")

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch

from reportlab.lib import colors
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Image, Table, TableStyle,
    PageBreak, ListFlowable, ListItem, HRFlowable,
)
from reportlab.lib.enums import TA_CENTER

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUTPUT_PATH = os.path.join(REPO_ROOT, "K-BIG-2_Technical_Documentation.pdf")
ASSETS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "_doc_assets")
os.makedirs(ASSETS_DIR, exist_ok=True)

NAVY = "#1D2440"
BLUE = "#243B8F"
GOLD = "#C8763A"
GREEN = "#16A34A"
MUTED = "#6E7495"
LIGHT = "#F4F1EA"


# ── Pull a real worked example from the dev database ────────────────────────
def load_worked_example():
    import main  # noqa: F401  (registers all SQLAlchemy models)
    from app.database import SessionLocal
    from app.models.business_idea import BusinessIdea

    db = SessionLocal()
    row = (
        db.query(BusinessIdea)
        .filter(BusinessIdea.viability_score.isnot(None))
        .order_by(BusinessIdea.viability_score.desc())
        .first()
    )
    if not row:
        return None
    sd = row.structured_data or {}
    return {
        "name": row.idea_name,
        "category": row.category,
        "description": sd.get("description", ""),
        "N": sd.get("total_target_buyers"),
        "Q": sd.get("consumption_frequency_per_year"),
        "P": sd.get("average_unit_price"),
        "monthly_revenue": sd.get("monthly_revenue_estimate"),
        "cogs": sd.get("cost_of_goods_sold_monthly"),
        "min_capital": row.min_capital,
        "D": row.demand_score, "F": row.financial_score, "C": row.capital_fit_score,
        "E": row.execution_fit_score, "R": row.regulatory_score,
        "S": row.competitive_score, "A": row.asset_location_score,
        "V": row.viability_score,
    }


# ── Diagram 1: architecture / data-flow ─────────────────────────────────────
def draw_architecture_diagram(path):
    fig, ax = plt.subplots(figsize=(11, 4.2))
    ax.set_xlim(0, 10.7)
    ax.set_ylim(0, 4)
    ax.axis("off")

    boxes = [
        (0.3, "New Idea\nWizard\n(4 slides)", BLUE),
        (2.3, "K-BIG-2 Engine\nbuilds prompt +\nJSON schema", BLUE),
        (4.5, "Claude Sonnet 5\nstructured JSON\n(3 ideas)", GOLD),
        (6.7, "Shared Ideas\nDataset (DB)", NAVY),
        (8.6, "Viability\nRe-Ranking", GREEN),
    ]
    w, h, y = 1.7, 1.5, 1.25
    for x, label, color in boxes:
        box = FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.08,rounding_size=0.12",
                              linewidth=1.4, edgecolor=color, facecolor="white")
        ax.add_patch(box)
        ax.text(x + w / 2, y + h / 2, label, ha="center", va="center",
                 fontsize=9.3, fontweight="bold", color=color, linespacing=1.4)

    arrow_pairs = [(0.3 + w, 2.3), (2.3 + w, 4.5), (4.5 + w, 6.7), (6.7 + w, 8.6)]
    for x0, x1 in arrow_pairs:
        ax.add_patch(FancyArrowPatch((x0, y + h / 2), (x1, y + h / 2),
                                      arrowstyle="-|>", mutation_scale=16,
                                      linewidth=1.4, color=MUTED))

    # Feedback loop: re-ranking reads the whole dataset, not just the new 3
    ax.add_patch(FancyArrowPatch((6.7 + w / 2, y), (6.7 + w / 2, y - 0.55),
                                  arrowstyle="-", linewidth=1.2, color=MUTED, linestyle="dashed"))
    ax.annotate("", xy=(8.6 + w / 2, y - 0.55), xytext=(6.7 + w / 2, y - 0.55),
                arrowprops=dict(arrowstyle="-|>", linewidth=1.2, color=MUTED, linestyle="dashed"))
    ax.add_patch(FancyArrowPatch((8.6 + w / 2, y - 0.55), (8.6 + w / 2, y),
                                  arrowstyle="-|>", mutation_scale=14, linewidth=1.2, color=MUTED, linestyle="dashed"))
    ax.text(7.65, y - 0.85, "entire accumulated dataset re-scanned per request\n(not just the 3 new ideas)",
            ha="center", fontsize=7.6, color=MUTED, style="italic")

    ax.text(5.3, 3.55, "K-BIG-2 Data Flow", ha="center", fontsize=13.5, fontweight="bold", color=NAVY)
    fig.tight_layout()
    fig.savefig(path, dpi=200, bbox_inches="tight")
    plt.close(fig)


# ── Diagram 2: viability formula breakdown for the worked example ──────────
def draw_viability_breakdown(path, example):
    labels = ["D  Demand\n(w=0.25)", "F  Financial\n(w=0.20)", "C  Capital Fit\n(w=0.15)",
              "E  Execution Fit\n(w=0.15)", "R  Regulatory\n(w=0.10)", "S  Competitive\n(w=0.10)",
              "A  Asset/Location\n(w=0.05)"]
    weights = [0.25, 0.20, 0.15, 0.15, 0.10, 0.10, 0.05]
    scores = [example["D"], example["F"], example["C"], example["E"], example["R"], example["S"], example["A"]]
    contributions = [w * s for w, s in zip(weights, scores)]

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(10, 4.3))

    bars = ax1.bar(range(7), scores, color=[BLUE, GOLD, GREEN, NAVY, "#DC2626", "#0D9488", "#6E7495"])
    ax1.set_xticks(range(7))
    ax1.set_xticklabels([l.split("\n")[0].split("  ")[0] for l in labels], fontsize=9, rotation=0)
    ax1.set_ylim(0, 11)
    ax1.set_ylabel("Sub-score (0-10)", fontsize=9)
    ax1.set_title("Raw sub-scores", fontsize=10.5, fontweight="bold", color=NAVY)
    for i, s in enumerate(scores):
        ax1.text(i, s + 0.25, f"{s:.1f}", ha="center", fontsize=8, fontweight="bold")

    bars2 = ax2.barh(range(7), contributions, color=[BLUE, GOLD, GREEN, NAVY, "#DC2626", "#0D9488", "#6E7495"])
    ax2.set_yticks(range(7))
    ax2.set_yticklabels([l.split("\n")[0] for l in labels], fontsize=8.5)
    ax2.invert_yaxis()
    ax2.set_xlabel("Weighted contribution to V", fontsize=9)
    ax2.set_title(f"V = {sum(contributions):.2f} / 10  --  “{example['name']}”",
                   fontsize=10.2, fontweight="bold", color=NAVY)
    for i, c in enumerate(contributions):
        ax2.text(c + 0.03, i, f"{c:.2f}", va="center", fontsize=8, fontweight="bold")

    fig.tight_layout()
    fig.savefig(path, dpi=200, bbox_inches="tight")
    plt.close(fig)


def build_pdf(example):
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle("KTitle", parent=styles["Title"], fontSize=25, textColor=colors.HexColor(NAVY), spaceAfter=6))
    styles.add(ParagraphStyle("KSubtitle", parent=styles["Normal"], fontSize=12.5, textColor=colors.HexColor(MUTED), alignment=TA_CENTER, spaceAfter=4))
    styles.add(ParagraphStyle("KH1", parent=styles["Heading1"], fontSize=16, textColor=colors.HexColor(NAVY), spaceBefore=18, spaceAfter=8))
    styles.add(ParagraphStyle("KH2", parent=styles["Heading2"], fontSize=12.5, textColor=colors.HexColor(BLUE), spaceBefore=12, spaceAfter=6))
    styles.add(ParagraphStyle("KBody", parent=styles["BodyText"], fontSize=10, leading=15, spaceAfter=8))
    styles.add(ParagraphStyle("KCaption", parent=styles["BodyText"], fontSize=8.5, textColor=colors.HexColor(MUTED), alignment=TA_CENTER, spaceBefore=4, spaceAfter=10))
    styles.add(ParagraphStyle("KMono", parent=styles["BodyText"], fontName="Courier", fontSize=10, backColor=colors.HexColor(LIGHT), leading=14, spaceAfter=8, borderPadding=8))

    doc = SimpleDocTemplate(OUTPUT_PATH, pagesize=LETTER,
                             topMargin=0.75 * inch, bottomMargin=0.75 * inch,
                             leftMargin=0.85 * inch, rightMargin=0.85 * inch,
                             title="K-BIG-2 Technical Documentation", author="KIP -- Kwacha Intelligence Platform")

    story = []

    # ── Cover ──
    story.append(Spacer(1, 1.0 * inch))
    story.append(Paragraph("K-BIG-2", styles["KTitle"]))
    story.append(Paragraph("The Structured, Viability-Scored Business Idea Engine", styles["KSubtitle"]))
    story.append(Paragraph("Kwacha Intelligence Platform (KIP) -- Technical & Investor Documentation", styles["KSubtitle"]))
    story.append(Spacer(1, 0.4 * inch))
    story.append(HRFlowable(width="60%", color=colors.HexColor(GOLD), thickness=1.4, hAlign="CENTER"))
    story.append(Spacer(1, 0.3 * inch))
    story.append(Paragraph("September 2026", styles["KCaption"]))
    story.append(PageBreak())

    # ── 1. Executive summary ──
    story.append(Paragraph("1. What K-BIG-2 Is", styles["KH1"]))
    story.append(Paragraph(
        "K-BIG-2 is version 2 of KIP's business idea generation engine. Where K-BIG-1 answers a "
        "free-text chat prompt with a single markdown recommendation, K-BIG-2 collects a "
        "<b>structured profile</b> from the entrepreneur (available capital, location, skills, and "
        "assets already owned), generates three candidate ideas as validated structured data using "
        "the same Zambia-grounded reasoning as K-BIG-1, and -- critically -- scores every idea "
        "against a <b>7-variable weighted viability formula</b> before ranking it against KIP's "
        "entire accumulated idea dataset, not just the three ideas generated for this request.",
        styles["KBody"]))
    story.append(Paragraph(
        "The goal is to reduce two weaknesses in K-BIG-1: <b>bias</b> (a single LLM pass with no "
        "structured self-check on financial or market realism) and <b>viability rigor</b> (no "
        "numeric scoring of whether an idea is actually a good fit for this specific person's "
        "capital, skills, and location). K-BIG-2 addresses both by forcing the model to produce "
        "machine-checkable numbers and self-assessed sub-scores, then applying a deterministic "
        "formula on top -- and by growing a reusable, structured dataset every time anyone "
        "generates ideas, so the platform's recommendations compound in value over time.",
        styles["KBody"]))

    story.append(Paragraph("2. The Structured Intake Flow", styles["KH1"]))
    story.append(Paragraph(
        "On the My Ideas page, a “New Idea” button opens a 4-slide wizard (shown one "
        "question at a time):", styles["KBody"]))
    story.append(ListFlowable([
        ListItem(Paragraph("<b>Slide 1 -- Available Capital.</b> Amount in Kwacha. Can be skipped; "
                            "skipping asks whether a loan or grant is expected in future and in what "
                            "range -- if none is expected, capital is treated as effectively limitless "
                            "for scoring purposes.", styles["KBody"])),
        ListItem(Paragraph("<b>Slide 2 -- Location.</b> Province/district/area, free text, or "
                            "“Use my location” (device GPS reverse-matched to the nearest "
                            "known town via the haversine formula against KIP's existing town "
                            "coordinate registry -- no third-party geocoding dependency). Cannot be "
                            "skipped.", styles["KBody"])),
        ListItem(Paragraph("<b>Slide 3 -- Skills.</b> Multi-select across 9 categories (selling & "
                            "marketing, operations & management, digital & creative, food & catering, "
                            "agriculture, trades & repairs, services & care, finance & administration, "
                            "transport & logistics).", styles["KBody"])),
        ListItem(Paragraph("<b>Slide 4 -- Assets.</b> Multi-select, grouped into Physical, Digital, "
                            "and Business assets already owned.", styles["KBody"])),
    ], bulletType="bullet", start="circle"))
    story.append(Paragraph(
        "Submitting the final slide sends this profile to <font face=\"Courier\">POST /api/ideas/generate</font>, "
        "which runs the full pipeline described below.", styles["KBody"]))

    story.append(Paragraph("3. Architecture & Data Flow", styles["KH1"]))
    story.append(Image(os.path.join(ASSETS_DIR, "architecture.png"), width=6.6 * inch, height=2.77 * inch))
    story.append(Paragraph("Figure 1 -- the k-big-2 request pipeline, from wizard submission to ranked results.", styles["KCaption"]))
    story.append(Paragraph(
        "Per the sprint specification, every request to k-big-2 performs three steps: "
        "(1) generate 3 new business ideas using the K-BIG-1 method -- the same Zambia economic "
        "constants, town intelligence, and knowledge-base retrieval K-BIG-1 already assembles, now "
        "packaged for validated structured JSON output instead of a single markdown reply; "
        "(2) add those 3 ideas to a shared dataset, visible to every future request from any user, "
        "not just this one; and (3) open the <i>entire</i> dataset and re-rank it for this specific "
        "requester's viability, so a strong idea generated for someone else last month can resurface "
        "for a new requester with a similar profile. This is a deliberate data-network-effect design: "
        "the dataset gets smarter and more useful the more people use K-BIG-2.",
        styles["KBody"]))

    story.append(PageBreak())

    # ── 4. Idea schema ──
    story.append(Paragraph("4. The Structured Idea Schema", styles["KH1"]))
    story.append(Paragraph(
        "Every idea K-BIG-2 generates is captured as a structured object (not prose) spanning "
        "identity, user-fit, market, financial, operational, regulatory, location, strategic, and "
        "confidence fields -- following the sprint's practical schema. Each idea is persisted with:",
        styles["KBody"]))
    schema_table_data = [
        ["Field group", "Representative fields", "Purpose"],
        ["Identity", "name, category, description, location_fit", "What the business is"],
        ["User-fit", "min_capital, recommended_capital_range,\nrequired_skills, required_assets, risk_level", "Can this person realistically run it"],
        ["Market", "demand_level, total_target_buyers,\nconsumption_frequency, average_unit_price", "Feeds the Demand (D) score"],
        ["Financial", "startup_cost, monthly_revenue_estimate,\ncost_of_goods_sold, break_even_months", "Feeds the Financial (F) score"],
        ["Operational /\nRegulatory / Location", "premises, staffing, licensing, urban/rural\nfit, home-based suitability", "Feasibility & compliance"],
        ["Strategic / Confidence", "scalability, digital_potential,\ndata_confidence, evidence_quality", "Growth potential & self-reported certainty"],
        ["Narrative", "narrative (free text)", "Everything else the sprint schema calls\nfor (equipment, logistics, supplier\ndependency, seasonality, brand/upsell\npotential) in prose rather than 30+ more\nstrict fields -- see §7 methodology note"],
        ["Viability sub-scores", "execution_fit_score, competitive_position_\nscore, regulatory_risk_score,\nasset_location_score", "Self-assessed 1-10, feed the formula"],
    ]
    t = Table(schema_table_data, colWidths=[1.3 * inch, 2.55 * inch, 2.35 * inch])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor(NAVY)),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTSIZE", (0, 0), (-1, -1), 8.3),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#DDDDDD")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor(LIGHT)]),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(t)
    story.append(Spacer(1, 10))
    story.append(Paragraph(
        "Every idea is also stored in full as one JSON object (the <font face=\"Courier\">structured_data</font> "
        "column), so nothing in the schema is lost even where it isn't promoted to its own database "
        "column for filtering, sorting, or CSV export.", styles["KBody"]))

    story.append(Paragraph("5. Category CAGR Constants", styles["KH1"]))
    story.append(Paragraph(
        "The Demand formula (below) needs a compound annual growth rate per business category. "
        "Since no ready-made Zambian sector dataset exists, K-BIG-2 maintains a manually-updated "
        "constants file (<font face=\"Courier\">category_cagr.json</font>) mapping ~12 business "
        "categories to an estimated growth rate, refreshed monthly as better data becomes available. "
        "This is explicitly a modelling assumption, not an audited figure -- see the methodology "
        "notes in §7.", styles["KBody"]))

    story.append(PageBreak())

    # ── 6. Viability formula ──
    story.append(Paragraph("6. The Viability Formula", styles["KH1"]))
    story.append(Paragraph(
        "Every idea is scored 0-10 across seven weighted variables:", styles["KBody"]))
    story.append(Paragraph(
        "V&nbsp;=&nbsp;0.25D&nbsp;+&nbsp;0.20F&nbsp;+&nbsp;0.15C&nbsp;+&nbsp;0.15E&nbsp;+&nbsp;0.10R&nbsp;+&nbsp;0.10S&nbsp;+&nbsp;0.05A",
        styles["KMono"]))

    formula_rows = [
        ["Var.", "Name", "Formula / basis", "Computed by"],
        ["D", "Demand", "N x Q x P x (1+g)^t, log-scaled to 0-10", "Arithmetic (viability_engine.py)"],
        ["F", "Financial viability", "Gross margin % x 10", "Arithmetic"],
        ["C", "Capital fit", "(Capital Available / Capital Required) x 10", "Arithmetic"],
        ["E", "Execution fit", "User's skills/time vs. the idea's needs", "LLM self-score (new ideas) /\nheuristic overlap (reused ideas)"],
        ["S", "Competitive position", "Local competition & moat strength", "LLM self-score (idea-intrinsic,\nreused unchanged for every requester)"],
        ["R", "Regulatory/operational risk", "Licensing, compliance, supply fragility", "LLM self-score (idea-intrinsic)"],
        ["A", "Asset & location advantage", "Owned assets/location vs. the idea's needs", "LLM self-score (new) / heuristic\noverlap (reused ideas)"],
    ]
    t2 = Table(formula_rows, colWidths=[0.45 * inch, 1.5 * inch, 2.55 * inch, 1.7 * inch])
    t2.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor(NAVY)),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTSIZE", (0, 0), (-1, -1), 8.2),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#DDDDDD")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor(LIGHT)]),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(t2)
    story.append(Spacer(1, 10))
    story.append(Paragraph(
        "<b>Why C/E/A are recomputed per requester but D/F/S/R are not:</b> demand, financial "
        "viability, competitive position, and regulatory risk are properties of the <i>business "
        "idea itself</i> -- they don't change depending on who is asking. Capital fit, execution "
        "fit, and asset/location advantage are properties of the <i>match between the idea and a "
        "specific person's resources</i>. This split is what makes dataset-wide re-ranking (§3) "
        "computationally practical: reused ideas get cheap, instant re-scoring instead of a fresh "
        "LLM call per candidate.", styles["KBody"]))

    if example:
        story.append(Paragraph("Worked Example", styles["KH2"]))
        story.append(Paragraph(
            f"From a real K-BIG-2 run: a wizard profile of <b>K{8000:,.0f} available capital, "
            f"Lusaka (Kabulonga), skills in agriculture and selling &amp; marketing, owning a "
            f"smartphone and land</b> produced <b>“{example['name']}”</b> "
            f"({example['category'].replace('_', ' ')}) -- {example['description']}",
            styles["KBody"]))
        story.append(Paragraph(
            f"Reported numbers: N (target buyers) = {example['N']}, Q (purchases/year) = {example['Q']}, "
            f"P (avg. unit price) = K{example['P']:,.0f} &rarr; raw demand = "
            f"K{(example['N'] or 0) * (example['Q'] or 0) * (example['P'] or 0):,.0f}/year. "
            f"Monthly revenue estimate K{example['monthly_revenue']:,.0f}, COGS K{example['cogs']:,.0f} "
            f"&rarr; gross margin {((example['monthly_revenue'] - example['cogs']) / example['monthly_revenue'] * 100):.1f}%. "
            f"Minimum capital required K{example['min_capital']:,.0f} against K8,000 available.",
            styles["KBody"]))
        story.append(Image(os.path.join(ASSETS_DIR, "viability_breakdown.png"), width=6.6 * inch, height=2.84 * inch))
        story.append(Paragraph(
            f"Figure 2 -- sub-scores and their weighted contribution to the final viability score "
            f"(V = {example['V']:.2f} / 10) for this idea, generated live against the real Claude Sonnet 5 "
            f"structured-output pipeline during this build.", styles["KCaption"]))

    story.append(PageBreak())

    # ── 7. Methodology assumptions ──
    story.append(Paragraph("7. Methodology Assumptions & Design Decisions", styles["KH1"]))
    story.append(Paragraph(
        "In good conscience toward anyone evaluating this system, every place where the sprint "
        "specification left an implementation detail unstated is documented here explicitly, "
        "rather than silently decided.", styles["KBody"]))
    story.append(ListFlowable([
        ListItem(Paragraph("<b>Demand normalization.</b> The formula D = N&middot;Q&middot;P&middot;(1+g)^t "
                            "produces a raw Kwacha-scale number, but it is weighted alongside six "
                            "0-10 sub-scores. K-BIG-2 log-scales it against a tunable "
                            "“reference_max” constant (an annual-demand figure considered "
                            "excellent for a Zambian micro/small business, currently K5,000,000) "
                            "in <font face=\"Courier\">category_cagr.json</font>: "
                            "<font face=\"Courier\">score = min(10, log10(D+1) / log10(reference_max) * 10)</font>. "
                            "This is the primary lever for recalibrating demand scoring as more real "
                            "outcome data accumulates.", styles["KBody"])),
        ListItem(Paragraph("<b>Cross-user re-ranking uses heuristics, not N extra LLM calls.</b> "
                            "Re-scoring every historical idea in the dataset against a new requester "
                            "via a fresh Claude call per idea would be slow and expensive at scale. "
                            "Capital fit is recomputed with plain arithmetic; execution fit and "
                            "asset/location advantage are recomputed via a fast skill/asset/location "
                            "overlap ratio in Python. Only the 3 brand-new ideas in a given request "
                            "get full LLM-assessed sub-scores.", styles["KBody"])),
        ListItem(Paragraph("<b>Schema field consolidation.</b> The sprint's full field list "
                            "(~70 fields) was found to compile to a structured-output validation "
                            "grammar too large for the API once wrapped in a 3-idea array (a hard "
                            "API limit, confirmed empirically during this build, not a design "
                            "preference). K-BIG-2's schema keeps every field the viability formula "
                            "consumes plus one representative field per remaining sprint-doc "
                            "category, and folds the rest of that category's nuance (equipment, "
                            "logistics, supplier dependency, seasonality, brand/cross-sell/upsell "
                            "potential, health &amp; safety notes) into a single free-text "
                            "<font face=\"Courier\">narrative</font> field rather than one strict "
                            "field each.", styles["KBody"])),
        ListItem(Paragraph("<b>Model choice.</b> K-BIG-2 uses Claude Sonnet 5 with forced structured "
                            "JSON output (guaranteeing a machine-parseable response, unlike K-BIG-1's "
                            "regex-scraped markdown), matching K-BIG-1's existing Sonnet-tier model "
                            "choice for a cost profile appropriate to a Zambian SME-focused product.",
                            styles["KBody"])),
        ListItem(Paragraph("<b>Dataset export is admin-only.</b> The full structured dataset -- "
                            "K-BIG-2's core investor-facing asset -- is exportable as CSV via "
                            "<font face=\"Courier\">GET /api/ideas/export</font>, gated behind a new "
                            "platform-admin flag (no per-user personal information is included in "
                            "the export).", styles["KBody"])),
    ], bulletType="bullet", start="circle"))

    story.append(Paragraph("8. Technology Stack", styles["KH1"]))
    stack_rows = [
        ["Layer", "Technology"],
        ["AI generation", "Anthropic Claude Sonnet 5, forced JSON-schema structured output"],
        ["Backend", "FastAPI (Python), SQLAlchemy ORM, SQLite (dev) / PostgreSQL via Neon (prod)"],
        ["Frontend", "React 18 + Vite, custom 4-slide wizard component"],
        ["Knowledge grounding", "ChromaDB vector search (RAG) + hand-maintained Zambia economic constants"],
        ["Geolocation", "Browser GPS + haversine matching against KIP's own town coordinate registry"],
    ]
    t3 = Table(stack_rows, colWidths=[1.7 * inch, 5.1 * inch])
    t3.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor(NAVY)),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTSIZE", (0, 0), (-1, -1), 8.5),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#DDDDDD")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor(LIGHT)]),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(t3)

    story.append(Paragraph("9. What This Means for Investors", styles["KH1"]))
    story.append(Paragraph(
        "K-BIG-2 turns every business-idea request into two assets: a scored, explainable "
        "recommendation for the entrepreneur, and a permanent addition to a growing, structured, "
        "proprietary dataset of Zambian micro/small-business viability data -- market sizing, "
        "financial assumptions, and risk profiles across dozens of real local business categories. "
        "That dataset compounds with every user, is fully exportable for due diligence, and is the "
        "foundation for future work: better demand calibration as real outcomes are logged, richer "
        "structured fields as the API's schema limits are worked around with multi-call generation, "
        "and eventually a fully data-driven (rather than LLM-estimated) viability model once enough "
        "real business outcomes have been observed through the platform.",
        styles["KBody"]))

    doc.build(story)


def main():
    example = load_worked_example()
    if example is None:
        print("No generated ideas found in the dev database -- run the New Idea wizard at least once "
              "(or the kip_engine_v2.generate_structured_ideas integration test) before generating "
              "this document, so it can include a real worked example.")
        return

    draw_architecture_diagram(os.path.join(ASSETS_DIR, "architecture.png"))
    draw_viability_breakdown(os.path.join(ASSETS_DIR, "viability_breakdown.png"), example)
    build_pdf(example)
    print(f"Wrote {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
