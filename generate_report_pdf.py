"""
Script de generación automatizada del Informe Técnico de Arquitectura y Tecnologías
para el proyecto Bienestar App (Comité de Bienestar - I. Municipalidad de Peralillo).
Utiliza ReportLab para generar un PDF formal, académico y con diseño profesional.
"""
import os
import sys
from datetime import datetime

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    PageBreak,
    KeepTogether,
    HRFlowable,
)
from reportlab.pdfgen import canvas

# Paleta Corporativa Ilustre Municipalidad de Peralillo / Salud
NAVY_PRIMARY = colors.HexColor("#0c2b45")
BLUE_ACCENT = colors.HexColor("#006799")
GREEN_ACCENT = colors.HexColor("#1b5e20")
GOLD_ACCENT = colors.HexColor("#b45309")
SLATE_TEXT = colors.HexColor("#1e293b")
SLATE_MUTED = colors.HexColor("#475569")
BG_LIGHT = colors.HexColor("#f8fafc")
BG_CARD = colors.HexColor("#f1f5f9")
BORDER_LIGHT = colors.HexColor("#cbd5e1")
WHITE = colors.HexColor("#ffffff")
CARD_BORDER_BLUE = colors.HexColor("#93c5fd")
CARD_BG_BLUE = colors.HexColor("#f0f9ff")


