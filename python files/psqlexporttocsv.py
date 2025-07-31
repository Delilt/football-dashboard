import pandas as pd
import psycopg2

# PostgreSQL bağlantı bilgileri
conn = psycopg2.connect(
    host="localhost",
    dbname="mackolik",
    user="postgres",
    password="1234"
)

# CSV olarak dışa aktar
teams_df = pd.read_sql("SELECT * FROM teams", conn)
matches_df = pd.read_sql("SELECT * FROM matches", conn)

teams_df.to_csv("teams.csv", index=False)


conn.close()
