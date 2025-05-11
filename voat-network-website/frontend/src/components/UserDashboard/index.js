import { Component } from "react";
import { Link } from "react-router-dom";
import NavBar from "../Navbar";
import "./index.css";
import Footer from "../Footer";
import { v4 as uuidv4 } from "uuid"; // For VOAT ID generation

class UserDashboard extends Component {
  state = {
    userData: null,
    isLoading: true,
    error: null,
    errorType: null,
    isEditing: false,

    activeTab: "profile",
    showPortfolioForm: false,
    portfolioStatus: null,
    orders: [],
    wishlist: [],
    formData: {
      name: "",
      email: "",
      role: "",
      profession: "",
    },
    portfolioFormData: {
      name: "",
      profession: "",
      email: "",
      workExperience: "",
      portfolioLink: "",
      about: "",
      serviceName: "",
      serviceDescription: "",
      pricing: [
        { level: "Basic", price: "", timeFrame: "" },
        { level: "Standard", price: "", timeFrame: "" },
        { level: "Premium", price: "", timeFrame: "" },
      ],
    },
    profileImage: null,
    previewImage: null,
    resumeFileName: "",
    baseUrl: "https://voat.onrender.com",
  };

  componentDidMount() {
    this.loadUserData().then(() => {
      // Fetch portfolio status first to ensure it's loaded
      this.fetchPortfolioStatus().then(() => {
        // Fetch other data after ensuring status is fetched
        this.fetchOrders();
        this.fetchWishlist();
      });
    });
  }

  loadUserData = async () => {
    const userDataString = localStorage.getItem("user");
    if (userDataString) {
      try {
        let userData = JSON.parse(userDataString);

        // For new users, ensure VOAT ID exists before proceeding
        if (!userData.voatId) {
          console.log("New user detected, generating VOAT ID");
          // Generate a new VOAT ID
          const randomPart = uuidv4().substring(0, 9).toUpperCase();
          const voatId = `VOAT-${randomPart.substring(
            0,
            4
          )}-${randomPart.substring(4, 8)}`;

          // Update the user data with the new VOAT ID
          userData.voatId = voatId;
          userData.voatPoints = userData.voatPoints || 0;
          userData.badge = userData.badge || this.calculateBadge(0);

          // Save the updated user data to localStorage immediately
          localStorage.setItem("user", JSON.stringify(userData));

          // Ensure database is updated with new VOAT ID if user ID exists
          if (userData.id) {
            await this.updateUserDataInDatabase(userData);
          }
        }

        // Now set state with the updated userData (which includes VOAT ID)
        this.setState({
          userData: userData,
          isLoading: false,
          formData: {
            name: userData.name || "",
            email: userData.email || "",
            role: userData.role || "",
            profession: userData.profession || "",
          },
          previewImage: userData.profileImage
            ? this.getFullImageUrl(userData.profileImage)
            : null,
        });

        // Now refresh user data from database to get any other server-side updates
        await this.refreshUserFromDatabase();
      } catch (error) {
        console.error("Error loading user data:", error);
        this.setState({
          isLoading: false,
          error: "Failed to parse user data. Please login again.",
          errorType: "parse_error",
        });
      }
    } else {
      this.setState({
        isLoading: false,
        error: "No user data found. Please login first.",
        errorType: "no_user",
      });
    }
  };

  updateUserDataInDatabase = async (userData) => {
    try {
      if (!userData.id) {
        console.error("Cannot update database: User ID is missing");
        return false;
      }

      console.log("Updating user data in database:", {
        userId: userData.id,
        voatId: userData.voatId,
        voatPoints: userData.voatPoints,
        badge: userData.badge,
      });

      const updateData = {
        userId: userData.id,
        voatId: userData.voatId,
        voatPoints: userData.voatPoints,
        badge: userData.badge,
      };

      const response = await fetch(
        `${this.state.baseUrl}/api/update-user-data`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updateData),
        }
      );

