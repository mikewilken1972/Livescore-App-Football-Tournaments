import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, addDoc, onSnapshot, query, where, doc, deleteDoc, updateDoc, setDoc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType, useAdminAccess } from '../firebase';
import { Match, Player, Team } from '../types';
import { Pencil, Trash2, X, Check, Shield, EyeOff, Eye } from 'lucide-react';
import { LiveMatchTimer } from '../components/LiveMatchTimer';
import { ConfirmDialog } from '../components/ConfirmDialog';

export function AdminManagement() {
  const [activeTab, setActiveTab] = useState<'tournaments' | 'teams' | 'players' | 'matches' | 'settings'>('matches');
  const { allowedEmails } = useAdminAccess();
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [itemToDelete, setItemToDelete] = useState<{ collectionName: string; id: string; title: string; message: string } | null>(null);
  const [adminToRemove, setAdminToRemove] = useState<string | null>(null);
  
  // States for lists
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [tournaments, setTournaments] = useState<{id: string; name: string; isHidden?: boolean}[]>([]);

  // Form states
  const [newTournamentName, setNewTournamentName] = useState('');
  const [newTeamName, setNewTeamName] = useState('');
  
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerTeam, setNewPlayerTeam] = useState('');
  const [newPlayerNumber, setNewPlayerNumber] = useState('');

  const [newMatchTourName, setNewMatchTourName] = useState('');
  const [newMatchHome, setNewMatchHome] = useState('');
  const [newMatchAway, setNewMatchAway] = useState('');
  const [newMatchHalfDuration, setNewMatchHalfDuration] = useState('20');
  const [newMatchStartTime, setNewMatchStartTime] = useState('');

  // Edit states
  const [editingTournamentId, setEditingTournamentId] = useState<string | null>(null);
  const [editTournamentName, setEditTournamentName] = useState('');

  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [editTeamName, setEditTeamName] = useState('');

  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [editPlayerName, setEditPlayerName] = useState('');
  const [editPlayerNumber, setEditPlayerNumber] = useState('');
  const [editPlayerTeamId, setEditPlayerTeamId] = useState('');

  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);
  const [editMatchTourName, setEditMatchTourName] = useState('');
  const [editMatchHalfDuration, setEditMatchHalfDuration] = useState('');
  const [editMatchStartTime, setEditMatchStartTime] = useState('');

  useEffect(() => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    
    const unsubTeams = onSnapshot(query(collection(db, 'teams'), where('ownerId', '==', uid)), snapshot => {
      setTeams(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Team)));
    }, err => handleFirestoreError(err, OperationType.LIST, 'teams'));

    const unsubTourneys = onSnapshot(query(collection(db, 'tournaments'), where('ownerId', '==', uid)), snapshot => {
      setTournaments(snapshot.docs.map(d => ({ id: d.id, name: d.data().name, isHidden: d.data().isHidden || false })));
    }, err => handleFirestoreError(err, OperationType.LIST, 'tournaments'));

    const unsubPlayers = onSnapshot(query(collection(db, 'players'), where('ownerId', '==', uid)), snapshot => {
      setPlayers(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Player)));
    }, err => handleFirestoreError(err, OperationType.LIST, 'players'));

    const unsubMatches = onSnapshot(query(collection(db, 'matches'), where('ownerId', '==', uid)), snapshot => {
      const allMatches = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Match));
      allMatches.sort((a, b) => (b.startTime || 0) - (a.startTime || 0));
      setMatches(allMatches);
    }, err => handleFirestoreError(err, OperationType.LIST, 'matches'));

    return () => {
      unsubTeams();
      unsubTourneys();
      unsubPlayers();
      unsubMatches();
    };
  }, []);

  const handleDelete = (collectionName: string, id: string) => {
    setItemToDelete({
      collectionName,
      id,
      title: 'Slet Element',
      message: 'Er du sikker på at du vil slette dette element? Handlingen kan ikke fortrydes.'
    });
  };

  const confirmDeletion = async () => {
    if (!itemToDelete) return;
    try {
      await deleteDoc(doc(db, itemToDelete.collectionName, itemToDelete.id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, itemToDelete.collectionName);
    }
    setItemToDelete(null);
  };

  const toggleTournamentVisibility = async (id: string, currentHidden: boolean) => {
    try {
      await updateDoc(doc(db, 'tournaments', id), { isHidden: !currentHidden });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'tournaments');
    }
  };

  const createTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTournamentName || !auth.currentUser) return;
    try {
      await addDoc(collection(db, 'tournaments'), {
        name: newTournamentName,
        createdAt: Date.now(),
        ownerId: auth.currentUser.uid
      });
      setNewTournamentName('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'tournaments');
    }
  };

  const createTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName || !auth.currentUser) return;
    try {
      await addDoc(collection(db, 'teams'), {
        name: newTeamName,
        shortName: newTeamName.substring(0, 3).toUpperCase(),
        color: '#1D4ED8',
        ownerId: auth.currentUser.uid
      });
      setNewTeamName('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'teams');
    }
  };

  const createPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerName || !newPlayerTeam || !auth.currentUser) return;
    try {
      await addDoc(collection(db, 'players'), {
        name: newPlayerName,
        teamId: newPlayerTeam,
        number: parseInt(newPlayerNumber) || 0,
        ownerId: auth.currentUser.uid
      });
      setNewPlayerName('');
      setNewPlayerNumber('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'players');
    }
  };

  const createMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMatchHome || !newMatchAway || !newMatchTourName || !auth.currentUser) return;
    try {
      let homeTeam = teams.find(t => t.name === newMatchHome);
      if (!homeTeam) {
        homeTeam = {
          id: `ext_${Date.now()}_home`,
          name: newMatchHome,
          shortName: newMatchHome.substring(0, 3).toUpperCase(),
          color: '#1D4ED8',
          ownerId: auth.currentUser.uid
        };
      }
      
      let awayTeam = teams.find(t => t.name === newMatchAway);
      if (!awayTeam) {
        awayTeam = {
          id: `ext_${Date.now()}_away`,
          name: newMatchAway,
          shortName: newMatchAway.substring(0, 3).toUpperCase(),
          color: '#B91C1C',
          ownerId: auth.currentUser.uid
        };
      }

      await addDoc(collection(db, 'matches'), {
        tournamentName: newMatchTourName,
        groupName: '',
        homeTeam: homeTeam,
        awayTeam: awayTeam,
        homeScore: 0,
        awayScore: 0,
        status: 'scheduled',
        startTime: newMatchStartTime ? new Date(newMatchStartTime).getTime() : 0,
        halfDuration: parseInt(newMatchHalfDuration) || 20,
        elapsedSeconds: 0,
        maxSquadSize: 17,
        ownerId: auth.currentUser.uid
      });
      setNewMatchHome('');
      setNewMatchAway('');
      setNewMatchStartTime('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'matches');
    }
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminEmail) return;
    if (allowedEmails.includes(newAdminEmail)) {
      setNewAdminEmail('');
      return;
    }
    try {
      await setDoc(doc(db, 'settings', 'auth'), {
        allowedEmails: [...allowedEmails, newAdminEmail]
      });
      setNewAdminEmail('');
    } catch (err) {
      alert("Du har ikke rettigheder til at tilføje administratorer.");
    }
  };

  const handleRemoveAdmin = (emailToRemove: string) => {
    if (emailToRemove === 'mikewilken@gmail.com') {
      alert('Kan ikke fjerne hovedadministratoren');
      return;
    }
    setAdminToRemove(emailToRemove);
  };

  const confirmRemoveAdmin = async () => {
    if (!adminToRemove) return;
    try {
      await setDoc(doc(db, 'settings', 'auth'), {
        allowedEmails: allowedEmails.filter(e => e !== adminToRemove)
      });
    } catch (err) {
      alert("Du har ikke rettigheder til at fjerne administratorer.");
    }
    setAdminToRemove(null);
  };

  return (
    <div className="p-4 overflow-y-auto w-full">
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {(['matches', 'tournaments', 'teams', 'players', 'settings'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest whitespace-nowrap transition-colors ${activeTab === tab ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-600'}`}
          >
            {tab === 'matches' ? 'Kampe' : tab === 'tournaments' ? 'Turneringer' : tab === 'teams' ? 'Hold' : tab === 'players' ? 'Spillere' : 'Admins'}
          </button>
        ))}
      </div>

      {activeTab === 'tournaments' && (
        <div className="space-y-4">
          <form onSubmit={createTournament} className="bg-white p-4 rounded-xl border-2 border-slate-200 space-y-4">
            <h3 className="font-bold">Opret Turnering</h3>
            <input 
              type="text" 
              placeholder="Turnering navn" 
              className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-3 text-slate-800 font-bold outline-none focus:border-emerald-500"
              value={newTournamentName}
              onChange={e => setNewTournamentName(e.target.value)}
            />
            <button type="submit" disabled={!newTournamentName} className="w-full py-3 bg-emerald-500 text-white font-bold rounded-xl disabled:opacity-50">Opret</button>
          </form>
          <div className="space-y-2">
            {tournaments.map(t => (
              editingTournamentId === t.id ? (
                <form key={t.id} onSubmit={(e) => {
                  e.preventDefault();
                  updateDoc(doc(db, 'tournaments', t.id), { name: editTournamentName });
                  setEditingTournamentId(null);
                }} className="flex gap-2 p-3 bg-white rounded-lg shadow-sm border border-slate-200">
                    <input autoFocus className="flex-1 bg-slate-50 border p-1 rounded font-bold" value={editTournamentName} onChange={e => setEditTournamentName(e.target.value)} />
                    <button type="submit" className="text-emerald-500 hover:bg-emerald-50 p-2 rounded"><Check className="w-5 h-5"/></button>
                    <button type="button" onClick={() => setEditingTournamentId(null)} className="text-slate-400 hover:bg-slate-100 p-2 rounded"><X className="w-5 h-5"/></button>
                </form>
              ) : (
                <div key={t.id} className={`bg-white p-3 rounded-lg shadow-sm font-bold flex justify-between items-center group ${t.isHidden ? 'opacity-50 grayscale' : ''}`}>
                  <span className="flex items-center gap-2">
                    {t.name}
                    {t.isHidden && <span className="text-[10px] bg-slate-200 text-slate-500 px-2 py-0.5 rounded-full uppercase tracking-widest">Skjult</span>}
                  </span>
                  <div className="flex gap-1">
                    <button onClick={() => toggleTournamentVisibility(t.id, !!t.isHidden)} className="text-slate-400 hover:text-blue-500 p-2">
                      {t.isHidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                    <button onClick={() => { setEditingTournamentId(t.id); setEditTournamentName(t.name); }} className="text-slate-400 hover:text-emerald-500 p-2"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete('tournaments', t.id)} className="text-slate-400 hover:text-red-500 p-2"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              )
            ))}
          </div>
        </div>
      )}

      {activeTab === 'teams' && (
        <div className="space-y-4">
          <form onSubmit={createTeam} className="bg-white p-4 rounded-xl border-2 border-slate-200 space-y-4">
            <h3 className="font-bold">Opret Hold</h3>
            <input 
              type="text" 
              placeholder="Hold navn" 
              className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-3 text-slate-800 font-bold outline-none focus:border-emerald-500"
              value={newTeamName}
              onChange={e => setNewTeamName(e.target.value)}
            />
            <button type="submit" disabled={!newTeamName} className="w-full py-3 bg-emerald-500 text-white font-bold rounded-xl disabled:opacity-50">Opret</button>
          </form>
          <div className="space-y-2">
            {teams.map(t => (
              editingTeamId === t.id ? (
                <form key={t.id} onSubmit={(e) => {
                  e.preventDefault();
                  updateDoc(doc(db, 'teams', t.id), { name: editTeamName, shortName: editTeamName.substring(0, 3).toUpperCase() });
                  setEditingTeamId(null);
                }} className="flex gap-2 p-3 bg-white rounded-lg shadow-sm border border-slate-200">
                    <input autoFocus className="flex-1 bg-slate-50 border p-1 rounded font-bold" value={editTeamName} onChange={e => setEditTeamName(e.target.value)} />
                    <button type="submit" className="text-emerald-500 hover:bg-emerald-50 p-2 rounded"><Check className="w-5 h-5"/></button>
                    <button type="button" onClick={() => setEditingTeamId(null)} className="text-slate-400 hover:bg-slate-100 p-2 rounded"><X className="w-5 h-5"/></button>
                </form>
              ) : (
                <div key={t.id} className="bg-white p-3 rounded-lg shadow-sm font-bold flex justify-between items-center group">
                  <span>{t.name}</span>
                  <div className="flex gap-1">
                    <button onClick={() => { setEditingTeamId(t.id); setEditTeamName(t.name); }} className="text-slate-400 hover:text-emerald-500 p-2"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete('teams', t.id)} className="text-slate-400 hover:text-red-500 p-2"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              )
            ))}
          </div>
        </div>
      )}

      {activeTab === 'players' && (
        <div className="space-y-4">
          <form onSubmit={createPlayer} className="bg-white p-4 rounded-xl border-2 border-slate-200 space-y-3">
            <h3 className="font-bold">Opret Spiller</h3>
            <select 
              className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-3 text-slate-800 font-bold outline-none focus:border-emerald-500"
              value={newPlayerTeam}
              onChange={e => setNewPlayerTeam(e.target.value)}
            >
              <option value="">Vælg Hold...</option>
              {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="Spiller navn" 
                className="flex-1 bg-slate-50 border-2 border-slate-200 rounded-xl p-3 text-slate-800 font-bold outline-none focus:border-emerald-500"
                value={newPlayerName}
                onChange={e => setNewPlayerName(e.target.value)}
              />
              <input 
                type="number" 
                placeholder="Nr." 
                className="w-20 bg-slate-50 border-2 border-slate-200 rounded-xl p-3 text-slate-800 font-bold outline-none focus:border-emerald-500"
                value={newPlayerNumber}
                onChange={e => setNewPlayerNumber(e.target.value)}
              />
            </div>
            <button type="submit" disabled={!newPlayerName || !newPlayerTeam} className="w-full py-3 bg-emerald-500 text-white font-bold rounded-xl disabled:opacity-50">Opret</button>
          </form>
          <div className="space-y-2">
            {players.map(p => (
              editingPlayerId === p.id ? (
                <form key={p.id} onSubmit={(e) => {
                  e.preventDefault();
                  updateDoc(doc(db, 'players', p.id), { name: editPlayerName, number: parseInt(editPlayerNumber) || 0, teamId: editPlayerTeamId });
                  setEditingPlayerId(null);
                }} className="flex gap-2 p-3 bg-white rounded-lg shadow-sm flex-wrap border border-slate-200">
                    <input autoFocus className="flex-1 bg-slate-50 border p-1 rounded font-bold min-w-[120px]" value={editPlayerName} onChange={e => setEditPlayerName(e.target.value)} />
                    <input type="number" className="w-16 bg-slate-50 border p-1 rounded font-bold" value={editPlayerNumber} onChange={e => setEditPlayerNumber(e.target.value)} />
                    <select 
                      className="bg-slate-50 border p-1 rounded font-bold" 
                      value={editPlayerTeamId} 
                      onChange={e => setEditPlayerTeamId(e.target.value)}
                    >
                      <option value="" disabled>Vælg hold</option>
                      {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                    <button type="submit" className="text-emerald-500 hover:bg-emerald-50 p-2 rounded"><Check className="w-5 h-5"/></button>
                    <button type="button" onClick={() => setEditingPlayerId(null)} className="text-slate-400 hover:bg-slate-100 p-2 rounded"><X className="w-5 h-5"/></button>
                </form>
              ) : (
                <div key={p.id} className="bg-white p-3 rounded-lg shadow-sm font-bold flex justify-between items-center group">
                  <span>#{p.number} {p.name} <span className="opacity-50 text-xs ml-2">({teams.find(t=>t.id===p.teamId)?.name})</span></span>
                  <div className="flex gap-1">
                    <button onClick={() => { setEditingPlayerId(p.id); setEditPlayerName(p.name); setEditPlayerNumber(String(p.number)); setEditPlayerTeamId(p.teamId); }} className="text-slate-400 hover:text-emerald-500 p-2"><Pencil className="w-4 h-4" /></button>

                    <button onClick={() => handleDelete('players', p.id)} className="text-slate-400 hover:text-red-500 p-2"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              )
            ))}
          </div>
        </div>
      )}

      {activeTab === 'matches' && (
        <div className="space-y-6">
          <div className="space-y-2">
            <h3 className="font-bold text-slate-800">Aktive Kampe</h3>
            
            {matches.filter(m => m.status !== 'finished').sort((a,b) => (a.startTime || Number.MAX_SAFE_INTEGER) - (b.startTime || Number.MAX_SAFE_INTEGER)).map(m => (
              editingMatchId === m.id ? (
                <form key={m.id} onSubmit={(e) => {
                  e.preventDefault();
                  updateDoc(doc(db, 'matches', m.id), { 
                    tournamentName: editMatchTourName, 
                    halfDuration: parseInt(editMatchHalfDuration) || 20,
                    startTime: editMatchStartTime ? new Date(editMatchStartTime).getTime() : 0, 
                  });
                  setEditingMatchId(null);
                }} className="flex flex-col gap-2 p-3 bg-white rounded-lg shadow-sm border border-slate-200">
                    <input autoFocus className="flex-1 bg-slate-50 border p-2 rounded font-bold" placeholder="Turnering navn" value={editMatchTourName} onChange={e => setEditMatchTourName(e.target.value)} />
                    <div className="flex gap-2">
                       <input type="datetime-local" className="flex-[2] min-w-0 bg-slate-50 border p-2 rounded font-bold text-sm" value={editMatchStartTime} onChange={e => setEditMatchStartTime(e.target.value)} />
                       <input type="number" className="flex-1 min-w-0 bg-slate-50 border p-2 rounded font-bold text-sm" placeholder="Min/halv" value={editMatchHalfDuration} onChange={e => setEditMatchHalfDuration(e.target.value)} />
                    </div>
                    <div className="flex justify-end gap-2 mt-2">
                      <button type="button" onClick={() => setEditingMatchId(null)} className="text-slate-500 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-lg font-bold">Annuller</button>
                      <button type="submit" className="text-white bg-emerald-500 hover:bg-emerald-600 px-4 py-2 rounded-lg font-bold">Gem Egenskaber</button>
                    </div>
                </form>
              ) : (
                <div key={m.id} className="relative bg-white p-3 rounded-lg shadow-sm border border-slate-200 group">
                  <div className="absolute right-2 top-2 flex gap-1 z-20">
                    <button onClick={(e) => { 
                      e.preventDefault(); 
                      setEditingMatchId(m.id); 
                      setEditMatchTourName(m.tournamentName); 
                      setEditMatchHalfDuration(String(m.halfDuration)); 
                      if (m.startTime) {
                        const tzOffset = (new Date()).getTimezoneOffset() * 60000;
                        const localISOTime = (new Date(m.startTime - tzOffset)).toISOString().slice(0, 16);
                        setEditMatchStartTime(localISOTime);
                      } else {
                        setEditMatchStartTime('');
                      }
                    }} className="text-slate-400 hover:text-emerald-500 bg-white/80 backdrop-blur-sm p-1.5 rounded-md"><Pencil className="w-4 h-4" /></button>
                    <button onClick={(e) => { e.preventDefault(); handleDelete('matches', m.id); }} className="text-slate-400 hover:text-red-500 bg-white/80 backdrop-blur-sm p-1.5 rounded-md"><Trash2 className="w-4 h-4" /></button>
                  </div>
                  <Link to={`/admin/match/${m.id}`} className="block hover:border-emerald-500 transition-colors">
                    <div className="flex justify-between items-center text-[10px] uppercase font-bold text-slate-400 mb-1 pr-16">
                      <div className="flex items-center gap-2">
                        {(m.status === 'first_half' || m.status === 'second_half') && (
                          <div className="text-emerald-600 flex items-center gap-2">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            <LiveMatchTimer match={m} />
                          </div>
                        )}
                        <span>{m.tournamentName} - {m.halfDuration} min. halvleg</span>
                      </div>
                      {m.startTime ? <span>{new Date(m.startTime).toLocaleString('da-DK', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span> : null}
                    </div>
                    <div className="font-bold">{m.homeTeam.name} vs {m.awayTeam.name}</div>
                    <div className="text-[10px] uppercase font-bold text-emerald-500 mt-2 flex items-center justify-end">
                      {(m.status === 'first_half' || m.status === 'second_half') ? 'Gå til live kamp →' : 'Åbn Kampstyring →'}
                    </div>
                  </Link>
                </div>
              )
            ))}
            {matches.filter(m => m.status !== 'finished').length === 0 && (
               <div className="text-sm text-slate-500 italic p-2 border-2 border-dashed border-slate-200 rounded-xl text-center">Ingen aktive kampe</div>
            )}
            
            <div className="pt-2 flex justify-end">
              <Link to="/admin/archive" className="text-xs font-bold text-slate-500 hover:text-emerald-500 transition-colors flex items-center gap-1 bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-sm hover:shadow">
                Alle afsluttede kampe →
              </Link>
            </div>
          </div>
          
          <div className="pt-4 border-t-2 border-slate-200">
             <form onSubmit={createMatch} className="bg-slate-100 p-4 rounded-xl border-2 border-slate-200 space-y-3">
               <h3 className="font-bold text-slate-800">Opret ny kamp</h3>
               <select 
                 className="w-full bg-white border-2 border-slate-200 rounded-xl p-3 text-slate-800 font-bold outline-none focus:border-emerald-500"
                 value={newMatchTourName}
                 onChange={e => setNewMatchTourName(e.target.value)}
               >
                 <option value="">Vælg Turnering...</option>
                 {tournaments.filter(t => !t.isHidden).map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
                 <option value="Træningskamp">Træningskamp</option>
               </select>
               
               <div className="grid gap-2">
                 <div className="relative">
                   <input 
                     type="text" 
                     list="home-teams-list"
                     placeholder="Hjemmehold (Vælg eller skriv fritekst)"
                     className="w-full bg-white border-2 border-slate-200 rounded-xl p-3 text-slate-800 font-bold outline-none focus:border-emerald-500"
                     value={newMatchHome}
                     onChange={e => setNewMatchHome(e.target.value)}
                   />
                   <datalist id="home-teams-list">
                     {teams.filter(t => t.name !== newMatchAway).map(t => <option key={t.id} value={t.name} />)}
                   </datalist>
                 </div>
                 <div className="relative">
                   <input 
                     type="text" 
                     list="away-teams-list"
                     placeholder="Udehold (Vælg eller skriv fritekst)"
                     className="w-full bg-white border-2 border-slate-200 rounded-xl p-3 text-slate-800 font-bold outline-none focus:border-emerald-500"
                     value={newMatchAway}
                     onChange={e => setNewMatchAway(e.target.value)}
                   />
                   <datalist id="away-teams-list">
                     {teams.filter(t => t.name !== newMatchHome).map(t => <option key={t.id} value={t.name} />)}
                   </datalist>
                 </div>
               </div>
               
               <div className="flex gap-2">
                 <div className="flex-[2] min-w-0">
                   <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5 truncate">Dato & Tid</label>
                   <input 
                     type="datetime-local" 
                     className="w-full bg-white border-2 border-slate-200 rounded-xl p-3 text-sm sm:text-base text-slate-800 font-bold outline-none focus:border-emerald-500"
                     value={newMatchStartTime}
                     onChange={e => setNewMatchStartTime(e.target.value)}
                   />
                 </div>
                 <div className="flex-1 min-w-0">
                   <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5 truncate">Halvleg (min)</label>
                   <input 
                     type="number" 
                     placeholder="20" 
                     className="w-full bg-white border-2 border-slate-200 rounded-xl p-3 text-sm sm:text-base text-slate-800 font-bold outline-none focus:border-emerald-500"
                     value={newMatchHalfDuration}
                     onChange={e => setNewMatchHalfDuration(e.target.value)}
                   />
                 </div>
               </div>
               <button type="submit" disabled={!newMatchHome || !newMatchAway || !newMatchTourName} className="w-full py-3 bg-emerald-500 text-white font-bold rounded-xl disabled:opacity-50">Opret Kamp</button>
             </form>
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="space-y-6">
          <div className="bg-slate-100 p-6 rounded-2xl border-2 border-slate-200">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-8 h-8 text-emerald-500" />
              <h3 className="text-xl font-black text-slate-800">Administrativ Adgang</h3>
            </div>
            <p className="text-sm text-slate-600 mb-6">
              Tilføj de Google-konti (Email adresser), som har tilladelse til at tilgå dette kontrolpanel, oprette kampe, og ændre oplysninger. Kun mikewilken@gmail.com kan tilføje eller slette admins!
            </p>
            
            <form onSubmit={handleAddAdmin} className="flex gap-2 mb-6">
              <input 
                type="email" 
                placeholder="Indtast email-adresse" 
                className="flex-[3] min-w-0 bg-white border-2 border-slate-200 rounded-xl p-3 text-slate-800 font-bold outline-none focus:border-emerald-500"
                value={newAdminEmail}
                onChange={e => setNewAdminEmail(e.target.value)}
              />
              <button type="submit" disabled={!newAdminEmail} className="flex-1 min-w-[80px] bg-emerald-500 hover:bg-emerald-600 transition-colors text-white font-bold rounded-xl disabled:opacity-50">
                Tilføj
              </button>
            </form>

            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Godkendte Controllere</h4>
              {allowedEmails.map(email => (
                <div key={email} className="bg-white p-3 rounded-lg shadow-sm font-bold flex justify-between items-center group border border-slate-200">
                  <span className={email === 'mikewilken@gmail.com' ? 'text-emerald-700' : 'text-slate-700'}>
                    {email} {email === 'mikewilken@gmail.com' && <span className="opacity-50 text-xs ml-2">(Owner)</span>}
                  </span>
                  {email !== 'mikewilken@gmail.com' && (
                    <button onClick={() => handleRemoveAdmin(email)} className="text-slate-400 hover:text-red-500 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      <ConfirmDialog 
        isOpen={itemToDelete !== null}
        title={itemToDelete?.title || ''}
        message={itemToDelete?.message || ''}
        onConfirm={confirmDeletion}
        onCancel={() => setItemToDelete(null)}
      />
      <ConfirmDialog
        isOpen={adminToRemove !== null}
        title="Fjern Administrator"
        message={`Er du sikker på at du vil fjerne ${adminToRemove} som administrator?`}
        onConfirm={confirmRemoveAdmin}
        onCancel={() => setAdminToRemove(null)}
      />
    </div>
  );
}

