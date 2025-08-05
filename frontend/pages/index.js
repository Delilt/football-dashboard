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

  const teamGoals = Object.entries(
    matches.reduce((acc, m) => {
      const [h, a] = m.final_score?.split('-').map(Number) || [0,0];
      acc[m.home_team_id] = (acc[m.home_team_id] || 0) + h;
      acc[m.away_team_id] = (acc[m.away_team_id] || 0) + a;
      return acc;
    }, {})
  ).sort((a,b)=>b[1]-a[1]);
  const topGoalsData = {
    labels: teamGoals.slice(0, 5).map(([id]) => teams.find(t => t.id === +id)?.name || 'N/A'),
    datasets: [{ label: 'En Golcü 5 Takım', data: teamGoals.slice(0,5).map(([_,g])=>g), backgroundColor: 'rgba(255,159,64,0.6)' }]
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

  // Team-specific charts
  const pieData = selectedTeam && {
    labels:['Galibiyet','Beraberlik','Mağlubiyet'],
    datasets:[{ data: (()=>{
      const wr = winRates.find(x=>x.team===selectedTeam.name) || {wins:0,draws:0,losses:0};
      return [wr.wins, wr.draws, wr.losses];
    })(), backgroundColor:['#4CAF50','#FFC107','#F44336'] }]
  };

  const lineData = selectedTeam && {
    labels: teamMatches.map(m=>m.match_date),
    datasets:[{ label:'Atılan Gol', data: teamMatches.map(m=> m.home_team_id===selectedTeam.id ? +m.final_score.split('-')[0] : +m.final_score.split('-')[1]), fill:false }]
  };

  const barTeamData = selectedTeam && {
    labels: teamMatches.map(m=>m.match_date),
    datasets:[{ label:'Toplam Gol', data: teamMatches.map(m=> m.final_score.split('-').map(Number).reduce((a,b)=>a+b,0)), backgroundColor:'#42A5F5' }]
  };

  const radarTeamData = selectedTeam && {
    labels:['Home','Away'],
    datasets:[{ label:'Attığı Gol Dağılımı', data: [
      teamMatches.reduce((s,m)=> s + +m.final_score.split('-')[0],0),
      teamMatches.reduce((s,m)=> s + +m.final_score.split('-')[1],0)
    ], backgroundColor:'rgba(255,99,132,0.3)', borderColor:'#FF6384' }]
  };

  return (
    <div className={darkMode ? 'dashboard dark' : 'dashboard light'}>
      <aside className='sidebar'>
        <h2>Ligler</h2>
        {Object.keys(leagueCounts).map(l=> <div key={l}>{l}</div>)}
      </aside>
      <main className='main'>
        <header className='topbar'>
          <input value={searchTeam} onChange={e=>setSearchTeam(e.target.value)} placeholder='Takım ara…' />
          <button onClick={toggleTheme}>{darkMode? '🌞':'🌙'}</button>
        </header>
        <section className='grid'>
          {!selectedTeam ? (
            <>  
            <div className='card'><Bar data={barData}/></div>
            <div className='card'><Bar data={topGoalsData}/></div>
            <div className='card'><Bar data={avgGoalsData}/></div>
            <div className='card'><Radar data={radarData}/></div>
            </>
          ) : (
            <>
            <div className='card'><Pie data={pieData}/></div>
            <div className='card'><Line data={lineData}/></div>
            <div className='card'><Bar data={barTeamData}/></div>
            <div className='card'><Radar data={radarTeamData}/></div>
            </>
          )}
        </section>
        {selectedTeam && <div className='card full'>
          <h3>{selectedTeam.name} Maçları</h3>
          <table><thead><tr><th>Tarih</th><th>Rakip</th><th>Skor</th></tr></thead>
            <tbody>
              {teamMatches.map(m=> <tr key={m.id}><td>{m.match_date}</td><td>{m.home_team_id===selectedTeam.id? teams.find(t=>t.id===m.away_team_id).name : teams.find(t=>t.id===m.home_team_id).name}</td><td>{m.final_score}</td></tr>)}
            </tbody>
          </table>
        </div>}
      </main>
      <style jsx>{`
        .dashboard { display:flex; }
        .sidebar { width:200px; padding:20px; background:#333; color:#fff; }
        .main { flex:1; padding:20px; }
        .topbar { display:flex; justify-content:space-between; margin-bottom:20px; }
        input { padding:8px; width:200px; }
        .grid { display:grid; grid-template-columns:1fr 1fr; gap:20px; }
        .card { padding:10px; background:var(--card-bg); border-radius:8px; box-shadow:0 2px 6px rgba(0,0,0,0.2); }
        .full { grid-column:1/ -1; }
        table { width:100%; border-collapse:collapse; }
        th,td { padding:8px; border:1px solid #ccc; }
        .dark { --card-bg:#2A2A2A; background:#1E1E1E; color:#EAEAEA; }
        .light { --card-bg:#fff; background:#f4f4f4; color:#333; }
      `}</style>
    </div>
  );
}

export default HomePage;
