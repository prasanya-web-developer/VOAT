import React, { Component } from "react";
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

    searchTerm: "",
    statusFilter: "all",
    sortBy: "newest",
    currentPage: 1,
    itemsPerPage: 10,
  };

  componentDidMount() {
    this.checkAuthentication();
    if (this.state.isAuthenticated) {
      this.fetchPortfolioSubmissions();
    }
  }

  // Helper function to generate proper initials
  getInitials = (name) => {
    if (!name) return "?";

    const nameParts = name.trim().split(/\s+/);
    if (nameParts.length === 1) {
      return nameParts[0].charAt(0).toUpperCase();
    } else {
      return (
        nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)
      ).toUpperCase();
    }
  };

  // Helper function to get profile image source
  getProfileImageSrc = (profileImage) => {
    console.log("Processing profile image:", profileImage);

    if (!profileImage) {
      console.log("No profile image provided");
      return null;
    }

    if (
      profileImage.startsWith("http") ||
      profileImage.startsWith("/api/placeholder")
    ) {
      console.log("Using direct URL:", profileImage);
      return profileImage;
    }

    const constructedUrl = `${this.state.baseUrl}${profileImage}`;
    console.log("Constructed URL:", constructedUrl);
    return constructedUrl;
  };

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
      console.log("Fetched submissions:", data);

      const uniqueSubmissions = this.removeDuplicateSubmissions(data);

      this.setState({
        portfolioSubmissions: uniqueSubmissions,
        isLoading: false,
      });
    } catch (error) {
      console.error("Error fetching portfolio submissions:", error);
      this.setState({ isLoading: false });

      // Using dummy data for design purposes
      const mockSubmissions = [
        {
          _id: "1",
          name: "Sarah Johnson",
          email: "sarah.johnson@email.com",
          profession: "UI/UX Designer",
          workExperience: "5",
          status: "pending",
          submittedDate: "2024-03-15T10:30:00Z",
          about:
            "Passionate UI/UX designer with 5 years of experience creating user-centered digital experiences.",
          headline: "Creating intuitive digital experiences",
          portfolioLink: "https://sarahjohnson.design",
          services: [
            {
              name: "UI Design",
              description: "Modern and intuitive user interface design",
              pricing: [
                { level: "Basic", price: "500", timeFrame: "3 days" },
                { level: "Premium", price: "1200", timeFrame: "7 days" },
              ],
            },
          ],
        },
        {
          _id: "2",
          name: "Michael Chen",
          email: "michael.chen@email.com",
          profession: "Full Stack Developer",
          workExperience: "7",
          status: "approved",
          submittedDate: "2024-03-14T14:20:00Z",
          about:
            "Full-stack developer specializing in React, Node.js, and cloud technologies.",
          headline: "Building scalable web solutions",
          portfolioLink: "https://michaelchen.dev",
          services: [
            {
              name: "Web Development",
              description: "Full-stack web application development",
              pricing: [
                { level: "Basic", price: "800", timeFrame: "5 days" },
                { level: "Premium", price: "2000", timeFrame: "14 days" },
              ],
            },
          ],
        },
        {
          _id: "3",
          name: "Emily Rodriguez",
          email: "emily.rodriguez@email.com",
          profession: "Digital Marketer",
          workExperience: "4",
          status: "rejected",
          submittedDate: "2024-03-13T09:15:00Z",
          about:
            "Digital marketing specialist focused on growth hacking and conversion optimization.",
          headline: "Driving growth through data-driven marketing",
          portfolioLink: "https://emilyrodriguez.marketing",
          services: [
            {
              name: "SEO Optimization",
              description: "Complete SEO audit and optimization",
              pricing: [
                { level: "Basic", price: "300", timeFrame: "2 days" },
                { level: "Premium", price: "800", timeFrame: "7 days" },
              ],
            },
          ],
        },
        {
          _id: "4",
          name: "David Kumar",
          email: "david.kumar@email.com",
          profession: "Mobile App Developer",
          workExperience: "6",
          status: "pending",
          submittedDate: "2024-03-12T16:45:00Z",
          about:
            "Mobile app developer with expertise in React Native and Flutter.",
          headline: "Building next-gen mobile experiences",
          portfolioLink: "https://davidkumar.app",
          services: [
            {
              name: "Mobile App Development",
              description: "Cross-platform mobile application development",
              pricing: [
                { level: "Basic", price: "1500", timeFrame: "14 days" },
                { level: "Premium", price: "3500", timeFrame: "30 days" },
              ],
            },
          ],
        },
      ];

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
        console.warn(
          "Failed to fetch detailed submission, using original data"
        );
        this.setState({ viewingSubmission: submission });
      }
    } catch (error) {
      console.error("Error fetching detailed submission:", error);
      this.setState({ viewingSubmission: submission });
    }
  };

  handleCloseSubmissionView = () => {
    this.setState({ viewingSubmission: null });
  };

  handleStatusChange = async (submissionId, newStatus) => {
    try {
      this.setState({ isLoading: true });

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

  // filter and search methods
  handleSearchChange = (e) => {
    this.setState({ searchTerm: e.target.value, currentPage: 1 });
  };

  handleStatusFilter = (status) => {
    this.setState({ statusFilter: status, currentPage: 1 });
  };

  handleSortChange = (sortBy) => {
    this.setState({ sortBy, currentPage: 1 });
  };

  getFilteredSubmissions = () => {
    const { portfolioSubmissions, searchTerm, statusFilter, sortBy } =
      this.state;

    let filtered = portfolioSubmissions.filter((submission) => {
      const matchesSearch =
        submission.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        submission.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        submission.profession
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        submission.headline.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || submission.status === statusFilter;

      return matchesSearch && matchesStatus;
    });

    // Sort submissions
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.submittedDate) - new Date(a.submittedDate);
        case "oldest":
          return new Date(a.submittedDate) - new Date(b.submittedDate);
        case "name":
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    return filtered;
  };

  getStats = () => {
    const { portfolioSubmissions } = this.state;
    return {
      total: portfolioSubmissions.length,
      pending: portfolioSubmissions.filter(
        (sub) => sub.status === "pending" || !sub.status
      ).length,
      approved: portfolioSubmissions.filter((sub) => sub.status === "approved")
        .length,
      rejected: portfolioSubmissions.filter((sub) => sub.status === "rejected")
        .length,
    };
  };

  renderLoginForm() {
    return (
      <div className="adminpanel-login-wrapper">
        <div className="adminpanel-login-container">
          <div className="adminpanel-login-card">
            <div className="adminpanel-login-header">
              <div className="adminpanel-brand-logo">
                <div className="adminpanel-logo-icon">
                  <i className="fas fa-shield-alt"></i>
                </div>
                <div className="adminpanel-brand-text">
                  <h1>VOAT Admin</h1>
                  <p>Secure Portal Access</p>
                </div>
              </div>
            </div>

            {this.state.loginError && (
              <div className="adminpanel-error-alert">
                <i className="fas fa-exclamation-circle"></i>
                <span>{this.state.loginError}</span>
              </div>
            )}

            <form onSubmit={this.handleLogin} className="adminpanel-login-form">
              <div className="adminpanel-input-group">
                <div className="adminpanel-input-wrapper">
                  <i className="fas fa-envelope adminpanel-input-icon"></i>
                  <input
                    type="email"
                    name="email"
                    value={this.state.email}
                    onChange={this.handleInputChange}
                    placeholder="Enter your email address"
                    className="adminpanel-input"
                    required
                  />
                </div>
              </div>

              <div className="adminpanel-input-group">
                <div className="adminpanel-input-wrapper">
                  <i className="fas fa-lock adminpanel-input-icon"></i>
                  <input
                    type="password"
                    name="password"
                    value={this.state.password}
                    onChange={this.handleInputChange}
                    placeholder="Enter your password"
                    className="adminpanel-input"
                    required
                  />
                </div>
              </div>

              <button type="submit" className="adminpanel-login-btn">
                <span>Sign In</span>
                <i className="fas fa-arrow-right"></i>
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  renderDashboardStats() {
    const stats = this.getStats();

    return (
      <div className="adminpanel-stats-grid">
        <div className="adminpanel-stat-card adminpanel-stat-total">
          <div className="adminpanel-stat-content">
            <div className="adminpanel-stat-number">{stats.total}</div>
            <div className="adminpanel-stat-label">Total Submissions</div>
          </div>
          <div className="adminpanel-stat-icon">
            <i className="fas fa-users"></i>
          </div>
        </div>

        <div className="adminpanel-stat-card adminpanel-stat-pending">
          <div className="adminpanel-stat-content">
            <div className="adminpanel-stat-number">{stats.pending}</div>
            <div className="adminpanel-stat-label">Pending Review</div>
          </div>
          <div className="adminpanel-stat-icon">
            <i className="fas fa-clock"></i>
          </div>
        </div>

        <div className="adminpanel-stat-card adminpanel-stat-approved">
          <div className="adminpanel-stat-content">
            <div className="adminpanel-stat-number">{stats.approved}</div>
            <div className="adminpanel-stat-label">Approved</div>
          </div>
          <div className="adminpanel-stat-icon">
            <i className="fas fa-check-circle"></i>
          </div>
        </div>

        <div className="adminpanel-stat-card adminpanel-stat-rejected">
          <div className="adminpanel-stat-content">
            <div className="adminpanel-stat-number">{stats.rejected}</div>
            <div className="adminpanel-stat-label">Rejected</div>
          </div>
          <div className="adminpanel-stat-icon">
            <i className="fas fa-times-circle"></i>
          </div>
        </div>
      </div>
    );
  }

  renderControlsSection() {
    const { searchTerm, statusFilter, sortBy } = this.state;

    return (
      <div className="adminpanel-controls-panel">
        <div className="adminpanel-search-section">
          <div className="adminpanel-search-bar">
            <i className="fas fa-search adminpanel-search-icon"></i>
            <input
              type="text"
              placeholder="Search by name, email, or profession..."
              value={searchTerm}
              onChange={this.handleSearchChange}
              className="adminpanel-search-input"
            />
          </div>
        </div>

        <div className="adminpanel-filter-section">
          <div className="adminpanel-filter-group">
            <span className="adminpanel-filter-label">Status:</span>
            <div className="adminpanel-filter-tabs">
              <button
                className={`adminpanel-filter-tab ${
                  statusFilter === "all" ? "adminpanel-active" : ""
                }`}
                onClick={() => this.handleStatusFilter("all")}
              >
                All
              </button>
              <button
                className={`adminpanel-filter-tab ${
                  statusFilter === "pending" ? "adminpanel-active" : ""
                }`}
                onClick={() => this.handleStatusFilter("pending")}
              >
                Pending
              </button>
              <button
                className={`adminpanel-filter-tab ${
                  statusFilter === "approved" ? "adminpanel-active" : ""
                }`}
                onClick={() => this.handleStatusFilter("approved")}
              >
                Approved
              </button>
              <button
                className={`adminpanel-filter-tab ${
                  statusFilter === "rejected" ? "adminpanel-active" : ""
                }`}
                onClick={() => this.handleStatusFilter("rejected")}
              >
                Rejected
              </button>
            </div>
          </div>

          <div className="adminpanel-sort-section">
            <span className="adminpanel-sort-label">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => this.handleSortChange(e.target.value)}
              className="adminpanel-sort-select"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="name">Name A-Z</option>
            </select>
          </div>
        </div>
      </div>
    );
  }

  renderSubmissionsList() {
    const { isLoading } = this.state;
    const filteredSubmissions = this.getFilteredSubmissions();

    //  debug log
    console.log(
      "Filtered submissions with profile images:",
      filteredSubmissions.map((sub) => ({
        name: sub.name,
        profileImage: sub.profileImage,
        processedSrc: this.getProfileImageSrc(sub.profileImage),
      }))
    );

    if (isLoading) {
      return (
        <div className="adminpanel-loading-state">
          <div className="adminpanel-spinner"></div>
          <p>Loading submissions...</p>
        </div>
      );
    }

    if (!filteredSubmissions || filteredSubmissions.length === 0) {
      return (
        <div className="adminpanel-empty-state">
          <div className="adminpanel-empty-icon">
            <i className="fas fa-inbox"></i>
          </div>
          <h3>No Submissions Found</h3>
          <p>
            There are no portfolio submissions matching your current filters.
          </p>
        </div>
      );
    }

    return (
      <div className="adminpanel-submissions-grid">
        {filteredSubmissions.map((submission) => {
          let profileImageSrc = submission.profileImage;
          if (
            profileImageSrc &&
            !profileImageSrc.startsWith("http") &&
            !profileImageSrc.startsWith("/api/placeholder")
          ) {
            profileImageSrc = `${this.state.baseUrl}${profileImageSrc}`;
          }

          return (
            <div
              key={submission._id || submission.id}
              className="adminpanel-submission-card"
            >
              <div className="adminpanel-card-header">
                <div className="adminpanel-profile-section">
                  <div className="adminpanel-avatar">
                    {profileImageSrc ? (
                      <img
                        src={profileImageSrc}
                        alt={submission.name}
                        onError={(e) => {
                          console.log("Image failed to load:", e.target.src);
                          e.target.onerror = null;
                          e.target.style.display = "none";
                          e.target.nextSibling.style.display = "flex";
                        }}
                        onLoad={(e) => {
                          console.log(
                            "Image loaded successfully:",
                            e.target.src
                          );
                        }}
                      />
                    ) : null}
                    <div
                      className="adminpanel-avatar-initials"
                      style={{ display: profileImageSrc ? "none" : "flex" }}
                    >
                      {this.getInitials(submission.name)}
                    </div>
                  </div>
                  <div className="adminpanel-profile-info">
                    <h3 className="adminpanel-profile-name">
                      {submission.name}
                    </h3>
                    <p className="adminpanel-profile-profession">
                      {submission.profession || "Not specified"}
                    </p>
                    <div className="adminpanel-profile-meta">
                      <span className="adminpanel-experience">
                        <i className="fas fa-briefcase"></i>
                        {submission.workExperience
                          ? `${submission.workExperience} years`
                          : "N/A"}
                      </span>
                    </div>
                  </div>
                </div>
                <div
                  className={`adminpanel-status-badge adminpanel-status-${
                    submission.status || "pending"
                  }`}
                >
                  {submission.status
                    ? submission.status.charAt(0).toUpperCase() +
                      submission.status.slice(1)
                    : "Pending"}
                </div>
              </div>

              <div className="adminpanel-card-body">
                <div className="adminpanel-submission-info">
                  <div className="adminpanel-info-item">
                    <i className="fas fa-envelope"></i>
                    <span>{submission.email}</span>
                  </div>
                  <div className="adminpanel-info-item">
                    <i className="fas fa-calendar"></i>
                    <span>
                      {submission.submittedDate
                        ? new Date(
                            submission.submittedDate
                          ).toLocaleDateString()
                        : "Unknown"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="adminpanel-card-footer">
                <button
                  className="adminpanel-view-btn"
                  onClick={() => this.handleViewSubmission(submission)}
                >
                  <i className="fas fa-eye"></i>
                  View Details
                </button>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  renderSubmissionDetails() {
    const { viewingSubmission } = this.state;
    if (!viewingSubmission) return null;

    const profileImageSrc = this.getProfileImageSrc(
      viewingSubmission.profileImage
    );
    const initials = this.getInitials(viewingSubmission.name);

    let services = [];
    if (viewingSubmission.services) {
      try {
        if (typeof viewingSubmission.services === "string") {
          services = JSON.parse(viewingSubmission.services);
        } else if (Array.isArray(viewingSubmission.services)) {
          services = viewingSubmission.services;

          const uniqueServices = new Map();
          services.forEach((service) => {
            if (service.name && !uniqueServices.has(service.name)) {
              uniqueServices.set(service.name, service);
            }
          });

          services = Array.from(uniqueServices.values());
        }
      } catch (err) {
        console.error("Error parsing services:", err);
      }
    }

    return (
      <div className="adminpanel-modal-overlay">
        <div className="adminpanel-modal-container">
          <div className="adminpanel-modal-header">
            <h2>Portfolio Submission Details</h2>
            <button
              className="adminpanel-modal-close"
              onClick={this.handleCloseSubmissionView}
            >
              <i className="fas fa-times"></i>
            </button>
          </div>

          <div className="adminpanel-modal-content">
            <div className="adminpanel-profile-header">
              <div className="adminpanel-large-avatar">
                {profileImageSrc ? (
                  <img
                    src={profileImageSrc}
                    alt={viewingSubmission.name}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.style.display = "none";
                      e.target.nextSibling.style.display = "flex";
                    }}
                  />
                ) : null}
                <div
                  className="adminpanel-large-avatar-initials"
                  style={{ display: profileImageSrc ? "none" : "flex" }}
                >
                  {this.getInitials(viewingSubmission.name)}
                </div>
              </div>

              <div className="adminpanel-profile-details">
                <h1>{viewingSubmission.name || "Unnamed"}</h1>
                <p className="adminpanel-profession">
                  {viewingSubmission.profession || "No profession specified"}
                </p>
                <p className="adminpanel-headline">
                  {viewingSubmission.headline || "No headline specified"}
                </p>
                <div
                  className={`adminpanel-status-indicator adminpanel-status-${
                    viewingSubmission.status || "pending"
                  }`}
                >
                  <i className="fas fa-circle"></i>
                  Status:{" "}
                  {viewingSubmission.status
                    ? viewingSubmission.status.charAt(0).toUpperCase() +
                      viewingSubmission.status.slice(1)
                    : "Pending"}
                </div>
              </div>
            </div>

            <div className="adminpanel-details-grid">
              <div className="adminpanel-detail-card">
                <div className="adminpanel-detail-label">
                  <i className="fas fa-envelope"></i>
                  Email Address
                </div>
                <div className="adminpanel-detail-value">
                  {viewingSubmission.email || "No email provided"}
                </div>
              </div>

              <div className="adminpanel-detail-card">
                <div className="adminpanel-detail-label">
                  <i className="fas fa-briefcase"></i>
                  Work Experience
                </div>
                <div className="adminpanel-detail-value">
                  {viewingSubmission.workExperience
                    ? `${viewingSubmission.workExperience} years`
                    : "Not specified"}
                </div>
              </div>

              {viewingSubmission.portfolioLink && (
                <div className="adminpanel-detail-card">
                  <div className="adminpanel-detail-label">
                    <i className="fas fa-link"></i>
                    Portfolio Link
                  </div>
                  <div className="adminpanel-detail-value">
                    <a
                      href={viewingSubmission.portfolioLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="adminpanel-portfolio-link"
                    >
                      {viewingSubmission.portfolioLink}
                    </a>
                  </div>
                </div>
              )}

              <div className="adminpanel-detail-card">
                <div className="adminpanel-detail-label">
                  <i className="fas fa-calendar"></i>
                  Submission Date
                </div>
                <div className="adminpanel-detail-value">
                  {viewingSubmission.submittedDate
                    ? new Date(
                        viewingSubmission.submittedDate
                      ).toLocaleDateString()
                    : "Unknown date"}
                </div>
              </div>
            </div>

            {viewingSubmission.about && (
              <div className="adminpanel-about-section">
                <h3>
                  <i className="fas fa-user"></i>
                  About
                </h3>
                <p>{viewingSubmission.about}</p>
              </div>
            )}

            <div className="adminpanel-services-section">
              <h3>
                <i className="fas fa-cogs"></i>
                Services Offered
              </h3>
              {services && services.length > 0 ? (
                <div className="adminpanel-services-grid">
                  {services.map((service, index) => (
                    <div key={index} className="adminpanel-service-card">
                      <h4>{service.name || "Unnamed Service"}</h4>
                      <p>{service.description || "No description provided"}</p>

                      {service.pricing && service.pricing.length > 0 && (
                        <div className="adminpanel-pricing-section">
                          <h5>Pricing Options</h5>
                          <div className="adminpanel-pricing-grid">
                            {service.pricing.map((price, idx) => (
                              <div
                                key={idx}
                                className="adminpanel-pricing-card"
                              >
                                <div className="adminpanel-package-name">
                                  {price.level || `Package ${idx + 1}`}
                                </div>
                                <div className="adminpanel-package-price">
                                  ${price.price || "N/A"}
                                </div>
                                <div className="adminpanel-package-time">
                                  {price.timeFrame || "N/A"}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="adminpanel-no-services">
                  <i className="fas fa-info-circle"></i>
                  <p>No services have been added by this freelancer.</p>
                </div>
              )}
            </div>

            <div className="adminpanel-modal-actions">
              {viewingSubmission.status === "pending" && (
                <>
                  <button
                    className="adminpanel-approve-btn"
                    onClick={() =>
                      this.handleStatusChange(
                        viewingSubmission._id || viewingSubmission.id,
                        "approved"
                      )
                    }
                  >
                    <i className="fas fa-check"></i>
                    Approve
                  </button>
                  <button
                    className="adminpanel-reject-btn"
                    onClick={() =>
                      this.handleStatusChange(
                        viewingSubmission._id || viewingSubmission.id,
                        "rejected"
                      )
                    }
                  >
                    <i className="fas fa-times"></i>
                    Reject
                  </button>
                </>
              )}
              {viewingSubmission.status !== "pending" && (
                <div className="adminpanel-status-message">
                  <i className="fas fa-info-circle"></i>
                  This submission has been {viewingSubmission.status}.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  removeDuplicateSubmissions = (submissions) => {
    const uniqueSubmissions = new Map();

    const sortedSubmissions = [...submissions].sort((a, b) => {
      if (a.submittedDate && b.submittedDate) {
        return new Date(b.submittedDate) - new Date(a.submittedDate);
      }
      return (b.id || 0) - (a.id || 0);
    });

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
      <div className="adminpanel-dashboard">
        <div className="adminpanel-header">
          <div className="adminpanel-header-content">
            <div className="adminpanel-brand-section">
              <div className="adminpanel-logo">
                <i className="fas fa-shield-alt"></i>
              </div>
              <div className="adminpanel-title-section">
                <h1>VOAT Admin Dashboard</h1>
                <p>Manage portfolio submissions and freelancer applications</p>
              </div>
            </div>

            <div className="adminpanel-header-actions">
              <div className="adminpanel-admin-info">
                <div className="adminpanel-admin-avatar">
                  <i className="fas fa-user-shield"></i>
                </div>
                <div className="adminpanel-admin-details">
                  <span className="adminpanel-admin-name">Administrator</span>
                  <span className="adminpanel-admin-role">Super Admin</span>
                </div>
              </div>

              <button
                className="adminpanel-logout-btn"
                onClick={this.handleLogout}
              >
                <i className="fas fa-sign-out-alt"></i>
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>

        <div className="adminpanel-content">
          <div className="adminpanel-content-wrapper">
            {this.renderDashboardStats()}
            {this.renderControlsSection()}

            <div className="adminpanel-submissions-section">
              <div className="adminpanel-section-header">
                <h2>Portfolio Submissions</h2>
                <p>Review and manage freelancer applications</p>
              </div>
              {this.renderSubmissionsList()}
            </div>

            {viewingSubmission && this.renderSubmissionDetails()}
          </div>
        </div>
      </div>
    );
  }

  render() {
    const { isAuthenticated, isLoading } = this.state;

    if (isLoading) {
      return (
        <div className="adminpanel-loading-screen">
          <div className="adminpanel-loading-content">
            <div className="adminpanel-spinner"></div>
            <h2>Loading VOAT Admin Panel</h2>
            <p>Please wait while we prepare your dashboard...</p>
          </div>
        </div>
      );
    }

    return (
      <>
        <NavBar />
        <div className="adminpanel-wrapper">
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
