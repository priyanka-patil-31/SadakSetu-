import psycopg

passwords = [
    "", "postgres", "admin", "root", "password", "1234", "12345", "123456", "12345678", "123456789",
    "change-me", "sadaksetu", "SadakSetu", "SadakSetu123", "Admin@123", "Password@123", "hp", "HP",
    "Admin@SadakSetu1", "pothole", "postgre", "postgresql", "123", "1", "toor", "pass", "master"
]

for p in passwords:
    try:
        conn = psycopg.connect(host="127.0.0.1", port=5432, user="postgres", password=p, dbname="postgres", connect_timeout=1)
        print(f"FOUND POSTGRES PASSWORD: '{p}'")
        conn.close()
        break
    except Exception as e:
        pass
else:
    print("No common password matched for user postgres")
