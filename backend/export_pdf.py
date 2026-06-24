from reportlab.lib.pagesizes import letter, landscape
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.units import mm
from datetime import datetime
import io
import logging

logger = logging.getLogger("ornetops")

BRAND_GOLD = colors.HexColor("#D4AF37")
BRAND_DARK = colors.HexColor("#1A1A1A")
BRAND_GRAY = colors.HexColor("#E0E0E0")
BRAND_STRIPE = colors.HexColor("#F9F9F9")


def _get_logo_path(logo_url: str) -> str:
    """Robustly resolves a logo URL/path to a local filesystem file path if it exists."""
    if not logo_url:
        return ""
    clean_url = logo_url.split("?")[0]
    logo_filename = ""
    for prefix in ["/api/files/", "/files/"]:
        idx = clean_url.find(prefix)
        if idx != -1:
            logo_filename = clean_url[idx + len(prefix):]
            break
    if not logo_filename and clean_url:
        logo_filename = clean_url.split("/")[-1]
        
    if logo_filename:
        try:
            from pathlib import Path
            base = Path(__file__).parent
            logo_file = base / "uploads" / logo_filename
            if logo_file.exists():
                return str(logo_file)
        except Exception:
            pass
    return ""


def _make_header_footer(company_name: str, logo_url: str, title: str, 
                        pdf_footer_text: str = "", 
                        pdf_header_style: str = "dark", 
                        pdf_logo_height: int = 24,
                        pdf_header_bg: str = "",
                        pdf_header_text_color: str = ""):
    """Returns an onPage callback that draws the branded header/footer on every page."""
    logo_file_path = _get_logo_path(logo_url)

    def _on_page(canvas, doc):
        canvas.saveState()
        page_width, page_height = landscape(letter)
        margin_l = 36
        margin_r = 36

        # Calculate dynamic header sizes
        logo_h = max(10, min(100, pdf_logo_height))
        logo_w = int(logo_h * 2.5)
        header_h = logo_h + 12
        header_bar_y = page_height - header_h

        # Resolve background and text colors dynamically from settings
        bg_color_str = pdf_header_bg
        if not bg_color_str:
            bg_color_str = "#1A1A1A" if pdf_header_style == "dark" else "transparent"
            
        text_color_str = pdf_header_text_color
        if not text_color_str:
            text_color_str = "#D4AF37" if pdf_header_style == "dark" else "#1A1A1A"

        # ── Header background ──────────────────────────────────────────
        is_transparent = bg_color_str.lower() in ("transparent", "")
        if not is_transparent:
            try:
                canvas.setFillColor(colors.HexColor(bg_color_str))
                canvas.rect(0, header_bar_y, page_width, header_h, stroke=0, fill=1)
            except Exception as e:
                logger.error(f"Failed to fill header background color {bg_color_str}: {e}")
                canvas.setFillColor(BRAND_DARK)
                canvas.rect(0, header_bar_y, page_width, header_h, stroke=0, fill=1)
                is_transparent = False

        # Resolve text and date colors
        try:
            text_color = colors.HexColor(text_color_str)
        except Exception:
            text_color = BRAND_GOLD if pdf_header_style == "dark" else BRAND_DARK

        # If background is transparent or white/light, use dark grey for date. Otherwise white.
        if is_transparent or bg_color_str.lower() in ("#ffffff", "white", "#fff", "#f9f9f9"):
            date_color = colors.HexColor("#555555")
        else:
            date_color = colors.white

        # Draw Logo
        if logo_file_path:
            try:
                canvas.drawImage(
                    logo_file_path,
                    margin_l, header_bar_y + 6,
                    width=logo_w, height=logo_h,
                    preserveAspectRatio=True,
                    anchor='w',
                    mask='auto'
                )
            except Exception as e:
                logger.error(f"Failed to draw header logo: {e}", exc_info=True)

        # Company name (centred in header)
        canvas.setFont("Helvetica-Bold", 13)
        canvas.setFillColor(text_color)
        canvas.drawCentredString(page_width / 2, header_bar_y + (header_h / 2) - 4, company_name.upper())

        # Export date (right-aligned in header)
        today = datetime.utcnow().strftime("%d %b %Y")
        canvas.setFont("Helvetica", 8)
        canvas.setFillColor(date_color)
        canvas.drawRightString(page_width - margin_r, header_bar_y + (header_h / 2) - 3, f"Exported: {today}")

        # Report title line (gold underline below header)
        canvas.setStrokeColor(BRAND_GOLD)
        canvas.setLineWidth(1.0)
        canvas.line(margin_l, header_bar_y - 2, page_width - margin_r, header_bar_y - 2)

        # ── Footer strip ──────────────────────────────────────────────
        footer_y = 14
        canvas.setFont("Helvetica", 7)
        canvas.setFillColor(colors.HexColor("#888888"))
        
        footer_text_to_draw = pdf_footer_text
        if not footer_text_to_draw:
            footer_text_to_draw = f"{company_name}  |  {title}"
        else:
            footer_text_to_draw = footer_text_to_draw.replace("{company_name}", company_name).replace("{title}", title)
            
        canvas.drawString(margin_l, footer_y, footer_text_to_draw)
        canvas.drawRightString(page_width - margin_r, footer_y, f"Page {doc.page}")

        canvas.restoreState()

    return _on_page


