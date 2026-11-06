"""
One-time script to create the demo admin user in the database.
Run from the SadakSetu/backend directory:

    python seed_admin.py

Or from the SadakSetu root:

    python backend/seed_admin.py
"""
import sys
import os

# Make sure the backend package is importable when run from repo root
sys.path.insert(0, os.path.dirname(__file__))

DEMO_EMAIL = "admin@sadaksetu.local"
DEMO_PASSWORD = "Admin@SadakSetu1"
DEMO_NAME = "Demo Administrator"

from sqlalchemy import select
from app.core.security import hash_password
from app.database.connection import SessionLocal
from app.models import User, UserRole


def seed():
    db = SessionLocal()
    try:
        existing = db.scalar(select(User).where(User.email == DEMO_EMAIL))
        if existing is not None:
            print(f"[seed_admin] Admin '{DEMO_EMAIL}' already exists — skipping.")
            return

        admin = User(
            email=DEMO_EMAIL,
            password_hash=hash_password(DEMO_PASSWORD),
            full_name=DEMO_NAME,
            role=UserRole.ADMIN,
            is_active=True,
        )
        db.add(admin)
        db.commit()
        print(f"[seed_admin] Created admin user:")
        print(f"  Email   : {DEMO_EMAIL}")
        print(f"  Password: {DEMO_PASSWORD}")
        print(f"  Name    : {DEMO_NAME}")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
