from pathlib import Path

from reportlab.lib.colors import HexColor, white
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.platypus import Paragraph
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "output" / "pdf" / "monoprep-sat-estimate-v1-scoring.pdf"
OUTPUT.parent.mkdir(parents=True, exist_ok=True)

PAGE_W, PAGE_H = A4
NAVY = HexColor("#0B1F45")
INK = HexColor("#172033")
MUTED = HexColor("#5C667A")
BLUE = HexColor("#356DF3")
BLUE_SOFT = HexColor("#EAF0FF")
GREEN = HexColor("#178748")
GREEN_SOFT = HexColor("#E8F7EF")
CORAL = HexColor("#D95C4F")
CORAL_SOFT = HexColor("#FFF0ED")
GOLD = HexColor("#A96800")
GOLD_SOFT = HexColor("#FFF6DF")
LINE = HexColor("#DCE2EC")
PAPER = HexColor("#F7F9FC")

styles = getSampleStyleSheet()
BODY = ParagraphStyle(
    "Body",
    parent=styles["BodyText"],
    fontName="Helvetica",
    fontSize=9.2,
    leading=13,
    textColor=INK,
    alignment=TA_LEFT,
    spaceAfter=0,
)
SMALL = ParagraphStyle(
    "Small",
    parent=BODY,
    fontSize=7.6,
    leading=10.5,
    textColor=MUTED,
)
BOX_TITLE = ParagraphStyle(
    "BoxTitle",
    parent=BODY,
    fontName="Helvetica-Bold",
    fontSize=9.5,
    leading=11.5,
)
BOX_BODY = ParagraphStyle(
    "BoxBody",
    parent=BODY,
    fontSize=8.1,
    leading=10.5,
    textColor=MUTED,
)
CENTER_SMALL = ParagraphStyle(
    "CenterSmall",
    parent=SMALL,
    alignment=TA_CENTER,
)


def draw_paragraph(c, text, style, x, y_top, width, height=100 * mm):
    paragraph = Paragraph(text, style)
    _, used_height = paragraph.wrap(width, height)
    paragraph.drawOn(c, x, y_top - used_height)
    return used_height


def header(c, page_number):
    c.setFillColor(NAVY)
    c.rect(0, PAGE_H - 21 * mm, PAGE_W, 21 * mm, fill=1, stroke=0)
    c.setFont("Helvetica-Bold", 13)
    c.setFillColor(white)
    c.drawString(14 * mm, PAGE_H - 13.5 * mm, "MONO")
    c.setFillColor(HexColor("#7EAAFF"))
    c.drawString(30 * mm, PAGE_H - 13.5 * mm, "Prep")
    c.setFillColor(white)
    c.setFont("Helvetica", 8)
    c.drawRightString(PAGE_W - 14 * mm, PAGE_H - 13.2 * mm, f"SAT Estimate V1  |  Page {page_number} of 2")


def footer(c):
    c.setStrokeColor(LINE)
    c.line(14 * mm, 13 * mm, PAGE_W - 14 * mm, 13 * mm)
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 7)
    c.drawString(14 * mm, 8.5 * mm, "MonoPrep internal scoring specification - generated 2026-09-02")
    c.drawRightString(PAGE_W - 14 * mm, 8.5 * mm, "Result label: Estimated SAT Score")


def section_title(c, number, title, y):
    c.setFillColor(BLUE)
    c.circle(18 * mm, y - 1.2 * mm, 3.4 * mm, fill=1, stroke=0)
    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 8)
    c.drawCentredString(18 * mm, y - 2.3 * mm, str(number))
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 13)
    c.drawString(25 * mm, y - 3 * mm, title)


def rounded_box(c, x, y, w, h, fill, stroke=LINE, radius=3 * mm):
    c.setFillColor(fill)
    c.setStrokeColor(stroke)
    c.setLineWidth(0.6)
    c.roundRect(x, y, w, h, radius, fill=1, stroke=1)


def flow_box(c, x, y, w, h, title, body, fill, accent):
    rounded_box(c, x, y, w, h, fill)
    c.setFillColor(accent)
    c.roundRect(x, y, 2.2 * mm, h, 1.1 * mm, fill=1, stroke=0)
    draw_paragraph(c, title, BOX_TITLE, x + 5 * mm, y + h - 5 * mm, w - 9 * mm)
    draw_paragraph(c, body, BOX_BODY, x + 5 * mm, y + h - 13 * mm, w - 9 * mm)


