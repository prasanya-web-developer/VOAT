import React, { Component } from "react";
import { Link } from "react-router-dom";
import NavBar from "../Navbar";
import Footer from "../Footer";
import "./index.css";

class PortfolioList extends Component {
  professionMap = {
    // Canonical Names (map to themselves)
    "web developer": "Web Developer",
    "mobile app developer": "Mobile App Developer",
    "full stack developer": "Full Stack Developer",
    "frontend developer": "Frontend Developer",
    "backend developer": "Backend Developer",
    "ui/ux designer": "UI/UX Designer",
    "graphic designer": "Graphic Designer",
    "digital marketing specialist": "Digital Marketing Specialist",
    "content writer": "Content Writer",
    copywriter: "Copywriter",
    "seo specialist": "SEO Specialist",
    "social media manager": "Social Media Manager",
    "video editor": "Video Editor",
    photographer: "Photographer",
    "data analyst": "Data Analyst",
    "data scientist": "Data Scientist",
    "machine learning engineer": "Machine Learning Engineer",
    "devops engineer": "DevOps Engineer",
    "cybersecurity specialist": "Cybersecurity Specialist",
    "cloud architect": "Cloud Architect",
    "business analyst": "Business Analyst",
    "project manager": "Project Manager",
    "product manager": "Product Manager",
    "technical writer": "Technical Writer",
    "software tester": "Software Tester",
    "quality assurance engineer": "Quality Assurance Engineer",
    "database administrator": "Database Administrator",
    "system administrator": "System Administrator",
    "network engineer": "Network Engineer",
    "blockchain developer": "Blockchain Developer",
    "game developer": "Game Developer",
    "wordpress developer": "WordPress Developer",
    "shopify developer": "Shopify Developer",
    "e-commerce specialist": "E-commerce Specialist",
    "email marketing specialist": "Email Marketing Specialist",
    "ppc specialist": "PPC Specialist",
    "brand designer": "Brand Designer",
    "logo designer": "Logo Designer",
    "illustration designer": "Illustration Designer",
    "motion graphics designer": "Motion Graphics Designer",
    "3d modeler": "3D Modeler",
    "animation specialist": "Animation Specialist",
    "voice over artist": "Voice Over Artist",
    translator: "Translator",
    "virtual assistant": "Virtual Assistant",
    "customer support specialist": "Customer Support Specialist",
    "sales specialist": "Sales Specialist",
    "lead generation specialist": "Lead Generation Specialist",
    "market research analyst": "Market Research Analyst",
    "financial analyst": "Financial Analyst",
    "accounting specialist": "Accounting Specialist",
    "tax consultant": "Tax Consultant",
    "legal consultant": "Legal Consultant",
    "hr consultant": "HR Consultant",
    "business consultant": "Business Consultant",
    "marketing consultant": "Marketing Consultant",
    "strategy consultant": "Strategy Consultant",
    "interior designer": "Interior Designer",
    "fashion designer": "Fashion Designer",
    "chartered accountant": "Chartered Accountant",
    "automation specialist": "Automation Specialist",

    // Aliases and Variations
    "web development": "Web Developer",
    "web development professional": "Web Developer",
    "web dev": "Web Developer",
    "frontend dev": "Frontend Developer",
    "backend dev": "Backend Developer",
    "fullstack dev": "Full Stack Developer",
    "wordpress dev": "WordPress Developer",
    "shopify dev": "Shopify Developer",
    "digital marketing": "Digital Marketing Specialist",
    "digital marketer": "Digital Marketing Specialist",
    "seo expert": "SEO Specialist",
    smm: "Social Media Manager",
    "social media": "Social Media Manager",
    ecommerce: "E-commerce Specialist",
    "email marketing": "Email Marketing Specialist",
    ppc: "PPC Specialist",
    "ui designer": "UI/UX Designer",
    "ux designer": "UI/UX Designer",
    "brand development": "Brand Designer",
    "content creator": "Content Writer",
    "ml engineer": "Machine Learning Engineer",
    "qa engineer": "Quality Assurance Engineer",
    "qa tester": "Quality Assurance Engineer",
    "software test": "Software Tester",
    devops: "DevOps Engineer",
    "cyber security": "Cybersecurity Specialist",
    "security specialist": "Cybersecurity Specialist",
    taxation: "Tax Consultant",
    ca: "Chartered Accountant",
    "chartered acc": "Chartered Accountant",
    "photo and video editing": "Video Editor",
    automation: "Automation Specialist",
    va: "Virtual Assistant",
    "virtual assist": "Virtual Assistant",
    "customer service": "Customer Support Specialist",
  };

