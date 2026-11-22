from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "artifacts" / "brand"
OUT.mkdir(parents=True, exist_ok=True)

TEAL = colors.HexColor("#075D58")
INK = colors.HexColor("#153A3A")
MUTED = colors.HexColor("#637777")
MINT = colors.HexColor("#E5EFE8")
PAPER = colors.HexColor("#FAF9F5")
YELLOW = colors.HexColor("#F2C64B")
CORAL = colors.HexColor("#BC5144")
WHITE = colors.white

FONT_REGULAR = Path("C:/Windows/Fonts/arial.ttf")
FONT_BOLD = Path("C:/Windows/Fonts/arialbd.ttf")
pdfmetrics.registerFont(TTFont("BrandArial", str(FONT_REGULAR)))
pdfmetrics.registerFont(TTFont("BrandArial-Bold", str(FONT_BOLD)))

BODY = ParagraphStyle("Body", fontName="BrandArial", fontSize=10, leading=15, textColor=INK, alignment=TA_LEFT)
SMALL = ParagraphStyle("Small", fontName="BrandArial", fontSize=8.5, leading=12, textColor=MUTED)
LABEL = ParagraphStyle("Label", fontName="BrandArial-Bold", fontSize=8, leading=11, textColor=TEAL)


def draw_mark(c, x, y, size):
    """Place the logo supplied for the application without altering its artwork."""
    c.drawImage(str(OUT / "punkt-zycia-logo.png"), x, y, size, size, preserveAspectRatio=True, anchor="c")


def draw_lockup(c, x, y, mark_size=88, title_size=25, subtitle_size=9):
    draw_mark(c, x, y, mark_size)
    c.setFillColor(INK)
    c.setFont("BrandArial-Bold", title_size)
    c.drawString(x + mark_size + 17, y + mark_size * 0.48, "Punkt Życia")
    c.setFillColor(MUTED)
    c.setFont("BrandArial-Bold", subtitle_size)
    c.drawString(x + mark_size + 19, y + mark_size * 0.25, "OTWARTE DANE O AED")


def draw_paragraph(c, text, x, y_top, width, style=BODY):
    p = Paragraph(text, style)
    w, h = p.wrap(width, 600)
    p.drawOn(c, x, y_top - h)
    return y_top - h


def page_frame(c, number, title):
    width, height = A4
    c.setFillColor(PAPER)
    c.rect(0, 0, width, height, fill=1, stroke=0)
    c.setFillColor(TEAL)
    c.setFont("BrandArial-Bold", 8)
    c.drawString(48, height - 43, "PUNKT ŻYCIA  /  BRAND GUIDE")
    c.setFillColor(INK)
    c.setFont("BrandArial-Bold", 22)
    c.drawString(48, height - 82, title)
    c.setStrokeColor(colors.HexColor("#DCE5DE"))
    c.line(48, 40, width - 48, 40)
    c.setFillColor(MUTED)
    c.setFont("BrandArial", 8)
    c.drawString(48, 26, "System identyfikacji · wersja prototypowa 0.1")
    c.drawRightString(width - 48, 26, f"{number:02d}")


