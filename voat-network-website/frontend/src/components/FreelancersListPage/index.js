import React, { Component } from "react";
import { Link } from "react-router-dom";
import NavBar from "../Navbar";
import Footer from "../Footer";
import "./index.css";

class PortfolioList extends Component {
  state = {
    portfolios: [],
    isLoading: true,
    error: null,
    filters: {
      profession: "",
      experience: "",
      amount: [],
    },
    baseUrl: "http://localhost:8000",
    userImages: {},
    wishlist: [],
    isMobileFilterOpen: false,
    notification: null,
  };

  getColorForName = (name) => {
    const colors = [
      "#4C51BF",
      "#667EEA",
      "#2B6CB0",
      "#319795",
      "#38A169",
      "#D69E2E",
      "#DD6B20",
      "#E53E3E",
      "#805AD5",
      "#3182CE",
    ];

    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }

    const colorIndex = Math.abs(hash) % colors.length;
    return colors[colorIndex];
  };

  componentDidMount() {
    this.fetchApprovedPortfolios();
    this.loadUserImages();
    this.loadWishlist();
    this.handleUrlParams();
  }

  // Handle URL parameters for filtering
  handleUrlParams = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const professionFromUrl = urlParams.get("profession");

    if (professionFromUrl) {
      this.setState((prevState) => ({
        filters: {
          ...prevState.filters,
          profession: decodeURIComponent(professionFromUrl),
        },
      }));
    }
  };

  showNotification = (message, type = "success") => {
    this.setState({
      notification: {
        message,
        type,
      },
    });

    setTimeout(() => {
      this.setState({ notification: null });
    }, 3000);
  };

  renderNotification = () => {
    if (!this.state.notification) return null;

    const { message, type } = this.state.notification;
    const isError = type === "error";

    return (
      <div className={`notification-toast ${isError ? "error" : "success"}`}>
        <div className="notification-content">
          <i
            className={`fas fa-${
              isError ? "exclamation-circle" : "check-circle"
            }`}
          ></i>
          <span>{message}</span>
        </div>
      </div>
    );
  };

  loadUserImages = () => {
    try {
      const users = JSON.parse(localStorage.getItem("users") || "[]");
      const userImages = {};

      users.forEach((user) => {
        if (user._id || user.id) {
          const userId = user._id || user.id;
          if (user.profileImage) {
            userImages[userId] = user.profileImage;
          }
        }
      });

      const approvedSubmissions = JSON.parse(
        localStorage.getItem("approvedSubmissions") || "[]"
      );
      approvedSubmissions.forEach((submission) => {
        if (
          (submission.userId || submission._id || submission.id) &&
          submission.profileImage
        ) {
          const userId = submission.userId || submission._id || submission.id;
          userImages[userId] = submission.profileImage;
        }
      });

      const isDevelopment =
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1";

      if (isDevelopment) {
        this.addDevelopmentImages(userImages);
      }

      this.setState({ userImages });
    } catch (error) {
      console.error("Error loading user images:", error);
    }
  };

  addDevelopmentImages = (userImages) => {
    userImages["user1"] = "/api/placeholder/100/100";
    userImages["user2"] = "/api/placeholder/100/100";
    userImages["user3"] = "/api/placeholder/100/100";

    if (!userImages["6800b8b34a5c2842c84499c7"]) {
      userImages["6800b8b34a5c2842c84499c7"] =
        "/uploads/1744895090022-download (15).jpeg";
    }
  };

  fetchApprovedPortfolios = async () => {
    try {
      const response = await fetch(`${this.state.baseUrl}/api/portfolios`);

      let portfolioData = [];

      if (response.ok) {
        portfolioData = await response.json();

        portfolioData = portfolioData.map((portfolio) => {
          if (!portfolio.profession && portfolio.headline) {
            portfolio.profession = portfolio.profession;
            portfolio.headline = portfolio.headline;
          }

          const { headline, ...portfolioWithoutHeadline } = portfolio;
          return portfolioWithoutHeadline;
        });
      } else {
        let approvedPortfolios = JSON.parse(
          localStorage.getItem("approvedSubmissions") || "[]"
        );

        if (approvedPortfolios.length === 0) {
          approvedPortfolios = [];
        }

        portfolioData = approvedPortfolios;

        portfolioData = portfolioData.map((portfolio) => {
          if (!portfolio.profession && portfolio.headline) {
            portfolio.profession = portfolio.headline;
          }
          const { headline, ...portfolioWithoutHeadline } = portfolio;
          return portfolioWithoutHeadline;
        });
      }

      const uniquePortfolios = this.removeDuplicatePortfolios(portfolioData);
      await this.fetchUserData(uniquePortfolios);

      this.setState({
        portfolios: uniquePortfolios,
        isLoading: false,
      });
    } catch (error) {
      console.error("Error fetching portfolios:", error);

      const approvedPortfolios = JSON.parse(
        localStorage.getItem("approvedSubmissions") || "[]"
      );

      if (approvedPortfolios.length > 0) {
        const uniquePortfolios =
          this.removeDuplicatePortfolios(approvedPortfolios);

        const cleanedPortfolios = uniquePortfolios.map((portfolio) => {
          if (!portfolio.profession && portfolio.headline) {
            portfolio.profession = portfolio.headline;
          }
          const { headline, ...portfolioWithoutHeadline } = portfolio;
          return portfolioWithoutHeadline;
        });

        this.setState({
          portfolios: cleanedPortfolios,
          isLoading: false,
        });
      } else {
        this.setState({
          error: "Failed to load portfolios. Please try again later.",
          isLoading: false,
        });
      }
    }
  };

  fetchUserData = async (portfolios) => {
    try {
      const userImages = { ...this.state.userImages };
      const updatedPortfolios = [...portfolios];

      for (let i = 0; i < portfolios.length; i++) {
        const portfolio = portfolios[i];
        const userId = portfolio.userId || portfolio._id || portfolio.id;

        try {
          console.log(`Fetching data for user: ${userId}`);

          const response = await fetch(
            `${this.state.baseUrl}/api/user/${userId}`
          );

          if (response.ok) {
            const userData = await response.json();
            console.log(`User data received:`, userData);

            if (userData.user && userData.user.profileImage) {
              userImages[userId] = userData.user.profileImage;
            }

            if (userData.user && userData.user.voatId) {
              console.log(`VOAT ID found: ${userData.user.voatId}`);
              updatedPortfolios[i] = {
                ...updatedPortfolios[i],
                voatId: userData.user.voatId,
              };
            } else {
              console.log(`No VOAT ID found for user ${userId}`);
              updatedPortfolios[i] = {
                ...updatedPortfolios[i],
                voatId: null,
              };
            }
          }
        } catch (userError) {
          console.log(`Could not fetch user data for ${userId}:`, userError);
          updatedPortfolios[i] = {
            ...updatedPortfolios[i],
            voatId: null,
          };
        }
      }

      console.log("Updated portfolios with VOAT IDs:", updatedPortfolios);

      this.setState({
        userImages,
        portfolios: updatedPortfolios,
      });
    } catch (error) {
      console.error("Error fetching additional user data:", error);
    }
  };

  removeDuplicatePortfolios = (portfolios) => {
    const uniqueUserEmails = new Map();

    const sortedPortfolios = [...portfolios].sort((a, b) => {
      if (a.submittedDate && b.submittedDate) {
        return new Date(b.submittedDate) - new Date(a.submittedDate);
      }
      return (b.id || 0) - (a.id || 0);
    });

    return sortedPortfolios.filter((portfolio) => {
      const uniqueKey = portfolio.email || portfolio.name;

      if (!uniqueKey) return false;

      if (!uniqueUserEmails.has(uniqueKey)) {
        uniqueUserEmails.set(uniqueKey, portfolio);
        return true;
      }

      return false;
    });
  };

  handleFilterChange = (e) => {
    const { name, value } = e.target;
    this.setState((prevState) => ({
      filters: {
        ...prevState.filters,
        [name]: value,
      },
    }));
  };

  handleAmountFilterChange = (e) => {
    const { value, checked } = e.target;
    this.setState((prevState) => {
      let updatedAmount = [...prevState.filters.amount];

      if (checked) {
        updatedAmount.push(value);
      } else {
        updatedAmount = updatedAmount.filter((amount) => amount !== value);
      }

      return {
        filters: {
          ...prevState.filters,
          amount: updatedAmount,
        },
      };
    });
  };

  resetFilters = () => {
    this.setState({
      filters: {
        profession: "",
        experience: "",
        amount: [],
      },
    });

    // Also update URL to remove query parameters
    const newUrl = window.location.pathname;
    window.history.replaceState({}, "", newUrl);
  };

  loadWishlist = () => {
    const userData = JSON.parse(localStorage.getItem("user") || "{}");

    if (userData && userData.id) {
      try {
        const wishlist = JSON.parse(
          localStorage.getItem(`wishlist_${userData.id}`) || "[]"
        );
        this.setState({ wishlist });
      } catch (error) {
        console.error("Error loading wishlist from localStorage:", error);
        this.setState({ wishlist: [] });
      }

      const baseUrl = this.state.baseUrl || "http://localhost:8000";
      const wishlistUrl = `${baseUrl}/api/wishlist/${userData.id}`;

      fetch(wishlistUrl)
        .then((response) => {
          if (response.ok) return response.json();
          throw new Error(`Failed to fetch wishlist: ${response.status}`);
        })
        .then((wishlist) => {
          this.setState({ wishlist: Array.isArray(wishlist) ? wishlist : [] });
          localStorage.setItem(
            `wishlist_${userData.id}`,
            JSON.stringify(wishlist)
          );
        })
        .catch((error) => {
          console.error("Error fetching wishlist:", error);
        });
    }
  };

  handleWishlistToggle = async (portfolio) => {
    const userData = JSON.parse(localStorage.getItem("user") || "{}");

    if (!userData || !userData.id) {
      alert("Please login to add items to your wishlist");
      window.location.href = "/login";
      return;
    }

    const { wishlist } = this.state;
    const portfolioId = portfolio.userId || portfolio._id || portfolio.id;

    const isWishlisted = wishlist.some(
      (item) => item.serviceId === portfolioId || item.id === portfolioId
    );

    let updatedWishlist;
    let actionMessage;

    if (isWishlisted) {
      updatedWishlist = wishlist.filter(
        (item) => item.serviceId !== portfolioId && item.id !== portfolioId
      );
      actionMessage = `${portfolio.name} removed from wishlist`;
    } else {
      const firstServicePrice = this.getFirstServicePrice(portfolio);

      const newWishlistItem = {
        id: Math.random().toString(36).substr(2, 9),
        serviceId: portfolioId,
        service: portfolio.profession || "Service",
        price: firstServicePrice,
        provider: portfolio.name || "Provider",
        profileImage: this.getProfileImageUrl(portfolio),
        rating: 4.5,
        addedDate: new Date().toISOString(),
      };

      updatedWishlist = [...wishlist, newWishlistItem];
      actionMessage = `${portfolio.name} added to wishlist`;
    }

    this.setState({ wishlist: updatedWishlist });
    localStorage.setItem(
      `wishlist_${userData.id}`,
      JSON.stringify(updatedWishlist)
    );

    try {
      const baseUrl = this.state.baseUrl || "http://localhost:8000";
      const wishlistUrl = `${baseUrl}/api/wishlist/${userData.id}`;

      const response = await fetch(wishlistUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(updatedWishlist),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      this.showNotification(actionMessage);
    } catch (error) {
      console.error("Wishlist error:", error);

      this.setState({ wishlist });
      localStorage.setItem(`wishlist_${userData.id}`, JSON.stringify(wishlist));

      this.showNotification(
        `Failed to update wishlist: ${error.message}`,
        "error"
      );
    }
  };

  isWishlisted = (portfolioId) => {
    const { wishlist } = this.state;
    return wishlist.some(
      (item) => item.id === portfolioId || item.serviceId === portfolioId
    );
  };

  getUniqueOptions = (field) => {
    const { portfolios } = this.state;

    if (field === "profession") {
      const values = [
        ...new Set(
          portfolios
            .map((item) => item.profession)
            .filter((value) => value && value.trim !== "")
        ),
      ];
      return values.sort();
    }

    const values = [
      ...new Set(
        portfolios
          .map((item) => item[field])
          .filter((value) => value && value.trim !== "")
      ),
    ];
    return values.sort();
  };

  getProfileImageUrl = (portfolio) => {
    const userId = portfolio.userId || portfolio._id || portfolio.id;

    if (portfolio.profileImage) {
      if (
        portfolio.profileImage.startsWith("http") ||
        portfolio.profileImage.startsWith("data:image")
      ) {
        return portfolio.profileImage;
      }

      if (portfolio.profileImage.startsWith("/uploads")) {
        return `${this.state.baseUrl}${portfolio.profileImage}`;
      }
    }

    if (this.state.userImages[userId]) {
      return this.state.userImages[userId];
    }

    return `https://ui-avatars.com/api/?name=${encodeURIComponent(
      portfolio.name
    )}&background=random&color=fff&size=100`;
  };

  isValidImageUrl = (url) => {
    if (!url) return false;

    return (
      url.startsWith("http") ||
      url.startsWith("data:image") ||
      url.startsWith("/uploads") ||
      url.startsWith("/api/placeholder")
    );
  };

  getFirstServicePrice = (portfolio) => {
    if (portfolio.services && portfolio.services.length > 0) {
      const firstService = portfolio.services[0];
      if (firstService.pricing && firstService.pricing.length > 0) {
        return firstService.pricing[0].price || 0;
      }
    }

    const exp = parseInt(portfolio.workExperience) || 0;
    if (exp <= 2) return 1000 + exp * 500;
    if (exp <= 5) return 2000 + (exp - 2) * 800;
    if (exp <= 8) return 4400 + (exp - 5) * 1200;
    return 8000 + (exp - 8) * 1500;
  };

  toggleMobileFilters = () => {
    this.setState((prevState) => ({
      isMobileFilterOpen: !prevState.isMobileFilterOpen,
    }));
  };

  render() {
    const { portfolios, isLoading, error, filters, isMobileFilterOpen } =
      this.state;

    const filteredPortfolios = portfolios.filter((portfolio) => {
      if (portfolio.status !== "approved") {
        return false;
      }

      if (filters.profession && portfolio.profession !== filters.profession) {
        return false;
      }

      if (filters.experience) {
        const expValue = parseInt(portfolio.workExperience) || 0;
        const filterExp = parseInt(filters.experience);

        if (filterExp && expValue < filterExp) {
          return false;
        }
      }

      if (filters.amount.length > 0) {
        const firstServicePrice = this.getFirstServicePrice(portfolio);

        const matchesAmount = filters.amount.some((range) => {
          switch (range) {
            case "1000-5000":
              return firstServicePrice >= 1000 && firstServicePrice <= 5000;
            case "5000-10000":
              return firstServicePrice >= 5000 && firstServicePrice <= 10000;
            case "10000-15000":
              return firstServicePrice >= 10000 && firstServicePrice <= 15000;
            case "15000-20000":
              return firstServicePrice >= 15000 && firstServicePrice <= 20000;
            case "20000+":
              return firstServicePrice >= 20000;
            default:
              return false;
          }
        });

        if (!matchesAmount) {
          return false;
        }
      }

      return true;
    });

    if (isLoading) {
      return (
        <>
          <NavBar />
          <div className="portfolios-loading">
            <div className="loading-spinner"></div>
            <p>Loading amazing freelancers...</p>
          </div>
        </>
      );
    }

    if (error) {
      return (
        <>
          <NavBar />
          <div className="portfolios-error">{error}</div>
        </>
      );
    }

    const professions = this.getUniqueOptions("profession");

    return (
      <div className="app-container">
        <NavBar />
        {this.renderNotification()}
        <div className="portfolios-main-container">
          {/* Mobile Filter Toggle */}
          <button
            className="mobile-filter-toggle"
            onClick={this.toggleMobileFilters}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="4" y1="21" x2="4" y2="14" />
              <line x1="4" y1="10" x2="4" y2="3" />
              <line x1="12" y1="21" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12" y2="3" />
              <line x1="20" y1="21" x2="20" y2="16" />
              <line x1="20" y1="12" x2="20" y2="3" />
              <line x1="1" y1="14" x2="7" y2="14" />
              <line x1="9" y1="8" x2="15" y2="8" />
              <line x1="17" y1="16" x2="23" y2="16" />
            </svg>
            Filters ({filteredPortfolios.length})
          </button>

          {/* Left Sidebar - Filters */}
          <div
            className={`filters-sidebar ${
              isMobileFilterOpen ? "mobile-open" : ""
            }`}
          >
            <div className="filters-header">
              <h3>Filter Freelancers</h3>
              <button className="reset-filters-btn" onClick={this.resetFilters}>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M3 6h18M8 12h8M11 18h2" />
                </svg>
                Clear All
              </button>
            </div>

            {/* Show active filter indicator */}
            {filters.profession && (
              <div className="active-filter-indicator">
                <span className="filter-tag">
                  {filters.profession}
                  <button
                    onClick={() =>
                      this.handleFilterChange({
                        target: { name: "profession", value: "" },
                      })
                    }
                    className="remove-filter-btn"
                  >
                    ×
                  </button>
                </span>
              </div>
            )}

            <div className="filter-section">
              <label className="filter-label">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
                Role/Profession
              </label>
              <select
                name="profession"
                value={filters.profession}
                onChange={this.handleFilterChange}
                className="filter-select"
              >
                <option value="">All Roles</option>
                {professions.map((profession, index) => (
                  <option key={index} value={profession}>
                    {profession}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-section">
              <label className="filter-label">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M12 2v6m6 2a10 10 0 1 1-10-10" />
                </svg>
                Min Experience (Years)
              </label>
              <input
                type="number"
                name="experience"
                value={filters.experience}
                onChange={this.handleFilterChange}
                placeholder="e.g., 3"
                min="0"
                max="20"
                className="filter-input"
              />
            </div>

            <div className="filter-section">
              <label className="filter-label">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <line x1="12" y1="1" x2="12" y2="23" />
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
                Budget Range
              </label>
              <div className="amount-checkboxes">
                {[
                  { value: "1000-5000", label: "$1K - $5K" },
                  { value: "5000-10000", label: "$5K - $10K" },
                  { value: "10000-15000", label: "$10K - $15K" },
                  { value: "15000-20000", label: "$15K - $20K" },
                  { value: "20000+", label: "$20K+" },
                ].map((option) => (
                  <label key={option.value} className="checkbox-label">
                    <input
                      type="checkbox"
                      value={option.value}
                      checked={filters.amount.includes(option.value)}
                      onChange={this.handleAmountFilterChange}
                      className="filter-checkbox"
                    />
                    <span className="checkbox-custom"></span>
                    {option.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="filter-results">
              <div className="results-badge">
                {filteredPortfolios.length} freelancer
                {filteredPortfolios.length !== 1 ? "s" : ""}
              </div>
            </div>
          </div>

          {/* Right Content Area */}
          <div className="portfolios-content">
            <div className="portfolios-header">
              <div className="header-content">
                <div className="header-left">
                  <h1>Find Expert Freelancers</h1>
                  <p>
                    Connect with top-rated professionals for your next project
                    {filters.profession && ` in ${filters.profession}`}
                  </p>
                </div>
                <div className="header-right">
                  <button className="quick-booking-btn">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    Quick Booking
                  </button>
                  <button className="voat-recommended-btn">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
                    </svg>
                    VOAT Recommended
                  </button>
                </div>
              </div>
            </div>

            {filteredPortfolios.length === 0 ? (
              <div className="no-results">
                <div className="no-results-icon">
                  <svg
                    width="48"
                    height="48"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <path d="M21 21l-4.35-4.35" />
                  </svg>
                </div>
                <h3>No Freelancers Found</h3>
                <p>
                  {filters.profession
                    ? `No ${filters.profession}s found matching your criteria. Try adjusting your filters.`
                    : "Try adjusting your filters to see more results"}
                </p>
              </div>
            ) : (
              <div className="portfolios-grid">
                {filteredPortfolios.map((portfolio) => {
                  const profileImageUrl = this.getProfileImageUrl(portfolio);
                  const userId =
                    portfolio.userId || portfolio._id || portfolio.id;
                  const hasValidImage = this.isValidImageUrl(profileImageUrl);
                  const profession = portfolio.profession || "";
                  const firstServicePrice =
                    this.getFirstServicePrice(portfolio);
                  const voatId = portfolio.voatId || "Not Available";

                  return (
                    <div key={userId} className="portfolio-card-simple">
                      {/* Wishlist Heart Icon */}
                      <button
                        className={`wishlist-heart-btn ${
                          this.isWishlisted(userId) ? "wishlisted" : ""
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          this.handleWishlistToggle(portfolio);
                        }}
                      >
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill={
                            this.isWishlisted(userId) ? "currentColor" : "none"
                          }
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                        </svg>
                      </button>

                      {/* Profile Image */}
                      <div className="card-image">
                        {hasValidImage ? (
                          <img
                            src={profileImageUrl}
                            alt={`${portfolio.name}'s profile`}
                            onError={(e) => {
                              e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                portfolio.name
                              )}&background=667eea&color=fff&size=120`;
                            }}
                          />
                        ) : (
                          <div
                            className="profile-initial"
                            style={{
                              backgroundColor: this.getColorForName(
                                portfolio.name
                              ),
                            }}
                          >
                            {portfolio.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>

                      {/* Card Content */}
                      <div className="card-content">
                        <h3 className="freelancer-name">{portfolio.name}</h3>
                        <p className="profession">{portfolio.profession}</p>

                        {/* VOAT ID */}
                        <div className="voat-id">
                          <span className="voat-label">VOAT ID:</span>
                          <span className="voat-value">
                            {portfolio.uservoatId}
                          </span>
                        </div>

                        <div className="experience">
                          <span className="experience-label">Experience:</span>
                          <span className="experience-value">
                            {portfolio.workExperience} years
                          </span>
                        </div>
                        <div className="price">
                          <span className="price-label">Starting at:</span>
                          <span className="price-value">
                            ${firstServicePrice.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {/* Card Actions */}
                      <div className="card-actions">
                        <Link
                          to={`/my-portfolio/${userId}`}
                          className="view-portfolio-btn"
                        >
                          View Portfolio
                        </Link>
                        <button
                          className={`add-to-cart-btn ${
                            this.isWishlisted(userId) ? "in-cart" : ""
                          }`}
                          onClick={(e) => {
                            e.preventDefault();
                            this.handleWishlistToggle(portfolio);
                          }}
                        >
                          {this.isWishlisted(userId) ? (
                            <>
                              <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                              >
                                <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z" />
                              </svg>
                              In Cart
                            </>
                          ) : (
                            <>
                              <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                                <line x1="3" y1="6" x2="21" y2="6" />
                                <path d="M16 10a4 4 0 0 1-8 0" />
                              </svg>
                              Add to Cart
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        <Footer />
      </div>
    );
  }
}

export default PortfolioList;
