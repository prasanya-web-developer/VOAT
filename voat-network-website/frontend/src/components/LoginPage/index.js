import React from "react";
import { Link } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import axios from "axios";
import "./index.css";

class LoginPage extends React.Component {
  state = {
    email: "",
    password: "",
    showPassword: false,
    errors: {},
    isSubmitting: false,
  };

  handleInputChange = (e) => {
    const { name, value } = e.target;
    this.setState({ [name]: value });
  };

  togglePasswordVisibility = () => {
    this.setState((prevState) => ({
      showPassword: !prevState.showPassword,
    }));
  };

  validateForm = () => {
    const { email, password } = this.state;
    const errors = {};

    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      errors.email = "Invalid email address";
    }

    if (password.length < 6) {
      errors.password = "Password must be at least 6 characters";
    }

    this.setState({ errors });
    return Object.keys(errors).length === 0;
  };

  handleSubmit = async (e) => {
    e.preventDefault();

    if (this.validateForm()) {
      this.setState({ isSubmitting: true });

      try {
        const response = await this.performLogin();

        if (response.status === 200) {
          localStorage.setItem("user", JSON.stringify(response.data.user));
          alert("Login successful!");
          window.location.href = "/";
        }
      } catch (error) {
        console.error("Login error:", error);
        alert(
          error.response?.data?.message || "Login failed. Please try again."
        );
      } finally {
        this.setState({ isSubmitting: false });
      }
    }
  };

  performLogin = async () => {
    const { email, password } = this.state;

    return axios.post("https://voat.onrender.com/api/login", {
      email,
      password,
    });
  };

  render() {
    const { errors, showPassword, isSubmitting } = this.state;

    return (
      <div className="login-screen">
        <div className="login-container">
          <h2 className="login-title">Sign in to your account</h2>

          <div className="login-form-wrapper">
            <form className="login-form" onSubmit={this.handleSubmit}>
              {/* Email Input */}
              <div className="login-input-group">
                <label htmlFor="email" className="login-label">
                  Email address
                </label>
                <input
                  name="email"
                  type="email"
                  value={this.state.email}
                  onChange={this.handleInputChange}
                  className="login-input"
                  placeholder="Enter your email"
                />
                {errors.email && (
                  <p className="login-input-error">{errors.email}</p>
                )}
              </div>

              {/* Password Input */}
              <div className="login-input-group">
                <label htmlFor="password" className="login-label">
                  Password
                </label>
                <div className="login-password-container">
                  <input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={this.state.password}
                    onChange={this.handleInputChange}
                    className="login-input"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={this.togglePasswordVisibility}
                    className="login-password-toggle"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="login-input-error">{errors.password}</p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="login-submit-button"
              >
                {isSubmitting ? "Signing in..." : "Sign in"}
              </button>
            </form>

            {/* Register Link */}
            <div className="login-divider">
              <div className="login-divider-line"></div>
              <div className="login-divider-text">
                <span className="login-divider-content">
                  Don't have an account?
                </span>
              </div>
            </div>

            <Link to="/signup" className="login-register-link">
              Sign up
            </Link>
          </div>
        </div>
      </div>
    );
  }
}

export default LoginPage;
