import React, { useEffect, useState } from 'react';
import { Bar, Pie, Line, Radar } from 'react-chartjs-2';
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

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement, RadialLinearScale, Tooltip, Legend);

function HomePage() {
  const [matches, setMatches] = useState([]);
  const [teams, setTeams] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTeam, setSearchTeam] = useState("");

  const [darkMode, setDarkMode] = useState(true);
  const toggleTheme = () => setDarkMode(!darkMode);

  const API_BASE = "https://football-dashboard.onrender.com";

  useEffect(() => {
    const fetchData = async () => {
      try {
        const teamsRes = await fetch(`${API_BASE}/teams/`);
        const teamsData = await teamsRes.json();
        setTeams(teamsData);

        const matchesRes = await fetch(`${API_BASE}/matches/`);
        const matchesData = await matchesRes.json();
        setMatches(matchesData);
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

  // filtrelenmis veri
  const selectedTeam = teams.find(t => t.name.toLowerCase() === searchTeam.toLowerCase());
  const teamMatches = selectedTeam
    ? matches.filter(m => m.home_team_id === selectedTeam.id || m.away_team_id === selectedTeam.id)
        .sort((a,b) => new Date(a.match_date) - new Date(b.match_date))
    : [];

  // Varsayılan genel grafikler
  const leagueCounts = matches.reduce((acc, m) => { acc[m.league] = (acc[m.league] || 0) + 1; return acc; }, {});
  const barData = { labels: Object.keys(leagueCounts), datasets: [{ label: 'Toplam Maç Sayısı', data: Object.values(leagueCounts), backgroundColor: 'rgba(75,192,192,0.6)' }] };

  const leagueTopScorers = Object.keys(leagueCounts).map(league => {
    const leagueMatches = matches.filter(m => m.league === league);
    const goals = {};
    leagueMatches.forEach(m => {
      const [h, a] = m.final_score?.split('-').map(Number) || [0,0];
      goals[m.home_team_id] = (goals[m.home_team_id] || 0) + h;
      goals[m.away_team_id] = (goals[m.away_team_id] || 0) + a;
    });
    const top = Object.entries(goals).sort((a,b) => b[1]-a[1])[0] || [];
    return { league, team: teams.find(t => t.id === parseInt(top[0]))?.name || 'N/A', goals: top[1] || 0 };
  });
  const topGoalsData = { labels: leagueTopScorers.map(x => x.league), datasets: [{ label: 'Liglerin En Golcü Takımı', data: leagueTopScorers.map(x => x.goals), backgroundColor: 'rgba(255,99,132,0.6)' }] };

  const leagueAvgGoals = Object.keys(leagueCounts).map(league => {
    const lm = matches.filter(m => m.league === league);
    const total = lm.reduce((sum,m) => { const [h,a]=m.final_score?.split('-').map(Number)||[0,0]; return sum+h+a;},0);
    return { league, avg: parseFloat((total / lm.length).toFixed(2)) };
  });
  const avgGoalsData = { labels: leagueAvgGoals.map(x => x.league), datasets: [{ label: 'Ortalama Gol', data: leagueAvgGoals.map(x => x.avg), backgroundColor: 'rgba(54,162,235,0.6)' }] };

  const winRates = teams.map(t => {
    const tm = matches.filter(m => m.home_team_id === t.id || m.away_team_id === t.id);
    let wins = 0, draws = 0;
    tm.forEach(m => {
      const [h,a] = m.final_score?.split('-').map(Number)||[0,0];
      if(h === a) draws++;
      else if((m.home_team_id===t.id&&h>a)||(m.away_team_id===t.id&&a>h)) wins++;
    });
    return { team:t.name, wins, draws, losses: tm.length - wins - draws };
  });
  const radarData = { labels: winRates.slice(0,5).map(x=>x.team), datasets: [{ label:'Galibiyet', data: winRates.slice(0,5).map(x=>x.wins), backgroundColor:'rgba(153,102,255,0.3)', borderColor:'#9966FF' }] };

  // Takim özel grafikler
  const pieData = selectedTeam ? {
    labels: ['Galibiyet','Beraberlik','Mağlubiyet'],
    datasets: [{ data: [
      winRates.find(x=>x.team===selectedTeam.name)?.wins || 0,
      winRates.find(x=>x.team===selectedTeam.name)?.draws || 0,
      winRates.find(x=>x.team===selectedTeam.name)?.losses || 0
    ], backgroundColor:['#4CAF50','#FFC107','#F44336'] ]
  } : null;

  const lineData = selectedTeam ? {
    labels: teamMatches.map(m=>m.match_date),
    datasets: [{ label:'Atılan Gol', data: teamMatches.map(m=> m.home_team_id===selectedTeam.id
      ? Number(m.final_score.split('-')[0]) : Number(m.final_score.split('-')[1])), fill:false }]
  } : null;

  return (
    <div className={darkMode ? "dashboard dark" : "dashboard light"}>
      <div className="header">
        <h1>⚽ Futbol Dashboard</h1>
        <div>
          <input type="text" placeholder="Takım ara..." value={searchTeam} onChange={e => setSearchTeam(e.target.value)} list="teamList" />
          <datalist id="teamList">{teams.map(t => <option key={t.id} value={t.name} />)}</datalist>
          <button onClick={toggleTheme}>{darkMode ? "🌞 Light" : "🌙 Dark"}</button>
        </div>
      </div>
      <div className="sidebar">
        <ul><li><a href="#charts">Grafikler</a></li><li><a href="#matches">Maçlar</a></li></ul>
      </div>
      <div className="content">
        <div className="charts-grid" id="charts">
          { !selectedTeam && <><div className="chart-card"><Bar data={barData} /></div>
          <div className="chart-card"><Bar data={topGoalsData} /></div>
          <div className="chart-card"><Bar data={avgGoalsData} /></div>
          <div className="chart-card"><Radar data={radarData} /></div></> }
          { selectedTeam && <><div className="chart-card"><Pie data={pieData} /></div>
          <div className="chart-card"><Line data={lineData} /></div>
          <div className="chart-card"><Bar data={{ labels:['Wins','Draws','Losses'], datasets:[{ data:[pieData.datasets[0].data[0],pieData.datasets[0].data[1],pieData.datasets[0].data[2]], backgroundColor:['#4CAF50','#FFC107','#F44336'] }] }} /></div>
          <div className="chart-card"><Radar data={radarData} /></div></> }
        </div>
        { selectedTeam && <div className="table-section" id="matches">
          <h2>{selectedTeam.name} Maçları</h2>
          <table className="styled-table">
            <thead><tr><th>Ev</th><th>Dep</th><th>Skor</th><th>Tarih</th><th>Lig</th></tr></thead>
            <tbody>{teamMatches.map(m=><tr key={m.id}><td>{m.home_team_id}</td><td>{m.away_team_id}</td><td>{m.final_score}</td><td>{m.match_date}</td><td>{m.league}</td></tr>)}</tbody>
          </table>
        </div> }
      </div>
      <style jsx>{`
        body { margin:0; }
        .dashboard { display:flex; min-height:100vh; }
        .header { position:fixed; top:0; left:200px; right:0; height:60px; display:flex; justify-content:space-between; align-items:center; padding:0 20px; background:#222; color:#fff; z-index:100; }
        .header input { padding:5px; border-radius:4px; border:none; }
        .header button { margin-left:10px; padding:5px; border:none; border-radius:4px; }
        .sidebar { width:200px; background:#2A2A2A; padding-top:70px; position:fixed; top:0; bottom:0; left:0; }
        .sidebar ul { list-style:none; padding:0; }
        .sidebar li { padding:15px; }
        .sidebar a { color:#FCD116; text-decoration:none; font-weight:bold; }
        .content { margin-left:200px; padding:80px 20px 20px; flex:1; }
        .charts-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:20px; margin-bottom:30px; }
        .chart-card { background:var(--card-bg); border-radius:12px; padding:15px; box-shadow:0 4px 10px rgba(0,0,0,.3); height:300px; display:flex; align-items:center; justify-content:center; }
        .table-section { background:var(--card-bg); padding:20px; border-radius:8px; box-shadow:0 4px 10px rgba(0,0,0,.3); }
        .styled-table { width:100%; border-collapse:collapse; margin-top:20px; }
        .styled-table th,td { padding:8px; border-bottom:1px solid #444; }
        .styled-table tr:hover { background:#333; }
        .styled-table th { background:#3A3A3A; color:#FCD116; position:sticky; top:0; }
        .dark { --card-bg:#2A2A2A; background:#1E1E1E; color:#EAEAEA; }
        .light { --card-bg:#fff; background:#f4f4f4; color:#333; }
        @media(max-width:900px){ .header{left:0;} .sidebar{display:none;} .content{margin-left:0;} }
      `}</style>
    </div>
  );
}

export default HomePage;
