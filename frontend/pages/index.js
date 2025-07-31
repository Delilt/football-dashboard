import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, LineChart, Line } from 'recharts';

function HomePage() {
  const [matches, setMatches] = useState([]);
  const [teams, setTeams] = useState([]);
  const [teamStats, setTeamStats] = useState([]);
  const [winLossStats, setWinLossStats] = useState([]);
  const [top5Matches, setTop5Matches] = useState([]);
  const [leagueMatchCounts, setLeagueMatchCounts] = useState([]);
  const [avgGoals, setAvgGoals] = useState([]);
  const [matchCountByDate, setMatchCountByDate] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  // Tema yönetimi
  const [darkMode, setDarkMode] = useState(true);
  const toggleTheme = () => setDarkMode(!darkMode);

  // Lig filtresi
  const [selectedLeague, setSelectedLeague] = useState("All");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setTeams(await (await fetch('http://localhost:8000/teams/')).json());
        const matchData = await (await fetch('http://localhost:8000/matches/')).json();
        setMatches(matchData);
        setTeamStats(await (await fetch('http://localhost:8000/stats/teams/')).json());
        setWinLossStats(await (await fetch('http://localhost:8000/stats/teams/winloss/')).json());
        setTop5Matches(await (await fetch('http://localhost:8000/stats/matches/top5goals/')).json());
        setLeagueMatchCounts(await (await fetch('http://localhost:8000/stats/leagues/matchcount/')).json());
        setAvgGoals(await (await fetch('http://localhost:8000/stats/teams/avggoals/')).json());
        setMatchCountByDate(await (await fetch('http://localhost:8000/stats/matches/countbydate/')).json());
      } catch (e) { setError(e); } 
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const leagues = [...new Set(matches.map(m => m.league))];
  const filteredMatches = selectedLeague === "All" ? matches : matches.filter(m => m.league === selectedLeague);

  if (loading) return <div className="loading">⏳ Veriler yükleniyor...</div>;
  if (error) return <div className="error">❌ Hata: {error.message}</div>;

  return (
    <div className={darkMode ? "dashboard dark" : "dashboard light"}>
      
      {/* ÜST BAR */}
      <div className="header">
        <h1>⚽ Futbol Dashboard</h1>
        <div>
          <select value={selectedLeague} onChange={e => setSelectedLeague(e.target.value)}>
            <option value="All">Tüm Ligler</option>
            {leagues.map((l, i) => <option key={i} value={l}>{l}</option>)}
          </select>
          <button onClick={toggleTheme}>{darkMode ? "🌞 Light" : "🌙 Dark"}</button>
        </div>
      </div>

      {/* SIDEBAR */}
      <div className="sidebar">
        <ul>
          <li><a href="#teams">Takımlar</a></li>
          <li><a href="#matches">Maçlar</a></li>
          <li><a href="#charts">Grafikler</a></li>
        </ul>
      </div>

      {/* İÇERİK */}
      <div className="content">
        {/* Takımlar Tablosu */}
        <div className="card full" id="teams">
          <h2>Takımlar</h2>
          <div className="table-container">
            <table className="styled-table">
              <thead><tr><th>ID</th><th>Adı</th></tr></thead>
              <tbody>{teams.map(t => <tr key={t.id}><td>{t.id}</td><td>{t.name}</td></tr>)}</tbody>
            </table>
          </div>
        </div>

        {/* Maçlar Tablosu */}
        <div className="card full" id="matches">
          <h2>Maçlar ({selectedLeague})</h2>
          <div className="table-container">
            <table className="styled-table">
              <thead><tr><th>ID</th><th>Ev</th><th>Dep</th><th>Ev Gol</th><th>Dep Gol</th><th>Tarih</th><th>Lig</th></tr></thead>
              <tbody>{filteredMatches.map(m => (
                <tr key={m.id}><td>{m.id}</td><td>{m.home_team_id}</td><td>{m.away_team_id}</td>
                  <td>{m.home_score}</td><td>{m.away_score}</td><td>{m.match_date}</td><td>{m.league}</td></tr>
              ))}</tbody>
            </table>
          </div>
        </div>

        {/* Grafikler */}
        <div className="grid" id="charts">
          <div className="card"><h2>Takımların Attığı Gol</h2>
            <ResponsiveContainer width="100%" height={200}><BarChart data={teamStats}><XAxis dataKey="name"/><YAxis/><Tooltip/><Bar dataKey="goals_for" fill="#FCD116"/></BarChart></ResponsiveContainer>
          </div>
          <div className="card"><h2>Galibiyet/Kayıp</h2>
            <ResponsiveContainer width="100%" height={200}><BarChart data={winLossStats}><XAxis dataKey="name"/><YAxis/><Tooltip/><Legend/><Bar dataKey="wins" fill="#4CAF50"/><Bar dataKey="losses" fill="#F44336"/></BarChart></ResponsiveContainer>
          </div>
          <div className="card"><h2>En Çok Gol Atılan 5 Maç</h2>
            <ResponsiveContainer width="100%" height={200}><BarChart data={top5Matches}><XAxis dataKey="id"/><YAxis/><Tooltip/><Bar dataKey="total_goals" fill="#03A9F4"/></BarChart></ResponsiveContainer>
          </div>
          <div className="card"><h2>Lig Bazında Maç Sayısı</h2>
            <ResponsiveContainer width="100%" height={200}><BarChart data={leagueMatchCounts}><XAxis dataKey="league"/><YAxis/><Tooltip/><Bar dataKey="match_count" fill="#FF9800"/></BarChart></ResponsiveContainer>
          </div>
          <div className="card"><h2>Takım Başı Ortalama Gol</h2>
            <ResponsiveContainer width="100%" height={200}><BarChart data={avgGoals}><XAxis dataKey="name"/><YAxis/><Tooltip/><Bar dataKey="avg_goals" fill="#9C27B0"/></BarChart></ResponsiveContainer>
          </div>
          <div className="card"><h2>Tarihe Göre Maç Sayısı</h2>
            <ResponsiveContainer width="100%" height={200}><LineChart data={matchCountByDate}><XAxis dataKey="match_date"/><YAxis/><Tooltip/><Line dataKey="match_count" stroke="#00BCD4"/></LineChart></ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* CSS */}
      <style jsx>{`
        body { margin:0; }
        .dashboard { display:flex; min-height:100vh; }
        .header { position:fixed; top:0; left:200px; right:0; height:60px; display:flex; justify-content:space-between; align-items:center; padding:0 20px; background:#222; color:#fff; z-index:100; }
        .header select, .header button { margin-left:10px; padding:5px; border:none; border-radius:4px; }
        .sidebar { width:200px; background:#2A2A2A; padding-top:70px; position:fixed; top:0; bottom:0; left:0; }
        .sidebar ul { list-style:none; padding:0; }
        .sidebar li { padding:15px; }
        .sidebar a { color:#FCD116; text-decoration:none; font-weight:bold; }
        .content { margin-left:200px; padding:80px 20px 20px; flex:1; }
        .grid { display:grid; grid-template-columns:1fr 1fr; gap:20px; }
        .card { background:var(--card-bg); padding:15px; border-radius:10px; box-shadow:0 2px 5px rgba(0,0,0,.4); transition:.3s; }
        .card:hover { transform:scale(1.02); box-shadow:0 4px 12px rgba(0,0,0,.5); }
        .card.full { grid-column:1 / span 2; margin-bottom:20px; }
        .card h2 { color:#FCD116; margin-bottom:10px; }
        .styled-table { width:100%; border-collapse:collapse; }
        .styled-table th,td { padding:8px; border-bottom:1px solid #444; }
        .styled-table tr:hover { background:#333; }
        .styled-table th { background:#3A3A3A; color:#FCD116; position:sticky; top:0; }
        .table-container { max-height:250px; overflow-y:auto; }
        .loading, .error { text-align:center; font-size:1.3em; padding:50px; }
        /* Tema */
        .dark { --card-bg:#2A2A2A; background:#1E1E1E; color:#EAEAEA; }
        .light { --card-bg:#fff; background:#f4f4f4; color:#333; }
        @media(max-width:900px){ .grid{ grid-template-columns:1fr; } .header{left:0;} .sidebar{display:none;} .content{margin-left:0;} }
      `}</style>
    </div>
  );
}

export default HomePage;
