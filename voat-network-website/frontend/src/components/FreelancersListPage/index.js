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
    },
    baseUrl: "https://voat.onrender.com",
    userImages: {}, // To store user images by userId
    wishlist: [], // Add this to track wishlisted items
  };

  getColorForName = (name) => {
    // Professional color palette
    const colors = [
      "#4C51BF", // Indigo
      "#667EEA", // Purple
      "#2B6CB0", // Blue
      "#319795", // Teal
      "#38A169", // Green
      "#D69E2E", // Yellow
      "#DD6B20", // Orange
      "#E53E3E", // Red
      "#805AD5", // Purple
      "#3182CE", // Blue
    ];

    // Generate a hash code from the name
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }

    // Use the hash to pick a color
    const colorIndex = Math.abs(hash) % colors.length;
    return colors[colorIndex];
  };

  componentDidMount() {
    this.fetchApprovedPortfolios();
    this.loadUserImages();
    this.loadWishlist(); // Add this line
  }

  loadUserImages = () => {
    try {
      // Try to get all users from localStorage
      const users = JSON.parse(localStorage.getItem("users") || "[]");
      const userImages = {};

      // Store each user's image by their ID
      users.forEach((user) => {
        if (user._id || user.id) {
          const userId = user._id || user.id;
          if (user.profileImage) {
            userImages[userId] = user.profileImage;
          }
        }
      });

      // Also check approved submissions for image data
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

      // Detect if we're running in development mode and make adjustments for testing
      const isDevelopment =
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1";

      if (isDevelopment) {
        // Add mock images for development testing
        this.addDevelopmentImages(userImages);
      }

      // Set the images in state
      this.setState({ userImages });
    } catch (error) {
      console.error("Error loading user images:", error);
    }
  };

  addDevelopmentImages = (userImages) => {
    // Add mock images for the user IDs we know exist
    // These match the IDs used in the mockdata
    userImages["user1"] = "/api/placeholder/100/100";
    userImages["user2"] = "/api/placeholder/100/100";
    userImages["user3"] = "/api/placeholder/100/100";

    // Check if we have any users from the MongoDB in image 2
    if (!userImages["6800b8b34a5c2842c84499c7"]) {
      userImages["6800b8b34a5c2842c84499c7"] =
        "/uploads/1744895090022-download (15).jpeg";
    }
  };

  fetchApprovedPortfolios = async () => {
    try {
      // Try to get data from API
      const response = await fetch(`${this.state.baseUrl}/api/portfolios`);

      let portfolioData = [];

      if (response.ok) {
        portfolioData = await response.json();

        // Ensure we only use profession field - explicitly remove headline if it exists
        portfolioData = portfolioData.map((portfolio) => {
          // If no profession but headline exists, use headline as profession
          if (!portfolio.profession && portfolio.headline) {
            portfolio.profession = portfolio.headline;
          }

          // Create a new object without headline
          const { headline, ...portfolioWithoutHeadline } = portfolio;
          return portfolioWithoutHeadline;
        });
      } else {
        // Fallback: Get data from localStorage (for when API fails or during development)
        let approvedPortfolios = JSON.parse(
          localStorage.getItem("approvedSubmissions") || "[]"
        );

        // If no approved submissions in localStorage, use mock data
        if (approvedPortfolios.length === 0) {
          approvedPortfolios = [
            // your mock data here...
          ];
        }

        portfolioData = approvedPortfolios;

        // Ensure we only use profession field in mock data too
        portfolioData = portfolioData.map((portfolio) => {
          if (!portfolio.profession && portfolio.headline) {
            portfolio.profession = portfolio.headline;
          }
          const { headline, ...portfolioWithoutHeadline } = portfolio;
          return portfolioWithoutHeadline;
        });
      }

      // Apply our improved deduplication method
      const uniquePortfolios = this.removeDuplicatePortfolios(portfolioData);

      // Also try to fetch any missing user data that might contain profile images
      this.fetchUserData(uniquePortfolios);

      this.setState({
        portfolios: uniquePortfolios,
        isLoading: false,
      });
    } catch (error) {
      console.error("Error fetching portfolios:", error);

      // Fallback to localStorage data
      const approvedPortfolios = JSON.parse(
        localStorage.getItem("approvedSubmissions") || "[]"
      );

      if (approvedPortfolios.length > 0) {
        // Apply our improved deduplication method to fallback data
        const uniquePortfolios =
          this.removeDuplicatePortfolios(approvedPortfolios);

        // Ensure we only use profession field in fallback data too
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
      // Create a copy of current userImages
      const userImages = { ...this.state.userImages };

      // Try to fetch data for each portfolio
      for (const portfolio of portfolios) {
        const userId = portfolio.userId || portfolio._id || portfolio.id;

        // Skip if we already have an image for this user
        if (userImages[userId]) continue;

        try {
          // Try to get user data from API
          const response = await fetch(
            `${this.state.baseUrl}/api/users/${userId}`
          );

          if (response.ok) {
            const userData = await response.json();
            if (userData && userData.profileImage) {
              userImages[userId] = userData.profileImage;
            }
          }
        } catch (userError) {
          console.log(`Could not fetch user data for ${userId}`);
        }
      }

      // Update state with any new images
      this.setState({ userImages });
    } catch (error) {
      console.error("Error fetching additional user data:", error);
    }
  };

  removeDuplicatePortfolios = (portfolios) => {
    const uniqueUserEmails = new Map();

    // Sort by submission date first (newest first) or by ID if no date
    const sortedPortfolios = [...portfolios].sort((a, b) => {
      // Use submittedDate if available for both
      if (a.submittedDate && b.submittedDate) {
        return new Date(b.submittedDate) - new Date(a.submittedDate);
      }
      // Otherwise fallback to ID comparison (if they're numerical)
      return (b.id || 0) - (a.id || 0);
    });

    // For each item, use a combination of identifiers to ensure uniqueness
    return sortedPortfolios.filter((portfolio) => {
      // Use email as primary unique identifier, or name as fallback
      const uniqueKey = portfolio.email || portfolio.name;

      if (!uniqueKey) return false; // Skip entries without identifiers

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

  resetFilters = () => {
    this.setState({
      filters: {
        profession: "",
        experience: "",
      },
    });
  };

  loadWishlist = () => {
    const userData = JSON.parse(localStorage.getItem("user") || "{}");

    if (userData && userData.id) {
      // Try to get wishlist from localStorage first
      try {
        const wishlist = JSON.parse(
          localStorage.getItem(`wishlist_${userData.id}`) || "[]"
        );
        this.setState({ wishlist });
      } catch (error) {
        console.error("Error loading wishlist from localStorage:", error);
        this.setState({ wishlist: [] });
      }

      // Then try to fetch from API
      fetch(`${this.state.baseUrl}/api/wishlist/${userData.id}`)
        .then((response) => {
          if (response.ok) return response.json();
          throw new Error("Failed to fetch wishlist");
        })
        .then((wishlist) => {
          this.setState({ wishlist });
          // Update localStorage
          localStorage.setItem(
            `wishlist_${userData.id}`,
            JSON.stringify(wishlist)
          );
        })
        .catch((error) => {
          console.error("Error fetching wishlist:", error);
          // We already loaded from localStorage, so it's fine if this fails
        });
    }
  };

  handleWishlistToggle = (portfolio) => {
    const userData = JSON.parse(localStorage.getItem("user") || "{}");

    if (!userData || !userData.id) {
      // Redirect to login if not logged in
      alert("Please login to add items to your wishlist");
      window.location.href = "/login";
      return;
    }

    const { wishlist } = this.state;
    const portfolioId = portfolio.userId || portfolio._id || portfolio.id;

    // Check if item is already in wishlist
    const isWishlisted = wishlist.some(
      (item) => item.id === portfolioId || item.serviceId === portfolioId
    );

    let updatedWishlist;

    if (isWishlisted) {
      // Remove from wishlist
      updatedWishlist = wishlist.filter(
        (item) => item.id !== portfolioId && item.serviceId !== portfolioId
      );
    } else {
      // Add to wishlist
      const newWishlistItem = {
        id: Math.random().toString(36).substr(2, 9), // Generate unique ID for wishlist item
        serviceId: portfolioId,
        service: portfolio.profession,
        price: portfolio.workExperience
          ? parseFloat(portfolio.workExperience) * 100
          : 0, // Just a mock price based on experience
        provider: portfolio.name,
        profileImage: this.getProfileImageUrl(portfolio),
      };

      updatedWishlist = [...wishlist, newWishlistItem];
    }

    // Update state
    this.setState({ wishlist: updatedWishlist });

    // Save to localStorage
    localStorage.setItem(
      `wishlist_${userData.id}`,
      JSON.stringify(updatedWishlist)
    );

    // Send to server
    fetch(`${this.state.baseUrl}/api/wishlist/${userData.id}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updatedWishlist),
    }).catch((error) => {
      console.error("Error updating wishlist:", error);
      // We already updated localStorage, so it's fine if this fails
    });
  };

  isWishlisted = (portfolioId) => {
    const { wishlist } = this.state;
    return wishlist.some(
      (item) => item.id === portfolioId || item.serviceId === portfolioId
    );
  };

  getUniqueOptions = (field) => {
    const { portfolios } = this.state;

    // Special handling for profession to ensure we never use headline
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

    // Default handling for other fields
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

    // Check if profileImage is valid
    if (portfolio.profileImage) {
      if (
        portfolio.profileImage.startsWith("http") ||
        portfolio.profileImage.startsWith("data:image")
      ) {
        return portfolio.profileImage;
      }

      // Handle uploads path
      if (portfolio.profileImage.startsWith("/uploads")) {
        return `${this.state.baseUrl}${portfolio.profileImage}`;
      }
    }

    // Check userImages state
    if (this.state.userImages[userId]) {
      return this.state.userImages[userId];
    }

    // Fallback to placeholder
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(
      portfolio.name
    )}&background=random&color=fff&size=100`;
  };

  isValidImageUrl = (url) => {
    if (!url) return false;

    // Check if it's a valid URL format or a path we expect to work
    return (
      url.startsWith("http") ||
      url.startsWith("data:image") ||
      url.startsWith("/uploads") ||
      url.startsWith("/api/placeholder")
    );
  };

  handleViewPortfolio = (portfolio) => {
    // Get the userId from the portfolio, ensuring we get the MongoDB ObjectId when possible
    const userId = portfolio.userId || portfolio._id || portfolio.id;

    // Check if this is a MongoDB ObjectId string (24 hex characters)
    if (userId && typeof userId === "string" && userId.length === 24) {
      // Redirect to my-portfolio/:userId using the proper MongoDB ID
      window.location.href = `/my-portfolio/${userId}`;
    } else {
      // Handle case where we don't have a valid MongoDB ID
      console.log("Using non-MongoDB ID:", userId);
      // Still try to navigate with whatever ID we have
      window.location.href = `/my-portfolio/${userId}`;
    }
  };

  render() {
    const { portfolios, isLoading, error, filters } = this.state;

    // Apply filters
    const filteredPortfolios = portfolios.filter((portfolio) => {
      // Only show approved portfolios
      if (portfolio.status !== "approved") {
        return false;
      }

      // Filter by profession if selected
      if (filters.profession && portfolio.profession !== filters.profession) {
        return false;
      }

      // Filter by experience if selected
      if (filters.experience) {
        const expValue = parseInt(portfolio.workExperience);

        if (filters.experience === "1-3" && (expValue < 1 || expValue > 3)) {
          return false;
        } else if (
          filters.experience === "4-7" &&
          (expValue < 4 || expValue > 7)
        ) {
          return false;
        } else if (filters.experience === "8+" && expValue < 8) {
          return false;
        }
      }

      return true;
    });

    if (isLoading) {
      return <div className="portfolios-loading">Loading portfolios...</div>;
    }

    if (error) {
      return <div className="portfolios-error">{error}</div>;
    }

    const professions = this.getUniqueOptions("profession");

    return (
      <>
        <NavBar />
        <div className="portfolios-container">
          <div className="portfolios-header">
            <h1>Professional Portfolio Directory</h1>
            <p>
              Connect with talented freelancers and professionals in your
              industry
            </p>
          </div>

          <div className="portfolios-filters">
            <div className="filter-controls">
              <div className="filter-group">
                <label htmlFor="profession">Profession</label>
                <select
                  id="profession"
                  name="profession"
                  value={filters.profession}
                  onChange={this.handleFilterChange}
                >
                  <option value="">All Professions</option>
                  {professions.map((profession, index) => (
                    <option key={index} value={profession}>
                      {profession}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label htmlFor="experience">Experience</label>
                <select
                  id="experience"
                  name="experience"
                  value={filters.experience}
                  onChange={this.handleFilterChange}
                >
                  <option value="">All Experience Levels</option>
                  <option value="1-3">1-3 Years</option>
                  <option value="4-7">4-7 Years</option>
                  <option value="8+">8+ Years</option>
                </select>
              </div>

              <button className="reset-filters-btn" onClick={this.resetFilters}>
                Reset Filters
              </button>
            </div>
          </div>

          {filteredPortfolios.length === 0 ? (
            <div className="no-results">
              <div className="no-results-icon">🔍</div>
              <h3>No Portfolios Found</h3>
              <p>
                Try adjusting your filters or check back later for new
                professionals.
              </p>
            </div>
          ) : (
            <div className="portfolios-grid">
              {filteredPortfolios.map((portfolio) => {
                // Get the profile image URL
                const profileImageUrl = this.getProfileImageUrl(portfolio);
                const userId =
                  portfolio.userId || portfolio._id || portfolio.id;
                const hasValidImage = this.isValidImageUrl(profileImageUrl);

                // Ensure profession is available without headline fallback
                const profession = portfolio.profession || "";

                return (
                  <div key={userId} className="portfolio-card">
                    <div className="portfolio-header">
                      <div
                        className="wishlist-icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          this.handleWishlistToggle(portfolio);
                        }}
                      >
                        {this.isWishlisted(userId) ? (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="red"
                            stroke="red"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                          </svg>
                        ) : (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                          </svg>
                        )}
                      </div>
                      <div className="portfolio-image">
                        {hasValidImage ? (
                          <img
                            src={profileImageUrl}
                            alt={`${portfolio.name}'s profile`}
                            className="profile-img"
                            onError={(e) => {
                              e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                portfolio.name
                              )}&background=random&color=fff&size=100`;
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
                      <div className="portfolio-title">
                        <h3>{portfolio.name}</h3>
                        <p className="profession">{profession}</p>
                      </div>
                    </div>

                    <div className="portfolio-details">
                      <div className="detail-row">
                        <span className="detail-label">Experience</span>
                        <span className="detail-value">
                          {portfolio.workExperience} years
                        </span>
                      </div>
                    </div>

                    <div className="portfolio-actions">
                      <Link
                        to={`/my-portfolio/${
                          portfolio.userId || portfolio._id || portfolio.id
                        }`}
                        className="view-portfolio-btn"
                      >
                        View Portfolio
                      </Link>
                      <button className="contact-btn">Contact</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <Footer />
      </>
    );
  }
}

export default PortfolioList;
