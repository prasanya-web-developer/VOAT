import React, { Component } from "react";
// import { Navigate } from "react-router-dom";
import NavBar from "../Navbar";
import Footer from "../Footer";
import "./index.css";

class AdminPanel extends Component {
  state = {
    isAuthenticated: false,
    email: "",
    password: "",
    loginError: "",
    portfolioSubmissions: [],
    viewingSubmission: null,
    isLoading: true,
    baseUrl: "https://voat.onrender.com",
  };

  componentDidMount() {
    this.checkAuthentication();
    if (this.state.isAuthenticated) {
      this.fetchPortfolioSubmissions();
    }
  }

  checkAuthentication = () => {
    const adminData = localStorage.getItem("adminData");
    if (adminData) {
      this.setState({ isAuthenticated: true, isLoading: false }, () => {
        this.fetchPortfolioSubmissions();
      });
    } else {
      this.setState({ isLoading: false });
    }
  };

  handleInputChange = (e) => {
    this.setState({ [e.target.name]: e.target.value });
  };

  handleLogin = (e) => {
    e.preventDefault();
    const { email, password } = this.state;

    // Check against hardcoded admin credentials
    if (email === "prasanya.webdev@gmail.com" && password === "Pradeep@0902") {
      const adminData = { email };
      localStorage.setItem("adminData", JSON.stringify(adminData));
      this.setState(
        {
          isAuthenticated: true,
          loginError: "",
          email: "",
          password: "",
        },
        () => {
          this.fetchPortfolioSubmissions();
        }
      );
    } else {
      this.setState({ loginError: "Invalid email or password" });
    }
  };

  handleLogout = () => {
    localStorage.removeItem("adminData");
    this.setState({ isAuthenticated: false });
  };

