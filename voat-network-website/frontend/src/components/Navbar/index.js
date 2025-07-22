import React, { Component } from "react";
import { Link } from "react-router-dom";
import { HashLink } from "react-router-hash-link";
import CartPage from "../CartPage";
import {
  User,
  Menu,
  LogOut,
  X,
  Check,
  Search,
  ShoppingCart,
  ChevronDown,
} from "lucide-react";
import "./index.css";

class NavBar extends Component {
  state = {
    isMobile: false,
    isTablet: false,
    menuOpen: false,
    profileDropdownOpen: false,
    isLoggedIn: false,
    user: null,
    showSpecialOffer: true,
    prevScrollPos: window.pageYOffset,
    showLogoutNotification: false,
    showLoginNotification: false,
    showWelcomeMessage: false,
    searchQuery: "",
    activeMenu: "",
    cartSidebarOpen: false,
    currentMessageIndex: 0,
  };

  // Backend URLs - will try both environments
  backendUrls = [
    "https://voat.onrender.com", // Production/Render
    "http://localhost:5000", // Local development (keep for dev)
  ];

  // Initialize class properties for notification timers
  loginNotificationTimer = null;
  logoutNotificationTimer = null;
  redirectTimer = null;
  loginCheckInterval = null;
  welcomeMessageTimer = null;
  storageEventBound = false;

  componentDidMount() {
    window.navbarComponent = this;

    this.checkScreenSize();
    this.updateActiveMenu();

    window.addEventListener("resize", this.checkScreenSize);
    document.addEventListener("mousedown", this.handleClickOutside);

    // Ensure we only bind the storage event listener once
    if (!this.storageEventBound) {
      window.addEventListener("storage", this.handleStorageEvent);
      this.storageEventBound = true;
    }

    window.addEventListener("scroll", this.handleScroll);

    // Check which backend is available
    this.checkBackendAvailability();

    // Check initial login stat
    // us without showing notifications
    this.loadUserData();

    this.startCarousel();

    // Set up interval to check for login status changes
    this.loginCheckInterval = setInterval(
      this.checkLoginStatusPeriodically,
      2000
    );

    // Add a direct method to force show login notification
    window.showLoginNotification = this.forceShowLoginNotification;

    // Add a method to show welcome message
    window.showWelcomeMessage = this.showWelcomeMessage;

    console.log("NavBar mounted with notifications setup");
  }

  // Method to determine active menu based on current path
  updateActiveMenu = () => {
    const { pathname } = window.location;

    if (pathname === "/") {
      this.setState({ activeMenu: "home" });
    } else if (pathname.includes("/services")) {
      this.setState({ activeMenu: "services" });
    } else if (pathname.includes("/portfolio-list")) {
      this.setState({ activeMenu: "portfolio" });
    } else if (pathname.includes("/#contact")) {
      this.setState({ activeMenu: "contact" });
    } else {
      this.setState({ activeMenu: "" });
    }
  };

  startCarousel = () => {
    this.carouselInterval = setInterval(() => {
      const messages = this.getSpecialOfferText();
      this.setState((prevState) => ({
        currentMessageIndex:
          (prevState.currentMessageIndex + 1) % messages.length,
      }));
    }, 4000); // Change message every 4 seconds (increased from 3)
  };

  // Get initials from user name
  getUserInitials = (name) => {
    if (!name || typeof name !== "string") return "U";

    // Clean the name and split by spaces
    const cleanName = name.trim();
    const words = cleanName.split(/\s+/).filter((word) => word.length > 0);

    if (words.length === 0) return "U";

    if (words.length === 1) {
      // Single word - take first two characters if available
      const word = words[0];
      if (word.length >= 2) {
        return word.substring(0, 2).toUpperCase();
      } else {
        return word.charAt(0).toUpperCase();
      }
    } else {
      // Multiple words - take first letter of first two words
      return words
        .slice(0, 2)
        .map((word) => word.charAt(0).toUpperCase())
        .join("");
    }
  };