def arrow(c, x1, y, x2, color=BLUE):
    c.setStrokeColor(color)
    c.setFillColor(color)
    c.setLineWidth(1.4)
    c.line(x1, y, x2 - 2 * mm, y)
    c.line(x2 - 2 * mm, y, x2 - 4 * mm, y + 1.5 * mm)
    c.line(x2 - 2 * mm, y, x2 - 4 * mm, y - 1.5 * mm)


def bullet_list(c, items, x, y_top, width, color=BLUE, style=BODY, gap=3.2 * mm):
    y = y_top
    for item in items:
        c.setFillColor(color)
        c.circle(x + 1.2 * mm, y - 2.3 * mm, 0.9 * mm, fill=1, stroke=0)
        used = draw_paragraph(c, item, style, x + 4 * mm, y, width - 4 * mm)
        y -= used + gap
    return y


def draw_score_scale(c, x, y, width):
    c.setLineWidth(0)
    segments = [
        (200, 400, CORAL),
        (400, 600, GOLD),
        (600, 800, GREEN),
    ]
    segment_width = width / len(segments)
    for index, (low, high, color) in enumerate(segments):
        c.setFillColor(color)
        c.roundRect(x + index * segment_width, y, segment_width + 0.4, 5 * mm, 1.5 * mm, fill=1, stroke=0)
        c.setFillColor(white)
        c.setFont("Helvetica-Bold", 7.3)
        c.drawCentredString(x + (index + 0.5) * segment_width, y + 1.7 * mm, f"{low}-{high}")


