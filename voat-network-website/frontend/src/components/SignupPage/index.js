import React, { Component } from "react";
import { Link } from "react-router-dom";
import { Navigate } from "react-router-dom";
import { Eye, EyeOff, ChevronDown } from "lucide-react";
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

class SignupPage extends React.Component {
  state = {
    name: "",
    email: "",
    role: "",
    profession: "",
    password: "",
    confirmPassword: "",
    showPassword: false,
    showConfirmPassword: false,
    errors: {},
    isSubmitting: false,
    redirectToLogin: false,
    showWelcomeCard: false,
  };

  // Backend URL - use only production
  backendUrl = "https://voat.onrender.com";

  componentDidMount() {
    // Set production URL for backend
    window.backendUrl = this.backendUrl;
    console.log("Using production backend URL:", window.backendUrl);
  }

  handleInputChange = (e) => {
    const { name, value } = e.target;
    this.setState({ [name]: value });
  };

  togglePasswordVisibility = (field) => {
    this.setState((prevState) => ({
      [field]: !prevState[field],
    }));
  };

  validateForm = () => {
    const { name, email, role, profession, password, confirmPassword } =
      this.state;
    const errors = {};

    if (name.length < 2) {
      errors.name = "Name must be at least 2 characters";
    }

    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      errors.email = "Invalid email address";
    }

    if (!role) {
      errors.role = "Please select a role";
    }

    if (!profession) {
      errors.profession = "Please enter your profession";
    }

    if (password.length < 6) {
      errors.password = "Password must be at least 6 characters";
    }

    if (password !== confirmPassword) {
      errors.confirmPassword = "Passwords don't match";
    }

