import React, { useState, useEffect } from 'react';
import { Match, MatchEvent, Player, EventType } from '../types';
import { X } from 'lucide-react';

interface EditEventDialogProps {
  isOpen: boolean;
  event: MatchEvent | null;
  match: Match;
  players: Player[];
  onSave: (updatedFields: Partial<MatchEvent>) => void;
  onClose: () => void;
}

const EVENT_TYPE_LABELS: Record<EventType, string> = {
  match_start: 'Kamp Start',
  half_time: 'Halvleg Slut',
  second_half_start: '2. Halvleg Start',
  match_end: 'Kamp Slut',
  goal: 'Mål',
  penalty_goal: 'Straffespark Mål',
  own_goal: 'Selvmål',
  yellow_card: 'Gult Kort',
  red_card: 'Rødt Kort',
  substitution: 'Udskiftning',
  free_kick: 'Frispark',
  penalty: 'Straffespark',
  corner_kick: 'Hjørnespark',
  shot_on_target: 'Skud på mål',
  offside: 'Offside',
  comment: 'Kommentar',
  image: 'Billede/Kommentar',
  coach_yellow_card: 'Træner Gult Kort',
};

export function EditEventDialog({ isOpen, event, match, players, onSave, onClose }: EditEventDialogProps) {
  const [type, setType] = useState<EventType>('goal');
  const [minute, setMinute] = useState<number>(1);
  const [teamId, setTeamId] = useState<string>('');
  const [playerId, setPlayerId] = useState<string>('');
  const [assistPlayerId, setAssistPlayerId] = useState<string>('');
  const [description, setDescription] = useState<string>('');

  useEffect(() => {
    if (event) {
      setType(event.type);
      setMinute(event.minute);
      setTeamId(event.teamId || '');
      setPlayerId(event.playerId || '');
      setAssistPlayerId(event.assistPlayerId || '');
      setDescription(event.description || '');
    }
  }, [event]);

  if (!isOpen || !event) return null;

  // Sorter og filtrer spillere baseret på valgt hold
  const activeTeamPlayers = teamId 
    ? players.filter(p => p.teamId === teamId).sort((a, b) => a.name.localeCompare(b.name))
    : [];

  const handleTeamChange = (newTeamId: string) => {
    setTeamId(newTeamId);
    setPlayerId('');
    setAssistPlayerId('');
  };

  const handleTypeChange = (newType: EventType) => {
    setType(newType);
    // Hvis hændelsestype ikke understøtter spillere, nulstiller vi dem
    const needsPlayer = ['goal', 'penalty_goal', 'own_goal', 'yellow_card', 'red_card', 'substitution', 'coach_yellow_card'].includes(newType);
    if (!needsPlayer) {
      setPlayerId('');
    }
    const needsAssist = ['goal', 'substitution'].includes(newType);
    if (!needsAssist) {
      setAssistPlayerId('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      type,
      minute,
      teamId: teamId || undefined,
      playerId: playerId || undefined,
      assistPlayerId: assistPlayerId || undefined,
      description: description || undefined,
    });
  };

  const isNeutralType = ['match_start', 'half_time', 'second_half_start', 'match_end'].includes(type);
  const showPlayerSelect = ['goal', 'penalty_goal', 'own_goal', 'yellow_card', 'red_card', 'substitution', 'coach_yellow_card'].includes(type);
  const showAssistSelect = ['goal', 'substitution'].includes(type);

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3 flex-shrink-0">
          <h3 className="text-xl font-black text-slate-800">Rediger hændelse</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 hover:bg-slate-50 p-1 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto flex-1 pr-1">
          {/* Hændelsestype */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">
              Hændelsestype
            </label>
            <select
              value={type}
              onChange={e => handleTypeChange(e.target.value as EventType)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-slate-800 focus:border-emerald-500 focus:bg-white outline-none"
            >
              {Object.entries(EVENT_TYPE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          {/* Minut */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">
              Minut
            </label>
            <input
              type="number"
              min="1"
              max="150"
              required
              value={minute}
              onChange={e => setMinute(parseInt(e.target.value) || 1)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-slate-800 focus:border-emerald-500 focus:bg-white outline-none"
            />
          </div>

          {/* Hold (vises ikke for helt neutrale hændelser som kampstart/slut) */}
          {!isNeutralType && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">
                Hold
              </label>
              <select
                value={teamId}
                onChange={e => handleTeamChange(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-slate-800 focus:border-emerald-500 focus:bg-white outline-none"
              >
                <option value="">Intet hold (Neutral)</option>
                <option value={match.homeTeam.id}>{match.homeTeam.name} (Hjemme)</option>
                <option value={match.awayTeam.id}>{match.awayTeam.name} (Ude)</option>
              </select>
            </div>
          )}

          {/* Spiller (Særligt for mål, kort, udskiftning) */}
          {showPlayerSelect && teamId && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">
                {type === 'substitution' ? 'Udskiftet spiller (UD)' : 'Spiller'}
              </label>
              <select
                value={playerId}
                onChange={e => setPlayerId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-slate-800 focus:border-emerald-500 focus:bg-white outline-none"
              >
                <option value="">Vælg spiller...</option>
                {activeTeamPlayers.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.number ? `#${p.number} ` : ''}{p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Assist / Indskiftet spiller */}
          {showAssistSelect && teamId && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">
                {type === 'substitution' ? 'Indskiftet spiller (IND)' : 'Assist'}
              </label>
              <select
                value={assistPlayerId}
                onChange={e => setAssistPlayerId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-slate-800 focus:border-emerald-500 focus:bg-white outline-none"
              >
                <option value="">Vælg spiller...</option>
                {activeTeamPlayers
                  .filter(p => p.id !== playerId) // Kan ikke være den samme spiller
                  .map(p => (
                    <option key={p.id} value={p.id}>
                      {p.number ? `#${p.number} ` : ''}{p.name}
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* Beskrivelse / Kommentar */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">
              Beskrivelse / Kommentar
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              placeholder="Skriv valgfri hændelseskommentar..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-semibold text-slate-800 focus:border-emerald-500 focus:bg-white outline-none resize-none"
            />
          </div>

          {/* Hvis der er et billede på hændelsen, viser vi det som reference */}
          {event.imageUrl && (
            <div>
              <span className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">
                Tilhørende billede
              </span>
              <img src={event.imageUrl} alt="Hændelse reference" className="w-full h-32 object-cover rounded-xl border border-slate-200 shadow-sm" />
            </div>
          )}

          {/* Action Knapper */}
          <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              Annuller
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl font-bold text-white bg-emerald-500 hover:bg-emerald-600 transition-colors"
            >
              Gem ændringer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
