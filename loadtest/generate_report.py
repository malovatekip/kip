"""
Turns Locust's CSV output into a PDF performance report.

Usage:
    loadtest\\venv\\Scripts\\python.exe loadtest\\generate_report.py ^
      --main-prefix loadtest\\results\\main --ai-prefix loadtest\\results\\ai ^
      --out loadtest\\report\\KIP_LoadTest_Report.pdf
"""
import argparse
import datetime
import os
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
import pandas as pd

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, PageBreak,
)

# ── Palette (validated categorical palette, light mode — see dataviz skill) ──
INK_PRIMARY   = "#0b0b0b"
INK_SECONDARY = "#52514e"
INK_MUTED     = "#898781"
GRIDLINE      = "#e1e0d9"
BASELINE      = "#c3c2b7"
PAGE_PLANE    = "#f9f9f7"
CHART_SURFACE = "#fcfcfb"
SLOT_BLUE     = "#2a78d6"   # categorical slot 1
SLOT_ORANGE   = "#eb6834"   # categorical slot 2
SLOT_AQUA     = "#1baf7a"   # categorical slot 3
STATUS_CRITICAL = "#d03b3b"
STATUS_GOOD     = "#0ca30c"

REPORT_DIR = Path(__file__).resolve().parent / "report"
REPORT_DIR.mkdir(exist_ok=True)


def _style_axes(ax):
    ax.set_facecolor(CHART_SURFACE)
    ax.figure.set_facecolor(PAGE_PLANE)
    for spine in ("top", "right"):
        ax.spines[spine].set_visible(False)
    for spine in ("left", "bottom"):
        ax.spines[spine].set_color(BASELINE)
    ax.tick_params(colors=INK_MUTED, labelsize=9)
    ax.grid(True, color=GRIDLINE, linewidth=0.8, axis="y")
    ax.set_axisbelow(True)
    ax.title.set_color(INK_PRIMARY)
    ax.xaxis.label.set_color(INK_SECONDARY)
    ax.yaxis.label.set_color(INK_SECONDARY)


def load_history(prefix: str) -> pd.DataFrame:
    path = Path(f"{prefix}_stats_history.csv")
    if not path.exists():
        return pd.DataFrame()
    df = pd.read_csv(path)
    df = df[df["Name"] == "Aggregated"].copy()
    df["Timestamp"] = pd.to_datetime(df["Timestamp"], unit="s")
    return df


def load_stats(prefix: str) -> pd.DataFrame:
    path = Path(f"{prefix}_stats.csv")
    if not path.exists():
        return pd.DataFrame()
    df = pd.read_csv(path)
    return df[df["Name"] != "Aggregated"].copy()


def plot_rps(history: pd.DataFrame, out_path: Path):
    fig, ax = plt.subplots(figsize=(6.3, 2.6), dpi=150)
    ax.plot(history["Timestamp"], history["Requests/s"], color=SLOT_BLUE, linewidth=2)
    ax.fill_between(history["Timestamp"], history["Requests/s"], color=SLOT_BLUE, alpha=0.08)
    ax.set_title("Requests per second", fontsize=11, fontweight="bold", loc="left")
    ax.set_ylabel("req/s")
    ax.xaxis.set_major_formatter(mdates.DateFormatter("%H:%M:%S"))
    _style_axes(ax)
    fig.tight_layout()
    fig.savefig(out_path, facecolor=fig.get_facecolor())
    plt.close(fig)


