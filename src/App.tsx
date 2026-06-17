import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Home } from './pages/Home';
import { Archive } from './pages/Archive';
import { SpectatorMatch } from './pages/SpectatorMatch';
import { AdminDashboard } from './pages/AdminDashboard';
import { AdminMatch } from './pages/AdminMatch';
import { AdminArchive } from './pages/AdminArchive';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/archive" element={<Archive />} />
      <Route path="/match/:id" element={<SpectatorMatch />} />
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/admin/match/:id" element={<AdminMatch />} />
      <Route path="/admin/archive" element={<AdminArchive />} />
    </Routes>
  );
}