def export_to_pdf(data: list, cols: list, title: str,
                  company_name: str = "ORNETOPS",
                  logo_url: str = "",
                  pdf_footer_text: str = "",
                  pdf_header_style: str = "dark",
                  pdf_logo_height: int = 24,
                  pdf_header_bg: str = "",
                  pdf_header_text_color: str = "") -> bytes:
    """
    Generates a premium, styled landscape PDF document from structured data.
    - cols: list of tuples like (field_key, column_label)
    - data: list of dictionaries
    - company_name: company name for the PDF header
    - logo_url: optional relative /api/files/ path for the company logo
    """
    buffer = io.BytesIO()

    on_page = _make_header_footer(company_name, logo_url, title, pdf_footer_text, 
                                  pdf_header_style=pdf_header_style, pdf_logo_height=pdf_logo_height,
                                  pdf_header_bg=pdf_header_bg, pdf_header_text_color=pdf_header_text_color)

    logo_h = max(10, min(100, pdf_logo_height))
    top_margin = logo_h + 28  # dynamic margin

    # Extra top margin to accommodate the branded header
    doc = SimpleDocTemplate(
        buffer,
        pagesize=landscape(letter),
        leftMargin=36,
        rightMargin=36,
        topMargin=top_margin,   # extra room for the header strip
        bottomMargin=36,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'TitleStyle',
        parent=styles['Heading1'],
        fontSize=15,
        leading=19,
        spaceBefore=4,
        textColor=BRAND_DARK,
    )
    cell_style = ParagraphStyle(
        'CellStyle',
        parent=styles['Normal'],
        fontSize=8,
        leading=10,
    )
    header_style = ParagraphStyle(
        'HeaderStyle',
        parent=styles['Normal'],
        fontSize=9,
        leading=11,
        textColor=colors.white,
        fontName="Helvetica-Bold",
    )

    story = []
    story.append(Paragraph(title.replace("_", " "), title_style))
    story.append(Spacer(1, 10))

    # Header row
    table_data = [[Paragraph(label, header_style) for _, label in cols]]

    # Data rows
    for row in data:
        row_cells = []
        for key, _ in cols:
            val = row.get(key, "")
            if val is None:
                val = "—"
            elif isinstance(val, list):
                val = ", ".join(map(str, val))
            elif isinstance(val, dict):
                val = str(val)
            else:
                val = str(val)
            row_cells.append(Paragraph(val, cell_style))
        table_data.append(row_cells)

    t = Table(table_data, repeatRows=1)

    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), BRAND_DARK),      # Dark header row
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 7),
        ('TOPPADDING', (0, 0), (-1, 0), 7),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [BRAND_STRIPE, colors.white]),
        ('GRID', (0, 0), (-1, -1), 0.4, BRAND_GRAY),
        ('LINEBELOW', (0, 0), (-1, 0), 1.5, BRAND_GOLD),  # gold accent under header row
        ('BOTTOMPADDING', (0, 1), (-1, -1), 5),
        ('TOPPADDING', (0, 1), (-1, -1), 5),
    ]))

    story.append(t)
    doc.build(story, onFirstPage=on_page, onLaterPages=on_page)

    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes


