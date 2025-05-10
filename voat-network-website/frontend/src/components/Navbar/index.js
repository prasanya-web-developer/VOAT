import React, { Component } from "react";
import { Link } from "react-router-dom";
import { Search, ShoppingCart, User, Menu, LogOut } from "lucide-react";
import "./index.css";

class NavBar extends Component {
  state = {
    isMobile: false,
    menuOpen: false,
    profileDropdownOpen: false,
    isLoggedIn: false,
    user: null,
    showSpecialOffer: true,
    prevScrollPos: window.pageYOffset,
  };

  componentDidMount() {
    this.checkScreenSize();

    window.addEventListener("resize", this.checkScreenSize);
    document.addEventListener("mousedown", this.handleClickOutside);
    window.addEventListener("storage", this.handleStorageChange);
    window.addEventListener("scroll", this.handleScroll);
    this.checkUserLoggedIn();

    this.authCheckInterval = setInterval(this.checkUserLoggedIn, 2000);
  }

  componentWillUnmount() {
    window.removeEventListener("resize", this.checkScreenSize);
    document.removeEventListener("mousedown", this.handleClickOutside);
    window.removeEventListener("storage", this.handleStorageChange);
    window.removeEventListener("scroll", this.handleScroll);
    clearInterval(this.authCheckInterval);
  }

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

  handleStorageChange = (event) => {
    if (event.key === "user") {
      this.checkUserLoggedIn();
    }
  };

  checkUserLoggedIn = () => {
    try {
      const userData = localStorage.getItem("user");
      if (userData) {
        const user = JSON.parse(userData);

        // For debugging purposes
        console.log("User role from localStorage:", user.role);

        this.setState({
          isLoggedIn: true,
          user: user,
        });
        return user;
      } else {
        this.setState({
          isLoggedIn: false,
          user: null,
        });
      }
      return null;
    } catch (error) {
      console.error("Error parsing user data:", error);

      localStorage.removeItem("user");
      this.setState({
        isLoggedIn: false,
        user: null,
      });
      return null;
    }
  };

  profileDropdownRef = React.createRef();

  checkScreenSize = () => {
    this.setState({
      isMobile: window.innerWidth < 768,
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

  handleLogout = () => {
    localStorage.removeItem("user");
    this.setState({
      isLoggedIn: false,
      user: null,
      profileDropdownOpen: false,
    });

    window.location.href = "/";
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

  render() {
    const {
      isMobile,
      menuOpen,
      profileDropdownOpen,
      isLoggedIn,
      showSpecialOffer,
      user,
    } = this.state;

    // For debugging - log user role to console during render
    if (user && user.role) {
      console.log("Current user role:", user.role);
    }

    return (
      <header className={showSpecialOffer ? "" : "navbar-sticky"}>
        <div className="navbar-container">
          <div className="navbar-special-offer">
            {this.getSpecialOfferText()}
          </div>
          <nav
            className={`navbar ${showSpecialOffer ? "" : "navbar-no-offer"}`}
          >
            {isMobile && (
              <div className="navbar-hamburger" onClick={this.toggleMenu}>
                <Menu size={24} />
              </div>
            )}

            <div
              className={`navbar-links ${
                isMobile && menuOpen ? "active" : ""
              } ${isMobile && !menuOpen ? "hidden" : ""}`}
            >
              <ul>
                <li>
                  <Link to="/">Home</Link>
                </li>
                <li>
                  <Link to="/services">Services</Link>
                </li>
                <li>
                  <Link to="/portfolio-list">Portfolios</Link>
                </li>
                <li>
                  <Link to="/contact-us">Contact Us</Link>
                </li>
              </ul>
            </div>

            <div className="navbar-logo">
              <Link to="/">
                <img
                  src="https://res.cloudinary.com/dffu1ungl/image/upload/v1744606803/VOAT_LOGO_zo7lk5.png"
                  alt="Logo"
                  className="nav-logo"
                />
              </Link>
            </div>

            <div className="navbar-actions">
              <div className="navbar-search">
                <input type="text" placeholder="Search..." />
                <button type="submit">
                  <Search size={16} />
                </button>
              </div>

              {isLoggedIn && (
                <div className="navbar-cart">
                  <Link to="/cart">
                    <ShoppingCart size={20} />
                  </Link>
                </div>
              )}

              {isLoggedIn ? (
                <div
                  className="navbar-profile-container"
                  ref={this.profileDropdownRef}
                >
                  <div
                    className="navbar-profile"
                    onClick={this.toggleProfileDropdown}
                  >
                    <User size={20} />
                  </div>

                  {profileDropdownOpen && (
                    <div className="profile-dropdown">
                      <Link to="/user-dashboard" className="dropdown-item">
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
              ) : (
                <div className="navbar-auth">
                  <Link to="/signup" className="get-started-btn">
                    Get Started
                  </Link>
                </div>
              )}
            </div>
          </nav>
        </div>
      </header>
    );
  }
}

export default NavBar;
