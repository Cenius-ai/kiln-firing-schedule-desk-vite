"""Seed entrypoint: ``python3 -m seed`` from the backend directory.

Creates the schema and the demo studio data, prints the row counts and exits.
This never starts the HTTP server.
"""

from app.seed import seed_fresh

if __name__ == "__main__":
    counts = seed_fresh()
    print("Seeded Kiln Firing Schedule Desk:")
    for name, value in counts.items():
        print(f"  {name}: {value}")
    print("Demo member seeded: cenius@cenius.ai (credentials shown on the sign-in card)")
