import xml.etree.ElementTree as ET
import subprocess
import json

def verify():
    sql = """
    SELECT json_object_agg(table_name, col_count) FROM (
        SELECT table_name, count(column_name) as col_count
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name NOT LIKE 'v_%'
        GROUP BY table_name
    ) t;
    """
    cmd = ['docker', 'exec', '-i', 'bienestar_postgres', 'psql', '-U', 'bienestar_user', '-d', 'bienestar_db', '-t', '-A', '-c', sql]
    res = subprocess.run(cmd, capture_output=True, text=True)
    db_counts = json.loads(res.stdout.strip())

    tree = ET.parse('bienestar-app/docs/evidencias_bd/bienestar_mer_oficial.drawio')
    root = tree.getroot()

    print("=== AUDITORÍA MATEMÁTICA 1:1 (POSTGRESQL vs DRAW.IO) ===")
    all_matched = True
    total_drawio = 0
    for tname, expected_count in sorted(db_counts.items()):
        body_cell = root.find(f".//mxCell[@id='{tname}_body']")
        val = body_cell.get('value', '')
        cols = [c for c in val.split('<br/>') if c.strip()]
        actual_count = len(cols)
        total_drawio += actual_count
        match = "MATCH 1:1" if actual_count == expected_count else "ERROR"
        if actual_count != expected_count:
            all_matched = False
        print(f"• {tname:<30}: BD={expected_count:>2} | Draw.io={actual_count:>2} | {match}")

    print("---------------------------------------------------------")
    print(f"Total Columnas Motor PostgreSQL: {sum(db_counts.values())}")
    print(f"Total Columnas Diagrama Draw.io: {total_drawio}")
    print(f"¿Integridad Absoluta 1:1?: {all_matched}")

if __name__ == '__main__':
    verify()
