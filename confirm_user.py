#!/usr/bin/env python3
"""
Script to confirm user email in Supabase Auth
"""
import requests

SUPABASE_URL = "https://jtrhpbgrpsgneleptzgm.supabase.co"
SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0cmhwYmdycHNnbmVsZXB0emdtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDIyNTk4NiwiZXhwIjoyMDg1ODAxOTg2fQ.3OnMpmjbyz9NbduMt3PpxF_YLlfU6YzDHZDeNGsxYe8"
USER_ID = "8c900132-1857-4e06-81a8-6576d56af3f6"

# Update user to confirm email
response = requests.put(
    f"{SUPABASE_URL}/auth/v1/admin/users/{USER_ID}",
    headers={
        "apikey": SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
        "Content-Type": "application/json"
    },
    json={"email_confirm": True}
)

print(f"Status: {response.status_code}")
print(f"Response: {response.text}")

if response.status_code == 200:
    print("✅ User email confirmed successfully!")
else:
    print("❌ Failed to confirm user email")