  // Generate the list of professions dynamically from the map's values.
  predefinedProfessions = [
    ...new Set(Object.values(this.professionMap)),
  ].sort();

  state = {
    portfolios: [],
    isLoading: true,
    error: null,
    filters: {
      profession: "",
      experience: "",
      amount: [],
    },
    baseUrl:
      window.location.hostname === "localhost"
        ? "http://localhost:5000"
        : "https://voat.onrender.com",
    userImages: {},
    wishlist: [],
    isMobileFilterOpen: false,
    notification: null,
    currentUser: null,
    // Quick Booking Modal State
    isQuickBookingModalOpen: false,
    quickBookingForm: {
      userName: "",
      serviceName: "",
      budget: "",
      contactNumber: "",
      email: "",
      description: "",
    },
    isSubmittingQuickBooking: false,
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
    this.loadCurrentUser();
  }

  loadCurrentUser = () => {
    try {
      const userData = JSON.parse(localStorage.getItem("user") || "{}");
      this.setState({
        currentUser: userData,
        quickBookingForm: {
          ...this.state.quickBookingForm,
          userName: userData.name || "",
          email: userData.email || "",
          contactNumber: userData.phone || userData.contactNumber || "",
        },
      });
    } catch (error) {
      console.error("Error loading current user:", error);
    }
  };

  // Quick Booking Modal Functions
  openQuickBookingModal = () => {
    const { currentUser } = this.state;

    if (!currentUser || !currentUser.id) {
      alert("Please login to access quick booking");
      window.location.href = "/login";
      return;
    }

    this.setState({ isQuickBookingModalOpen: true });
  };

  closeQuickBookingModal = () => {
    this.setState({
      isQuickBookingModalOpen: false,
      quickBookingForm: {
        userName: this.state.currentUser?.name || "",
        serviceName: "",
        budget: "",
        contactNumber:
          this.state.currentUser?.phone ||
          this.state.currentUser?.contactNumber ||
          "",
        email: this.state.currentUser?.email || "",
        description: "",
      },
    });
  };

  handleQuickBookingFormChange = (e) => {
    const { name, value } = e.target;
    this.setState((prevState) => ({
      quickBookingForm: {
        ...prevState.quickBookingForm,
        [name]: value,
      },
    }));
  };

  submitQuickBooking = async (e) => {
    e.preventDefault();
    const { currentUser, quickBookingForm } = this.state;

    // Validation
    if (
      !quickBookingForm.serviceName ||
      !quickBookingForm.budget ||
      !quickBookingForm.contactNumber
    ) {
      this.showNotification("Please fill in all required fields", "error");
      return;
    }

    this.setState({ isSubmittingQuickBooking: true });

    try {
      const quickBookingData = {
        clientId: currentUser.id,
        clientName: quickBookingForm.userName,
        clientEmail: quickBookingForm.email,
        clientPhone: quickBookingForm.contactNumber,
        serviceName: quickBookingForm.serviceName,
        budget: quickBookingForm.budget,
        description: quickBookingForm.description || "",
      };

      console.log("=== FRONTEND QUICK BOOKING SUBMISSION ===");
      console.log("Base URL:", this.state.baseUrl);
      console.log("Full URL:", `${this.state.baseUrl}/api/quick-booking`);
      console.log("Data being sent:", quickBookingData);

      // First test if the server is reachable
      try {
        const healthCheck = await fetch(`${this.state.baseUrl}/api/health`);
        console.log("Health check status:", healthCheck.status);
      } catch (healthError) {
        console.error("Server not reachable:", healthError);
        throw new Error(
          "Cannot connect to server. Please check your connection."
        );
      }

      const response = await fetch(`${this.state.baseUrl}/api/quick-booking`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Origin: window.location.origin,
        },
        body: JSON.stringify(quickBookingData),
      });

