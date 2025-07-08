import { Routes, Route } from "react-router-dom";
import LoginPage from "./components/LoginPage";
import SignupPage from "./components/SignupPage";
import LandingPage from "./components/LandingPage";
import ServicesPage from "./components/ServicesPage";
import CartPage from "./components/CartPage";
import AdminDashboard from "./components/AdminDashboard";
import UserDashboard from "./components/UserDashboard";
import FreelancerPortfolioPage from "./components/FreelancerPortfolioPage";
import FreelancersListPage from "./components/FreelancersListPage";
import PaymentGatewayPage from "./components/PaymentMethod";

import "./App.css";

const App = () => (
  <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/signup" element={<SignupPage />} />
    <Route path="/" element={<LandingPage />} />
    <Route path="/services" element={<ServicesPage />} />
    <Route path="/admin-dashboard" element={<AdminDashboard />} />
    <Route path="/user-dashboard" element={<UserDashboard />} />
    <Route path="/my-portfolio" element={<FreelancerPortfolioPage />} />
    <Route path="/my-portfolio/:userId" element={<FreelancerPortfolioPage />} />
    <Route path="/portfolio-list" element={<FreelancersListPage />} />
    <Route path="/payment" element={<PaymentGatewayPage />} />
    <Route path="/cart" element={<CartPage />} />
  </Routes>
);

export default App;
