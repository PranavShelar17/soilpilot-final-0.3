import re
import markdown
from pathlib import Path

ARTIFACT_DIR = Path(r"C:\Users\Rutuja\.gemini\antigravity\brain\e4eb20c6-cc56-4787-b96f-065cc083c7d5")
MD_PATH = ARTIFACT_DIR / "SoilPilot_Scientific_Technical_Report.md"
HTML_PATH = ARTIFACT_DIR / "SoilPilot_Scientific_Technical_Report.html"

def convert():
    if not MD_PATH.exists():
        print(f"File not found: {MD_PATH}")
        return

    text = MD_PATH.read_text(encoding="utf-8")

    # Convert GitHub Alerts > [!IMPORTANT] etc. to styled callouts
    def alert_replacer(match):
        alert_type = match.group(1).upper()
        content = match.group(2).strip()
        color = "#15803d" if alert_type == "TIP" else ("#b45309" if alert_type == "WARNING" else "#1e40af")
        bg = "#f0fdf4" if alert_type == "TIP" else ("#fffbeb" if alert_type == "WARNING" else "#eff6ff")
        border = "#86efac" if alert_type == "TIP" else ("#fde68a" if alert_type == "WARNING" else "#bfdbfe")
        return f'<div class="callout" style="background:{bg}; border-left: 4px solid {color}; padding: 12px 16px; margin: 16px 0; border-radius: 4px;"><strong>{alert_type}:</strong> {content}</div>'

    text = re.sub(r">\s*\[!(IMPORTANT|NOTE|WARNING|TIP|CAUTION)\]\s*\n>\s*(.*)", alert_replacer, text)

    # Protect math blocks before markdown conversion
    math_blocks = []
    def math_block_sub(m):
        idx = len(math_blocks)
        math_blocks.append(m.group(0))
        return f"%%MATHBLOCK_{idx}%%"

    # Protect $$...$$ display math
    text = re.sub(r"\$\$[\s\S]+?\$\$", math_block_sub, text)
    # Protect $...$ inline math
    text = re.sub(r"(?<!\\)\$([^\$\n]+?)\$", math_block_sub, text)

    # Convert markdown to html
    html_body = markdown.markdown(
        text,
        extensions=["extra", "tables", "fenced_code", "toc", "attr_list"],
    )

    # Restore math blocks
    for idx, mb in enumerate(math_blocks):
        html_body = html_body.replace(f"%%MATHBLOCK_{idx}%%", mb)

    # Wrap mermaid blocks with <div class="mermaid">
    html_body = re.sub(
        r'<pre><code class="language-mermaid">([\s\S]+?)</code></pre>',
        r'<div class="mermaid">\1</div>',
        html_body,
    )

    html_template = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>SoilPilot: Scientific & Technical Monograph</title>
<!-- KaTeX -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css">
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.js"></script>
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/contrib/auto-render.min.js"
    onload="renderMathInElement(document.body, {{
        delimiters: [
            {{left: '$$', right: '$$', display: true}},
            {{left: '$', right: '$', display: false}}
        ],
        throwOnError: false
    }});"></script>
<!-- Mermaid -->
<script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
<script>
    mermaid.initialize({{ startOnLoad: true, theme: 'neutral', securityLevel: 'loose' }});
</script>
<style>
    @page {{
        size: A4;
        margin: 18mm 16mm 18mm 16mm;
        @bottom-right {{
            content: "Page " counter(page);
        }}
    }}
    body {{
        font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif;
        color: #1f2937;
        line-height: 1.6;
        font-size: 10.5pt;
        background-color: #ffffff;
        margin: 0;
        padding: 24px;
        max-width: 900px;
        margin: auto;
    }}
    h1 {{
        font-size: 20pt;
        color: #064e3b;
        border-bottom: 2px solid #064e3b;
        padding-bottom: 8px;
        margin-top: 0;
        line-height: 1.25;
    }}
    h2 {{
        font-size: 14pt;
        color: #111827;
        border-bottom: 1px solid #e5e7eb;
        padding-bottom: 4px;
        margin-top: 24px;
        page-break-after: avoid;
    }}
    h3 {{
        font-size: 12pt;
        color: #065f46;
        margin-top: 18px;
        page-break-after: avoid;
    }}
    h4 {{
        font-size: 11pt;
        color: #374151;
        margin-top: 14px;
    }}
    p, li {{
        text-align: justify;
    }}
    table {{
        width: 100%;
        border-collapse: collapse;
        margin: 16px 0;
        font-size: 8.5pt;
        page-break-inside: avoid;
    }}
    th {{
        background-color: #064e3b;
        color: #ffffff;
        padding: 6px 8px;
        text-align: left;
        font-weight: 600;
        border: 1px solid #047857;
    }}
    td {{
        padding: 5px 8px;
        border: 1px solid #d1d5db;
        vertical-align: top;
    }}
    tr:nth-child(even) {{
        background-color: #f9fafb;
    }}
    code {{
        background-color: #f3f4f6;
        padding: 2px 5px;
        border-radius: 3px;
        font-family: 'Cascadia Code', Consolas, Monaco, monospace;
        font-size: 9pt;
        color: #991b1b;
    }}
    pre {{
        background-color: #f8fafc;
        border: 1px solid #e2e8f0;
        padding: 12px;
        border-radius: 6px;
        overflow-x: auto;
        font-size: 8.5pt;
        page-break-inside: avoid;
    }}
    blockquote {{
        border-left: 4px solid #10b981;
        margin: 14px 0;
        padding: 8px 16px;
        background-color: #f0fdf4;
        color: #166534;
        border-radius: 0 4px 4px 0;
    }}
    .mermaid {{
        margin: 20px 0;
        text-align: center;
        page-break-inside: avoid;
    }}
    a {{
        color: #047857;
        text-decoration: none;
    }}
    a:hover {{
        text-decoration: underline;
    }}
    hr {{
        border: 0;
        border-top: 1px solid #e5e7eb;
        margin: 24px 0;
    }}
    .katex-display {{
        margin: 10px 0;
        overflow-x: auto;
        overflow-y: hidden;
    }}
</style>
</head>
<body>
{html_body}
</body>
</html>"""

    HTML_PATH.write_text(html_template, encoding="utf-8")
    print(f"Generated HTML at {HTML_PATH} ({len(html_template)} bytes)")

if __name__ == "__main__":
    convert()
