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
// Tailwind CSS'i doğrudan React dosyasına dahil etmiyoruz, çünkü bu derleme hatasına neden olabilir.
// Tailwind kurulumu genellikle proje genelinde bir CSS dosyası aracılığıyla yapılır.
import { Bar, Pie, Line, Radar } from 'react-chartjs-2';

// Chart.js bileşenlerini global olarak kaydediyoruz.
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
  Kullanıcının isteği üzerine takım maç listesi artık sabit bir yükseklikte
  kaydırılabilir bir alanda gösterilmektedir. Ayrıca, maçları tarih aralığına
  göre filtreleme özelliği eklenmiştir ve bu bölüm takım istatistikleri
  grafiklerinin hemen altına taşınmıştır.
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
  const [startDate, setStartDate] = useState(''); // Başlangıç tarihi için state
  const [endDate, setEndDate] = useState('');     // Bitiş tarihi için state
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
        setTimeout(() => {
          setIsLoading(false);
        }, 2000);
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
    setStartDate(''); // Tarih filtrelerini de sıfırla
    setEndDate('');
  };

  // Yükleme ekranı
  if (isLoading) {
    return (
      <div className={`app-loading-screen ${isDarkMode ? 'dark' : ''}`}>
        <div className="loading-content">
          <div className="loading-animation">
            <div className="ball one"></div>
            <div className="ball two"></div>
            <div className="ball three"></div>
          </div>
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
  const leagues = [...new Set(matches.map(m => m.league))];

  // Genel Grafik 1: Liglerde Oynanan Maç Sayısı
  const matchesPerLeague = leagues.reduce((acc, l) => {
    acc[l] = matches.filter(m => m.league === l).length;
    return acc;
  }, {});
  const generalChart1Data = {
    labels: Object.keys(matchesPerLeague),
    datasets: [{
      label: 'Toplam Maç Sayısı',
      data: Object.values(matchesPerLeague),
      backgroundColor: ['#22c55e', '#3b82f6', '#f97316', '#ef4444', '#a855f7'],
    }]
  };

  // Genel Grafik 2: Liglerin Galibiyet, Beraberlik, Mağlubiyet Oranları
  const leagueResults = leagues.map(league => {
    const leagueMatches = matches.filter(m => m.league === league);
    let wins = 0, draws = 0, losses = 0;
    leagueMatches.forEach(m => {
      // Güvenli split işlemi için null kontrolü eklendi
      const finalScore = m.final_score || '0 - 0';
      const [h, a] = finalScore.split(' - ').map(Number);
      if (h > a) wins++;
      else if (h < a) losses++;
      else draws++;
    });
    return { league, wins, draws, losses };
  });
  const generalChart2Data = {
    labels: leagues,
    datasets: [
      { label: 'Galibiyet', data: leagueResults.map(r => r.wins), backgroundColor: '#10b981' },
      { label: 'Beraberlik', data: leagueResults.map(r => r.draws), backgroundColor: '#f59e0b' },
      { label: 'Mağlubiyet', data: leagueResults.map(r => r.losses), backgroundColor: '#ef4444' },
    ]
  };

  // Genel Grafik 3: İlk Yarı ve Final Golleri
  const totalFirstHalfGoals = matches.reduce((acc, m) => {
    const firstHalfScore = m.first_half_score || '0 - 0';
    return acc + firstHalfScore.split(' - ').map(Number).reduce((sum, g) => sum + g, 0);
  }, 0);
  const totalSecondHalfGoals = matches.reduce((acc, m) => {
    const finalScore = m.final_score || '0 - 0';
    const firstHalfScore = m.first_half_score || '0 - 0';
    const finalGoals = finalScore.split(' - ').map(Number).reduce((sum, g) => sum + g, 0);
    const firstHalfGoals = firstHalfScore.split(' - ').map(Number).reduce((sum, g) => sum + g, 0);
    return acc + (finalGoals - firstHalfGoals);
  }, 0);
  const generalChart3Data = {
    labels: ['İlk Yarı Golleri', 'İkinci Yarı Golleri'],
    datasets: [{
      data: [totalFirstHalfGoals, totalSecondHalfGoals],
      backgroundColor: ['#3b82f6', '#f97316'],
      hoverOffset: 4,
    }]
  };
  
  // Genel Grafik 4: Ülkelere Göre Maç Sayısı
  const countries = [...new Set(matches.map(m => m.country))];
  const matchesPerCountry = countries.reduce((acc, c) => {
    acc[c] = matches.filter(m => m.country === c).length;
    return acc;
  }, {});
  const generalChart4Data = {
    labels: Object.keys(matchesPerCountry),
    datasets: [{
      label: 'Ülke Başına Maç Sayısı',
      data: Object.values(matchesPerCountry),
      backgroundColor: ['#3b82f6', '#f97316', '#a855f7'],
    }]
  };


  // --- Takıma Özel Veri Hesaplama ---
  // Tarih filtrelerini de kullanarak maçları filtrele
  const teamMatches = selectedTeam ? matches.filter(m => {
    const matchDate = new Date(m.date);
    const filterStartDate = startDate ? new Date(startDate) : null;
    const filterEndDate = endDate ? new Date(endDate) : null;
    
    // Hem takım filtresi hem de tarih filtresi uygulanır
    const isTeamMatch = m.home_team_id === selectedTeam.id || m.away_team_id === selectedTeam.id;
    const isWithinDateRange = (!filterStartDate || matchDate >= filterStartDate) && (!filterEndDate || matchDate <= filterEndDate);

    return isTeamMatch && isWithinDateRange;
  }) : [];
  
  // Takıma özel galibiyet, beraberlik, mağlubiyet verileri
  const teamWinRates = selectedTeam ? teamMatches.reduce((acc, m) => {
    const finalScore = m.final_score || '0 - 0';
    const [h, a] = finalScore.split(' - ').map(Number);
    if ((m.home_team_id === selectedTeam.id && h > a) || (m.away_team_id === selectedTeam.id && a > h)) {
      acc.wins++;
    } else if (h === a) {
      acc.draws++;
    } else {
      acc.losses++;
    }
    return acc;
  }, { wins: 0, draws: 0, losses: 0 }) : { wins: 0, draws: 0, losses: 0 };
  
  // Takıma özel aylık goller
  const monthlyGoals = selectedTeam ? teamMatches.reduce((acc, m) => {
    const matchDate = new Date(m.date);
    const month = matchDate.toLocaleString('tr-TR', { month: 'long' });
    const finalScore = m.final_score || '0 - 0';
    const goals = m.home_team_id === selectedTeam.id ? +finalScore.split(' - ')[0] : +finalScore.split(' - ')[1];
    if (acc[month]) {
      acc[month] += goals;
    } else {
      acc[month] = goals;
    }
    return acc;
  }, {}) : {};

  // Aylık gol verilerini doğru sırayla al
  const sortedMonthlyGoals = Object.keys(monthlyGoals)
    .sort((a, b) => new Date(`01 ${a} 2020`).getMonth() - new Date(`01 ${b} 2020`).getMonth())
    .map(month => ({ month, goals: monthlyGoals[month] }));

  // Takıma özel ev ve deplasman performansı verileri
  const homeWins = teamMatches.filter(m => {
    const finalScore = m.final_score || '0 - 0';
    return m.home_team_id === selectedTeam.id && +finalScore.split(' - ')[0] > +finalScore.split(' - ')[1];
  }).length;
  const awayWins = teamMatches.filter(m => {
    const finalScore = m.final_score || '0 - 0';
    return m.away_team_id === selectedTeam.id && +finalScore.split(' - ')[1] > +finalScore.split(' - ')[0];
  }).length;
  const homeLosses = teamMatches.filter(m => {
    const finalScore = m.final_score || '0 - 0';
    return m.home_team_id === selectedTeam.id && +finalScore.split(' - ')[0] < +finalScore.split(' - ')[1];
  }).length;
  const awayLosses = teamMatches.filter(m => {
    const finalScore = m.final_score || '0 - 0';
    return m.away_team_id === selectedTeam.id && +finalScore.split(' - ')[1] < +finalScore.split(' - ')[0];
  }).length;
  
  // Takıma özel ilk yarı ve ikinci yarı golleri
  const teamFirstHalfGoals = teamMatches.reduce((acc, m) => {
    const firstHalfScore = m.first_half_score || '0 - 0';
    return acc + (m.home_team_id === selectedTeam.id ? +firstHalfScore.split(' - ')[0] : +firstHalfScore.split(' - ')[1]);
  }, 0);
  const teamSecondHalfGoals = teamMatches.reduce((acc, m) => {
    const finalScore = m.final_score || '0 - 0';
    const firstHalfScore = m.first_half_score || '0 - 0';
    const teamFinalGoals = m.home_team_id === selectedTeam.id ? +finalScore.split(' - ')[0] : +finalScore.split(' - ')[1];
    const teamFirstHalfGoals = m.home_team_id === selectedTeam.id ? +firstHalfScore.split(' - ')[0] : +firstHalfScore.split(' - ')[1];
    return acc + (teamFinalGoals - teamFirstHalfGoals);
  }, 0);

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
    labels: sortedMonthlyGoals.map(item => item.month),
    datasets: [{
      label: 'Atılan Goller',
      data: sortedMonthlyGoals.map(item => item.goals),
      fill: false,
      borderColor: '#3b82f6',
      tension: 0.3,
    }]
  };

  // Takıma Özel Grafik 3: Ev ve Deplasman Performansı (Galibiyet/Mağlubiyet)
  const teamPerformanceData = {
    labels: ['Ev', 'Deplasman'],
    datasets: [
      { label: 'Galibiyet', data: [homeWins, awayWins], backgroundColor: '#10b981' },
      { label: 'Mağlubiyet', data: [homeLosses, awayLosses], backgroundColor: '#ef4444' },
    ]
  };

  // Takıma Özel Grafik 4: İlk Yarı ve İkinci Yarı Golleri
  const teamChart4Data = {
    labels: ['İlk Yarı', 'İkinci Yarı'],
    datasets: [{
      label: 'Atılan Goller',
      data: [teamFirstHalfGoals, teamSecondHalfGoals],
      backgroundColor: ['#f97316', '#3b82f6'],
      hoverOffset: 4,
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
        /* Sadece bu bileşen için geçerli CSS kuralları */
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

        /* Düzeltme: Body ve HTML kenar boşluklarını (margin) sıfırlıyoruz. */
        html, body {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif;
        }

        .app-container {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          transition: background-color 0.3s;
          background-color: var(--bg-color);
          color: var(--text-color);
        }
        
        .app-loading-screen, .app-error-screen {
          /* Yükleme ekranı için yapılan düzeltme */
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 100; /* En üst katmanda görünmesini sağlar */
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background-color 0.3s;
          background-color: var(--bg-color);
          color: var(--text-color);
        }

        .loading-content {
          text-align: center;
        }

        .loading-animation {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100px;
        }

        .ball {
          width: 20px;
          height: 20px;
          background-color: #22c55e;
          border-radius: 50%;
          margin: 0 5px;
          animation: bounce 1.2s infinite ease-in-out both;
        }

        .ball.one { animation-delay: -0.32s; }
        .ball.two { animation-delay: -0.16s; }
        .ball.three { animation-delay: 0s; }

        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }

        .loading-text {
          margin-top: 1.5rem;
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
        
        .main-content {
          /* Düzeltme: Kenar boşlukları sıfırlanmış body'nin içini tamamen kaplamasını sağlıyoruz. */
          flex: 1;
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          background-color: var(--bg-color);
          color: var(--text-color);
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
          flex: 1;
        }
        
        .header-title {
          font-size: 1.5rem;
          font-weight: 700;
          margin-right: 1.5rem;
        }

        .search-container {
          position: relative;
          flex: 1;
          max-width: 32rem;
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
          box-shadow: 0 0 0 2px #22c55e, 0 0 0 4px rgba(34, 197, 94, 0.25);
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
          overflow-y: auto;
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
          width: 100%;
          border-collapse: collapse;
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
          color: var(--success-color);
        }
        .result-loss {
          color: var(--error-color);
        }
        .result-draw {
          color: var(--warning-color);
        }
      `}</style>
      <div className={`app-container ${isDarkMode ? 'dark' : ''}`}>
        {/* Ana İçerik */}
        <main className="main-content">
          <header className="app-header">
            <div className="header-content">
              <h1 className="header-title">Futbol Dashboard</h1>
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
            </div>
            <button onClick={toggleTheme} className="theme-toggle-button">
              {isDarkMode ? <span role="img" aria-label="sun" className="text-2xl">🌞</span> : <span role="img" aria-label="moon" className="text-2xl">🌙</span>}
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
                    <Bar data={teamPerformanceData} />
                  </ChartCard>
                  <ChartCard title={`${selectedTeam.name} İlk Yarı ve İkinci Yarı Golleri`}>
                    <Pie data={teamChart4Data} />
                  </ChartCard>
                </div>

                {/* Tarih Filtresi Bölümü - Estetik & Modern */}
<div className="flex flex-wrap items-center justify-center gap-6 mb-8 p-6 
                rounded-2xl shadow-lg border border-gray-300/40 dark:border-gray-700/50 
                backdrop-blur-md bg-gradient-to-r from-white/80 to-gray-100/50 
                dark:from-gray-800/70 dark:to-gray-900/50 transition-all duration-300">
  
  {/* Başlangıç Tarihi */}
  <div className="flex flex-col w-40">
    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Başlangıç Tarihi</label>
    <div className="relative">
      <input
        type="date"
        value={startDate}
        onChange={(e) => setStartDate(e.target.value)}
        className="w-full px-4 py-2 pl-10 rounded-lg border border-gray-300 dark:border-gray-600 
                   bg-white/70 dark:bg-gray-800/70 text-gray-900 dark:text-white shadow-sm 
                   focus:ring-2 focus:ring-green-400 focus:border-green-500 outline-none 
                   transition-all duration-300 hover:shadow-md"
      />
      {/* Tarih ikonu */}
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 absolute left-3 top-2.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    </div>
  </div>

  {/* Bitiş Tarihi */}
  <div className="flex flex-col w-40">
    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Bitiş Tarihi</label>
    <div className="relative">
      <input
        type="date"
        value={endDate}
        onChange={(e) => setEndDate(e.target.value)}
        className="w-full px-4 py-2 pl-10 rounded-lg border border-gray-300 dark:border-gray-600 
                   bg-white/70 dark:bg-gray-800/70 text-gray-900 dark:text-white shadow-sm 
                   focus:ring-2 focus:ring-green-400 focus:border-green-500 outline-none 
                   transition-all duration-300 hover:shadow-md"
      />
      {/* Tarih ikonu */}
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 absolute left-3 top-2.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    </div>
  </div>

</div>


                {/* Takıma özel maç listesi */}
<div className="match-list-container bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
  <h2 className="match-list-title text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">Oynanan Maçlar</h2>
  
  {/* Tabloyu saran scroll alanı */}
  <div className="overflow-x-auto">
    <div className="max-h-96 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
      
      <table className="min-w-full table-auto text-left">
        <thead className="sticky top-0 bg-gray-100 dark:bg-gray-700 z-10">
          <tr className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            <th className="px-4 py-3">Tarih</th>
            <th className="px-4 py-3">Rakip</th>
            <th className="px-4 py-3">Skor</th>
            <th className="px-4 py-3">Sonuç</th>
          </tr>
        </thead>
        <tbody>
          {teamMatches.length > 0 ? (
            teamMatches.map((m) => {
              const opponent = teams.find(t => 
                (m.home_team_id === selectedTeam.id ? t.id === m.away_team_id : t.id === m.home_team_id)
              );
              const score = m.final_score || '0-0';
              const [h, a] = score.split('-').map(Number);
              let result = h === a ? 'Beraberlik' 
                          : ((m.home_team_id === selectedTeam.id && h > a) || 
                             (m.away_team_id === selectedTeam.id && a > h)) 
                          ? 'Galibiyet' : 'Mağlubiyet';
              
              return (
                <tr key={m.id} className="border-b border-gray-200 dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200">
                  <td className="px-4 py-3 text-sm">{m.date}</td>
                  <td className="px-4 py-3 text-sm">{opponent?.name || 'Bilinmiyor'}</td>
                  <td className="px-4 py-3 text-sm">{score}</td>
                  <td className={`px-4 py-3 text-sm font-semibold ${
                    result === 'Galibiyet' ? 'text-green-500' :
                    result === 'Mağlubiyet' ? 'text-red-500' : 'text-yellow-500'
                  }`}>
                    {result}
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan="4" className="px-4 py-3 text-center italic text-gray-500">
                Seçilen tarih aralığında maç bulunamadı.
              </td>
            </tr>
          )}
        </tbody>
      </table>

    </div>
  </div>
</div>

            ) : (
              // Genel ligler görünümü
              <div className="stats-grid">
                <ChartCard title="Liglere Göre Toplam Maç Sayısı">
                  <Bar data={generalChart1Data} />
                </ChartCard>
                <ChartCard title="Liglerin Galibiyet/Beraberlik/Mağlubiyet Oranları">
                  <Bar data={generalChart2Data} />
                </ChartCard>
                <ChartCard title="İlk Yarı ve İkinci Yarı Gol Oranları">
                  <Pie data={generalChart3Data} />
                </ChartCard>
                <ChartCard title="Ülkelere Göre Maç Dağılımı">
                  <Bar data={generalChart4Data} />
                </ChartCard>
              </div>
            )
              }
          </div>
        </main>
      </div>
  );
}

export default App;
