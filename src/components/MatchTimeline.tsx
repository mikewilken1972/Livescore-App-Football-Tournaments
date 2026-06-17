import React from 'react';
import { Match, MatchEvent, Player } from '../types';
import { Activity } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface MatchTimelineProps {
  match: Match;
  events: MatchEvent[];
  players: Player[];
}

export function MatchTimeline({ match, events, players }: MatchTimelineProps) {
  const getPlayerName = (id?: string) => players.find((p) => p.id === id)?.name || 'Ukendt spiller';

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-slate-400 py-12 px-6 text-center">
        <Activity className="w-10 h-10 mb-4 opacity-50" />
        <p className="font-bold text-slate-600">Ingen hændelser endnu i denne kamp.</p>
        <p className="text-sm opacity-60 mt-1">Når kampen starter vil tidslinjen blive opdateret her.</p>
      </div>
    );
  }

  // Sorterer events faldende, så de nyeste står øverst hvis det er live
  const sortedEvents = [...events].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="flex-1 bg-slate-50 p-6 overflow-hidden max-w-lg mx-auto w-full">
      <div className="flex items-center justify-between mb-6 border-b border-slate-200 pb-2">
        <h3 className="font-bold text-slate-800">Tidslinje</h3>
        <span className="text-xs text-slate-400">Senest opdateret {new Date().toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' })}</span>
      </div>

      <div className="relative pt-2">
        {/* Vertical Line */}
        <div className="absolute left-[15px] top-0 bottom-0 w-0.5 bg-slate-200"></div>

        <div className="space-y-0 relative z-10">
          {sortedEvents.map((event, index) => {
            const isHome = event.teamId === match.homeTeam.id;
            const isNeutral = !event.teamId;

            return (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30, delay: index * 0.05 }}
                key={event.id} 
                className="relative pl-12 mb-6"
              >
                {isNeutral ? (
                  <>
                    <div className="absolute left-[9.5px] top-1 w-3 h-3 rounded-full bg-slate-800 ring-4 ring-slate-50"></div>
                    <div className="text-xs text-slate-400 font-mono font-bold uppercase">
                      {event.minute}' • {
                        event.type === 'match_start' ? 'Kamp Start' :
                        event.type === 'half_time' ? 'Halvleg slut' :
                        event.type === 'second_half_start' ? '2. Halvleg Start' :
                        event.type === 'match_end' ? 'Kamp Slut' : 'Hændelse'
                      }
                    </div>
                    <div className="text-sm font-semibold text-slate-600">
                       {event.type === 'half_time' || event.type === 'match_end' ? "Fløjtet af" : "Fløjtet i gang"}
                    </div>
                  </>
                ) : (
                  <>
                    <div className={cn(
                      "absolute left-[9.5px] top-1 w-3 h-3 rounded-full ring-4 ring-slate-50",
                      event.type.includes('goal') ? "bg-emerald-500" : 
                      (event.type === 'red_card' ? "bg-red-500" : 
                       event.type === 'yellow_card' ? "bg-yellow-500" : "bg-blue-500")
                    )}></div>
                    
                    <div className="text-xs text-slate-400 font-mono font-bold uppercase">
                      {event.minute}' • {
                        event.type.includes('goal') ? 'Mål' : 
                        event.type === 'yellow_card' ? 'Advarsel' :
                        event.type === 'red_card' ? 'Udvisning' : 
                        event.type === 'substitution' ? 'Udskiftning' : 'Hændelse'
                      }
                    </div>
                    
                    {event.type.includes('goal') ? (
                      <>
                        <div className="text-sm font-bold text-slate-800">{getPlayerName(event.playerId)}</div>
                        <div className="text-xs text-slate-500">
                          {event.assistPlayerId ? `Assist: ${getPlayerName(event.assistPlayerId)}` : 'Uden assist'}
                        </div>
                        {event.type === 'own_goal' && <div className="text-xs text-white bg-red-500 rounded px-1 w-max font-bold mt-1">Selvmål</div>}
                        {event.type === 'penalty_goal' && <div className="text-xs text-slate-500 font-bold mt-0.5 uppercase">Straffespark</div>}
                      </>
                    ) : event.type === 'substitution' ? (
                      <>
                        <div className="text-sm font-bold text-slate-800">
                          {event.assistPlayerId ? `IN: ${getPlayerName(event.assistPlayerId)}` : 'Indskiftning'}
                        </div>
                        <div className="text-xs text-slate-500">
                          {event.playerId ? `UD: ${getPlayerName(event.playerId)}` : 'Udskiftning'}
                        </div>
                      </>
                    ) : (
                      <div className="text-sm font-bold text-slate-800">{event.playerId ? getPlayerName(event.playerId) : (event.teamId === match.homeTeam.id ? match.homeTeam.name : match.awayTeam.name)}</div>
                    )}
                  </>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

