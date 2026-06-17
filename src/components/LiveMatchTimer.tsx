import React, { useState, useEffect } from 'react';
import { Match } from '../types';

export function LiveMatchTimer({ match }: { match: Match }) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if ((match.status === 'first_half' || match.status === 'second_half') && !match.isPaused) {
      const statusTime = match.statusUpdatedAt || Date.now();
      const baseSeconds = match.elapsedSeconds || 0;
      
      const updateTimer = () => {
        const currentRealSeconds = Math.floor((Date.now() - statusTime) / 1000);
        setElapsedSeconds(baseSeconds + currentRealSeconds);
      };
      
      updateTimer(); // Initial call
      interval = setInterval(updateTimer, 1000);
    } else {
      setElapsedSeconds(match.elapsedSeconds || 0);
    }
    
    return () => clearInterval(interval);
  }, [match.status, match.statusUpdatedAt, match.elapsedSeconds, match.isPaused]);

  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;
  
  if (match.status === 'scheduled') {
    return <span>Ikke Startet</span>;
  }
  
  if (match.status === 'half_time') {
    return <span>Pause</span>;
  }
  
  if (match.status === 'finished') {
    return <span>Slut</span>;
  }

  return (
    <span className="font-mono tabular-nums flex items-center gap-1.5">
      {match.isPaused && <span className="text-[9px] uppercase tracking-widest text-amber-500 font-bold bg-amber-100/20 px-1.5 py-0.5 rounded leading-none">PAUSE</span>}
      <span>{minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}</span>
    </span>
  );
}
