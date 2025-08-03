from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy import text, Column, Integer, String, Date
from sqlalchemy.orm import declarative_base
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
import os
from dotenv import load_dotenv
from contextlib import asynccontextmanager
import ssl
from fastapi.middleware.cors import CORSMiddleware

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

@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield

app = FastAPI(lifespan=lifespan)

# ✅ CORS Ayarları
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://football-dashboard-nine.vercel.app",
        "https://football-dashboard-git-main-delils-projects-de7b82c4.vercel.app",
        "https://football-dashboard-ptw6ly45p-delils-projects-de7b82c4.vercel.app",
        "https://football-dashboard-delils-projects-de7b82c4.vercel.app",
        "https://football-dashboard-blush.vercel.app"  # <--- BURAYA EKLE
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ✅ MODELLER
class Match(Base):
    __tablename__ = "matches"
    id = Column(Integer, primary_key=True, index=True)
    home_team_id = Column(Integer)
    away_team_id = Column(Integer)
    final_score = Column(String)  # örn: "2-1"
    first_half_score = Column(String)
    match_date = Column(Date)
    league = Column(String)

class Team(Base):
    __tablename__ = "teams"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)

# ✅ DB Bağlantısı
async def get_db():
    async with AsyncSessionLocal() as session:
        yield session

# ✅ ROOT
@app.get("/")
async def root():
    return {"message": "✅ Futbol İstatistik API Render + Supabase bağlantısı başarılı!"}

# ✅ TÜM MAÇLAR
@app.get("/matches/")
async def get_all_matches(db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(text("SELECT * FROM matches"))
        return [dict(row._mapping) for row in result]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ✅ TÜM TAKIMLAR
@app.get("/teams/")
async def get_all_teams(db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(text("SELECT * FROM teams"))
        return [dict(row._mapping) for row in result]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ✅ TAKIM İSTATİSTİKLERİ (YENİ)
@app.get("/team_stats/{team_name}")
async def get_team_stats(team_name: str, db: AsyncSession = Depends(get_db)):
    try:
        # Takım ID'sini bul
        team_query = await db.execute(
            text("SELECT id, name FROM teams WHERE name ILIKE :name"),
            {"name": f"%{team_name}%"}
        )
        team = team_query.first()
        if not team:
            raise HTTPException(status_code=404, detail="Takım bulunamadı")
        team_id, team_real_name = team

        # Maçları getir
        matches_query = await db.execute(
            text("SELECT * FROM matches WHERE home_team_id = :tid OR away_team_id = :tid"),
            {"tid": team_id}
        )
        matches = [dict(row._mapping) for row in matches_query]

        # İstatistikleri hesapla
        total_matches = len(matches)
        wins = losses = draws = goals_for = goals_against = 0

        for m in matches:
            if not m["final_score"]:
                continue
            try:
                home_goals, away_goals = map(int, m["final_score"].split("-"))
            except:
                continue

            if m["home_team_id"] == team_id:
                goals_for += home_goals
                goals_against += away_goals
                if home_goals > away_goals: wins += 1
                elif home_goals < away_goals: losses += 1
                else: draws += 1
            else:
                goals_for += away_goals
                goals_against += home_goals
                if away_goals > home_goals: wins += 1
                elif away_goals < home_goals: losses += 1
                else: draws += 1

        return {
            "team_id": team_id,
            "team_name": team_real_name,
            "total_matches": total_matches,
            "wins": wins,
            "losses": losses,
            "draws": draws,
            "goals_for": goals_for,
            "goals_against": goals_against,
            "matches": matches
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
