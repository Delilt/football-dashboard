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
    final_score = Column(String)  # örn: "2-1"
    first_half_score = Column(String)
    match_date = Column(Date)
    league = Column(String)

class Team(Base):
    __tablename__ = "teams"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)

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
