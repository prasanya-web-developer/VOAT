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
    quickBookings: [],
    viewingSubmission: null,
    viewingQuickBooking: null,
    isLoading: true,
    baseUrl: "https://voat.onrender.com",
    activeTab: "portfolios", // New state for tab management

    // Filter states
    searchTerm: "",
    statusFilter: "all",
    sortBy: "newest",
    currentPage: 1,
    itemsPerPage: 10,

    // Quick booking specific states
    quickBookingSearchTerm: "",
    quickBookingStatusFilter: "all",
    quickBookingSortBy: "newest",
  };

  componentDidMount() {
    this.checkAuthentication();
    if (this.state.isAuthenticated) {
      this.fetchPortfolioSubmissions();
      this.fetchQuickBookings();
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

  getProfileImageSrc = (profileImage) => {
    console.log("Processing profile image:", profileImage);

    if (!profileImage) {
      console.log("No profile image provided");
      return null;
    }

    // Handle data URLs (base64 images)
    if (profileImage.startsWith("data:")) {
      console.log("Using data URL:", profileImage.substring(0, 50) + "...");
      return profileImage;
    }

    // Handle full HTTP URLs
    if (profileImage.startsWith("http")) {
      console.log("Using full HTTP URL:", profileImage);
      return profileImage;
    }

    // Handle API placeholder URLs
    if (profileImage.startsWith("/api/placeholder")) {
      console.log("Using placeholder URL:", profileImage);
      return profileImage;
    }

    // Handle relative paths from database - ensure leading slash
    let imagePath = profileImage;
    if (!imagePath.startsWith("/")) {
      imagePath = "/" + imagePath;
    }

    const constructedUrl = `${this.state.baseUrl}${imagePath}`;
    console.log("Constructed URL from database path:", constructedUrl);
    return constructedUrl;
  };

  checkAuthentication = () => {
    const adminData = localStorage.getItem("adminData");
    if (adminData) {
      this.setState({ isAuthenticated: true, isLoading: false }, () => {
        this.fetchPortfolioSubmissions();
        this.fetchQuickBookings();
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
          this.fetchQuickBookings();
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

  // Fetch Quick Bookings
  fetchQuickBookings = async () => {
    try {
      this.setState({ isLoading: true });

      console.log(
        "Fetching quick bookings from:",
        `${this.state.baseUrl}/api/admin/quick-bookings`
      );

      const response = await fetch(
        `${this.state.baseUrl}/api/admin/quick-bookings`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        }
      );

      console.log("Quick bookings response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Quick bookings fetch error:", errorText);
        throw new Error(
          `HTTP error! status: ${response.status} - ${errorText}`
        );
      }

      const data = await response.json();
      console.log("Fetched quick bookings:", data);

      // Handle both possible response formats
      const quickBookings = data.quickBookings || data || [];

      this.setState({
        quickBookings: Array.isArray(quickBookings) ? quickBookings : [],
        isLoading: false,
      });
    } catch (error) {
      console.error("Error fetching quick bookings:", error);
      this.setState({
        quickBookings: [],
        isLoading: false,
      });

      // Optional: Show error notification
      alert(`Failed to fetch quick bookings: ${error.message}`);
    }
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

      console.log("=== DEBUG SUBMISSIONS DATA ===");
      uniqueSubmissions.forEach((submission, index) => {
        console.log(`Submission ${index + 1}:`, {
          name: submission.name,
          userId: submission.userId,
          userIdType: typeof submission.userId,
          email: submission.email,
          profileImage: submission.profileImage,
        });
      });

      // Fetch profile images for each submission from user database
      const submissionsWithImages = await Promise.all(
        uniqueSubmissions.map(async (submission) => {
          // Validate userId before making API call
          let userId = submission.userId;

          // Handle different userId formats
          if (userId && typeof userId === "object" && userId._id) {
            userId = userId._id;
          }

          // Check if userId is valid (not null, undefined, or object)
          if (userId && typeof userId === "string" && userId.trim() !== "") {
            try {
              console.log(
                `Fetching user data for ${submission.name} with userId: ${userId}`
              );

              const userResponse = await fetch(
                `${this.state.baseUrl}/api/user/${userId.trim()}`
              );

              if (userResponse.ok) {
                const userData = await userResponse.json();
                console.log(`User data for ${submission.name}:`, userData);

                // Update submission with fresh profile image from database
                return {
                  ...submission,
                  profileImage:
                    userData.user?.profileImage || submission.profileImage,
                  userId: userId, // Store the clean userId
                };
              } else {
                console.warn(
                  `Failed to fetch user data for ${submission.name}. Status: ${userResponse.status}`
                );
              }
            } catch (error) {
              console.error(
                `Error fetching user data for ${submission.name}:`,
                error
              );
            }
          } else {
            console.log(
              `Skipping user data fetch for ${submission.name} - invalid or missing userId:`,
              submission.userId
            );
          }

          // Return original submission if user fetch fails or userId is invalid
          return submission;
        })
      );

      this.setState({
        portfolioSubmissions: submissionsWithImages,
        isLoading: false,
      });
    } catch (error) {
      console.error("Error fetching portfolio submissions:", error);
      this.setState({
        portfolioSubmissions: [],
        isLoading: false,
      });
    }
  };

  // Delete portfolio submission
  handleDeleteSubmission = async (submissionId) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this portfolio submission? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      this.setState({ isLoading: true });

      const response = await fetch(
        `${this.state.baseUrl}/api/admin/portfolio-submission/${submissionId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) throw new Error("Failed to delete submission");

      // Remove the submission from the state
      const updatedSubmissions = this.state.portfolioSubmissions.filter(
        (sub) => sub._id !== submissionId && sub.id !== submissionId
      );

      this.setState({
        portfolioSubmissions: updatedSubmissions,
        viewingSubmission: null,
        isLoading: false,
      });

      alert("Portfolio submission deleted successfully!");
    } catch (error) {
      console.error("Error deleting submission:", error);
      this.setState({ isLoading: false });
      alert("Failed to delete submission. Please try again.");
    }
  };

  // Hold/Unhold portfolio submission
  handleHoldSubmission = async (submissionId, isHold) => {
    const action = isHold ? "hold" : "unhold";
    if (
      !window.confirm(
        `Are you sure you want to ${action} this portfolio submission?`
      )
    ) {
      return;
    }

    try {
      this.setState({ isLoading: true });

      const response = await fetch(
        `${this.state.baseUrl}/api/admin/portfolio-submission/${submissionId}/hold`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ isHold }),
        }
      );

      if (!response.ok) throw new Error(`Failed to ${action} submission`);
      const data = await response.json();
      const updatedSubmission = data.submission;

      // Update the submission in the state
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

      alert(`Portfolio submission ${action}ed successfully!`);
    } catch (error) {
      console.error(`Error ${action}ing submission:`, error);
      this.setState({ isLoading: false });
      alert(`Failed to ${action} submission. Please try again.`);
    }
  };

  // Delete quick booking
  handleDeleteQuickBooking = async (quickBookingId) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this quick booking? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      this.setState({ isLoading: true });

      const response = await fetch(
        `${this.state.baseUrl}/api/admin/quick-booking/${quickBookingId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) throw new Error("Failed to delete quick booking");

      // Remove the quick booking from the state
      const updatedQuickBookings = this.state.quickBookings.filter(
        (qb) => qb._id !== quickBookingId && qb.id !== quickBookingId
      );

      this.setState({
        quickBookings: updatedQuickBookings,
        viewingQuickBooking: null,
        isLoading: false,
      });

      alert("Quick booking deleted successfully!");
    } catch (error) {
      console.error("Error deleting quick booking:", error);
      this.setState({ isLoading: false });
      alert("Failed to delete quick booking. Please try again.");
    }
  };

  // Quick Booking Handlers
  handleViewQuickBooking = async (quickBooking) => {
    console.log("View quick booking clicked for:", quickBooking);

    try {
      const response = await fetch(
        `${this.state.baseUrl}/api/admin/quick-booking/${
          quickBooking._id || quickBooking.id
        }`
      );

      let detailedQuickBooking = quickBooking;

      if (response.ok) {
        const data = await response.json();
        detailedQuickBooking = data.quickBooking;
        console.log("Detailed quick booking data:", detailedQuickBooking);
      } else {
        console.warn(
          "Failed to fetch detailed quick booking, using original data"
        );
      }

      this.setState({ viewingQuickBooking: detailedQuickBooking });
    } catch (error) {
      console.error("Error fetching detailed quick booking:", error);
      this.setState({ viewingQuickBooking: quickBooking });
    }
  };

  handleCloseQuickBookingView = () => {
    this.setState({ viewingQuickBooking: null });
  };

  handleQuickBookingStatusChange = async (quickBookingId, newStatus) => {
    try {
      this.setState({ isLoading: true });

      const response = await fetch(
        `${this.state.baseUrl}/api/admin/quick-booking/${quickBookingId}/status`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      if (!response.ok) throw new Error("Failed to update status");
      const data = await response.json();
      const updatedQuickBooking = data.quickBooking;

      const updatedQuickBookings = this.state.quickBookings.map((qb) =>
        qb._id === quickBookingId || qb.id === quickBookingId
          ? { ...updatedQuickBooking }
          : qb
      );

      this.setState({
        quickBookings: updatedQuickBookings,
        viewingQuickBooking: updatedQuickBooking,
        isLoading: false,
      });

      alert(
        `Quick booking ${
          newStatus === "accepted" ? "accepted" : "rejected"
        } successfully!`
      );
    } catch (error) {
      console.error("Error updating quick booking status:", error);
      this.setState({ isLoading: false });
      alert("Failed to update quick booking status. Please try again.");
    }
  };

  // Portfolio submission handlers (existing)
  handleViewSubmission = async (submission) => {
    console.log("View submission clicked for:", submission);

    try {
      const response = await fetch(
        `${this.state.baseUrl}/api/admin/portfolio-submission/${
          submission._id || submission.id
        }`
      );

      let detailedSubmission = submission;

      if (response.ok) {
        detailedSubmission = await response.json();
        console.log("Detailed submission data:", detailedSubmission);
      } else {
        console.warn(
          "Failed to fetch detailed submission, using original data"
        );
      }

      // If we have a userId, fetch fresh user data with profile image
      if (detailedSubmission.userId) {
        try {
          const userResponse = await fetch(
            `${this.state.baseUrl}/api/user/${detailedSubmission.userId}`
          );

          if (userResponse.ok) {
            const userData = await userResponse.json();
            console.log(`Fresh user data for modal:`, userData);

            // Update submission with fresh profile image
            detailedSubmission = {
              ...detailedSubmission,
              profileImage:
                userData.user?.profileImage || detailedSubmission.profileImage,
            };
          }
        } catch (error) {
          console.error("Error fetching fresh user data for modal:", error);
        }
      }

      this.setState({ viewingSubmission: detailedSubmission });
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

  // Tab management
  handleTabChange = (tab) => {
    this.setState({ activeTab: tab });
  };

  // Filter and search methods for portfolios
  handleSearchChange = (e) => {
    this.setState({ searchTerm: e.target.value, currentPage: 1 });
  };

  handleStatusFilter = (status) => {
    this.setState({ statusFilter: status, currentPage: 1 });
  };

  handleSortChange = (sortBy) => {
    this.setState({ sortBy, currentPage: 1 });
  };

  // Filter and search methods for quick bookings
  handleQuickBookingSearchChange = (e) => {
    this.setState({ quickBookingSearchTerm: e.target.value, currentPage: 1 });
  };

  handleQuickBookingStatusFilter = (status) => {
    this.setState({ quickBookingStatusFilter: status, currentPage: 1 });
  };

  handleQuickBookingSortChange = (sortBy) => {
    this.setState({ quickBookingSortBy: sortBy, currentPage: 1 });
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

  getFilteredQuickBookings = () => {
    const {
      quickBookings,
      quickBookingSearchTerm,
      quickBookingStatusFilter,
      quickBookingSortBy,
    } = this.state;

    let filtered = quickBookings.filter((booking) => {
      const matchesSearch =
        booking.clientName
          .toLowerCase()
          .includes(quickBookingSearchTerm.toLowerCase()) ||
        booking.clientEmail
          .toLowerCase()
          .includes(quickBookingSearchTerm.toLowerCase()) ||
        booking.serviceName
          .toLowerCase()
          .includes(quickBookingSearchTerm.toLowerCase()) ||
        booking.budget
          .toLowerCase()
          .includes(quickBookingSearchTerm.toLowerCase());

      const matchesStatus =
        quickBookingStatusFilter === "all" ||
        booking.status === quickBookingStatusFilter;

      return matchesSearch && matchesStatus;
    });

    // Sort quick bookings
    filtered.sort((a, b) => {
      switch (quickBookingSortBy) {
        case "newest":
          return new Date(b.requestDate) - new Date(a.requestDate);
        case "oldest":
          return new Date(a.requestDate) - new Date(b.requestDate);
        case "name":
          return a.clientName.localeCompare(b.clientName);
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

  getQuickBookingStats = () => {
    const { quickBookings } = this.state;
    return {
      total: quickBookings.length,
      pending: quickBookings.filter(
        (qb) => qb.status === "pending" || !qb.status
      ).length,
      accepted: quickBookings.filter((qb) => qb.status === "accepted").length,
      rejected: quickBookings.filter((qb) => qb.status === "rejected").length,
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
    const portfolioStats = this.getStats();
    const quickBookingStats = this.getQuickBookingStats();

    return (
      <div className="adminpanel-stats-container">
        <div className="adminpanel-stats-section">
          <h3 className="adminpanel-stats-title">
            <i className="fas fa-briefcase"></i>
            Portfolio Submissions
          </h3>
          <div className="adminpanel-stats-grid">
            <div className="adminpanel-stat-card adminpanel-stat-total">
              <div className="adminpanel-stat-content">
                <div className="adminpanel-stat-number">
                  {portfolioStats.total}
                </div>
                <div className="adminpanel-stat-label">Total Submissions</div>
              </div>
              <div className="adminpanel-stat-icon">
                <i className="fas fa-users"></i>
              </div>
            </div>

            <div className="adminpanel-stat-card adminpanel-stat-pending">
              <div className="adminpanel-stat-content">
                <div className="adminpanel-stat-number">
                  {portfolioStats.pending}
                </div>
                <div className="adminpanel-stat-label">Pending Review</div>
              </div>
              <div className="adminpanel-stat-icon">
                <i className="fas fa-clock"></i>
              </div>
            </div>

            <div className="adminpanel-stat-card adminpanel-stat-approved">
              <div className="adminpanel-stat-content">
                <div className="adminpanel-stat-number">
                  {portfolioStats.approved}
                </div>
                <div className="adminpanel-stat-label">Approved</div>
              </div>
              <div className="adminpanel-stat-icon">
                <i className="fas fa-check-circle"></i>
              </div>
            </div>

            <div className="adminpanel-stat-card adminpanel-stat-rejected">
              <div className="adminpanel-stat-content">
                <div className="adminpanel-stat-number">
                  {portfolioStats.rejected}
                </div>
                <div className="adminpanel-stat-label">Rejected</div>
              </div>
              <div className="adminpanel-stat-icon">
                <i className="fas fa-times-circle"></i>
              </div>
            </div>
          </div>
        </div>

        <div className="adminpanel-stats-section">
          <h3 className="adminpanel-stats-title">
            <i className="fas fa-rocket"></i>
            Quick Bookings
          </h3>
          <div className="adminpanel-stats-grid">
            <div className="adminpanel-stat-card adminpanel-stat-total">
              <div className="adminpanel-stat-content">
                <div className="adminpanel-stat-number">
                  {quickBookingStats.total}
                </div>
                <div className="adminpanel-stat-label">Total Requests</div>
              </div>
              <div className="adminpanel-stat-icon">
                <i className="fas fa-bolt"></i>
              </div>
            </div>

            <div className="adminpanel-stat-card adminpanel-stat-pending">
              <div className="adminpanel-stat-content">
                <div className="adminpanel-stat-number">
                  {quickBookingStats.pending}
                </div>
                <div className="adminpanel-stat-label">Pending</div>
              </div>
              <div className="adminpanel-stat-icon">
                <i className="fas fa-hourglass-half"></i>
              </div>
            </div>

            <div className="adminpanel-stat-card adminpanel-stat-approved">
              <div className="adminpanel-stat-content">
                <div className="adminpanel-stat-number">
                  {quickBookingStats.accepted}
                </div>
                <div className="adminpanel-stat-label">Accepted</div>
              </div>
              <div className="adminpanel-stat-icon">
                <i className="fas fa-thumbs-up"></i>
              </div>
            </div>

            <div className="adminpanel-stat-card adminpanel-stat-rejected">
              <div className="adminpanel-stat-content">
                <div className="adminpanel-stat-number">
                  {quickBookingStats.rejected}
                </div>
                <div className="adminpanel-stat-label">Rejected</div>
              </div>
              <div className="adminpanel-stat-icon">
                <i className="fas fa-thumbs-down"></i>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  renderTabNavigation() {
    const { activeTab } = this.state;

    return (
      <div className="adminpanel-tab-navigation">
        <button
          className={`adminpanel-tab-btn ${
            activeTab === "portfolios" ? "active" : ""
          }`}
          onClick={() => this.handleTabChange("portfolios")}
        >
          <i className="fas fa-briefcase"></i>
          <span>Portfolio Submissions</span>
          <div className="adminpanel-tab-indicator"></div>
        </button>
        <button
          className={`adminpanel-tab-btn ${
            activeTab === "quickBookings" ? "active" : ""
          }`}
          onClick={() => this.handleTabChange("quickBookings")}
        >
          <i className="fas fa-rocket"></i>
          <span>Quick Bookings</span>
          <div className="adminpanel-tab-indicator"></div>
        </button>
      </div>
    );
  }

  renderPortfolioControlsSection() {
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

  renderQuickBookingControlsSection() {
    const {
      quickBookingSearchTerm,
      quickBookingStatusFilter,
      quickBookingSortBy,
    } = this.state;

    return (
      <div className="adminpanel-controls-panel">
        <div className="adminpanel-search-section">
          <div className="adminpanel-search-bar">
            <i className="fas fa-search adminpanel-search-icon"></i>
            <input
              type="text"
              placeholder="Search by client name, email, or service..."
              value={quickBookingSearchTerm}
              onChange={this.handleQuickBookingSearchChange}
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
                  quickBookingStatusFilter === "all" ? "adminpanel-active" : ""
                }`}
                onClick={() => this.handleQuickBookingStatusFilter("all")}
              >
                All
              </button>
              <button
                className={`adminpanel-filter-tab ${
                  quickBookingStatusFilter === "pending"
                    ? "adminpanel-active"
                    : ""
                }`}
                onClick={() => this.handleQuickBookingStatusFilter("pending")}
              >
                Pending
              </button>
              <button
                className={`adminpanel-filter-tab ${
                  quickBookingStatusFilter === "accepted"
                    ? "adminpanel-active"
                    : ""
                }`}
                onClick={() => this.handleQuickBookingStatusFilter("accepted")}
              >
                Accepted
              </button>
              <button
                className={`adminpanel-filter-tab ${
                  quickBookingStatusFilter === "rejected"
                    ? "adminpanel-active"
                    : ""
                }`}
                onClick={() => this.handleQuickBookingStatusFilter("rejected")}
              >
                Rejected
              </button>
            </div>
          </div>

          <div className="adminpanel-sort-section">
            <span className="adminpanel-sort-label">Sort by:</span>
            <select
              value={quickBookingSortBy}
              onChange={(e) =>
                this.handleQuickBookingSortChange(e.target.value)
              }
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

  renderQuickBookingsList() {
    const { isLoading } = this.state;
    const filteredQuickBookings = this.getFilteredQuickBookings();

    if (isLoading) {
      return (
        <div className="adminpanel-loading-state">
          <div className="adminpanel-spinner"></div>
          <p>Loading quick bookings...</p>
        </div>
      );
    }

    if (!filteredQuickBookings || filteredQuickBookings.length === 0) {
      return (
        <div className="adminpanel-empty-state">
          <div className="adminpanel-empty-icon">
            <i className="fas fa-rocket"></i>
          </div>
          <h3>No Quick Bookings Found</h3>
          <p>
            There are no quick booking requests matching your current filters.
          </p>
        </div>
      );
    }

    return (
      <div className="adminpanel-quickbookings-grid">
        {filteredQuickBookings.map((quickBooking) => {
          const profileImageSrc = this.getProfileImageSrc(
            quickBooking.clientId?.profileImage
          );

          return (
            <div
              key={quickBooking._id || quickBooking.id}
              className="adminpanel-quickbooking-card"
            >
              <div className="adminpanel-card-header">
                <div className="adminpanel-profile-section">
                  <div className="adminpanel-avatar">
                    {profileImageSrc ? (
                      <img
                        src={profileImageSrc}
                        alt={quickBooking.clientName}
                        onError={(e) => {
                          console.log("Image failed to load:", e.target.src);
                          e.target.onerror = null;
                          e.target.style.display = "none";
                          if (e.target.nextSibling) {
                            e.target.nextSibling.style.display = "flex";
                          }
                        }}
                        onLoad={(e) => {
                          console.log(
                            "Image loaded successfully:",
                            e.target.src
                          );
                          if (e.target.nextSibling) {
                            e.target.nextSibling.style.display = "none";
                          }
                        }}
                      />
                    ) : null}
                    <div
                      className="adminpanel-avatar-initials"
                      style={{ display: profileImageSrc ? "none" : "flex" }}
                    >
                      {this.getInitials(quickBooking.clientName)}
                    </div>
                  </div>
                  <div className="adminpanel-profile-info">
                    <h3 className="adminpanel-profile-name">
                      {quickBooking.clientName}
                    </h3>
                    <p className="adminpanel-profile-service">
                      {quickBooking.serviceName}
                    </p>
                    <div className="adminpanel-profile-meta">
                      <span className="adminpanel-budget">
                        <i className="fas fa-dollar-sign"></i>
                        {quickBooking.budget}
                      </span>
                    </div>
                  </div>
                </div>
                <div
                  className={`adminpanel-status-badge adminpanel-status-${
                    quickBooking.status || "pending"
                  }`}
                >
                  {quickBooking.status
                    ? quickBooking.status.charAt(0).toUpperCase() +
                      quickBooking.status.slice(1)
                    : "Pending"}
                </div>
              </div>

              <div className="adminpanel-card-body">
                <div className="adminpanel-quickbooking-info">
                  <div className="adminpanel-info-item">
                    <i className="fas fa-envelope"></i>
                    <span>{quickBooking.clientEmail}</span>
                  </div>
                  <div className="adminpanel-info-item">
                    <i className="fas fa-phone"></i>
                    <span>{quickBooking.clientPhone}</span>
                  </div>
                  <div className="adminpanel-info-item">
                    <i className="fas fa-calendar"></i>
                    <span>
                      {quickBooking.requestDate
                        ? new Date(
                            quickBooking.requestDate
                          ).toLocaleDateString()
                        : "Unknown"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="adminpanel-card-footer">
                <button
                  className="adminpanel-view-btn"
                  onClick={() => this.handleViewQuickBooking(quickBooking)}
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

  renderSubmissionsList() {
    const { isLoading } = this.state;
    const filteredSubmissions = this.getFilteredSubmissions();

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
          const profileImageSrc = this.getProfileImageSrc(
            submission.profileImage
          );

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
                          if (e.target.nextSibling) {
                            e.target.nextSibling.style.display = "flex";
                          }
                        }}
                        onLoad={(e) => {
                          console.log(
                            "Image loaded successfully:",
                            e.target.src
                          );
                          if (e.target.nextSibling) {
                            e.target.nextSibling.style.display = "none";
                          }
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

  renderQuickBookingDetails() {
    const { viewingQuickBooking } = this.state;
    if (!viewingQuickBooking) return null;

    const profileImageSrc = this.getProfileImageSrc(
      viewingQuickBooking.clientId?.profileImage
    );

    return (
      <div className="adminpanel-modal-overlay">
        <div className="adminpanel-modal-container">
          <div className="adminpanel-modal-header">
            <h2>Quick Booking Request Details</h2>
            <button
              className="adminpanel-modal-close"
              onClick={this.handleCloseQuickBookingView}
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
                    alt={viewingQuickBooking.clientName}
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
                  {this.getInitials(viewingQuickBooking.clientName)}
                </div>
              </div>

              <div className="adminpanel-profile-details">
                <h1>{viewingQuickBooking.clientName || "Unknown Client"}</h1>
                <p className="adminpanel-profession">
                  {viewingQuickBooking.serviceName || "No service specified"}
                </p>
                <p className="adminpanel-headline">
                  Budget: {viewingQuickBooking.budget || "Not specified"}
                </p>
                <div
                  className={`adminpanel-status-indicator adminpanel-status-${
                    viewingQuickBooking.status || "pending"
                  }`}
                >
                  <i className="fas fa-circle"></i>
                  Status:{" "}
                  {viewingQuickBooking.status
                    ? viewingQuickBooking.status.charAt(0).toUpperCase() +
                      viewingQuickBooking.status.slice(1)
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
                  {viewingQuickBooking.clientEmail || "No email provided"}
                </div>
              </div>

              <div className="adminpanel-detail-card">
                <div className="adminpanel-detail-label">
                  <i className="fas fa-phone"></i>
                  Phone Number
                </div>
                <div className="adminpanel-detail-value">
                  {viewingQuickBooking.clientPhone || "No phone provided"}
                </div>
              </div>

              <div className="adminpanel-detail-card">
                <div className="adminpanel-detail-label">
                  <i className="fas fa-cogs"></i>
                  Requested Service
                </div>
                <div className="adminpanel-detail-value">
                  {viewingQuickBooking.serviceName || "Not specified"}
                </div>
              </div>

              <div className="adminpanel-detail-card">
                <div className="adminpanel-detail-label">
                  <i className="fas fa-dollar-sign"></i>
                  Budget Range
                </div>
                <div className="adminpanel-detail-value">
                  {viewingQuickBooking.budget || "Not specified"}
                </div>
              </div>

              <div className="adminpanel-detail-card">
                <div className="adminpanel-detail-label">
                  <i className="fas fa-calendar"></i>
                  Request Date
                </div>
                <div className="adminpanel-detail-value">
                  {viewingQuickBooking.requestDate
                    ? new Date(
                        viewingQuickBooking.requestDate
                      ).toLocaleDateString()
                    : "Unknown date"}
                </div>
              </div>

              {viewingQuickBooking.responseDate && (
                <div className="adminpanel-detail-card">
                  <div className="adminpanel-detail-label">
                    <i className="fas fa-reply"></i>
                    Response Date
                  </div>
                  <div className="adminpanel-detail-value">
                    {new Date(
                      viewingQuickBooking.responseDate
                    ).toLocaleDateString()}
                  </div>
                </div>
              )}
            </div>

            {viewingQuickBooking.description && (
              <div className="adminpanel-about-section">
                <h3>
                  <i className="fas fa-comment"></i>
                  Project Description
                </h3>
                <p>{viewingQuickBooking.description}</p>
              </div>
            )}

            {viewingQuickBooking.adminNotes && (
              <div className="adminpanel-about-section">
                <h3>
                  <i className="fas fa-sticky-note"></i>
                  Admin Notes
                </h3>
                <p>{viewingQuickBooking.adminNotes}</p>
              </div>
            )}

            <div className="adminpanel-modal-actions">
              {viewingQuickBooking.status === "pending" && (
                <>
                  <button
                    className="adminpanel-approve-btn"
                    onClick={() =>
                      this.handleQuickBookingStatusChange(
                        viewingQuickBooking._id || viewingQuickBooking.id,
                        "accepted"
                      )
                    }
                  >
                    <i className="fas fa-check"></i>
                    Accept Request
                  </button>
                  <button
                    className="adminpanel-reject-btn"
                    onClick={() =>
                      this.handleQuickBookingStatusChange(
                        viewingQuickBooking._id || viewingQuickBooking.id,
                        "rejected"
                      )
                    }
                  >
                    <i className="fas fa-times"></i>
                    Reject Request
                  </button>
                </>
              )}

              {viewingQuickBooking.status === "accepted" && (
                <>
                  <button
                    className="adminpanel-reject-btn"
                    onClick={() =>
                      this.handleQuickBookingStatusChange(
                        viewingQuickBooking._id || viewingQuickBooking.id,
                        "rejected"
                      )
                    }
                  >
                    <i className="fas fa-times"></i>
                    Reject Request
                  </button>
                  <button
                    className="adminpanel-delete-btn"
                    onClick={() =>
                      this.handleDeleteQuickBooking(
                        viewingQuickBooking._id || viewingQuickBooking.id
                      )
                    }
                  >
                    <i className="fas fa-trash"></i>
                    Delete
                  </button>
                </>
              )}

              {viewingQuickBooking.status === "rejected" && (
                <>
                  <button
                    className="adminpanel-delete-btn"
                    onClick={() =>
                      this.handleDeleteQuickBooking(
                        viewingQuickBooking._id || viewingQuickBooking.id
                      )
                    }
                  >
                    <i className="fas fa-trash"></i>
                    Delete
                  </button>
                  <div className="adminpanel-status-message">
                    <i className="fas fa-info-circle"></i>
                    This request has been rejected.
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  renderSubmissionDetails() {
    const { viewingSubmission } = this.state;
    if (!viewingSubmission) return null;

    const profileImageSrc = this.getProfileImageSrc(
      viewingSubmission.profileImage
    );

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
                {viewingSubmission.isHold && (
                  <div className="adminpanel-status-indicator adminpanel-status-held">
                    <i className="fas fa-eye-slash"></i>
                    Status: Held (Hidden from public)
                  </div>
                )}
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
                                  ₹{price.price || "N/A"}
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

              {viewingSubmission.status === "approved" && (
                <>
                  <button
                    className="adminpanel-delete-btn"
                    onClick={() =>
                      this.handleDeleteSubmission(
                        viewingSubmission._id || viewingSubmission.id
                      )
                    }
                  >
                    <i className="fas fa-trash"></i>
                    Delete
                  </button>
                  <button
                    className={`adminpanel-hold-btn ${
                      viewingSubmission.isHold ? "unheld" : "held"
                    }`}
                    onClick={() =>
                      this.handleHoldSubmission(
                        viewingSubmission._id || viewingSubmission.id,
                        !viewingSubmission.isHold
                      )
                    }
                  >
                    <i
                      className={`fas ${
                        viewingSubmission.isHold ? "fa-eye" : "fa-eye-slash"
                      }`}
                    ></i>
                    {viewingSubmission.isHold ? "Unhold" : "Hold"}
                  </button>
                </>
              )}

              {viewingSubmission.status === "rejected" && (
                <>
                  <button
                    className="adminpanel-delete-btn"
                    onClick={() =>
                      this.handleDeleteSubmission(
                        viewingSubmission._id || viewingSubmission.id
                      )
                    }
                  >
                    <i className="fas fa-trash"></i>
                    Delete
                  </button>
                  <div className="adminpanel-status-message">
                    <i className="fas fa-info-circle"></i>
                    This submission has been rejected.
                  </div>
                </>
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
    const { viewingSubmission, viewingQuickBooking, activeTab } = this.state;

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
                <p>Manage portfolio submissions and quick booking requests</p>
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
            {this.renderTabNavigation()}

            {activeTab === "portfolios" && (
              <div className="adminpanel-section">
                <div className="adminpanel-section-header">
                  <h2>Portfolio Submissions</h2>
                  <p>Review and manage freelancer portfolio applications</p>
                </div>
                {this.renderPortfolioControlsSection()}
                {this.renderSubmissionsList()}
              </div>
            )}

            {activeTab === "quickBookings" && (
              <div className="adminpanel-section">
                <div className="adminpanel-section-header">
                  <h2>Quick Booking Requests</h2>
                  <p>Review and manage quick booking requests from clients</p>
                </div>
                {this.renderQuickBookingControlsSection()}
                {this.renderQuickBookingsList()}
              </div>
            )}

            {viewingSubmission && this.renderSubmissionDetails()}
            {viewingQuickBooking && this.renderQuickBookingDetails()}
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
