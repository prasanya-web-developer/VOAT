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
    showEditServiceForm: false,
    serviceData: {},
    editingServiceName: "",
    editingServiceDescription: "",
    editingServicePricing: [],
    // Add new service form fields
    newServiceName: "",
    newServiceDescription: "",
    newServicePricing: [
      { level: "Basic", price: "", timeFrame: "" },
      { level: "Standard", price: "", timeFrame: "" },
      { level: "Premium", price: "", timeFrame: "" },
    ],
    portfolioData: null,
    editFormData: {
      name: "",
      profession: "",
      headline: "",
      experience: "",
      about: "",
      email: "",
    },
    services: [],
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

    const pathSegments = window.location.pathname.split("/");
    const portfolioUserId = pathSegments[pathSegments.length - 1];

    if (portfolioUserId && portfolioUserId !== "my-portfolio") {
      this.fetchPortfolioData(portfolioUserId);
    } else {
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

      const response = await fetch(`${this.state.baseUrl}/api/user/${userId}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch portfolio data");
      }

      const data = await response.json();
      const { user, portfolio, services = [] } = data;

      if (!user) {
        throw new Error("User data not found in server response");
      }

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

      const serviceNames = services.map((service) => service.name);
      const firstServiceKey =
        serviceNames.length > 0
          ? serviceNames[0].toLowerCase().replace(/\s+/g, "-")
          : "";

      const loggedInUserData = localStorage.getItem("user");
      const loggedInUserId = loggedInUserData
        ? JSON.parse(loggedInUserData).id
        : null;
      const isOwnProfile = loggedInUserId === userId;

      const portfolioData = {
        name: portfolio?.name || user.name || "",
        headline: portfolio?.headline || "",
        profession: user.profession || "",
        experience: portfolio?.workExperience || "",
        about: portfolio?.about || "",
        email: portfolio?.email || user.email || "",
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

      const videos = data.videos || [];

      this.setState({
        portfolioData,
        editFormData: {
          name: portfolioData.name,
          profession: portfolioData.profession,
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

      localStorage.setItem(`profile_${userId}`, JSON.stringify(portfolioData));
      localStorage.setItem(`services_${userId}`, JSON.stringify(serviceNames));
      localStorage.setItem(
        `serviceData_${userId}`,
        JSON.stringify(serviceData)
      );
      localStorage.setItem(`videos_${userId}`, JSON.stringify(videos));
    } catch (error) {
      console.error("Error fetching portfolio data:", error);
      this.setState({ isLoading: false });
    }
  };

  // Add service form handlers
  handleAddServiceFormChange = (e, field, index) => {
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

  handleSaveNewService = async (e) => {
    e.preventDefault();

    const { newServiceName, newServiceDescription, newServicePricing } =
      this.state;

    try {
      const userData = localStorage.getItem("user");
      const userId = userData ? JSON.parse(userData).id : null;

      if (!userId) {
        throw new Error("User ID not found");
      }

      const serviceData = {
        userId: userId,
        name: newServiceName,
        description: newServiceDescription,
        pricing: newServicePricing,
      };

      console.log("Adding new service:", serviceData);

      const response = await fetch(`${this.state.baseUrl}/api/add-service`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(serviceData),
      });

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.error("Server returned HTML:", text);
        throw new Error("Server error - check backend console");
      }

      const result = await response.json();

      if (!response.ok) {
        console.error("API Error:", result);
        throw new Error(
          result.message || `HTTP error! status: ${response.status}`
        );
      }

      console.log("Service added successfully:", result);

      // Update local state
      const newServices = [...this.state.services, newServiceName];
      const newServiceKey = newServiceName.toLowerCase().replace(/\s+/g, "-");
      const updatedServiceData = { ...this.state.serviceData };
      updatedServiceData[newServiceKey] = {
        id: result.serviceId,
        description: newServiceDescription,
        pricing: newServicePricing,
        videos: [],
      };

      this.setState({
        services: newServices,
        serviceData: updatedServiceData,
        activeServiceTab: newServiceKey,
        showAddServiceForm: false,
        newServiceName: "",
        newServiceDescription: "",
        newServicePricing: [
          { level: "Basic", price: "", timeFrame: "" },
          { level: "Standard", price: "", timeFrame: "" },
          { level: "Premium", price: "", timeFrame: "" },
        ],
      });

      alert("Service added successfully!");
    } catch (error) {
      console.error("Error adding service:", error);
      alert("Error adding service: " + error.message);
    }
  };

  toggleAddServiceForm = () => {
    this.setState({
      showAddServiceForm: !this.state.showAddServiceForm,
      newServiceName: "",
      newServiceDescription: "",
      newServicePricing: [
        { level: "Basic", price: "", timeFrame: "" },
        { level: "Standard", price: "", timeFrame: "" },
        { level: "Premium", price: "", timeFrame: "" },
      ],
    });
  };

  handleEditService = () => {
    const { activeServiceTab, serviceData, services } = this.state;

    if (!activeServiceTab) return;

    const currentService = serviceData[activeServiceTab];
    const serviceName = services.find(
      (service) =>
        service.toLowerCase().replace(/\s+/g, "-") === activeServiceTab
    );

    this.setState({
      showEditServiceForm: true,
      editingServiceName: serviceName || "",
      editingServiceDescription: currentService?.description || "",
      editingServicePricing: currentService?.pricing || [
        { level: "Basic", price: "", timeFrame: "" },
        { level: "Standard", price: "", timeFrame: "" },
        { level: "Premium", price: "", timeFrame: "" },
      ],
    });
  };

  handleEditServiceFormChange = (e, field, index) => {
    if (field === "description") {
      this.setState({ editingServiceDescription: e.target.value });
    } else if (field === "pricing") {
      const { editingServicePricing } = this.state;
      const updatedPricing = [...editingServicePricing];
      updatedPricing[index] = {
        ...updatedPricing[index],
        [e.target.name]: e.target.value,
      };
      this.setState({ editingServicePricing: updatedPricing });
    }
  };

  handleSaveEditedService = async (e) => {
    e.preventDefault();

    const {
      editingServiceName,
      editingServiceDescription,
      editingServicePricing,
      activeServiceTab,
      serviceData,
    } = this.state;

    try {
      const userData = localStorage.getItem("user");
      const userId = userData ? JSON.parse(userData).id : null;

      if (!userId) {
        throw new Error("User ID not found");
      }

      const updateData = {
        userId: userId,
        serviceName: editingServiceName,
        description: editingServiceDescription,
        pricing: editingServicePricing,
      };

      console.log("Sending update data:", updateData);

      const response = await fetch(`${this.state.baseUrl}/api/update-service`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      });

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.error("Server returned HTML:", text);
        throw new Error("Server error - check backend console");
      }

      const result = await response.json();

      if (!response.ok) {
        console.error("API Error:", result);
        throw new Error(
          result.message || `HTTP error! status: ${response.status}`
        );
      }

      console.log("Service updated successfully:", result);

      const updatedServiceData = { ...serviceData };
      updatedServiceData[activeServiceTab] = {
        ...updatedServiceData[activeServiceTab],
        description: editingServiceDescription,
        pricing: editingServicePricing,
      };

      this.setState({
        serviceData: updatedServiceData,
        showEditServiceForm: false,
        editingServiceName: "",
        editingServiceDescription: "",
        editingServicePricing: [],
      });

      alert("Service updated successfully!");
    } catch (error) {
      console.error("Error updating service:", error);
      alert("Error updating service: " + error.message);
    }
  };

  toggleEditServiceForm = () => {
    this.setState({
      showEditServiceForm: false,
      editingServiceName: "",
      editingServiceDescription: "",
      editingServicePricing: [],
    });
  };

  handleServiceHoverRemove = async (index) => {
    if (window.confirm("Are you sure you want to remove this service?")) {
      const updatedServices = [...this.state.services];
      const removedService = updatedServices[index];
      const serviceKey = removedService.toLowerCase().replace(/\s+/g, "-");

      try {
        const userData = localStorage.getItem("user");
        const userId = userData ? JSON.parse(userData).id : null;

        if (!userId) {
          throw new Error("User ID not found");
        }

        console.log("Deleting service:", {
          userId,
          serviceName: removedService,
        });

        const response = await fetch(
          `${this.state.baseUrl}/api/delete-service`,
          {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              userId: userId,
              serviceName: removedService,
            }),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Server response:", errorText);
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log("Service deleted successfully:", result);

        updatedServices.splice(index, 1);
        const updatedServiceData = { ...this.state.serviceData };
        delete updatedServiceData[serviceKey];

        let newActiveTab = this.state.activeServiceTab;
        if (
          serviceKey === this.state.activeServiceTab &&
          updatedServices.length > 0
        ) {
          newActiveTab = updatedServices[0].toLowerCase().replace(/\s+/g, "-");
        } else if (updatedServices.length === 0) {
          newActiveTab = "";
        }

        this.setState({
          services: updatedServices,
          serviceData: updatedServiceData,
          activeServiceTab: newActiveTab,
        });

        alert("Service deleted successfully!");
      } catch (error) {
        console.error("Error deleting service:", error);
        alert("Error deleting service: " + error.message);
      }
    }
  };

  handleAddVideo = async (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      try {
        const userData = localStorage.getItem("user");
        const userId = userData ? JSON.parse(userData).id : null;

        if (!userId) {
          throw new Error("User ID not found");
        }

        const formData = new FormData();
        formData.append("workFile", file);
        formData.append("userId", userId);
        formData.append("title", file.name);
        formData.append("serviceName", this.state.activeServiceTab || "");

        const response = await fetch(`${this.state.baseUrl}/api/add-work`, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Upload error:", errorText);
          throw new Error(`Upload failed: ${response.status}`);
        }

        const result = await response.json();
        console.log("Work uploaded successfully:", result);

        const newWork = {
          id: result.workId,
          url: result.workUrl,
          thumbnail: result.workUrl,
          serviceName: this.state.activeServiceTab || "",
          type: file.type.startsWith("video/") ? "video" : "image",
        };

        this.setState((prevState) => ({
          videos: [...prevState.videos, newWork],
        }));

        alert("Work uploaded successfully!");
      } catch (error) {
        console.error("Error uploading work:", error);
        alert("Error uploading work: " + error.message);
      }
    }
  };

  handleRemoveVideo = (videoId) => {
    const updatedVideos = this.state.videos.filter(
      (video) => video.id !== videoId
    );
    this.setState({ videos: updatedVideos });
  };

  handleTabChange = (tab) => {
    this.setState({ activeServiceTab: tab });
  };

  handlePricingSelect = (pricingOption) => {
    this.setState({ selectedPricing: pricingOption });
  };

  handleAddToCart = () => {
    const { selectedPricing } = this.state;
    if (selectedPricing) {
      alert(
        `Added to cart: ${selectedPricing.level} Package - ₹${selectedPricing.price}`
      );
    } else {
      alert("Please select a pricing option first");
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
            profession: portfolioData.profession || "",
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

      const formData = new FormData();
      formData.append("userId", userId);
      formData.append("name", editFormData.name);
      formData.append("profession", editFormData.profession);
      formData.append("headline", editFormData.headline);
      formData.append("workExperience", editFormData.experience);
      formData.append("about", editFormData.about);
      formData.append("email", editFormData.email);
      formData.append("isNewSubmission", "true");

      if (profileImage) {
        formData.append("profileImage", profileImage);
      }

      if (coverImage) {
        formData.append("coverImage", coverImage);
      }

      const response = await fetch(`${this.state.baseUrl}/api/portfolio`, {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || "Unknown error occurred");
      }

      const updatedPortfolioData = {
        ...this.state.portfolioData,
        name: editFormData.name,
        headline: editFormData.headline,
        profession: editFormData.profession,
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

  renderProfile() {
    const { portfolioData, isEditingProfile } = this.state;

    if (isEditingProfile) {
      return this.renderEditProfileForm();
    }

    if (!portfolioData) {
      return <div className="loading">Loading portfolio data...</div>;
    }

    const coverImageUrl =
      portfolioData.coverImage &&
      portfolioData.coverImage !== "/api/placeholder/800/200"
        ? portfolioData.coverImage
        : "/api/placeholder/800/200";

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
      </div>
    );
  }

  renderLeftColumn() {
    const { portfolioData, services, activeServiceTab, serviceData, videos } =
      this.state;

    if (!portfolioData) {
      return <div className="myportfoliopage-loading">Loading...</div>;
    }

    const isOwnProfile = portfolioData?.isOwnProfile;
    const effectiveActiveTab =
      activeServiceTab ||
      (services.length > 0
        ? services[0].toLowerCase().replace(/\s+/g, "-")
        : "");

    return (
      <div className="myportfoliopage-left-column">
        {/* LinkedIn Style Personal Info */}
        <div className="myportfoliopage-linkedin-card">
          <div className="myportfoliopage-linkedin-header">
            <div className="myportfoliopage-linkedin-info">
              <h1 className="myportfoliopage-linkedin-name">
                {portfolioData.name || "Name"}
              </h1>
              <p className="myportfoliopage-linkedin-profession">
                {portfolioData.profession || "Professional"}
              </p>
              <p className="myportfoliopage-linkedin-headline">
                {portfolioData.headline || "Specialist"}
              </p>
              <p className="myportfoliopage-linkedin-email">
                {portfolioData.email || "email@example.com"}
              </p>
              <span className="myportfoliopage-linkedin-experience">
                {portfolioData.experience || "N/A"}
              </span>
            </div>
            {isOwnProfile && (
              <button
                className="myportfoliopage-linkedin-edit-btn"
                onClick={this.toggleEditProfile}
                title="Edit Profile"
              >
                Edit Profile
              </button>
            )}
          </div>
        </div>

        {/* About Section */}
        <div className="myportfoliopage-about-card">
          <h2 className="myportfoliopage-section-title">About</h2>
          <p className="myportfoliopage-about-text">
            {portfolioData.about || "No information available"}
          </p>
        </div>

        {/* Services Section */}
        <div className="myportfoliopage-services-card">
          <div className="myportfoliopage-services-header">
            <h2 className="myportfoliopage-section-title">Services</h2>
            {isOwnProfile && services.length > 0 && (
              <button
                className="myportfoliopage-edit-service-btn"
                onClick={this.handleEditService}
                disabled={!effectiveActiveTab}
              >
                ✏️ Edit Service
              </button>
            )}
          </div>

          {services.length > 0 ? (
            <>
              <div className="myportfoliopage-service-tabs">
                {services.map((service, index) => {
                  const serviceKey = service.toLowerCase().replace(/\s+/g, "-");
                  return (
                    <button
                      key={index}
                      className={`myportfoliopage-service-tab ${
                        activeServiceTab === serviceKey
                          ? "myportfoliopage-active"
                          : ""
                      }`}
                      onClick={() => this.handleTabChange(serviceKey)}
                    >
                      {service}
                      {isOwnProfile && (
                        <span
                          className="myportfoliopage-service-remove-icon"
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
              </div>

              <div className="myportfoliopage-service-content">
                <h3 className="myportfoliopage-service-name">
                  {services.find(
                    (service) =>
                      service.toLowerCase().replace(/\s+/g, "-") ===
                      effectiveActiveTab
                  ) || "Service"}
                </h3>
                <p className="myportfoliopage-service-description">
                  {serviceData[effectiveActiveTab]?.description ||
                    "No description available for this service."}
                </p>
              </div>
            </>
          ) : (
            <div className="myportfoliopage-no-services">
              <p>
                {isOwnProfile
                  ? "You haven't added any services yet."
                  : "This professional hasn't added any services yet."}
              </p>
              {isOwnProfile && (
                <button
                  className="myportfoliopage-add-service-btn"
                  onClick={this.toggleAddServiceForm}
                >
                  ➕ Add Service
                </button>
              )}
            </div>
          )}
        </div>

        {/* Work Section */}
        <div className="myportfoliopage-work-card">
          <div className="myportfoliopage-work-header">
            <h2 className="myportfoliopage-section-title">My Work</h2>
          </div>

          <div className="myportfoliopage-video-gallery">
            {videos.map((video) => (
              <div key={video.id} className="myportfoliopage-video-item">
                <div className="myportfoliopage-video-thumbnail">
                  <img src={video.thumbnail} alt="Work thumbnail" />
                  <div className="myportfoliopage-video-overlay">
                    <button
                      className="myportfoliopage-play-btn"
                      onClick={() => window.open(video.url, "_blank")}
                    >
                      ▶
                    </button>
                    {isOwnProfile && (
                      <button
                        className="myportfoliopage-remove-video-btn"
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
              <div className="myportfoliopage-add-video">
                <label
                  htmlFor="add-video-input"
                  className="myportfoliopage-add-video-btn"
                >
                  <span className="myportfoliopage-plus-icon">+</span>
                  <span>Add Work</span>
                </label>
                <input
                  type="file"
                  id="add-video-input"
                  accept="video/*,image/*"
                  onChange={this.handleAddVideo}
                  style={{ display: "none" }}
                />
              </div>
            )}
          </div>
        </div>

        {/* CTA Section */}
        <div className="myportfoliopage-cta-card">
          <h2 className="myportfoliopage-section-title">
            Ready to Work Together?
          </h2>
          <p className="myportfoliopage-cta-text">
            Let's discuss your project and bring your ideas to life.
          </p>
          <button className="myportfoliopage-cta-button">Get In Touch</button>
        </div>
      </div>
    );
  }

  renderRightColumn() {
    const { serviceData, activeServiceTab, selectedPricing, services } =
      this.state;

    const effectiveActiveTab =
      activeServiceTab ||
      (services.length > 0
        ? services[0].toLowerCase().replace(/\s+/g, "-")
        : "");

    if (!effectiveActiveTab || !serviceData[effectiveActiveTab]) {
      return (
        <div className="myportfoliopage-right-column">
          <div className="myportfoliopage-pricing-card">
            <h2 className="myportfoliopage-section-title">Pricing Plans</h2>
            <div className="myportfoliopage-no-pricing">
              <div className="myportfoliopage-no-pricing-icon">💰</div>
              <p>Select a service to view pricing options.</p>
            </div>
          </div>
        </div>
      );
    }

    const currentServicePricing = serviceData[effectiveActiveTab].pricing || [];

    return (
      <div className="myportfoliopage-right-column">
        <div className="myportfoliopage-pricing-card">
          <h2 className="myportfoliopage-section-title">Pricing Plans</h2>

          {currentServicePricing.length > 0 ? (
            <>
              <div className="myportfoliopage-pricing-options">
                {currentServicePricing.map((option, index) => (
                  <div
                    key={index}
                    className={`myportfoliopage-pricing-option ${
                      selectedPricing?.level === option?.level
                        ? "myportfoliopage-selected"
                        : ""
                    }`}
                    onClick={() => this.handlePricingSelect(option)}
                  >
                    <div className="myportfoliopage-pricing-row">
                      <input
                        type="radio"
                        name="pricing"
                        checked={selectedPricing?.level === option?.level}
                        onChange={() => this.handlePricingSelect(option)}
                      />
                      <div className="myportfoliopage-pricing-content">
                        <h3 className="myportfoliopage-pricing-title">
                          {option.level}
                        </h3>
                        <div className="myportfoliopage-pricing-price">
                          ₹{option.price}
                        </div>
                      </div>
                    </div>
                    <div className="myportfoliopage-pricing-time">
                      ⏱️ Delivery: {option.timeFrame}
                    </div>
                  </div>
                ))}
              </div>

              <div className="myportfoliopage-pricing-note">
                <p>
                  💡 Need something custom? Contact{" "}
                  <strong>VOAT Network</strong> for personalized requirements
                  and pricing.
                </p>
              </div>

              <div className="myportfoliopage-pricing-actions">
                <button
                  className="myportfoliopage-add-to-cart-btn"
                  onClick={this.handleAddToCart}
                  disabled={!selectedPricing}
                >
                  🛒 Add to Cart
                </button>
                <button
                  className="myportfoliopage-book-now-btn"
                  onClick={this.handleAddToCart}
                  disabled={!selectedPricing}
                >
                  ⚡ Book Now
                </button>
              </div>
            </>
          ) : (
            <div className="myportfoliopage-no-pricing">
              <div className="myportfoliopage-no-pricing-icon">💰</div>
              <p>No pricing options available for this service yet.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  renderAddServiceForm() {
    const { newServiceName, newServiceDescription, newServicePricing } =
      this.state;

    return (
      <div className="myportfoliopage-modal-overlay">
        <div className="myportfoliopage-modal-content">
          <div className="myportfoliopage-modal-header">
            <h2>Add New Service</h2>
            <button
              className="myportfoliopage-close-modal-btn"
              onClick={this.toggleAddServiceForm}
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>

          <div className="myportfoliopage-modal-body">
            <form onSubmit={this.handleSaveNewService}>
              <div className="myportfoliopage-form-section">
                <label htmlFor="service-name">Service Name</label>
                <input
                  type="text"
                  id="service-name"
                  value={newServiceName}
                  onChange={(e) => this.handleAddServiceFormChange(e, "name")}
                  placeholder="e.g. Web Development, Logo Design"
                  className="myportfoliopage-form-input"
                  required
                />
              </div>

              <div className="myportfoliopage-form-section">
                <label htmlFor="service-description">Service Description</label>
                <textarea
                  id="service-description"
                  rows="4"
                  value={newServiceDescription}
                  onChange={(e) =>
                    this.handleAddServiceFormChange(e, "description")
                  }
                  placeholder="Describe your service in detail"
                  className="myportfoliopage-form-textarea"
                  required
                />
              </div>

              <div className="myportfoliopage-pricing-section-form">
                <h4>Set Pricing Options (in Rupees)</h4>

                {newServicePricing.map((pricing, index) => (
                  <div key={index} className="myportfoliopage-pricing-level">
                    <h5>{pricing.level} Package</h5>

                    <div className="myportfoliopage-form-row">
                      <div className="myportfoliopage-form-group myportfoliopage-half">
                        <label htmlFor={`new-price-${index}`}>Price (₹)</label>
                        <input
                          type="number"
                          id={`new-price-${index}`}
                          name="price"
                          value={pricing.price}
                          onChange={(e) =>
                            this.handleAddServiceFormChange(e, "pricing", index)
                          }
                          placeholder="e.g. 25000"
                          required
                        />
                      </div>

                      <div className="myportfoliopage-form-group myportfoliopage-half">
                        <label htmlFor={`new-timeFrame-${index}`}>
                          Time Frame
                        </label>
                        <input
                          type="text"
                          id={`new-timeFrame-${index}`}
                          name="timeFrame"
                          value={pricing.timeFrame}
                          onChange={(e) =>
                            this.handleAddServiceFormChange(e, "pricing", index)
                          }
                          placeholder="e.g. 2 weeks"
                          required
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="myportfoliopage-form-actions">
                <button type="submit" className="myportfoliopage-btn-primary">
                  Add Service
                </button>
                <button
                  type="button"
                  className="myportfoliopage-btn-secondary"
                  onClick={this.toggleAddServiceForm}
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

  renderEditServiceForm() {
    const {
      editingServiceName,
      editingServiceDescription,
      editingServicePricing,
    } = this.state;

    return (
      <div className="myportfoliopage-modal-overlay">
        <div className="myportfoliopage-modal-content">
          <div className="myportfoliopage-modal-header">
            <h2>Edit Service: {editingServiceName}</h2>
            <button
              className="myportfoliopage-close-modal-btn"
              onClick={this.toggleEditServiceForm}
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>

          <div className="myportfoliopage-modal-body">
            <form onSubmit={this.handleSaveEditedService}>
              <div className="myportfoliopage-form-section">
                <label htmlFor="service-description">Service Description</label>
                <textarea
                  id="service-description"
                  rows="4"
                  value={editingServiceDescription}
                  onChange={(e) =>
                    this.handleEditServiceFormChange(e, "description")
                  }
                  placeholder="Describe your service in detail"
                  className="myportfoliopage-form-textarea"
                  required
                />
              </div>

              <div className="myportfoliopage-pricing-section-form">
                <h4>Update Pricing Options (in Rupees)</h4>

                {editingServicePricing.map((pricing, index) => (
                  <div key={index} className="myportfoliopage-pricing-level">
                    <h5>{pricing.level} Package</h5>

                    <div className="myportfoliopage-form-row">
                      <div className="myportfoliopage-form-group myportfoliopage-half">
                        <label htmlFor={`edit-price-${index}`}>Price (₹)</label>
                        <input
                          type="number"
                          id={`edit-price-${index}`}
                          name="price"
                          value={pricing.price}
                          onChange={(e) =>
                            this.handleEditServiceFormChange(
                              e,
                              "pricing",
                              index
                            )
                          }
                          placeholder="e.g. 25000"
                          required
                        />
                      </div>

                      <div className="myportfoliopage-form-group myportfoliopage-half">
                        <label htmlFor={`edit-timeFrame-${index}`}>
                          Time Frame
                        </label>
                        <input
                          type="text"
                          id={`edit-timeFrame-${index}`}
                          name="timeFrame"
                          value={pricing.timeFrame}
                          onChange={(e) =>
                            this.handleEditServiceFormChange(
                              e,
                              "pricing",
                              index
                            )
                          }
                          placeholder="e.g. 2 weeks"
                          required
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="myportfoliopage-form-actions">
                <button type="submit" className="myportfoliopage-btn-primary">
                  Save Changes
                </button>
                <button
                  type="button"
                  className="myportfoliopage-btn-secondary"
                  onClick={this.toggleEditServiceForm}
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

  renderEditProfileForm() {
    const {
      editFormData,
      profileImagePreview,
      coverImagePreview,
      portfolioData,
    } = this.state;

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
      <div className="myportfoliopage-modal-overlay">
        <div className="myportfoliopage-modal-content">
          <div className="myportfoliopage-modal-header">
            <h2>Edit Profile</h2>
            <button
              className="myportfoliopage-close-modal-btn"
              onClick={this.toggleEditProfile}
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>

          <div className="myportfoliopage-modal-body">
            <form onSubmit={this.handleSaveProfile}>
              <div className="myportfoliopage-form-section">
                <label>Cover Image</label>
                <div className="myportfoliopage-cover-preview-container">
                  {coverImageUrl !== "/api/placeholder/800/200" ? (
                    <img
                      src={coverImageUrl}
                      alt="Cover Preview"
                      className="myportfoliopage-cover-preview"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = "/api/placeholder/800/200";
                      }}
                    />
                  ) : (
                    <div className="myportfoliopage-empty-cover-preview">
                      <span>No cover image selected</span>
                    </div>
                  )}
                </div>
                <label
                  htmlFor="cover-image"
                  className="myportfoliopage-choose-image-btn"
                >
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

              <div className="myportfoliopage-form-grid">
                <div className="myportfoliopage-form-section">
                  <label>Profile Image</label>
                  <div className="myportfoliopage-profile-preview-wrapper">
                    <div className="myportfoliopage-profile-preview-container">
                      {profileImageUrl !== "/api/placeholder/150/150" ? (
                        <img
                          src={profileImageUrl}
                          alt="Profile Preview"
                          className="myportfoliopage-profile-preview"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = "/api/placeholder/150/150";
                          }}
                        />
                      ) : (
                        <div className="myportfoliopage-empty-profile-preview">
                          <span>No image</span>
                        </div>
                      )}
                    </div>
                    <label
                      htmlFor="profile-image"
                      className="myportfoliopage-choose-image-btn"
                    >
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
              </div>

              <div className="myportfoliopage-form-grid">
                <div className="myportfoliopage-form-section">
                  <label htmlFor="name">Full Name</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={editFormData.name}
                    onChange={this.handleInputChange}
                    required
                    placeholder="Your full name"
                    className="myportfoliopage-form-input"
                  />
                </div>
                <div className="myportfoliopage-form-section">
                  <label htmlFor="profession">Profession</label>
                  <input
                    type="text"
                    id="profession"
                    name="profession"
                    value={editFormData.profession}
                    onChange={this.handleInputChange}
                    required
                    placeholder="e.g. Web Developer"
                    className="myportfoliopage-form-input"
                  />
                </div>
              </div>

              <div className="myportfoliopage-form-grid">
                <div className="myportfoliopage-form-section">
                  <label htmlFor="headline">Headline</label>
                  <input
                    type="text"
                    id="headline"
                    name="headline"
                    value={editFormData.headline}
                    onChange={this.handleInputChange}
                    required
                    placeholder="e.g. Mern Stack | Business Website"
                    className="myportfoliopage-form-input"
                  />
                </div>

                <div className="myportfoliopage-form-section">
                  <label htmlFor="experience">Experience</label>
                  <input
                    type="text"
                    id="experience"
                    name="experience"
                    value={editFormData.experience}
                    onChange={this.handleInputChange}
                    required
                    placeholder="e.g. 5 years"
                    className="myportfoliopage-form-input"
                  />
                </div>
              </div>

              <div className="myportfoliopage-form-section">
                <label htmlFor="about">About Me</label>
                <textarea
                  id="about"
                  name="about"
                  rows="4"
                  value={editFormData.about}
                  onChange={this.handleInputChange}
                  required
                  placeholder="Share details about your background, skills, and experience"
                  className="myportfoliopage-form-textarea"
                ></textarea>
              </div>

              <div className="myportfoliopage-form-section">
                <label htmlFor="email">Email Address</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={editFormData.email}
                  onChange={this.handleInputChange}
                  required
                  placeholder="youremail@example.com"
                  className="myportfoliopage-form-input"
                />
              </div>

              <div className="myportfoliopage-form-actions">
                <button type="submit" className="myportfoliopage-btn-primary">
                  Save Changes
                </button>
                <button
                  type="button"
                  className="myportfoliopage-btn-secondary"
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

  render() {
    const {
      isLoading,
      portfolioData,
      showEditServiceForm,
      showAddServiceForm,
    } = this.state;

    if (isLoading) {
      return (
        <div className="myportfoliopage-loading-container">
          <div className="myportfoliopage-loading-spinner"></div>
          <p>Loading portfolio...</p>
        </div>
      );
    }

    if (!portfolioData) {
      return (
        <div className="myportfoliopage-no-portfolio">
          <h2>No Portfolio Data Available</h2>
          <p>This portfolio hasn't been created or approved yet.</p>
        </div>
      );
    }

    if (!portfolioData.isApproved && !portfolioData.isOwnProfile) {
      return (
        <>
          <NavBar />
          <div className="myportfoliopage-container">
            <div className="myportfoliopage-awaiting-approval">
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

    if (!portfolioData.isApproved && portfolioData.isOwnProfile) {
      return (
        <>
          <NavBar />
          <div className="myportfoliopage-container">
            <div className="myportfoliopage-awaiting-approval">
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
            <div className="myportfoliopage-main-content">
              {this.renderLeftColumn()}
              {this.renderRightColumn()}
            </div>
          </div>
          <Footer />
        </>
      );
    }

    return (
      <>
        <NavBar />
        <div className="myportfoliopage-container">
          {this.renderProfile()}
          <div className="myportfoliopage-main-content">
            {this.renderLeftColumn()}
            {this.renderRightColumn()}
          </div>
          {showEditServiceForm && this.renderEditServiceForm()}
          {showAddServiceForm && this.renderAddServiceForm()}
        </div>
        <Footer />
      </>
    );
  }
}

export default MyPortfolio;