class NumberedCanvas(canvas.Canvas):
    """
    Canvas de doble pasada para calcular el total exacto de páginas
    y estampar membretes de encabezado y pie de página en cada hoja.
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_header_footer(num_pages)
            super().showPage()
        super().save()

    def draw_header_footer(self, page_count):
        self.saveState()
        # Omitir membrete en la portada (página 1)
        if self._pageNumber > 1:
            # Header Superior
            self.setFont("Helvetica-Bold", 7.5)
            self.setFillColor(NAVY_PRIMARY)
            self.drawString(40, 755, "COMITÉ DE BIENESTAR • I. MUNICIPALIDAD DE PERALILLO")
            self.setFont("Helvetica", 7.5)
            self.setFillColor(SLATE_MUTED)
            self.drawRightString(572, 755, "INFORME TÉCNICO DE ARQUITECTURA Y CONTEXTO IA")

            # Línea sutil de encabezado
            self.setStrokeColor(BORDER_LIGHT)
            self.setLineWidth(0.6)
            self.line(40, 747, 572, 747)

            # Footer Inferior
            self.setStrokeColor(BORDER_LIGHT)
            self.setLineWidth(0.6)
            self.line(40, 42, 572, 42)

            self.setFont("Helvetica", 7.5)
            self.setFillColor(SLATE_MUTED)
            self.drawString(40, 31, "Bienestar App — Sistema de Gestión Operativa y Financiera • I. Municipalidad de Peralillo")
            self.setFont("Helvetica-Bold", 7.5)
            self.setFillColor(BLUE_ACCENT)
            page_text = f"Página {self._pageNumber} de {page_count}"
            self.drawRightString(572, 31, page_text)
        self.restoreState()


def create_callout(text, title=None, style_body=None, style_title=None, border_color=BLUE_ACCENT, bg_color=CARD_BG_BLUE):
    """Genera una caja de texto destacada tipo Callout."""
    flowables = []
    if title:
        t_style = style_title or ParagraphStyle(
            'CalloutTitle',
            fontName='Helvetica-Bold',
            fontSize=10,
            leading=13,
            textColor=NAVY_PRIMARY,
            spaceAfter=4,
        )
        flowables.append(Paragraph(f"<b>{title}</b>", t_style))

    b_style = style_body or ParagraphStyle(
        'CalloutBody',
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=SLATE_TEXT,
    )
    flowables.append(Paragraph(text, b_style))

    box_table = Table([[flowables]], colWidths=[532])
    box_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), bg_color),
        ('LEFTPADDING', (0, 0), (-1, -1), 12),
        ('RIGHTPADDING', (0, 0), (-1, -1), 12),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LINELEFT', (0, 0), (0, -1), 3.5, border_color),
        ('BOX', (0, 0), (-1, -1), 0.5, BORDER_LIGHT),
    ]))
    return box_table


def build_pdf(output_path):
    doc = SimpleDocTemplate(
        output_path,
        pagesize=letter,
        leftMargin=40,
        rightMargin=40,
        topMargin=52,
        bottomMargin=52,
    )

    styles = getSampleStyleSheet()

    # Estilos tipográficos personalizados
    title_cover_style = ParagraphStyle(
        'CoverTitle',
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=29,
        textColor=NAVY_PRIMARY,
        alignment=0,
        spaceAfter=8,
    )

    subtitle_cover_style = ParagraphStyle(
        'CoverSubtitle',
        fontName='Helvetica',
        fontSize=12.5,
        leading=17,
        textColor=SLATE_MUTED,
        alignment=0,
        spaceAfter=15,
    )

    h1_style = ParagraphStyle(
        'Heading1_Custom',
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=18,
        textColor=NAVY_PRIMARY,
        spaceBefore=14,
        spaceAfter=8,
        keepWithNext=True,
    )

    h2_style = ParagraphStyle(
        'Heading2_Custom',
        fontName='Helvetica-Bold',
        fontSize=10.5,
        leading=14,
        textColor=BLUE_ACCENT,
        spaceBefore=10,
        spaceAfter=5,
        keepWithNext=True,
    )

    body_style = ParagraphStyle(
        'Body_Custom',
        fontName='Helvetica',
        fontSize=8.5,
        leading=12.5,
        textColor=SLATE_TEXT,
        spaceAfter=6,
    )

    body_bold = ParagraphStyle(
        'Body_Bold_Custom',
        parent=body_style,
        fontName='Helvetica-Bold',
    )

    bullet_style = ParagraphStyle(
        'Bullet_Custom',
        parent=body_style,
        leftIndent=15,
        firstLineIndent=-10,
        spaceAfter=4,
    )

    table_header_style = ParagraphStyle(
        'TableHeader',
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10.5,
        textColor=WHITE,
        alignment=0,
    )

    table_cell_style = ParagraphStyle(
        'TableCell',
        fontName='Helvetica',
        fontSize=7.5,
        leading=10,
        textColor=SLATE_TEXT,
    )

    table_cell_code = ParagraphStyle(
        'TableCellCode',
        fontName='Courier-Bold',
        fontSize=7.5,
        leading=9.5,
        textColor=NAVY_PRIMARY,
    )

    story = []

    # =========================================================================
    # 1. PORTADA FORMAL DEL INFORME
    # =========================================================================
    # Franja visual superior simulando identidad municipal
    franja_data = [[""]]
    franja = Table(franja_data, colWidths=[532], rowHeights=[6])
    franja.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), BLUE_ACCENT),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
    ]))
    story.append(franja)
    story.append(Spacer(1, 20))

    tag_style = ParagraphStyle(
        'TagStyle',
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=BLUE_ACCENT,
        spaceAfter=6,
    )
    story.append(Paragraph("PROYECTO UNIVERSITARIO DE DESARROLLO DE SOFTWARE • INFORME TÉCNICO", tag_style))
    story.append(Paragraph("Sistema de Gestión Operativa, Médica y Financiera — Bienestar App", title_cover_style))
    story.append(Paragraph(
        "Arquitectura de Software, Stack Tecnológico, Desglose Estructural de Carpetas y Marco de Contexto Operativo para Inteligencia Artificial.",
        subtitle_cover_style
    ))

    story.append(HRFlowable(width="100%", thickness=1.5, color=BORDER_LIGHT, spaceAfter=18))

    # Tarjeta de Metadatos del Proyecto
    meta_data = [
        [
            Paragraph("<b>Entidad Patrocinante:</b>", body_style),
            Paragraph("Comité de Bienestar — Ilustre Municipalidad de Peralillo", body_style),
        ],
        [
            Paragraph("<b>Marco Legal Chileno:</b>", body_style),
            Paragraph("Ley N° 19.754 (Constitución de Servicios y Comités de Bienestar Municipal)", body_style),
        ],
        [
            Paragraph("<b>Tipo de Documento:</b>", body_style),
            Paragraph("Informe Técnico de Arquitectura, Tecnologías y Manual de Contexto IA", body_style),
        ],
        [
            Paragraph("<b>Arquitectura:</b>", body_style),
            Paragraph("Clean Architecture desacoplada (Frontend Next.js + Backend FastAPI + PostgreSQL)", body_style),
        ],
        [
            Paragraph("<b>Estado de Implementación:</b>", body_style),
            Paragraph("Operativo y Validado (Módulos 1 al 5 desplegados en Docker)", body_style),
        ],
        [
            Paragraph("<b>Fecha de Generación:</b>", body_style),
            Paragraph(f"{datetime.now().strftime('%d de %B de %Y')} — Versión 1.0 Oficial", body_style),
        ],
    ]
    meta_table = Table(meta_data, colWidths=[160, 372])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), BG_CARD),
        ('BOX', (0, 0), (-1, -1), 1, BORDER_LIGHT),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, BORDER_LIGHT),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
    ]))
    story.append(meta_table)

    story.append(Spacer(1, 20))

    # Resumen Ejecutivo en portada
    resumen_box = create_callout(
        "<b>RESUMEN EJECUTIVO:</b> Este documento recopila la totalidad del conocimiento arquitectónico, "
        "tecnológico y funcional del sistema <i>Bienestar App</i>. Explica cómo la plataforma digitaliza "
        "la postulación a cuotas de salud, la rendición de boletas médicas con caducidad a 30 días, el cálculo "
        "de bonos indexados a la escala municipal (Grado 15) y la auditoría inmutable de decisiones directivas. "
        "Asimismo, consagra las directrices y reglas inviolables para que modelos de Inteligencia Artificial (IA) "
        "intervengan el código con precisión quirúrgica y absoluto respeto por la coherencia del negocio.",
        title="Propósito de este Informe",
        border_color=NAVY_PRIMARY,
        bg_color=BG_LIGHT,
    )
    story.append(resumen_box)

    story.append(PageBreak())

    # =========================================================================
    # 2. CAPÍTULO 1: ORIGEN, CONTEXTO Y MARCO LEGAL
    # =========================================================================
    story.append(Paragraph("1. Origen, Contexto y Marco Legal de la Aplicación", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=BLUE_ACCENT, spaceAfter=8))

    story.append(Paragraph(
        "El sistema <b>Bienestar App</b> surge de la necesidad real y concreta de digitalizar los procesos "
        "asistenciales, previsionales y contables del Comité de Bienestar de la <b>Ilustre Municipalidad de Peralillo</b>, "
        "región del Libertador General Bernardo O'Higgins, Chile.",
        body_style
    ))

    story.append(Paragraph("1.1. Fundamentación Legal: Ley N° 19.754", h2_style))
    story.append(Paragraph(
        "En Chile, la <b>Ley N° 19.754</b> autoriza a las municipalidades y a su personal a constituir comités o servicios "
        "de bienestar con el fin de proporcionar prestaciones que contribuyan al bienestar del funcionario y de sus cargas familiares reconocidas. "
        "La ley fija elementos estructurales que rigen esta aplicación:",
        body_style
    ))
    story.append(Paragraph("• <b>Financiamiento Dual:</b> Se compone por el aporte del funcionario mediante un descuento por planilla mensual (fijado en 4% del sueldo base) y el aporte institucional municipal (subvención anual calculada sobre el padrón activo en UTM).", bullet_style))
    story.append(Paragraph("• <b>Autonomía Directiva:</b> El Comité es administrado por un Directorio paritario/colegiado encabezado por el Alcalde o su representante (Presidente) y representantes electos de los funcionarios (Secretario, Tesorero, Directores y Auditor).", bullet_style))
    story.append(Paragraph("• <b>Período de Carencia:</b> Exigencia estatutaria de al menos 6 meses de permanencia continua cotizando para tener derecho a la cobertura de prestaciones y beneficios económicos.", bullet_style))

    story.append(Paragraph("1.2. Problemáticas del Proceso Tradicional y Solución Tecnológica", h2_style))
    story.append(Paragraph(
        "Previo a la conceptualización de este proyecto, la administración de bienestar sufría de fricción operativa crítica:",
        body_style
    ))
    story.append(Paragraph("1. <b>Falta de Visibilidad del Socio:</b> Los funcionarios desconocían su cupo de salud disponible ($150.000 / $250.000) y debían consultar manualmente a la directiva.", bullet_style))
    story.append(Paragraph("2. <b>Riesgo de Prescripción:</b> El reglamento impone que los gastos médicos prescriben a los 30 días corridos; la recepción física en papel provocaba rechazos por demoras de tramitación.", bullet_style))
    story.append(Paragraph("3. <b>Sobregiros Financieros:</b> Al no existir reserva preventiva en tiempo real, múltiples solicitudes en revisión podían superar el fondo disponible asignado.", bullet_style))
    story.append(Paragraph("4. <b>Carencia de Auditoría Legal:</b> La aprobación de cheques y subsidios carecía de traza digital inmutable apta para revisiones de Contraloría General de la República.", bullet_style))

    story.append(Spacer(1, 4))
    story.append(create_callout(
        "<b>Impacto del Sistema:</b> Bienestar App centraliza en un único portal la autosuficiencia del socio "
        "('Hoja Socio'), el control estricto de fechas y comprobantes con visor integrado, la retención preventiva "
        "automática y una bitácora inmutable (AuditLog) que registra cada clic resolutivo del Directorio.",
        title="Valor Público y Operativo",
        border_color=GREEN_ACCENT,
        bg_color=CARD_BG_BLUE,
    ))

    # =========================================================================
    # 3. CAPÍTULO 2: STACK TECNOLÓGICO Y JUSTIFICACIÓN
    # =========================================================================
    story.append(Spacer(1, 10))
    story.append(Paragraph("2. Stack Tecnológico y Justificación de Herramientas", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=BLUE_ACCENT, spaceAfter=8))

    story.append(Paragraph(
        "La selección del stack tecnológico se rigió por estándares de la industria que garantizan tipado estricto, "
        "alto rendimiento asíncrono, mantenibilidad a largo plazo y facilidad de despliegue mediante contenedores:",
        body_style
    ))

    tech_table_data = [
        [
            Paragraph("Capa / Subsistema", table_header_style),
            Paragraph("Tecnología Seleccionada", table_header_style),
            Paragraph("Versión", table_header_style),
            Paragraph("Justificación de Arquitectura y Beneficio", table_header_style),
        ],
        [
            Paragraph("<b>Frontend Framework</b>", table_cell_style),
            Paragraph("Next.js (App Router)", table_cell_code),
            Paragraph("14.1+", table_cell_style),
            Paragraph("Enrutamiento basado en carpetas, renderizado optimizado, Server/Client components desacoplados y rápida respuesta UI.", table_cell_style),
        ],
        [
            Paragraph("<b>Lenguaje Frontend</b>", table_cell_style),
            Paragraph("TypeScript", table_cell_code),
            Paragraph("5.4+", table_cell_style),
            Paragraph("Tipado estático robusto, prevención de errores en tiempo de compilación y consistencia con los contratos del backend.", table_cell_style),
        ],
        [
            Paragraph("<b>Diseño & UI</b>", table_cell_style),
            Paragraph("Tailwind CSS", table_cell_code),
            Paragraph("3.4+", table_cell_style),
            Paragraph("Diseño modular responsivo con paleta cromática oficial de la I. Municipalidad de Peralillo, mobile-first.", table_cell_style),
        ],
        [
            Paragraph("<b>Backend API</b>", table_cell_style),
            Paragraph("FastAPI (Python)", table_cell_code),
            Paragraph("0.110+", table_cell_style),
            Paragraph("Framework asíncrono de alto rendimiento (ASGI/Starlette), documentación interactiva OpenAPI/Swagger automática.", table_cell_style),
        ],
        [
            Paragraph("<b>Validación de Datos</b>", table_cell_style),
            Paragraph("Pydantic", table_cell_code),
            Paragraph("v2.6+", table_cell_style),
            Paragraph("Validación estricta de esquemas, sanitización de entradas, control de fechas pasadas/futuras y parseo ultrarrápido.", table_cell_style),
        ],
        [
            Paragraph("<b>ORM & Persistencia</b>", table_cell_style),
            Paragraph("SQLAlchemy + Asyncpg", table_cell_code),
            Paragraph("2.0+", table_cell_style),
            Paragraph("Mapeo objeto-relacional asíncrono moderno, sesiones seguras no bloqueantes y consultas SQL optimizadas.", table_cell_style),
        ],
        [
            Paragraph("<b>Motor de BD</b>", table_cell_style),
            Paragraph("PostgreSQL", table_cell_code),
            Paragraph("15 Alpine", table_cell_style),
            Paragraph("Base de datos relacional estándar del sector público con soporte completo de transacciones ACID y tipos Enums.", table_cell_style),
        ],
        [
            Paragraph("<b>Orquestación</b>", table_cell_style),
            Paragraph("Docker & Compose", table_cell_code),
            Paragraph("Compose v2", table_cell_style),
            Paragraph("Despliegue unificado y reproducible en cualquier entorno Windows/Linux con volumen persistente para BD y uploads.", table_cell_style),
        ],
        [
            Paragraph("<b>Seguridad & Auth</b>", table_cell_style),
            Paragraph("JWT + Passlib (Bcrypt)", table_cell_code),
            Paragraph("HS256", table_cell_style),
            Paragraph("Autenticación sin estado (stateless), cifrado unidireccional de contraseñas y control de acceso basado en roles (RBAC).", table_cell_style),
        ],
    ]

    t_tech = Table(tech_table_data, colWidths=[95, 115, 52, 270])
    t_tech.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), NAVY_PRIMARY),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_LIGHT),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [WHITE, BG_LIGHT]),
    ]))
    story.append(t_tech)

    story.append(PageBreak())

    # =========================================================================
    # 4. CAPÍTULO 3: ARQUITECTURA DE SOFTWARE Y PATRONES
    # =========================================================================
    story.append(Paragraph("3. Arquitectura del Software y Flujo de Datos", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=BLUE_ACCENT, spaceAfter=8))

    story.append(Paragraph(
        "El proyecto se diseñó bajo los principios de <b>Clean Architecture</b> (Arquitectura Limpia) y separación "
        "de responsabilidades, estructurado como un <i>Monolito Modular Desacoplado</i>. Esta estructura previene "
        "el acoplamiento indebido y permite que el núcleo de las reglas de negocio no dependa de los detalles del framework.",
        body_style
    ))

    story.append(Paragraph("3.1. Modelo de Capas Arquitectónicas", h2_style))

    arch_layers = [
        [
            Paragraph("Capa del Sistema", table_header_style),
            Paragraph("Ubicación Física", table_header_style),
            Paragraph("Responsabilidad Primaria", table_header_style),
        ],
        [
            Paragraph("<b>1. Presentación (UI)</b>", table_cell_style),
            Paragraph("<code>frontend/src/app</code><br/><code>frontend/src/components</code>", table_cell_style),
            Paragraph("Captura la interacción del usuario, renderiza vistas responsivas, ejecuta validaciones visuales inmediatas y envía peticiones HTTP tipadas.", table_cell_style),
        ],
        [
            Paragraph("<b>2. Controladores API</b>", table_cell_style),
            Paragraph("<code>backend/app/api/v1</code>", table_cell_style),
            Paragraph("Expone endpoints RESTful, valida permisos y roles mediante inyección de dependencias (<code>require_roles</code>) y serializa respuestas.", table_cell_style),
        ],
        [
            Paragraph("<b>3. Servicios de Negocio</b>", table_cell_style),
            Paragraph("<code>backend/app/services</code>", table_cell_style),
            Paragraph("Contiene las reglas funcionales puras: cálculo de carencia, validación de caducidad de 30 días, retención preventiva y cálculo de bonos sobre Grado 15.", table_cell_style),
        ],
        [
            Paragraph("<b>4. Validación de Dominio</b>", table_cell_style),
            Paragraph("<code>backend/app/schemas</code>", table_cell_style),
            Paragraph("Modelos Pydantic v2 que formalizan las entradas y salidas, impidiendo inyecciones o datos fuera de rango normativo.", table_cell_style),
        ],
        [
            Paragraph("<b>5. Persistencia & ORM</b>", table_cell_style),
            Paragraph("<code>backend/app/models</code><br/><code>backend/app/db</code>", table_cell_style),
            Paragraph("Entidades SQLAlchemy mapeadas a tablas relacionales con integridad referencial, índices y transacciones asíncronas seguras.", table_cell_style),
        ],
    ]
    t_arch = Table(arch_layers, colWidths=[120, 140, 272])
    t_arch.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), BLUE_ACCENT),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_LIGHT),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [WHITE, BG_LIGHT]),
    ]))
    story.append(t_arch)

    story.append(Paragraph("3.2. Ciclo de Vida de una Transacción Operativa (Ejemplo Reembolso HU-03 / HU-04)", h2_style))
    story.append(Paragraph(
        "A modo de ejemplo representativo del flujo desacoplado, cuando un socio solicita un reembolso médico:",
        body_style
    ))
    story.append(Paragraph("<b>1. Verificación Previa:</b> El frontend consulta el resumen previsional. Si el socio tiene menos de 6 meses de antigüedad, la interfaz bloquea el formulario e informa la carencia.", bullet_style))
    story.append(Paragraph("<b>2. Validación Interactiva:</b> Mientras el usuario digita la fecha del documento, Next.js llama a <code>POST /reembolsos/validar-fecha</code> para advertir si superó los 30 días corridos.", bullet_style))
    story.append(Paragraph("<b>3. Retención Preventiva:</b> Al presionar 'Enviar', el backend verifica el cupo y resta inmediatamente el monto del <code>saldo_salud_disponible</code>, registrando la solicitud en estado <code>en_revision</code>.", bullet_style))
    story.append(Paragraph("<b>4. Carga de Respaldo:</b> En un segundo paso continuo, se envía el comprobante tributario (PDF/Imagen) y se almacena en el volumen seguro <code>/app/uploads/reembolsos</code>.", bullet_style))
    story.append(Paragraph("<b>5. Resolución y Auditoría:</b> La Directiva examina el archivo en el visor embebido. Si aprueba, se consolida el gasto y emite cheque. Si rechaza con motivo, <b>el servicio restituye automáticamente el cupo retenido</b> al socio y registra la traza en <code>audit_logs</code>.", bullet_style))

    # =========================================================================
    # 5. CAPÍTULO 4: ANATOMÍA Y PROPÓSITO DE CADA CARPETA
    # =========================================================================
    story.append(Spacer(1, 10))
    story.append(Paragraph("4. Anatomía y Estructura Integral de Carpetas", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=BLUE_ACCENT, spaceAfter=8))

    story.append(Paragraph(
        "Para que cualquier desarrollador o modelo de Inteligencia Artificial entienda de inmediato dónde reside cada "
        "responsabilidad, a continuación se detalla la función precisa de cada directorio del proyecto:",
        body_style
    ))

    folders_data = [
        [
            Paragraph("Directorio / Archivo", table_header_style),
            Paragraph("Entorno", table_header_style),
            Paragraph("Función y Contenido Técnico Detallado", table_header_style),
        ],
        [
            Paragraph("<code>backend/main.py</code>", table_cell_code),
            Paragraph("Backend", table_cell_style),
            Paragraph("Punto de entrada de FastAPI. Configura CORS, eventos de ciclo de vida (lifespan para inicializar BD) y registra las rutas base <code>/api/v1</code>.", table_cell_style),
        ],
        [
            Paragraph("<code>backend/app/api/</code>", table_cell_code),
            Paragraph("Backend", table_cell_style),
            Paragraph("<b>Controladores REST:</b> <code>deps.py</code> inyecta dependencias de base de datos y control de roles; <code>v1/endpoints/</code> contiene los routers organizados por módulo (afiliacion, reembolsos, beneficios, finanzas, admin, auth).", table_cell_style),
        ],
        [
            Paragraph("<code>backend/app/core/</code>", table_cell_code),
            Paragraph("Backend", table_cell_style),
            Paragraph("<b>Configuración Central:</b> <code>config.py</code> gestiona variables de entorno con Pydantic Settings; <code>security.py</code> maneja tokens JWT y hash Bcrypt.", table_cell_style),
        ],
        [
            Paragraph("<code>backend/app/db/</code>", table_cell_code),
            Paragraph("Backend", table_cell_style),
            Paragraph("<b>Gestión de Base de Datos:</b> <code>session.py</code> provee el motor y sesión asíncrona; <code>init_db.py</code> ejecuta migraciones idempotentes y crea los usuarios semilla.", table_cell_style),
        ],
        [
            Paragraph("<code>backend/app/models/</code>", table_cell_code),
            Paragraph("Backend", table_cell_style),
            Paragraph("<b>Entidades ORM:</b> Declaración de tablas SQLAlchemy (User, SolicitudAfiliacion, SolicitudReembolso, BonoCatalogo, SolicitudBeneficio, AuditLog).", table_cell_style),
        ],
        [
            Paragraph("<code>backend/app/schemas/</code>", table_cell_code),
            Paragraph("Backend", table_cell_style),
            Paragraph("<b>Contratos Pydantic:</b> Validación de esquemas Request/Response, tipos estrictos y validadores de reglas de negocio para entrada/salida.", table_cell_style),
        ],
        [
            Paragraph("<code>backend/app/services/</code>", table_cell_code),
            Paragraph("Backend", table_cell_style),
            Paragraph("<b>Lógica Pura de Negocio:</b> Motores de cálculo independientes de HTTP (reembolsos, topes, cálculo de bonos sobre Grado 15, envíos SMTP).", table_cell_style),
        ],
        [
            Paragraph("<code>frontend/src/app/</code>", table_cell_code),
            Paragraph("Frontend", table_cell_style),
            Paragraph("<b>Rutas App Router:</b> Vistas principales de la aplicación web: <code>/</code> (Dashboard), <code>/afiliacion</code>, <code>/reembolsos</code>, <code>/aprobaciones</code>, <code>/beneficios</code>, <code>/finanzas</code>, <code>/admin</code>, <code>/login</code>.", table_cell_style),
        ],
        [
            Paragraph("<code>frontend/src/components/</code>", table_cell_code),
            Paragraph("Frontend", table_cell_style),
            Paragraph("<b>Componentes UI Modulares:</b> Organizados por dominio (admin, afiliacion, beneficios, reembolsos, ui) para máxima reutilización y limpieza visual.", table_cell_style),
        ],
        [
            Paragraph("<code>frontend/src/context/</code>", table_cell_code),
            Paragraph("Frontend", table_cell_style),
            Paragraph("<b>Estado Global:</b> <code>AuthContext.tsx</code> encapsula la sesión del usuario, token JWT, carga de perfil y métodos de inicio y cierre de sesión.", table_cell_style),
        ],
        [
            Paragraph("<code>frontend/src/layouts/</code>", table_cell_code),
            Paragraph("Frontend", table_cell_style),
            Paragraph("<b>Estructura Visual:</b> Componentes de envoltura estructural como <code>Sidebar.tsx</code>, <code>Header.tsx</code> y <code>MainLayout.tsx</code>.", table_cell_style),
        ],
        [
            Paragraph("<code>frontend/src/lib/</code>", table_cell_code),
            Paragraph("Frontend", table_cell_style),
            Paragraph("<b>Utilidades Cliente:</b> <code>api.ts</code> provee clientes fetch tipados para endpoints y carga multipart; <code>utils.ts</code> formatea CLP y valida RUT chileno.", table_cell_style),
        ],
        [
            Paragraph("<code>frontend/src/types/</code>", table_cell_code),
            Paragraph("Frontend", table_cell_style),
            Paragraph("<b>Contratos TypeScript:</b> <code>index.ts</code> contiene todas las interfaces de dominio sincronizadas exactamente con los esquemas del backend.", table_cell_style),
        ],
        [
            Paragraph("<code>docs/</code>", table_cell_code),
            Paragraph("Transversal", table_cell_style),
            Paragraph("<b>Documentación Viva:</b> Especificaciones de historias de usuario (HU-01 a HU-10), cuestionarios con el cliente y supuestos reglamentarios.", table_cell_style),
        ],
        [
            Paragraph("<code>CONTEXTO_IA.md</code>", table_cell_code),
            Paragraph("Raíz", table_cell_style),
            Paragraph("<b>Manual de Contexto IA:</b> Guía de referencia operativa inmediata para que cualquier modelo de lenguaje sepa cómo intervenir el código.", table_cell_style),
        ],
    ]

    t_folders = Table(folders_data, colWidths=[130, 62, 340])
    t_folders.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), NAVY_PRIMARY),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_LIGHT),
        ('TOPPADDING', (0, 0), (-1, -1), 3.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3.5),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [WHITE, BG_LIGHT]),
    ]))
    story.append(t_folders)

    story.append(PageBreak())

    # =========================================================================
    # 6. CAPÍTULO 5: MÓDULOS DE NEGOCIO Y REGLAS OPERATIVAS (HU-01 A HU-10)
    # =========================================================================
    story.append(Paragraph("5. Módulos Funcionales y Reglas de Negocio (HU-01 a HU-10)", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=BLUE_ACCENT, spaceAfter=8))

    story.append(Paragraph(
        "El sistema implementa 10 Historias de Usuario (HU) agrupadas en 5 módulos funcionales con estricto apego "
        "a la normativa municipal chilena:",
        body_style
    ))

    # Módulo 1
    story.append(Paragraph("5.1. Módulo 1: Afiliación, Socios y Cargas Familiares (HU-01 y HU-02)", h2_style))
    story.append(Paragraph("• <b>Postulación en Línea (HU-01):</b> Formulario digital sin sesión previa para funcionarios municipales (Planta y Contrata). Período reglamentario de recepción de solicitudes: enero a junio.", bullet_style))
    story.append(Paragraph("• <b>Descuento por Planilla:</b> Es requisito indispensable autorizar expresamente el descuento del 4% del sueldo base mensual.", bullet_style))
    story.append(Paragraph("• <b>Acreditación de Cargas:</b> Registro de cargas legales con verificación de RUN y carga de certificados civiles de respaldo (Nacimiento, Matrimonio, Acuerdo de Unión Civil).", bullet_style))
    story.append(Paragraph("• <b>Resolución de Directorio (HU-02):</b> Solo Presidente o Secretario pueden aprobar/rechazar solicitudes en sesión formal con N° de Acta. Al aprobar, el sistema calcula la fecha de término de carencia (+6 meses) y crea automáticamente la cuenta de usuario.", bullet_style))

    # Módulo 2
    story.append(Paragraph("5.2. Módulo 2: Reembolsos Médicos y Salud (HU-03 y HU-04)", h2_style))
    story.append(Paragraph("• <b>Bloqueo por Carencia:</b> Exige un mínimo estricto de 6 meses de permanencia continua cotizando. El sistema calcula y proyecta la fecha en que quedará habilitado.", bullet_style))
    story.append(Paragraph("• <b>Caducidad de 30 Días Corridos:</b> Ningún gasto médico, dental o farmacéutico puede superar los 30 días corridos de antigüedad. El sistema valida esta regla en tiempo real.", bullet_style))
    story.append(Paragraph("• <b>Tope Anual y Retención Preventiva:</b> El socio dispone de un fondo anual ($150.000). Al solicitar un reembolso, el monto se retiene de forma inmediata para evitar sobregiros.", bullet_style))
    story.append(Paragraph("• <b>Bandeja de Aprobaciones y Restitución (HU-04):</b> La Directiva examina el comprobante en un visor embebido de alta resolución. Si se rechaza, el motivo es obligatorio y el sistema restituye de inmediato el saldo retenido.", bullet_style))

    # Módulo 3
    story.append(Paragraph("5.3. Módulo 3: Beneficios Sociales y Bonos (HU-05 y HU-06)", h2_style))
    story.append(Paragraph("• <b>Indexación Dinámica al Grado 15:</b> Los bonos se calculan como un porcentaje directo del Sueldo Imponible de Referencia del Grado 15 Municipal (configurable, por defecto $750.000 CLP).", bullet_style))
    story.append(Paragraph("• <b>Catálogo de Beneficios (HU-05):</b> Bono Vacaciones (15% G15), Bono Escolaridad (8% G15 con cert. de alumno regular hasta los 24 años), Bono Nacimiento (20% G15), Fallecimiento de Afiliado (50% G15), Catástrofes / Incendios (50% G15) y Enfermedad Catastrófica (100% G15).", bullet_style))
    story.append(Paragraph("• <b>Liquidación Masiva de Calendario (HU-06):</b> Módulo para ejecutar el Bono de Invierno (15% en agosto) y el Bono de Navidad (10% a 15% según acuerdo de Directorio en diciembre) mediante nóminas masivas.", bullet_style))

    # Módulo 4
    story.append(Paragraph("5.4. Módulo 4: Control Financiero y Aportes Municipales (HU-07 y HU-08)", h2_style))
    story.append(Paragraph("• <b>Nómina de Retenciones RRHH (HU-07):</b> Generación del listado consolidado de socios activos con el 4% autorizado para cruce con Remuneraciones y cuenta corriente municipal.", bullet_style))
    story.append(Paragraph("• <b>Fórmula de Aporte Municipal (HU-08):</b> Cálculo de la subvención institucional anual aplicando la fórmula reglamentaria: <i>Socios Activos al 31 de Diciembre × 4 UTM × Valor UTM a la fecha del decreto</i>.", bullet_style))

    # Módulo 5
    story.append(Paragraph("5.5. Módulo 5: Seguridad, Perfiles y Auditoría Inmutable (HU-09 y HU-10)", h2_style))
    story.append(Paragraph("• <b>Estructura de Roles de Directiva (HU-09):</b> Cuentas con privilegios específicos: Presidente, Secretario, Tesorero, Directiva/Admin, Auditor/Revisor y Socio Activo. Máximo 7 cuentas directivas con voto.", bullet_style))
    story.append(Paragraph("• <b>Bitácora Inmutable (AuditLog):</b> Registro append-only que graba RUN, nombre, rol, IP, timestamp, módulo y detalle ante cualquier resolución sensible. No puede ser borrada ni modificada.", bullet_style))
    story.append(Paragraph("• <b>Hoja de Socio (HU-10):</b> Portal de transparencia donde cada afiliado monitorea en vivo su cartola histórica de salud, transacciones, montos retenidos y estado previsional.", bullet_style))

    # =========================================================================
    # 7. CAPÍTULO 6: MANUAL DE ACTUACIÓN PARA LA IA
    # =========================================================================
    story.append(Spacer(1, 10))
    story.append(Paragraph("6. Protocolo y Manual de Actuación para Inteligencia Artificial", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=BLUE_ACCENT, spaceAfter=8))

    story.append(Paragraph(
        "Este capítulo define las directrices que debe seguir cualquier agente de Inteligencia Artificial que "
        "intervenga el repositorio en el futuro a fin de preservar la arquitectura y las reglas del negocio:",
        body_style
    ))

    rules_data = [
        [
            Paragraph("Directriz Normativa para la IA", table_header_style),
            Paragraph("Regla de Implementación Inviolable", table_header_style),
        ],
        [
            Paragraph("<b>1. Consulta Previa Obligatoria</b>", table_cell_style),
            Paragraph("Antes de modificar código, la IA debe leer <code>CONTEXTO_IA.md</code> para alinear cualquier cambio con los supuestos normativos ya confirmados con el cliente.", table_cell_style),
        ],
        [
            Paragraph("<b>2. Integridad de Auditoría</b>", table_cell_style),
            Paragraph("Toda nueva acción resolutiva o cambio de estado sensible debe invocar a <code>registrar_auditoria()</code> insertando una fila inmutable en <code>audit_logs</code>.", table_cell_style),
        ],
        [
            Paragraph("<b>3. Sincronización de Tipos</b>", table_cell_style),
            Paragraph("Si se modifica un esquema Pydantic en <code>backend/app/schemas</code>, se debe actualizar obligatoriamente su interfaz TypeScript equivalente en <code>frontend/src/types/index.ts</code>.", table_cell_style),
        ],
        [
            Paragraph("<b>4. Convención Monetaria Chilena</b>", table_cell_style),
            Paragraph("La moneda es el Peso Chileno (CLP), sin decimales, con punto de miles (ej: <code>$150.000</code>). Usar siempre la utilidad cliente <code>formatCurrency()</code> de <code>@/lib/utils</code>.", table_cell_style),
        ],
        [
            Paragraph("<b>5. Validación de RUN / RUT</b>", table_cell_style),
            Paragraph("Los identificadores de personas deben normalizarse con guion y dígito verificador. Usar las funciones <code>formatRun</code> y <code>isValidRun</code> de <code>@/lib/utils</code>.", table_cell_style),
        ],
        [
            Paragraph("<b>6. Estilo Didáctico</b>", table_cell_style),
            Paragraph("Mantener los comentarios con la marca <code>[ESTUDIANTE INFORMÁTICA]</code> explicando con claridad conceptual qué hace cada bloque y qué permite en el sistema.", table_cell_style),
        ],
        [
            Paragraph("<b>7. Registro de Decisiones</b>", table_cell_style),
            Paragraph("Al completar cualquier cambio relevante, la IA debe añadir una fila al historial de cambios al pie de <code>CONTEXTO_IA.md</code> documentando la intervención.", table_cell_style),
        ],
    ]
    t_rules = Table(rules_data, colWidths=[160, 372])
    t_rules.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), NAVY_PRIMARY),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_LIGHT),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [WHITE, BG_LIGHT]),
    ]))
    story.append(t_rules)

    story.append(PageBreak())

    # =========================================================================
    # 8. CAPÍTULO 7: CREDENCIALES DE PRUEBA Y CONCLUSIONES
    # =========================================================================
    story.append(Paragraph("7. Credenciales de Prueba, Conclusiones y Próximos Pasos", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=BLUE_ACCENT, spaceAfter=8))

    story.append(Paragraph("7.1. Cuentas Semilla Preconfiguradas para Pruebas (Ambiente de Desarrollo)", h2_style))
    story.append(Paragraph(
        "El archivo <code>backend/app/db/init_db.py</code> inicializa de forma automática e idempotente las "
        "siguientes cuentas de prueba para validar los distintos perfiles de acceso:",
        body_style
    ))

    cred_data = [
        [
            Paragraph("Rol Funcional", table_header_style),
            Paragraph("Nombre y Cargo", table_header_style),
            Paragraph("RUT de Acceso", table_header_style),
            Paragraph("Correo Institucional", table_header_style),
            Paragraph("Clave Inicial", table_header_style),
        ],
        [
            Paragraph("<b>Superusuario</b>", table_cell_style),
            Paragraph("Super Administrador (TI)", table_cell_style),
            Paragraph("11.111.111-1", table_cell_code),
            Paragraph("superadmin@mperalillo.cl", table_cell_style),
            Paragraph("Super#2026", table_cell_code),
        ],
        [
            Paragraph("<b>Presidente</b>", table_cell_style),
            Paragraph("María Elena Soto", table_cell_style),
            Paragraph("12.345.678-9", table_cell_code),
            Paragraph("msoto@mperalillo.cl", table_cell_style),
            Paragraph("Presi#2026", table_cell_code),
        ],
        [
            Paragraph("<b>Secretario</b>", table_cell_style),
            Paragraph("Patricia Fuentes R.", table_cell_style),
            Paragraph("13.456.789-0", table_cell_code),
            Paragraph("pfuentes@mperalillo.cl", table_cell_style),
            Paragraph("Secre#2026", table_cell_code),
        ],
        [
            Paragraph("<b>Tesorero</b>", table_cell_style),
            Paragraph("Roberto Morales P.", table_cell_style),
            Paragraph("14.982.112-4", table_cell_code),
            Paragraph("rmorales@mperalillo.cl", table_cell_style),
            Paragraph("Teso#2026", table_cell_code),
        ],
        [
            Paragraph("<b>Admin / Directiva</b>", table_cell_style),
            Paragraph("Jorge Contreras L.", table_cell_style),
            Paragraph("16.234.567-8", table_cell_code),
            Paragraph("jcontreras@mperalillo.cl", table_cell_style),
            Paragraph("Admin#2026", table_cell_code),
        ],
        [
            Paragraph("<b>Revisor / Auditor</b>", table_cell_style),
            Paragraph("Andrea Ibarra V.", table_cell_style),
            Paragraph("17.345.678-K", table_cell_code),
            Paragraph("aibarra@mperalillo.cl", table_cell_style),
            Paragraph("Audit#2026", table_cell_code),
        ],
        [
            Paragraph("<b>Socio Activo (>6m)</b>", table_cell_style),
            Paragraph("Carlos Valenzuela M.", table_cell_style),
            Paragraph("15.489.123-K", table_cell_code),
            Paragraph("cvalenzuela@mperalillo.cl", table_cell_style),
            Paragraph("Socio#2026", table_cell_code),
        ],
        [
            Paragraph("<b>Socia Nueva (<6m)</b>", table_cell_style),
            Paragraph("Francisca Sepúlveda T.", table_cell_style),
            Paragraph("19.876.543-2", table_cell_code),
            Paragraph("fsepulveda@mperalillo.cl", table_cell_style),
            Paragraph("Socio#2026", table_cell_code),
        ],
    ]
    t_cred = Table(cred_data, colWidths=[90, 115, 75, 162, 90])
    t_cred.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), NAVY_PRIMARY),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_LIGHT),
        ('TOPPADDING', (0, 0), (-1, -1), 3.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3.5),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [WHITE, BG_LIGHT]),
    ]))
    story.append(t_cred)

    story.append(Paragraph("7.2. Conclusiones Técnicas del Proyecto Universitario", h2_style))
    story.append(Paragraph(
        "La arquitectura implementada para el <b>Comité de Bienestar de la I. Municipalidad de Peralillo</b> "
        "demuestra la viabilidad y potencia de integrar un stack moderno (Next.js 14 + FastAPI + PostgreSQL) bajo "
        "principios de alta cohesión y bajo acoplamiento. La separación estricta entre presentación, servicios de negocio "
        "y persistencia relacional garantiza que el sistema no solo resuelva las exigencias académicas de la carrera, "
        "sino que constituya una solución de calidad corporativa lista para operar en un entorno municipal real.",
        body_style
    ))

    story.append(Spacer(1, 8))
    conclusion_box = create_callout(
        "<b>ESTADO DEL ARTE Y CONTINUIDAD:</b> Gracias a la creación simultánea del archivo <code>CONTEXTO_IA.md</code> "
        "y este informe técnico, el proyecto queda totalmente preparado para recibir futuras iteraciones, integraciones "
        "con el servidor de correos institucional (SMTP) o pasarelas de pago bancario de BancoEstado, manteniendo "
        "la misma rigurosidad técnica y legal.",
        title="Síntesis Final",
        border_color=GOLD_ACCENT,
        bg_color=BG_LIGHT,
    )
    story.append(conclusion_box)

    # Construir documento utilizando NumberedCanvas
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Informe PDF generado exitosamente en: {output_path}")


if __name__ == "__main__":
    out_dir = os.path.dirname(os.path.abspath(__file__))
    docs_dir = os.path.join(out_dir, "docs")
    os.makedirs(docs_dir, exist_ok=True)

    pdf_docs_path = os.path.join(docs_dir, "Informe_Arquitectura_Tecnica_BienestarApp.pdf")
    pdf_root_path = os.path.join(out_dir, "Informe_Proyecto_BienestarApp.pdf")

    build_pdf(pdf_docs_path)

    # Copiar también a la raíz de bienestar-app para acceso rápido
    import shutil
    shutil.copyfile(pdf_docs_path, pdf_root_path)
    print(f"Copia del PDF creada en la raíz: {pdf_root_path}")
