import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import chart components to avoid SSR issues
const Bar = dynamic(() => import('react-chartjs-2').then(mod => mod.Bar), { ssr: false });
const Pie = dynamic(() => import('react-chartjs-2').then(mod => mod.Pie), { ssr: false });
const Line = dynamic(() => import('react-chartjs-2').then(mod => mod.Line), { ssr: false });
const Radar = dynamic(() => import('react-chartjs-2').then(mod => mod.Radar), { ssr: false });

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  RadialLinearScale,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  RadialLinearScale,
  Tooltip,
  Legend
);

function HomePage() {
  const [matches, setMatches] = useState([]);
  const [teams, setTeams] = useState([]);
  const [searchTeam, setSearchTeam] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const [darkMode, setDarkMode] = useState(true);
  const toggleTheme = () => setDarkMode(!darkMode);

  const API_BASE = "https://football-dashboard.onrender.com";

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [teamsRes, matchesRes] = await Promise.all([
          fetch(`${API_BASE}/teams/`),
          fetch(`${API_BASE}/matches/`)
        ]);
        setTeams(await teamsRes.json());
        setMatches(await matchesRes.json());
      } catch (e) {
        setError(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div className="loading">⏳ Veriler yükleniyor...</div>;
  if (error) return <div className="error">❌ Hata: {error.message}</div>;

  const selectedTeam = teams.find(t => t.name.toLowerCase() === searchTeam.toLowerCase());
  const teamMatches = selectedTeam
    ? matches
        .filter(m => m.home_team_id === selectedTeam.id || m.away_team_id === selectedTeam.id)
        .sort((a, b) => new Date(a.match_date) - new Date(b.match_date))
    : [];

  // General charts
  const leagueCounts = matches.reduce((acc, m) => { acc[m.league] = (acc[m.league] || 0) + 1; return acc; }, {});
  const barData = {
    labels: Object.keys(leagueCounts),
    datasets: [{ label: 'Toplam Maç Sayısı', data: Object.values(leagueCounts), backgroundColor: Object.keys(leagueCounts).map((_,i) => `hsl(${i*60},70%,50%)`) }]
  };

  const leagueGoals = Object.entries(
    matches.reduce((acc, m) => {
      const [h, a] = m.final_score?.split('-').map(Number) || [0,0];
      acc[m.home_team_id] = (acc[m.home_team_id] || 0) + h;
      acc[m.away_team_id] = (acc[m.away_team_id] || 0) + a;
      return acc;
    }, {})
  );
  const topGoalsData = {
    labels: leagueGoals.slice(0, 5).map(([id]) => teams.find(t => t.id === +id)?.name || 'N/A'),
    datasets: [{ label: 'En Golcü 5 Takım', data: leagueGoals.slice(0,5).map(([_,g])=>g), backgroundColor: 'rgba(255,159,64,0.6)' }]
  };

  const avgGoalsData = {
    labels: Object.keys(leagueCounts),
    datasets: [{ label: 'Ortalama Gol', data: Object.entries(leagueCounts).map(([league,count]) => {
      const lm = matches.filter(m=>m.league===league);
      const total = lm.reduce((s,m)=> { const [h,a]=m.final_score.split('-').map(Number); return s+h+a; },0);
      return +(total/lm.length).toFixed(2);
    }), backgroundColor: 'rgba(75,192,192,0.6)' }]
  };

  const winRates = teams.map(t => {
    const tm = matches.filter(m=>m.home_team_id===t.id||m.away_team_id===t.id);
    let w=0,d=0;
    tm.forEach(m=>{
      const [h,a]=m.final_score.split('-').map(Number);
      if(h===a) d++;
      else if((m.home_team_id===t.id&&h>a)||(m.away_team_id===t.id&&a>h)) w++;
    });
    return { team:t.name, wins:w, draws:d, losses:tm.length-w-d };
  });
  const radarData = {
    labels: winRates.slice(0,5).map(x=>x.team),
    datasets:[{ label:'Galibiyet', data: winRates.slice(0,5).map(x=>x.wins), backgroundColor:'rgba(153,102,255,0.3)', borderColor:'#9966FF' }]
  };

  // Team-specific
  const pieData = selectedTeam && {
    labels:['Galibiyet','Beraberlik','Mağlubiyet'],
    datasets:[{ data: winRates.find(x=>x.team===selectedTeam.name) ?
      [winRates.find(x=>x.team===selectedTeam.name).wins, winRates.find(x=>x.team===selectedTeam.name).draws, winRates.find(x=>x.team===selectedTeam.name).losses] : [0,0,0],
      backgroundColor:['#4CAF50','#FFC107','#F44336']
    }]
  };

  const lineData = selectedTeam && {
    labels: teamMatches.map(m=>m.match_date),
    datasets:[{ label:'Atılan Gol', data: team
