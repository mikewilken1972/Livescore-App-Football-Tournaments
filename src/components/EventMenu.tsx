import React, { useState } from 'react';
import { EventType, Match, Player } from '../types';
import { Square } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface EventMenuProps {
  match: Match;
  players: Player[];
  onAddEvent: (type: EventType, teamId?: string, playerId?: string, assistId?: string, description?: string, imageUrl?: string) => void;
  onUpdateStatus: (status: Match['status']) => void;
  onTogglePause: () => void;
  onReset: () => void;
  currentMinute: number;
}

export function EventMenu({ match, players, onAddEvent, onUpdateStatus, onTogglePause, onReset, currentMinute }: EventMenuProps) {
  const [activeModal, setActiveModal] = useState<'goal_home' | 'goal_away' | 'card' | 'sub' | 'free_kick' | 'penalty' | 'corner_kick' | 'image' | 'shot_on_target' | 'offside' | null>(null);
  const [selectedScorer, setSelectedScorer] = useState<string>('');
  const [selectedAssist, setSelectedAssist] = useState<string>('');
  
  // States for Card/Sub/Image modal
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [selectedPlayer, setSelectedPlayer] = useState<string>('');
  const [selectedSubIn, setSelectedSubIn] = useState<string>('');
  const [cardType, setCardType] = useState<'yellow_card' | 'red_card' | 'coach_yellow_card'>('yellow_card');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');

  const homePlayers = match.homeSquad && match.homeSquad.length > 0 
    ? players.filter(p => match.homeSquad!.includes(p.id)) 
    : players.filter(p => p.teamId === match.homeTeam.id);
    
  const awayPlayers = match.awaySquad && match.awaySquad.length > 0
    ? players.filter(p => match.awaySquad!.includes(p.id))
    : players.filter(p => p.teamId === match.awayTeam.id);

  const resetModals = () => {
    setActiveModal(null);
    setSelectedScorer('');
    setSelectedAssist('');
    setSelectedTeam('');
    setSelectedPlayer('');
    setSelectedSubIn('');
    setCardType('yellow_card');
    setImagePreview(null);
    setCommentText('');
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        // compress image aggressively to fit within firestore string limits nicely
        const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
        setImagePreview(dataUrl);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleImageSubmit = () => {
    // Modify onAddEvent to accept description and imageUrl, we'll need to do that via prop change or direct in AdminMatch
    // We will update AdminMatch shortly. Let's pass description and image as parameters?
    // Let's pass them as 5th and 6th props. We need to check onAddEvent signature.
    onAddEvent('image' as EventType, selectedTeam || undefined, undefined, undefined, commentText, imagePreview || undefined);
    resetModals();
  };

  const handleGoalSubmit = () => {
    const teamId = activeModal === 'goal_home' ? match.homeTeam.id : match.awayTeam.id;
    onAddEvent('goal', teamId, selectedScorer || undefined, selectedAssist || undefined);
    resetModals();
  };

  const handleCardSubmit = () => {
    if (!selectedTeam) return;
    onAddEvent(cardType, selectedTeam, selectedPlayer || undefined);
    resetModals();
  };

  const handleSubSubmit = () => {
    if (!selectedTeam) return;
    // assistId is player coming IN, playerId is player going OUT
    onAddEvent('substitution', selectedTeam, selectedPlayer || undefined, selectedSubIn || undefined);
    resetModals();
  };

  const handleGenericActionSubmit = () => {
    if (!selectedTeam) return;
    onAddEvent(activeModal as EventType, selectedTeam);
    resetModals();
  };

  const formatTime = (totalSeconds: number) => {
     const m = Math.floor(totalSeconds / 60);
     const s = totalSeconds % 60;
     return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex-1 p-6 space-y-4 bg-slate-50">
      
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="text-center mb-4">
          <div className="text-slate-400 text-xs font-bold uppercase tracking-widest">Kampur</div>
          <div className="text-5xl font-black font-mono text-slate-800">
             {match.status === 'scheduled' ? '00:00' : formatTime(currentMinute)}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
            {match.status === 'scheduled' && (
               <button 
                 onClick={() => { onUpdateStatus('first_half'); onAddEvent('match_start'); }}
                 className="col-span-2 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-bold text-sm border-b-4 border-slate-300"
               >
                 Start 1. Halvleg
               </button>
            )}
            {match.status === 'first_half' && (
               <>
                 <button 
                   onClick={() => { onUpdateStatus('half_time'); onAddEvent('half_time'); }}
                   className="col-span-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-bold text-sm border-b-4 border-slate-300"
                 >
                   Fløjt til pause
                 </button>
                 <button 
                   onClick={onTogglePause}
                   className={cn("col-span-1 py-3 rounded-xl font-bold text-sm border-b-4", match.isPaused ? "bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-200" : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300")}
                 >
                   {match.isPaused ? "Genoptag" : "Sæt på pause"}
                 </button>
               </>
            )}
            {match.status === 'half_time' && (
               <button 
                 onClick={() => { onUpdateStatus('second_half'); onAddEvent('second_half_start'); }}
                 className="col-span-2 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-bold text-sm border-b-4 border-slate-300"
               >
                 Start 2. Halvleg
               </button>
            )}
            {(match.status === 'second_half' || match.status === 'penalties') && (
               <>
                 <button 
                   onClick={() => { onUpdateStatus('finished'); onAddEvent('match_end'); }}
                   className="col-span-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-bold text-sm border-b-4 border-slate-300"
                 >
                   Afslut Kamp
                 </button>
                 {match.status === 'second_half' && (
                   <button 
                     onClick={() => { onUpdateStatus('penalties'); }}
                     className="col-span-1 bg-violet-100 hover:bg-violet-200 text-violet-700 py-3 rounded-xl font-bold text-sm border-b-4 border-violet-300"
                   >
                     Straffespark
                   </button>
                 )}
                 <button 
                   onClick={onTogglePause}
                   className={cn("col-span-1 py-3 rounded-xl font-bold text-sm border-b-4", match.isPaused ? "bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-200" : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300")}
                 >
                   {match.isPaused ? "Genoptag" : "Sæt på pause"}
                 </button>
               </>
            )}
            {match.status === 'finished' && (
               <button 
                 onClick={() => { onUpdateStatus('second_half'); }}
                 className="col-span-2 bg-amber-100 hover:bg-amber-200 text-amber-700 py-3 rounded-xl font-bold text-sm border-b-4 border-amber-300"
               >
                 Genoptag Kamp (Fejlafsluttet)
               </button>
            )}
        </div>
      </div>

      {match.status !== 'scheduled' && match.status !== 'finished' && (
        <div className="grid grid-cols-1 gap-4">
          <button 
            onClick={() => setActiveModal('goal_home')}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white p-6 rounded-2xl border-b-8 border-emerald-700 flex items-center justify-between active:border-b-4 tracking-tighter"
          >
            <div className="text-left">
              <div className="text-xs font-bold uppercase opacity-80">Hændelse</div>
              <div className="text-2xl font-black">{match.homeTeam.name} Mål</div>
            </div>
            <div className="bg-white/20 p-2 rounded-full">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"></path></svg>
            </div>
          </button>
          
          <button 
            onClick={() => setActiveModal('goal_away')}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white p-6 rounded-2xl border-b-8 border-emerald-700 flex items-center justify-between active:border-b-4 tracking-tighter"
          >
            <div className="text-left">
              <div className="text-xs font-bold uppercase opacity-80">Hændelse</div>
              <div className="text-2xl font-black">{match.awayTeam.name} Mål</div>
            </div>
            <div className="bg-white/20 p-2 rounded-full">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"></path></svg>
            </div>
          </button>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <button 
              onClick={() => setActiveModal('card')}
              className="bg-white border-2 border-slate-200 text-slate-800 p-4 rounded-xl font-bold flex flex-col items-center justify-center hover:bg-slate-50 active:scale-95 transition-transform min-h-[80px]"
            >
              <span className="text-sm md:text-base uppercase text-amber-500">Gul/Rødt</span>
            </button>
            <button 
              onClick={() => setActiveModal('sub')}
              className="bg-white border-2 border-slate-200 text-slate-800 p-4 rounded-xl font-bold flex flex-col items-center justify-center hover:bg-slate-50 active:scale-95 transition-transform min-h-[80px]"
            >
              <span className="text-sm md:text-base uppercase text-blue-500">Udskift</span>
            </button>
            <button 
              onClick={() => setActiveModal('free_kick')}
              className="bg-white border-2 border-slate-200 text-slate-800 p-4 rounded-xl font-bold flex flex-col items-center justify-center hover:bg-slate-50 active:scale-95 transition-transform min-h-[80px]"
            >
              <span className="text-sm md:text-base uppercase text-emerald-500">Frispark</span>
            </button>
            <button 
              onClick={() => setActiveModal('penalty')}
              className="bg-white border-2 border-slate-200 text-slate-800 p-4 rounded-xl font-bold flex flex-col items-center justify-center hover:bg-slate-50 active:scale-95 transition-transform min-h-[80px]"
            >
              <span className="text-sm md:text-base uppercase text-rose-500">Straffe</span>
            </button>
            <button 
              onClick={() => setActiveModal('corner_kick')}
              className="bg-white border-2 border-slate-200 text-slate-800 p-4 rounded-xl font-bold flex flex-col items-center justify-center hover:bg-slate-50 active:scale-95 transition-transform min-h-[80px]"
            >
              <span className="text-sm md:text-base uppercase text-purple-500 text-center leading-tight">Hjørne<br/>spark</span>
            </button>
            <button 
              onClick={() => setActiveModal('shot_on_target')}
              className="bg-white border-2 border-slate-200 text-slate-800 p-4 rounded-xl font-bold flex flex-col items-center justify-center hover:bg-slate-50 active:scale-95 transition-transform min-h-[80px]"
            >
              <span className="text-sm md:text-base uppercase text-indigo-500 text-center leading-tight">Skud på<br/>mål</span>
            </button>
            <button 
              onClick={() => setActiveModal('offside')}
              className="bg-white border-2 border-slate-200 text-slate-800 p-4 rounded-xl font-bold flex flex-col items-center justify-center hover:bg-slate-50 active:scale-95 transition-transform min-h-[80px]"
            >
              <span className="text-sm md:text-base uppercase text-orange-500 text-center leading-tight">Offside</span>
            </button>
            <button 
              onClick={() => setActiveModal('image')}
              className="bg-white border-2 border-slate-200 text-slate-800 p-4 rounded-xl font-bold flex flex-col items-center justify-center hover:bg-slate-50 active:scale-95 transition-transform min-h-[80px] col-span-2 md:col-span-1"
            >
              <span className="text-sm md:text-base uppercase text-sky-500 text-center leading-tight">Billede /<br/>Kommentar</span>
            </button>
          </div>
        </div>
      )}

      <div className="mt-12 text-center">
        <button 
          onClick={onReset} 
          className="text-[10px] uppercase tracking-widest font-bold text-slate-300 hover:text-red-500 transition-colors"
        >
          Nulstil kamp (slet alle hændelser)
        </button>
      </div>

      {/* Action Modals */}
      <AnimatePresence>
        {activeModal && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 z-[60] flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ y: '20%', scale: 0.95 }} 
              animate={{ y: 0, scale: 1 }} 
              exit={{ y: '20%', scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white w-full max-w-sm rounded-[32px] border-[8px] border-slate-800 p-6 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold tracking-tight">
                  {activeModal === 'goal_home' || activeModal === 'goal_away' 
                    ? `Skor til ${activeModal === 'goal_home' ? match.homeTeam.name : match.awayTeam.name}`
                    : activeModal === 'card' ? 'Tildel Kort' 
                    : activeModal === 'sub' ? 'Udskiftning'
                    : activeModal === 'free_kick' ? 'Frispark'
                    : activeModal === 'penalty' ? 'Straffe' 
                    : activeModal === 'image' ? 'Tilføj Billede/Kommentar'
                    : activeModal === 'shot_on_target' ? 'Skud på mål'
                    : activeModal === 'offside' ? 'Offside'
                    : 'Hjørnespark'}
                </h3>
                <button onClick={resetModals} className="text-slate-400 p-2 -mr-2 bg-slate-100 rounded-full hover:bg-slate-200">
                  <Square className="w-4 h-4" />
                </button>
              </div>

              {activeModal === 'image' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">Billede (Valgfri)</label>
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleImageChange}
                      className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-3 text-slate-800 font-medium focus:border-sky-500 outline-none file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100"
                    />
                    {imagePreview && (
                      <div className="mt-3">
                        <img src={imagePreview} alt="Preview" className="w-full h-32 object-cover rounded-xl border-2 border-slate-200" />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">Kommentar (Valgfri men anbefalet)</label>
                    <textarea 
                      className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-3 text-slate-800 font-medium focus:border-sky-500 outline-none min-h-[100px] resize-none"
                      placeholder="Skriv kommentar her..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                    />
                  </div>

                  <div className="pt-2">
                     <button 
                       disabled={!imagePreview && !commentText.trim()}
                       onClick={handleImageSubmit}
                       className="w-full py-4 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 disabled:bg-slate-300 text-white font-black text-lg border-b-4 border-sky-700 disabled:border-slate-400 rounded-2xl active:border-b-2 active:translate-y-0.5 transition-all"
                     >
                       Tilføj Billede/Kommentar
                     </button>
                  </div>
                </div>
              )}

              {(activeModal === 'goal_home' || activeModal === 'goal_away') && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">Målscorer (Valgfri)</label>
                    <select 
                      className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-3 text-slate-800 font-bold focus:border-emerald-500 outline-none"
                      value={selectedScorer}
                      onChange={(e) => setSelectedScorer(e.target.value)}
                    >
                      <option value="">Vælg spiller...</option>
                      {(activeModal === 'goal_home' ? homePlayers : awayPlayers).map(p => (
                        <option key={p.id} value={p.id}>#{p.number} {p.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">Assist (Valgfri)</label>
                    <select 
                      className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-3 text-slate-800 font-bold focus:border-emerald-500 outline-none"
                      value={selectedAssist}
                      onChange={(e) => setSelectedAssist(e.target.value)}
                    >
                      <option value="">Ingen assist</option>
                      {(activeModal === 'goal_home' ? homePlayers : awayPlayers).map(p => (
                        <option key={p.id} value={p.id}>#{p.number} {p.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="pt-2">
                     <button 
                       onClick={handleGoalSubmit}
                       className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:bg-slate-300 text-white font-black text-lg border-b-4 border-emerald-700 disabled:border-slate-400 rounded-2xl active:border-b-2 active:translate-y-0.5 transition-all"
                     >
                       Registrer Mål
                     </button>
                  </div>
                </div>
              )}

              {(activeModal === 'card' || activeModal === 'sub' || activeModal === 'free_kick' || activeModal === 'penalty' || activeModal === 'corner_kick' || activeModal === 'shot_on_target' || activeModal === 'offside') && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">Hold *</label>
                    <select 
                      className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-3 text-slate-800 font-bold focus:border-emerald-500 outline-none"
                      value={selectedTeam}
                      onChange={(e) => { setSelectedTeam(e.target.value); setSelectedPlayer(''); setSelectedSubIn(''); }}
                    >
                      <option value="">Vælg hold...</option>
                      <option value={match.homeTeam.id}>{match.homeTeam.name}</option>
                      <option value={match.awayTeam.id}>{match.awayTeam.name}</option>
                    </select>
                  </div>

                  {selectedTeam && activeModal === 'sub' && (
                    <>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">Spiller IN (Valgfri)</label>
                        <select 
                          className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-3 text-slate-800 font-bold focus:border-emerald-500 outline-none"
                          value={selectedSubIn}
                          onChange={(e) => setSelectedSubIn(e.target.value)}
                        >
                          <option value="">Ingen spiller valgt</option>
                          {(selectedTeam === match.homeTeam.id ? homePlayers : awayPlayers).map(p => (
                            <option key={p.id} value={p.id}>#{p.number} {p.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">Spiller UD (Valgfri)</label>
                        <select 
                          className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-3 text-slate-800 font-bold focus:border-emerald-500 outline-none"
                          value={selectedPlayer}
                          onChange={(e) => setSelectedPlayer(e.target.value)}
                        >
                          <option value="">Ingen spiller valgt</option>
                          {(selectedTeam === match.homeTeam.id ? homePlayers : awayPlayers).map(p => (
                            <option key={p.id} value={p.id}>#{p.number} {p.name}</option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}

                  {selectedTeam && activeModal === 'card' && (
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">Spiller (Valgfri)</label>
                      <select 
                        className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-3 text-slate-800 font-bold focus:border-emerald-500 outline-none"
                        value={selectedPlayer}
                        onChange={(e) => setSelectedPlayer(e.target.value)}
                      >
                        <option value="">Ingen spiller valgt</option>
                        {(selectedTeam === match.homeTeam.id ? homePlayers : awayPlayers).map(p => (
                          <option key={p.id} value={p.id}>#{p.number} {p.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {activeModal === 'card' && (
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">Type Kort *</label>
                      <select 
                        className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-3 text-slate-800 font-bold focus:border-emerald-500 outline-none"
                        value={cardType}
                        onChange={(e) => setCardType(e.target.value as 'yellow_card' | 'red_card' | 'coach_yellow_card')}
                      >
                        <option value="yellow_card">Gul (Advarsel)</option>
                        <option value="red_card">Rød (Udvisning)</option>
                        <option value="coach_yellow_card">Gul til Træner</option>
                      </select>
                    </div>
                  )}

                  <div className="pt-2">
                     <button 
                       disabled={!selectedTeam}
                       onClick={activeModal === 'card' ? handleCardSubmit : activeModal === 'sub' ? handleSubSubmit : handleGenericActionSubmit}
                       className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:bg-slate-300 text-white font-black text-lg border-b-4 border-emerald-700 disabled:border-slate-400 rounded-2xl active:border-b-2 active:translate-y-0.5 transition-all"
                     >
                       Godkend
                     </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

