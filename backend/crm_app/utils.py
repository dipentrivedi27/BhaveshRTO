import random
import datetime
from django.utils import timezone
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from io import BytesIO

def generate_otp_code():
    return str(random.randint(100000, 999999))

MESSAGE_TEMPLATES = {
    'insurance': lambda name, end_date: f"Hello {name},\n\nThis is a reminder from Bhavesh Solanki RTO & Insurance Advisor.\n\nYour *vehicle insurance* is expiring on *{end_date}*. Please renew it before the expiry date to avoid penalties.\n\nFor assistance, contact us anytime. Thank you! 🙏",
    'permit': lambda name, end_date: f"Hello {name},\n\nThis is a reminder from Bhavesh Solanki RTO & Insurance Advisor.\n\nYour *vehicle permit* is expiring on *{end_date}*. Please arrange for renewal well in time.\n\nFor assistance, contact us anytime. Thank you! 🙏",
    'fitness_puc': lambda name, end_date: f"Hello {name},\n\nThis is a reminder from Bhavesh Solanki RTO & Insurance Advisor.\n\nYour *Fitness / PUC certificate* is expiring on *{end_date}*. Please renew it before the due date.\n\nFor assistance, contact us anytime. Thank you! 🙏",
    'license': lambda name, end_date: f"Hello {name},\n\nThis is a reminder from Bhavesh Solanki RTO & Insurance Advisor.\n\nYour *driving license* is due for renewal on *{end_date}*. Please complete the renewal process in time.\n\nFor assistance, contact us anytime. Thank you! 🙏",
}

def build_whatsapp_message(customer):
    tmpl = MESSAGE_TEMPLATES.get(customer.category, MESSAGE_TEMPLATES['insurance'])
    end_date_str = customer.end_date.strftime('%d %b %Y') if customer.end_date else 'N/A'
    return tmpl(customer.name, end_date_str)

def send_whatsapp_stub(customer):
    from .models import MessageLog
    body = build_whatsapp_message(customer)
    log = MessageLog.objects.create(
        customer=customer,
        category=customer.category,
        message_body=body,
        status='stub',
        provider_response='Stub mode — logged to console'
    )
    print(f"\n📱  [WhatsApp STUB] Sent to {customer.contact_number}:\n{body}\n")
    return log

def generate_pdf_receipt(customer, payments, total_paid, total_pending, admin_name="Bhavesh Solanki"):
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
    elements = []
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        'TitleStyle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=20,
        textColor=colors.HexColor('#1e3a5f'),
        spaceAfter=4,
    )
    subtitle_style = ParagraphStyle(
        'SubTitleStyle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=11,
        textColor=colors.HexColor('#64748b'),
        spaceAfter=15,
    )

    elements.append(Paragraph("Bhavesh Solanki — RTO & Insurance Advisor", title_style))
    elements.append(Paragraph(f"PAYMENT RECEIPT • Generated on {datetime.date.today().strftime('%d %b %Y')}", subtitle_style))
    elements.append(Spacer(1, 10))

    # Customer Details Table
    cust_data = [
        [Paragraph("<b>Customer Name:</b>", styles['Normal']), Paragraph(customer.name, styles['Normal']),
         Paragraph("<b>Contact:</b>", styles['Normal']), Paragraph(customer.contact_number, styles['Normal'])],
        [Paragraph("<b>Category:</b>", styles['Normal']), Paragraph(customer.get_category_display(), styles['Normal']),
         Paragraph("<b>Vehicle No.:</b>", styles['Normal']), Paragraph(customer.vehicle_number or '—', styles['Normal'])],
        [Paragraph("<b>Start Date:</b>", styles['Normal']), Paragraph(customer.start_date.strftime('%d-%m-%Y') if customer.start_date else '—', styles['Normal']),
         Paragraph("<b>Expiry Date:</b>", styles['Normal']), Paragraph(customer.end_date.strftime('%d-%m-%Y') if customer.end_date else '—', styles['Normal'])],
    ]
    t1 = Table(cust_data, colWidths=[110, 150, 100, 160])
    t1.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f8fafc')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#e2e8f0')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
    ]))
    elements.append(t1)
    elements.append(Spacer(1, 15))

    # Payments table
    elements.append(Paragraph("<b>Payment History</b>", styles['Heading3']))
    pay_rows = [["#", "Date", "Receipt No.", "Method", "Amount (₹)"]]
    for idx, p in enumerate(payments, 1):
        pay_rows.append([
            str(idx),
            p.payment_date.strftime('%d-%m-%Y') if p.payment_date else '—',
            p.receipt_number or '—',
            p.method or '—',
            f"{float(p.amount):.2f}"
        ])

    if len(payments) == 0:
        pay_rows.append(["—", "No payments recorded", "—", "—", "0.00"])

    t2 = Table(pay_rows, colWidths=[30, 120, 150, 100, 120])
    t2.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1e3a5f')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('ALIGN', (-1,0), (-1,-1), 'RIGHT'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
    ]))
    elements.append(t2)
    elements.append(Spacer(1, 15))

    # Summary box
    summary_data = [
        ["Total Amount:", f"₹{float(customer.amount_total):.2f}"],
        ["Total Collected:", f"₹{float(total_paid):.2f}"],
        ["Pending Amount:", f"₹{float(total_pending):.2f}"],
    ]
    t3 = Table(summary_data, colWidths=[380, 140])
    t3.setStyle(TableStyle([
        ('FONTNAME', (0,0), (-1,-1), 'Helvetica-Bold'),
        ('ALIGN', (1,0), (1,-1), 'RIGHT'),
        ('TEXTCOLOR', (0,2), (1,2), colors.HexColor('#92400e')),
        ('BACKGROUND', (0,2), (1,2), colors.HexColor('#fef3c7')),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#e2e8f0')),
    ]))
    elements.append(t3)

    doc.build(elements)
    buffer.seek(0)
    return buffer.getvalue()
