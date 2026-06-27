import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Calendar, Share2, Check, Clock, Archive, ChevronLeft } from 'lucide-react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Match } from '../types';

import { LiveMatchTimer } from '../components/LiveMatchTimer';

function MatchCard({ match, ...props }: { match: Match; key?: React.Key }) {
  return (
    <Link 
      to={`/match/${match.id}`}
      className="block bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
    >
      <div className="flex justify-between items-center text-[10px] uppercase tracking-widest opacity-60 mb-3 font-bold text-slate-500">
        <span>{match.tournamentName} {match.groupName ? `• ${match.groupName}` : ''}</span>
        {match.startTime ? <span>{new Date(match.startTime).toLocaleString('da-DK', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span> : null}
      </div>
      
      <div className="flex justify-between items-center mb-4">
        <div className="flex-1 font-bold text-slate-800 truncate pr-2">
          {match.homeTeam.name}
        </div>
        <div className="bg-slate-100 px-3 py-1.5 rounded-lg text-lg font-black tabular-nums tracking-tighter whitespace-nowrap">
          {match.homeScore} - {match.awayScore}
        </div>
        <div className="flex-1 font-bold text-slate-800 text-right truncate pl-2">
          {match.awayTeam.name}
        </div>
      </div>

      <div className="flex justify-between items-center mt-2 border-t border-slate-100 pt-3">
        <div className="text-xs font-bold text-emerald-600 flex items-center gap-2">
          {(match.status === 'first_half' || match.status === 'second_half') && (
             <span className="relative flex h-2 w-2">
               <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
               <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
             </span>
          )}
          <LiveMatchTimer match={match} />
        </div>
        <div className="text-xs font-bold text-slate-400 flex items-center gap-1 group-hover:text-emerald-500 transition-colors">
          Følg kampen →
        </div>
      </div>
    </Link>
  );
}

export function Home() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [tournamentsData, setTournamentsData] = useState<{name: string, isHidden: boolean}[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'matches'));
    const unsub = onSnapshot(q, snapshot => {
      let allMatches = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Match));
      allMatches.sort((a, b) => (a.startTime || Number.MAX_SAFE_INTEGER) - (b.startTime || Number.MAX_SAFE_INTEGER));
      setMatches(allMatches);
    }, err => handleFirestoreError(err, OperationType.LIST, 'matches'));
    return unsub;
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'tournaments'));
    const unsub = onSnapshot(q, snapshot => {
      setTournamentsData(snapshot.docs.map(d => ({ name: d.data().name, isHidden: d.data().isHidden || false })));
      setLoading(false);
    }, err => handleFirestoreError(err, OperationType.LIST, 'tournaments'));
    return unsub;
  }, []);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const now = new Date();
  const todayDate = now.getDate();
  const todayMonth = now.getMonth();
  const todayYear = now.getFullYear();

  const isToday = (timestamp: number) => {
    if (!timestamp) return false;
    const matchDate = new Date(timestamp);
    return matchDate.getDate() === todayDate &&
           matchDate.getMonth() === todayMonth &&
           matchDate.getFullYear() === todayYear;
  };

  // Extract unique tournament names, filtering out hidden ones
  const tournaments = useMemo(() => {
    const hiddenTournaments = new Set(tournamentsData.filter(t => t.isHidden).map(t => t.name));
    const names = new Set(matches.map(m => m.tournamentName));
    return Array.from(names)
      .filter(n => typeof n === 'string' && n.trim() !== '' && !hiddenTournaments.has(n))
      .sort();
  }, [matches, tournamentsData]);

  const filteredMatches = selectedTournament ? matches.filter(m => m.tournamentName === selectedTournament) : [];

  const finishedMatches = filteredMatches.filter(m => m.status === 'finished').sort((a, b) => (b.startTime || 0) - (a.startTime || 0));
  const activeMatches = filteredMatches.filter(m => m.status !== 'finished');
  
  const todayMatches = activeMatches.filter(m => isToday(m.startTime || 0));
  const upcomingMatches = activeMatches.filter(m => !isToday(m.startTime || 0));

  return (
    <div className="min-h-screen bg-slate-50 font-sans p-4 md:p-8">
      <div className="max-w-3xl mx-auto pb-16">
        <header className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
              <Trophy className="text-emerald-500 w-8 h-8" />
              Livescore Oversigt
            </h1>
            <p className="text-slate-500 mt-2 font-medium">Find og følg med i alle dagens kampe.</p>
          </div>
          <button 
            onClick={handleShare}
            className="bg-white border-2 border-slate-200 text-slate-600 hover:text-emerald-600 hover:border-emerald-300 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 active:scale-95"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4" />}
            <span className="hidden sm:inline">{copied ? 'Kopieret' : 'Del Site'}</span>
          </button>
        </header>

        <main className="space-y-12">
          
          {loading ? (
            <div className="text-center text-slate-400 p-8 font-bold">Henter kampe...</div>
          ) : !selectedTournament ? (
            <section className="space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2 mb-4">
                <Trophy className="w-4 h-4" /> Vælg Turnering
              </h2>
              {tournaments.length === 0 ? (
                <div className="text-center text-slate-400 p-8 font-bold bg-white rounded-2xl border-2 border-dashed border-slate-200">
                  Ingen turneringer oprettet endnu
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {tournaments.map(tournamentName => (
                    <button
                      key={tournamentName}
                      onClick={() => setSelectedTournament(tournamentName)}
                      className="text-left bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all active:scale-[0.98] group flex justify-between items-center"
                    >
                      <div>
                        <div className="text-xs uppercase tracking-widest text-emerald-600 font-bold mb-1">Turnering</div>
                        <div className="text-lg font-black text-slate-800">{tournamentName}</div>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-emerald-50 transition-colors">
                        <Trophy className="w-5 h-5 text-slate-400 group-hover:text-emerald-500" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </section>
          ) : (
            <>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setSelectedTournament(null)}
                  className="bg-white border-2 border-slate-200 text-slate-600 hover:text-slate-800 px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 active:scale-95"
                >
                  <ChevronLeft className="w-4 h-4" /> Tilbage til oversigt
                </button>
                <div className="text-lg font-black text-emerald-600 flex items-center gap-2">
                    <Trophy className="w-5 h-5" /> {selectedTournament}
                </div>
              </div>

              <section className="space-y-4">
                <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2 mb-4">
                  <Calendar className="w-4 h-4" /> Dagens Kampe
                </h2>
                
                {todayMatches.length === 0 ? (
                  <div className="text-center text-slate-400 p-8 font-bold bg-white rounded-2xl border-2 border-dashed border-slate-200">
                    Ingen kampe på programmet i dag
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {todayMatches.map(match => (
                      <MatchCard key={match.id} match={match} />
                    ))}
                  </div>
                )}
              </section>

              <section className="space-y-4">
                <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2 mb-4">
                  <Clock className="w-4 h-4" /> Kommende Kampe
                </h2>
                
                {upcomingMatches.length === 0 ? (
                  <div className="text-center text-slate-400 p-8 font-bold bg-white rounded-2xl border-2 border-dashed border-slate-200">
                    Ingen kommende kampe
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {upcomingMatches.map(match => (
                      <MatchCard key={match.id} match={match} />
                    ))}
                  </div>
                )}
              </section>

              <section className="space-y-4">
                <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2 mb-4">
                  <Archive className="w-4 h-4" /> Afsluttede Kampe
                </h2>
                
                {finishedMatches.length === 0 ? (
                  <div className="text-center text-slate-400 p-8 font-bold bg-white rounded-2xl border-2 border-dashed border-slate-200">
                    Ingen afsluttede kampe
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {finishedMatches.map(match => (
                      <MatchCard key={match.id} match={match} />
                    ))}
                  </div>
                )}
              </section>
            </>
          )}

        </main>
      </div>
      
      <div className="fixed bottom-4 right-4 z-50">
        <Link 
          to="/admin" 
          className="bg-slate-800 text-white px-4 py-2 rounded-full text-xs font-bold shadow-lg opacity-50 hover:opacity-100 transition-opacity"
        >
          Admin Login →
        </Link>
      </div>
    </div>
  );
}


