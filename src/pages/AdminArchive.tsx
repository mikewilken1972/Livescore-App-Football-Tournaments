import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Archive as ArchiveIcon, ArrowLeft, Trash2 } from 'lucide-react';
import { collection, onSnapshot, query, where, doc, deleteDoc } from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { db, auth, handleFirestoreError, OperationType, useAdminAccess } from '../firebase';
import { Match } from '../types';
import { ConfirmDialog } from '../components/ConfirmDialog';

export function AdminArchive() {
  const navigate = useNavigate();
  const { allowedEmails, loadingAdmins } = useAdminAccess();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [matchToDelete, setMatchToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (loadingAdmins) return;
    const unsubAuth = onAuthStateChanged(auth, u => {
      setUser(u);
      if (!u || (u.email && !allowedEmails.includes(u.email))) {
        navigate('/admin');
      }
    });
    return unsubAuth;
  }, [navigate, allowedEmails, loadingAdmins]);

  useEffect(() => {
    if (!user) return;
    const uid = user.uid;
    const q = query(collection(db, 'matches'), where('ownerId', '==', uid));
    const unsub = onSnapshot(q, snapshot => {
      let allMatches = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Match));
      allMatches = allMatches.filter(m => m.status === 'finished');
      // Sort newest top
      allMatches.sort((a, b) => (b.startTime || 0) - (a.startTime || 0));
      setMatches(allMatches);
      setLoading(false);
    }, err => handleFirestoreError(err, OperationType.LIST, 'matches'));
    return unsub;
  }, [user]);

  const handleDelete = (e: React.MouseEvent, matchId: string) => {
    e.preventDefault(); // Stop Link navigation
    e.stopPropagation(); // Stop event bubbling to Link
    setMatchToDelete(matchId);
  };

  const confirmDelete = async () => {
    if (!matchToDelete) return;
    try {
      await deleteDoc(doc(db, 'matches', matchToDelete));
    } catch (err) {
       handleFirestoreError(err, OperationType.DELETE, 'matches');
    }
    setMatchToDelete(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans p-4 md:p-8">
      <div className="max-w-3xl mx-auto pb-16">
        <header className="mb-8 relative">
          <Link to="/admin" className="absolute left-0 top-1.5 text-slate-400 hover:text-emerald-500 transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight pl-10 flex items-center gap-3">
            <ArchiveIcon className="text-slate-400 w-8 h-8" />
            Afsluttede Kampe
          </h1>
          <p className="text-slate-500 mt-2 font-medium pl-10">Oversigt over dine færdigspillede kampe.</p>
        </header>

        <main className="space-y-4">
          {loading ? (
            <div className="text-center text-slate-400 p-8 font-bold">Henter kampe...</div>
          ) : matches.length === 0 ? (
            <div className="text-center text-slate-400 p-8 font-bold bg-white rounded-2xl border-2 border-dashed border-slate-200">
              Ingen afsluttede kampe endnu
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {matches.map(match => (
                <Link 
                  key={match.id} 
                  to={`/admin/match/${match.id}`}
                  className="block bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all active:scale-[0.98] group relative"
                >
                  <button
                    onClick={(e) => handleDelete(e, match.id)}
                    className="absolute top-2 right-2 p-2 text-slate-300 hover:text-red-500 transition-colors z-10"
                    title="Slet kamp"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="flex justify-between items-center text-[10px] uppercase tracking-widest opacity-60 mb-3 font-bold text-slate-500 pr-8">
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
                    <div className="text-xs font-bold text-slate-400">
                      Afsluttet
                    </div>
                    <div className="text-xs font-bold text-slate-400 flex items-center gap-1 group-hover:text-emerald-500 transition-colors">
                      Tilgå hændelser →
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </main>
      </div>
      <ConfirmDialog
        isOpen={matchToDelete !== null}
        title="Slet kamp"
        message="Er du sikker på at du vil slette denne kamp og alle dens hændelser? Handlingen kan ikke fortrydes."
        onConfirm={confirmDelete}
        onCancel={() => setMatchToDelete(null)}
      />
    </div>
  );
}
