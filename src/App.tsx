import { Navigate, Route, Routes } from "react-router";
import { BottomNav } from "./components/BottomNav";
import { SessionGate } from "./components/SessionGate";
import { AdminScreen } from "./screens/AdminScreen";
import { HallOfFameScreen } from "./screens/HallOfFameScreen";
import { HistoryScreen } from "./screens/HistoryScreen";
import { LoginScreen } from "./screens/LoginScreen";
import { MatchScreen } from "./screens/MatchScreen";
import { NewMatchScreen } from "./screens/NewMatchScreen";
import { RoundScreen } from "./screens/RoundScreen";
import { StartScreen } from "./screens/StartScreen";

// Routen nach SPEC §7 (S1–S8)
export function App() {
  return (
    <SessionGate>
      <Routes>
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/" element={<StartScreen />} />
        <Route path="/neu/:gameType" element={<NewMatchScreen />} />
        <Route path="/partie/:id" element={<MatchScreen />} />
        <Route path="/partie/:id/runde/:roundNo" element={<RoundScreen />} />
        <Route path="/historie" element={<HistoryScreen />} />
        <Route path="/hall-of-fame" element={<HallOfFameScreen />} />
        <Route path="/hall-of-fame/:gameType" element={<HallOfFameScreen />} />
        <Route path="/verwaltung" element={<AdminScreen />} />
        {/* Unbekannte Adresse → zurück zur Startseite */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <BottomNav />
    </SessionGate>
  );
}