  // Check which backend is available
  checkBackendAvailability = async () => {
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

  fetchUserFromDatabase = async (userId) => {
    try {
      const backendUrl = this.getBackendUrl();
      console.log("Fetching user data from database for userId:", userId);

      const response = await fetch(`${backendUrl}/api/user/${userId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const result = await response.json();
        console.log("Fresh user data from database:", result);

        if (result.success && result.user) {
          // Update localStorage with fresh data
          localStorage.setItem("user", JSON.stringify(result.user));

          console.log("User data updated in localStorage from database");
          return result.user;
        } else {
          console.error("Invalid response structure from database");
          return null;
        }
      } else {
        console.error(
          "Failed to fetch user data from database:",
          response.status
        );
        return null;
      }
    } catch (error) {
      console.error("Error fetching user data from database:", error);
      return null;
    }
  };

  // Load user data directly from localStorage only
  loadUserData = async () => {
    try {
      const userDataString = localStorage.getItem("user");
      if (userDataString) {
        try {
          const localUserData = JSON.parse(userDataString);
          console.log("Local user data loaded:", localUserData);

          // First set state with local data (without profile image)
          this.setState({
            user: {
              ...localUserData,
              profileImage: null, // Don't use localStorage profile image
            },
            isLoggedIn: true,
          });

          // If we have a user ID, fetch fresh data from database
          if (localUserData.id) {
            const freshUserData = await this.fetchUserFromDatabase(
              localUserData.id
            );

            if (freshUserData) {
              // Update state with fresh data from database
              this.setState({
                user: freshUserData,
                isLoggedIn: true,
              });

              console.log(
                "User data updated from database, profile image:",
                freshUserData.profileImage
              );
            } else {
              // Keep local data but without profile image if database fetch fails
              console.log(
                "Database fetch failed, keeping local data without profile image"
              );
            }
          } else {
            console.error("No user ID found in localStorage data");
          }
        } catch (error) {
          console.error("Error parsing user data:", error);
          this.setState({
            isLoggedIn: false,
            user: null,
          });
        }
      } else {
        this.setState({
          isLoggedIn: false,
          user: null,
        });
      }
    } catch (error) {
      console.error("Error loading user data:", error);
      this.setState({
        isLoggedIn: false,
        user: null,
      });
    }
  };

  // Show welcome message
  showWelcomeMessage = () => {
    console.log("Showing welcome message");

    // Clear any existing timer
    clearTimeout(this.welcomeMessageTimer);

    // First load user data to make sure we have the latest
    this.loadUserData();

    // Show welcome message
    this.setState({ showWelcomeMessage: true });

    // Set timer to hide it after 8 seconds
    this.welcomeMessageTimer = setTimeout(() => {
      console.log("Hiding welcome message after 8 seconds");
      this.setState({ showWelcomeMessage: false });
    }, 8000);
  };

  // Direct method to force show login notification
  forceShowLoginNotification = () => {
    console.log("Force showing login notification");

    // Clear any existing timer
    clearTimeout(this.loginNotificationTimer);

    // First load user data to make sure we have the latest
    this.loadUserData();

    // Show notification
    this.setState({ showLoginNotification: true });

    // Set timer to hide it after 5 seconds
    this.loginNotificationTimer = setTimeout(() => {
      console.log("Hiding login notification after 5 seconds");
      this.setState({ showLoginNotification: false });
    }, 5000);
  };

  componentWillUnmount() {
    // Remove global reference
    if (window.navbarComponent === this) {
      delete window.navbarComponent;
    }

    // Remove global notification function
    delete window.showLoginNotification;
    delete window.showWelcomeMessage;

    window.removeEventListener("resize", this.checkScreenSize);
    document.removeEventListener("mousedown", this.handleClickOutside);

    if (this.storageEventBound) {
      window.removeEventListener("storage", this.handleStorageEvent);
      this.storageEventBound = false;
    }

    window.removeEventListener("scroll", this.handleScroll);

    // Clean up notification timers and intervals
    clearTimeout(this.loginNotificationTimer);
    clearTimeout(this.logoutNotificationTimer);
    clearTimeout(this.redirectTimer);
    clearTimeout(this.welcomeMessageTimer);
    clearInterval(this.loginCheckInterval);
    clearInterval(this.carouselInterval);
  }

  // Method to check login status periodically
  checkLoginStatusPeriodically = async () => {
    try {
      let userData = null;
      try {
        const userDataStr = localStorage.getItem("user");
        userData = userDataStr ? JSON.parse(userDataStr) : null;
      } catch (e) {
        console.error("Error parsing user data:", e);
        userData = null;
      }

      const wasLoggedIn = this.state.isLoggedIn;
      const isLoggedIn = !!userData;

      // If login state changed to logged in
      if (!wasLoggedIn && isLoggedIn) {
        console.log("Detected login via interval check");
        // Load latest user data from database
        await this.loadUserData();
        this.setState({ expectingLogin: false });
      }
      // If logout happened
      else if (wasLoggedIn && !isLoggedIn) {
        console.log("Detected logout via interval check");
        this.handleExternalLogout();
      }
      // Update user data if it changed in localStorage, but prioritize database for profile image
      else if (isLoggedIn && userData && this.state.user) {
        const currentUser = this.state.user;

        // Check if important fields changed
        if (
          userData.name !== currentUser.name ||
          userData.email !== currentUser.email ||
          userData.id !== currentUser.id ||
          userData.role !== currentUser.role ||
          userData.voatId !== currentUser.voatId
        ) {
          console.log(
            "User data changed in localStorage, fetching fresh data from database"
          );

          // Fetch fresh data from database
          if (userData.id) {
            const freshUserData = await this.fetchUserFromDatabase(userData.id);
            if (freshUserData) {
              this.setState({ user: freshUserData });
            } else {
              // Fallback to localStorage data but without profile image
              this.setState({
                user: {
                  ...userData,
                  profileImage: null,
                },
              });
            }
          }
        }
      }
    } catch (error) {
      console.error("Error in periodic login check:", error);
    }
  };

  // Method to prepare for an upcoming login
  prepareForLogin = () => {
    console.log("NavBar is now expecting a login");
    this.setState({ expectingLogin: true });
  };

  handleScroll = () => {
    const currentScrollPos = window.pageYOffset;
    const { prevScrollPos } = this.state;

    // Determine whether to show or hide the special offer based on scroll direction and position
    const isScrollingDown = prevScrollPos < currentScrollPos;
    const isScrolledPastThreshold = currentScrollPos > 50;

    this.setState({
      showSpecialOffer: !isScrollingDown && !isScrolledPastThreshold,
      prevScrollPos: currentScrollPos,
    });
  };

  handleStorageEvent = async (event) => {
    if (event.key === "user") {
      console.log(
        "Storage event detected:",
        event.newValue ? "Login" : "Logout"
      );

      // Check if user was added (login) or removed (logout)
      if (event.newValue) {
        // User data was added - login occurred
        try {
          const userData = JSON.parse(event.newValue);

          if (!this.state.isLoggedIn) {
            console.log("Handling login from storage event");
            // Fetch fresh data from database instead of using localStorage
            if (userData.id) {
              const freshUserData = await this.fetchUserFromDatabase(
                userData.id
              );
              if (freshUserData) {
                this.handleLogin(freshUserData);
              } else {
                // Fallback to storage data without profile image
                this.handleLogin({
                  ...userData,
                  profileImage: null,
                });
              }
            } else {
              this.handleLogin({
                ...userData,
                profileImage: null,
              });
            }
          } else {
            // Just update user data from database
            if (userData.id) {
              const freshUserData = await this.fetchUserFromDatabase(
                userData.id
              );
              if (freshUserData) {
                this.setState({ user: freshUserData });
              }
            }
          }
        } catch (e) {
          console.error("Error parsing user data from storage event:", e);
        }
      } else {
        // User data was removed - logout occurred
        if (this.state.isLoggedIn) {
          this.handleExternalLogout();
        }
      }
    }
  };

  // Handle login (show notification and update state)
  handleLogin = (userData) => {
    try {
      let user = userData;

      // If userData is a string, parse it
      if (typeof userData === "string") {
        user = JSON.parse(userData);
      }

      console.log("Handling login for user:", user.name);
      console.log("Profile image from database:", user.profileImage);

      // Don't modify profile image path - use exactly what database returns
      this.setState({
        isLoggedIn: true,
        user: user,
        showLoginNotification: true,
      });

      // Set timer to hide login notification after 5 seconds
      clearTimeout(this.loginNotificationTimer);
      this.loginNotificationTimer = setTimeout(() => {
        console.log("Hiding login notification after 5 seconds");
        this.setState({ showLoginNotification: false });
      }, 5000);
    } catch (error) {
      console.error("Error handling login:", error);
    }
  };

  // Handle logout initiated externally (from storage event)
  handleExternalLogout = () => {
    console.log("External logout detected");

    this.setState({
      isLoggedIn: false,
      user: null,
      showLogoutNotification: true,
    });

    // Set timer to hide logout notification after 3 seconds
    clearTimeout(this.logoutNotificationTimer);
    this.logoutNotificationTimer = setTimeout(() => {
      console.log("Hiding logout notification after 3 seconds");
      this.setState({ showLogoutNotification: false });
    }, 3000);
  };

  // Handle user-initiated logout (clicking the logout button)
  handleLogout = () => {
    console.log("Manual logout initiated");

    // First set state to show the notification
    this.setState({
      isLoggedIn: false,
      user: null,
      profileDropdownOpen: false,
      showLogoutNotification: true,
    });

    // Remove user data from localStorage - this triggers storage event
    localStorage.removeItem("user");

    // Set timer to hide logout notification after 3 seconds
    clearTimeout(this.logoutNotificationTimer);
    this.logoutNotificationTimer = setTimeout(() => {
      console.log("Hiding logout notification after 3 seconds");
      this.setState({ showLogoutNotification: false });

      // Redirect to home after notification is shown
      clearTimeout(this.redirectTimer);
      this.redirectTimer = setTimeout(() => {
        window.location.href = "/";
      }, 100);
    }, 3000);
  };

  profileDropdownRef = React.createRef();

  checkScreenSize = () => {
    this.setState({
      isMobile: window.innerWidth < 768,
      isTablet: window.innerWidth >= 768 && window.innerWidth < 1024,
    });
  };

  toggleCartSidebar = () => {
    this.setState((prevState) => ({
      cartSidebarOpen: !prevState.cartSidebarOpen,
    }));
  };

  closeCartSidebar = () => {
    this.setState({ cartSidebarOpen: false });
  };

  toggleMenu = () => {
    this.setState((prevState) => ({
      menuOpen: !prevState.menuOpen,
    }));
  };

  toggleProfileDropdown = () => {
    this.setState((prevState) => ({
      profileDropdownOpen: !prevState.profileDropdownOpen,
    }));
  };

  handleClickOutside = (event) => {
    if (
      this.profileDropdownRef.current &&
      !this.profileDropdownRef.current.contains(event.target) &&
      this.state.profileDropdownOpen
    ) {
      this.setState({ profileDropdownOpen: false });
    }
  };

  closeNotification = (type) => {
    if (type === "login") {
      clearTimeout(this.loginNotificationTimer);
      this.setState({ showLoginNotification: false });
    } else if (type === "logout") {
      clearTimeout(this.logoutNotificationTimer);
      this.setState({ showLogoutNotification: false });
    } else if (type === "welcome") {
      clearTimeout(this.welcomeMessageTimer);
      this.setState({ showWelcomeMessage: false });
    }
  };

  getSpecialOfferText = () => {
    const { user } = this.state;

    if (!user) {
      return [
        "🔥 Special Launch Offer - 30% off on all services!",
        "📅 Book your consultation today and save big!",
        "🚀 Join thousands of satisfied customers!",
        "💎 Premium services at unbeatable prices!",
      ];
    }

    // Check user role to determine the messages
    const role = user.role || "";

    if (
      role === "freelancer" ||
      role === "Freelancer" ||
      role === "service provider" ||
      role === "Service Provider" ||
      role === "Freelancer/Service Provider" ||
      role.toLowerCase().includes("freelancer") ||
      role.toLowerCase().includes("service provider")
    ) {
      return [
        "🚀 Start your freelancing journey today with VOAT!",
        "💼 Grow your business with our platform!",
        "🌟 Connect with clients worldwide!",
        "📈 Boost your freelance career now!",
      ];
    } else {
      return [
        "🔥 Special Launch Offer - 30% off on all services!",
        "📅 Book your consultation today and save big!",
        "🚀 Join thousands of satisfied customers!",
        "💎 Premium services at unbeatable prices!",
      ];
    }
  };

  // Method to create smooth scroll to top function
  scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // Handle search input change
  handleSearchChange = (e) => {
    this.setState({ searchQuery: e.target.value });
  };

  // Handle search form submission
  handleSearchSubmit = (e) => {
    e.preventDefault();
    const { searchQuery } = this.state;
    if (searchQuery.trim()) {
      window.location.href = `/portfolio-list?profession=${encodeURIComponent(
        searchQuery.trim()
      )}`;
    }
  };

  // Manual update method for testing/debugging
  updateUserFromLocalStorage = () => {
    this.loadUserData();
  };

  render() {
    const {
      isMobile,
      menuOpen,
      profileDropdownOpen,
      isLoggedIn,
      showSpecialOffer,
      user,
      showLogoutNotification,
      showLoginNotification,
      showWelcomeMessage,
      searchQuery,
      activeMenu,
      cartSidebarOpen,
    } = this.state;

    // Debug log
    console.log("Current user state in NavBar render:", user);

    // Get profile image from database (could be null)
    const profileImage = user?.profileImage;
    const userInitials = user ? this.getUserInitials(user.name) : "";
    const voatId = user?.voatId || "";

    // Helper function to get full image URL
    const getFullImageUrl = (imagePath) => {
      if (!imagePath) return null;
      if (imagePath.startsWith("http")) return imagePath;

      const backendUrl = this.getBackendUrl();
      // Remove leading slashes and construct full URL
      const cleanPath = imagePath.replace(/^\/+/, "");
      return `${backendUrl}/${cleanPath}`;
    };

    const fullProfileImageUrl = profileImage
      ? getFullImageUrl(profileImage)
      : null;

    console.log("Profile image path:", profileImage);
    console.log("Full profile image URL:", fullProfileImageUrl);

    return (
      <>
        <header className={showSpecialOffer ? "" : "navbar-sticky"}>
          <div className="navbar-container">
            <div className="navbar-special-offer">
              <div className="carousel-container">
                {this.getSpecialOfferText().map((message, index) => (
                  <div
                    key={index}
                    className={`carousel-message ${
                      index === this.state.currentMessageIndex ? "active" : ""
                    }`}
                  >
                    {message}
                  </div>
                ))}
              </div>
            </div>
            <nav
              className={`navbar ${showSpecialOffer ? "" : "navbar-no-offer"}`}
            >
              <div className="navbar-left-section">
                {/* Left-side menu items - UPDATED with active classes */}
                <ul className="left-menu">
                  <li className={activeMenu === "home" ? "active" : ""}>
                    <Link
                      to="/"
                      onClick={() => {
                        this.scrollToTop();
                        this.setState({ activeMenu: "home" });
                      }}
                    >
                      Home
                    </Link>
                  </li>
                  <li className={activeMenu === "services" ? "active" : ""}>
                    <Link
                      to="/services"
                      onClick={() => {
                        this.scrollToTop();
                        this.setState({ activeMenu: "services" });
                      }}
                    >
                      Services
                    </Link>
                  </li>
                  <li className={activeMenu === "portfolio" ? "active" : ""}>
                    <Link
                      to="/portfolio-list"
                      onClick={() => {
                        this.scrollToTop();
                        this.setState({ activeMenu: "portfolio" });
                      }}
                    >
                      Portfolios
                    </Link>
                  </li>
                  <li className={activeMenu === "contact" ? "active" : ""}>
                    {/* Moved Contact Us to left menu */}
                    <HashLink
                      smooth
                      to="/#contact"
                      onClick={() => {
                        this.scrollToTop();
                        this.setState({ activeMenu: "contact" });
                      }}
                    >
                      Contact Us
                    </HashLink>
                  </li>
                </ul>
              </div>

              <div className="navbar-logo">
                <Link to="/" onClick={this.scrollToTop}>
                  <img
                    src="https://res.cloudinary.com/dffu1ungl/image/upload/v1744606803/VOAT_LOGO_zo7lk5.png"
                    alt="Logo"
                    className="nav-logo"
                  />
                </Link>
              </div>

              <div className="navbar-right-section">
                {/* Search bar */}
                <div className="navbar-search">
                  <form onSubmit={this.handleSearchSubmit}>
                    <input
                      type="text"
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={this.handleSearchChange}
                      aria-label="Search"
                    />
                    <button type="submit" aria-label="Submit search">
                      <Search size={16} />
                    </button>
                  </form>
                </div>

                {/* User profile when logged in with profile image or initials */}
                {isLoggedIn && user && (
                  <div
                    className="navbar-user-profile"
                    ref={this.profileDropdownRef}
                  >
                    <button
                      className="navbar-cart"
                      onClick={this.toggleCartSidebar}
                      aria-label="Open shopping cart"
                    >
                      <ShoppingCart size={20} />
                    </button>

                    {/* User profile with VOAT ID - REDESIGNED */}
                    <div
                      className="user-profile-container"
                      onClick={this.toggleProfileDropdown}
                    >
                      <div className="user-avatar-wrapper">
                        {profileImage ? (
                          <img
                            src={profileImage}
                            alt="User"
                            className="navbar-user-image"
                            onError={(e) => {
                              console.log("Image load error:", e);
                              e.target.onerror = null;

                              // Try with backend URL if it's a relative path
                              if (
                                !profileImage.startsWith("http") &&
                                this.getBackendUrl()
                              ) {
                                const backendUrl = this.getBackendUrl();
                                const cleanPath = profileImage.replace(
                                  /^\/+/,
                                  ""
                                );
                                e.target.src = `${backendUrl}/${cleanPath}`;
                                return; // Give it another chance to load
                              }

                              e.target.src = ""; // Clear the source if second attempt fails
                              e.target.style.display = "none"; // Hide the img

                              // Add initials to the parent element
                              const parent = e.target.parentNode;
                              if (
                                parent &&
                                !parent.querySelector(".user-initials")
                              ) {
                                const initialsElem =
                                  document.createElement("div");
                                initialsElem.className = "user-initials";
                                initialsElem.innerText = userInitials;
                                parent.appendChild(initialsElem);
                              }
                            }}
                          />
                        ) : (
                          <div className="user-initials">{userInitials}</div>
                        )}
                      </div>

                      {voatId && (
                        <div className="navbar-voat-id">
                          <span title="VOAT ID">{voatId}</span>
                        </div>
                      )}
                    </div>

                    {/* Profile Dropdown Menu */}
                    {profileDropdownOpen && (
                      <div className="profile-dropdown">
                        <Link
                          to="/user-dashboard"
                          className="dropdown-item"
                          onClick={() =>
                            this.setState({ profileDropdownOpen: false })
                          }
                        >
                          <User size={16} />
                          <span>Dashboard</span>
                        </Link>
                        <div
                          className="dropdown-item"
                          onClick={this.handleLogout}
                        >
                          <LogOut size={16} />
                          <span>Logout</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Desktop auth button */}
                {!isLoggedIn && (
                  <div className="navbar-auth desktop-auth">
                    <Link
                      to="/login"
                      className="get-started-btn"
                      onClick={this.scrollToTop}
                    >
                      Login
                    </Link>
                  </div>
                )}
              </div>

              {/* Mobile auth button and hamburger */}
              {isMobile && (
                <div className="mobile-nav-controls">
                  {!isLoggedIn && (
                    <Link
                      to="/login"
                      className="get-started-btn mobile-auth"
                      onClick={this.scrollToTop}
                    >
                      login
                    </Link>
                  )}

                  <div className="navbar-hamburger" onClick={this.toggleMenu}>
                    {menuOpen ? null : <Menu size={24} />}
                  </div>
                </div>
              )}

              {/* Mobile menu - UPDATED with active classes */}
              <div className={`mobile-menu ${menuOpen ? "active" : ""}`}>
                <div className="mobile-menu-header">
                  <div className="mobile-menu-close" onClick={this.toggleMenu}>
                    <X size={24} />
                  </div>
                </div>

                {/* Mobile user profile with VOAT ID */}
                {isLoggedIn && user && (
                  <li className="mobile-user-info">
                    <div className="mobile-user-profile-container">
                      <div className="user-avatar-wrapper-mobile">
                        {profileImage ? (
                          <img
                            src={profileImage}
                            alt="User"
                            className="navbar-user-image-mobile"
                            onError={(e) => {
                              console.log("Mobile image load error:", e);
                              e.target.onerror = null;

                              // Try with backend URL if it's a relative path
                              if (
                                !profileImage.startsWith("http") &&
                                this.getBackendUrl()
                              ) {
                                const backendUrl = this.getBackendUrl();
                                const cleanPath = profileImage.replace(
                                  /^\/+/,
                                  ""
                                );
                                e.target.src = `${backendUrl}/${cleanPath}`;
                                return; // Give it another chance to load
                              }

                              e.target.src = ""; // Clear the source if second attempt fails
                              e.target.style.display = "none"; // Hide the img

                              // Add initials to the parent element
                              const parent = e.target.parentNode;
                              if (
                                parent &&
                                !parent.querySelector(".user-initials-mobile")
                              ) {
                                const initialsElem =
                                  document.createElement("div");
                                initialsElem.className = "user-initials-mobile";
                                initialsElem.innerText = userInitials;
                                parent.appendChild(initialsElem);
                              }
                            }}
                          />
                        ) : (
                          <div className="user-initials-mobile">
                            {userInitials}
                          </div>
                        )}
                      </div>

                      {voatId && <div className="mobile-voat-id">{voatId}</div>}
                    </div>
                  </li>
                )}

                <ul className="mobile-menu-items">
                  <li className={activeMenu === "home" ? "active" : ""}>
                    <Link
                      to="/"
                      onClick={() => {
                        this.scrollToTop();
                        this.setState({ activeMenu: "home" });
                        this.toggleMenu();
                      }}
                    >
                      Home
                    </Link>
                  </li>
                  <li className={activeMenu === "services" ? "active" : ""}>
                    <Link
                      to="/services"
                      onClick={() => {
                        this.scrollToTop();
                        this.setState({ activeMenu: "services" });
                        this.toggleMenu();
                      }}
                    >
                      Services
                    </Link>
                  </li>
                  <li className={activeMenu === "portfolio" ? "active" : ""}>
                    <Link
                      to="/portfolio-list"
                      onClick={() => {
                        this.scrollToTop();
                        this.setState({ activeMenu: "portfolio" });
                        this.toggleMenu();
                      }}
                    >
                      Portfolio
                    </Link>
                  </li>
                  <li className={activeMenu === "contact" ? "active" : ""}>
                    <HashLink
                      smooth
                      to="/#contact"
                      onClick={() => {
                        this.setState({ activeMenu: "contact" });
                        this.toggleMenu();
                      }}
                    >
                      Contact Us
                    </HashLink>
                  </li>
                  {isLoggedIn && user && (
                    <>
                      <li>
                        <button
                          className="mobile-cart-btn"
                          onClick={() => {
                            this.toggleCartSidebar();
                            this.toggleMenu();
                          }}
                        >
                          <ShoppingCart size={16} className="menu-icon" />
                          <span>Cart</span>
                        </button>
                      </li>
                      <li>
                        <Link
                          to="/user-dashboard"
                          onClick={() => {
                            this.toggleMenu();
                          }}
                        >
                          <User size={16} className="menu-icon" />
                          <span>Dashboard</span>
                        </Link>
                      </li>
                      <li className="mobile-logout-item">
                        <button
                          className="get-started-btn mobile-auth"
                          onClick={this.handleLogout}
                        >
                          <LogOut size={16} className="logout-icon" />
                          <span>Logout</span>
                        </button>
                      </li>
                    </>
                  )}
                </ul>
              </div>
            </nav>
          </div>
        </header>

        {/* Notifications Container */}
        <div className="notifications-container">
          {/* Login notification */}
          <div
            className={`notification login-notification ${
              showLoginNotification ? "show" : ""
            }`}
          >
            <span className="notification-icon">
              <Check size={14} strokeWidth={3} />
            </span>
            <span>Successfully logged in!</span>
            <button
              className="notification-close"
              onClick={() => this.closeNotification("login")}
              aria-label="Close"
            >
              <X size={14} />
            </button>
          </div>

          {/* Logout notification */}
          <div
            className={`notification logout-notification ${
              showLogoutNotification ? "show" : ""
            }`}
          >
            <span className="notification-icon">
              <Check size={14} strokeWidth={3} />
            </span>
            <span>Session timeout. Please login again.</span>
            <button
              className="notification-close"
              onClick={() => this.closeNotification("logout")}
              aria-label="Close"
            >
              <X size={14} />
            </button>
          </div>

          {/* Welcome message notification */}
          <div
            className={`notification welcome-notification ${
              showWelcomeMessage ? "show" : ""
            }`}
          >
            <span className="notification-icon">
              <Check size={14} strokeWidth={3} />
            </span>
            <span>
              You have registered successfully. Welcome to VOAT network{" "}
              {user?.name || "new user"}!
            </span>
            <button
              className="notification-close"
              onClick={() => this.closeNotification("welcome")}
              aria-label="Close"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        <CartPage isOpen={cartSidebarOpen} onClose={this.closeCartSidebar} />
      </>
    );
  }
}

export default NavBar;