def draw_cover(c):
    width, height = A4
    c.setFillColor(PAPER)
    c.rect(0, 0, width, height, fill=1, stroke=0)
    c.setFillColor(TEAL)
    c.roundRect(38, 386, width - 76, 390, 24, fill=1, stroke=0)
    draw_mark(c, 72, 642, 70)
    c.setFillColor(colors.HexColor("#C7E2D4"))
    c.setFont("BrandArial-Bold", 8)
    c.drawString(158, 691, "SYSTEM IDENTYFIKACJI WIZUALNEJ")
    c.setFillColor(WHITE)
    c.setFont("BrandArial-Bold", 38)
    c.drawString(158, 646, "Punkt Życia")
    c.setFillColor(YELLOW)
    c.setFont("BrandArial-Bold", 15)
    c.drawString(74, 558, "Dane AED na ratunek")
    draw_paragraph(c, "Znak, kolor i język wizualny dla prototypu, który porządkuje dane o AED i pokazuje ich pochodzenie.", 74, 528, width - 148, ParagraphStyle("cover", parent=BODY, textColor=WHITE, fontSize=12, leading=18))
    c.setFillColor(INK)
    c.setFont("BrandArial-Bold", 13)
    c.drawString(48, 324, "Koncepcja")
    concept = [
        "Punkt Życia nazywa rolę uporządkowanych danych: mają skrócić drogę od rozproszonej informacji do lepszego przygotowania na pomoc.",
        "Znak łączy serce z krzyżem pomocy, a zamknięty kształt przywołuje punkt na mapie.",
        "Ciemna zieleń oznacza spokój i zaufanie, natomiast żółty akcent przyciąga uwagę do działania bez alarmistycznego tonu.",
        "Jasna przestrzeń sprawia, że źródło, data i niepewność informacji pozostają czytelniejsze niż sama dekoracja.",
    ]
    y = 298
    for sentence in concept:
        y = draw_paragraph(c, sentence, 48, y, width - 100, BODY) - 10
    c.setFillColor(MUTED)
    c.setFont("BrandArial", 8)
    c.drawString(48, 60, "Wersja robocza dla projektu konkursowego · nazwa i znak nie były sprawdzane pod kątem praw do znaków towarowych.")
    c.showPage()


def draw_logo_page(c):
    width, height = A4
    page_frame(c, 2, "Znak i jego użycie")
    draw_lockup(c, 54, 640, 82, 24, 8)
    c.setFillColor(MUTED)
    c.setFont("BrandArial", 8)
    c.drawString(54, 621, "Wariant podstawowy · symbol plus nazwa · tło jasne")

    # Clear-space construction diagram.
    x, y, s = 82, 431, 82
    c.saveState()
    c.setDash(4, 3)
    c.setStrokeColor(TEAL)
    c.setLineWidth(1)
    c.rect(x - 18, y - 18, s + 36, s + 36, fill=0, stroke=1)
    c.restoreState()
    draw_mark(c, x, y, s)
    c.setFillColor(MUTED)
    c.setFont("BrandArial-Bold", 8)
    c.drawString(x + 104, y + 52, "Pole ochronne = 1/4 szerokości symbolu")
    draw_paragraph(c, "Zachowaj wolną przestrzeń wokół znaku. Nie umieszczaj tekstu, krawędzi ani innych logotypów bliżej niż szerokość odpowiadająca 1/4 symbolu.", x + 104, y + 42, 285, SMALL)

    c.setFillColor(INK)
    c.setFont("BrandArial-Bold", 13)
    c.drawString(54, 366, "Minimalny rozmiar")
    c.setFillColor(MUTED)
    c.setFont("BrandArial", 9)
    c.drawString(54, 346, "Symbol cyfrowo: 24 px  ·  symbol w druku: 8 mm")
    c.drawString(54, 330, "Pełny lockup cyfrowo: 150 px szerokości  ·  w druku: 40 mm")

    c.setFillColor(INK)
    c.setFont("BrandArial-Bold", 13)
    c.drawString(54, 282, "Wariant na ciemnym tle")
    c.setFillColor(TEAL)
    c.roundRect(54, 151, 286, 94, 12, fill=1, stroke=0)
    draw_mark(c, 68, 169, 58)
    c.setFillColor(WHITE)
    c.setFont("BrandArial-Bold", 19)
    c.drawString(140, 203, "Punkt Życia")
    c.setFillColor(colors.HexColor("#C7E2D4"))
    c.setFont("BrandArial-Bold", 7)
    c.drawString(142, 184, "OTWARTE DANE O AED")
    draw_paragraph(c, "Na ciemnym tle nazwa jest biała, a podpis jasnomiętowy. Zachowaj oryginalne proporcje symbolu.", 365, 231, 174, SMALL)
    c.showPage()