def plot_latency(history: pd.DataFrame, out_path: Path):
    fig, ax = plt.subplots(figsize=(6.3, 2.6), dpi=150)
    series = [("50%", SLOT_BLUE), ("95%", SLOT_ORANGE), ("99%", SLOT_AQUA)]
    for col, color in series:
        if col in history.columns:
            ax.plot(history["Timestamp"], history[col], color=color, linewidth=2, label=f"p{col.strip('%')}")
    ax.set_title("Response time percentiles", fontsize=11, fontweight="bold", loc="left")
    ax.set_ylabel("ms")
    ax.xaxis.set_major_formatter(mdates.DateFormatter("%H:%M:%S"))
    _style_axes(ax)
    legend = ax.legend(frameon=False, fontsize=9, labelcolor=INK_SECONDARY, loc="upper left")
    fig.tight_layout()
    fig.savefig(out_path, facecolor=fig.get_facecolor())
    plt.close(fig)


def plot_error_rate(history: pd.DataFrame, out_path: Path):
    fig, ax = plt.subplots(figsize=(6.3, 2.6), dpi=150)
    total = history["Total Request Count"].replace(0, pd.NA)
    err_pct = (history["Total Failure Count"] / total * 100).fillna(0)
    ax.plot(history["Timestamp"], err_pct, color=STATUS_CRITICAL, linewidth=2)
    ax.fill_between(history["Timestamp"], err_pct, color=STATUS_CRITICAL, alpha=0.08)
    ax.set_title("Cumulative error rate", fontsize=11, fontweight="bold", loc="left")
    ax.set_ylabel("% of requests")
    ax.set_ylim(bottom=0)
    ax.xaxis.set_major_formatter(mdates.DateFormatter("%H:%M:%S"))
    _style_axes(ax)
    fig.tight_layout()
    fig.savefig(out_path, facecolor=fig.get_facecolor())
    plt.close(fig)