def page_one(c):
    header(c, 1)
    footer(c)
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 23)
    c.drawString(14 * mm, PAGE_H - 35 * mm, "Yangi SAT-style scoring algoritmi")
    c.setFont("Helvetica", 10)
    c.setFillColor(MUTED)
    c.drawString(14 * mm, PAGE_H - 42 * mm, "MonoPrep SAT Estimate V1 - adaptiv modul va 400-1600 scaled score")

    rounded_box(c, 14 * mm, PAGE_H - 62 * mm, PAGE_W - 28 * mm, 12 * mm, BLUE_SOFT, BLUE)
    draw_paragraph(
        c,
        "<b>Maqsad:</b> o'quvchining real digital SAT oqimiga yaqin tajribasini yaratish. Natija har doim "
        "<b>Estimated SAT Score</b> deb ko'rsatiladi; bu College Board tomonidan berilgan rasmiy score emas.",
        BODY,
        19 * mm,
        PAGE_H - 54 * mm,
        PAGE_W - 38 * mm,
    )

    section_title(c, 1, "Adaptiv exam oqimi", PAGE_H - 72 * mm)
    box_y = PAGE_H - 111 * mm
    box_w = 38 * mm
    box_h = 25 * mm
    gap = 7 * mm
    x_positions = [14 * mm + i * (box_w + gap) for i in range(4)]
    flow_box(c, x_positions[0], box_y, box_w, box_h, "Module 1", "R&W yoki Math savollari ishlanadi.", PAPER, BLUE)
    flow_box(c, x_positions[1], box_y, box_w, box_h, "Routing", "Pretestsiz accuracy threshold bilan solishtiriladi.", GOLD_SOFT, GOLD)
    flow_box(c, x_positions[2], box_y, box_w, box_h, "Module 2", "HIGHER yoki LOWER yo'nalishdan bittasi ochiladi.", GREEN_SOFT, GREEN)
    flow_box(c, x_positions[3], box_y, box_w, box_h, "Submit", "Faqat tanlangan route baholanadi.", CORAL_SOFT, CORAL)
    for index in range(3):
        arrow(c, x_positions[index] + box_w + 1 * mm, box_y + box_h / 2, x_positions[index + 1] - 1 * mm)

    rounded_box(c, 14 * mm, PAGE_H - 128 * mm, PAGE_W - 28 * mm, 10 * mm, PAPER)
    draw_paragraph(
        c,
        "<b>Default routing:</b> Module 1 scored accuracy >= 60% bo'lsa HIGHER, aks holda LOWER. "
        "Threshold har bir Module 1 uchun admin panelda o'zgartiriladi.",
        SMALL,
        19 * mm,
        PAGE_H - 121.5 * mm,
        PAGE_W - 38 * mm,
    )

    section_title(c, 2, "Scoring bosqichlari", PAGE_H - 141 * mm)
    left_x = 14 * mm
    mid_x = 104 * mm
    card_y = PAGE_H - 225 * mm
    card_h = 68 * mm
    card_w = 82 * mm
    rounded_box(c, left_x, card_y, card_w, card_h, PAPER)
    draw_paragraph(c, "1. Baholanadigan savollar", BOX_TITLE, left_x + 5 * mm, card_y + card_h - 6 * mm, card_w - 10 * mm)
    bullet_list(
        c,
        [
            "<b>isPretest = true</b> savollar score va skill statistikasidan chiqariladi.",
            "Har bir qolgan javob serverdagi answer key bilan tekshiriladi.",
            "MC savolda guessing parametri 0.25, student-produced response uchun 0.",
            "Difficulty xaritasi: EASY = -1.1, MEDIUM = 0, HARD = 1.1.",
        ],
        left_x + 5 * mm,
        card_y + card_h - 17 * mm,
        card_w - 10 * mm,
        style=BOX_BODY,
        gap=2.2 * mm,
    )
    rounded_box(c, mid_x, card_y, card_w, card_h, PAPER)
    draw_paragraph(c, "2. Section score", BOX_TITLE, mid_x + 5 * mm, card_y + card_h - 6 * mm, card_w - 10 * mm)
    bullet_list(
        c,
        [
            "Avval examga biriktirilgan raw-to-scaled conversion table qidiriladi.",
            "Table bo'lmasa 3PL-ga yaqin likelihood estimate ishlaydi.",
            "Theta -3.5 dan +3.5 gacha 0.05 qadamda tanlanadi.",
            "Scaled = 200 + 600 x logistic(1.08 x theta), eng yaqin 10 ga yaxlitlanadi.",
            "LOWER route uchun estimate ceiling 650; 0 correct = 200, all correct = 800.",
        ],
        mid_x + 5 * mm,
        card_y + card_h - 17 * mm,
        card_w - 10 * mm,
        color=GREEN,
        style=BOX_BODY,
        gap=1.7 * mm,
    )

    c.setFont("Helvetica-Bold", 9)
    c.setFillColor(INK)
    c.drawString(14 * mm, PAGE_H - 237 * mm, "Section diapazoni")
    draw_score_scale(c, 48 * mm, PAGE_H - 241 * mm, 86 * mm)
    c.setFont("Helvetica-Bold", 10)
    c.setFillColor(NAVY)
    c.drawRightString(PAGE_W - 14 * mm, PAGE_H - 237.5 * mm, "R&W + Math = 400-1600")


