import React, { Component } from "react";
import { Link } from "react-router-dom";
import { HashLink } from "react-router-hash-link";
import { User, Menu, LogOut, X, Check } from "lucide-react";
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
  };

  // Backend URLs - will try both environments
  backendUrls = [
    "https://voat.onrender.com", // Production/Render
    "http://localhost:5000", // Local development
  ];

  // Initialize class properties for notification timers
  loginNotificationTimer = null;
  logoutNotificationTimer = null;
  redirectTimer = null;
  loginCheckInterval = null;
  welcomeMessageTimer = null;
  storageEventBound = false;

  componentDidMount() {
    // Make the NavBar component accessible globally for testing
    window.navbarComponent = this;

    this.checkScreenSize();

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

    // Check initial login status without showing notifications
    this.loadUserData();

    // Set up interval to check for login status changes (reduced frequency)
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

  // Load user data directly from localStorage only
  loadUserData = () => {
    try {
      const userDataString = localStorage.getItem("user");
      if (userDataString) {
        try {
          const userData = JSON.parse(userDataString);
          console.log("User data loaded from localStorage:", userData);

          // Update state with localStorage data
          this.setState({
            user: userData,
            isLoggedIn: true,
          });
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
  }

  // Method to check login status periodically
  checkLoginStatusPeriodically = () => {
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
        // Load latest user data from localStorage
        this.loadUserData();
        this.setState({ expectingLogin: false });
      }
      // If logout happened
      else if (wasLoggedIn && !isLoggedIn) {
        console.log("Detected logout via interval check");
        this.handleExternalLogout();
      }
      // Update user data from localStorage if it changed
      else if (isLoggedIn && userData && this.state.user) {
        // Compare current state with localStorage data
        const currentUser = this.state.user;
        if (
          userData.name !== currentUser.name ||
          userData.email !== currentUser.email ||
          userData.id !== currentUser.id ||
          userData.role !== currentUser.role
        ) {
          console.log("User data changed in localStorage, updating state");
          this.setState({ user: userData });
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

  // Handle storage events (login/logout from other tabs or components)
  handleStorageEvent = (event) => {
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
            this.handleLogin(userData);
          } else {
            // Just update user data without notification
            this.setState({ user: userData });
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

      // Force notification to be visible and update state with user data
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
    if (!user) return "🔥 Special Launch Offer - 30% off on all services!";

    // Check user role to determine the message - handle exact match with possible formats
    const role = user.role || "";

    // Check for freelancer roles with various possible formats
    if (
      role === "freelancer" ||
      role === "Freelancer" ||
      role === "service provider" ||
      role === "Service Provider" ||
      role === "Freelancer/Service Provider" ||
      role.toLowerCase().includes("freelancer") ||
      role.toLowerCase().includes("service provider")
    ) {
      return "🚀 Start your freelancing journey today with VOAT!";
    } else {
      return "🔥 Special Launch Offer - 30% off on all services!";
    }
  };

  // Method to create smooth scroll to top function
  scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
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
    } = this.state;

    // Debug log to see what user information we have
    console.log("Current user state in NavBar render:", user);

    return (
      <>
        <header className={showSpecialOffer ? "" : "navbar-sticky"}>
          <div className="navbar-container">
            <div className="navbar-special-offer">
              {this.getSpecialOfferText()}
            </div>
            <nav
              className={`navbar ${showSpecialOffer ? "" : "navbar-no-offer"}`}
            >
              <div className="navbar-left-section">
                {/* Left-side menu items - UPDATED */}
                <ul className="left-menu">
                  <li>
                    <Link to="/" onClick={this.scrollToTop}>
                      Home
                    </Link>
                  </li>
                  <li>
                    <Link to="/services" onClick={this.scrollToTop}>
                      Services
                    </Link>
                  </li>
                  <li>
                    {/* Moved Contact Us to left menu */}
                    <HashLink smooth to="/#contact" onClick={this.scrollToTop}>
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
                {/* Right-side - User profile when logged in */}
                {isLoggedIn && user && (
                  <div className="navbar-user-profile">
                    <div className="navbar-user-info">
                      <User size={16} className="navbar-user-icon" />
                      <span className="navbar-user-name">
                        {user?.name || "Welcome User"}
                      </span>
                    </div>
                  </div>
                )}

                {/* Desktop auth button */}
                {!isLoggedIn && (
                  <div className="navbar-auth desktop-auth">
                    <Link
                      to="/signup"
                      className="get-started-btn"
                      onClick={this.scrollToTop}
                    >
                      Register
                    </Link>
                  </div>
                )}

                {isLoggedIn && (
                  <div className="navbar-auth desktop-auth">
                    <button
                      className="get-started-btn logout-btn"
                      onClick={this.handleLogout}
                      aria-label="Logout"
                    >
                      <LogOut size={16} className="logout-icon" />
                    </button>
                  </div>
                )}
              </div>

              {/* Mobile auth button and hamburger */}
              {isMobile && (
                <div className="mobile-nav-controls">
                  {!isLoggedIn && (
                    <Link
                      to="/signup"
                      className="get-started-btn mobile-auth"
                      onClick={this.scrollToTop}
                    >
                      Register
                    </Link>
                  )}

                  <div className="navbar-hamburger" onClick={this.toggleMenu}>
                    {menuOpen ? null : <Menu size={24} />}
                  </div>
                </div>
              )}

              {/* Mobile menu - UPDATED */}
              <div className={`mobile-menu ${menuOpen ? "active" : ""}`}>
                <div className="mobile-menu-header">
                  <div className="mobile-menu-close" onClick={this.toggleMenu}>
                    <X size={24} />
                  </div>
                </div>

                {/* Updated to properly display user name */}
                {isLoggedIn && user && (
                  <li className="mobile-user-info">
                    <User size={16} className="navbar-user-icon" />
                    <span className="navbar-user-name">
                      {user?.name || "Welcome User"}
                    </span>
                  </li>
                )}

                <ul className="mobile-menu-items">
                  <li>
                    <Link
                      to="/"
                      onClick={() => {
                        this.scrollToTop();
                        this.toggleMenu();
                      }}
                    >
                      Home
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/services"
                      onClick={() => {
                        this.scrollToTop();
                        this.toggleMenu();
                      }}
                    >
                      Services
                    </Link>
                  </li>
                  <li>
                    <HashLink
                      smooth
                      to="/#contact"
                      onClick={() => {
                        this.toggleMenu();
                      }}
                    >
                      Contact Us
                    </HashLink>
                  </li>
                  {isLoggedIn && user && (
                    <>
                      <button
                        className="get-started-btn mobile-auth"
                        onClick={this.handleLogout}
                      >
                        <LogOut size={16} className="logout-icon" />
                        <span>Logout</span>
                      </button>
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
      </>
    );
  }
}

export default NavBar;
