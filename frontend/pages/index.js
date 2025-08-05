import React, { useState, useEffect, useRef } from 'react';
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
import { Bar, Pie, Line, Radar } from 'react-chartjs-2';

// React-icons'u Next.js'de kullanmak için Next.js'e özel bazı ayarlamalar
// gerekebilir. Bu durumdan kaçınmak için SVG ve Unicode karakterler kullanıldı.

// Chart.js bileşenlerini global olarak kaydediyoruz.
// Next.js'deki dynamic import'a gerek kalmadan çalışacaktır.
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

/*
  Bu kod, futbol ligi istatistiklerini gösteren bir dashboard uygulamasıdır.
  Mevcut API'dan alınan verilerle Chart.js kütüphanesi kullanılarak
  dinamik ve interaktif grafikler oluşturulmuştur.
  Kullanıcı deneyimini artırmak için gelişmiş arama ve yükleme ekranı eklenmiştir.
  Bu versiyon, stillendirme için Tailwind CSS yerine, component içerisinde yer alan
  bir <style> etiketi kullanır.
*/

const API_BASE = "https://football-dashboard.onrender.com";

const App = () => {
  const [matches, setMatches] = useState([]);
  const [teams, setTeams] = useState([]);
  const [searchTeam, setSearchTeam] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [showSidebar, setShowSidebar] = useState(false);
  const searchInputRef = useRef(null);

  // Veri çekme işlemi
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [teamsRes, matchesRes] = await Promise.all([
          fetch(`${API_BASE}/teams/`),
          fetch(`${API_BASE}/matches/`)
        ]);
        const teamsData = await teamsRes.json();
        const matchesData = await matchesRes.json();
        setTeams(teamsData);
        setMatches(matchesData);
      } catch (e) {
        setError(e);
      } finally {
        setTimeout(() => { // Yükleme ekranı süresini simüle etmek için eklendi.
          setIsLoading(false);
        }, 1500);
      }
    };
    fetchData();
  }, []);

  // Arama terimine göre önerileri filtreleme
  useEffect(() => {
    if (searchTeam.length > 1) {
      const filteredSuggestions = teams
        .filter(team => team.name.toLowerCase().startsWith(searchTeam.toLowerCase()))
        .slice(0, 5); // İlk 5 öneriyi al
      setSuggestions(filteredSuggestions);
    } else {
      setSuggestions([]);
    }
  }, [searchTeam, teams]);

  // Arama kutusu dışına tıklandığında önerileri kapatma
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchInputRef.current && !searchInputRef.current.contains(event.target)) {
        setSuggestions([]);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Tema değişikliğini yönetme
  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  // Takım seçme ve arama durumunu sıfırlama
  const handleSelectTeam = (team) => {
    setSelectedTeam(team);
    setSearchTeam('');
    setSuggestions([]);
  };

  // Genel görünüme dönme
  const handleReset = () => {
    setSelectedTeam(null);
    setSearchTeam('');
    setSuggestions([]);
  };

  // Yükleme ekranı
  if (isLoading) {
    return (
      <div className={`app-loading-screen ${isDarkMode ? 'dark' : ''}`}>
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <p className="loading-text">Veriler Yükleniyor...</p>
        </div>
      </div>
    );
  }

  // Hata ekranı
  if (error) {
    return (
      <div className={`app-error-screen ${isDarkMode ? 'dark' : ''}`}>
        <div className="error-message-box">
          <p className="error-title">❌ Hata Oluştu</p>
          <p className="error-text">Veriler yüklenirken bir sorunla karşılaşıldı: {error.message}</p>
        </div>
      </div>
    );
  }

  // --- Genel Ligler İçin Veri Hesaplama ---
  const leagueCounts = matches.reduce((acc, m) => { acc[m.league] = (acc[m.league] || 0) + 1; return acc; }, {});
  const leagues = Object.keys(leagueCounts);

  // Genel Grafik 1: Toplam Maç Sayısı
  const generalChart1Data = {
    labels: leagues,
    datasets: [{
      label: 'Toplam Maç Sayısı',
      data: leagues.map(l => leagueCounts[l]),
      backgroundColor: leagues.map((_, i) => `hsl(${i * 60}, 70%, 50%)`),
    }]
  };

  // Genel Grafik 2: En Golcü Takımlar (Her Ligden Bir Tane)
  const topScorersPerLeague = leagues.map(league => {
    const leagueMatches = matches.filter(m => m.league === league);
    const teamGoals = leagueMatches.reduce((acc, m) => {
      const [h, a] = m.final_score.split('-').map(Number);
      acc[m.home_team_id] = (acc[m.home_team_id] || 0) + h;
      acc[m.away_team_id] = (acc[m.away_team_id] || 0) + a;
      return acc;
    }, {});

    const topTeamId = Object.keys(teamGoals).reduce((a, b) => teamGoals[a] > teamGoals[b] ? a : b, null);
    const topTeam = teams.find(t => t.id === +topTeamId);

    return {
      league: league,
      teamName: topTeam ? topTeam.name : 'Bilinmiyor',
      goals: topTeamId ? teamGoals[topTeamId] : 0,
    };
  });
  const generalChart2Data = {
    labels: topScorersPerLeague.map(item => `${item.teamName} (${item.league})`),
    datasets: [{
      label: 'Atılan Gol',
      data: topScorersPerLeague.map(item => item.goals),
      backgroundColor: '#22c55e',
    }]
  };

  // Galibiyet, beraberlik, mağlubiyet verilerini hesaplama
  const calculateWinRates = (matchList) => {
    let wins = 0, draws = 0, losses = 0;
    matchList.forEach(m => {
      const [h, a] = m.final_score.split('-').map(Number);
      if (h > a) wins++;
      else if (h < a) losses++;
      else draws++;
    });
    return { wins, draws, losses };
  };

  // Genel Grafik 3: Liglerin Galibiyet, Beraberlik, Mağlubiyet Oranları
  const leagueResults = leagues.map(league => {
    const leagueMatches = matches.filter(m => m.league === league);
    const { wins, draws, losses } = calculateWinRates(leagueMatches);
    return { league, wins, draws, losses };
  });
  const generalChart3Data = {
    labels: leagues,
    datasets: [
      { label: 'Galibiyet', data: leagueResults.map(r => r.wins), backgroundColor: '#10b981' },
      { label: 'Beraberlik', data: leagueResults.map(r => r.draws), backgroundColor: '#f59e0b' },
      { label: 'Mağlubiyet', data: leagueResults.map(r => r.losses), backgroundColor: '#ef4444' },
    ]
  };

  // Genel Grafik 4: Liglerdeki Kırmızı Kartlar (Örnek Veri)
  const redCardsData = {
    labels: leagues,
    datasets: [{
      label: 'Toplam Kırmızı Kart',
      data: leagues.map(l => (l.length * 5) + Math.floor(Math.random() * 10)), // Örnek veri
      backgroundColor: '#eab308'
    }]
  };


  // --- Takıma Özel Veri Hesaplama ---
  const teamMatches = selectedTeam ? matches.filter(m => m.home_team_id === selectedTeam.id || m.away_team_id === selectedTeam.id) : [];
  const teamWinRates = selectedTeam ? teamMatches.reduce((acc, m) => {
    const [h, a] = m.final_score.split('-').map(Number);
    if ((m.home_team_id === selectedTeam.id && h > a) || (m.away_team_id === selectedTeam.id && a > h)) {
      acc.wins++;
    } else if (h === a) {
      acc.draws++;
    } else {
      acc.losses++;
    }
    return acc;
  }, { wins: 0, draws: 0, losses: 0 }) : { wins: 0, draws: 0, losses: 0 };
  const monthlyGoals = selectedTeam ? teamMatches.reduce((acc, m) => {
    const month = new Date(m.match_date).toLocaleString('tr-TR', { month: 'long' });
    const goals = m.home_team_id === selectedTeam.id ? +m.final_score.split('-')[0] : +m.final_score.split('-')[1];
    if (acc[month]) {
      acc[month] += goals;
    } else {
      acc[month] = goals;
    }
    return acc;
  }, {}) : {};

  const teamGoalsOverTime = Object.entries(monthlyGoals).map(([month, goals]) => ({ month, goals }));

  const homeGoals = teamMatches.reduce((acc, m) => acc + (m.home_team_id === selectedTeam.id ? +m.final_score.split('-')[0] : +m.final_score.split('-')[1]), 0);
  const awayGoals = teamMatches.reduce((acc, m) => acc + (m.away_team_id === selectedTeam.id ? +m.final_score.split('-')[1] : +m.final_score.split('-')[0]), 0);
  
  // Takıma Özel Grafik 1: Galibiyet, Beraberlik, Mağlubiyet Oranı
  const teamChart1Data = {
    labels: ['Galibiyet', 'Beraberlik', 'Mağlubiyet'],
    datasets: [{
      data: [teamWinRates.wins, teamWinRates.draws, teamWinRates.losses],
      backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
      hoverOffset: 4,
    }]
  };

  // Takıma Özel Grafik 2: Aylık Atılan Goller
  const teamChart2Data = {
    labels: teamGoalsOverTime.map(item => item.month),
    datasets: [{
      label: 'Atılan Goller',
      data: teamGoalsOverTime.map(item => item.goals),
      fill: false,
      borderColor: '#3b82f6',
      tension: 0.1,
    }]
  };

  // Takıma Özel Grafik 3: Ev ve Deplasman Performansı (Galibiyet)
  const teamPerformance = {
    labels: ['Ev', 'Deplasman'],
    datasets: [
      {
        label: 'Galibiyet',
        data: [
          teamMatches.filter(m => m.home_team_id === selectedTeam.id && +m.final_score.split('-')[0] > +m.final_score.split('-')[1]).length,
          teamMatches.filter(m => m.away_team_id === selectedTeam.id && +m.final_score.split('-')[1] > +m.final_score.split('-')[0]).length
        ],
        backgroundColor: '#10b981',
      },
      {
        label: 'Mağlubiyet',
        data: [
          teamMatches.filter(m => m.home_team_id === selectedTeam.id && +m.final_score.split('-')[0] < +m.final_score.split('-')[1]).length,
          teamMatches.filter(m => m.away_team_id === selectedTeam.id && +m.final_score.split('-')[1] < +m.final_score.split('-')[0]).length
        ],
        backgroundColor: '#ef4444',
      }
    ]
  };

  // Takıma Özel Grafik 4: Atılan Gol Dağılımı (Radar)
  const teamChart4Data = {
    labels: ['Ev Golleri', 'Deplasman Golleri'],
    datasets: [{
      label: 'Atılan Goller',
      data: [homeGoals, awayGoals],
      backgroundColor: 'rgba(59, 130, 246, 0.2)',
      borderColor: '#3b82f6',
      pointBackgroundColor: '#3b82f6',
      pointBorderColor: '#fff',
      pointHoverBackgroundColor: '#fff',
      pointHoverBorderColor: '#3b82f6',
    }]
  };

  // Yardımcı bileşen: Grafik Kartı
  const ChartCard = ({ title, children }) => (
    <div className="chart-card">
      <h2 className="chart-title">{title}</h2>
      <div className="chart-container">
        {children}
      </div>
    </div>
  );

  return (
    <>
      <style jsx>{`
        :root {
          --bg-color: #f3f4f6;
          --text-color: #111827;
          --card-bg-color: #ffffff;
          --shadow-color: rgba(0, 0, 0, 0.1);
          --header-bg-color: #ffffff;
          --search-bg-color: #e5e7eb;
          --search-text-color: #4b5563;
          --border-color: #e5e7eb;
          --hover-color: #e5e7eb;
          --success-color: #10b981;
          --error-color: #ef4444;
          --warning-color: #f59e0b;
        }
        
        .dark {
          --bg-color: #111827;
          --text-color: #f3f4f6;
          --card-bg-color: #1f2937;
          --shadow-color: rgba(0, 0, 0, 0.2);
          --header-bg-color: #1f2937;
          --search-bg-color: #374151;
          --search-text-color: #9ca3af;
          --border-color: #4b5563;
          --hover-color: #374151;
        }

        .app-container {
          height: 100vh;
          display: flex;
          transition: background-color 0.3s;
          overflow: hidden;
          background-color: var(--bg-color);
          color: var(--text-color);
        }
        
        .app-loading-screen, .app-error-screen {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          transition: background-color 0.3s;
          background-color: var(--bg-color);
          color: var(--text-color);
        }

        .loading-content {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        
        .loading-spinner {
          width: 4rem;
          height: 4rem;
          border: 4px dashed #22c55e;
          border-radius: 9999px;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .loading-text {
          margin-top: 1rem;
          font-size: 1.25rem;
          font-weight: 600;
        }
        
        .error-message-box {
          text-align: center;
          padding: 2rem;
          background-color: #dc2626;
          color: #ffffff;
          border-radius: 0.5rem;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        }
        
        .error-title {
          font-size: 1.5rem;
          font-weight: 700;
        }
        
        .error-text {
          margin-top: 0.5rem;
        }
        
        .app-sidebar {
          position: fixed;
          z-index: 20;
          height: 100%;
          width: 16rem;
          padding: 1.5rem;
          background-color: var(--card-bg-color);
          color: var(--text-color);
          transition: transform 0.3s ease-in-out;
          transform: translateX(-100%);
        }
        
        .app-sidebar.show {
          transform: translateX(0);
        }
        
        .sidebar-title {
          font-size: 1.875rem;
          font-weight: 700;
          margin-bottom: 1.5rem;
        }

        .sidebar-nav-item {
          margin-bottom: 0.5rem;
        }

        .sidebar-nav-link {
          display: block;
          padding: 0.5rem;
          border-radius: 0.5rem;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .sidebar-nav-link:hover {
          background-color: var(--hover-color);
        }
        
        .main-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          margin-left: 0;
          background-color: var(--bg-color);
          color: var(--text-color);
          transition: all 0.3s;
        }
        
        @media (min-width: 1024px) {
          .app-sidebar {
            transform: translateX(0);
          }
          
          .main-content {
            margin-left: 16rem;
          }
        }
        
        .app-header {
          position: sticky;
          top: 0;
          z-index: 10;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem;
          background-color: var(--header-bg-color);
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
        }
        
        .header-content {
          display: flex;
          align-items: center;
        }
        
        .header-menu-button {
          padding: 0.5rem;
          border-radius: 9999px;
          transition: background-color 0.2s;
          margin-right: 1rem;
        }
        
        @media (min-width: 1024px) {
          .header-menu-button {
            display: none;
          }
        }
        
        .header-menu-button:hover {
          background-color: var(--hover-color);
        }
        
        .header-title {
          font-size: 1.5rem;
          font-weight: 700;
        }

        @media (max-width: 767px) {
          .header-title {
            display: none;
          }
        }
        
        .search-container {
          position: relative;
          flex: 1;
          max-width: 32rem;
          margin-left: 1rem;
          margin-right: 1rem;
        }
        
        .search-box {
          position: relative;
        }
        
        .search-icon {
          position: absolute;
          left: 0.75rem;
          top: 50%;
          transform: translateY(-50%);
          color: var(--search-text-color);
        }
        
        .search-input {
          width: 100%;
          padding-top: 0.5rem;
          padding-bottom: 0.5rem;
          padding-left: 2.5rem;
          padding-right: 1rem;
          background-color: var(--search-bg-color);
          border-radius: 9999px;
          border: none;
        }
        
        .search-input:focus {
          outline: none;
          ring: 2px solid #22c55e;
          ring-opacity: 0.5;
        }

        .search-suggestions {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          z-index: 30;
          margin-top: 0.5rem;
          background-color: var(--card-bg-color);
          border-radius: 0.5rem;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
          border: 1px solid var(--border-color);
          max-height: 15rem;
          overflow-y: auto;
        }

        .suggestion-item {
          padding: 0.75rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          transition: background-color 0.2s;
        }

        .suggestion-item:hover {
          background-color: var(--hover-color);
        }

        .suggestion-icon {
          color: var(--search-text-color);
          margin-right: 0.75rem;
        }

        .suggestion-text {
          font-size: 0.875rem;
          font-weight: 500;
        }
        
        .theme-toggle-button {
          padding: 0.5rem;
          border-radius: 9999px;
          transition: background-color 0.2s;
        }
        
        .theme-toggle-button:hover {
          background-color: var(--hover-color);
        }
        
        .main-content-inner {
          flex: 1;
          overflow: auto;
          padding: 1rem;
        }
        
        @media (min-width: 768px) {
          .main-content-inner {
            padding: 2rem;
          }
        }
        
        .team-stats-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 2rem;
        }
        
        .team-stats-title {
          font-size: 1.875rem;
          font-weight: 700;
        }
        
        .back-button {
          background-color: #22c55e;
          color: #ffffff;
          font-weight: 700;
          padding: 0.5rem 1rem;
          border-radius: 9999px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          transition: transform 0.2s;
        }
        
        .back-button:hover {
          background-color: #15803d;
        }

        .back-button:active {
          transform: scale(0.95);
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(1, minmax(0, 1fr));
          gap: 2rem;
          margin-bottom: 2rem;
        }

        @media (min-width: 768px) {
          .stats-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        .chart-card {
          background-color: var(--card-bg-color);
          border-radius: 1rem;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        
        .chart-title {
          font-size: 1.125rem;
          font-weight: 600;
          margin-bottom: 1rem;
          color: var(--text-color);
        }
        
        .chart-container {
          width: 100%;
          height: 20rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .match-list-container {
          background-color: var(--card-bg-color);
          border-radius: 1rem;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
          padding: 1.5rem;
        }
        
        .match-list-title {
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 1rem;
          color: var(--text-color);
        }

        .match-list-table {
          min-width: 100%;
          table-layout: auto;
          text-align: left;
        }

        .table-header {
          background-color: var(--hover-color);
          font-size: 0.875rem;
          font-weight: 600;
        }

        .table-header th {
          padding: 0.75rem 1rem;
          color: #4b5563;
        }
        
        .dark .table-header th {
          color: #d1d5db;
        }

        .table-header th:first-child {
          border-top-left-radius: 0.5rem;
        }

        .table-header th:last-child {
          border-top-right-radius: 0.5rem;
        }

        .table-row {
          border-bottom: 1px solid var(--border-color);
        }

        .table-row:last-child {
          border-bottom: none;
        }

        .table-cell {
          padding: 0.75rem 1rem;
          font-size: 0.875rem;
        }

        .cell-result {
          font-weight: 600;
        }

        .result-win {
          color: #10b981;
        }
        .result-loss {
          color: #ef4444;
        }
        .result-draw {
          color: #f59e0b;
        }
      `}</style>
      <div className={`app-container ${isDarkMode ? 'dark' : ''}`}>
        {/* Sidebar - Sadece takım arama modunda göster */}
        <aside className={`app-sidebar ${showSidebar ? 'show' : ''}`}>
          <h2 className="sidebar-title">Ligler</h2>
          <nav>
            <ul>
              {leagues.map(l => (
                <li key={l} className="sidebar-nav-item">
                  <a onClick={handleReset} className="sidebar-nav-link">
                    {l}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        {/* Ana İçerik */}
        <main className="main-content">
          <header className="app-header">
            <div className="header-content">
              <button
                onClick={() => setShowSidebar(!showSidebar)}
                className="header-menu-button"
              >
                <span className="text-2xl">☰</span>
              </button>
              <h1 className="header-title">Futbol Dashboard</h1>
            </div>
            <div className="search-container" ref={searchInputRef}>
              <div className="search-box">
                <span className="search-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-search"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                </span>
                <input
                  type="text"
                  className="search-input"
                  placeholder="Takım ara..."
                  value={searchTeam}
                  onChange={e => setSearchTeam(e.target.value)}
                />
              </div>
              {suggestions.length > 0 && (
                <div className="search-suggestions">
                  {suggestions.map((team) => (
                    <div
                      key={team.id}
                      onClick={() => handleSelectTeam(team)}
                      className="suggestion-item"
                    >
                      <span className="suggestion-icon">⚽</span>
                      <span className="suggestion-text">{team.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button onClick={toggleTheme} className="theme-toggle-button">
              {isDarkMode ? <span className="text-2xl">🌞</span> : <span className="text-2xl">🌙</span>}
            </button>
          </header>

          <div className="main-content-inner">
            {selectedTeam ? (
              <div>
                {/* Takım adı başlığı ve geri dön butonu */}
                <div className="team-stats-header">
                  <h2 className="team-stats-title">{selectedTeam.name} İstatistikleri</h2>
                  <button onClick={handleReset} className="back-button">
                    Geri Dön
                  </button>
                </div>

                {/* Takıma özel grafikler */}
                <div className="stats-grid">
                  <ChartCard title={`${selectedTeam.name} Galibiyet, Beraberlik, Mağlubiyet Oranı`}>
                    <Pie data={teamChart1Data} />
                  </ChartCard>
                  <ChartCard title={`${selectedTeam.name} Aylık Atılan Goller`}>
                    <Line data={teamChart2Data} />
                  </ChartCard>
                  <ChartCard title={`${selectedTeam.name} Ev ve Deplasman Performansı`}>
                    <Bar data={teamPerformance} />
                  </ChartCard>
                  <ChartCard title={`${selectedTeam.name} Ev/Deplasman Golleri`}>
                    <Radar data={teamChart4Data} />
                  </ChartCard>
                </div>

                {/* Takıma özel maç listesi */}
                <div className="match-list-container">
                  <h2 className="match-list-title">Oynanan Maçlar</h2>
                  <div className="overflow-x-auto">
                    <table className="match-list-table">
                      <thead>
                        <tr className="table-header">
                          <th className="rounded-tl-xl">Tarih</th>
                          <th>Rakip</th>
                          <th>Skor</th>
                          <th className="rounded-tr-xl">Sonuç</th>
                        </tr>
                      </thead>
                      <tbody>
                        {teamMatches.map(m => {
                          const opponent = teams.find(t => (m.home_team_id === selectedTeam.id ? t.id === m.away_team_id : t.id === m.home_team_id));
                          const score = m.final_score;
                          const [h, a] = score.split('-').map(Number);
                          let result;
                          if (h === a) {
                            result = 'Beraberlik';
                          } else if ((m.home_team_id === selectedTeam.id && h > a) || (m.away_team_id === selectedTeam.id && a > h)) {
                            result = 'Galibiyet';
                          } else {
                            result = 'Mağlubiyet';
                          }
                          return (
                            <tr key={m.id} className="table-row">
                              <td className="table-cell">{m.match_date}</td>
                              <td className="table-cell">{opponent?.name || 'Bilinmiyor'}</td>
                              <td className="table-cell">{score}</td>
                              <td className={`table-cell cell-result ${
                                result === 'Galibiyet' ? 'result-win' :
                                result === 'Mağlubiyet' ? 'result-loss' : 'result-draw'
                              }`}>
                                {result}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              // Genel ligler görünümü
              <div className="stats-grid">
                <ChartCard title="Liglerde Oynanan Toplam Maç">
                  <Bar data={generalChart1Data} />
                </ChartCard>
                <ChartCard title="Liglerin En Golcü Takımları">
                  <Bar data={generalChart2Data} />
                </ChartCard>
                <ChartCard title="Liglerin Galibiyet/Beraberlik/Mağlubiyet Oranları">
                  <Bar data={generalChart3Data} />
                </ChartCard>
                <ChartCard title="Liglerin Kırmızı Kart Sayıları">
                  <Bar data={redCardsData} />
                </ChartCard>
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}

export default App;