def build_pdf(out_path: Path, main_stats: pd.DataFrame, main_history: pd.DataFrame,
              ai_stats: pd.DataFrame, ai_budget_env: str, chart_paths: dict,
              main_users: str, ai_users: str):
    styles = getSampleStyleSheet()
    h1 = ParagraphStyle("H1", parent=styles["Heading1"], textColor=colors.HexColor(INK_PRIMARY), spaceAfter=10)
    h2 = ParagraphStyle("H2", parent=styles["Heading2"], textColor=colors.HexColor(INK_PRIMARY), spaceBefore=14, spaceAfter=8)
    body = ParagraphStyle("Body", parent=styles["BodyText"], textColor=colors.HexColor(INK_SECONDARY), fontSize=10, leading=14)
    caveat = ParagraphStyle("Caveat", parent=body, textColor=colors.HexColor(INK_MUTED), fontSize=9, leading=13)

    doc = SimpleDocTemplate(str(out_path), pagesize=A4,
                             leftMargin=20 * mm, rightMargin=20 * mm,
                             topMargin=18 * mm, bottomMargin=18 * mm)
    story = []

    # ── Title / executive summary ──
    story.append(Paragraph("KIP — Local Load Test Report", h1))
    story.append(Paragraph(datetime.datetime.now().strftime("Generated %Y-%m-%d %H:%M"), caveat))
    story.append(Spacer(1, 8))

    if not main_stats.empty:
        agg = pd.read_csv(f"{args.main_prefix}_stats.csv")
        agg_row = agg[agg["Name"] == "Aggregated"].iloc[0] if (agg["Name"] == "Aggregated").any() else None
    else:
        agg_row = None

    summary_rows = [["Metric", "Value"]]
    summary_rows.append(["Target", "http://localhost:8000 (local dev, single uvicorn worker)"])
    summary_rows.append(["Main run peak virtual users", main_users])
    if agg_row is not None:
        total_req = int(agg_row["Request Count"])
        total_fail = int(agg_row["Failure Count"])
        err_rate = (total_fail / total_req * 100) if total_req else 0
        summary_rows.append(["Total requests (main run)", f"{total_req:,}"])
        summary_rows.append(["Failed requests (main run)", f"{total_fail:,} ({err_rate:.2f}%)"])
        summary_rows.append(["Average response time", f"{agg_row['Average Response Time']:.0f} ms"])
        summary_rows.append(["p95 / p99 response time", f"{agg_row.get('95%', float('nan')):.0f} ms / {agg_row.get('99%', float('nan')):.0f} ms"])
        summary_rows.append(["Requests/s (avg)", f"{agg_row['Requests/s']:.2f}"])
    summary_rows.append(["AI-endpoint calls (capped run)", f"budget={ai_budget_env}, users={ai_users}"])

    t = Table(summary_rows, colWidths=[70 * mm, 90 * mm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor(INK_PRIMARY)),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor(PAGE_PLANE)]),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor(GRIDLINE)),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(t)
    story.append(Spacer(1, 14))

    # ── Methodology & caveats ──
    story.append(Paragraph("Methodology &amp; caveats", h2))
    for line in [
        "Target was the local dev backend (uvicorn, single worker, --reload) at "
        "http://localhost:8000 — not the Railway/Vercel production deployment. "
        "This is deliberate: no staging environment exists, and testing production "
        "would spend real Anthropic API budget and could affect real users.",
        "The database is the local SQLite dev database. SQLite serializes writes "
        "(single-writer lock); DEPLOY.md already documents this as a known scaling "
        "limit (\"SQLite does not handle concurrent writes from multiple instances — "
        "scale to PostgreSQL before increasing replicas\"). Any write-heavy contention "
        "seen below is expected here and is not a regression to fix in application code.",
        "Virtual users were pre-seeded directly into the database (loadtest/seed_users.py) "
        "and issued valid JWTs without ever calling /api/auth/register or /api/auth/login — "
        "those endpoints are rate-limited per IP (register 5/hour, login 10/minute) and "
        "every virtual user shares localhost's IP, which would not reflect real-world "
        "traffic from distinct users.",
        "Endpoints that call the real Anthropic API (chat, startup chat, capital funding "
        "match, business chat, daily log coaching) were deliberately excluded from the "
        "main full-concurrency run and tested separately in a hard-capped run "
        f"(env LOADTEST_AI_BUDGET={ai_budget_env}) to bound real API spend. Those numbers "
        "below are not statistically meaningful given the intentionally tiny sample size — "
        "they confirm the AI path responds without error, not its performance under load.",
        "The load generator (Locust) ran on the same machine as the servers under test, "
        "so at very high concurrency results start to reflect shared CPU/network "
        "contention rather than the app's true ceiling.",
    ]:
        story.append(Paragraph(line, caveat))
        story.append(Spacer(1, 4))

    # ── Charts ──
    story.append(PageBreak())
    story.append(Paragraph("Main run — non-AI endpoints", h2))
    for key in ("rps", "latency", "errors"):
        if chart_paths.get(key):
            story.append(Image(str(chart_paths[key]), width=160 * mm, height=66 * mm))
            story.append(Spacer(1, 6))

    # ── Per-endpoint table ──
    if not main_stats.empty:
        story.append(Paragraph("Per-endpoint breakdown", h2))
        cols = ["Name", "Request Count", "Failure Count", "Median Response Time", "95%", "99%", "Requests/s"]
        cols = [c for c in cols if c in main_stats.columns]
        rows = [["Endpoint", "Requests", "Failures", "Median (ms)", "p95 (ms)", "p99 (ms)", "req/s"]]
        for _, r in main_stats.iterrows():
            rows.append([
                str(r.get("Name", ""))[:42],
                f"{int(r.get('Request Count', 0)):,}",
                f"{int(r.get('Failure Count', 0)):,}",
                f"{r.get('Median Response Time', 0):.0f}",
                f"{r.get('95%', 0):.0f}",
                f"{r.get('99%', 0):.0f}",
                f"{r.get('Requests/s', 0):.2f}",
            ])
        et = Table(rows, colWidths=[58 * mm, 20 * mm, 18 * mm, 20 * mm, 18 * mm, 18 * mm, 18 * mm], repeatRows=1)
        et.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor(INK_PRIMARY)),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor(PAGE_PLANE)]),
            ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor(GRIDLINE)),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ]))
        story.append(et)

    # ── AI-capped run ──
    story.append(PageBreak())
    story.append(Paragraph("AI-backed endpoints — capped run (indicative only)", h2))
    story.append(Paragraph(
        "Not statistically meaningful given the intentionally tiny sample size "
        f"(budget={ai_budget_env} total calls). Included only to confirm the AI "
        "path responds without error under a live request, not to characterize "
        "its performance.", caveat))
    story.append(Spacer(1, 8))
    if not ai_stats.empty:
        rows = [["Endpoint", "Requests", "Failures", "Median (ms)", "Max (ms)"]]
        for _, r in ai_stats.iterrows():
            rows.append([
                str(r.get("Name", ""))[:42],
                f"{int(r.get('Request Count', 0)):,}",
                f"{int(r.get('Failure Count', 0)):,}",
                f"{r.get('Median Response Time', 0):.0f}",
                f"{r.get('Max Response Time', 0):.0f}",
            ])
        at = Table(rows, colWidths=[70 * mm, 25 * mm, 22 * mm, 26 * mm, 26 * mm])
        at.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor(INK_PRIMARY)),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor(PAGE_PLANE)]),
            ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor(GRIDLINE)),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ]))
        story.append(at)
    else:
        story.append(Paragraph("No AI-capped run data found at the given prefix.", body))

    # ── Findings ──
    story.append(PageBreak())
    story.append(Paragraph("Findings &amp; recommendations", h2))
    findings = []
    if agg_row is not None:
        if err_rate > 1:
            findings.append(f"Error rate was {err_rate:.2f}% on the main run — investigate the failing "
                             "endpoint(s) in the per-endpoint table above before treating this as healthy.")
        else:
            findings.append(f"Error rate was low ({err_rate:.2f}%) on the main run at the tested concurrency.")
        p95 = agg_row.get("95%", None)
        if p95 is not None and p95 > 1000:
            findings.append(f"p95 latency was {p95:.0f}ms — noticeably slow for non-AI endpoints; "
                             "worth profiling the slowest rows in the per-endpoint table.")
    findings.append("uvicorn ran as a single worker process for this test — production should run multiple "
                     "workers/replicas behind a process manager, which this local test does not measure.")
    findings.append("SQLite is the dev database; DEPLOY.md already flags it as unsuitable for concurrent-write "
                     "production scale — treat any write-endpoint slowdown/lock errors above as expected, "
                     "confirming that documented limitation rather than a new regression.")
    for f in findings:
        story.append(Paragraph("• " + f, body))
        story.append(Spacer(1, 4))

    doc.build(story)


def main():
    global args
    parser = argparse.ArgumentParser()
    parser.add_argument("--main-prefix", required=True)
    parser.add_argument("--ai-prefix", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--main-users", default="?")
    parser.add_argument("--ai-users", default="?")
    args = parser.parse_args()

    main_stats = load_stats(args.main_prefix)
    main_history = load_history(args.main_prefix)
    ai_stats = load_stats(args.ai_prefix)

    chart_paths = {}
    if not main_history.empty:
        chart_paths["rps"] = REPORT_DIR / "chart_rps.png"
        plot_rps(main_history, chart_paths["rps"])
        chart_paths["latency"] = REPORT_DIR / "chart_latency.png"
        plot_latency(main_history, chart_paths["latency"])
        chart_paths["errors"] = REPORT_DIR / "chart_errors.png"
        plot_error_rate(main_history, chart_paths["errors"])

    ai_budget_env = os.environ.get("LOADTEST_AI_BUDGET", "8")
    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    build_pdf(out_path, main_stats, main_history, ai_stats, ai_budget_env, chart_paths,
              args.main_users, args.ai_users)
    print(f"Report written to {out_path}")


if __name__ == "__main__":
    main()