def page_two(c):
    header(c, 2)
    footer(c)
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 20)
    c.drawString(14 * mm, PAGE_H - 35 * mm, "Admin sozlamalari va natijani talqin qilish")
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 9.5)
    c.drawString(14 * mm, PAGE_H - 42 * mm, "Productiondagi yangi model: SAT_ESTIMATE_V1")

    section_title(c, 3, "Full-length examni to'g'ri tuzish", PAGE_H - 55 * mm)
    table_x = 14 * mm
    table_y = PAGE_H - 113 * mm
    col_widths = [15 * mm, 42 * mm, 47 * mm, 77 * mm]
    headers = ["Order", "Subject", "Adaptive role", "Vazifa"]
    rows = [
        ["1", "Reading & Writing", "MODULE_1", "Barcha o'quvchilar uchun bir xil boshlang'ich modul"],
        ["2", "Reading & Writing", "MODULE_2_LOWER", "Quyi route uchun alternativ modul"],
        ["2", "Reading & Writing", "MODULE_2_HIGHER", "Yuqori route uchun alternativ modul"],
        ["3", "Math", "MODULE_1", "Barcha o'quvchilar uchun bir xil boshlang'ich modul"],
        ["4", "Math", "MODULE_2_LOWER", "Quyi route uchun alternativ modul"],
        ["4", "Math", "MODULE_2_HIGHER", "Yuqori route uchun alternativ modul"],
    ]
    row_h = 7.2 * mm
    total_w = sum(col_widths)
    c.setFillColor(NAVY)
    c.roundRect(table_x, table_y + len(rows) * row_h, total_w, row_h, 2 * mm, fill=1, stroke=0)
    cursor_x = table_x
    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 7.5)
    for label, width in zip(headers, col_widths):
        c.drawString(cursor_x + 2 * mm, table_y + len(rows) * row_h + 2.4 * mm, label)
        cursor_x += width
    for row_index, row in enumerate(rows):
        y = table_y + (len(rows) - row_index - 1) * row_h
        c.setFillColor(PAPER if row_index % 2 == 0 else white)
        c.rect(table_x, y, total_w, row_h, fill=1, stroke=0)
        c.setStrokeColor(LINE)
        c.line(table_x, y, table_x + total_w, y)
        cursor_x = table_x
        for value, width in zip(row, col_widths):
            draw_paragraph(c, value, SMALL, cursor_x + 2 * mm, y + 5.1 * mm, width - 4 * mm, row_h)
            cursor_x += width
    c.setStrokeColor(LINE)
    c.roundRect(table_x, table_y, total_w, (len(rows) + 1) * row_h, 2 * mm, fill=0, stroke=1)

    section_title(c, 4, "Score qarori", PAGE_H - 126 * mm)
    decision_y = PAGE_H - 184 * mm
    decision_h = 43 * mm
    decision_w = 56 * mm
    decision_gap = 7 * mm
    decisions = [
        ("Form conversion", "Agar exam.scoreConversion mavjud bo'lsa, raw correct soni shu jadval bilan 200-800 ga o'tkaziladi.", BLUE_SOFT, BLUE),
        ("Estimate fallback", "Jadval bo'lmasa difficulty, response type va route asosida SAT Estimate V1 hisoblanadi.", GREEN_SOFT, GREEN),
        ("Final result", "R&W scaled score + Math scaled score. UI va PDF reportda Estimated SAT Score belgisi chiqadi.", GOLD_SOFT, GOLD),
    ]
    for index, (title, body, fill, accent) in enumerate(decisions):
        x = 14 * mm + index * (decision_w + decision_gap)
        flow_box(c, x, decision_y, decision_w, decision_h, title, body, fill, accent)

    section_title(c, 5, "Muhim aniqlik chegarasi", PAGE_H - 197 * mm)
    rounded_box(c, 14 * mm, PAGE_H - 248 * mm, PAGE_W - 28 * mm, 38 * mm, CORAL_SOFT, CORAL)
    bullet_list(
        c,
        [
            "College Board real digital SATda multistage adaptive design va Item Response Theory ishlatishini ochiq aytadi.",
            "Lekin rasmiy item parametrlar va har bir test formasi uchun conversion jadvali ommaga to'liq berilmaydi.",
            "Shuning uchun MonoPrep natijasi real SATga yaqin <b>estimate</b>. Rasmiy score deb ko'rsatilmaydi.",
            "Eng yuqori aniqlik uchun har bir to'liq exam formasiga kalibrlangan raw-to-scaled jadval qo'shiladi.",
        ],
        19 * mm,
        PAGE_H - 218 * mm,
        PAGE_W - 38 * mm,
        color=CORAL,
        style=BOX_BODY,
        gap=1.8 * mm,
    )

    source_y = PAGE_H - 260 * mm
    c.setFillColor(MUTED)
    c.setFont("Helvetica-Bold", 7.5)
    c.drawString(14 * mm, source_y, "Rasmiy metodologiya manbasi:")
    source = "satsuite.collegeboard.org/scores/what-scores-mean/how-scores-calculated"
    c.setFillColor(BLUE)
    c.setFont("Helvetica", 7.2)
    c.drawString(54 * mm, source_y, source)
    link_width = stringWidth(source, "Helvetica", 7.2)
    c.linkURL(
        "https://satsuite.collegeboard.org/scores/what-scores-mean/how-scores-calculated",
        (54 * mm, source_y - 1 * mm, 54 * mm + link_width, source_y + 2.5 * mm),
        relative=0,
    )


def build():
    c = canvas.Canvas(str(OUTPUT), pagesize=A4)
    c.setTitle("MonoPrep SAT Estimate V1 Scoring")
    c.setAuthor("MonoPrep")
    c.setSubject("Adaptive SAT-style scoring algorithm and implementation criteria")
    page_one(c)
    c.showPage()
    page_two(c)
    c.save()
    print(OUTPUT)


if __name__ == "__main__":
    build()
