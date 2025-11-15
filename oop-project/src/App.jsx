import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Customer from "./pages/Customer";
import Retailer from "./pages/Retailer";
import Wholesaler from "./pages/Wholesaler";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/customer" element={<Customer />} />
        <Route path="/retailer" element={<Retailer />} />
        <Route path="/wholesaler" element={<Wholesaler />} />
      </Routes>
    </Router>
  );
}

export default App;