def _make_quote_header_footer(company_name: str, logo_file_path: str, quote_ref: str, date_str: str, 
                              pdf_footer_text: str, pdf_header_style: str = "dark", pdf_logo_height: int = 32):
    def _on_page(canvas, doc):
        canvas.saveState()
        page_width, page_height = letter
        margin_l = 54
        margin_r = 54
        
        # Calculate dynamic header sizes
        logo_h = max(10, min(100, pdf_logo_height))
        logo_w = int(logo_h * 2.5)
        header_bar_y = page_height - logo_h - 16
        
        # ── Header Section ───────────────────────────────────────────
        header_y = page_height - (logo_h / 2) - 10
        
        # Draw Logo
        if logo_file_path:
            try:
                canvas.drawImage(
                    logo_file_path,
                    margin_l, header_bar_y + 4,
                    width=logo_w, height=logo_h,
                    preserveAspectRatio=True,
                    anchor='w',
                    mask='auto'
                )
            except Exception as e:
                logger.error(f"Failed to draw quote logo: {e}", exc_info=True)
                canvas.setFont("Helvetica-Bold", 16)
                canvas.setFillColor(BRAND_DARK)
                canvas.drawString(margin_l, header_y, company_name)
        else:
            canvas.setFont("Helvetica-Bold", 16)
            canvas.setFillColor(BRAND_DARK)
            canvas.drawString(margin_l, header_y, company_name)
            
        # Draw Quotation Label & Date/Ref
        canvas.setFont("Helvetica-Bold", 16)
        canvas.setFillColor(BRAND_GOLD)
        canvas.drawRightString(page_width - margin_r, page_height - 36, "QUOTATION")
        
        canvas.setFont("Helvetica", 8)
        canvas.setFillColor(colors.HexColor("#666666"))
        canvas.drawRightString(page_width - margin_r, page_height - 46, f"Date: {date_str}")
        canvas.drawRightString(page_width - margin_r, page_height - 56, f"Quote Ref: {quote_ref}")
        
        # Gold divider line below header
        canvas.setStrokeColor(BRAND_GOLD)
        canvas.setLineWidth(1.5)
        canvas.line(margin_l, header_bar_y, page_width - margin_r, header_bar_y)
        
        # ── Footer Section ───────────────────────────────────────────
        footer_y = 24
        canvas.setFont("Helvetica", 7)
        canvas.setFillColor(colors.HexColor("#888888"))
        
        footer_text_to_draw = pdf_footer_text
        if not footer_text_to_draw:
            footer_text_to_draw = f"{company_name}  |  Quotation"
        else:
            footer_text_to_draw = footer_text_to_draw.replace("{company_name}", company_name).replace("{title}", "Quotation")
            
        canvas.drawString(margin_l, footer_y, footer_text_to_draw)
        canvas.drawRightString(page_width - margin_r, footer_y, f"Page {doc.page}")
        
        canvas.restoreState()
    return _on_page