    this.setState({ errors });
    return Object.keys(errors).length === 0;
  };

  handleSubmit = async (e) => {
    e.preventDefault();

    if (this.validateForm()) {
      this.setState({ isSubmitting: true });

      try {
        // Get the production backend URL
        console.log("Using backend URL for signup:", this.backendUrl);

        // Try to use the actual API for signup
        try {
          console.log("Attempting to sign up with API...");
          const response = await axios.post(`${this.backendUrl}/api/signup`, {
            name: this.state.name,
            email: this.state.email,
            password: this.state.password,
            role: this.state.role,
            profession: this.state.profession,
          });

          console.log("API signup response:", response.data);

          if (response.data && response.data.success && response.data.user) {
            // Success! Use the API response data
            const userData = response.data.user;
            console.log(
              "Successfully signed up with API, user data:",
              userData
            );

            // Clear localStorage first to ensure we trigger storage event
            localStorage.removeItem("user");

            // Small delay to ensure removal is processed
            await new Promise((resolve) => setTimeout(resolve, 100));

            // Store user data in localStorage
            console.log("Storing user data in localStorage:", userData);
            localStorage.setItem("user", JSON.stringify(userData));

            // Show welcome message if available
            if (window.showWelcomeMessage) {
              console.log(
                "Calling global showWelcomeMessage function after signup"
              );
              window.showWelcomeMessage();
            } else if (
              window.navbarComponent &&
              typeof window.navbarComponent.showWelcomeMessage === "function"
            ) {
              console.log(
                "Calling showWelcomeMessage on navbarComponent after signup"
              );
              window.navbarComponent.showWelcomeMessage();
            } else {
              // If no welcome message function is available, trigger login notification as fallback
              if (window.showLoginNotification) {
                console.log(
                  "Calling global showLoginNotification function after signup"
                );
                window.showLoginNotification();
              } else if (
                window.navbarComponent &&
                typeof window.navbarComponent.handleLogin === "function"
              ) {
                console.log(
                  "Calling handleLogin on navbarComponent after signup"
                );
                window.navbarComponent.handleLogin(userData);
              } else {
                console.log(
                  "No notification method found - signup successful but notification may not show"
                );
              }
            }

            // Show welcome card
            this.setState({ showWelcomeCard: true });

            // Hide welcome card and redirect after 5 seconds
            setTimeout(() => {
              this.setState({
                showWelcomeCard: false,
                redirectToLogin: true,
              });
            }, 5000);
          } else {
            throw new Error("Invalid user data in response");
          }
        } catch (apiError) {
          console.error("API signup failed:", apiError);
          this.setState({
            errors: {
              ...this.state.errors,
              general: "Registration failed. Please try again.",
            },
            isSubmitting: false,
          });
        }
      } catch (error) {
        console.error("Registration error:", error);

        // Handle error states
        this.setState({
          errors: {
            ...this.state.errors,
            general: "Registration failed. Please try again.",
          },
          isSubmitting: false,
        });
      } finally {
        // Reset submitting state in case redirect doesn't happen
        setTimeout(() => {
          if (this.state.isSubmitting) {
            this.setState({ isSubmitting: false });
          }
        }, 3000);
      }
    }
  };

  render() {
    const {
      errors,
      showPassword,
      showConfirmPassword,
      isSubmitting,
      redirectToLogin,
      showWelcomeCard,
      name,
    } = this.state;

    // Redirect to login page if registration was successful
    if (redirectToLogin) {
      return <Navigate to="/login" />;
    }

    return (
      <div className="register-screen">
        <div className="register-container">
          <h2 className="register-title">Create your account</h2>

          {errors.general && (
            <div className="register-error-alert">{errors.general}</div>
          )}

          <div className="register-form-wrapper">
            <form className="register-form" onSubmit={this.handleSubmit}>
              {/* Two column layout for Name and Email */}
              <div className="register-row">
                {/* Name Input */}
                <div className="register-input-group">
                  <label htmlFor="name" className="register-label">
                    Full Name
                  </label>
                  <input
                    name="name"
                    type="text"
                    value={this.state.name}
                    onChange={this.handleInputChange}
                    className="register-input"
                    placeholder="Enter your full name"
                  />
                  {errors.name && (
                    <p className="register-input-error">{errors.name}</p>
                  )}
                </div>

                {/* Email Input */}
                <div className="register-input-group">
                  <label htmlFor="email" className="register-label">
                    Email address
                  </label>
                  <input
                    name="email"
                    type="email"
                    value={this.state.email}
                    onChange={this.handleInputChange}
                    className="register-input"
                    placeholder="Enter your email"
                  />
                  {errors.email && (
                    <p className="register-input-error">{errors.email}</p>
                  )}
                </div>
              </div>

              {/* Two column layout for Role and Profession */}
              <div className="register-row">
                {/* Role Input */}
                <div className="register-input-group">
                  <label htmlFor="role" className="register-label">
                    Role
                  </label>
                  <div className="register-select-container">
                    <select
                      name="role"
                      value={this.state.role}
                      onChange={this.handleInputChange}
                      className="register-input"
                    >
                      <option value="">Select your role</option>
                      <option value="Freelancer/Service Provider">
                        Freelancer/Service Provider
                      </option>
                      <option value="Client/Individual">
                        Client/Individual
                      </option>
                    </select>
                    <div className="register-select-icon">
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                  {errors.role && (
                    <p className="register-input-error">{errors.role}</p>
                  )}
                </div>

                {/* Profession Input */}
                <div className="register-input-group">
                  <label htmlFor="profession" className="register-label">
                    Profession
                  </label>
                  <input
                    name="profession"
                    type="text"
                    value={this.state.profession}
                    onChange={this.handleInputChange}
                    className="register-input"
                    placeholder="Enter your profession"
                  />
                  {errors.profession && (
                    <p className="register-input-error">{errors.profession}</p>
                  )}
                </div>
              </div>

              {/* Two column layout for Password fields */}
              <div className="register-row">
                {/* Password Input */}
                <div className="register-input-group">
                  <label htmlFor="password" className="register-label">
                    Password
                  </label>
                  <div className="register-password-container">
                    <input
                      name="password"
                      type={showPassword ? "text" : "password"}
                      value={this.state.password}
                      onChange={this.handleInputChange}
                      className="register-input"
                      placeholder="Create a password"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        this.togglePasswordVisibility("showPassword")
                      }
                      className="register-password-toggle"
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5 text-gray-400" />
                      ) : (
                        <Eye className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="register-input-error">{errors.password}</p>
                  )}
                </div>

                {/* Confirm Password Input */}
                <div className="register-input-group">
                  <label htmlFor="confirmPassword" className="register-label">
                    Confirm Password
                  </label>
                  <div className="register-password-container">
                    <input
                      name="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={this.state.confirmPassword}
                      onChange={this.handleInputChange}
                      className="register-input"
                      placeholder="Confirm your password"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        this.togglePasswordVisibility("showConfirmPassword")
                      }
                      className="register-password-toggle"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-5 w-5 text-gray-400" />
                      ) : (
                        <Eye className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="register-input-error">
                      {errors.confirmPassword}
                    </p>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="register-submit-button"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Creating account..." : "Register"}
              </button>
            </form>

            {/* Login Link */}
            <div className="register-divider">
              <div className="register-divider-line"></div>
              <div className="register-divider-text">
                <span className="register-divider-content">
                  Already have an account?
                </span>
              </div>
            </div>

            <Link to="/login" className="register-login-link">
              Sign in
            </Link>
          </div>
        </div>

        {/* Welcome Card */}
        {showWelcomeCard && (
          <div className="welcome-card">
            <div className="welcome-card-emoji">🚀</div>
            <h2 className="welcome-card-title">Thank You for Registering!</h2>
            <p className="welcome-card-message">
              Welcome to VOAT Network, {name}!
            </p>
          </div>
        )}
      </div>
    );
  }
}

export default SignupPage;
