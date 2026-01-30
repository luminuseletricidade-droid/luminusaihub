#!/usr/bin/env python3
import os, psycopg2
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).parent / '.env')
conn = psycopg2.connect(os.getenv('DATABASE_URL'))
cur = conn.cursor()

# Check client_status columns
print('=== CLIENT_STATUS COLUMNS ===')
cur.execute("""
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'client_status'
ORDER BY ordinal_position
""")
for row in cur.fetchall():
    print(f'  {row[0]}: {row[1]}')

print('\n=== MAINTENANCE_STATUS COLUMNS ===')
cur.execute("""
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'maintenance_status'
ORDER BY ordinal_position
""")
for row in cur.fetchall():
    print(f'  {row[0]}: {row[1]}')

print('\n=== CLIENT_STATUS DATA ===')
cur.execute('SELECT name, color, description FROM client_status')
for row in cur.fetchall():
    print(f'  {row[0]}: color={row[1]}, desc={row[2]}')

print('\n=== MAINTENANCE_STATUS DATA ===')
cur.execute('SELECT name, color, description FROM maintenance_status')
for row in cur.fetchall():
    print(f'  {row[0]}: color={row[1]}, desc={row[2]}')

cur.close()
conn.close()
