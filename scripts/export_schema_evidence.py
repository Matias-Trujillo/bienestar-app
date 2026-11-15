"""
Script de extracción de metadatos y esquemas oficiales de la base de datos PostgreSQL
para el proyecto Bienestar-App (Comité de Bienestar - I. Municipalidad de Peralillo).
Genera la documentación técnica fidedigna de las 11 entidades y el diagrama MER.
"""
import os
import subprocess
import json

def get_db_metadata():
    sql = """
    SELECT json_build_object(
        'tables', (
            SELECT json_agg(json_build_object(
                'table_name', t.table_name,
                'columns', (
                    SELECT json_agg(json_build_object(
                        'column_name', c.column_name,
                        'data_type', c.data_type,
                        'is_nullable', c.is_nullable,
                        'column_default', c.column_default
                    ) ORDER BY c.ordinal_position)
                    FROM information_schema.columns c
                    WHERE c.table_schema = 'public' AND c.table_name = t.table_name
                ),
                'primary_keys', (
                    SELECT coalesce(json_agg(kcu.column_name), '[]'::json)
                    FROM information_schema.table_constraints tc
                    JOIN information_schema.key_column_usage kcu
                      ON tc.constraint_name = kcu.constraint_name
                     AND tc.table_schema = kcu.table_schema
                    WHERE tc.constraint_type = 'PRIMARY KEY'
                      AND tc.table_schema = 'public'
                      AND tc.table_name = t.table_name
                ),
                'foreign_keys', (
                    SELECT coalesce(json_agg(json_build_object(
                        'column', kcu.column_name,
                        'foreign_table', ccu.table_name,
                        'foreign_column', ccu.column_name
                    )), '[]'::json)
                    FROM information_schema.table_constraints tc
                    JOIN information_schema.key_column_usage kcu
                      ON tc.constraint_name = kcu.constraint_name
                     AND tc.table_schema = kcu.table_schema
                    JOIN information_schema.constraint_column_usage ccu
                      ON ccu.constraint_name = tc.constraint_name
                     AND ccu.table_schema = tc.table_schema
                    WHERE tc.constraint_type = 'FOREIGN KEY'
                      AND tc.table_schema = 'public'
                      AND tc.table_name = t.table_name
                ),
                'row_count', (
                    SELECT count_rows(t.table_name)
                )
            ))
            FROM information_schema.tables t
            WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
        )
    );
    """
    # Create helper function count_rows if needed
    setup_fn = """
    CREATE OR REPLACE FUNCTION count_rows(tab text) RETURNS bigint AS $$
    DECLARE
        result bigint;
    BEGIN
        EXECUTE format('SELECT count(*) FROM %I', tab) INTO result;
        RETURN result;
    END;
    $$ LANGUAGE plpgsql;
    """
    
    cmd_setup = [
        "docker", "exec", "-i", "bienestar_postgres",
        "psql", "-U", "bienestar_user", "-d", "bienestar_db", "-c", setup_fn
    ]
    subprocess.run(cmd_setup, capture_output=True, text=True)

    cmd_query = [
        "docker", "exec", "-i", "bienestar_postgres",
        "psql", "-U", "bienestar_user", "-d", "bienestar_db", "-t", "-A", "-c", sql
    ]
    res = subprocess.run(cmd_query, capture_output=True, text=True)
    if res.returncode != 0:
        print("Error al consultar PostgreSQL:", res.stderr)
        return None
    
    return json.loads(res.stdout.strip())

def generate_markdown(data, output_dir):
    os.makedirs(output_dir, exist_ok=True)
    tables = data.get("tables", [])
    tables = sorted(tables, key=lambda x: x["table_name"])

    md_lines = [
        "# 📊 Evidencia Técnica Oficial de Base de Datos PostgreSQL 15",
        "**Proyecto:** Bienestar-App • Comité de Bienestar — I. Municipalidad de Peralillo",
        "**Fuente:** Extracción directa de catálogo `information_schema` en contenedor `bienestar_postgres`",
        "**Base de Datos:** `bienestar_db` | **Motor:** PostgreSQL 15-alpine\n",
        "---",
        "## 1. Resumen de Entidades Físicas en la Base de Datos\n",
        "| N° | Nombre de Tabla Física | N° Columnas | Clave Primaria (PK) | Claves Foráneas (FK) | Registros Actuales |",
        "| :--- | :--- | :--- | :--- | :--- | :--- |"
    ]

    for idx, t in enumerate(tables, 1):
        pk_str = ", ".join(t["primary_keys"]) if t["primary_keys"] else "Ninguna"
        fk_str = f"{len(t['foreign_keys'])} relaciones" if t["foreign_keys"] else "0"
        md_lines.append(f"| {idx} | `{t['table_name']}` | {len(t['columns'])} | `{pk_str}` | {fk_str} | {t['row_count']} |")

    md_lines.append("\n---\n## 2. Diagrama Entidad-Relación (MER Oficial en Mermaid)\n")
    md_lines.append("```mermaid")
    md_lines.append("erDiagram")
    for t in tables:
        tname = t["table_name"]
        md_lines.append(f"    {tname} {{")
        for c in t["columns"]:
            cname = c["column_name"]
            ctype = c["data_type"].replace(" ", "_")
            pk_tag = "PK" if cname in t["primary_keys"] else ""
            fk_tag = "FK" if any(fk["column"] == cname for fk in t["foreign_keys"]) else ""
            tag = f"{pk_tag} {fk_tag}".strip()
            md_lines.append(f"        {ctype} {cname} {tag}")
        md_lines.append("    }")

    # Relations
    for t in tables:
        tname = t["table_name"]
        for fk in t["foreign_keys"]:
            md_lines.append(f"    {fk['foreign_table']} ||--o{{ {tname} : \"{fk['column']} -> {fk['foreign_column']}\"")
    md_lines.append("```\n")

    md_lines.append("\n---\n## 3. Fichas Técnicas de Atributos por Entidad (Reemplazo Figuras 3 a 13)\n")
    for idx, t in enumerate(tables, 1):
        tname = t["table_name"]
        md_lines.append(f"### 3.{idx}. Tabla: `{tname}` ({t['row_count']} registros)")
        md_lines.append("| Columna | Tipo de Dato PostgreSQL | ¿Permite Nulos? | Rol de Clave | Valor por Defecto |")
        md_lines.append("| :--- | :--- | :--- | :--- | :--- |")
        for c in t["columns"]:
            cname = c["column_name"]
            ctype = c["data_type"]
            nullable = "SÍ" if c["is_nullable"] == "YES" else "**NO**"
            role = ""
            if cname in t["primary_keys"]:
                role = "🔑 **PRIMARY KEY**"
            for fk in t["foreign_keys"]:
                if fk["column"] == cname:
                    role = f"🔗 **FOREIGN KEY** (`{fk['foreign_table']}.{fk['foreign_column']}`)"
            default = f"`{c['column_default']}`" if c["column_default"] else "-"
            # Truncate long nextval sequences for neatness
            if "nextval" in default:
                default = "`AUTO_INCREMENT (SERIAL)`"
            md_lines.append(f"| `{cname}` | `{ctype}` | {nullable} | {role} | {default} |")
        md_lines.append("")

    report_path = os.path.join(output_dir, "REPORTE_OFICIAL_BASE_DATOS.md")
    with open(report_path, "w", encoding="utf-8") as f:
        f.write("\n".join(md_lines))
    print(f"Reporte generado exitosamente en: {report_path}")

if __name__ == "__main__":
    data = get_db_metadata()
    if data:
        generate_markdown(data, "docs/evidencias_bd")
