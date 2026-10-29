# 📋 Preguntas sobre el Modelo de Negocio — Comité de Bienestar

Registro vivo de dudas surgidas durante el desarrollo. Cada pregunta indica el **supuesto actual** implementado en el sistema, para que el actor de interés lo confirme o corrija.

> **Instrucciones para el entrevistado:** marque ✅ si el supuesto es correcto o escriba la respuesta correcta en el campo *Respuesta*.

---

## 1. Módulo de Afiliación, Socios y Cargas Familiares (HU-01)

### 1.1 Período de postulación
| # | Pregunta | Supuesto actual | Respuesta |
| :-- | :-- | :-- | :-- |
| P-01 | ¿"Enero a junio del año en curso" corresponde al período en que se **reciben** las solicitudes de incorporación? | Sí: solo se aceptan solicitudes del 1 de enero al 30 de junio. | |
| P-02 | ¿Qué ocurre con un funcionario que ingresa al municipio después de junio? ¿Debe esperar al año siguiente o existe una excepción? | Debe esperar al próximo período. | |
| P-03 | ¿El período puede cambiar año a año (lo define la Directiva) o es fijo por reglamento? | Fijo (configurable técnicamente). | |

### 1.2 Quién postula y datos requeridos
| # | Pregunta | Supuesto actual | Respuesta |
| :-- | :-- | :-- | :-- |
| P-04 | ¿El funcionario postula sin cuenta en el sistema (formulario público)? ¿O el municipio le crea una cuenta antes? | Formulario público, sin login. | |
| P-05 | ¿Pueden afiliarse funcionarios a **Honorarios** o Código del Trabajo, o solo Planta y Contrata? | Solo Planta y Contrata. | |
| P-06 | ¿Qué formato tiene el "Grado"? (ej. número 1–20, letra, escalafón) | Texto libre de hasta 10 caracteres. | |
| P-07 | ¿Se requieren otros datos? (correo, teléfono, dirección, departamento/unidad, fecha de ingreso al municipio, cuenta bancaria) | Solo correo opcional. | |
| P-08 | ¿Se debe adjuntar documentación (contrato, decreto de nombramiento, certificados)? | No se adjunta nada. | |

### 1.3 Cargas familiares
| # | Pregunta | Supuesto actual | Respuesta |
| :-- | :-- | :-- | :-- |
| P-09 | ¿Qué parentescos son válidos como carga legal? (cónyuge, conviviente civil, hijos, padres, otros) | Cónyuge, conviviente civil, hijo(a), padre/madre, otro. | |
| P-10 | ¿Cómo se **acredita** una carga? ¿Certificado de asignación familiar, de nacimiento, otro documento? ¿Se adjunta en el formulario? | Solo se declaran nombre y RUN; sin adjuntos. | |
| P-11 | ¿Hay límite de edad para hijos (ej. 18 años o 24 si estudian)? | Sin límite. | |
| P-12 | ¿Existe un número máximo de cargas por socio? | Máximo 15 (técnico). | |
| P-13 | ¿Las cargas pueden agregarse o eliminarse después de la afiliación? ¿Con qué procedimiento? | Pendiente de definir. | |
| P-14 | ¿Una misma persona puede ser carga de dos socios (ej. hijo de dos funcionarios)? | No validado. | |

### 1.4 Descuento por planilla
| # | Pregunta | Supuesto actual | Respuesta |
| :-- | :-- | :-- | :-- |
| P-15 | ¿El 4% se calcula siempre sobre el **sueldo base** o sobre otra remuneración? ¿Existe un tope o monto mínimo? | 4% del sueldo base, sin tope. | |
| P-16 | ¿Desde cuándo se descuenta: desde el envío, desde la aprobación o desde el mes siguiente? | Desde la aprobación. | |
| P-17 | ¿El sistema debe registrar los descuentos mensuales (integración con remuneraciones) o solo la autorización? | Solo la autorización. | |
| P-18 | ¿Se descuenta adicionalmente por cada carga? | No. | |

