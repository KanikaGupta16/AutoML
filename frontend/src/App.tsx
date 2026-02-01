import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Chat from "./pages/Chat";
import Crawler from "./pages/Crawler";
import Training from "./pages/Training";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/crawler" element={<Crawler />} />
        <Route path="/training" element={<Training />} />
      </Routes>
    </BrowserRouter>
  );
}
