import React, { Component } from "react";
import { Link } from "react-router-dom";
import { HashLink } from "react-router-hash-link"; // Import HashLink for smooth scrolling
import {
  Search,
  ShoppingCart,
  User,
  Menu,
  LogOut,
  X,
  Check,
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
    expectingLogin: false, // Flag to expect login
  };

  // Initialize class properties for notification timers
  loginNotificationTimer = null;
  logoutNotificationTimer = null;
  redirectTimer = null;
  loginCheckInterval = null;

  componentDidMount() {
    // Make the NavBar component accessible globally for testing
    window.navbarComponent = this;

    this.checkScreenSize();

    window.addEventListener("resize", this.checkScreenSize);
    document.addEventListener("mousedown", this.handleClickOutside);
    window.addEventListener("storage", this.handleStorageEvent);
    window.addEventListener("scroll", this.handleScroll);

    // Check initial login status without showing notifications
    this.checkInitialLoginStatus();

    // Set up interval to check for login status changes
    this.loginCheckInterval = setInterval(
      this.checkLoginStatusPeriodically,
      1000
    );

    // Add a direct method to force show login notification
    window.showLoginNotification = this.forceShowLoginNotification;

    console.log("NavBar mounted with notifications setup");

    window.forceLoginNotificationDirect = () => {
      const loginNotification = document.querySelector(".login-notification");
      if (loginNotification) {
        loginNotification.classList.add("show");
        setTimeout(() => {
          loginNotification.classList.remove("show");
        }, 5000);
      }
    };

    window.debugNotifications = () => {
      const container = document.querySelector(".notifications-container");
      const loginNotification = document.querySelector(".login-notification");
      console.log("Notifications container:", {
        element: container,
        style: container ? window.getComputedStyle(container) : null,
      });
      console.log("Login notification:", {
        element: loginNotification,
        style: loginNotification
          ? window.getComputedStyle(loginNotification)
          : null,
        classNames: loginNotification ? loginNotification.className : null,
      });
      console.log(
        "Login notification state:",
        this.state.showLoginNotification
      );
    };
  }

  componentWillUnmount() {
    // Remove global reference
    if (window.navbarComponent === this) {
      delete window.navbarComponent;
    }

    // Remove global notification function
    delete window.showLoginNotification;

    window.removeEventListener("resize", this.checkScreenSize);
    document.removeEventListener("mousedown", this.handleClickOutside);
    window.removeEventListener("storage", this.handleStorageEvent);
    window.removeEventListener("scroll", this.handleScroll);

    // Clean up notification timers and intervals
    clearTimeout(this.loginNotificationTimer);
    clearTimeout(this.logoutNotificationTimer);
    clearTimeout(this.redirectTimer);
    clearInterval(this.loginCheckInterval);

    delete window.forceLoginNotificationDirect;
    delete window.debugNotifications;
  }

  // Method to check login status periodically
  checkLoginStatusPeriodically = () => {
    try {
      const userData = localStorage.getItem("user");
      const wasLoggedIn = this.state.isLoggedIn;
      const isLoggedIn = !!userData;

      // If login state changed and we're expecting a login
      if (!wasLoggedIn && isLoggedIn) {
        console.log("Detected login via interval check");
        // Parse the userData and pass it to handleLogin
        try {
          const parsedUserData = JSON.parse(userData);
          // Force a delay to ensure UI updates properly
          setTimeout(() => {
            this.handleLogin(parsedUserData);
          }, 100);
        } catch (e) {
          console.error("Error parsing user data:", e);
          this.handleLogin(userData); // fallback to passing raw data
        }
        this.setState({ expectingLogin: false });
      }
      // If logout happened
      else if (wasLoggedIn && !isLoggedIn) {
        console.log("Detected logout via interval check");
        this.handleExternalLogout();
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

  inspectNotificationStatus = () => {
    const loginNotification = document.querySelector(".login-notification");
    const logoutNotification = document.querySelector(".logout-notification");

    console.log("Notification state in React:", {
      showLoginNotification: this.state.showLoginNotification,
      showLogoutNotification: this.state.showLogoutNotification,
    });

    console.log("Login notification DOM:", {
      element: loginNotification,
      classes: loginNotification ? loginNotification.className : "not found",
      computedDisplay: loginNotification
        ? window.getComputedStyle(loginNotification).display
        : "N/A",
      computedVisibility: loginNotification
        ? window.getComputedStyle(loginNotification).visibility
        : "N/A",
      computedOpacity: loginNotification
        ? window.getComputedStyle(loginNotification).opacity
        : "N/A",
    });

    console.log("Logout notification DOM:", {
      element: logoutNotification,
      classes: logoutNotification ? logoutNotification.className : "not found",
      computedDisplay: logoutNotification
        ? window.getComputedStyle(logoutNotification).display
        : "N/A",
      computedVisibility: logoutNotification
        ? window.getComputedStyle(logoutNotification).visibility
        : "N/A",
      computedOpacity: logoutNotification
        ? window.getComputedStyle(logoutNotification).opacity
        : "N/A",
    });
  };

  forceShowLoginNotification = () => {
    console.log("Force showing login notification");

    // First, ensure we clear any previous timers
    clearTimeout(this.loginNotificationTimer);

    // Force direct DOM manipulation first (most reliable approach)
    const loginNotification = document.querySelector(".login-notification");
    if (loginNotification) {
      // Remove any existing classes and add only what we need
      loginNotification.className = "notification login-notification";

      // Force a reflow/repaint before adding the show class
      void loginNotification.offsetWidth;

      // Now add the show class
      loginNotification.classList.add("show");
      console.log("Applied show class directly to notification element");
    } else {
      console.error("Login notification element not found");
    }

    // Set state after direct DOM manipulation
    this.setState({ showLoginNotification: true });

    // Set timer to hide after 3 seconds (reduced from 5)
    this.loginNotificationTimer = setTimeout(() => {
      console.log("Hiding login notification");
      if (loginNotification) {
        loginNotification.classList.remove("show");
      }
      this.setState({ showLoginNotification: false });
    }, 3000);
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
        if (!this.state.isLoggedIn) {
          this.handleLogin(event.newValue);
        }
      } else {
        // User data was removed - logout occurred
        if (this.state.isLoggedIn) {
          this.handleExternalLogout();
        }
      }
    }
  };

  // Initial check on mount - sets state without showing notifications
  checkInitialLoginStatus = () => {
    try {
      const userData = localStorage.getItem("user");
      if (userData) {
        const user = JSON.parse(userData);
        this.setState({
          isLoggedIn: true,
          user: user,
        });
      } else {
        this.setState({
          isLoggedIn: false,
          user: null,
        });
      }
    } catch (error) {
      console.error("Error checking initial login status:", error);
      localStorage.removeItem("user");
      this.setState({
        isLoggedIn: false,
        user: null,
      });
    }
  };

  // Handle login (show notification and update state)
  handleLogin = (userData) => {
    try {
      let user = userData;

      // If userData is a string, parse it
      if (typeof userData === "string") {
        try {
          user = JSON.parse(userData);
        } catch (e) {
          console.error("Error parsing user data:", e);
        }
      }

      console.log(
        "Login detected for user:",
        user?.name || user?.email || "User"
      );

      // Set logged in state immediately
      this.setState({
        isLoggedIn: true,
        user: user,
        expectingLogin: false,
      });

      // Use a very short timeout to ensure state is applied before showing notification
      setTimeout(this.forceShowLoginNotification, 10);
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

  // Test methods for developer debugging
  testLoginNotification = () => {
    const testUser = {
      name: "Test User",
      email: "test@example.com",
      role: "Freelancer/Service Provider",
    };

    console.log("Testing login notification");
    this.handleLogin(testUser);
  };

  testLogoutNotification = () => {
    console.log("Testing logout notification");
    this.setState({
      showLogoutNotification: true,
    });

    clearTimeout(this.logoutNotificationTimer);
    this.logoutNotificationTimer = setTimeout(() => {
      this.setState({ showLogoutNotification: false });
    }, 3000);
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
    } = this.state;

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
                {/* Left-side menu items */}
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
                    <HashLink to="/#why-choose-us" onClick={this.scrollToTop}>
                      Why Choose Us
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
                {/* Right-side menu items */}
                <ul className="right-menu">
                  <li>
                    <HashLink to="/#vision" onClick={this.scrollToTop}>
                      Our Vision
                    </HashLink>
                  </li>
                  <li>
                    <HashLink smooth to="/#contact" onClick={this.scrollToTop}>
                      Contact Us
                    </HashLink>
                  </li>
                </ul>

                {/* Desktop auth button */}
                {!isLoggedIn && (
                  <div className="navbar-auth desktop-auth">
                    <Link
                      to="/signup"
                      className="get-started-btn"
                      onClick={this.scrollToTop}
                    >
                      Get Started
                    </Link>
                  </div>
                )}

                {isLoggedIn && (
                  <div className="navbar-auth desktop-auth">
                    <button
                      className="get-started-btn"
                      onClick={this.handleLogout}
                    >
                      <LogOut size={16} className="logout-icon" />
                      <span>Logout</span>
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
                      Get Started
                    </Link>
                  )}

                  <div className="navbar-hamburger" onClick={this.toggleMenu}>
                    {menuOpen ? null : <Menu size={24} />}
                  </div>
                </div>
              )}

              {/* Mobile menu */}
              <div className={`mobile-menu ${menuOpen ? "active" : ""}`}>
                <div className="mobile-menu-header">
                  <div className="mobile-menu-close" onClick={this.toggleMenu}>
                    <X size={24} />
                  </div>
                </div>

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
                      to="/#why-choose-us"
                      onClick={() => {
                        this.scrollToTop();
                        this.toggleMenu();
                      }}
                    >
                      Why Choose Us
                    </HashLink>
                  </li>
                  <li>
                    <HashLink
                      to="/#vision"
                      onClick={() => {
                        this.scrollToTop();
                        this.toggleMenu();
                      }}
                    >
                      Our Vision
                    </HashLink>
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
                  {isLoggedIn && (
                    <button
                      className="get-started-btn mobile-auth"
                      onClick={this.handleLogout}
                    >
                      <LogOut size={16} className="logout-icon" />
                      <span>Logout</span>
                    </button>
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
        </div>
      </>
    );
  }
}

export default NavBar;