### 1.5 Aprobación, Directorio y Antigüedad (HU-02)
| # | Pregunta | Supuesto actual | Respuesta |
| :-- | :-- | :-- | :-- |
| P-19 | ¿Quién aprueba o rechaza la solicitud? (Presidente, Directiva en sesión, Secretario) ¿Se requiere acta o acuerdo? | **Presidente/a** o **Secretario/a** (o Superusuario) con registro de Fecha de Sesión y N° de Acta ordinaria. | |
| P-20 | ¿Cuál es el plazo reglamentario para sesionar y resolver una postulación ingresada? | No definido (queda en "Pendiente de aprobación" hasta que se sesione). | |
| P-21 | ¿Cuáles son las causales de rechazo más comunes? ¿Es obligatorio el ingreso de observaciones manuales detalladas? | Sí: al rechazar es obligatorio detallar observaciones para que el funcionario subsane inconsistencias. | |
| P-22 | ¿Desde qué fecha exacta se computa la antigüedad y el inicio de los 6 meses de carencia? | Se computa exactamente desde la **Fecha de la Sesión Ordinaria** de Directorio ingresada por la autoridad al aprobar. | |
| P-23 | ¿Cómo se notifica al funcionario el resultado (rechazo con observaciones o aprobación)? | Actualmente se almacena en el sistema y comprobante digital consultable por folio; la notificación por correo SMTP queda lista para integrarse con servidor de correos municipal. | |
| P-24 | Al aprobarse, ¿el sistema debe crear automáticamente la cuenta de acceso de socio? | Sí: el sistema genera automáticamente el usuario con rol "Socio Activo", estado previsional "Al día" y contraseña temporal `Socio#2026`. | |
| P-25 | ¿Cómo debe enviarse la Nómina de Retenciones mensual a Recursos Humanos / Remuneraciones? | El módulo de Finanzas provee la lista de socios activos con el 4% autorizado para exportación o consulta de RRHH. | |

### 1.6 Período de carencia
| # | Pregunta | Supuesto actual | Respuesta |
| :-- | :-- | :-- | :-- |
| P-26 | ¿Los 6 meses de carencia aplican a **todos** los beneficios, o hay excepciones (ej. fallecimiento, catástrofe)? | Aplica a todos los beneficios y reembolsos por defecto. | |
| P-27 | ¿Qué significa "continuos"? Si el socio deja de cotizar un mes (licencia, permiso sin goce), ¿se reinicia el conteo? | No contemplado. | |
| P-28 | ¿Cuál es el texto reglamentario oficial exacto que debe mostrarse? (artículo del reglamento) | Texto redactado por el equipo de desarrollo. | |

---
## Modulo 2 Reembolsos medicos y salud. 
¿Cual es el tope minimo y maximo para realizar el reembolso?
R: No hay minimo y el valor maximo a $150.000.

¿Como es el proceso de pago o deposito (ahorro)?
¿Como es el proceso de pago de bonificaciones???
¿Hay algún plazo en el que el admin deba autorizar o rechazar el pago? Que pasa si no lo autoriza en un tiempo?
¿Quienes tienen permisos para aprobar o rechazar los beneficios.?


## x. Generales del sistema
| # | Pregunta | Supuesto actual | Respuesta |
| :-- | :-- | :-- | :-- |
| G-01 | ¿Qué roles existen realmente en la Directiva y qué puede hacer cada uno? | Presidente y Secretario tienen poder resolutivo de incorporaciones en sesión; Tesorero, Admin y Auditor tienen vista consultiva y auditoría; Socio gestiona sus prestaciones. | |
| G-02 | ¿Existe un reglamento interno del Comité que podamos revisar? | Se solicita copia. | |

---

*Última actualización: HU-01 (Afiliación) y HU-02 (Aprobación en Sesión de Directorio y Nómina de Retenciones).*




