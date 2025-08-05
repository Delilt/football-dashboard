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
  Tailwind CSS ile modern ve duyarlı bir tasarım sağlanmıştır.
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
      <div className={`flex items-center justify-center min-h-screen ${isDarkMode ? 'bg-gray-900 text-gray-100' : 'bg-gray-100 text-gray-900'}`}>
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-green-500"></div>
          <p className="mt-4 text-xl font-semibold">Veriler Yükleniyor...</p>
        </div>
      </div>
    );
  }

  // Hata ekranı
  if (error) {
    return (
      <div className={`flex items-center justify-center min-h-screen ${isDarkMode ? 'bg-gray-900 text-gray-100' : 'bg-gray-100 text-gray-900'}`}>
        <div className="text-center p-8 bg-red-600 text-white rounded-lg shadow-xl">
          <p className="text-2xl font-bold">❌ Hata Oluştu</p>
          <p className="mt-2">Veriler yüklenirken bir sorunla karşılaşıldı: {error.message}</p>
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
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 flex flex-col justify-between">
      <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">{title}</h2>
      <div className="w-full h-80 flex items-center justify-center">
        {children}
      </div>
    </div>
  );

  return (
    <div className={`${isDarkMode ? 'dark' : ''} h-screen flex transition-colors duration-300 overflow-hidden`}>
      {/* Sidebar - Sadece takım arama modunda göster */}
      <aside className={`fixed z-20 h-full w-64 bg-gray-100 dark:bg-gray-900 p-6 transition-transform duration-300 ease-in-out lg:translate-x-0 ${showSidebar ? 'translate-x-0' : '-translate-x-full'}`}>
        <h2 className="text-3xl font-bold mb-6 text-gray-900 dark:text-gray-100">Ligler</h2>
        <nav>
          <ul>
            {leagues.map(l => (
              <li key={l} className="mb-2">
                <a onClick={handleReset} className="block p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200 cursor-pointer">
                  {l}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      {/* Ana İçerik */}
      <main className="flex-1 flex flex-col min-h-screen lg:ml-64 bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-300">
        <header className="sticky top-0 z-10 flex items-center justify-between p-4 bg-white dark:bg-gray-800 shadow-md">
          <div className="flex items-center">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="lg:hidden p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200 mr-4"
            >
              <span className="text-2xl">☰</span>
            </button>
            <h1 className="text-2xl font-bold hidden md:block">Futbol Dashboard</h1>
          </div>
          <div className="relative flex-1 max-w-lg mx-4" ref={searchInputRef}>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-search"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              </span>
              <input
                type="text"
                className="w-full py-2 pl-10 pr-4 bg-gray-100 dark:bg-gray-700 rounded-full focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Takım ara..."
                value={searchTeam}
                onChange={e => setSearchTeam(e.target.value)}
              />
            </div>
            {suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-30 mt-2 bg-white dark:bg-gray-700 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 max-h-60 overflow-y-auto">
                {suggestions.map((team) => (
                  <div
                    key={team.id}
                    onClick={() => handleSelectTeam(team)}
                    className="p-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center transition-colors duration-200"
                  >
                    <span className="text-gray-500 mr-3">⚽</span>
                    <span className="text-sm font-medium">{team.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200">
            {isDarkMode ? <span className="text-2xl">🌞</span> : <span className="text-2xl">🌙</span>}
          </button>
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-8">
          {selectedTeam ? (
            <div className="flex flex-col gap-8">
              {/* Takım adı başlığı ve geri dön butonu */}
              <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold">{selectedTeam.name} İstatistikleri</h2>
                <button onClick={handleReset} className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-full shadow-lg transition-transform duration-200 active:scale-95">
                  Geri Dön
                </button>
              </div>

              {/* Takıma özel grafikler */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
                <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">Oynanan Maçlar</h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full table-auto text-left">
                    <thead>
                      <tr className="bg-gray-100 dark:bg-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-300">
                        <th className="px-4 py-3 rounded-tl-xl">Tarih</th>
                        <th className="px-4 py-3">Rakip</th>
                        <th className="px-4 py-3">Skor</th>
                        <th className="px-4 py-3 rounded-tr-xl">Sonuç</th>
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
                          <tr key={m.id} className="border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                            <td className="px-4 py-3 text-sm">{m.match_date}</td>
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
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            // Genel ligler görünümü
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
  );
}

export default App;