      console.log("Response status:", response.status);
      console.log("Response headers:", response.headers);

      const responseText = await response.text();
      console.log("Raw response text:", responseText);

      if (response.ok) {
        let responseData;
        try {
          responseData = JSON.parse(responseText);
        } catch (parseError) {
          throw new Error("Server returned invalid JSON");
        }

        console.log("Parsed response data:", responseData);

        this.showNotification(
          "Quick booking request submitted successfully! We'll match you with suitable freelancers.",
          "success"
        );
        this.closeQuickBookingModal();
      } else {
        let errorMessage = `Server error (${response.status})`;

        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.message || errorMessage;
        } catch (parseError) {
          errorMessage = responseText || errorMessage;
        }

        console.error("Server error response:", {
          status: response.status,
          statusText: response.statusText,
          body: responseText,
        });

        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error("=== QUICK BOOKING SUBMISSION ERROR ===");
      console.error("Error type:", error.constructor.name);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);

      this.showNotification(
        `Failed to submit quick booking: ${error.message}`,
        "error"
      );
    } finally {
      this.setState({ isSubmittingQuickBooking: false });
    }
  };

  // Handle URL parameters for filtering
  handleUrlParams = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const professionFromUrl = urlParams.get("profession");

    if (professionFromUrl) {
      // Normalize the profession from the URL before setting it in the filter state
      const normalizedProfession = this.normalizeProfession(
        decodeURIComponent(professionFromUrl)
      );
      this.setState((prevState) => ({
        filters: {
          ...prevState.filters,
          profession: normalizedProfession || "", // Use normalized value
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

  // Quick Booking Modal Render
  renderQuickBookingModal = () => {
    const {
      isQuickBookingModalOpen,
      quickBookingForm,
      isSubmittingQuickBooking,
    } = this.state;

    if (!isQuickBookingModalOpen) return null;

    return (
      <div
        className="quick-booking-modal-overlay"
        onClick={this.closeQuickBookingModal}
      >
        <div
          className="quick-booking-modal"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-header">
            <div className="modal-title-section">
              <h2>
                <i className="fas fa-rocket"></i>
                Quick Booking Request
              </h2>
              <p>Get matched with the perfect freelancer for your project</p>
            </div>
            <button
              className="modal-close-btn"
              onClick={this.closeQuickBookingModal}
              type="button"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <form
            onSubmit={this.submitQuickBooking}
            className="quick-booking-form"
          >
            <div className="form-section">
              <h3>
                <i className="fas fa-user"></i>
                Personal Information
              </h3>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="userName">Full Name *</label>
                  <input
                    type="text"
                    id="userName"
                    name="userName"
                    value={quickBookingForm.userName}
                    onChange={this.handleQuickBookingFormChange}
                    required
                    readOnly
                    className="readonly-input"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="email">Email Address *</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={quickBookingForm.email}
                    onChange={this.handleQuickBookingFormChange}
                    required
                    readOnly
                    className="readonly-input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="contactNumber">Contact Number *</label>
                <input
                  type="tel"
                  id="contactNumber"
                  name="contactNumber"
                  value={quickBookingForm.contactNumber}
                  onChange={this.handleQuickBookingFormChange}
                  placeholder="Enter your phone number"
                  required
                />
              </div>
            </div>

            <div className="form-section">
              <h3>
                <i className="fas fa-briefcase"></i>
                Project Details
              </h3>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="serviceName">Service Required *</label>
                  <select
                    id="serviceName"
                    name="serviceName"
                    value={quickBookingForm.serviceName}
                    onChange={this.handleQuickBookingFormChange}
                    required
                  >
                    <option value="">Select a service</option>
                    {this.predefinedProfessions.map((profession, index) => (
                      <option key={index} value={profession}>
                        {profession}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="budget">Budget Range *</label>
                  <select
                    id="budget"
                    name="budget"
                    value={quickBookingForm.budget}
                    onChange={this.handleQuickBookingFormChange}
                    required
                  >
                    <option value="">Select budget range</option>
                    <option value="₹1,000 - ₹5,000">₹1,000 - ₹5,000</option>
                    <option value="₹5,000 - ₹10,000">₹5,000 - ₹10,000</option>
                    <option value="₹10,000 - ₹15,000">₹10,000 - ₹15,000</option>
                    <option value="₹15,000 - ₹20,000">₹15,000 - ₹20,000</option>
                    <option value="₹20,000 - ₹30,000">₹20,000 - ₹30,000</option>
                    <option value="₹30,000+">₹30,000+</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="description">
                  Project Description (Optional)
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={quickBookingForm.description}
                  onChange={this.handleQuickBookingFormChange}
                  placeholder="Describe your project requirements, timeline, and any specific needs..."
                  rows="4"
                />
              </div>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="cancel-btn"
                onClick={this.closeQuickBookingModal}
                disabled={isSubmittingQuickBooking}
              >
                <i className="fas fa-times"></i>
                Cancel
              </button>
              <button
                type="submit"
                className="submit-btn"
                disabled={isSubmittingQuickBooking}
              >
                {isSubmittingQuickBooking ? (
                  <>
                    <div className="button-spinner"></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <i className="fas fa-paper-plane"></i>
                    Submit Request
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // Add this method to your PortfolioList component for testing
  testQuickBookingEndpoint = async () => {
    try {
      console.log("Testing quick booking endpoint...");
      const response = await fetch(`${this.state.baseUrl}/api/health`);
      console.log("Health check response:", response.status);

      // Test if quick booking endpoint exists
      const testResponse = await fetch(
        `${this.state.baseUrl}/api/admin/quick-bookings`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      console.log("Quick booking endpoint test:", testResponse.status);
    } catch (error) {
      console.error("Endpoint test error:", error);
    }
  };

  formatName = (name) => {
    if (!name || typeof name !== "string") return name;

    return name
      .toLowerCase()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
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

  // This function now uses the professionMap for consistent normalization.
  normalizeProfession = (inputProfession) => {
    if (!inputProfession || typeof inputProfession !== "string") {
      return null;
    }

    const normalizedInput = inputProfession.trim().toLowerCase();

    // Try a direct lookup in our comprehensive map
    const mappedProfession = this.professionMap[normalizedInput];
    if (mappedProfession) {
      return mappedProfession;
    }

    // Fallback for cases where the input might be a partial match
    const partialMatchKey = Object.keys(this.professionMap).find(
      (key) => normalizedInput.includes(key) || key.includes(normalizedInput)
    );
    if (partialMatchKey) {
      return this.professionMap[partialMatchKey];
    }

    // If no match is found, return null
    return null;
  };

  fetchApprovedPortfolios = async () => {
    try {
      const response = await fetch(`${this.state.baseUrl}/api/portfolios`);

      let portfolioData = [];

      if (response.ok) {
        portfolioData = await response.json();
        console.log("API Response - Raw portfolio data:", portfolioData);

        portfolioData = portfolioData.map((portfolio) => {
          // Normalize profession using the new robust function
          const normalizedProfession = this.normalizeProfession(
            portfolio.profession || portfolio.headline
          );

          return {
            ...portfolio,
            profession: normalizedProfession,
            originalProfession: portfolio.profession || portfolio.headline, // Keep original for reference
          };
        });

        console.log(
          "API Response - After profession normalization:",
          portfolioData.length
        );
      } else {
        console.log("API call failed, falling back to localStorage");
        let approvedPortfolios = JSON.parse(
          localStorage.getItem("approvedSubmissions") || "[]"
        );

        if (approvedPortfolios.length === 0) {
          approvedPortfolios = [];
        }

        portfolioData = approvedPortfolios.map((portfolio) => {
          const normalizedProfession = this.normalizeProfession(
            portfolio.profession || portfolio.headline
          );

          return {
            ...portfolio,
            profession: normalizedProfession,
            originalProfession: portfolio.profession || portfolio.headline,
          };
        });

        console.log("LocalStorage - Raw portfolio data:", portfolioData.length);
      }

      // CRITICAL: Filter out portfolios with null profession AND held portfolios
      portfolioData = portfolioData.filter((portfolio) => {
        // Check if profession is valid
        if (portfolio.profession === null) {
          console.log(
            `Filtering out portfolio with invalid profession: ${portfolio.name}`
          );
          return false;
        }

        // Check if portfolio is held (should be hidden from public view)
        if (portfolio.isHold === true) {
          console.log(`Filtering out held portfolio: ${portfolio.name}`);
          return false;
        }

        return true;
      });

      console.log("After filtering (profession + hold):", portfolioData.length);

      const uniquePortfolios = this.removeDuplicatePortfolios(portfolioData);
      console.log("After removing duplicates:", uniquePortfolios.length);

      await this.fetchUserData(uniquePortfolios);

      this.setState({
        portfolios: uniquePortfolios,
        isLoading: false,
      });

      console.log("Final portfolios set in state:", uniquePortfolios.length);
    } catch (error) {
      console.error("Error fetching portfolios:", error);

      // FALLBACK: Apply the same filtering logic to localStorage data
      const approvedPortfolios = JSON.parse(
        localStorage.getItem("approvedSubmissions") || "[]"
      );

      if (approvedPortfolios.length > 0) {
        console.log("Error fallback - Processing localStorage data");

        const portfolioData = approvedPortfolios
          .map((portfolio) => {
            const normalizedProfession = this.normalizeProfession(
              portfolio.profession || portfolio.headline
            );

            return {
              ...portfolio,
              profession: normalizedProfession,
              originalProfession: portfolio.profession || portfolio.headline,
            };
          })
          .filter((portfolio) => {
            // CRITICAL: Apply the same filtering logic in error fallback
            if (portfolio.profession === null) {
              console.log(
                `Error fallback - Filtering out portfolio with invalid profession: ${portfolio.name}`
              );
              return false;
            }

            if (portfolio.isHold === true) {
              console.log(
                `Error fallback - Filtering out held portfolio: ${portfolio.name}`
              );
              return false;
            }

            return true;
          });

        console.log("Error fallback - After filtering:", portfolioData.length);

        const uniquePortfolios = this.removeDuplicatePortfolios(portfolioData);

        this.setState({
          portfolios: uniquePortfolios,
          isLoading: false,
        });

        console.log(
          "Error fallback - Final portfolios:",
          uniquePortfolios.length
        );
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

            // Update profile image
            if (userData.user && userData.user.profileImage) {
              userImages[userId] = userData.user.profileImage;
            }

            // Update VOAT ID - Fix the logic here
            if (userData.user && userData.user.voatId) {
              console.log(`VOAT ID found: ${userData.user.voatId}`);
              updatedPortfolios[i] = {
                ...updatedPortfolios[i],
                voatId: userData.user.voatId,
                uservoatId: userData.user.voatId, // Also set this for consistency
              };
            } else {
              console.log(
                `No VOAT ID found for user ${userId}, trying alternative endpoint`
              );

              // Try the alternative endpoint
              try {
                const voatResponse = await fetch(
                  `${this.state.baseUrl}/api/user-voat-id/${userId}`
                );

                if (voatResponse.ok) {
                  const voatData = await voatResponse.json();
                  if (voatData.voatId) {
                    updatedPortfolios[i] = {
                      ...updatedPortfolios[i],
                      voatId: voatData.voatId,
                      uservoatId: voatData.voatId,
                    };
                    console.log(
                      `VOAT ID found via alternative endpoint: ${voatData.voatId}`
                    );
                  } else {
                    updatedPortfolios[i] = {
                      ...updatedPortfolios[i],
                      voatId: null,
                    };
                  }
                } else {
                  updatedPortfolios[i] = {
                    ...updatedPortfolios[i],
                    voatId: null,
                  };
                }
              } catch (voatError) {
                console.log(
                  `Error fetching VOAT ID via alternative endpoint:`,
                  voatError
                );
                updatedPortfolios[i] = {
                  ...updatedPortfolios[i],
                  voatId: null,
                };
              }
            }
          } else {
            console.log(`User API call failed for ${userId}`);
            updatedPortfolios[i] = {
              ...updatedPortfolios[i],
              voatId: null,
            };
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

    //  URL to remove query parameters
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

  handleBookNow = async (portfolio) => {
    const { currentUser } = this.state;

    if (!currentUser || !currentUser.id) {
      alert("Please login to book services");
      window.location.href = "/login";
      return;
    }

    // Prevent booking own service
    const freelancerId = portfolio.userId || portfolio._id || portfolio.id;
    if (currentUser.id === freelancerId) {
      this.showNotification("You cannot book your own service", "error");
      return;
    }

    try {
      const bookingData = {
        clientId: currentUser.id,
        clientName: currentUser.name,
        clientEmail: currentUser.email,
        clientProfileImage: currentUser.profileImage,
        freelancerId: freelancerId,
        freelancerName: portfolio.name,
        freelancerEmail: portfolio.email,
        serviceName: portfolio.profession || "Service",
        servicePrice: this.getFirstServicePrice(portfolio),
        status: "pending",
        requestDate: new Date().toISOString(),
      };

      const response = await fetch(`${this.state.baseUrl}/api/create-booking`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(bookingData),
      });

      if (response.ok) {
        this.showNotification("Booking request sent successfully!");
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create booking");
      }
    } catch (error) {
      console.error("Booking error:", error);
      this.showNotification(
        `Failed to send booking request: ${error.message}`,
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
      // Get all professions from portfolios
      const portfolioProfessions = portfolios
        .map((item) => item.profession)
        .filter(
          (value) => value && typeof value === "string" && value.trim() !== ""
        );

      // Create unique set and sort
      const uniqueProfessions = [...new Set(portfolioProfessions)].sort();

      return uniqueProfessions;
    }

    // For other fields, use the original logic
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
        {this.renderQuickBookingModal()}

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
                  { value: "1000-5000", label: "₹1K - ₹5K" },
                  { value: "5000-10000", label: "₹5K - ₹10K" },
                  { value: "10000-15000", label: "₹10K - ₹15K" },
                  { value: "15000-20000", label: "₹15K - ₹20K" },
                  { value: "20000+", label: "₹20K+" },
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
                  <button
                    className="quick-booking-btn"
                    onClick={this.openQuickBookingModal}
                  >
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
                    ? `No freelancers found for "${filters.profession}". Try adjusting your filters.`
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
                        <h3 className="freelancer-name">
                          {this.formatName(portfolio.name)}
                        </h3>
                        <p className="profession">{portfolio.profession}</p>

                        {/* VOAT ID */}
                        <div className="voat-id">
                          <span className="voat-label">VOAT ID:</span>
                          <span className="voat-value">
                            {portfolio.voatId ||
                              portfolio.uservoatId ||
                              "Generating..."}
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
                            ₹{firstServicePrice.toLocaleString()}
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
                          className="book-now-btn"
                          onClick={(e) => {
                            e.preventDefault();
                            this.handleBookNow(portfolio);
                          }}
                        >
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <rect
                              x="3"
                              y="4"
                              width="18"
                              height="18"
                              rx="2"
                              ry="2"
                            />
                            <line x1="16" y1="2" x2="16" y2="6" />
                            <line x1="8" y1="2" x2="8" y2="6" />
                            <line x1="3" y1="10" x2="21" y2="10" />
                          </svg>
                          Book Now
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
