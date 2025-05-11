import React, { Component } from "react";
import { X } from "lucide-react";
import NavBar from "../Navbar";
import Footer from "../Footer";
import "./index.css";

class MyPortfolio extends Component {
  state = {
    isAuthenticated: false,
    isLoading: true,
    isEditingProfile: false,
    isEditingServices: false,
    baseUrl: "https://voat.onrender.com",
    activeServiceTab: "",
    showAddServiceForm: false,
    serviceData: {},
    editingServiceName: "",
    editingServiceDescription: "",
    showServiceEditForm: false,
    portfolioData: null,
    editFormData: {
      name: "",
      headline: "",
      experience: "",
      about: "",
      email: "",
    },
    services: [], // Empty array instead of default services
    newServiceName: "",
    newServiceDescription: "",
    newServicePricing: [
      { level: "Basic", price: "", timeFrame: "" },
      { level: "Standard", price: "", timeFrame: "" },
      { level: "Premium", price: "", timeFrame: "" },
    ],
    selectedPricing: null,
    profileImage: null,
    profileImagePreview: null,
    coverImage: null,
    coverImagePreview: null,
    videos: [],
    newVideo: null,
  };

  componentDidMount() {
    this.setState({ isLoading: true });

    // Get the userId from URL if present
    const pathSegments = window.location.pathname.split("/");
    const portfolioUserId = pathSegments[pathSegments.length - 1];

    // Check if we're viewing a specific user's portfolio (not our own)
    if (portfolioUserId && portfolioUserId !== "my-portfolio") {
      this.fetchPortfolioData(portfolioUserId);
    } else {
      // Viewing own portfolio - check authentication first
      setTimeout(() => {
        this.checkAuthentication();
      }, 300);
    }
  }

  checkAuthentication = () => {
    const userData = localStorage.getItem("user");
    if (userData) {
      const parsedUserData = JSON.parse(userData);
      this.setState({ isAuthenticated: true }, () => {
        this.fetchPortfolioData(parsedUserData.id);
      });
    } else {
      this.setState({
        isLoading: false,
        isAuthenticated: false,
      });
    }
  };

