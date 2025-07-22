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
    videos: [],
    newVideo: null,
    isAddingToCart: false,
    cartMessage: "",
    currentUserId: null,
    freelancerData: null,
  };

  // Predefined list of professional roles (same as PortfolioList)
  predefinedProfessions = [
    "Web Developer",
    "Mobile App Developer",
    "Full Stack Developer",
    "Frontend Developer",
    "Backend Developer",
    "UI/UX Designer",
    "Graphic Designer",
    "Digital Marketing Specialist",
    "Content Writer",
    "Copywriter",
    "SEO Specialist",
    "Social Media Manager",
    "Video Editor",
    "Photographer",
    "Data Analyst",
    "Data Scientist",
    "Machine Learning Engineer",
    "DevOps Engineer",
    "Cybersecurity Specialist",
    "Cloud Architect",
    "Business Analyst",
    "Project Manager",
    "Product Manager",
    "Technical Writer",
    "Software Tester",
    "Quality Assurance Engineer",
    "Database Administrator",
    "System Administrator",
    "Network Engineer",
    "Blockchain Developer",
    "Game Developer",
    "WordPress Developer",
    "Shopify Developer",
    "E-commerce Specialist",
    "Email Marketing Specialist",
    "PPC Specialist",
    "Brand Designer",
    "Logo Designer",
    "Illustration Designer",
    "Motion Graphics Designer",
    "3D Modeler",
    "Animation Specialist",
    "Voice Over Artist",
    "Translator",
    "Virtual Assistant",
    "Customer Support Specialist",
    "Sales Specialist",
    "Lead Generation Specialist",
    "Market Research Analyst",
    "Financial Analyst",
    "Accounting Specialist",
    "Tax Consultant",
    "Legal Consultant",
    "HR Consultant",
    "Business Consultant",
    "Marketing Consultant",
    "Strategy Consultant",
    "Interior Designer",
    "Fashion Designer",
    "Chartered Accountant",
    "Digital Marketing",
    "Web Development Professional",
  ];

  // Function to normalize and match profession names
  normalizeProfession = (inputProfession) => {
    if (!inputProfession || typeof inputProfession !== "string") {
      return null;
    }

    const normalized = inputProfession.trim().toLowerCase();

    // Find exact match first
    const exactMatch = this.predefinedProfessions.find(
      (prof) => prof.toLowerCase() === normalized
    );

    if (exactMatch) return exactMatch;

    // Find partial match (contains)
    const partialMatch = this.predefinedProfessions.find(
      (prof) =>
        prof.toLowerCase().includes(normalized) ||
        normalized.includes(prof.toLowerCase())
    );

    if (partialMatch) return partialMatch;

    const variations = {
      "web dev": "Web Developer",
      "frontend dev": "Frontend Developer",
      "backend dev": "Backend Developer",
      "fullstack dev": "Full Stack Developer",
      "ui designer": "UI/UX Designer",
      "ux designer": "UI/UX Designer",
      "digital marketer": "Digital Marketing Specialist",
      "seo expert": "SEO Specialist",
      "social media": "Social Media Manager",
      "data science": "Data Scientist",
      "ml engineer": "Machine Learning Engineer",
      "qa engineer": "Quality Assurance Engineer",
      "qa tester": "Quality Assurance Engineer",
      "software test": "Software Tester",
      devops: "DevOps Engineer",
      "cyber security": "Cybersecurity Specialist",
      "security specialist": "Cybersecurity Specialist",
      "wordpress dev": "WordPress Developer",
      ecommerce: "E-commerce Specialist",
      va: "Virtual Assistant",
      "virtual assist": "Virtual Assistant",
      "customer service": "Customer Support Specialist",
      ca: "Chartered Accountant",
      "chartered acc": "Chartered Accountant",
    };

    for (const [key, value] of Object.entries(variations)) {
      if (normalized.includes(key) || key.includes(normalized)) {
        return value;
      }
    }

    return inputProfession;
  };

  componentDidMount() {
    this.setState({ isLoading: true });

    // Test backend connection first
    this.testBackendConnection();

    const pathSegments = window.location.pathname.split("/");
    const portfolioUserId = pathSegments[pathSegments.length - 1];

    // Get current logged in user ID
    const userData = localStorage.getItem("user");
    const currentUserId = userData ? JSON.parse(userData).id : null;
    this.setState({ currentUserId });

    if (portfolioUserId && portfolioUserId !== "my-portfolio") {
      this.fetchPortfolioData(portfolioUserId);
    } else {
      setTimeout(() => {
        this.checkAuthentication();
      }, 300);
    }
  }

  // Test function to check if backend is reachable
  testBackendConnection = async () => {
    try {
      console.log("=== TESTING BACKEND CONNECTION ===");
      const response = await fetch(`${this.state.baseUrl}/api/status`);

      console.log("Status check response:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("Backend is reachable:", data);
        return true;
      } else {
        console.log("Backend returned error status:", response.status);
        return false;
      }
    } catch (error) {
      console.error("Backend connection test failed:", error);
      return false;
    }
  };

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

      // Normalize profession from user data
      const normalizedProfession = this.normalizeProfession(user.profession);

      // Store freelancer data for cart functionality
      this.setState({
        freelancerData: {
          id: userId,
          name: user.name,
          email: user.email,
          profileImage: user.profileImage,
          voatId: user.voatId,
        },
      });

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

      const serviceNames = [
        ...new Set(services.map((service) => service.name)),
      ];

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
        profession: normalizedProfession || "Professional",
        originalProfession: user.profession || "",
        experience: portfolio?.workExperience || "",
        about: portfolio?.about || "",
        email: portfolio?.email || user.email || "",
        profileImage:
          user.profileImage && user.profileImage !== "/api/placeholder/150/150"
            ? user.profileImage.startsWith("http")
              ? user.profileImage
              : `${this.state.baseUrl}/${user.profileImage.replace(/^\//, "")}`
            : "/api/placeholder/150/150",
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

  formatName = (name) => {
    if (!name || typeof name !== "string") return name;

    return name
      .toLowerCase()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  handleAddToCart = async () => {
    const {
      selectedPricing,
      currentUserId,
      freelancerData,
      services,
      activeServiceTab,
    } = this.state;

    console.log("=== ADD TO CART DEBUG ===");
    console.log("Current User ID:", currentUserId);
    console.log("Freelancer Data:", freelancerData);
    console.log("Selected Pricing:", selectedPricing);
    console.log("Active Service Tab:", activeServiceTab);

    // Validation checks
    if (!currentUserId) {
      alert("Please login to add items to cart");
      return;
    }

    if (currentUserId === freelancerData?.id) {
      alert("You cannot add your own services to cart");
      return;
    }

    if (!selectedPricing) {
      alert("Please select a pricing option first");
      return;
    }

    const serviceName = services.find(
      (service) =>
        service.toLowerCase().replace(/\s+/g, "-") === activeServiceTab
    );

    if (!serviceName) {
      alert("Please select a service first");
      return;
    }

    this.setState({ isAddingToCart: true, cartMessage: "" });

    try {
      const cartData = {
        userId: currentUserId,
        freelancerId: freelancerData.id,
        freelancerName: freelancerData.name,
        freelancerProfileImage: freelancerData.profileImage,
        serviceName: serviceName,
        serviceLevel: selectedPricing.level,
        basePrice: parseFloat(selectedPricing.price),
        paymentType: "final",
      };

      console.log("=== CART DATA TO SEND ===", cartData);

      const response = await fetch(`${this.state.baseUrl}/api/cart/add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(cartData),
      });

      console.log("=== RESPONSE STATUS ===", response.status);

      // Check if response is JSON
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.error("=== NON-JSON RESPONSE ===", text);
        throw new Error(
          "Server returned non-JSON response. Cart API may not be working."
        );
      }

      const result = await response.json();
      console.log("=== PARSED RESPONSE ===", result);

      if (!response.ok) {
        throw new Error(result.message || `Server error: ${response.status}`);
      }

      this.setState({
        cartMessage: "✅ Service added to cart successfully!",
        selectedPricing: null,
      });

      setTimeout(() => {
        this.setState({ cartMessage: "" });
      }, 3000);
    } catch (error) {
      console.error("=== ADD TO CART ERROR ===", error);

      let errorMessage = "Failed to add to cart";
      if (error.message.includes("Server returned non-JSON")) {
        errorMessage = "Cart service is currently unavailable";
      } else if (error.message.includes("Failed to fetch")) {
        errorMessage = "Network error - please check your connection";
      } else {
        errorMessage = error.message;
      }

      this.setState({
        cartMessage: `❌ Error: ${errorMessage}`,
      });

      setTimeout(() => {
        this.setState({ cartMessage: "" });
      }, 5000);
    } finally {
      this.setState({ isAddingToCart: false });
    }
  };

  // Book Now functionality
  handleBookNow = async () => {
    const {
      selectedPricing,
      currentUserId,
      freelancerData,
      services,
      activeServiceTab,
    } = this.state;

    // Check if user is logged in
    if (!currentUserId) {
      alert("Please login to book services");
      return;
    }

    // Check if user is trying to book their own service
    if (currentUserId === freelancerData?.id) {
      alert("You cannot book your own services");
      return;
    }

    // Check if pricing is selected
    if (!selectedPricing) {
      alert("Please select a pricing option first");
      return;
    }

    // Get current service name
    const serviceName = services.find(
      (service) =>
        service.toLowerCase().replace(/\s+/g, "-") === activeServiceTab
    );

    if (!serviceName) {
      alert("Please select a service first");
      return;
    }

    try {
      // Get current user data
      const userData = localStorage.getItem("user");
      const currentUser = JSON.parse(userData);

      const bookingData = {
        clientId: currentUserId,
        clientName: currentUser.name,
        clientEmail: currentUser.email,
        clientProfileImage: currentUser.profileImage,
        freelancerId: freelancerData.id,
        freelancerName: freelancerData.name,
        freelancerEmail: freelancerData.email,
        serviceName: `${serviceName} - ${selectedPricing.level}`,
        servicePrice: parseFloat(selectedPricing.price),
      };

      console.log("Creating booking:", bookingData);

      const response = await fetch(`${this.state.baseUrl}/api/create-booking`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(bookingData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to create booking");
      }

      console.log("Booking created successfully:", result);

      this.setState({
        cartMessage: "✅ Booking request sent successfully!",
        selectedPricing: null,
      });

      // Show success message for 3 seconds
      setTimeout(() => {
        this.setState({ cartMessage: "" });
      }, 3000);
    } catch (error) {
      console.error("Error creating booking:", error);
      this.setState({
        cartMessage: `❌ Error: ${error.message}`,
      });

      // Clear error message after 5 seconds
      setTimeout(() => {
        this.setState({ cartMessage: "" });
      }, 5000);
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

    // Add duplicate check here
    if (
      this.state.services.some(
        (service) =>
          service.toLowerCase().trim() === newServiceName.toLowerCase().trim()
      )
    ) {
      alert("A service with this name already exists!");
      return;
    }

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

      // Update local state with deduplication
      const newServices = [...this.state.services, newServiceName];
      const deduplicatedServices = [...new Set(newServices)]; // Remove any duplicates

      const newServiceKey = newServiceName.toLowerCase().replace(/\s+/g, "-");
      const updatedServiceData = { ...this.state.serviceData };
      updatedServiceData[newServiceKey] = {
        id: result.serviceId,
        description: newServiceDescription,
        pricing: newServicePricing,
        videos: [],
      };

      this.setState({
        services: deduplicatedServices,
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

  // In MyPortfolio.js

  handleAddVideo = async (e) => {
    if (!e.target.files || !e.target.files[0]) {
      return; // No file selected
    }
    const file = e.target.files[0];
    const userData = JSON.parse(localStorage.getItem("user"));

    if (!userData?.id) {
      alert("You must be logged in to upload work.");
      return;
    }

    const formData = new FormData();
    formData.append("workFile", file); // This key matches your backend multer config
    formData.append("userId", userData.id);
    formData.append("title", file.name);

    try {
      const response = await fetch(`${this.state.baseUrl}/api/add-work`, {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || "File upload failed.");
      }

      const newWorkItem = {
        id: result.workId,
        url: `${this.state.baseUrl}${result.workUrl}`,
        thumbnail: file.type.startsWith("image/")
          ? `${this.state.baseUrl}${result.workUrl}`
          : "URL_TO_A_DEFAULT_VIDEO_ICON.png",
        title: file.name,
        type: file.type.startsWith("video/") ? "video" : "image",
      };

      // Update the state to show the new work immediately
      this.setState((prevState) => ({
        videos: [...prevState.videos, newWorkItem],
      }));

      alert("Work added successfully!");
    } catch (error) {
      console.error("Error adding work:", error);
      alert(`Error: ${error.message}`);
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
    }));
  };

  getInitials = (name) => {
    if (!name || typeof name !== "string") {
      return "";
    }
    // Remove extra whitespace and split into parts
    const nameParts = name.trim().split(/\s+/);

    if (nameParts.length > 1 && nameParts[1]) {
      return (
        nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)
      ).toUpperCase();
    }

    if (nameParts[0] && nameParts[0].length > 1) {
      return nameParts[0].substring(0, 2).toUpperCase();
    }

    // For single-character names
    if (nameParts[0] && nameParts[0].length === 1) {
      return nameParts[0].toUpperCase();
    }

    return "";
  };

  handleSaveProfile = async (e) => {
    e.preventDefault();
    this.setState({ isLoading: true });

    try {
      const { editFormData, profileImage } = this.state;
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

  renderHeroSection() {
    const { portfolioData, isEditingProfile } = this.state;

    if (isEditingProfile) {
      return this.renderEditProfileForm();
    }

    if (!portfolioData) {
      return <div className="modern-loading">Loading portfolio data...</div>;
    }

    const profileImageUrl =
      portfolioData.profileImage &&
      portfolioData.profileImage !== "/api/placeholder/150/150"
        ? portfolioData.profileImage
        : null;

    return (
      <div className="modern-hero-section">
        <div className="hero-background">
          <div className="hero-gradient-overlay"></div>
        </div>

        <div className="hero-content">
          <div className="hero-profile-container">
            <div className="hero-avatar-wrapper">
              {profileImageUrl ? (
                <img
                  src={profileImageUrl}
                  alt={portfolioData.name}
                  className="hero-avatar"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "/api/placeholder/150/150";
                  }}
                />
              ) : (
                <div className="hero-avatar-placeholder">
                  {this.getInitials(portfolioData.name) || "P"}
                </div>
              )}
            </div>

            <div className="hero-info">
              <h1 className="hero-name">
                {this.formatName(portfolioData.name) || "Name"}
              </h1>
              <p className="hero-profession">
                {portfolioData.profession || "Professional"}
              </p>
              <p className="hero-headline">
                {portfolioData.headline || "Specialist"}
              </p>

              <div className="hero-meta">
                {/* <div className="meta-item">
                  <span className="meta-icon">📧</span>
                  <span className="meta-text">
                    {portfolioData.email || "email@example.com"}
                  </span>
                </div> */}
                <div className="meta-item">
                  <span className="meta-icon">⭐</span>
                  <span className="meta-text">
                    {portfolioData.experience || "N/A"} years of experience
                  </span>
                </div>
              </div>
            </div>

            {portfolioData.isOwnProfile && (
              <button
                className="hero-edit-btn"
                onClick={this.toggleEditProfile}
                title="Edit Profile"
              >
                Edit Profile
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  //COVER IMAGE SECTION COMMENTED OUT
  renderEditProfileForm() {
    const { editFormData, profileImagePreview, portfolioData } = this.state;

    const profileImageUrl =
      profileImagePreview ||
      (portfolioData.profileImage &&
      portfolioData.profileImage !== "/api/placeholder/150/150"
        ? portfolioData.profileImage
        : null);

    return (
      <div className="modern-modal-overlay">
        <div className="modern-modal large">
          <div className="modal-header">
            <div className="header-content">
              <span className="header-icon">👤</span>
              <h2 className="modal-title">Edit Profile</h2>
            </div>
            <button
              className="modal-close-btn"
              onClick={this.toggleEditProfile}
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>

          <div className="modal-body">
            <form onSubmit={this.handleSaveProfile} className="modern-form">
              <div className="image-uploads">
                <div className="upload-group">
                  <label className="form-label">Profile Image</label>
                  <div className="profile-upload-area">
                    <div className="profile-preview-container">
                      {profileImageUrl ? (
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
                        <div className="profile-placeholder">
                          <span className="placeholder-text">
                            {this.getInitials(editFormData.name)}
                          </span>
                        </div>
                      )}
                    </div>
                    <label htmlFor="profile-image" className="upload-btn small">
                      <span className="btn-icon">📎</span>
                      Choose Image
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

              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="name" className="form-label">
                    Full Name
                  </label>
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
                <div className="form-group">
                  <label htmlFor="profession" className="form-label">
                    Profession
                  </label>
                  <input
                    type="text"
                    id="profession"
                    name="profession"
                    value={editFormData.profession}
                    onChange={this.handleInputChange}
                    required
                    placeholder="e.g. Web Developer"
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="headline" className="form-label">
                    Headline
                  </label>
                  <input
                    type="text"
                    id="headline"
                    name="headline"
                    value={editFormData.headline}
                    onChange={this.handleInputChange}
                    required
                    placeholder="e.g. MERN Stack | Business Websites"
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="experience" className="form-label">
                    Experience
                  </label>
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

              <div className="form-group">
                <label htmlFor="about" className="form-label">
                  About Me
                </label>
                <textarea
                  id="about"
                  name="about"
                  rows="4"
                  value={editFormData.about}
                  onChange={this.handleInputChange}
                  required
                  placeholder="Share details about your background, skills, and experience..."
                  className="form-textarea"
                ></textarea>
              </div>

              <div className="form-group">
                <label htmlFor="email" className="form-label">
                  Email Address
                </label>
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
                <button type="submit" className="action-btn primary">
                  <span className="btn-icon">✅</span>
                  Save Changes
                </button>
                <button
                  type="button"
                  className="action-btn secondary"
                  onClick={this.toggleEditProfile}
                >
                  <span className="btn-icon">❌</span>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  renderLeftColumn() {
    const { portfolioData, services, activeServiceTab, serviceData, videos } =
      this.state;

    if (!portfolioData) {
      return <div className="modern-loading">Loading...</div>;
    }

    const isOwnProfile = portfolioData?.isOwnProfile;
    const effectiveActiveTab =
      activeServiceTab ||
      (services.length > 0
        ? services[0].toLowerCase().replace(/\s+/g, "-")
        : "");

    return (
      <div className="modern-left-column">
        {/* Hero Section */}
        {this.renderHeroSection()}

        {/* About Section */}
        <div className="modern-card about-section">
          <div className="card-header">
            <div className="header-content">
              <span className="header-icon">👤</span>
              <h2 className="card-title">About Me</h2>
            </div>
          </div>
          <div className="card-body">
            <p className="about-description">
              {portfolioData.about || "No information available"}
            </p>
          </div>
        </div>

        {/* Services Section */}
        <div className="modern-card services-section">
          <div className="card-header">
            <div className="header-content">
              <span className="header-icon">🛠️</span>
              <h2 className="card-title">My Services</h2>
            </div>
            {isOwnProfile && services.length > 0 && (
              <button
                className="header-action-btn"
                onClick={this.handleEditService}
                disabled={!effectiveActiveTab}
                title="Edit Service"
              >
                Edit Service
              </button>
            )}
          </div>

          <div className="card-body">
            {services.length > 0 ? (
              <>
                <div className="service-tabs">
                  {[...new Set(services)].map((service, index) => {
                    const serviceKey = service
                      .toLowerCase()
                      .replace(/\s+/g, "-");
                    return (
                      <button
                        key={`${serviceKey}-${index}`}
                        className={`service-tab ${
                          activeServiceTab === serviceKey ? "active" : ""
                        }`}
                        onClick={() => this.handleTabChange(serviceKey)}
                      >
                        <span className="tab-text">{service}</span>
                        {isOwnProfile && (
                          <span
                            className="tab-remove"
                            onClick={(e) => {
                              e.stopPropagation();
                              // Find the actual index in the original services array
                              const actualIndex = services.findIndex(
                                (s) => s === service
                              );
                              this.handleServiceHoverRemove(actualIndex);
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

                <div className="service-content">
                  <h3 className="service-title">
                    {services.find(
                      (service) =>
                        service.toLowerCase().replace(/\s+/g, "-") ===
                        effectiveActiveTab
                    ) || "Service"}
                  </h3>
                  <p className="service-description">
                    {serviceData[effectiveActiveTab]?.description ||
                      "No description available for this service."}
                  </p>
                </div>
              </>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">🎯</div>
                <h3 className="empty-title">No Services Yet</h3>
                <p className="empty-text">
                  {isOwnProfile
                    ? "Start showcasing your expertise by adding your first service."
                    : "This professional hasn't added any services yet."}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Portfolio Gallery Section */}
        <div className="modern-card portfolio-section">
          <div className="card-header">
            <div className="header-content">
              <span className="header-icon">🎨</span>
              <h2 className="card-title">Portfolio Gallery</h2>
            </div>
            {isOwnProfile && (
              <label className="header-action-btn" htmlFor="portfolio-upload">
                <span className="btn-icon">📎</span>
                Upload
                <input
                  type="file"
                  id="portfolio-upload"
                  accept="video/*,image/*"
                  onChange={this.handleAddVideo}
                  style={{ display: "none" }}
                />
              </label>
            )}
          </div>

          <div className="card-body">
            {videos.length > 0 ? (
              <div className="portfolio-grid">
                {videos.map((video) => (
                  <div key={video.id} className="portfolio-item">
                    <div className="portfolio-thumbnail">
                      <img src={video.thumbnail} alt="Portfolio work" />
                      <div className="portfolio-overlay">
                        <button
                          className="portfolio-play-btn"
                          onClick={() => window.open(video.url, "_blank")}
                          title="View Work"
                        >
                          <span className="play-icon">▶</span>
                        </button>
                        {isOwnProfile && (
                          <button
                            className="portfolio-remove-btn"
                            onClick={() => this.handleRemoveVideo(video.id)}
                            title="Remove Work"
                          >
                            <span className="remove-icon">🗑️</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">📸</div>
                <h3 className="empty-title">No Portfolio Items</h3>
                <p className="empty-text">
                  {isOwnProfile
                    ? "Upload your best work to showcase your skills and attract clients."
                    : "This professional hasn't uploaded any work samples yet."}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Call to Action Section */}
        <div className="modern-card cta-section">
          <div className="cta-content">
            <div className="cta-icon">💼</div>
            <h2 className="cta-title">Ready to Work Together?</h2>
            <p className="cta-description">
              Let's discuss your project and bring your ideas to life with
              professional expertise.
            </p>
            <div className="cta-actions">
              <button className="cta-btn primary">
                <span className="btn-icon">💬</span>
                Start Conversation
              </button>
              <button className="cta-btn secondary">
                <span className="btn-icon">📞</span>
                Schedule Call
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  renderRightColumn() {
    const {
      serviceData,
      activeServiceTab,
      selectedPricing,
      services,
      portfolioData,
      isAddingToCart,
      cartMessage,
      currentUserId,
      freelancerData,
    } = this.state;

    const effectiveActiveTab =
      activeServiceTab ||
      (services.length > 0
        ? services[0].toLowerCase().replace(/\s+/g, "-")
        : "");

    if (!effectiveActiveTab || !serviceData[effectiveActiveTab]) {
      return (
        <div className="modern-right-column">
          <div className="modern-pricing-card">
            <div className="pricing-header">
              <div className="header-content">
                <span className="header-icon">💰</span>
                <h2 className="pricing-title">Service Pricing</h2>
              </div>
            </div>
            <div className="pricing-body">
              <div className="pricing-empty-state">
                <div className="empty-icon">🎯</div>
                <h3 className="empty-title">Select a Service</h3>
                <p className="empty-description">
                  Choose a service from the left panel to view pricing options
                  and make a booking.
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    const currentServicePricing = serviceData[effectiveActiveTab].pricing || [];
    const serviceName = services.find(
      (service) =>
        service.toLowerCase().replace(/\s+/g, "-") === effectiveActiveTab
    );

    const isOwnProfile = portfolioData?.isOwnProfile;
    const canInteract = currentUserId && !isOwnProfile;

    return (
      <div className="modern-right-column">
        <div className="modern-pricing-card">
          <div className="pricing-header">
            <div className="header-content">
              <span className="header-icon">💰</span>
              <h2 className="pricing-title">Pricing Plans</h2>
            </div>
            <div className="service-badge">
              <span className="badge-text">{serviceName}</span>
            </div>
          </div>

          <div className="pricing-body">
            {currentServicePricing.length > 0 ? (
              <>
                <div className="pricing-options">
                  {currentServicePricing.map((option, index) => (
                    <div
                      key={index}
                      className={`pricing-option ${
                        selectedPricing?.level === option?.level
                          ? "selected"
                          : ""
                      } ${!canInteract ? "disabled" : ""}`}
                      onClick={() =>
                        canInteract && this.handlePricingSelect(option)
                      }
                    >
                      <div className="option-header">
                        <div className="option-selection">
                          <input
                            type="radio"
                            name="pricing"
                            checked={selectedPricing?.level === option?.level}
                            onChange={() =>
                              canInteract && this.handlePricingSelect(option)
                            }
                            className="pricing-radio"
                            disabled={!canInteract}
                          />
                          <div className="option-info">
                            <h3 className="option-level">{option.level}</h3>
                            <div className="option-details">
                              <div className="option-price">
                                ₹{option.price}
                              </div>
                              <div className="option-delivery">
                                <span className="delivery-icon">📆</span>
                                <span className="delivery-text">
                                  {option.timeFrame}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        {selectedPricing?.level === option?.level && (
                          <div className="selected-indicator">
                            <span className="check-icon">✓</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Cart Message Display */}
                {cartMessage && (
                  <div
                    className={`cart-message ${
                      cartMessage.includes("❌") ? "error" : "success"
                    }`}
                  >
                    {cartMessage}
                  </div>
                )}

                <div className="pricing-info">
                  <div className="info-card">
                    <div className="info-icon">💡</div>
                    <div className="info-content">
                      <h4 className="info-title">Custom Requirements?</h4>
                      <p className="info-text">
                        Contact <strong>VOAT Network</strong> for personalized
                        quotes and tailored solutions.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pricing-actions">
                  {!currentUserId ? (
                    <div className="login-prompt">
                      <p className="prompt-text">
                        Please login to book services
                      </p>
                      <button
                        className="action-btn secondary"
                        onClick={() => (window.location.href = "/login")}
                      >
                        <span className="btn-icon">🔐</span>
                        Login
                      </button>
                    </div>
                  ) : isOwnProfile ? (
                    <div className="own-profile-message">
                      <p className="prompt-text">This is your own profile</p>
                    </div>
                  ) : (
                    <>
                      <button
                        className="action-btn primary"
                        onClick={this.handleAddToCart}
                        disabled={!selectedPricing || isAddingToCart}
                      >
                        <span className="btn-icon">
                          {isAddingToCart ? "⏳" : "🛒"}
                        </span>
                        {isAddingToCart ? "Adding..." : "Add to Cart"}
                      </button>
                      <button
                        className="action-btn secondary"
                        onClick={this.handleBookNow}
                        disabled={!selectedPricing || isAddingToCart}
                      >
                        <span className="btn-icon">⚡</span>
                        Book Now
                      </button>
                    </>
                  )}
                </div>

                {/* Service Details */}
                {selectedPricing && (
                  <div className="selected-service-details">
                    <h4 className="details-title">Selected Service Details:</h4>
                    <div className="details-content">
                      <div className="detail-item">
                        <span className="detail-label">Service:</span>
                        <span className="detail-value">{serviceName}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Package:</span>
                        <span className="detail-value">
                          {selectedPricing.level}
                        </span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Price:</span>
                        <span className="detail-value">
                          ₹{selectedPricing.price}
                        </span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Delivery:</span>
                        <span className="detail-value">
                          {selectedPricing.timeFrame}
                        </span>
                      </div>
                      {freelancerData && (
                        <div className="detail-item">
                          <span className="detail-label">Provider:</span>
                          <span className="detail-value">
                            {freelancerData.name}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="pricing-empty-state">
                <div className="empty-icon">💰</div>
                <h3 className="empty-title">No Pricing Available</h3>
                <p className="empty-description">
                  Pricing options for this service haven't been set up yet.
                  Contact directly for quotes.
                </p>
                <button className="contact-btn">
                  <span className="btn-icon">💬</span>
                  Contact for Quote
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  renderAddServiceForm() {
    const { newServiceName, newServiceDescription, newServicePricing } =
      this.state;

    return (
      <div className="modern-modal-overlay">
        <div className="modern-modal">
          <div className="modal-header">
            <div className="header-content">
              <span className="header-icon">➕</span>
              <h2 className="modal-title">Add New Service</h2>
            </div>
            <button
              className="modal-close-btn"
              onClick={this.toggleAddServiceForm}
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>

          <div className="modal-body">
            <form onSubmit={this.handleSaveNewService} className="modern-form">
              <div className="form-group">
                <label htmlFor="service-name" className="form-label">
                  Service Name
                </label>
                <input
                  type="text"
                  id="service-name"
                  value={newServiceName}
                  onChange={(e) => this.handleAddServiceFormChange(e, "name")}
                  placeholder="e.g. Web Development, Logo Design"
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="service-description" className="form-label">
                  Service Description
                </label>
                <textarea
                  id="service-description"
                  rows="4"
                  value={newServiceDescription}
                  onChange={(e) =>
                    this.handleAddServiceFormChange(e, "description")
                  }
                  placeholder="Describe your service in detail..."
                  className="form-textarea"
                  required
                />
              </div>

              <div className="pricing-setup">
                <h4 className="pricing-setup-title">
                  <span className="title-icon">💰</span>
                  Set Pricing Packages
                </h4>

                {newServicePricing.map((pricing, index) => (
                  <div key={index} className="pricing-package">
                    <div className="package-header">
                      <span className="package-level">
                        {pricing.level} Package
                      </span>
                    </div>

                    <div className="package-inputs">
                      <div className="input-group">
                        <label
                          htmlFor={`new-price-${index}`}
                          className="input-label"
                        >
                          Price (₹)
                        </label>
                        <input
                          type="number"
                          id={`new-price-${index}`}
                          name="price"
                          value={pricing.price}
                          onChange={(e) =>
                            this.handleAddServiceFormChange(e, "pricing", index)
                          }
                          placeholder="25000"
                          className="form-input"
                          required
                        />
                      </div>

                      <div className="input-group">
                        <label
                          htmlFor={`new-timeFrame-${index}`}
                          className="input-label"
                        >
                          Delivery Time
                        </label>
                        <input
                          type="text"
                          id={`new-timeFrame-${index}`}
                          name="timeFrame"
                          value={pricing.timeFrame}
                          onChange={(e) =>
                            this.handleAddServiceFormChange(e, "pricing", index)
                          }
                          placeholder="2 weeks"
                          className="form-input"
                          required
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="form-actions">
                <button type="submit" className="action-btn primary">
                  <span className="btn-icon">✅</span>
                  Add Service
                </button>
                <button
                  type="button"
                  className="action-btn secondary"
                  onClick={this.toggleAddServiceForm}
                >
                  <span className="btn-icon">❌</span>
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
      <div className="modern-modal-overlay">
        <div className="modern-modal">
          <div className="modal-header">
            <div className="header-content">
              <span className="header-icon">✏️</span>
              <h2 className="modal-title">
                Edit Service: {editingServiceName}
              </h2>
            </div>
            <button
              className="modal-close-btn"
              onClick={this.toggleEditServiceForm}
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>

          <div className="modal-body">
            <form
              onSubmit={this.handleSaveEditedService}
              className="modern-form"
            >
              <div className="form-group">
                <label
                  htmlFor="edit-service-description"
                  className="form-label"
                >
                  Service Description
                </label>
                <textarea
                  id="edit-service-description"
                  rows="4"
                  value={editingServiceDescription}
                  onChange={(e) =>
                    this.handleEditServiceFormChange(e, "description")
                  }
                  placeholder="Describe your service in detail..."
                  className="form-textarea"
                  required
                />
              </div>

              <div className="pricing-setup">
                <h4 className="pricing-setup-title">
                  <span className="title-icon">💰</span>
                  Update Pricing Packages
                </h4>

                {editingServicePricing.map((pricing, index) => (
                  <div key={index} className="pricing-package">
                    <div className="package-header">
                      <span className="package-level">
                        {pricing.level} Package
                      </span>
                    </div>

                    <div className="package-inputs">
                      <div className="input-group">
                        <label
                          htmlFor={`edit-price-${index}`}
                          className="input-label"
                        >
                          Price (₹)
                        </label>
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
                          placeholder="25000"
                          className="form-input"
                          required
                        />
                      </div>

                      <div className="input-group">
                        <label
                          htmlFor={`edit-timeFrame-${index}`}
                          className="input-label"
                        >
                          Delivery Time
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
                          placeholder="2 weeks"
                          className="form-input"
                          required
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="form-actions">
                <button type="submit" className="action-btn primary">
                  <span className="btn-icon">✅</span>
                  Save Changes
                </button>
                <button
                  type="button"
                  className="action-btn secondary"
                  onClick={this.toggleEditServiceForm}
                >
                  <span className="btn-icon">❌</span>
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
        <div className="modern-loading-container">
          <div className="loading-spinner"></div>
          <p className="loading-text">Loading portfolio...</p>
        </div>
      );
    }

    if (!portfolioData) {
      return (
        <div className="modern-error-container">
          <div className="error-content">
            <div className="error-icon">❌</div>
            <h2 className="error-title">Portfolio Not Found</h2>
            <p className="error-description">
              This portfolio hasn't been created or is not available.
            </p>
          </div>
        </div>
      );
    }

    if (!portfolioData.isApproved && !portfolioData.isOwnProfile) {
      return (
        <>
          <NavBar />
          <div className="modern-container">
            <div className="modern-status-container">
              <div className="status-content">
                <div className="status-icon">⏳</div>
                <h2 className="status-title">Portfolio Not Available</h2>
                <p className="status-description">
                  This portfolio is not currently available for public viewing.
                </p>
              </div>
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
          <div className="modern-container">
            <div className="modern-status-container">
              <div className="status-content">
                <div className="status-icon">⏳</div>
                <h2 className="status-title">Portfolio Awaiting Approval</h2>
                <p className="status-description">
                  Your portfolio has been submitted and is waiting for admin
                  approval. You can continue to edit your details, but your
                  portfolio will not be visible to others until approved.
                </p>
              </div>
            </div>
            <div className="modern-main-content">
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
        <div className="modern-container">
          <div className="modern-main-content">
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
