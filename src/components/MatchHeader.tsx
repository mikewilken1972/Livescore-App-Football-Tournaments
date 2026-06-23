import React from 'react';
import { Match } from '../types';
import { LiveMatchTimer } from './LiveMatchTimer';
import { cn } from '../lib/utils';

interface MatchHeaderProps {
  match: Match;
}

export function MatchHeader({ match }: MatchHeaderProps) {
  return (
    <div className="bg-emerald-600 p-6 pt-10 text-white">
      <div className="text-[10px] uppercase tracking-widest opacity-80 mb-4 font-bold text-center flex flex-col gap-1 items-center">
        <span>{match.tournamentName} {match.groupName ? `• ${match.groupName}` : ''}</span>
        {match.startTime ? <span className="opacity-75">{new Date(match.startTime).toLocaleString('da-DK', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span> : null}
      </div>
      
      <div className="flex justify-between items-center max-w-sm mx-auto">
        <div className="text-center flex-1">
          <div className="text-xs font-semibold uppercase mb-1 opacity-90">Hjemme</div>
          <div className="text-lg font-bold">{match.homeTeam.name}</div>
        </div>
        
        <div className="bg-white/20 rounded-lg px-4 py-2 mx-4 text-center">
          <div className="text-4xl font-black tabular-nums whitespace-nowrap">{match.homeScore} - {match.awayScore}</div>
        </div>
        
        <div className="text-center flex-1">
          <div className="text-xs font-semibold uppercase mb-1 opacity-90">Ude</div>
          <div className="text-lg font-bold">{match.awayTeam.name}</div>
        </div>
      </div>
      
      <div className="mt-6 flex justify-center">
        <span className={cn(
          "text-white text-[10px] px-3 py-1 rounded-full font-bold flex items-center gap-1.5 transition-colors uppercase tracking-widest",
          match.status === 'scheduled' ? "bg-slate-500" :
          match.status === 'finished' ? "bg-slate-800" :
          match.status === 'half_time' ? "bg-amber-500" :
          match.isPaused ? "bg-amber-500" : "bg-red-500"
        )}>
           {(match.status === 'first_half' || match.status === 'second_half') && !match.isPaused && (
              <span className="relative flex h-1.5 w-1.5">
               <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
               <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white"></span>
             </span>
           )}
           <LiveMatchTimer match={match} />
        </span>
      </div>
    </div>
  );
}
