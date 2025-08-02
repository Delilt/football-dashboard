from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy import text, Column, Integer, String, Date
from sqlalchemy.orm import declarative_base
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
import os
from dotenv import load_dotenv
from contextlib import asynccontextmanager
import ssl
from fastapi.middleware.cors import CORSMiddleware

# .env dosyasını yükle
load_dotenv()

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://postgres:Delil2255..@db.gqhgjirqxhgqneoxppuk.supabase.co:5432/postgres"
)

ssl_context = ssl.create_default_context()

engine = create_async_engine(
    DATABASE_URL,
    echo=True,
    connect_args={"ssl": ssl_context}
)

AsyncSessionLocal = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

Base = declarative_base()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://football-dashboard-nine.vercel.app",
        "https://football-dashboard-git-main-delils-projects-de7b82c4.vercel.app",
        "https://football-dashboard-ptw6ly45p-delils-projects-de7b82c4.vercel.app",
        "https://football-dashboard-delils-projects-de7b82c4.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Match(Base):
    __tablename__ = "matches"
    id = Column(Integer, primary_key=True, index=True)
    home_team_id = Column(Integer)
    away_team_id = Column(Integer)
    final_score = Column(String)  # final_score örn: "2-1"
    first_half_score = Column(String)  # varsa
    match_date = Column(Date)
    league = Column(String)

class Team(Base):
    __tablename__ = "teams"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)

@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield

app = FastAPI(lifespan=lifespan)

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session

@app.get("/")
async def root():
    return {"message": "✅ Futbol İstatistik API Render + Supabase bağlantısı başarılı!"}

@app.get("/matches/")
async def get_all_matches(db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(text("SELECT * FROM matches"))
        return [dict(row._mapping) for row in result]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/teams/")
async def get_all_teams(db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(text("SELECT * FROM teams"))
        return [dict(row._mapping) for row in result]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/stats/teams/")
async def team_stats(db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(text("""
            SELECT t.id, t.name,
                COUNT(m.id) AS total_matches,
                SUM(CASE
                    WHEN t.id = m.home_team_id AND (split_part(m.final_score, '-', 1)::int > split_part(m.final_score, '-', 2)::int) THEN 1
                    WHEN t.id = m.away_team_id AND (split_part(m.final_score, '-', 2)::int > split_part(m.final_score, '-', 1)::int) THEN 1
                    ELSE 0
                END) AS wins,
                SUM(CASE
                    WHEN t.id = m.home_team_id AND (split_part(m.final_score, '-', 1)::int < split_part(m.final_score, '-', 2)::int) THEN 1
                    WHEN t.id = m.away_team_id AND (split_part(m.final_score, '-', 2)::int < split_part(m.final_score, '-', 1)::int) THEN 1
                    ELSE 0
                END) AS losses,
                SUM(CASE
                    WHEN t.id = m.home_team_id THEN split_part(m.final_score, '-', 1)::int
                    WHEN t.id = m.away_team_id THEN split_part(m.final_score, '-', 2)::int
                    ELSE 0
                END) AS goals_for,
                SUM(CASE
                    WHEN t.id = m.home_team_id THEN split_part(m.final_score, '-', 2)::int
                    WHEN t.id = m.away_team_id THEN split_part(m.final_score, '-', 1)::int
                    ELSE 0
                END) AS goals_against
            FROM teams t
            LEFT JOIN matches m ON t.id = m.home_team_id OR t.id = m.away_team_id
            GROUP BY t.id, t.name
            ORDER BY goals_for DESC
        """))
        return [dict(row._mapping) for row in result]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/stats/teams/winloss/")
async def team_win_loss_stats(db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(text("""
            SELECT t.name,
                SUM(CASE
                    WHEN t.id = m.home_team_id AND (split_part(m.final_score, '-', 1)::int > split_part(m.final_score, '-', 2)::int) THEN 1
                    WHEN t.id = m.away_team_id AND (split_part(m.final_score, '-', 2)::int > split_part(m.final_score, '-', 1)::int) THEN 1
                    ELSE 0
                END) AS wins,
                SUM(CASE
                    WHEN t.id = m.home_team_id AND (split_part(m.final_score, '-', 1)::int < split_part(m.final_score, '-', 2)::int) THEN 1
                    WHEN t.id = m.away_team_id AND (split_part(m.final_score, '-', 2)::int < split_part(m.final_score, '-', 1)::int) THEN 1
                    ELSE 0
                END) AS losses
            FROM teams t
            LEFT JOIN matches m ON t.id = m.home_team_id OR t.id = m.away_team_id
            GROUP BY t.id, t.name
            ORDER BY wins DESC
        """))
        return [dict(row._mapping) for row in result]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/stats/matches/top5goals/")
async def top5_highest_scoring_matches(db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(text("""
            SELECT id, home_team_id, away_team_id, final_score,
                   (split_part(final_score, '-', 1)::int + split_part(final_score, '-', 2)::int) AS total_goals
            FROM matches
            ORDER BY total_goals DESC
            LIMIT 5
        """))
        return [dict(row._mapping) for row in result]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/stats/leagues/matchcount/")
async def match_count_per_league(db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(text("""
            SELECT league, COUNT(*) AS match_count
            FROM matches
            GROUP BY league
            ORDER BY match_count DESC
        """))
        return [dict(row._mapping) for row in result]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/stats/teams/avggoals/")
async def avg_goals_per_team(db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(text("""
            SELECT t.name,
                   COUNT(m.id) AS total_matches,
                   COALESCE(SUM(CASE
                       WHEN t.id = m.home_team_id THEN split_part(m.final_score, '-', 1)::int
                       WHEN t.id = m.away_team_id THEN split_part(m.final_score, '-', 2)::int
                       ELSE 0
                   END), 0) AS total_goals,
                   CASE WHEN COUNT(m.id) > 0 THEN ROUND(
                       COALESCE(SUM(CASE
                           WHEN t.id = m.home_team_id THEN split_part(m.final_score, '-', 1)::int
                           WHEN t.id = m.away_team_id THEN split_part(m.final_score, '-', 2)::int
                           ELSE 0
                       END), 0)::numeric / COUNT(m.id), 2)
                   ELSE 0 END AS avg_goals
            FROM teams t
            LEFT JOIN matches m ON t.id = m.home_team_id OR t.id = m.away_team_id
            GROUP BY t.id, t.name
            ORDER BY avg_goals DESC
        """))
        return [dict(row._mapping) for row in result]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/stats/matches/countbydate/")
async def match_count_by_date(db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(text("""
            SELECT match_date, COUNT(*) AS match_count
            FROM matches
            GROUP BY match_date
            ORDER BY match_date ASC
        """))
        return [dict(row._mapping) for row in result]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
