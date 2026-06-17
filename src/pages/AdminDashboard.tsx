import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { EventMenu } from '../components/EventMenu';
import { INITIAL_MATCHES, MOCK_PLAYERS, MOCK_INITIAL_EVENTS } from '../data';
import { Match, MatchEvent, EventType } from '../types';
import { ChevronLeft, Shield } from 'lucide-react';

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Shield } from 'lucide-react';
import { auth, signInWithGoogle, logOut } from '../firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { AdminManagement } from './AdminManagement';

export function AdminDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Tilføj den/de emails, der skal have adgang her:
  const ALLOWED_EMAILS = ['mikewilken@gmail.com']; 

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  if (loading) {
    return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Henter...</div>;
  }

  if (user && user.email && !ALLOWED_EMAILS.includes(user.email)) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col font-sans pb-safe items-center justify-center p-4">
        <Link to="/" className="absolute top-4 left-4 text-slate-400 hover:text-white flex items-center gap-2 text-xs font-bold uppercase tracking-widest transition-colors"><ChevronLeft className="w-4 h-4" /> Tilbage</Link>
        <div className="w-full max-w-sm bg-slate-800 p-8 rounded-3xl text-center shadow-2xl">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-6" />
          <h1 className="text-2xl font-black text-white mb-2">Ingen adgang</h1>
          <p className="text-slate-400 text-sm mb-8">Kontoen {user.email} har ikke admin-rettigheder.</p>
          <button 
            onClick={logOut}
            className="w-full py-4 bg-slate-700 hover:bg-slate-600 active:scale-95 transition-all text-white font-black rounded-xl uppercase tracking-widest text-sm"
          >
            Log ud
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col font-sans pb-safe items-center justify-center p-4">
        <Link to="/" className="absolute top-4 left-4 text-slate-400 hover:text-white flex items-center gap-2 text-xs font-bold uppercase tracking-widest transition-colors"><ChevronLeft className="w-4 h-4" /> Tilbage</Link>
        <div className="w-full max-w-sm bg-slate-800 p-8 rounded-3xl text-center shadow-2xl">
          <Shield className="w-16 h-16 text-emerald-500 mx-auto mb-6" />
          <h1 className="text-2xl font-black text-white mb-2">Admin Dashboard</h1>
          <p className="text-slate-400 text-sm mb-8">Log ind for at styre live kampe og oprette hold.</p>
          <button 
            onClick={signInWithGoogle}
            className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 active:scale-95 transition-all text-white font-black rounded-xl uppercase tracking-widest text-sm"
          >
            Log ind med Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col font-sans pb-safe">
      <div className="bg-slate-800 border-b-2 border-slate-900 px-4 py-3 flex justify-between items-center z-10 relative">
        <Link 
          to="/"
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-[10px] uppercase tracking-widest font-bold">Forlad</span>
        </Link>
        <div className="flex flex-col items-end">
          <div className="flex items-center gap-2 text-white bg-emerald-500/20 px-3 py-1.5 rounded-full mb-1">
              <Shield className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-[10px] uppercase tracking-widest font-bold text-emerald-500">Live Admin</span>
          </div>
          <button onClick={logOut} className="text-[10px] text-slate-400 hover:text-white uppercase font-bold tracking-widest">Log ud</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto w-full max-w-sm mx-auto bg-slate-50 md:shadow-2xl md:my-4 md:rounded-[40px] md:border-[12px] md:border-slate-800 flex flex-col relative overflow-hidden">
        <div className="bg-slate-800 p-6 pt-10 text-white flex-shrink-0">
          <div className="text-2xl font-bold italic tracking-tighter uppercase">Kamp modul</div>
          <div className="text-xs text-slate-400 mt-1">Opret kampe, hold og spillere før rapport start.</div>
        </div>
        
        <AdminManagement />
        
        <div className="p-4 bg-slate-800 text-white flex justify-between items-center text-xs flex-shrink-0 mt-auto">
          <div className="font-bold">Logget ind som: <span className="text-emerald-400">{user.displayName || 'Træner'}</span></div>
          <div className="text-[10px] opacity-50 uppercase">v1.4.2 MVP</div>
        </div>
      </div>
    </div>
  );
}
