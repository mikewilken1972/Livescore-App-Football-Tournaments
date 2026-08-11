import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { doc, collection, onSnapshot, updateDoc, addDoc, query, orderBy, getDocs, deleteDoc } from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { ChevronLeft, Shield, BookOpen, MessageSquare, Trash2, Pencil, Check, X } from 'lucide-react';
import { db, auth, handleFirestoreError, OperationType, logOut, useAdminAccess } from '../firebase';
import { Match, MatchEvent, Player, EventType, AdminComment } from '../types';
import { EventMenu } from '../components/EventMenu';
import { MatchTimeline } from '../components/MatchTimeline';
import { MatchStats } from '../components/MatchStats';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EditEventDialog } from '../components/EditEventDialog';

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
  const [activeTab, setActiveTab] = useState<'events' | 'squad' | 'notes'>('events');
  const [squadTeamTab, setSquadTeamTab] = useState<'home' | 'away'>('home');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<MatchEvent | null>(null);
  const [eventToDeleteId, setEventToDeleteId] = useState<string | null>(null);

  // Admin comments states
  const [newCommentText, setNewCommentText] = useState('');
  const [newCommentPhase, setNewCommentPhase] = useState<'before' | 'during' | 'after'>('before');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [editingCommentPhase, setEditingCommentPhase] = useState<'before' | 'during' | 'after'>('before');

  const handleSquadToggle = async (playerId: string, teamType: 'home' | 'away') => {
    if (!match || !id) return;
    const squadKey = teamType === 'home' ? 'homeSquad' : 'awaySquad';
    const currentSquad = match[squadKey] || [];
    
    let newSquad;
    if (currentSquad.includes(playerId)) {
      newSquad = currentSquad.filter(id => id !== playerId);
    } else {
      const maxSquadSize = match.maxSquadSize || 17;
      if (currentSquad.length >= maxSquadSize) {
        alert(`Du kan maksimalt vælge ${maxSquadSize} spillere til holdopstillingen.`);
        return;
      }
      newSquad = [...currentSquad, playerId];
    }

    try {
      await updateDoc(doc(db, 'matches', id), {
        [squadKey]: newSquad
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `matches/${id}`);
    }
  };

  const handleMaxSquadSizeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!match || !id) return;
    const val = parseInt(e.target.value);
    if (!isNaN(val) && val > 0) {
      try {
        await updateDoc(doc(db, 'matches', id), {
          maxSquadSize: val
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `matches/${id}`);
      }
    }
  };

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
      if ((match.status === 'first_half' || match.status === 'second_half') && !match.isPaused) {
        const statusTime = match.statusUpdatedAt || Date.now();
        const baseSeconds = match.elapsedSeconds || 0;
        
        interval = setInterval(() => {
          const currentRealSeconds = Math.floor((Date.now() - statusTime) / 1000);
          const newElapsed = baseSeconds + currentRealSeconds;
          setElapsedSeconds(newElapsed);
          
          const halfStart = match.status === 'first_half' ? 0 : match.halfDuration * 60;
          if (newElapsed - halfStart >= 3600) {
            updateDoc(doc(db, 'matches', match.id), {
              isPaused: true,
              elapsedSeconds: newElapsed,
              statusUpdatedAt: Date.now()
            });
            clearInterval(interval);
          }
        }, 1000);
      } else {
        setElapsedSeconds(match.elapsedSeconds || 0);
      }
    }
    return () => clearInterval(interval);
  }, [match?.status, match?.statusUpdatedAt, match?.elapsedSeconds, match?.isPaused]);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setMatch(null);
        setPlayers([]);
        setEvents([]);
        return;
      }
      
      if (id) {
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
      }
    });

    return unsubAuth;
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
        statusUpdatedAt: Date.now(),
        isPaused: false
      });
      setElapsedSeconds(nextSeconds);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `matches/${id}`);
    }
  };

  const handleTogglePause = async () => {
    if (!id || !match) return;
    try {
      if (match.isPaused) {
        await updateDoc(doc(db, 'matches', id), {
          isPaused: false,
          statusUpdatedAt: Date.now()
        });
      } else {
        await updateDoc(doc(db, 'matches', id), {
          isPaused: true,
          elapsedSeconds: elapsedSeconds,
          statusUpdatedAt: Date.now()
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `matches/${id}`);
    }
  };

  const handleAddEvent = async (type: EventType, teamId?: string, playerId?: string, assistId?: string, description?: string, imageUrl?: string) => {
    if (!id || !match) return;
    
    try {
      const dbEvent = {
        matchId: id,
        type,
        minute: Math.floor(elapsedSeconds / 60) + 1,
        timestamp: Date.now(),
        ...(teamId && { teamId }),
        ...(playerId && { playerId }),
        ...(assistId && { assistPlayerId: assistId }),
        ...(description && { description }),
        ...(imageUrl && { imageUrl })
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

  const handleReset = () => {
    if (!id || !match) return;
    setShowResetConfirm(true);
  };

  const confirmReset = async () => {
    if (!id || !match) return;
    setShowResetConfirm(false);
    try {
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

  const recalculateMatchScore = async (matchId: string, homeTeamId: string, awayTeamId: string) => {
    try {
      const eventsRef = collection(db, 'matches', matchId, 'events');
      const snapshot = await getDocs(eventsRef);
      let homeScore = 0;
      let awayScore = 0;
      
      snapshot.docs.forEach(evtDoc => {
        const data = evtDoc.data();
        const type = data.type as EventType;
        const teamId = data.teamId;
        if (type === 'goal' || type === 'penalty_goal') {
          if (teamId === homeTeamId) homeScore++;
          if (teamId === awayTeamId) awayScore++;
        } else if (type === 'own_goal') {
          if (teamId === homeTeamId) awayScore++;
          if (teamId === awayTeamId) homeScore++;
        }
      });
      
      await updateDoc(doc(db, 'matches', matchId), {
        homeScore,
        awayScore
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `matches/${matchId}`);
    }
  };

  const handleDeleteEvent = async () => {
    if (!id || !match || !eventToDeleteId) return;
    try {
      await deleteDoc(doc(db, 'matches', id, 'events', eventToDeleteId));
      await recalculateMatchScore(id, match.homeTeam.id, match.awayTeam.id);
      setEventToDeleteId(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `matches/${id}/events/${eventToDeleteId}`);
    }
  };

  const handleSaveEditEvent = async (updatedFields: Partial<MatchEvent>) => {
    if (!id || !match || !editingEvent) return;
    try {
      await updateDoc(doc(db, 'matches', id, 'events', editingEvent.id), updatedFields);
      await recalculateMatchScore(id, match.homeTeam.id, match.awayTeam.id);
      setEditingEvent(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `matches/${id}/events/${editingEvent.id}`);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !match || !newCommentText.trim()) return;

    const newComment: AdminComment = {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9),
      text: newCommentText.trim(),
      createdAt: Date.now(),
      phase: newCommentPhase
    };

    const currentComments = match.adminComments || [];
    try {
      await updateDoc(doc(db, 'matches', id), {
        adminComments: [...currentComments, newComment]
      });
      setNewCommentText('');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `matches/${id}`);
    }
  };

  const handleStartEditComment = (comment: AdminComment) => {
    setEditingCommentId(comment.id);
    setEditingCommentText(comment.text);
    setEditingCommentPhase(comment.phase);
  };

  const handleSaveComment = async (commentId: string) => {
    if (!id || !match || !editingCommentText.trim()) return;

    const currentComments = match.adminComments || [];
    const updatedComments = currentComments.map(c => {
      if (c.id === commentId) {
        return {
          ...c,
          text: editingCommentText.trim(),
          phase: editingCommentPhase
        };
      }
      return c;
    });

    try {
      await updateDoc(doc(db, 'matches', id), {
        adminComments: updatedComments
      });
      setEditingCommentId(null);
      setEditingCommentText('');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `matches/${id}`);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!id || !match) return;
    const currentComments = match.adminComments || [];
    const updatedComments = currentComments.filter(c => c.id !== commentId);

    try {
      await updateDoc(doc(db, 'matches', id), {
        adminComments: updatedComments
      });
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

      <div className="flex-1 overflow-y-auto w-full bg-slate-50 flex flex-col relative">
        <div className="bg-slate-800 p-6 pt-10 text-white flex-shrink-0 relative">
          <div className="max-w-7xl mx-auto w-full">
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
            
            <div className="flex gap-1.5 mt-4 lg:hidden">
               <button onClick={() => setActiveTab('events')} className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg border border-slate-600 transition-colors whitespace-nowrap ${activeTab === 'events' ? 'bg-white text-slate-800' : 'bg-slate-700/50 text-slate-300'}`}>Hændelser</button>
               <button onClick={() => setActiveTab('squad')} className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg border border-slate-600 transition-colors whitespace-nowrap ${activeTab === 'squad' ? 'bg-white text-slate-800' : 'bg-slate-700/50 text-slate-300'}`}>Opstilling</button>
               <button onClick={() => setActiveTab('notes')} className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg border border-slate-600 transition-colors whitespace-nowrap ${activeTab === 'notes' ? 'bg-white text-slate-800' : 'bg-slate-700/50 text-slate-300'}`}>Noter</button>
            </div>
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto w-full p-4 lg:p-6">
          {/* Desktop Layout */}
          <div className="hidden lg:grid lg:grid-cols-12 lg:gap-6 items-start">
            {/* Left: Controls & Stats */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-slate-800 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Match Kontrol</div>
                <EventMenu 
                  match={match} 
                  players={players} 
                  onAddEvent={handleAddEvent} 
                  onUpdateStatus={handleUpdateStatus} 
                  onTogglePause={handleTogglePause}
                  onReset={handleReset} 
                  currentMinute={elapsedSeconds}
                />
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <MatchStats match={match} events={events} />
              </div>
            </div>

            {/* Middle: Timeline */}
            <div className="lg:col-span-5 space-y-4">
              {match.status === 'finished' && (
                <div className="bg-emerald-500 text-white p-4 rounded-2xl text-center shadow-lg relative z-10 mb-6">
                   <div className="text-lg font-black uppercase tracking-widest">Kampen er afsluttet</div>
                   <div className="text-[10px] uppercase font-bold opacity-80 mt-1">Officielt resultat registreret</div>
                </div>
              )}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="text-sm font-black uppercase text-slate-400 tracking-widest mb-6 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Hændelsesforløb
                </h3>
                <MatchTimeline 
                  match={match} 
                  events={events} 
                  players={players} 
                  isAdmin={true}
                  onEditEvent={setEditingEvent}
                  onDeleteEvent={setEventToDeleteId}
                />
              </div>
            </div>

            {/* Right: Squad & Notes */}
            <div className="lg:col-span-3 space-y-6">
              {/* Squad Management */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-slate-800 px-4 py-2 flex justify-between items-center">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Holdopstilling</div>
                  <div className="flex gap-1">
                    <button onClick={() => setSquadTeamTab('home')} className={`px-2 py-1 text-[9px] font-bold rounded ${squadTeamTab === 'home' ? 'bg-white text-slate-800' : 'text-slate-400 hover:text-white'}`}>{match.homeTeam.shortName}</button>
                    <button onClick={() => setSquadTeamTab('away')} className={`px-2 py-1 text-[9px] font-bold rounded ${squadTeamTab === 'away' ? 'bg-white text-slate-800' : 'text-slate-400 hover:text-white'}`}>{match.awayTeam.shortName}</button>
                  </div>
                </div>
                <div className="p-4 max-h-[400px] overflow-y-auto">
                  <div className="flex justify-between items-center mb-4 text-[10px] font-bold text-slate-400 uppercase">
                    <span>Maks: {match.maxSquadSize || 17}</span>
                    <span className="text-emerald-600">Valgt: {match[squadTeamTab === 'home' ? 'homeSquad' : 'awaySquad']?.length || 0}</span>
                  </div>
                  <div className="space-y-1">
                    {players.filter(p => p.teamIds?.includes(squadTeamTab === 'home' ? match.homeTeam.id : match.awayTeam.id)).map(p => {
                      const isSelected = (match[squadTeamTab === 'home' ? 'homeSquad' : 'awaySquad'] || []).includes(p.id);
                      return (
                        <div 
                          key={p.id} 
                          onClick={() => handleSquadToggle(p.id, squadTeamTab)}
                          className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors text-xs font-bold ${isSelected ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50'}`}
                        >
                          <div className={`w-4 h-4 flex-shrink-0 flex items-center justify-center rounded border ${isSelected ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'}`}>
                            {isSelected && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <span className="truncate">#{p.number} {p.name}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-slate-800 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Kampnoter</div>
                <div className="p-4 space-y-4">
                  <form onSubmit={handleAddComment} className="space-y-2">
                    <textarea 
                      value={newCommentText}
                      onChange={e => setNewCommentText(e.target.value)}
                      placeholder="Tilføj hurtig note..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold outline-none focus:border-emerald-500 resize-none"
                      rows={2}
                    />
                    <button type="submit" className="w-full py-2 bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-widest rounded-lg">Gem Note</button>
                  </form>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {(match.adminComments || []).map(comment => (
                      <div key={comment.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 relative group">
                        <p className="text-[11px] font-semibold text-slate-700 leading-relaxed">{comment.text}</p>
                        <button onClick={() => handleDeleteComment(comment.id)} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Layout (Tabs) */}
          <div className="lg:hidden">
            {activeTab === 'events' && (
              <>
                {match.status === 'finished' && (
                  <div className="bg-emerald-500 text-white p-4 text-center shadow-inner relative z-10">
                     <div className="text-base font-black uppercase tracking-widest">Kampen er afsluttet</div>
                     <div className="text-[10px] uppercase font-bold opacity-80 mt-1">Officielt resultat registreret</div>
                  </div>
                )}
                
                <div className="flex-1 overflow-y-auto w-full flex flex-col">
                  <EventMenu 
                    match={match} 
                    players={players} 
                    onAddEvent={handleAddEvent} 
                    onUpdateStatus={handleUpdateStatus} 
                    onTogglePause={handleTogglePause}
                    onReset={handleReset} 
                    currentMinute={elapsedSeconds}
                  />
                  <div className="border-t-4 border-slate-200 bg-slate-50 px-4 pb-4 overflow-y-auto max-h-[500px]">
                    <MatchStats match={match} events={events} />
                    <h3 className="text-sm font-black uppercase text-slate-400 tracking-widest mt-8 mb-4 text-center">Hændelser</h3>
                    <MatchTimeline 
                      match={match} 
                      events={events} 
                      players={players} 
                      isAdmin={true}
                      onEditEvent={setEditingEvent}
                      onDeleteEvent={setEventToDeleteId}
                    />
                  </div>
                </div>
              </>
            )}

            {activeTab === 'squad' && (
              <div className="flex-1 overflow-y-auto w-full bg-slate-50 p-4">
                <div className="flex gap-2 mb-4 bg-slate-200 p-1 rounded-xl">
                  <button 
                    onClick={() => setSquadTeamTab('home')}
                    className={`flex-1 py-2 rounded-lg font-bold text-sm ${squadTeamTab === 'home' ? 'bg-white shadow' : 'text-slate-500'}`}
                  >
                    {match.homeTeam.shortName || 'Hjemme'}
                  </button>
                  <button 
                    onClick={() => setSquadTeamTab('away')}
                    className={`flex-1 py-2 rounded-lg font-bold text-sm ${squadTeamTab === 'away' ? 'bg-white shadow' : 'text-slate-500'}`}
                  >
                    {match.awayTeam.shortName || 'Ude'}
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Maks spillere:</span>
                      <input 
                        type="number" 
                        min="1"
                        max="99"
                        value={match.maxSquadSize || 17}
                        onChange={handleMaxSquadSizeChange}
                        className="w-16 px-2 py-1 bg-slate-100 border border-slate-300 rounded font-bold text-center text-sm"
                      />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-widest text-emerald-600 bg-emerald-100 px-2 py-1 rounded">
                      Valgt: {match[squadTeamTab === 'home' ? 'homeSquad' : 'awaySquad']?.length || 0} / {match.maxSquadSize || 17}
                    </span>
                  </div>
                  <div className="space-y-2">
                  {players.filter(p => p.teamIds?.includes(squadTeamTab === 'home' ? match.homeTeam.id : match.awayTeam.id)).map(p => {
                    const isSelected = (match[squadTeamTab === 'home' ? 'homeSquad' : 'awaySquad'] || []).includes(p.id);
                    return (
                      <div 
                        key={p.id} 
                        onClick={() => handleSquadToggle(p.id, squadTeamTab)}
                        className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${isSelected ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                      >
                        <div className={`w-6 h-6 flex items-center justify-center rounded-md border-2 ${isSelected ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'}`}>
                          {isSelected && <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                        </div>
                        <div className="font-bold text-slate-800 flex-1 text-sm">
                           #{p.number} {p.name}
                        </div>
                      </div>
                    );
                  })}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'notes' && (
              <div className="flex-1 overflow-y-auto w-full bg-slate-50 p-4 flex flex-col gap-4">
                <form onSubmit={handleAddComment} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Tilføj kampnote</h3>
                  <textarea
                    required
                    value={newCommentText}
                    onChange={e => setNewCommentText(e.target.value)}
                    placeholder="Skriv kommentar..."
                    rows={3}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-semibold text-slate-800 outline-none"
                  />
                  <button type="submit" className="w-full py-2.5 bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-colors">Gem Note</button>
                </form>
                <div className="space-y-2">
                  {(match.adminComments || []).map(comment => (
                    <div key={comment.id} className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-2 relative">
                      <div className="flex justify-end">
                        <button onClick={() => handleDeleteComment(comment.id)} className="p-1 text-slate-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                      <p className="text-xs font-semibold text-slate-700 whitespace-pre-line leading-relaxed">{comment.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <ConfirmDialog
        isOpen={showResetConfirm}
        title="Nulstil Kamp"
        message="Er du sikker på at du vil nulstille kampen? Alle hændelser slettes og stillingen nulstilles. Handlingen kan ikke fortrydes."
        onConfirm={confirmReset}
        onCancel={() => setShowResetConfirm(false)}
      />
      <ConfirmDialog
        isOpen={eventToDeleteId !== null}
        title="Slet hændelse"
        message="Er du sikker på at du vil slet denne hændelse? Kampens stilling vil automatisk blive genberegnet."
        onConfirm={handleDeleteEvent}
        onCancel={() => setEventToDeleteId(null)}
      />
      <EditEventDialog
        isOpen={editingEvent !== null}
        event={editingEvent}
        match={match}
        players={players}
        onSave={handleSaveEditEvent}
        onClose={() => setEditingEvent(null)}
      />
    </div>
  );
}
