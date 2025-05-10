import React from "react";
import { Link, Navigate } from "react-router-dom";
import { Eye, EyeOff, ChevronDown } from "lucide-react";
import axios from "axios";
import "./index.css";

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
  };

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
        const response = await this.performRegistration();

        if (response.status === 201) {
          const userData = {
            name: this.state.name,
            email: this.state.email,
            role: this.state.role,
            profession: this.state.profession,
            id: response.data.id || Date.now(),
            token: response.data.token || null,
          };

          // Store user data in localStorage
          localStorage.setItem("user", JSON.stringify(userData));

          // Show success message
          alert("Registration successful! Redirecting to login page...");

          // Reset form fields
          this.setState({
            name: "",
            email: "",
            role: "",
            profession: "",
            password: "",
            confirmPassword: "",
            isSubmitting: false,
            redirectToLogin: true, // Set redirect flag instead of using window.location
          });
        }
      } catch (error) {
        console.error("Registration error:", error);
        alert(error.response?.data?.message || "Registration failed");
        this.setState({ isSubmitting: false });
      }
    }
  };

  performRegistration = async () => {
    const { name, email, role, profession, password } = this.state;

    return axios.post(
      "https://your-render-backend-url.onrender.com/api/signup",
      {
        name,
        email,
        password,
        role,
        profession,
      }
    );
  };

  render() {
    const {
      errors,
      showPassword,
      showConfirmPassword,
      isSubmitting,
      redirectToLogin,
    } = this.state;

    // Redirect to login page if registration was successful
    if (redirectToLogin) {
      return <Navigate to="/login" />;
    }

    return (
      <div className="register-screen">
        <div className="register-container">
          <h2 className="register-title">Create your account</h2>

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
                      <option value="Service Getter">Service Getter</option>
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
                {isSubmitting ? "Creating account..." : "Create account"}
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
      </div>
    );
  }
}

export default SignupPage;