  fetchPortfolioSubmissions = async () => {
    try {
      this.setState({ isLoading: true });
      const response = await fetch(
        `${this.state.baseUrl}/api/admin/portfolio-submissions`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Fetched submissions:", data); // Debug log

      // Apply deduplication before setting state
      const uniqueSubmissions = this.removeDuplicateSubmissions(data);

      this.setState({
        portfolioSubmissions: uniqueSubmissions,
        isLoading: false,
      });
    } catch (error) {
      console.error("Error fetching portfolio submissions:", error);
      this.setState({ isLoading: false });

      // Fallback to mock data if API fails
      const mockSubmissions = [
        // your mock data here...
      ];

      // Apply deduplication to mock data too
      const uniqueMockSubmissions =
        this.removeDuplicateSubmissions(mockSubmissions);

      this.setState({
        portfolioSubmissions: uniqueMockSubmissions,
        isLoading: false,
      });
    }
  };

  handleViewSubmission = async (submission) => {
    console.log("View submission clicked for:", submission);

    try {
      // Get full submission details from server to ensure we have complete data
      // This is important because the submission in the list might not include all service details
      const response = await fetch(
        `${this.state.baseUrl}/api/admin/portfolio-submission/${
          submission._id || submission.id
        }`
      );

      if (response.ok) {
        const detailedSubmission = await response.json();
        console.log("Detailed submission data:", detailedSubmission);
        this.setState({ viewingSubmission: detailedSubmission });
      } else {
        // Fallback to using the original submission object if API fails
        console.warn(
          "Failed to fetch detailed submission, using original data"
        );
        this.setState({ viewingSubmission: submission });
      }
    } catch (error) {
      console.error("Error fetching detailed submission:", error);
      // Use the original submission as fallback
      this.setState({ viewingSubmission: submission });
    }
  };

  handleCloseSubmissionView = () => {
    this.setState({ viewingSubmission: null });
  };

  handleStatusChange = async (submissionId, newStatus) => {
    try {
      this.setState({ isLoading: true });

      // Send request to update status in the database
      const response = await fetch(
        `${this.state.baseUrl}/api/admin/portfolio-submissions/${submissionId}/status`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      if (!response.ok) throw new Error("Failed to update status");
      const updatedSubmission = await response.json();

      // Update local state with the response from the database
      const updatedSubmissions = this.state.portfolioSubmissions.map((sub) =>
        sub._id === submissionId || sub.id === submissionId
          ? { ...updatedSubmission }
          : sub
      );

      this.setState({
        portfolioSubmissions: updatedSubmissions,
        viewingSubmission: updatedSubmission,
        isLoading: false,
      });

      alert(
        `Submission ${
          newStatus === "approved" ? "approved" : "rejected"
        } successfully!`
      );
    } catch (error) {
      console.error("Error updating submission status:", error);
      this.setState({ isLoading: false });
      alert("Failed to update submission status. Please try again.");

      // Fallback for demo/testing - update state directly
      const updatedSubmissions = this.state.portfolioSubmissions.map((sub) =>
        sub._id === submissionId || sub.id === submissionId
          ? { ...sub, status: newStatus }
          : sub
      );

      const updatedSubmission = updatedSubmissions.find(
        (sub) => sub._id === submissionId || sub.id === submissionId
      );

      this.setState({
        portfolioSubmissions: updatedSubmissions,
        viewingSubmission: updatedSubmission,
      });
    }
  };

  renderLoginForm() {
    return (
      <div className="admin-login-container">
        <div className="admin-login-card">
          <h2>Admin Login</h2>
          {this.state.loginError && (
            <div className="login-error">{this.state.loginError}</div>
          )}
          <form onSubmit={this.handleLogin}>
            <div className="form-group">
              <label htmlFor="email">Email:</label>
              <input
                type="email"
                id="email"
                name="email"
                value={this.state.email}
                onChange={this.handleInputChange}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="password">Password:</label>
              <input
                type="password"
                id="password"
                name="password"
                value={this.state.password}
                onChange={this.handleInputChange}
                required
              />
            </div>
            <button type="submit" className="login-button">
              Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  renderSubmissionsList() {
    const { portfolioSubmissions, isLoading } = this.state;

    if (isLoading) {
      return <div className="loading">Loading submissions...</div>;
    }

    if (!portfolioSubmissions || portfolioSubmissions.length === 0) {
      return (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <h3>No Portfolio Submissions</h3>
          <p>There are no portfolio submissions to review at this time.</p>
        </div>
      );
    }

    return (
      <div className="submissions-list">
        <table className="submissions-table">
          <thead>
            <tr>
              <th>NAME</th>
              <th>PROFESSION</th>
              <th>EXPERIENCE</th>
              <th>SUBMITTED</th>
              <th>STATUS</th>
              <th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {portfolioSubmissions.map((submission) => {
              // Fix profile image path
              let profileImageSrc = submission.profileImage;
              if (
                profileImageSrc &&
                !profileImageSrc.startsWith("http") &&
                !profileImageSrc.startsWith("/api/placeholder")
              ) {
                profileImageSrc = `${this.state.baseUrl}${profileImageSrc}`;
              }

              return (
                <tr key={submission._id || submission.id}>
                  <td className="name-cell">
                    <div className="profile-image-small">
                      {profileImageSrc ? (
                        <img
                          src={profileImageSrc}
                          alt={submission.name}
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = "/api/placeholder/32/32";
                          }}
                        />
                      ) : (
                        <div className="initials">
                          {submission.name
                            ? submission.name.charAt(0).toUpperCase()
                            : "?"}
                        </div>
                      )}
                    </div>
                    <span>{submission.name}</span>
                  </td>
                  <td>{submission.profession || "Not specified"}</td>
                  <td>
                    {submission.workExperience
                      ? `${submission.workExperience} years`
                      : "N/A"}
                  </td>
                  <td>
                    {submission.submittedDate
                      ? new Date(submission.submittedDate).toLocaleDateString()
                      : "Unknown"}
                  </td>
                  <td>
                    <span
                      className={`status-badge ${
                        submission.status || "pending"
                      }`}
                    >
                      {submission.status
                        ? submission.status.charAt(0).toUpperCase() +
                          submission.status.slice(1)
                        : "Pending"}
                    </span>
                  </td>
                  <td>
                    <button
                      className="view-button"
                      onClick={() => this.handleViewSubmission(submission)}
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  renderSubmissionDetails() {
    const { viewingSubmission } = this.state;
    if (!viewingSubmission) return null;

    console.log("Viewing submission details:", viewingSubmission);

    // Ensure correct path for profile image
    let profileImageSrc = viewingSubmission.profileImage;
    if (
      profileImageSrc &&
      !profileImageSrc.startsWith("http") &&
      !profileImageSrc.startsWith("/api/placeholder")
    ) {
      profileImageSrc = `${this.state.baseUrl}${profileImageSrc}`;
    }

    // Extract services data - handle different possible formats
    let services = [];
    if (viewingSubmission.services) {
      try {
        if (typeof viewingSubmission.services === "string") {
          // If services is a JSON string, parse it
          services = JSON.parse(viewingSubmission.services);
        } else if (Array.isArray(viewingSubmission.services)) {
          // If services is already an array, use it directly
          services = viewingSubmission.services;
        }
      } catch (err) {
        console.error("Error parsing services:", err);
      }
    }

    // Log extracted services for debugging
    console.log("Extracted services:", services);

    return (
      <div className="submission-details-overlay">
        <div className="submission-details-container">
          <button
            className="close-button"
            onClick={this.handleCloseSubmissionView}
          >
            &times;
          </button>

          <h2>Portfolio Submission Details</h2>

          <div className="submission-header">
            <div className="submission-profile-image">
              {profileImageSrc ? (
                <img
                  src={profileImageSrc}
                  alt={viewingSubmission.name}
                  onError={(e) => {
                    console.error(
                      "Profile image failed to load:",
                      profileImageSrc
                    );
                    e.target.onerror = null;
                    e.target.src = "/api/placeholder/100/100";
                  }}
                />
              ) : (
                <div className="profile-placeholder">
                  {viewingSubmission.name
                    ? viewingSubmission.name.charAt(0).toUpperCase()
                    : "?"}
                </div>
              )}
            </div>
            <div className="submission-title">
              <h3>{viewingSubmission.name || "Unnamed"}</h3>
              <p className="profession">
                {viewingSubmission.profession || "No profession specified"}
              </p>
              <p className="status">
                Status:{" "}
                <span
                  className={`status-badge ${
                    viewingSubmission.status || "pending"
                  }`}
                >
                  {viewingSubmission.status
                    ? viewingSubmission.status.charAt(0).toUpperCase() +
                      viewingSubmission.status.slice(1)
                    : "Pending"}
                </span>
              </p>
            </div>
          </div>

          <div className="submission-body">
            <div className="info-row">
              <span className="label">Email:</span>
              <span className="value">
                {viewingSubmission.email || "No email provided"}
              </span>
            </div>

            <div className="info-row">
              <span className="label">Experience:</span>
              <span className="value">
                {viewingSubmission.workExperience
                  ? `${viewingSubmission.workExperience} years`
                  : "Not specified"}
              </span>
            </div>

            {viewingSubmission.portfolioLink && (
              <div className="info-row">
                <span className="label">Portfolio Link:</span>
                <a
                  href={viewingSubmission.portfolioLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="value link"
                >
                  {viewingSubmission.portfolioLink}
                </a>
              </div>
            )}

            <div className="info-row">
              <span className="label">Submitted:</span>
              <span className="value">
                {viewingSubmission.submittedDate
                  ? new Date(
                      viewingSubmission.submittedDate
                    ).toLocaleDateString()
                  : "Unknown date"}
              </span>
            </div>

            {/* About Section */}
            {viewingSubmission.about && (
              <div className="info-section">
                <h4>About</h4>
                <p className="about-text">{viewingSubmission.about}</p>
              </div>
            )}

            {/* Services Section - Improved to handle all possible formats */}
            <div className="info-section">
              <h4>Services</h4>
              {services && services.length > 0 ? (
                services.map((service, index) => (
                  <div key={index} className="service-card">
                    <h5>{service.name || "Unnamed Service"}</h5>
                    <p>{service.description || "No description provided"}</p>

                    {service.pricing && service.pricing.length > 0 && (
                      <div className="pricing-table">
                        <h6>Pricing Options</h6>
                        <table>
                          <thead>
                            <tr>
                              <th>Package</th>
                              <th>Price</th>
                              <th>Time Frame</th>
                            </tr>
                          </thead>
                          <tbody>
                            {service.pricing.map((price, idx) => (
                              <tr key={idx}>
                                <td>{price.level || "Package " + (idx + 1)}</td>
                                <td>${price.price || "N/A"}</td>
                                <td>{price.timeFrame || "N/A"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="no-services">
                  No services have been added by this freelancer.
                </p>
              )}
            </div>
          </div>

          <div className="submission-actions">
            {viewingSubmission.status === "pending" && (
              <>
                <button
                  className="approve-button"
                  onClick={() =>
                    this.handleStatusChange(
                      viewingSubmission._id || viewingSubmission.id,
                      "approved"
                    )
                  }
                >
                  Approve Submission
                </button>
                <button
                  className="reject-button"
                  onClick={() =>
                    this.handleStatusChange(
                      viewingSubmission._id || viewingSubmission.id,
                      "rejected"
                    )
                  }
                >
                  Reject Submission
                </button>
              </>
            )}
            {viewingSubmission.status !== "pending" && (
              <p className="status-message">
                This submission has been {viewingSubmission.status}.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  removeDuplicateSubmissions = (submissions) => {
    const uniqueSubmissions = new Map();

    // Sort by submission date first (newest first)
    const sortedSubmissions = [...submissions].sort((a, b) => {
      if (a.submittedDate && b.submittedDate) {
        return new Date(b.submittedDate) - new Date(a.submittedDate);
      }
      return (b.id || 0) - (a.id || 0);
    });

    // Use email as the unique identifier (most reliable)
    return sortedSubmissions.filter((submission) => {
      const uniqueKey = submission.email;

      if (!uniqueKey) return false;

      if (!uniqueSubmissions.has(uniqueKey)) {
        uniqueSubmissions.set(uniqueKey, submission);
        return true;
      }

      return false;
    });
  };

  renderAdminDashboard() {
    const { viewingSubmission } = this.state;

    return (
      <div className="admin-dashboard">
        <header className="admin-header">
          <h1>Admin Dashboard</h1>
          <button className="logout-button" onClick={this.handleLogout}>
            Logout
          </button>
        </header>

        <div className="admin-content">
          <div className="section-header">
            <h2>Portfolio Submissions</h2>
            <p className="section-description">
              Review and approve freelancer portfolio submissions
            </p>
          </div>
          {this.renderSubmissionsList()}
          {viewingSubmission && this.renderSubmissionDetails()}
        </div>
      </div>
    );
  }

  render() {
    const { isAuthenticated, isLoading } = this.state;

    if (isLoading) {
      return <div className="loading">Loading...</div>;
    }

    return (
      <>
        <NavBar />
        <div className="admin-panel">
          {isAuthenticated
            ? this.renderAdminDashboard()
            : this.renderLoginForm()}
        </div>
        <Footer />
      </>
    );
  }
}

export default AdminPanel;
