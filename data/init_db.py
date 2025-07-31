import asyncio
import os
import pandas as pd
from datetime import date
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from sqlalchemy import Column, Integer, String, Date, text
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:1234@db:5432/mackolik")
engine = create_async_engine(DATABASE_URL, echo=True)
AsyncSessionLocal = async_sessionmaker(autocommit=False, autoflush=False, bind=engine, class_=AsyncSession)
Base = declarative_base()

class Match(Base):
    __tablename__ = "matches"
    id = Column(Integer, primary_key=True, index=True)
    home_team_id = Column(Integer)
    away_team_id = Column(Integer)
    home_score = Column(Integer)
    away_score = Column(Integer)
    match_date = Column(Date)
    league = Column(String)
    season = Column(String)

class Team(Base):
    __tablename__ = "teams"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        # Takım verilerini CSV'den oku ve ekle
        teams_df = pd.read_csv("data/teams.csv")
        for index, row in teams_df.iterrows():
            team_data = row.to_dict()
            existing_team = await session.execute(text("SELECT * FROM teams WHERE name = :name"), {"name": team_data["name"]})
            if not existing_team.scalar_one_or_none():
                await session.execute(text("INSERT INTO teams (name) VALUES (:name)"), {"name": team_data["name"]})
        
        # Maç verilerini CSV'den oku ve ekle
        matches_df = pd.read_csv("data/matches.csv")
        # match_date sütununu datetime objesine dönüştür
        matches_df['date'] = pd.to_datetime(matches_df['date']).dt.date

        for index, row in matches_df.iterrows():
            # Sütun isimlerini veritabanı modeline uygun hale getir
            final_score = row.get("final_score", "")
            try:
                home_score, away_score = map(int, final_score.split("-"))
            except Exception:
                home_score, away_score = 0, 0

            match_data = {
                "id": row["id"],
                "home_team_id": row["home_team_id"],
                "away_team_id": row["away_team_id"],
                "home_score": home_score,
                "away_score": away_score,
                "match_date": row["date"],  # veya row["match_date"]
                "league": row["league"]
            }
            
            existing_match = await session.execute(
                text("SELECT * FROM matches WHERE home_team_id = :home_team_id AND away_team_id = :away_team_id AND match_date = :match_date"), 
                {
                    "home_team_id": match_data["home_team_id"],
                    "away_team_id": match_data["away_team_id"],
                    "match_date": match_data["match_date"]
                }
            )
            if not existing_match.scalar_one_or_none():
                await session.execute(
                    text(
                        "INSERT INTO matches (id, home_team_id, away_team_id, home_score, away_score, match_date, league) "
                        "VALUES (:id, :home_team_id, :away_team_id, :home_score, :away_score, :match_date, :league)"
                    ),
                    {
                        "id": row["id"],
                        "home_team_id": row["home_team_id"],
                        "away_team_id": row["away_team_id"],
                        "home_score": match_data["home_score"],
                        "away_score": match_data["away_score"],
                        "match_date": match_data["match_date"],
                        "league": match_data["league"]
                    }
                )
        
        await session.commit()
        print("Veritabanı başarıyla başlatıldı ve örnek veriler eklendi.")

if __name__ == "__main__":
    asyncio.run(init_db()) 