def generate_quote_pdf(quote_request: dict, settings: dict) -> bytes:
    """Generates a premium Portrait Quotation PDF for a customer."""
    buffer = io.BytesIO()
    
    company = settings.get("company", {})
    company_name = company.get("name", "ORNETOPS")
    company_email = company.get("email", "hello@ornetops.com")
    company_phone = company.get("phone", "+91 99999 99999")
    company_address = company.get("address", "Mumbai, India")
    company_tagline = company.get("tagline", "Precision Engineered for Precious Metals")
    
    pdf_footer_text = company.get("pdf_footer_text", "")
    pdf_header_style = company.get("pdf_header_style", "dark")
    
    try:
        pdf_logo_height = int(company.get("pdf_logo_height", 32))
    except Exception:
        pdf_logo_height = 32
        
    pdf_company_name = company.get("pdf_company_name", "") or company_name
    
    # Page setup
    quote_ref = f"Q-{str(quote_request.get('id', quote_request.get('_id', 'N/A')))[-6:].upper()}"
    date_str = datetime.now().strftime('%d %b %Y')
    
    # Header Section (Logo / Company Info & Title / Date)
    logo_url = company.get("pdf_logo", "")
    if not logo_url:
        logo_cfg = settings.get("logo", {})
        if isinstance(logo_cfg, dict):
            logo_url = logo_cfg.get("image_light") or logo_cfg.get("image") or logo_cfg.get("image_dark") or ""
        
    logo_file_path = _get_logo_path(logo_url)
    
    on_page = _make_quote_header_footer(pdf_company_name, logo_file_path, quote_ref, date_str, pdf_footer_text,
                                        pdf_header_style=pdf_header_style, pdf_logo_height=pdf_logo_height)
    
    top_margin = max(85, pdf_logo_height + 53)
    
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=top_margin,
        bottomMargin=54,
    )
    
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'QuoteTitle',
        parent=styles['Heading1'],
        fontSize=24,
        leading=28,
        textColor=BRAND_DARK,
        spaceAfter=6
    )
    
    subtitle_style = ParagraphStyle(
        'QuoteSubtitle',
        parent=styles['Normal'],
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#666666"),
        spaceAfter=15
    )

    body_style = ParagraphStyle(
        'QuoteBody',
        parent=styles['Normal'],
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#333333")
    )
    
    header_style = ParagraphStyle(
        'QuoteHeader',
        parent=styles['Normal'],
        fontSize=10,
        leading=13,
        textColor=colors.white,
        fontName="Helvetica-Bold"
    )
    
    cell_style = ParagraphStyle(
        'QuoteCell',
        parent=styles['Normal'],
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#333333")
    )
    
    bold_cell_style = ParagraphStyle(
        'QuoteBoldCell',
        parent=cell_style,
        fontName="Helvetica-Bold"
    )

    story = []
    
    # Side-by-Side: Company Details (From) and Client Details (To)
    details_left = [
        Paragraph("<b>FROM:</b>", bold_cell_style),
        Paragraph(f"<b>{company_name}</b>", cell_style),
        Paragraph(company_address, cell_style),
        Paragraph(f"Phone: {company_phone}", cell_style),
        Paragraph(f"Email: {company_email}", cell_style),
    ]
    
    details_right = [
        Paragraph("<b>PREPARED FOR:</b>", bold_cell_style),
        Paragraph(f"<b>{quote_request.get('name', 'Valued Customer')}</b>", cell_style),
        Paragraph(quote_request.get('company') or "—", cell_style),
        Paragraph(f"Phone: {quote_request.get('phone') or '—'}", cell_style),
        Paragraph(f"Email: {quote_request.get('email') or '—'}", cell_style),
    ]
    
    details_table = Table([[details_left, details_right]], colWidths=[250, 254])
    details_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 15),
    ]))
    story.append(details_table)
    story.append(Spacer(1, 10))
    
    # Items Table
    product_name = quote_request.get("product", "Gold Analysis & Testing Solutions")
    qty = quote_request.get("quantity", 1) or 1
    
    table_data = [
        [
            Paragraph("Item & Description", header_style),
            Paragraph("Qty", header_style),
            Paragraph("Rate", header_style),
            Paragraph("Total", header_style)
        ],
        [
            Paragraph(f"<b>{product_name}</b><br/><font color='#666666'>Precision XRF testing/hallmarking system including calibration, software suite, installation and customer training.</font>", cell_style),
            Paragraph(str(qty), cell_style),
            Paragraph("As per spec", cell_style),
            Paragraph("Contact sales", cell_style)
        ]
    ]
    
    item_table = Table(table_data, colWidths=[300, 50, 74, 80])
    item_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), BRAND_DARK),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
        ('GRID', (0,0), (-1,-1), 0.5, BRAND_GRAY),
        ('LINEBELOW', (0,0), (-1,0), 2, BRAND_GOLD),
    ]))
    story.append(item_table)
    story.append(Spacer(1, 20))
    
    # Message / Notes
    if quote_request.get("message"):
        story.append(Paragraph("<b>Client Message / Notes:</b>", bold_cell_style))
        story.append(Paragraph(quote_request["message"], cell_style))
        story.append(Spacer(1, 15))
        
    # Terms & Conditions
    story.append(Paragraph("<b>Terms & Conditions:</b>", bold_cell_style))
    terms = [
        "1. Validity: This quotation is valid for 30 days from the date of issue.",
        "2. Delivery: Equipment delivery timelines will be confirmed upon purchase order verification.",
        "3. Warranty: Standard 1-year comprehensive warranty on all analytical components.",
        "4. Support: 24/7 technical assistance and calibration validation packages available."
    ]
    for term in terms:
        story.append(Paragraph(term, ParagraphStyle('TermText', parent=cell_style, fontSize=8, leading=10, textColor=colors.HexColor("#666666"))))
        
    story.append(Spacer(1, 30))
    
    # Signature Section
    sig_data = [
        [
            Paragraph("Prepared By:<br/><br/>________________________<br/>Sales representative", cell_style),
            Paragraph("Client Acceptance:<br/><br/>________________________<br/>Authorized Signature", cell_style)
        ]
    ]
    sig_table = Table(sig_data, colWidths=[250, 254])
    sig_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(sig_table)
    
    doc.build(story, onFirstPage=on_page, onLaterPages=on_page)
    
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes
