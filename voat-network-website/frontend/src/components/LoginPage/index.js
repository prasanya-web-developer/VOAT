// Updated LoginPage.js - removed test user functionality

import React from "react";
import { Link } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import axios from "axios";
import "./index.css";

// Add CSS for welcome card if not already present
const welcomeCardStyles = `
.welcome-card {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: white;
  padding: 2rem;
  border-radius: 1rem;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1);
  text-align: center;
  max-width: 90%;
  width: 400px;
  z-index: 1000;
  animation: fadeInOut 5s forwards;
  opacity: 0;
}

.welcome-card-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #2563eb;
  margin-bottom: 0.75rem;
}

.welcome-card-message {
  font-size: 1.125rem;
  color: #4b5563;
  margin-bottom: 1rem;
}

.welcome-card-emoji {
  font-size: 3rem;
  margin-bottom: 1rem;
}

@keyframes fadeInOut {
  0% {
    opacity: 0;
    transform: translate(-50%, -40%);
  }
  15% {
    opacity: 1;
    transform: translate(-50%, -50%);
  }
  85% {
    opacity: 1;
    transform: translate(-50%, -50%);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -60%);
  }
}
`;

// Inject styles once when component is imported
(function injectStyles() {
  // Check if styles are already injected
  if (!document.getElementById("welcome-card-styles")) {
    const styleElement = document.createElement("style");
    styleElement.id = "welcome-card-styles";
    styleElement.innerHTML = welcomeCardStyles;
    document.head.appendChild(styleElement);
  }
})();

class LoginPage extends React.Component {
  state = {
    email: "",
    password: "",
    showPassword: false,
    errors: {},
    isSubmitting: false,
    showWelcomeCard: false,
  };

  // Backend URLs - try both environments
  backendUrls = [
    "https://voat.onrender.com", // Production/Render
    "http://localhost:5000", // Local development
  ];

  componentDidMount() {
    // Check if NavBar has already determined the backend URL
    if (!window.backendUrl) {
      this.checkBackendAvailability();
    }
  }

  // Check which backend is available
  checkBackendAvailability = async () => {
    if (window.backendUrl) {
      console.log("Using already detected backend URL:", window.backendUrl);
      return;
    }

    let workingUrl = null;

    for (const url of this.backendUrls) {
      try {
        // Simple ping to see if this backend is responding
        const response = await fetch(`${url}/api/test-connection`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ test: true }),
          // Short timeout to fail fast
          signal: AbortSignal.timeout(2000),
        });

        if (response.ok) {
          console.log(`Backend available at: ${url}`);
          workingUrl = url;
          break;
        }
      } catch (error) {
        console.log(`Backend at ${url} not available:`, error.message);
      }
    }

    // If we found a working URL, save it
    if (workingUrl) {
      window.backendUrl = workingUrl;
      console.log("Using backend at:", workingUrl);
    } else {
      // Default to production URL if none respond
      window.backendUrl = this.backendUrls[0];
      console.log("No backend responding, defaulting to:", window.backendUrl);
    }
  };

  // Get the current backend URL
  getBackendUrl = () => {
    return window.backendUrl || this.backendUrls[0];
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
      this.setState({ isSubmitting: true, errors: {} });

      try {
        // First, notify NavBar to expect a login if available
        if (
          window.navbarComponent &&
          typeof window.navbarComponent.prepareForLogin === "function"
        ) {
          console.log("Notifying NavBar to expect login...");
          window.navbarComponent.prepareForLogin();
        }

        // Get the current backend URL
        const baseUrl = this.getBackendUrl();
        console.log("Using backend URL for login:", baseUrl);

        // Try to use the API for login with enhanced CORS configuration
        console.log("Attempting to log in with API...");
        const loginResponse = await axios.post(
          `${baseUrl}/api/login`,
          {
            email: this.state.email,
            password: this.state.password,
          },
          {
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            withCredentials: true,
          }
        );

        console.log("API login response:", loginResponse);

        // Check if the login was successful and we have user data
        if (!loginResponse.data || !loginResponse.data.user) {
          throw new Error("Login response missing user data");
        }

        const userData = loginResponse.data.user;
        console.log("Successfully logged in, user data:", userData);

        // Clear any existing user data
        localStorage.removeItem("user");

        // Wait for removal to complete
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Store the new user data
        localStorage.setItem("user", JSON.stringify(userData));

        // Try all available methods to notify NavBar
        this.notifyNavBarOfLogin(userData);

        // Show welcome card
        this.setState({ showWelcomeCard: true });

        // Hide welcome card and redirect after 5 seconds
        setTimeout(() => {
          this.setState({ showWelcomeCard: false });
          window.location.href = "/";
        }, 5000);
      } catch (error) {
        console.error("Login error:", error);

        // Extract error message from response if possible
        let errorMessage = "Login failed. Please try again.";
        if (
          error.response &&
          error.response.data &&
          error.response.data.message
        ) {
          errorMessage = error.response.data.message;
        }

        this.setState({
          isSubmitting: false,
          errors: {
            ...this.state.errors,
            general: errorMessage,
          },
        });
      } finally {
        // Reset submitting state in case redirect doesn't happen
        setTimeout(() => {
          if (this.state.isSubmitting) {
            this.setState({ isSubmitting: false });
          }
        }, 5000);
      }
    }
  };

  // Helper method to notify NavBar about login using all available methods
  notifyNavBarOfLogin = (userData) => {
    console.log("Attempting to notify NavBar using all methods");

    // Make sure userData is valid before proceeding
    if (!userData) {
      console.error("Cannot notify NavBar: userData is null or undefined");
      return;
    }

    try {
      // Method 1: Direct call to global showLoginNotification function
      if (window.showLoginNotification) {
        console.log("Using global showLoginNotification");
        window.showLoginNotification();
      }
      // Method 2: Call handleLogin on NavBar component
      else if (
        window.navbarComponent &&
        typeof window.navbarComponent.handleLogin === "function"
      ) {
        console.log("Using NavBar component handleLogin");
        // Use a try/catch in case the component method fails
        try {
          window.navbarComponent.handleLogin(userData);
        } catch (err) {
          console.error("Error calling handleLogin on NavBar component:", err);
        }
      }
      // Method 3: Manually trigger storage event
      else {
        console.log("Attempting to trigger storage event manually");
        try {
          const storageEvent = new Event("storage");
          storageEvent.key = "user";
          storageEvent.newValue = JSON.stringify(userData);
          window.dispatchEvent(storageEvent);
        } catch (error) {
          console.error("Error dispatching storage event:", error);
        }
      }

      // Method 4: Directly get NavBar to load user data
      if (
        window.navbarComponent &&
        typeof window.navbarComponent.loadUserData === "function"
      ) {
        console.log("Directly calling loadUserData on NavBar");
        setTimeout(() => {
          try {
            window.navbarComponent.loadUserData();
          } catch (err) {
            console.error(
              "Error calling loadUserData on NavBar component:",
              err
            );
          }
        }, 500);
      }
    } catch (error) {
      console.error("Error in notifyNavBarOfLogin:", error);
    }
  };

  render() {
    const { errors, showPassword, isSubmitting, showWelcomeCard } = this.state;

    return (
      <div className="login-screen">
        <div className="login-container">
          <h2 className="login-title">Sign in to your account</h2>

          {errors.general && (
            <div className="login-error-alert">{errors.general}</div>
          )}

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

        {/* Welcome Card */}
        {showWelcomeCard && (
          <div className="welcome-card">
            <div className="welcome-card-emoji">🎉</div>
            <h2 className="welcome-card-title">Welcome back!</h2>
            <p className="welcome-card-message">
              You have successfully logged in to VOAT Network.
            </p>
          </div>
        )}
      </div>
    );
  }
}

export default LoginPage;
