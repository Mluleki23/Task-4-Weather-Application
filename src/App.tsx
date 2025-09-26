import "./App.css";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import Home from "./pages/Home";

function App() {
  return (
    <BrowserRouter>
      <nav className="p-4 flex gap-4 border-b mb-4">
        <Link to="/">Home</Link>
        {/* <Link to="/history">History</Link> */}
      </nav>
      <Routes>
        <Route path="/" element={<Home />} />
        {/* <Route path="/history" element={<HistoryPage />} /> */}
      </Routes>
    </BrowserRouter>
  );
}

export default App;
