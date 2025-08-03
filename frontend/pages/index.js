import React, { useEffect, useState } from "react";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
} from "chart.js";
import { Pie, Bar } from "react-chartjs-2";

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title
);

function HomePage() {
  const [matches, setMatches] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Tema
  const [darkMode, setDarkMode] = useState(true);
  const toggleTheme = () => setDarkMode(!darkMode);

  // Filtreler ve arama
  const [selectedLeague, setSelectedLeague] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const API_BASE = "https://football-dashboard.onrender.com";

  // Seçilen takım
  const [selectedTeam, setSelectedTeam] = useState(null);

  // Veri çekme
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

  // Ligler listesi
  const leagues = [...new Set(matches.map((m) => m.league))];

  // Tarih filtre fonksiyonu
  const filterByDate = (match) => {
    if (!dateFrom && !dateTo) return true;
    const matchDate = new Date(match.match_date);
    if (dateFrom && matchDate < new Date(dateFrom)) return false;
    if (dateTo && matchDate > new Date(dateTo)) return false;
    return true;
  };

  // Lig filtreleme
  const filteredMatches =
    selectedLeague === "All"
      ? matches.filter(filterByDate)
      : matches.filter(
          (m) => m.league === selectedLeague && filterByDate(m)
        );

  // Takım filtreleme (arama inputuna göre)
  const searchedTeams = searchTerm
    ? teams.filter((t) =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : [];

  // Takım seçildiğinde maçları filtreleme
  const teamMatches = selectedTeam
    ? matches.filter(
        (m) =>
          (m.home_team_id === selectedTeam.id || m.away_team_id === selectedTeam.id) &&
          filterByDate(m)
      )
    : [];

  // İstatistik hesaplama fonksiyonları
  const calculateStats = () => {
    if (!selectedTeam) return null;

    let wins = 0,
      draws = 0,
      losses = 0,
      goalsFor = 0,
      goalsAgainst = 0;

    teamMatches.forEach((m) => {
      const [homeGoals, awayGoals] = m.final_score
        .split("-")
        .map((s) => parseInt(s.trim()));
      const isHome = m.home_team_id === selectedTeam.id;
      if (isHome) {
        goalsFor += homeGoals;
        goalsAgainst += awayGoals;
        if (homeGoals > awayGoals) wins++;
        else if (homeGoals === awayGoals) draws++;
        else losses++;
      } else {
        goalsFor += awayGoals;
        goalsAgainst += homeGoals;
        if (awayGoals > homeGoals) wins++;
        else if (awayGoals === homeGoals) draws++;
        else losses++;
      }
    });

    return { wins, draws, losses, goalsFor, goalsAgainst };
  };

  const stats = calculateStats();

  // Grafik için veri
  const pieData = stats
    ? {
        labels: ["Galibiyet", "Beraberlik", "Mağlubiyet"],
        datasets: [
          {
            data: [stats.wins, stats.draws, stats.losses],
            backgroundColor: ["#4caf50", "#ffeb3b", "#f44336"],
            hoverOffset: 20,
          },
        ],
      }
    : null;

  const barData = stats
    ? {
        labels: ["Atılan Gol", "Yenilen Gol"],
        datasets: [
          {
            label: "Gol Sayısı",
            data: [stats.goalsFor, stats.goalsAgainst],
            backgroundColor: ["#2196f3", "#e91e63"],
          },
        ],
      }
    : null;

  if (loading)
    return <div className="loading">⏳ Veriler yükleniyor...</div>;
  if (error)
    return (
      <div className="error">❌ Hata: {error.message || "Bilinmeyen hata"}</div>
    );

  return (
    <div className={darkMode ? "dashboard dark" : "dashboard light"}>
      {/* Header */}
      <div className="header">
        <h1>⚽ Futbol Dashboard</h1>
        <div>
          <select
            value={selectedLeague}
            onChange={(e) => setSelectedLeague(e.target.value)}
          >
            <option value="All">Tüm Ligler</option>
            {leagues.map((l, i) => (
              <option key={i} value={l}>
                {l}
              </option>
            ))}
          </select>
          <button onClick={toggleTheme}>
            {darkMode ? "🌞 Light" : "🌙 Dark"}
          </button>
        </div>
      </div>

      {/* Sidebar */}
      <div className="sidebar">
        <ul>
          <li>
            <a href="#teams">Takımlar</a>
          </li>
          <li>
            <a href="#matches">Maçlar</a>
          </li>
          <li>
            <a href="#dashboard">Dashboard</a>
          </li>
        </ul>
      </div>

      {/* Content */}
      <div className="content">
        {/* Search */}
        <div className="card full" id="teams">
          <h2>Takım Ara ve Seç</h2>
          <input
            type="text"
            placeholder="Takım adı yazınız..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ padding: "8px", width: "100%", marginBottom: "10px" }}
          />
          {searchTerm && (
            <ul className="search-results">
              {searchedTeams.length ? (
                searchedTeams.map((t) => (
                  <li
                    key={t.id}
                    onClick={() => {
                      setSelectedTeam(t);
                      setSearchTerm("");
                    }}
                    style={{
                      cursor: "pointer",
                      padding: "5px",
                      borderBottom: "1px solid #444",
                    }}
                  >
                    {t.name}
                  </li>
                ))
              ) : (
                <li>Takım bulunamadı</li>
              )}
            </ul>
          )}
        </div>

        {/* Dashboard */}
        {selectedTeam && (
          <div className="card full" id="dashboard">
            <h2>{selectedTeam.name} - İstatistikler</h2>
            <p>Maç Sayısı: {teamMatches.length}</p>
            <p>Galibiyet: {stats?.wins}</p>
            <p>Beraberlik: {stats?.draws}</p>
            <p>Mağlubiyet: {stats?.losses}</p>

            {/* Pie Chart */}
            {pieData && <Pie data={pieData} />}

            {/* Bar Chart */}
            {barData && <Bar data={barData} options={{ responsive: true }} />}
          </div>
        )}

        {/* Lig ve Tarih Filtreleri */}
        <div className="card full" id="matches">
          <h2>Maçlar ({selectedLeague})</h2>
          <div style={{ marginBottom: "10px" }}>
            <label>
              Tarih (Başlangıç):{" "}
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </label>
            <label style={{ marginLeft: "20px" }}>
              Tarih (Bitiş):{" "}
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </label>
          </div>
          <div className="table-container">
            <table className="styled-table">
              <thead>
                <tr>
                 
                  <th>Ev</th>
                  <th>Dep</th>
                  <th>Final Skor</th>
                  <th>Tarih</th>
                  <th>Lig</th>
                </tr>
              </thead>
              <tbody>
                {filteredMatches.map((m) => (
                  <tr key={m.id}>
                    
                    <td>
                      {teams.find((t) => t.id === m.home_team_id)?.name ||
                        m.home_team_id}
                    </td>
                    <td>
                      {teams.find((t) => t.id === m.away_team_id)?.name ||
                        m.away_team_id}
                    </td>
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
        body {
          margin: 0;
        }
        .dashboard {
          display: flex;
          min-height: 100vh;
        }
        .header {
          position: fixed;
          top: 0;
          left: 200px;
          right: 0;
          height: 60px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0 20px;
          background: #222;
          color: #fff;
          z-index: 100;
        }
        .header select,
        .header button {
          margin-left: 10px;
          padding: 5px;
          border: none;
          border-radius: 4px;
        }
        .sidebar {
          width: 200px;
          background: #2a2a2a;
          padding-top: 70px;
          position: fixed;
          top: 0;
          bottom: 0;
          left: 0;
        }
        .sidebar ul {
          list-style: none;
          padding: 0;
        }
        .sidebar li {
          padding: 15px;
        }
        .sidebar a {
          color: #fcd116;
          text-decoration: none;
          font-weight: bold;
          cursor: pointer;
        }
        .content {
          margin-left: 200px;
          padding: 80px 20px 20px;
          flex: 1;
        }
        .card {
          background: var(--card-bg);
          padding: 15px;
          border-radius: 10px;
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.4);
          transition: 0.3s;
          margin-bottom: 20px;
        }
        .card.full {
          grid-column: 1 / span 2;
        }
        .card h2 {
          color: #fcd116;
          margin-bottom: 10px;
        }
        .styled-table {
          width: 100%;
          border-collapse: collapse;
        }
        .styled-table th,
        td {
          padding: 8px;
          border-bottom: 1px solid #444;
        }
        .styled-table tr:hover {
          background: #333;
        }
        .styled-table th {
          background: #3a3a3a;
          color: #fcd116;
          position: sticky;
          top: 0;
        }
        .table-container {
          max-height: 250px;
          overflow-y: auto;
        }
        .loading,
        .error {
          text-align: center;
          font-size: 1.3em;
          padding: 50px;
        }
        /* Tema */
        .dark {
          --card-bg: #2a2a2a;
          background: #1e1e1e;
          color: #eaeaea;
        }
        .light {
          --card-bg: #fff;
          background: #f4f4f4;
          color: #333;
        }
        .td {
          text-align: center;
        
        }
        .search-results {
          list-style: none;
          max-height: 150px;
          overflow-y: auto;
          padding: 0;
          margin: 0;
          border: 1px solid #444;
          border-radius: 5px;
          background: var(--card-bg);
        }
        .search-results li:hover {
          background: #444;
          cursor: pointer;
        }
        @media (max-width: 900px) {
          .header {
            left: 0;
          }
          .sidebar {
            display: none;
          }
          .content {
            margin-left: 0;
          }
        }
      `}</style>
    </div>
  );
}

export default HomePage;