def draw_colors_page(c):
    width, height = A4
    page_frame(c, 3, "Kolor i typografia")
    palette = [
        ("Zieleń główna", "#075D58", TEAL, "Znak, główne przyciski i odnośniki"),
        ("Atrament", "#153A3A", INK, "Nagłówki i tekst pierwszego planu"),
        ("Żółty akcent", "#F2C64B", YELLOW, "Najważniejsza akcja lub ostrzeżenie"),
        ("Jasna mięta", "#E5EFE8", MINT, "Powierzchnie pomocnicze i tła sekcji"),
        ("Papier", "#FAF9F5", PAPER, "Tło główne"),
        ("Koral ostrzegawczy", "#BC5144", CORAL, "Zgłoszona awaria lub błąd; oszczędnie"),
    ]
    y = 696
    for name, hex_value, fill, use in palette:
        c.setFillColor(fill)
        c.roundRect(54, y - 38, 76, 40, 8, fill=1, stroke=0)
        c.setFillColor(INK)
        c.setFont("BrandArial-Bold", 10)
        c.drawString(148, y - 14, name)
        c.setFillColor(TEAL)
        c.setFont("BrandArial-Bold", 8)
        c.drawString(148, y - 29, hex_value)
        c.setFillColor(MUTED)
        c.setFont("BrandArial", 8)
        c.drawString(268, y - 22, use)
        y -= 76

    c.setFillColor(INK)
    c.setFont("BrandArial-Bold", 13)
    c.drawString(54, 236, "Typografia")
    c.setFillColor(MUTED)
    c.setFont("BrandArial", 9)
    c.drawString(54, 216, "Interfejs: Manrope dla nagłówków, Inter dla tekstu; Arial / Segoe UI jako bezpieczne zamienniki.")
    c.setFillColor(TEAL)
    c.setFont("BrandArial-Bold", 23)
    c.drawString(54, 172, "AED: stan niepotwierdzony")
    c.setFillColor(INK)
    c.setFont("BrandArial", 10)
    c.drawString(54, 151, "Pochodzenie i data są częścią informacji, nie przypisem.")
    c.setFillColor(MUTED)
    c.setFont("BrandArial", 8)
    c.drawString(54, 117, "Kontrast tekstu na tle należy utrzymać co najmniej na poziomie czytelnym dla danej wielkości.")
    c.drawString(54, 103, "Nie koduj statusu wyłącznie kolorem: dodaj etykietę tekstową i ikonę.")
    c.showPage()


def draw_layout_page(c):
    width, height = A4
    page_frame(c, 4, "Układ i zasady interfejsu")
    c.setFillColor(INK)
    c.setFont("BrandArial-Bold", 13)
    c.drawString(54, 706, "Hierarchia")
    draw_paragraph(c, "Jeden ekran powinien mieć jeden główny cel. Nagłówek wyjaśnia zadanie, a źródło, status i data są blisko rekordu, którego dotyczą.", 54, 687, 480, BODY)

    # A simple editable-looking page schematic.
    c.setFillColor(WHITE)
    c.setStrokeColor(colors.HexColor("#DCE5DE"))
    c.roundRect(54, 405, 486, 213, 12, fill=1, stroke=1)
    c.setFillColor(TEAL)
    c.roundRect(70, 540, 454, 62, 10, fill=1, stroke=0)
    c.setFillColor(WHITE)
    c.setFont("BrandArial-Bold", 13)
    c.drawString(88, 574, "Cel widoku i krótka instrukcja")
    c.setFillColor(YELLOW)
    c.roundRect(70, 492, 185, 31, 7, fill=1, stroke=0)
    c.setFillColor(INK)
    c.setFont("BrandArial-Bold", 8)
    c.drawString(84, 503, "Jedna główna akcja")
    c.setFillColor(MINT)
    c.roundRect(70, 422, 454, 55, 8, fill=1, stroke=0)
    c.setFillColor(TEAL)
    c.setFont("BrandArial-Bold", 9)
    c.drawString(85, 455, "Źródło · data · status · licencja")
    c.setFillColor(MUTED)
    c.setFont("BrandArial", 8)
    c.drawString(85, 438, "Nieznane wartości mają etykietę tekstową; mapa zawsze ma widok listy.")

    c.setFillColor(INK)
    c.setFont("BrandArial-Bold", 13)
    c.drawString(54, 359, "Zasady użycia")
    guidelines = [
        "Pisz prostymi słowami; używaj unknown, kiedy źródło niczego nie potwierdza.",
        "Oddziel harmonogram dostępu od zgłoszonego stanu urządzenia.",
        "Pokazuj mapę obok wyszukiwalnej listy i tekstowych opisów.",
        "Wyróżniaj awarię tekstem oraz kolorem; nie sugeruj dostępności na żywo.",
    ]
    y = 334
    for line in guidelines:
        c.setFillColor(YELLOW)
        c.circle(61, y + 3, 3, fill=1, stroke=0)
        y = draw_paragraph(c, line, 75, y + 9, 450, BODY) - 10
    c.showPage()


