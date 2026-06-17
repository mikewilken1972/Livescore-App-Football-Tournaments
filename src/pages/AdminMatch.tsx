import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { doc, collection, onSnapshot, updateDoc, addDoc, query, orderBy, getDocs, deleteDoc } from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { ChevronLeft, Shield } from 'lucide-react';
import { db, auth, handleFirestoreError, OperationType, logOut, useAdminAccess } from '../firebase';
import { Match, MatchEvent, Player, EventType } from '../types';
import { EventMenu } from '../components/EventMenu';
import { MatchTimeline } from '../components/MatchTimeline';

export function AdminMatch() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { allowedEmails, loadingAdmins } = useAdminAccess();
  
  const [user, setUser] = useState<User | null>(null);
  const [match, setMatch] = useState<Match | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (loadingAdmins) return;
    const unsubAuth = onAuthStateChanged(auth, u => {
      setUser(u);
      if (!u || (u.email && !allowedEmails.includes(u.email))) {
        navigate('/admin'); // Redirect back to dashboard to handle login/forbidden state
      }
    });
    return unsubAuth;
  }, [navigate, loadingAdmins, allowedEmails]);

  // Time simulation
  // ... rest of the component state effects unchanged ...
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

  useEffect(() => {
    if (!id || !auth.currentUser) return;
    
    // Check if the user is signed in... if not redirect... handled by app ideally, but here we can just wait for context or let it fail
    
    const unsubMatch = onSnapshot(doc(db, 'matches', id), doc => {
      if (doc.exists()) {
        const m = { id: doc.id, ...doc.data() } as Match;
        setMatch(m);
      }
      setLoading(false);
    }, err => handleFirestoreError(err, OperationType.GET, `matches/${id}`));

    const unsubPlayers = onSnapshot(collection(db, 'players'), snapshot => {
      setPlayers(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Player)));
    }, err => handleFirestoreError(err, OperationType.LIST, `players`));

    const eventsRef = collection(db, 'matches', id, 'events');
    const q = query(eventsRef, orderBy('timestamp', 'desc'));
    const unsubEvents = onSnapshot(q, snapshot => {
      setEvents(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as MatchEvent)));
    }, err => handleFirestoreError(err, OperationType.LIST, `matches/${id}/events`));

    return () => {
      unsubMatch();
      unsubPlayers();
      unsubEvents();
    };
  }, [id]);

  const handleUpdateStatus = async (status: Match['status']) => {
    if (!id || !match) return;
    let nextSeconds = elapsedSeconds;
    if (status === 'first_half') nextSeconds = 0;
    if (status === 'second_half') nextSeconds = match.halfDuration * 60;
    
    try {
      await updateDoc(doc(db, 'matches', id), { 
        status, 
        elapsedSeconds: nextSeconds,
        statusUpdatedAt: Date.now()
      });
      setElapsedSeconds(nextSeconds);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `matches/${id}`);
    }
  };

  const handleAddEvent = async (type: EventType, teamId?: string, playerId?: string, assistId?: string) => {
    if (!id || !match) return;
    
    try {
      const dbEvent = {
        matchId: id,
        type,
        minute: Math.floor(elapsedSeconds / 60) + 1,
        timestamp: Date.now(),
        ...(teamId && { teamId }),
        ...(playerId && { playerId }),
        ...(assistId && { assistPlayerId: assistId })
      };
      
      await addDoc(collection(db, 'matches', id, 'events'), dbEvent);
      
      // Update match score if goal
      if (type.includes('goal') && teamId) {
        const isHome = teamId === match.homeTeam.id;
        await updateDoc(doc(db, 'matches', id), {
          homeScore: isHome ? match.homeScore + 1 : match.homeScore,
          awayScore: !isHome ? match.awayScore + 1 : match.awayScore,
        });
      }
    } catch(err) {
      handleFirestoreError(err, OperationType.CREATE, `matches/${id}/events`);
    }
  };

  const handleReset = async () => {
    if (!id || !match) return;
    try {
      if (!window.confirm("Er du sikker på at du vil nulstille kampen? Alle hændelser slettes.")) return;
      
      const eventsRef = collection(db, 'matches', id, 'events');
      const eventsSnapshot = await getDocs(eventsRef);
      const deletePromises = eventsSnapshot.docs.map(evtDoc => deleteDoc(doc(db, 'matches', id, 'events', evtDoc.id)));
      await Promise.all(deletePromises);

      await updateDoc(doc(db, 'matches', id), {
        homeScore: 0,
        awayScore: 0,
        status: 'scheduled',
        elapsedSeconds: 0,
        statusUpdatedAt: Date.now()
      });
      setElapsedSeconds(0);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `matches/${id}`);
    }
  };

  if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Henter kamp...</div>;
  if (!match) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Kamp ikke fundet.</div>;

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col font-sans pb-safe">
      <div className="bg-slate-800 border-b-2 border-slate-900 px-4 py-3 flex justify-between items-center z-10 relative">
        <Link 
          to="/admin"
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-[10px] uppercase tracking-widest font-bold">Tilbage</span>
        </Link>
        <div className="flex flex-col items-end">
          <div className="flex items-center gap-2 text-white bg-red-500/20 px-3 py-1.5 rounded-full">
              <Shield className="w-3.5 h-3.5 text-red-500" />
              <span className="text-[10px] uppercase tracking-widest font-bold text-red-500">Live Admin</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto w-full max-w-sm mx-auto bg-slate-50 md:shadow-2xl md:my-4 md:rounded-[40px] md:border-[12px] md:border-slate-800 flex flex-col relative overflow-hidden">
        <div className="bg-slate-800 p-6 pt-10 text-white flex-shrink-0 relative">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {match.status === 'finished' ? (
                 <>
                   <div className="w-2 h-2 rounded-full bg-slate-400"></div>
                   <span className="text-[10px] font-bold uppercase tracking-widest text-slate-300">Afsluttet</span>
                 </>
              ) : (
                 <>
                   <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                   <span className="text-[10px] font-bold uppercase opacity-70 tracking-widest">Reporter Mode</span>
                 </>
              )}
            </div>
            <div className="text-xl font-black bg-slate-700/50 px-3 py-1.5 rounded-lg border border-slate-600/50">
              {match.homeScore} - {match.awayScore}
            </div>
          </div>
          <div className="text-2xl font-bold italic tracking-tighter uppercase">Kampstyring</div>
          <div className="text-xs text-emerald-400 mt-1 font-bold pr-4 truncate">{match.homeTeam.name} vs {match.awayTeam.name}</div>
        </div>
        
        {match.status === 'finished' && (
          <div className="bg-emerald-500 text-white p-4 text-center shadow-inner relative z-10">
             <div className="text-base font-black uppercase tracking-widest">
                Kampen er afsluttet
             </div>
             <div className="text-[10px] uppercase font-bold opacity-80 mt-1">Officielt resultat registreret</div>
          </div>
        )}
        
        <div className="flex-1 overflow-y-auto w-full flex flex-col">
          <EventMenu 
            match={match} 
            players={players} 
            onAddEvent={handleAddEvent} 
            onUpdateStatus={handleUpdateStatus} 
            onReset={handleReset} 
            currentMinute={elapsedSeconds}
          />
          <div className="border-t-4 border-slate-200 bg-white">
            <MatchTimeline match={match} events={events} players={players} />
          </div>
        </div>
      </div>
    </div>
  );
}
