import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MatchHeader } from '../components/MatchHeader';
import { MatchTimeline } from '../components/MatchTimeline';
import { MatchStats } from '../components/MatchStats';
import { ChevronLeft, Share } from 'lucide-react';
import { Match, MatchEvent, Player } from '../types';
import { doc, collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import Confetti from 'react-confetti';
import { useWindowSize } from 'react-use';

export function SpectatorMatch() {
  const { id } = useParams<{ id: string }>();
  const { width, height } = useWindowSize();
  
  const [match, setMatch] = useState<Match | null>(null);
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    
    const unsubMatch = onSnapshot(doc(db, 'matches', id), doc => {
      if (doc.exists()) {
        const m = { id: doc.id, ...doc.data() } as Match;
        setMatch(m);
      }
      setLoading(false);
    }, err => handleFirestoreError(err, OperationType.GET, `matches/${id}`));

    const eventsRef = collection(db, 'matches', id, 'events');
    const q = query(eventsRef, orderBy('timestamp', 'desc'));
    const unsubEvents = onSnapshot(q, snapshot => {
      setEvents(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as MatchEvent)));
    }, err => handleFirestoreError(err, OperationType.LIST, `matches/${id}/events`));

    // Also fetch players for names
    const unsubPlayers = onSnapshot(collection(db, 'players'), snapshot => {
      setPlayers(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Player)));
    }, err => handleFirestoreError(err, OperationType.LIST, 'players'));

    return () => {
      unsubMatch();
      unsubEvents();
      unsubPlayers();
    };
  }, [id]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (match) {
      if (match.status === 'first_half' || match.status === 'second_half') {
        const statusTime = match.statusUpdatedAt || Date.now();
        const baseSeconds = match.elapsedSeconds || 0;
        
        interval = setInterval(() => {
          const currentRealSeconds = Math.floor((Date.now() - statusTime) / 1000);
          setElapsedSeconds(baseSeconds + currentRealSeconds);
        }, 1000);
      } else {
        setElapsedSeconds(match.elapsedSeconds || 0);
      }
    }
    return () => clearInterval(interval);
  }, [match?.status, match?.statusUpdatedAt, match?.elapsedSeconds]);

  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: match ? `Livescore: ${match.homeTeam.name} vs ${match.awayTeam.name}` : 'Livescore',
          url: window.location.href
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        await navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Henter kamp...</div>;
  }

  if (!match) {
    return <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white gap-4">Kamp ikke fundet <Link to="/" className="text-emerald-500 font-bold decoration-2 underline">Gå tilbage</Link></div>;
  }

  const isU14OrU15Winner = () => {
    if (!match || match.status !== 'finished') return false;
    const homeName = match.homeTeam.name.toLowerCase();
    const awayName = match.awayTeam.name.toLowerCase();
    const isOurTeam = (name: string) => name.includes('u14 pige') || name.includes('u15 pige') || name.includes('u14') || name.includes('u15');
    
    if (match.homeScore > match.awayScore && isOurTeam(homeName)) return true;
    if (match.awayScore > match.homeScore && isOurTeam(awayName)) return true;
    return false;
  };

  const showConfetti = isU14OrU15Winner();

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col font-sans pb-safe">
      {showConfetti && <Confetti width={width} height={height} recycle={false} numberOfPieces={500} />}
      {/* Top Navigation */}
      <div className="bg-slate-800 border-b-2 border-slate-900 px-4 py-3 flex justify-between items-center">
        <Link 
          to="/"
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-[10px] uppercase tracking-widest font-bold">Oversigt</span>
        </Link>
        
        <button 
          onClick={handleShare}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-700 text-white text-[10px] uppercase tracking-widest font-bold hover:bg-slate-600 transition-colors"
        >
          {copied ? 'Kopieret' : <><Share className="w-3.5 h-3.5" /> Del</>}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto w-full max-w-sm mx-auto bg-slate-50 md:shadow-2xl md:my-4 md:rounded-[40px] md:border-[12px] md:border-slate-800 flex flex-col relative overflow-hidden">
        <MatchHeader match={match} />
        
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <MatchStats match={match} events={events} />
          <h3 className="text-sm font-black uppercase text-slate-400 tracking-widest mt-8 mb-4 text-center">Hændelser</h3>
          <MatchTimeline match={match} events={events} players={players} />
        </div>
        
        <div className="p-4 border-t border-slate-200 bg-white text-center flex-shrink-0">
           <button className="text-emerald-600 text-sm font-bold uppercase tracking-tight">Vis fuld kamprapport</button>
        </div>
      </div>
    </div>
  );
}