      const responseData = await response.json();
      console.log("Database update response:", responseData);
      return true;
    } catch (error) {
      console.error("Error updating user data in database:", error);
      return false;
    }
  };

  refreshUserFromDatabase = async () => {
    try {
      const userData = JSON.parse(localStorage.getItem("user"));
      if (!userData || !userData.id) return null;

      const response = await fetch(
        `${this.state.baseUrl}/api/user/${userData.id}`
      );

      if (response.ok) {
        const result = await response.json();

        // Preserve VOAT ID if it exists in local storage but not in database response
        const updatedUserData = {
          ...userData,
          ...result.user,
          voatId:
            result.user.voatId || userData.voatId || this.generateVoatId(),
          voatPoints: result.user.voatPoints || userData.voatPoints || 0,
          badge: result.user.badge || userData.badge || this.calculateBadge(0),
        };

        localStorage.setItem("user", JSON.stringify(updatedUserData));

        // Update state with refreshed data to ensure UI reflects current data
        this.setState({
          userData: updatedUserData,
          formData: {
            name: updatedUserData.name || "",
            email: updatedUserData.email || "",
            role: updatedUserData.role || "",
            profession: updatedUserData.profession || "",
          },
        });

        return updatedUserData;
      }
    } catch (error) {
      console.error("Error refreshing user data:", error);
    }
    return null;
  };

  fetchVoatId = async (userId) => {
    try {
      const response = await fetch(
        `${this.state.baseUrl}/api/user-voat-id/${userId}`
      );
      if (response.ok) {
        const data = await response.json();
        return data.voatId;
      }
    } catch (error) {
      console.error("Error fetching VOAT ID:", error);
    }
    return null;
  };

  ensureUserHasVoatId = async (userData) => {
    if (!userData.voatId && userData.id) {
      try {
        // Generate a new VOAT ID
        const randomPart = uuidv4().substring(0, 9).toUpperCase();
        const voatId = `VOAT-${randomPart.substring(
          0,
          4
        )}-${randomPart.substring(4, 8)}`;

        console.log(`Generated new VOAT ID for existing user: ${voatId}`);

        // Update the user data with the new VOAT ID
        const response = await fetch(
          `${this.state.baseUrl}/api/update-user-data`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              userId: userData.id,
              voatId: voatId,
            }),
          }
        );

        if (response.ok) {
          const result = await response.json();
          console.log("VOAT ID update result:", result);

          // Update local user data
          const updatedUserData = {
            ...userData,
            voatId: voatId,
          };

          // Update local storage
          localStorage.setItem("user", JSON.stringify(updatedUserData));

          return updatedUserData;
        } else {
          console.error("Failed to update VOAT ID");
          return userData;
        }
      } catch (error) {
        console.error("Error ensuring VOAT ID:", error);
        return userData;
      }
    }
    return userData;
  };

  isAdmin = () => {
    const { userData } = this.state;
    return userData && userData.email === "prasanya.webdev@gmail.com";
  };

  generateVoatId = () => {
    // Generate a unique ID and format it as VOAT-XXXX-XXXX
    const randomPart = uuidv4().substring(0, 9).toUpperCase();
    return `VOAT-${randomPart.substring(0, 4)}-${randomPart.substring(4, 8)}`;
  };

  calculateBadge = (points) => {
    if (points >= 500) return "platinum";
    if (points >= 250) return "gold";
    if (points >= 100) return "silver";
    return "bronze";
  };

  fetchOrders = async () => {
    // Simulating API call to fetch orders
    try {
      // Replace with actual API call
      const response = await fetch(
        `${this.state.baseUrl}/api/orders/${
          this.state.userData?.id || "unknown"
        }`
      );
      if (response.ok) {
        const orders = await response.json();
        this.setState({ orders });
      }
    } catch (error) {
      console.error("Failed to fetch orders:", error);
      // For demo purposes, add mock orders
      this.setState({
        orders: [
          {
            id: "ORD-001",
            service: "Logo Design",
            status: "Completed",
            date: "2025-03-10",
            amount: 150,
          },
          {
            id: "ORD-002",
            service: "Website Development",
            status: "In Progress",
            date: "2025-04-01",
            amount: 850,
          },
          {
            id: "ORD-003",
            service: "SEO Optimization",
            status: "Pending",
            date: "2025-04-12",
            amount: 350,
          },
        ],
      });
    }
  };

  fetchWishlist = async () => {
    try {
      const userData = JSON.parse(localStorage.getItem("user") || "{}");
      if (!userData || !userData.id) return;

      // First try to get from localStorage
      const localWishlist = JSON.parse(
        localStorage.getItem(`wishlist_${userData.id}`) || "[]"
      );
      this.setState({ wishlist: localWishlist });

      // Then try to get from API
      const response = await fetch(
        `${this.state.baseUrl}/api/wishlist/${userData.id}`
      );
      if (response.ok) {
        const apiWishlist = await response.json();
        // If API has items, update local state and localStorage
        if (apiWishlist && apiWishlist.length > 0) {
          this.setState({ wishlist: apiWishlist });
          localStorage.setItem(
            `wishlist_${userData.id}`,
            JSON.stringify(apiWishlist)
          );
        }
      }
    } catch (error) {
      console.error("Failed to fetch wishlist:", error);
      // We already loaded from localStorage, so it's fine if this fails
    }
  };

  fetchPortfolioStatus = async () => {
    try {
      if (!this.state.userData || !this.state.userData.id) {
        console.log("No user data or user ID available");
        return;
      }

      console.log(
        `Fetching portfolio status for user ID: ${this.state.userData.id}`
      );

      const response = await fetch(
        `${this.state.baseUrl}/api/portfolio-status/${this.state.userData.id}`
      );

      if (response.ok) {
        const data = await response.json();
        console.log("Portfolio status response:", data);

        // Clear any previous timeouts to avoid race conditions
        if (this.portfolioStatusTimeout) {
          clearTimeout(this.portfolioStatusTimeout);
        }

        this.setState({ portfolioStatus: data.status }, () => {
          console.log(
            "Updated portfolio status state:",
            this.state.portfolioStatus
          );
        });
      } else {
        console.error(
          `Error response: ${response.status} ${response.statusText}`
        );
        // Set status to null
        this.setState({ portfolioStatus: null });

        // Try alternative methods to check status
        this.checkLocalStorage();
        this.checkLocalSubmissions();
      }
    } catch (error) {
      console.error("Error fetching portfolio status:", error);
      // For demo purposes, try local checking as fallback
      this.checkLocalStorage();
      this.checkLocalSubmissions();
    }
  };

  checkLocalStorage = () => {
    try {
      // Try to get portfolio status from localStorage as a fallback
      const userId = this.state.userData?.id;
      if (!userId) return;

      const portfolioStatusKey = `portfolio_status_${userId}`;
      const storedStatus = localStorage.getItem(portfolioStatusKey);

      if (storedStatus) {
        console.log("Found portfolio status in localStorage:", storedStatus);
        this.setState({ portfolioStatus: storedStatus });
      } else {
        console.log("No portfolio status found in localStorage");
        // Check if we need to create a default entry
        const userEmail = this.state.userData?.email;
        if (userEmail === "prasanya.webdev@gmail.com") {
          // Default admin to approved
          localStorage.setItem(portfolioStatusKey, "approved");
          this.setState({ portfolioStatus: "approved" });
        } else {
          // Default to null
          this.setState({ portfolioStatus: null });
        }
      }
    } catch (error) {
      console.error("Error checking localStorage:", error);
    }
  };

  checkLocalSubmissions = async () => {
    try {
      if (!this.state.userData || !this.state.userData.id) {
        console.log("No user data available for local submissions check");
        return;
      }

      console.log(
        `Checking local submissions for user ID: ${this.state.userData.id}`
      );

      // First try to directly fetch the user's portfolio
      const portfolioResponse = await fetch(
        `${this.state.baseUrl}/api/portfolio/user/${this.state.userData.id}`
      );

      if (portfolioResponse.ok) {
        const portfolioData = await portfolioResponse.json();
        if (portfolioData.hasPortfolio && portfolioData.portfolio) {
          console.log("Found portfolio directly:", portfolioData.portfolio);
          this.setState({ portfolioStatus: portfolioData.portfolio.status });
          return;
        }
      }

      // If direct fetch fails, try the admin submissions endpoint
      const response = await fetch(
        `${this.state.baseUrl}/api/admin/portfolio-submissions`
      );

      if (response.ok) {
        const submissions = await response.json();
        // Find submission matching this user's ID
        const userSubmission = submissions.find(
          (sub) =>
            (sub.userId && sub.userId.toString() === this.state.userData.id) ||
            (sub.userId &&
              sub.userId._id &&
              sub.userId._id.toString() === this.state.userData.id) ||
            sub.email === this.state.userData.email
        );

        if (userSubmission) {
          console.log(
            "Found user submission in all submissions:",
            userSubmission
          );
          this.setState({ portfolioStatus: userSubmission.status });
        } else {
          console.log("No matching submission found for current user");
        }
      }
    } catch (error) {
      console.error("Error in local submissions check:", error);
    }
  };

  getFullImageUrl = (relativePath) => {
    if (!relativePath) return null;
    if (relativePath.startsWith("http")) return relativePath;
    if (relativePath.startsWith("data:")) return relativePath;
    return `${this.state.baseUrl}${relativePath}`;
  };

  handleLogout = () => {
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  toggleEditMode = () => {
    this.setState((prevState) => ({
      isEditing: !prevState.isEditing,
      formData: !prevState.isEditing
        ? {
            name: this.state.userData.name || "",
            email: this.state.userData.email || "",
            role: this.state.userData.role || "",
            profession: this.state.userData.profession || "",
          }
        : prevState.formData,
      previewImage: !prevState.isEditing
        ? this.getFullImageUrl(this.state.userData.profileImage)
        : this.state.previewImage,
      profileImage: !prevState.isEditing ? null : this.state.profileImage,
    }));
  };

  handleInputChange = (e) => {
    const { name, value } = e.target;
    this.setState((prevState) => ({
      formData: {
        ...prevState.formData,
        [name]: value,
      },
    }));
  };

  handlePortfolioInputChange = (e) => {
    const { name, value } = e.target;
    this.setState((prevState) => ({
      portfolioFormData: {
        ...prevState.portfolioFormData,
        [name]: value,
      },
    }));
  };

  // handleResumeChange = (e) => {
  //   if (e.target.files && e.target.files[0]) {
  //     const file = e.target.files[0];
  //     this.setState({
  //       portfolioFormData: {
  //         ...this.state.portfolioFormData,
  //         resume: file,
  //       },
  //       resumeFileName: file.name,
  //     });
  //   }
  // };

  handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      const reader = new FileReader();
      reader.onloadend = () => {
        this.setState({
          previewImage: reader.result,
          profileImage: file,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  handleTabChange = (tab) => {
    this.setState({ activeTab: tab, showPortfolioForm: false });
  };

  togglePortfolioForm = () => {
    this.setState((prevState) => ({
      showPortfolioForm: !prevState.showPortfolioForm,
      portfolioFormData: {
        name: this.state.userData?.name || "",
        profession: this.state.userData?.profession || "",
        email: this.state.userData?.email || "",
        workExperience: "",
        portfolioLink: "",
        about: "",
        serviceName: "",
        serviceDescription: "",
        pricing: [
          { level: "Basic", price: "", timeFrame: "" },
          { level: "Standard", price: "", timeFrame: "" },
          { level: "Premium", price: "", timeFrame: "" },
        ],
      },
      resumeFileName: "",
    }));
  };

  handlePricingChange = (e, index) => {
    const { name, value } = e.target;
    this.setState((prevState) => {
      const updatedPricing = [...prevState.portfolioFormData.pricing];
      updatedPricing[index] = {
        ...updatedPricing[index],
        [name]: value,
      };

      return {
        portfolioFormData: {
          ...prevState.portfolioFormData,
          pricing: updatedPricing,
        },
      };
    });
  };

  handleSubmit = async (e) => {
    e.preventDefault();
    this.setState({ isLoading: true });

    try {
      const { formData, profileImage, userData } = this.state;

      if (!userData.id) {
        this.setState({
          isLoading: false,
          error: "You need to login again before updating your profile.",
          errorType: "new_user_edit",
          isEditing: false,
        });
        return;
      }

      const submitData = new FormData();
      submitData.append("name", formData.name);
      submitData.append("email", formData.email);
      submitData.append("role", formData.role);
      submitData.append("profession", formData.profession);
      submitData.append("userId", userData.id);
      submitData.append("voatId", userData.voatId); // Preserve VOAT ID
      submitData.append("voatPoints", userData.voatPoints); // Preserve VOAT points
      submitData.append("badge", userData.badge); // Preserve badge

      if (profileImage) {
        submitData.append("profileImage", profileImage);
      }

      const response = await fetch(`${this.state.baseUrl}/api/update-profile`, {
        method: "POST",
        body: submitData,
      });

      if (!response.ok) {
        throw new Error("Failed to update profile");
      }

      const result = await response.json();

      const updatedUserData = {
        ...userData,
        ...formData,
        profileImage: result.profileImage || userData.profileImage,
      };

      localStorage.setItem("user", JSON.stringify(updatedUserData));

      this.setState({
        userData: updatedUserData,
        isLoading: false,
        isEditing: false,
        previewImage:
          this.getFullImageUrl(result.profileImage) ||
          this.getFullImageUrl(userData.profileImage),
      });

      alert("Profile updated successfully!");
    } catch (error) {
      console.error("Update error:", error);
      this.setState({
        isLoading: false,
        error: "Failed to update profile. Please try again.",
        errorType: "update_error",
      });
    }
  };

  handlePortfolioSubmit = async (e) => {
    e.preventDefault();
    this.setState({ isLoading: true, error: null });

    try {
      const { portfolioFormData, userData } = this.state;
      const baseUrl = this.state.baseUrl || "http://localhost:5000";

      // Skip the connection test and proceed directly to submission
      console.log("Proceeding with portfolio submission...");
      const formData = new FormData();

      // Add form data fields
      formData.append("name", portfolioFormData.name);
      formData.append("profession", portfolioFormData.profession);
      formData.append("email", portfolioFormData.email);
      formData.append("workExperience", portfolioFormData.workExperience || "");
      formData.append("portfolioLink", portfolioFormData.portfolioLink || "");
      formData.append("about", portfolioFormData.about || "");

      // Make sure userId is included properly and is valid
      if (userData && userData.id) {
        formData.append("userId", userData.id);
      }

      // This indicates it's a new submission that needs admin review
      formData.append("isNewSubmission", "true");

      // Create a service object to append to the portfolio if provided
      if (
        portfolioFormData.serviceName &&
        portfolioFormData.serviceDescription
      ) {
        const service = {
          name: portfolioFormData.serviceName,
          description: portfolioFormData.serviceDescription,
          pricing: portfolioFormData.pricing || [],
        };

        // Stringify the service object to pass it in the form
        formData.append("service", JSON.stringify(service));
      }

      // Log the URL being used
      const requestUrl = `${baseUrl}/api/portfolio`;
      console.log("Sending request to:", requestUrl);

      // Use try/catch specifically for the portfolio submission
      try {
        const response = await fetch(requestUrl, {
          method: "POST",
          body: formData,
          headers: {
            Accept: "application/json",
          },
        });

        if (!response.ok) {
          let errorMessage = `HTTP error ${response.status}`;
          try {
            const errorData = await response.text();
            errorMessage = `${errorMessage}: ${errorData}`;
          } catch (e) {
            // Ignore error parsing body
          }
          throw new Error(errorMessage);
        }

        const result = await response.json();
        console.log("Submission successful:", result);

        // Clear any previous status timeout
        if (this.portfolioStatusTimeout) {
          clearTimeout(this.portfolioStatusTimeout);
        }

        // Update the state immediately
        this.setState({
          isLoading: false,
          showPortfolioForm: false,
          portfolioStatus: "pending",
        });

        // Set a timeout to refresh the status in case there's a race condition
        this.portfolioStatusTimeout = setTimeout(() => {
          this.fetchPortfolioStatus();
        }, 1000);

        // Also add the service to the database with a separate API call
        if (userData && userData.id && portfolioFormData.serviceName) {
          try {
            const serviceData = {
              userId: userData.id,
              name: portfolioFormData.serviceName,
              description: portfolioFormData.serviceDescription,
              pricing: portfolioFormData.pricing || [],
            };

            const serviceResponse = await fetch(`${baseUrl}/api/add-service`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(serviceData),
            });

            if (serviceResponse.ok) {
              console.log("Service added successfully!");
            } else {
              console.error(
                "Failed to add service:",
                await serviceResponse.text()
              );
            }
          } catch (serviceError) {
            console.error("Error adding service:", serviceError);
          }
        }

        alert(
          "Portfolio submitted successfully! It will be reviewed by the admin."
        );
      } catch (fetchError) {
        console.error("Fetch error details:", fetchError);
        throw new Error(`Failed to submit portfolio: ${fetchError.message}`);
      }
    } catch (error) {
      console.error("Portfolio submission error:", error);

      this.setState({
        isLoading: false,
        error: error.message,
      });

      alert(`Failed to submit portfolio: ${error.message}`);
    }
  };

  handleResumeChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      this.setState({
        resumeFileName: file.name,
        portfolioFormData: {
          ...this.state.portfolioFormData,
          resume: file,
        },
      });
      console.log("Resume file attached:", file.name);
    }
  };

  handleViewPortfolio = () => {
    // Navigate to portfolio page or show a modal with portfolio details
    window.location.href = `/my-portfolio/${this.state.userData.id}`;
    // Alternative: Show a modal with portfolio details
    // this.setState({ showPortfolioDetails: true });
  };

  removeFromWishlist = async (itemId) => {
    try {
      const userData = JSON.parse(localStorage.getItem("user") || "{}");
      if (!userData || !userData.id) return;

      // Update local state
      this.setState((prevState) => ({
        wishlist: prevState.wishlist.filter((item) => item.id !== itemId),
      }));

      // Update localStorage
      const updatedWishlist = this.state.wishlist.filter(
        (item) => item.id !== itemId
      );
      localStorage.setItem(
        `wishlist_${userData.id}`,
        JSON.stringify(updatedWishlist)
      );

      // Try to update server
      await fetch(`${this.state.baseUrl}/api/wishlist/remove/${itemId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: userData.id }),
      });
    } catch (error) {
      console.error("Failed to remove from wishlist:", error);
    }
  };

  renderUserProfile() {
    const { userData } = this.state;
    const profileImageUrl = this.getFullImageUrl(userData.profileImage);

    console.log("User data in profile render:", userData);
    console.log("VOAT ID value:", userData.voatId);

    // Badge styling
    const badgeColors = {
      platinum: "linear-gradient(135deg, #e5e4e2, #b9b8b7)",
      gold: "linear-gradient(135deg, #ffd700, #ffcc00)",
      silver: "linear-gradient(135deg, #c0c0c0, #a9a9a9)",
      bronze: "linear-gradient(135deg, #cd7f32, #a76a2c)",
    };

    const badgeStyle = {
      background: badgeColors[userData.badge] || badgeColors.bronze,
      color:
        userData.badge === "platinum" || userData.badge === "silver"
          ? "#333"
          : "#fff",
      padding: "6px 12px",
      borderRadius: "30px",
      fontWeight: "600",
      fontSize: "14px",
      display: "inline-block",
      textTransform: "capitalize",
      boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
    };

    return (
      <div className="user-info-card">
        <div className="profile-image-container">
          {profileImageUrl ? (
            <img
              src={profileImageUrl}
              alt="Profile"
              className="profile-image"
            />
          ) : (
            <div className="profile-image-placeholder">
              {userData.name ? userData.name.charAt(0).toUpperCase() : "U"}
            </div>
          )}
        </div>
        <h2>Welcome, {userData.name}!</h2>

        {/* Badge display */}
        <div style={{ textAlign: "center", margin: "15px 0" }}>
          <span style={badgeStyle}>{userData.badge} Member</span>
        </div>

        <div className="user-details">
          <div className="user-detail-item">
            <span className="detail-label">Name:</span>
            <span className="detail-value">{userData.name}</span>
          </div>
          <div className="user-detail-item">
            <span className="detail-label">Email:</span>
            <span className="detail-value">{userData.email}</span>
          </div>
          {userData.role && (
            <div className="user-detail-item">
              <span className="detail-label">Role:</span>
              <span className="detail-value">{userData.role}</span>
            </div>
          )}
          {userData.profession && (
            <div className="user-detail-item">
              <span className="detail-label">Profession:</span>
              <span className="detail-value">{userData.profession}</span>
            </div>
          )}
          <div className="user-detail-item">
            <span className="detail-label">VOAT ID:</span>
            <span className="detail-value">{userData.voatId}</span>
          </div>
          <div className="user-detail-item">
            <span className="detail-label">VOAT Points:</span>
            <span className="detail-value">{userData.voatPoints}</span>
          </div>
        </div>
        <div className="action-buttons">
          <button className="edit-button" onClick={this.toggleEditMode}>
            Edit Profile
          </button>
          <button className="logout-button" onClick={this.handleLogout}>
            Logout
          </button>
        </div>
      </div>
    );
  }

  renderEditForm() {
    const { formData, previewImage } = this.state;

    return (
      <div className="user-edit-form">
        <form onSubmit={this.handleSubmit}>
          <div className="profile-image-upload">
            {previewImage ? (
              <img
                src={previewImage}
                alt="Profile Preview"
                className="profile-image"
              />
            ) : (
              <div className="profile-image-placeholder">
                {formData.name ? formData.name.charAt(0).toUpperCase() : "U"}
              </div>
            )}
            <div className="image-upload-controls">
              <label htmlFor="profile-image" className="upload-btn">
                Choose Image
              </label>
              <input
                type="file"
                id="profile-image"
                accept="image/*"
                onChange={this.handleImageChange}
                style={{ display: "none" }}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="name">Name:</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={this.handleInputChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email:</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={this.handleInputChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="role">Role:</label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={this.handleInputChange}
              className="form-select"
            >
              <option value="">Select your role</option>
              <option value="Freelancer/Service Provider">
                Freelancer/Service Provider
              </option>
              <option value="Service Getter">Service Getter</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="profession">Profession:</label>
            <input
              type="text"
              id="profession"
              name="profession"
              value={formData.profession}
              onChange={this.handleInputChange}
            />
          </div>

          <div className="form-buttons">
            <button type="submit" className="save-button">
              Save Changes
            </button>
            <button
              type="button"
              className="cancel-button"
              onClick={this.toggleEditMode}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    );
  }

  renderPortfolioForm() {
    const { portfolioFormData } = this.state;

    return (
      <div className="user-edit-form portfolio-form">
        <h2>Submit Your Portfolio</h2>
        <p style={{ marginBottom: "20px", textAlign: "center" }}>
          Complete this form to join our freelancer directory. Your submission
          will be reviewed by our admin team.
        </p>

        <form onSubmit={this.handlePortfolioSubmit}>
          <div className="form-group">
            <label htmlFor="portfolio-name">Full Name:</label>
            <input
              type="text"
              id="portfolio-name"
              name="name"
              value={portfolioFormData.name}
              onChange={this.handlePortfolioInputChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="portfolio-profession">Professional Headline:</label>
            <input
              type="text"
              id="portfolio-profession"
              name="profession"
              value={portfolioFormData.profession}
              onChange={this.handlePortfolioInputChange}
              placeholder="e.g. Web Developer"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="portfolio-email">Email:</label>
            <input
              type="email"
              id="portfolio-email"
              name="email"
              value={portfolioFormData.email}
              onChange={this.handlePortfolioInputChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="portfolio-experience">
              Work Experience (Years):
            </label>
            <input
              type="number"
              id="portfolio-experience"
              name="workExperience"
              value={portfolioFormData.workExperience}
              onChange={this.handlePortfolioInputChange}
              min="0"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="portfolio-about">About Me:</label>
            <textarea
              id="portfolio-about"
              name="about"
              rows="4"
              value={portfolioFormData.about}
              onChange={this.handlePortfolioInputChange}
              placeholder="Share details about your background, skills, and experience"
              required
            ></textarea>
          </div>

          <div className="form-group">
            <label htmlFor="portfolio-link">Personal Portfolio Link:</label>
            <input
              type="url"
              id="portfolio-link"
              name="portfolioLink"
              value={portfolioFormData.portfolioLink}
              onChange={this.handlePortfolioInputChange}
              placeholder="https://your-portfolio-website.com"
            />
          </div>

          {/* Service Section */}
          <div className="service-section">
            <h3>Service Details</h3>
            <div className="form-group">
              <label htmlFor="service-name">Service Name:</label>
              <input
                type="text"
                id="service-name"
                name="serviceName"
                value={portfolioFormData.serviceName}
                onChange={this.handlePortfolioInputChange}
                placeholder="e.g. Web Development"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="service-description">Service Description:</label>
              <textarea
                id="service-description"
                name="serviceDescription"
                rows="4"
                value={portfolioFormData.serviceDescription}
                onChange={this.handlePortfolioInputChange}
                placeholder="Describe your service in detail"
                required
              ></textarea>
            </div>

            {/* Pricing Options */}
            <div className="pricing-section">
              <h4>Pricing Options</h4>
              {portfolioFormData.pricing.map((pricing, index) => (
                <div key={index} className="pricing-level">
                  <h5>{pricing.level} Package</h5>
                  <div className="form-row">
                    <div className="form-group half">
                      <label htmlFor={`price-${index}`}>Price ($):</label>
                      <input
                        type="number"
                        id={`price-${index}`}
                        name="price"
                        value={pricing.price}
                        onChange={(e) => this.handlePricingChange(e, index)}
                        placeholder="e.g. 499"
                        required
                      />
                    </div>
                    <div className="form-group half">
                      <label htmlFor={`timeFrame-${index}`}>Time Frame:</label>
                      <input
                        type="text"
                        id={`timeFrame-${index}`}
                        name="timeFrame"
                        value={pricing.timeFrame}
                        onChange={(e) => this.handlePricingChange(e, index)}
                        placeholder="e.g. 2 weeks"
                        required
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="form-buttons">
            <button type="submit" className="save-button">
              Submit Portfolio
            </button>
            <button
              type="button"
              className="cancel-button"
              onClick={this.togglePortfolioForm}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    );
  }

  renderOrders() {
    const { orders } = this.state;

    if (orders.length === 0) {
      return (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <h3>No Orders Yet</h3>
          <p>
            You haven't placed any orders yet. Start exploring our services!
          </p>
        </div>
      );
    }

    return (
      <div className="orders-container">
        <h2>My Orders</h2>
        <div className="orders-list">
          <table className="orders-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Service</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr
                  key={order.id}
                  className={`order-row status-${order.status.toLowerCase()}`}
                >
                  <td>{order.id}</td>
                  <td>{order.service}</td>
                  <td>{order.date}</td>
                  <td>${order.amount}</td>
                  <td>
                    <span
                      className={`status-badge ${order.status.toLowerCase()}`}
                    >
                      {order.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  renderWishlist() {
    const { wishlist } = this.state;

    if (wishlist.length === 0) {
      return (
        <div className="empty-state">
          <div className="empty-state-icon">❤️</div>
          <h3>Your Wishlist is Empty</h3>
          <p>Save your favorite services to your wishlist for later!</p>
        </div>
      );
    }

    return (
      <div className="wishlist-container">
        <h2>My Wishlist</h2>
        <div className="wishlist-items">
          {wishlist.map((item) => (
            <div key={item.id} className="wishlist-item">
              <div className="wishlist-item-header">
                {/* Image section */}
                <div className="wishlist-item-image">
                  {item.profileImage ? (
                    <img
                      src={
                        item.profileImage.startsWith("http")
                          ? item.profileImage
                          : `${this.state.baseUrl}${item.profileImage}`
                      }
                      alt={`${item.provider}'s profile`}
                      onError={(e) => {
                        e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                          item.provider
                        )}&background=random&color=fff&size=100`;
                      }}
                    />
                  ) : (
                    <div className="wishlist-avatar">
                      {item.provider.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                <div className="wishlist-right-container">
                  {/* Service Title */}
                  <h3 className="wishlist-service">{item.service}</h3>

                  {/* Provider */}
                  <div className="wishlist-provider">by {item.provider}</div>

                  {/* Price */}
                  <div className="wishlist-price">Pricing: ${item.price}</div>
                </div>
              </div>

              {/* Button section */}
              <div className="wishlist-actions">
                <button className="add-to-cart-btn">Add to Cart</button>
                <button
                  className="remove-wishlist-btn"
                  onClick={() => this.removeFromWishlist(item.id)}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  renderNewUserEditError() {
    return (
      <div className="edit-error-container">
        <div className="edit-error-icon">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        </div>
        <h2 className="edit-error-title">Session Alert</h2>
        <p className="edit-error-message">
          Sorry, you need to login again before editing your profile. This
          happens for security reasons after a new account is created.
        </p>
        <div className="edit-error-actions">
          <button className="login-again-button" onClick={this.handleLogout}>
            Login Again
          </button>
        </div>
      </div>
    );
  }

  renderSidebarButton() {
    console.log("Current portfolio status:", this.state.portfolioStatus);
    console.log("Is admin?", this.isAdmin());

    if (this.isAdmin()) {
      return (
        <div className="portfolio-button-container">
          <Link to="/admin-dashboard" className="admin-dashboard-button">
            Admin Dashboard
          </Link>
        </div>
      );
    } else {
      // Print debugging info
      console.log("Portfolio status check result:", {
        status: this.state.portfolioStatus,
        isApproved: this.state.portfolioStatus === "approved",
        isPending: this.state.portfolioStatus === "pending",
        isRejected: this.state.portfolioStatus === "rejected",
      });

      // Check portfolio status to determine which button to show
      if (this.state.portfolioStatus === "approved") {
        return (
          <div className="portfolio-button-container">
            <button
              className="view-portfolio-button"
              onClick={this.handleViewPortfolio}
            >
              View My Portfolio
            </button>
          </div>
        );
      } else if (this.state.portfolioStatus === "pending") {
        return (
          <div className="portfolio-button-container">
            <button className="pending-portfolio-button" disabled>
              Portfolio Under Review
            </button>
          </div>
        );
      } else if (this.state.portfolioStatus === "rejected") {
        return (
          <div className="portfolio-button-container">
            <button
              className="portfolio-form-button rejected"
              onClick={this.togglePortfolioForm}
            >
              Resubmit Portfolio
            </button>
          </div>
        );
      } else {
        // No portfolio or null/undefined status
        return (
          <div className="portfolio-button-container">
            <button
              className="portfolio-form-button"
              onClick={this.togglePortfolioForm}
            >
              Submit Portfolio
            </button>
          </div>
        );
      }
    }
  }

  renderDashboardContent() {
    const { activeTab, showPortfolioForm } = this.state;

    if (showPortfolioForm) {
      return this.renderPortfolioForm();
    }

    switch (activeTab) {
      case "profile":
        return this.state.isEditing
          ? this.renderEditForm()
          : this.renderUserProfile();
      case "orders":
        return this.renderOrders();
      case "wishlist":
        return this.renderWishlist();
      default:
        return this.renderUserProfile();
    }
  }

  render() {
    const { isLoading, error, errorType, activeTab } = this.state;

    if (isLoading) {
      return <div className="dashboard-loading">Loading...</div>;
    }

    if (error && errorType === "new_user_edit") {
      return (
        <>
          <NavBar />
          <div className="dashboard-container">
            {this.renderNewUserEditError()}
          </div>
          <Footer />
        </>
      );
    }

    if (error) {
      return (
        <>
          <NavBar />
          <div className="dashboard-error">
            <div className="dashboard-container">
              {this.renderNewUserEditError()}
            </div>
          </div>
          <Footer />
        </>
      );
    }

    return (
      <>
        <NavBar />
        <div className="dashboard-wrapper">
          <div className="dashboard-sidebar">
            <div className="sidebar-user">
              <div className="sidebar-user-image">
                {this.state.userData.profileImage ? (
                  <img
                    src={this.getFullImageUrl(this.state.userData.profileImage)}
                    alt={this.state.userData.name}
                  />
                ) : (
                  <div className="sidebar-user-placeholder">
                    {this.state.userData.name?.charAt(0).toUpperCase() || "U"}
                  </div>
                )}
              </div>
              <div className="sidebar-user-info">
                <h3>{this.state.userData.name}</h3>
                <span className={`badge badge-${this.state.userData.badge}`}>
                  {this.state.userData.badge}
                </span>
              </div>
            </div>

            <ul className="sidebar-menu">
              <li
                className={activeTab === "profile" ? "active" : ""}
                onClick={() => this.handleTabChange("profile")}
              >
                <span className="menu-icon">👤</span>
                <span className="menu-text">My Profile</span>
              </li>
              <li
                className={activeTab === "orders" ? "active" : ""}
                onClick={() => this.handleTabChange("orders")}
              >
                <span className="menu-icon">📋</span>
                <span className="menu-text">My Orders</span>
              </li>
              <li
                className={activeTab === "wishlist" ? "active" : ""}
                onClick={() => this.handleTabChange("wishlist")}
              >
                <span className="menu-icon">❤️</span>
                <span className="menu-text">My Wishlist</span>
              </li>
            </ul>

            {this.renderSidebarButton()}
          </div>

          <div className="dashboard-container">
            {this.renderDashboardContent()}
          </div>
        </div>
        <Footer />
      </>
    );
  }
}

export default UserDashboard;