  fetchPortfolioData = async (userId) => {
    try {
      if (!userId) {
        throw new Error("User ID not found");
      }

      console.log("Fetching portfolio data for user:", userId);

      // Fetch user and portfolio data from the database
      const response = await fetch(`${this.state.baseUrl}/api/user/${userId}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch portfolio data");
      }

      const data = await response.json();
      console.log("Received data from server:", data);

      const { user, portfolio, services = [] } = data;

      // Make sure we have the right data structure
      if (!user) {
        throw new Error("User data not found in server response");
      }

      // Build service data structure from the services array
      const serviceData = {};
      if (services && services.length > 0) {
        services.forEach((service) => {
          const serviceKey = service.name.toLowerCase().replace(/\s+/g, "-");
          serviceData[serviceKey] = {
            id: service.id,
            description: service.description,
            pricing: service.pricing || [],
            videos: service.videos || [],
          };
        });
      }

      // Extract service names
      const serviceNames = services.map((service) => service.name);

      // Set the first service as active by default if there are any services
      const firstServiceKey =
        serviceNames.length > 0
          ? serviceNames[0].toLowerCase().replace(/\s+/g, "-")
          : "";

      // Determine if viewing own profile
      const loggedInUserData = localStorage.getItem("user");
      const loggedInUserId = loggedInUserData
        ? JSON.parse(loggedInUserData).id
        : null;
      const isOwnProfile = loggedInUserId === userId;

      // Build portfolio data object - use headline field with fallback to profession for backwards compatibility
      const portfolioData = {
        name: portfolio?.name || user.name || "",
        headline:
          portfolio?.headline || portfolio?.profession || user.profession || "",
        experience: portfolio?.workExperience || "",
        about: portfolio?.about || "",
        email: portfolio?.email || user.email || "",
        // Fix image URLs - ensure they have proper path or full URL
        profileImage:
          user.profileImage && user.profileImage !== "/api/placeholder/150/150"
            ? user.profileImage.startsWith("http")
              ? user.profileImage
              : `${this.state.baseUrl}/${user.profileImage.replace(/^\//, "")}`
            : "/api/placeholder/150/150",
        coverImage:
          portfolio?.coverImage &&
          portfolio?.coverImage !== "/api/placeholder/800/200"
            ? portfolio.coverImage.startsWith("http")
              ? portfolio.coverImage
              : `${this.state.baseUrl}/${portfolio.coverImage.replace(
                  /^\//,
                  ""
                )}`
            : "/api/placeholder/800/200",
        services: serviceNames,
        isApproved: portfolio?.status === "approved",
        isOwnProfile: isOwnProfile,
      };
      // Get videos if available from the response
      const videos = data.videos || [];

      this.setState({
        portfolioData,
        editFormData: {
          name: portfolioData.name,
          headline: portfolioData.headline,
          experience: portfolioData.experience,
          about: portfolioData.about,
          email: portfolioData.email,
        },
        services: serviceNames,
        serviceData: serviceData,
        videos: videos,
        isLoading: false,
        activeServiceTab: firstServiceKey,
      });

      // Store as fallback
      localStorage.setItem(`profile_${userId}`, JSON.stringify(portfolioData));
      localStorage.setItem(`services_${userId}`, JSON.stringify(serviceNames));
      localStorage.setItem(
        `serviceData_${userId}`,
        JSON.stringify(serviceData)
      );
      localStorage.setItem(`videos_${userId}`, JSON.stringify(videos));
    } catch (error) {
      console.error("Error fetching portfolio data:", error);

      // Try to load from localStorage first before using hardcoded fallback
      const storedProfile = localStorage.getItem(`profile_${userId}`);

      if (storedProfile) {
        const parsedProfile = JSON.parse(storedProfile);
        this.setState({
          portfolioData: parsedProfile,
          editFormData: {
            name: parsedProfile.name,
            headline: parsedProfile.headline,
            experience: parsedProfile.experience,
            about: parsedProfile.about,
            email: parsedProfile.email,
          },
          services: parsedProfile.services,
          isLoading: false,
        });
      } else {
        // Last resort fallback to hardcoded mock data
        const mockData = {
          name: "Demo User",
          headline: "Professional",
          experience: "5 years",
          about: "This portfolio data could not be loaded.",
          email: "unknown@example.com",
          profileImage: "/api/placeholder/150/150",
          coverImage: "/api/placeholder/800/200",
          services: [],
          isApproved: true,
          isOwnProfile: false,
          pricingOptions: [
            { id: 1, name: "Basic Package", price: 499 },
            { id: 2, name: "Standard Package", price: 999 },
            { id: 3, name: "Premium Package", price: 1499 },
          ],
          videos: [],
        };

        this.setState({
          portfolioData: mockData,
          editFormData: {
            name: mockData.name,
            headline: mockData.headline,
            experience: mockData.experience,
            about: mockData.about,
            email: mockData.email,
          },
          services: mockData.services,
          isLoading: false,
        });
      }
    }
  };

  handleInputChange = (e) => {
    const { name, value } = e.target;
    this.setState((prevState) => ({
      editFormData: {
        ...prevState.editFormData,
        [name]: value,
      },
    }));
  };

  handleProfileImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        this.setState({
          profileImage: file,
          profileImagePreview: reader.result,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  handleCoverImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        this.setState({
          coverImage: file,
          coverImagePreview: reader.result,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  toggleEditProfile = () => {
    const { portfolioData } = this.state;
    this.setState((prevState) => ({
      isEditingProfile: !prevState.isEditingProfile,
      editFormData: !prevState.isEditingProfile
        ? {
            name: portfolioData.name || "",
            headline: portfolioData.headline || "",
            experience: portfolioData.experience || "",
            about: portfolioData.about || "",
            email: portfolioData.email || "",
          }
        : prevState.editFormData,
      profileImage: null,
      profileImagePreview: null,
      coverImage: null,
      coverImagePreview: null,
    }));
  };

  toggleAddServiceForm = () => {
    console.log("Add service button clicked!");
    this.setState((prevState) => ({
      showAddServiceForm: !prevState.showAddServiceForm,
      newServiceName: "",
      newServiceDescription: "",
      newServicePricing: [
        { level: "Basic", price: "", timeFrame: "" },
        { level: "Standard", price: "", timeFrame: "" },
        { level: "Premium", price: "", timeFrame: "" },
      ],
    }));
  };

  handleAddService = async (e) => {
    e.preventDefault();
    const {
      newServiceName,
      newServiceDescription,
      newServicePricing,
      services,
    } = this.state;

    if (newServiceName.trim() === "") {
      alert("Service name is required");
      return;
    }

    const serviceKey = newServiceName.toLowerCase().replace(/\s+/g, "-");

    // Check if service already exists
    if (
      services.some(
        (service) => service.toLowerCase().replace(/\s+/g, "-") === serviceKey
      )
    ) {
      alert("A service with this name already exists");
      return;
    }

    try {
      // Get user ID
      const userData = localStorage.getItem("user");
      const userId = userData ? JSON.parse(userData).id : null;

      if (!userId) {
        throw new Error("User ID not found");
      }

      // Prepare data for API
      const serviceData = {
        userId: userId,
        name: newServiceName,
        description: newServiceDescription,
        pricing: newServicePricing,
      };

      // Call API to save new service to database
      const response = await fetch(`${this.state.baseUrl}/api/add-service`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(serviceData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to add service");
      }

      const result = await response.json();
      console.log("Service added to database:", result);

      // Update the local state with data from the server response
      const updatedServiceData = { ...this.state.serviceData };
      updatedServiceData[serviceKey] = {
        id: result.serviceId, // Save the ID from the database
        description: newServiceDescription,
        videos: [],
        pricing: newServicePricing,
      };

      const updatedServices = [...services, newServiceName];

      this.setState({
        services: updatedServices,
        serviceData: updatedServiceData,
        showAddServiceForm: false,
        activeServiceTab:
          services.length === 0 ? serviceKey : this.state.activeServiceTab,
        newServiceName: "",
        newServiceDescription: "",
        newServicePricing: [
          { level: "Basic", price: "", timeFrame: "" },
          { level: "Standard", price: "", timeFrame: "" },
          { level: "Premium", price: "", timeFrame: "" },
        ],
      });

      // Also update localStorage as fallback
      localStorage.setItem(
        `services_${userId}`,
        JSON.stringify(updatedServices)
      );
      localStorage.setItem(
        `serviceData_${userId}`,
        JSON.stringify(updatedServiceData)
      );

      alert("Service successfully added to database!");
    } catch (error) {
      console.error("Error adding service to database:", error);
      alert("Error saving service to database: " + error.message);
    }
  };

  handleRemoveService = (index) => {
    const updatedServices = [...this.state.services];
    updatedServices.splice(index, 1);
    this.setState({ services: updatedServices });
  };

  handleServiceInputChange = (e) => {
    this.setState({ newServiceName: e.target.value });
  };

  handleServiceFormChange = (e, field, index) => {
    if (field === "name") {
      this.setState({ newServiceName: e.target.value });
    } else if (field === "description") {
      this.setState({ newServiceDescription: e.target.value });
    } else if (field === "pricing") {
      const { newServicePricing } = this.state;
      const updatedPricing = [...newServicePricing];
      updatedPricing[index] = {
        ...updatedPricing[index],
        [e.target.name]: e.target.value,
      };
      this.setState({ newServicePricing: updatedPricing });
    }
  };

  handleTabChange = (tab) => {
    this.setState({ activeServiceTab: tab });
  };

  toggleServiceEditForm = (serviceName = "") => {
    const serviceKey = serviceName.toLowerCase().replace(/\s+/g, "-");

    this.setState({
      showServiceEditForm: !this.state.showServiceEditForm,
      editingServiceName: serviceName,
      editingServiceDescription: serviceName
        ? this.state.serviceData[serviceKey]?.description || ""
        : "",
    });
  };

  handleServiceDescriptionChange = (e) => {
    this.setState({ editingServiceDescription: e.target.value });
  };

  updateServiceDescription = () => {
    const { editingServiceName, editingServiceDescription, serviceData } =
      this.state;
    const serviceKey = editingServiceName.toLowerCase().replace(/\s+/g, "-");

    const updatedServiceData = { ...serviceData };
    if (!updatedServiceData[serviceKey]) {
      updatedServiceData[serviceKey] = {
        description: editingServiceDescription,
        videos: [],
        pricing: [],
      };
    } else {
      updatedServiceData[serviceKey] = {
        ...updatedServiceData[serviceKey],
        description: editingServiceDescription,
      };
    }

    this.setState({
      serviceData: updatedServiceData,
      showServiceEditForm: false,
      editingServiceName: "",
      editingServiceDescription: "",
    });
  };

  handleServiceHoverRemove = (index) => {
    if (window.confirm("Are you sure you want to remove this service?")) {
      const updatedServices = [...this.state.services];
      const removedService = updatedServices[index];
      const serviceKey = removedService.toLowerCase().replace(/\s+/g, "-");

      updatedServices.splice(index, 1);

      // Also remove the service data
      const updatedServiceData = { ...this.state.serviceData };
      delete updatedServiceData[serviceKey];

      // Set a new active tab if the current one is being removed
      let newActiveTab = this.state.activeServiceTab;
      if (
        serviceKey === this.state.activeServiceTab &&
        updatedServices.length > 0
      ) {
        newActiveTab = updatedServices[0].toLowerCase().replace(/\s+/g, "-");
      }

      this.setState({
        services: updatedServices,
        serviceData: updatedServiceData,
        activeServiceTab: newActiveTab,
      });
    }
  };

  handleAddVideo = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // Create a thumbnail from the video
      const videoUrl = URL.createObjectURL(file);

      // Create video element to get thumbnail
      const video = document.createElement("video");
      video.preload = "metadata";
      video.src = videoUrl;

      video.onloadedmetadata = () => {
        // Create a canvas to capture the thumbnail
        const canvas = document.createElement("canvas");
        canvas.width = 320;
        canvas.height = 180;

        // Seek to a frame and draw it
        video.currentTime = 1; // Seek to 1 second

        video.onseeked = () => {
          const ctx = canvas.getContext("2d");
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const thumbnailUrl = canvas.toDataURL("image/jpeg");

          const newVideo = {
            id: Date.now(),
            url: videoUrl,
            thumbnail: thumbnailUrl,
            serviceName: this.state.activeServiceTab,
          };

          this.setState((prevState) => ({
            videos: [...prevState.videos, newVideo],
          }));
        };
      };
    }
  };

  handleRemoveVideo = (videoId) => {
    const updatedVideos = this.state.videos.filter(
      (video) => video.id !== videoId
    );
    this.setState({ videos: updatedVideos });
  };

  handlePricingSelect = (pricingId) => {
    this.setState({ selectedPricing: pricingId });
  };

  handleAddToCart = () => {
    const { selectedPricing, activeServiceTab, serviceData } = this.state;

    if (!activeServiceTab || !serviceData[activeServiceTab]) {
      alert("Please select a service first");
      return;
    }

    if (selectedPricing === null) {
      alert("Please select a pricing option first");
      return;
    }

    const selectedPackage =
      serviceData[activeServiceTab].pricing[selectedPricing];

    if (selectedPackage) {
      // In a real app, you would add this to a cart in state/localStorage/API
      alert(
        `Added to cart: ${selectedPackage.level} Package - $${selectedPackage.price}`
      );
    }
  };

  handleSaveProfile = async (e) => {
    e.preventDefault();
    this.setState({ isLoading: true });

    try {
      const { editFormData, profileImage, coverImage } = this.state;
      const userData = localStorage.getItem("user");
      const parsedUserData = userData ? JSON.parse(userData) : null;
      const userId = parsedUserData?.id;

      if (!userId) {
        throw new Error("User ID not found");
      }

      // Create FormData for multipart form submission
      const formData = new FormData();
      formData.append("userId", userId);
      formData.append("name", editFormData.name);

      // IMPORTANT: Send both fields for consistency
      formData.append("profession", editFormData.headline); // Store headline as profession for backward compatibility
      formData.append("headline", editFormData.headline); // Also store headline explicitly

      formData.append("workExperience", editFormData.experience);
      formData.append("about", editFormData.about);
      formData.append("email", editFormData.email);
      formData.append("isNewSubmission", "true"); // Add this to ensure status is set to pending for admin review

      if (profileImage) {
        formData.append("profileImage", profileImage);
      }

      if (coverImage) {
        formData.append("coverImage", coverImage);
      }

      console.log("Sending update to backend:", {
        userId,
        name: editFormData.name,
        profession: editFormData.headline,
        headline: editFormData.headline,
      });

      // Make API call to the correct endpoint
      const response = await fetch(`${this.state.baseUrl}/api/portfolio`, {
        method: "POST",
        body: formData,
        // Don't set Content-Type header with FormData - browser will set it with boundary
      });

      // Handle response...
      const result = await response.json();
      console.log("Database update result:", result);

      if (!result.success) {
        throw new Error(result.message || "Unknown error occurred");
      }

      // Update state with server response
      const updatedPortfolioData = {
        ...this.state.portfolioData,
        name: editFormData.name,
        headline: editFormData.headline,
        experience: editFormData.experience,
        about: editFormData.about,
        email: editFormData.email,
        profileImage:
          result.portfolio?.profileImage ||
          this.state.portfolioData.profileImage,
        coverImage:
          result.portfolio?.coverImage || this.state.portfolioData.coverImage,
      };

      this.setState({
        portfolioData: updatedPortfolioData,
        isLoading: false,
        isEditingProfile: false,
      });

      // Save to localStorage as fallback
      localStorage.setItem(
        `profile_${userId}`,
        JSON.stringify(updatedPortfolioData)
      );

      alert("Portfolio updated successfully!");
    } catch (error) {
      console.error("Error updating portfolio:", error);
      this.setState({
        isLoading: false,
      });
      alert("Error updating portfolio: " + error.message);
    }
  };

  handleSaveServices = async () => {
    try {
      const { services, portfolioData } = this.state;

      // Replace with actual API call
      const response = await fetch(
        `${this.state.baseUrl}/api/update-services`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ services }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update services");
      }

      const updatedPortfolioData = {
        ...portfolioData,
        services,
      };

      this.setState({
        portfolioData: updatedPortfolioData,
        isEditingServices: false,
      });

      alert("Services updated successfully!");
    } catch (error) {
      console.error("Error updating services:", error);

      // For demo, update state anyway
      const updatedPortfolioData = {
        ...this.state.portfolioData,
        services: this.state.services,
      };

      this.setState({
        portfolioData: updatedPortfolioData,
        isEditingServices: false,
      });

      alert("Services updated successfully! (Demo mode)");
    }
  };

  renderEditProfileForm() {
    const {
      editFormData,
      profileImagePreview,
      coverImagePreview,
      portfolioData,
    } = this.state;

    // Ensure image URLs are valid
    const profileImageUrl =
      profileImagePreview ||
      (portfolioData.profileImage &&
      portfolioData.profileImage !== "/api/placeholder/150/150"
        ? portfolioData.profileImage
        : "/api/placeholder/150/150");

    const coverImageUrl =
      coverImagePreview ||
      (portfolioData.coverImage &&
      portfolioData.coverImage !== "/api/placeholder/800/200"
        ? portfolioData.coverImage
        : "/api/placeholder/800/200");

    return (
      <div className="modal-overlay">
        <div className="modal-content">
          <div className="modal-header">
            <h2>Edit Profile</h2>
            <button
              className="close-modal-btn"
              onClick={this.toggleEditProfile}
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>

          <div className="modal-body">
            <form onSubmit={this.handleSaveProfile}>
              <div className="form-section">
                <label>Cover Image</label>
                <div className="cover-preview-container">
                  {coverImageUrl !== "/api/placeholder/800/200" ? (
                    <img
                      src={coverImageUrl}
                      alt="Cover Preview"
                      className="cover-preview"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = "/api/placeholder/800/200";
                      }}
                    />
                  ) : (
                    <div className="empty-cover-preview">
                      <span>No cover image selected</span>
                    </div>
                  )}
                  <label htmlFor="cover-image" className="choose-image-btn">
                    Choose Cover Image
                    <input
                      type="file"
                      id="cover-image"
                      accept="image/*"
                      onChange={this.handleCoverImageChange}
                      style={{ display: "none" }}
                    />
                  </label>
                </div>
              </div>

              <div className="form-grid">
                <div className="form-section">
                  <label>Profile Image</label>
                  <div className="profile-preview-wrapper">
                    <div className="profile-preview-container">
                      {profileImageUrl !== "/api/placeholder/150/150" ? (
                        <img
                          src={profileImageUrl}
                          alt="Profile Preview"
                          className="profile-preview"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = "/api/placeholder/150/150";
                          }}
                        />
                      ) : (
                        <div className="empty-profile-preview">
                          <span>No image</span>
                        </div>
                      )}
                    </div>
                    <label htmlFor="profile-image" className="choose-image-btn">
                      Choose Profile Image
                      <input
                        type="file"
                        id="profile-image"
                        accept="image/*"
                        onChange={this.handleProfileImageChange}
                        style={{ display: "none" }}
                      />
                    </label>
                  </div>
                </div>

                <div className="form-section">
                  <label htmlFor="name">Full Name</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={editFormData.name}
                    onChange={this.handleInputChange}
                    required
                    placeholder="Your full name"
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-grid">
                <div className="form-section">
                  <label htmlFor="headline">Professional Headline</label>
                  <input
                    type="text"
                    id="headline"
                    name="headline"
                    value={editFormData.headline}
                    onChange={this.handleInputChange}
                    required
                    placeholder="e.g. Web Developer"
                    className="form-input"
                  />
                </div>

                <div className="form-section">
                  <label htmlFor="experience">Experience</label>
                  <input
                    type="text"
                    id="experience"
                    name="experience"
                    value={editFormData.experience}
                    onChange={this.handleInputChange}
                    required
                    placeholder="e.g. 5 years"
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-section">
                <label htmlFor="about">About Me</label>
                <textarea
                  id="about"
                  name="about"
                  rows="4"
                  value={editFormData.about}
                  onChange={this.handleInputChange}
                  required
                  placeholder="Share details about your background, skills, and experience"
                  className="form-textarea"
                ></textarea>
              </div>

              <div className="form-section">
                <label htmlFor="email">Email Address</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={editFormData.email}
                  onChange={this.handleInputChange}
                  required
                  placeholder="youremail@example.com"
                  className="form-input"
                />
              </div>

              <div className="form-actions">
                <button type="submit" className="btn-primary">
                  Save Changes
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={this.toggleEditProfile}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  renderEditServicesForm() {
    const { services, newServiceName } = this.state;

    return (
      <div className="edit-services-form">
        <h3>Edit Services</h3>
        <div className="current-services">
          <h4>Current Services</h4>
          <ul className="services-list">
            {services.map((service, index) => (
              <li key={index} className="service-item">
                <span className="service-name">{service}</span>
                <button
                  type="button"
                  className="remove-service-btn"
                  onClick={() => this.handleRemoveService(index)}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="add-service">
          <input
            type="text"
            value={newServiceName}
            onChange={this.handleServiceInputChange}
            placeholder="Enter new service name"
            className="service-input"
          />
          <button
            type="button"
            className="add-service-btn"
            onClick={this.handleAddService}
          >
            Add Service
          </button>
        </div>

        <div className="form-buttons">
          <button
            type="button"
            className="save-btn"
            onClick={this.handleSaveServices}
          >
            Save Changes
          </button>
          <button
            type="button"
            className="cancel-btn"
            onClick={this.toggleEditServices}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  renderServiceEditForm() {
    const { editingServiceName, editingServiceDescription } = this.state;

    return (
      <div className="edit-service-form">
        <h3>Edit Service: {editingServiceName}</h3>

        <div className="form-group">
          <label htmlFor="service-description">Service Description</label>
          <textarea
            id="service-description"
            name="serviceDescription"
            rows="4"
            value={editingServiceDescription}
            onChange={this.handleServiceDescriptionChange}
            required
          ></textarea>
        </div>

        <div className="form-buttons">
          <button
            type="button"
            className="save-btn"
            onClick={this.updateServiceDescription}
          >
            Save Changes
          </button>
          <button
            type="button"
            className="cancel-btn"
            onClick={() => this.toggleServiceEditForm()}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  renderProfile() {
    const { portfolioData, isEditingProfile } = this.state;

    if (isEditingProfile) {
      return this.renderEditProfileForm();
    }

    if (!portfolioData) {
      return <div className="loading">Loading portfolio data...</div>;
    }

    // Ensure cover image URL is valid
    const coverImageUrl =
      portfolioData.coverImage &&
      portfolioData.coverImage !== "/api/placeholder/800/200"
        ? portfolioData.coverImage
        : "/api/placeholder/800/200";

    // Ensure profile image URL is valid
    const profileImageUrl =
      portfolioData.profileImage &&
      portfolioData.profileImage !== "/api/placeholder/150/150"
        ? portfolioData.profileImage
        : "/api/placeholder/150/150";

    return (
      <div className="portfolio-profile">
        <div className="cover-image">
          <div className="cover-image-container">
            <img
              src={coverImageUrl}
              alt="Cover"
              className="portfolio-cover-image"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "/api/placeholder/800/200";
              }}
            />
            {portfolioData.isOwnProfile && (
              <button
                className="edit-cover-btn"
                onClick={this.toggleEditProfile}
              >
                <span className="pencil-icon">✏️</span>
              </button>
            )}
          </div>

          {/* Moved profile image container outside of cover-image-container */}
          <div className="my-portfolio-profile-image-container">
            {profileImageUrl ? (
              <img
                src={profileImageUrl}
                alt={portfolioData.name}
                className="my-portfolio-profile-image"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = "/api/placeholder/150/150";
                }}
              />
            ) : (
              <div className="profile-placeholder">
                {portfolioData.name
                  ? portfolioData.name.charAt(0).toUpperCase()
                  : "P"}
              </div>
            )}
          </div>
        </div>

        <div className="profile-info">
          <h1 className="profile-name">{portfolioData.name || "Name"}</h1>
          <p className="profile-headline">
            {portfolioData.headline || "Headline"}
          </p>
          <p className="profile-experience">
            {portfolioData.experience || "Experience"}
          </p>

          <div className="about-section">
            <h3>About</h3>
            <p>{portfolioData.about || "No information available"}</p>
          </div>

          <div className="contact-info">
            <p className="email">
              Email: {portfolioData.email || "email@example.com"}
            </p>
            {portfolioData.isOwnProfile && (
              <button
                className="edit-profile-btn"
                onClick={this.toggleEditProfile}
              >
                Edit Profile
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  renderServices() {
    const {
      services,
      activeServiceTab,
      showServiceEditForm,
      showAddServiceForm,
      portfolioData,
    } = this.state;

    if (showAddServiceForm) {
      return this.renderAddServiceForm();
    }

    if (showServiceEditForm) {
      return this.renderServiceEditForm();
    }

    const isOwnProfile = portfolioData?.isOwnProfile;

    // Calculate the effective active tab - use the first service if none is selected
    const effectiveActiveTab =
      activeServiceTab ||
      (services.length > 0
        ? services[0].toLowerCase().replace(/\s+/g, "-")
        : "");

    return (
      <div className="services-section">
        <div className="services-header">
          <h2>My Services</h2>
        </div>

        <div className="services-tabs">
          {services.map((service, index) => {
            const serviceKey = service.toLowerCase().replace(/\s+/g, "-");
            return (
              <button
                key={index}
                className={`service-tab ${
                  activeServiceTab === serviceKey ? "active" : ""
                }`}
                onClick={() => this.handleTabChange(serviceKey)}
              >
                {service}
                {isOwnProfile && (
                  <span
                    className="service-remove-icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      this.handleServiceHoverRemove(index);
                    }}
                    title="Remove service"
                  >
                    ×
                  </span>
                )}
              </button>
            );
          })}
          {isOwnProfile && (
            <button
              className="add-service-tab"
              onClick={() => {
                this.setState({ showAddServiceForm: true });
              }}
            >
              + Add Services
            </button>
          )}
        </div>

        {services.length > 0 ? (
          <div className="service-content">
            <div className="service-header-edit">
              <h3>
                {services.find(
                  (service) =>
                    service.toLowerCase().replace(/\s+/g, "-") ===
                    effectiveActiveTab
                ) || "Service"}
              </h3>
              {isOwnProfile && (
                <button
                  className="edit-service-description-btn"
                  onClick={() =>
                    this.toggleServiceEditForm(
                      services.find(
                        (service) =>
                          service.toLowerCase().replace(/\s+/g, "-") ===
                          effectiveActiveTab
                      )
                    )
                  }
                >
                  ✏️
                </button>
              )}
            </div>
            <p className="service-description">
              {this.state.serviceData[effectiveActiveTab]?.description ||
                "No description available for this service."}
            </p>
          </div>
        ) : (
          <div className="no-services-message">
            <p>
              {isOwnProfile
                ? "You haven't added any services yet. Click '+ Add Services' to get started."
                : "This professional hasn't added any services yet."}
            </p>
          </div>
        )}
      </div>
    );
  }

  renderAddServiceForm() {
    const { newServiceName, newServiceDescription, newServicePricing } =
      this.state;

    return (
      <div className="add-service-modal">
        <div className="add-service-form-container">
          {/* Close Icon */}
          <button
            className="close-icon-btn"
            onClick={this.toggleAddServiceForm}
            aria-label="Close"
          >
            <X size={24} />
          </button>

          <h3 className="form-title">Add New Service</h3>
          <form onSubmit={this.handleAddService}>
            <div className="form-group">
              <label htmlFor="service-name">Service Name</label>
              <input
                type="text"
                id="service-name"
                value={newServiceName}
                onChange={(e) => this.handleServiceFormChange(e, "name")}
                placeholder="e.g. Web Development"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="service-description">Service Description</label>
              <textarea
                id="service-description"
                rows="4"
                value={newServiceDescription}
                onChange={(e) => this.handleServiceFormChange(e, "description")}
                placeholder="Describe your service in detail"
                required
              ></textarea>
            </div>

            <div className="pricing-section-form">
              <h4>Service Pricing Options</h4>

              {newServicePricing.map((pricing, index) => (
                <div key={index} className="pricing-level">
                  <h5>{pricing.level} Package</h5>

                  <div className="form-row">
                    <div className="form-group half">
                      <label htmlFor={`price-${index}`}>Price ($)</label>
                      <input
                        type="number"
                        id={`price-${index}`}
                        name="price"
                        value={pricing.price}
                        onChange={(e) =>
                          this.handleServiceFormChange(e, "pricing", index)
                        }
                        placeholder="e.g. 499"
                        required
                      />
                    </div>

                    <div className="form-group half">
                      <label htmlFor={`timeFrame-${index}`}>Time Frame</label>
                      <input
                        type="text"
                        id={`timeFrame-${index}`}
                        name="timeFrame"
                        value={pricing.timeFrame}
                        onChange={(e) =>
                          this.handleServiceFormChange(e, "pricing", index)
                        }
                        placeholder="e.g. 2 weeks"
                        required
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="form-buttons">
              <button type="submit" className="save-btn">
                Add Service
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  renderWorks() {
    const { videos, activeServiceTab, portfolioData } = this.state;
    const isOwnProfile = portfolioData?.isOwnProfile;

    // Filter videos by active service tab
    const serviceVideos = videos.filter(
      (video) => !video.serviceName || video.serviceName === activeServiceTab
    );

    return (
      <div className="works-section">
        <div className="works-header">
          <h3>My Works</h3>
        </div>

        <div className="video-gallery">
          {serviceVideos.map((video) => (
            <div key={video.id} className="video-item">
              <div className="video-thumbnail">
                <img src={video.thumbnail} alt="Video thumbnail" />
                <div className="video-overlay">
                  <button
                    className="play-btn"
                    onClick={() => window.open(video.url, "_blank")}
                  >
                    ▶
                  </button>
                  {isOwnProfile && (
                    <button
                      className="remove-video-btn"
                      onClick={() => this.handleRemoveVideo(video.id)}
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {isOwnProfile && (
            <div className="add-video">
              <label htmlFor="add-video-input" className="add-video-btn">
                <span className="plus-icon">+</span>
              </label>
              <input
                type="file"
                id="add-video-input"
                accept="video/*"
                onChange={this.handleAddVideo}
                style={{ display: "none" }}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  renderPricing() {
    const { serviceData, activeServiceTab, selectedPricing, services } =
      this.state;

    // Use the first service if no tab is active
    const effectiveActiveTab =
      activeServiceTab ||
      (services.length > 0
        ? services[0].toLowerCase().replace(/\s+/g, "-")
        : "");

    if (!effectiveActiveTab || !serviceData[effectiveActiveTab]) {
      return (
        <div className="pricing-section">
          <h2>Pricing Details</h2>
          <p>Select a service to view pricing options.</p>
        </div>
      );
    }

    const currentServicePricing = serviceData[effectiveActiveTab].pricing || [];

    return (
      <div className="pricing-section">
        <h2>Pricing Details</h2>

        <div className="pricing-options">
          {currentServicePricing.map((option, index) => (
            <div key={index} className="pricing-option">
              <label className="pricing-checkbox">
                <input
                  type="checkbox"
                  checked={selectedPricing === index}
                  onChange={() => this.handlePricingSelect(index)}
                />
                <span className="option-name">{option.level} Package</span>
                <span className="option-price">${option.price}</span>
                <span className="option-timeframe">
                  Time: {option.timeFrame}
                </span>
              </label>
            </div>
          ))}
        </div>

        <div className="pricing-note">
          <p>
            Note: Contact me for customized requirements to discuss further.
          </p>
        </div>

        <div className="cart-buttons">
          <button className="add-to-cart-btn" onClick={this.handleAddToCart}>
            Add to Cart
          </button>
          <button className="order-now-btn">Order Now</button>
        </div>
      </div>
    );
  }

  renderContactSection() {
    return (
      <div className="contact-section">
        <h2>Have Questions?</h2>
        <p>Contact me directly</p>
        <a
          href="https://linkedin.com/in/prasanya-shankar"
          className="linkedin-link"
          target="_blank"
          rel="noopener noreferrer"
        >
          Prasanya Shankar
        </a>
      </div>
    );
  }

  render() {
    const { isLoading, portfolioData } = this.state;

    if (isLoading) {
      return <div className="loading">Loading portfolio...</div>;
    }

    if (!portfolioData) {
      return (
        <div className="no-portfolio">
          <h2>No Portfolio Data Available</h2>
          <p>This portfolio hasn't been created or approved yet.</p>
        </div>
      );
    }

    // If portfolio exists but is not approved and it's not the owner viewing
    if (!portfolioData.isApproved && !portfolioData.isOwnProfile) {
      return (
        <>
          <NavBar />
          <div className="portfolio-container">
            <div className="awaiting-approval">
              <h2>Portfolio Not Available</h2>
              <p>
                This portfolio is not currently available for public viewing.
              </p>
            </div>
          </div>
          <Footer />
        </>
      );
    }

    // If portfolio exists but is not approved and it's the owner viewing
    if (!portfolioData.isApproved && portfolioData.isOwnProfile) {
      return (
        <>
          <NavBar />
          <div className="portfolio-container">
            <div className="awaiting-approval">
              <h2>Portfolio Awaiting Approval</h2>
              <p>
                Your portfolio has been submitted and is waiting for admin
                approval.
              </p>
              <p>
                You can continue to edit your details, but your portfolio will
                not be visible to others until approved.
              </p>
            </div>
            {this.renderProfile()}
            <div className="portfolio-content">
              <div className="left-column">
                {this.renderServices()}
                {this.renderWorks()}
              </div>
              <div className="right-column">{this.renderPricing()}</div>
            </div>
            {this.renderContactSection()}
          </div>
          <Footer />
        </>
      );
    }

    return (
      <>
        <NavBar />
        <div className="portfolio-container">
          {this.renderProfile()}
          <div className="portfolio-content">
            <div className="left-column">
              {this.renderServices()}
              {this.renderWorks()}
            </div>
            <div className="right-column">{this.renderPricing()}</div>
          </div>
          {this.renderContactSection()}
        </div>
        <Footer />
      </>
    );
  }
}

export default MyPortfolio;