def draw_voice_page(c):
    width, height = A4
    page_frame(c, 5, "Głos marki i ograniczenia")
    c.setFillColor(INK)
    c.setFont("BrandArial-Bold", 13)
    c.drawString(54, 704, "Ton")
    draw_paragraph(c, "Spokojny, konkretny i ostrożny. Wyjaśnia, co wiemy, skąd to wiemy i czego jeszcze nie sprawdzono. Zachęca dysponentów do przekazywania danych, ale nie obiecuje ratownikowi aktualnego statusu.", 54, 684, 480, BODY)

    c.setFillColor(MINT)
    c.roundRect(54, 493, 225, 110, 10, fill=1, stroke=0)
    c.setFillColor(TEAL)
    c.setFont("BrandArial-Bold", 9)
    c.drawString(70, 577, "TAK")
    draw_paragraph(c, "„Zgłoszono jako sprawny · potwierdzono 12.10.2026 u dysponenta”", 70, 560, 194, SMALL)
    c.setFillColor(colors.HexColor("#FFF0ED"))
    c.roundRect(300, 493, 240, 110, 10, fill=1, stroke=0)
    c.setFillColor(CORAL)
    c.setFont("BrandArial-Bold", 9)
    c.drawString(316, 577, "NIE")
    draw_paragraph(c, "„AED na pewno działa i jest dostępne 24/7” — jeśli dane nie potwierdzają tego stanu.", 316, 560, 208, SMALL)

    c.setFillColor(INK)
    c.setFont("BrandArial-Bold", 13)
    c.drawString(54, 447, "Czego unikać")
    avoid = [
        "Nie rozciągaj ani nie obracaj znaku.",
        "Nie zmieniaj relacji serca i symbolu pomocy.",
        "Nie umieszczaj znaku na zdjęciu lub tle o niskim kontraście.",
        "Nie używaj czerwonego krzyża ani barw sugerujących potwierdzenie statusu.",
        "Nie przedstawiaj danych syntetycznych jako realnych lokalizacji AED.",
    ]
    y = 421
    for line in avoid:
        c.setFillColor(CORAL)
        c.circle(61, y + 3, 3, fill=1, stroke=0)
        y = draw_paragraph(c, line, 75, y + 9, 450, BODY) - 8
    c.setFillColor(TEAL)
    c.roundRect(54, 87, 486, 91, 10, fill=1, stroke=0)
    c.setFillColor(WHITE)
    c.setFont("BrandArial-Bold", 10)
    c.drawString(70, 153, "Ważne")
    draw_paragraph(c, "Nazwa i znak są koncepcją roboczą. Nie sprawdzono dostępności nazwy, kolizji znaków towarowych ani praw do użycia przed zgłoszeniem konkursowym.", 70, 136, 450, ParagraphStyle("white", parent=SMALL, textColor=WHITE))
    c.showPage()


logo_pdf = canvas.Canvas(str(OUT / "punkt-zycia-logo.pdf"), pagesize=(720, 180), pageCompression=1)
logo_pdf.setFillColor(PAPER)
logo_pdf.rect(0, 0, 720, 180, fill=1, stroke=0)
draw_mark(logo_pdf, 20, 20, 140)
logo_pdf.setFillColor(INK)
logo_pdf.setFont("BrandArial-Bold", 40)
logo_pdf.drawString(185, 92, "Punkt Życia")
logo_pdf.setFillColor(MUTED)
logo_pdf.setFont("BrandArial-Bold", 12)
logo_pdf.drawString(190, 61, "OTWARTE DANE O AED")
logo_pdf.save()

brandbook = canvas.Canvas(str(OUT / "brandbook-punkt-zycia.pdf"), pagesize=A4, pageCompression=1)
draw_cover(brandbook)
draw_logo_page(brandbook)
draw_colors_page(brandbook)
draw_layout_page(brandbook)
draw_voice_page(brandbook)
brandbook.save()
print("Created logo PDF and 5-page brandbook PDF")
