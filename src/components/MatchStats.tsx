import React from 'react';
import { Match, MatchEvent } from '../types';

interface MatchStatsProps {
  match: Match;
  events: MatchEvent[];
}

export function MatchStats({ match, events }: MatchStatsProps) {
  const getStats = (teamId: string) => {
    return {
      goals: events.filter(e => e.teamId === teamId && e.type.includes('goal')).length,
      yellowCards: events.filter(e => e.teamId === teamId && (e.type === 'yellow_card' || e.type === 'coach_yellow_card')).length,
      redCards: events.filter(e => e.teamId === teamId && e.type === 'red_card').length,
      corners: events.filter(e => e.teamId === teamId && e.type === 'corner_kick').length,
      freeKicks: events.filter(e => e.teamId === teamId && e.type === 'free_kick').length,
      shotsOnTarget: events.filter(e => e.teamId === teamId && e.type === 'shot_on_target').length,
      offsides: events.filter(e => e.teamId === teamId && e.type === 'offside').length,
      penalties: events.filter(e => e.teamId === teamId && e.type === 'penalty').length,
    };
  };

  const homeStats = getStats(match.homeTeam.id);
  const awayStats = getStats(match.awayTeam.id);

  const StatRow = ({ label, homeVal, awayVal }: { label: string; homeVal: number; awayVal: number }) => {
    const total = homeVal + awayVal;
    const homePercent = total > 0 ? (homeVal / total) * 100 : 50;
    const awayPercent = total > 0 ? (awayVal / total) * 100 : 50;

    return (
      <div className="flex flex-col gap-1 py-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors px-2 rounded">
        <div className="flex justify-between items-center text-sm font-bold text-slate-800">
          <span className="w-8 text-center">{homeVal > 0 ? homeVal : '-'}</span>
          <span className="text-xs uppercase tracking-widest text-slate-400 font-black">{label}</span>
          <span className="w-8 text-center">{awayVal > 0 ? awayVal : '-'}</span>
        </div>
        {(homeVal > 0 || awayVal > 0) && (
          <div className="flex h-1.5 w-full rounded-full overflow-hidden bg-slate-100 mt-1">
            <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${homePercent}%` }} />
            <div className="bg-blue-500 h-full transition-all duration-500" style={{ width: `${awayPercent}%` }} />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-3xl p-6 border-2 border-slate-100 shadow-sm mt-4">
      <h3 className="text-sm font-black uppercase text-slate-400 tracking-widest mb-6 text-center">Kampstatistik</h3>
      
      <div className="flex justify-between items-center mb-6">
        <div className="text-lg font-bold truncate max-w-[40%] text-center">{match.homeTeam.shortName || match.homeTeam.name}</div>
        <div className="text-xl font-black text-slate-300">VS</div>
        <div className="text-lg font-bold truncate max-w-[40%] text-center">{match.awayTeam.shortName || match.awayTeam.name}</div>
      </div>

      <div className="flex flex-col">
        <StatRow label="Skud på mål" homeVal={homeStats.shotsOnTarget} awayVal={awayStats.shotsOnTarget} />
        <StatRow label="Hjørnespark" homeVal={homeStats.corners} awayVal={awayStats.corners} />
        <StatRow label="Frispark" homeVal={homeStats.freeKicks} awayVal={awayStats.freeKicks} />
        <StatRow label="Offsides" homeVal={homeStats.offsides} awayVal={awayStats.offsides} />
        <StatRow label="Straffespark" homeVal={homeStats.penalties} awayVal={awayStats.penalties} />
        <StatRow label="Gule kort" homeVal={homeStats.yellowCards} awayVal={awayStats.yellowCards} />
        <StatRow label="Røde kort" homeVal={homeStats.redCards} awayVal={awayStats.redCards} />
      </div>
    </div>
  );
}
