import React, { useEffect, useState } from 'react';
import { Bar, Pie, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement, Tooltip, Legend);

function HomePage() {
  const [matches, setMatches] = useState([]);
  const [teams, setTeams] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTeam, setSearchTeam] = useState("");

  // Tema yönetimi
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

  // Takım adına göre filtreleme ve tarihe göre sıralama
  const filteredMatches = matches
    .filter(m => {
      if (!searchTeam) return true;
      const teamName = teams.find(t => t.id === m.home_team_id)?.name || "";
      const opponentName = teams.find(t => t.id === m.away_team_id)?.name || "";
      return teamName.toLowerCase().includes(searchTeam.toLowerCase()) || opponentName.toLowerCase().includes(searchTeam.toLowerCase());
    })
    .sort((a, b) => new Date(a.match_date) - new Date(b.match_date));

  if (loading) return <div className="loading">⏳ Veriler yükleniyor...</div>;
  if (error) return <div className="error">❌ Hata: {error.message}</div>;

  // Grafik verileri hazırlama
  const leagueCounts = matches.reduce((acc, m) => {
    acc[m.league] = (acc[m.league] || 0) + 1;
    return acc;
  }, {});

  const barData = {
    labels: Object.keys(leagueCounts),
    datasets: [{ label: 'Maç Sayısı', data: Object.values(leagueCounts), backgroundColor: 'rgba(75,192,192,0.6)' }]
  };

  const teamGoals = teams.reduce((acc, t) => {
    const teamMatches = matches.filter(m => m.home_team_id === t.id || m.away_team_id === t.id);
    acc[t.name] = teamMatches.reduce((sum, m) => {
      const [home, away] = m.final_score?.split('-').map(Number) || [0, 0];
      return sum + (m.home_team_id === t.id ? home : away);
    }, 0);
    return acc;
  }, {});

  const topTeams = Object.entries(teamGoals).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const pieData = {
    labels: topTeams.map(t => t[0]),
    datasets: [{ data: topTeams.map(t => t[1]), backgroundColor: ['#FF6384','#36A2EB','#FFCE56','#4BC0C0','#9966FF'] }]
  };

  const lineData = {
    labels: matches.map(m => m.match_date),
    datasets: [{ label: 'Maç Yoğunluğu', data: matches.map((_, i) => i + 1), borderColor: '#42A5F5', fill: false }]
  };

  return (
    <div className={darkMode ? "dashboard dark" : "dashboard light"}>
      {/* ÜST BAR */}
      <div className="header">
        <h1>⚽ Futbol Dashboard</h1>
        <div>
          <input type="text" placeholder="Takım ara..." value={searchTeam} onChange={e => setSearchTeam(e.target.value)} />
          <button onClick={toggleTheme}>{darkMode ? "🌞 Light" : "🌙 Dark"}</button>
        </div>
      </div>

      {/* SIDEBAR */}
      <div className="sidebar">
        <ul>
          <li><a href="#charts">Grafikler</a></li>
          <li><a href="#teams">Takımlar</a></li>
          <li><a href="#matches">Maçlar</a></li>
        </ul>
      </div>

      {/* İÇERİK */}
      <div className="content">
        {/* GRAFİKLER GRID */}
        <div className="charts-grid" id="charts">
          <div className="chart-card"><Bar data={barData} /></div>
          <div className="chart-card"><Pie data={pieData} /></div>
          <div className="chart-card"><Line data={lineData} /></div>
          <div className="chart-card">📊 Diğer Grafik (Geliştirilebilir)</div>
        </div>

        {/* Takımlar Tablosu */}
        <div className="card full" id="teams">
          <h2>Takımlar</h2>
          <div className="table-container">
            <table className="styled-table">
              <thead><tr><th>Adı</th></tr></thead>
              <tbody>{teams.map(t => <tr key={t.id}><td>{t.name}</td></tr>)}</tbody>
            </table>
          </div>
        </div>

        {/* Maçlar Tablosu */}
        <div className="card full" id="matches">
          <h2>Maçlar ({searchTeam || "Tüm Maçlar"})</h2>
          <div className="table-container">
            <table className="styled-table">
              <thead>
                <tr><th>Ev</th><th>Dep</th><th>Final Skor</th><th>Tarih</th><th>Lig</th></tr>
              </thead>
              <tbody>
                {filteredMatches.map(m => (
                  <tr key={m.id}>
                    <td>{teams.find(t => t.id === m.home_team_id)?.name || m.home_team_id}</td>
                    <td>{teams.find(t => t.id === m.away_team_id)?.name || m.away_team_id}</td>
                    <td>{m.final_score}</td>
                    <td>{m.match_date}</td>
                    <td>{m.league}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* CSS */}
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
        .charts-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(300px,1fr)); gap:20px; margin-bottom:30px; }
        .chart-card { background:var(--card-bg); border-radius:12px; padding:15px; box-shadow:0 4px 10px rgba(0,0,0,.3); height:250px; display:flex; align-items:center; justify-content:center; }
        .card { background:var(--card-bg); padding:15px; border-radius:10px; box-shadow:0 2px 5px rgba(0,0,0,.4); transition:.3s; margin-bottom:20px; }
        .card h2 { color:#FCD116; margin-bottom:10px; }
        .styled-table { width:100%; border-collapse:collapse; }
        .styled-table th,td { padding:8px; border-bottom:1px solid #444; }
        .styled-table tr:hover { background:#333; }
        .styled-table th { background:#3A3A3A; color:#FCD116; position:sticky; top:0; }
        .table-container { max-height:250px; overflow-y:auto; }
        .loading, .error { text-align:center; font-size:1.3em; padding:50px; }
        .dark { --card-bg:#2A2A2A; background:#1E1E1E; color:#EAEAEA; }
        .light { --card-bg:#fff; background:#f4f4f4; color:#333; }
        @media(max-width:900px){ .header{left:0;} .sidebar{display:none;} .content{margin-left:0;} }
      `}</style>
    </div>
  );
}

export default HomePage;
