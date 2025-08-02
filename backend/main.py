from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy import text, Column, Integer, String, Date
from sqlalchemy.orm import declarative_base
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
import os
from dotenv import load_dotenv
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
import ssl
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://football-dashboard-git-main-delils-projects-de7b82c4.vercel.app"],  # Vercel frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# .env dosyasını yükle
load_dotenv()

# 🔹 Supabase bağlantı URL'si (Render'da environment variable üzerinden gelecek)
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://postgres:Delil2255..@db.gqhgjirqxhgqneoxppuk.supabase.co:5432/postgres"
)

# 🔹 SSL ayarları (Supabase SSL gerektirir)
ssl_context = ssl.create_default_context()

# 🔹 Async SQLAlchemy engine
engine = create_async_engine(
    DATABASE_URL,
    echo=True,
    connect_args={"ssl": ssl_context}  # SSL zorunlu
)

# 🔹 AsyncSession ayarları
AsyncSessionLocal = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

# 🔹 ORM Base
Base = declarative_base()

# -------------------
# MODELLER
# -------------------
class Match(Base):
    __tablename__ = "matches"
    id = Column(Integer, primary_key=True, index=True)
    home_team_id = Column(Integer)
    away_team_id = Column(Integer)
    home_score = Column(Integer)
    away_score = Column(Integer)
    match_date = Column(Date)
    league = Column(String)

class Team(Base):
    __tablename__ = "teams"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)

# -------------------
# FASTAPI LIFESPAN
# -------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Uygulama başladığında tabloları oluştur
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield

# -------------------
# FASTAPI APP
# -------------------
app = FastAPI(lifespan=lifespan)

# -------------------
# DB Dependency
# -------------------
async def get_db():
    async with AsyncSessionLocal() as session:
        yield session

# -------------------
# ROUTES
# -------------------
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
    result = await db.execute(text("""
        SELECT t.id, t.name,
            COUNT(m.id) as total_matches,
            SUM(CASE WHEN m.home_team_id = t.id AND m.home_score > m.away_score THEN 1
                     WHEN m.away_team_id = t.id AND m.away_score > m.home_score THEN 1 ELSE 0 END) as wins,
            SUM(CASE WHEN m.home_team_id = t.id AND m.home_score < m.away_score THEN 1
                     WHEN m.away_team_id = t.id AND m.away_score < m.home_score THEN 1 ELSE 0 END) as losses,
            SUM(CASE WHEN m.home_team_id = t.id THEN m.home_score
                     WHEN m.away_team_id = t.id THEN m.away_score ELSE 0 END) as goals_for,
            SUM(CASE WHEN m.home_team_id = t.id THEN m.away_score
                     WHEN m.away_team_id = t.id THEN m.home_score ELSE 0 END) as goals_against
        FROM teams t
        LEFT JOIN matches m ON t.id = m.home_team_id OR t.id = m.away_team_id
        GROUP BY t.id, t.name ORDER BY goals_for DESC
    """))
    return [dict(row._mapping) for row in result]

@app.get("/stats/teams/winloss/")
async def team_win_loss_stats(db: AsyncSession = Depends(get_db)):
    result = await db.execute(text("""
        SELECT t.name,
            SUM(CASE WHEN m.home_team_id = t.id AND m.home_score > m.away_score THEN 1
                      WHEN m.away_team_id = t.id AND m.away_score > m.home_score THEN 1 ELSE 0 END) as wins,
            SUM(CASE WHEN m.home_team_id = t.id AND m.home_score < m.away_score THEN 1
                      WHEN m.away_team_id = t.id AND m.away_score < m.home_score THEN 1 ELSE 0 END) as losses
        FROM teams t
        LEFT JOIN matches m ON t.id = m.home_team_id OR t.id = m.away_team_id
        GROUP BY t.id, t.name ORDER BY wins DESC
    """))
    return [dict(row._mapping) for row in result]

@app.get("/stats/matches/top5goals/")
async def top5_highest_scoring_matches(db: AsyncSession = Depends(get_db)):
    result = await db.execute(text("""
        SELECT id, home_team_id, away_team_id, home_score, away_score,
               (home_score + away_score) as total_goals
        FROM matches ORDER BY total_goals DESC LIMIT 5
    """))
    return [dict(row._mapping) for row in result]

@app.get("/stats/leagues/matchcount/")
async def match_count_per_league(db: AsyncSession = Depends(get_db)):
    result = await db.execute(text("""
        SELECT league, COUNT(*) as match_count
        FROM matches GROUP BY league ORDER BY match_count DESC
    """))
    return [dict(row._mapping) for row in result]

@app.get("/stats/teams/avggoals/")
async def avg_goals_per_team(db: AsyncSession = Depends(get_db)):
    result = await db.execute(text("""
        SELECT t.name,
               COUNT(m.id) as total_matches,
               COALESCE(SUM(CASE WHEN m.home_team_id = t.id THEN m.home_score
                                 WHEN m.away_team_id = t.id THEN m.away_score ELSE 0 END),0) as total_goals,
               CASE WHEN COUNT(m.id) > 0 THEN ROUND(
                    COALESCE(SUM(CASE WHEN m.home_team_id = t.id THEN m.home_score
                                      WHEN m.away_team_id = t.id THEN m.away_score ELSE 0 END),0)::numeric / COUNT(m.id),2)
               ELSE 0 END as avg_goals
        FROM teams t LEFT JOIN matches m ON t.id = m.home_team_id OR t.id = m.away_team_id
        GROUP BY t.id, t.name ORDER BY avg_goals DESC
    """))
    return [dict(row._mapping) for row in result]

@app.get("/stats/matches/countbydate/")
async def match_count_by_date(db: AsyncSession = Depends(get_db)):
    result = await db.execute(text("""
        SELECT match_date, COUNT(*) as match_count
        FROM matches GROUP BY match_date ORDER BY match_date ASC
    """))
    return [dict(row._mapping) for row in result]
