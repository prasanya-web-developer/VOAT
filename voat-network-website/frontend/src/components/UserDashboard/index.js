import { Component } from "react";
import { Link } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import "./index.css";

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
    bookings: [],
    selectedBooking: null,
    showBookingDetails: false,
    notifications: [],

    // NEW: Orders functionality
    myOrders: [], // Orders placed by user (as client)
    receivedOrders: [], // Orders received by freelancer
    freelancerOrders: [],

    selectedOrder: null,
    showOrderDetails: false,

    stats: {
      totalSpent: 0,
      activeOrders: 0,
      completedOrders: 0,
      savedItems: 0,
      totalBookings: 0,
      pendingBookings: 0,
      // NEW: Additional stats for freelancers
      totalEarned: 0,
      completedProjects: 0,
      bookingRequestsCount: 0,
      myOrdersCount: 0,
    },

    bookingFilter: "all",
    orderFilter: "all",
    orderSearchQuery: "",
    wishlistSearchQuery: "",
    bookingSearchQuery: "",
    showNotifications: false,
    formData: {
      name: "",
      email: "",
      role: "",
      profession: "",
      phone: "",
    },
    portfolioFormData: {
      name: "",
      profession: "",
      headline: "",
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
    selectedWorkFiles: [],
    workPreviews: [],
    uploadingWorks: false,
    profileImage: null,
    previewImage: null,
    resumeFileName: "",
    baseUrl:
      window.location.hostname === "localhost"
        ? "http://localhost:5000"
        : "https://voat.onrender.com",
    showMobileSidebar: false,
    wishlistLoading: false,
    cartItems: [],
  };

  componentDidMount() {
    this.loadUserData().then(() => {
      this.fetchPortfolioStatus().then(() => {
        // COMMON for all users
        this.fetchMyBookings();
        this.fetchWishlist();
        this.fetchNotifications();

        // Add a small delay to ensure userData is properly set
        setTimeout(() => {
          this.fetchOrders(); // This fetches orders as CLIENT

          // ADDITIONAL for freelancers only
          if (this.isFreelancer()) {
            this.fetchBookingRequests();
            this.fetchFreelancerOrders(); // This fetches orders received as FREELANCER
          }
        }, 500);

        setTimeout(() => {
          this.updateStats();
        }, 1000);
      });
    });

    // Check if coming from successful payment
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("payment") === "success") {
      // Delay refresh to allow backend processing to complete
      setTimeout(() => {
        this.refreshAfterPayment();
      }, 3000);
    }

    // Auto-refresh data every 30 seconds
    this.dataRefreshInterval = setInterval(() => {
      this.refreshOrderData();
    }, 30000);

    this.checkWishlistConsistency();
    this.wishlistRefreshInterval = setInterval(() => {
      this.fetchWishlist();
    }, 10000);

    this.notificationRefreshInterval = setInterval(() => {
      this.fetchNotifications();
    }, 30000);

    this.handleWishlistUpdate = this.handleWishlistUpdate.bind(this);
    window.addEventListener("wishlistUpdated", this.handleWishlistUpdate);

    this.cartStatusInterval = setInterval(() => {
      if (this.state.activeTab === "wishlist") {
        this.refreshCartStatus();
      }
    }, 30000);

    this.dataRefreshInterval = setInterval(() => {
      this.refreshOrderData();
    }, 30000);

    document.addEventListener("click", this.handleClickOutside);
  }

  componentWillUnmount() {
    if (this.wishlistRefreshInterval) {
      clearInterval(this.wishlistRefreshInterval);
    }
    if (this.portfolioStatusTimeout) {
      clearTimeout(this.portfolioStatusTimeout);
    }
    if (this.cartStatusInterval) {
      clearInterval(this.cartStatusInterval);
    }
    if (this.notificationRefreshInterval) {
      clearInterval(this.notificationRefreshInterval);
    }
    // Add cleanup for new interval
    if (this.dataRefreshInterval) {
      clearInterval(this.dataRefreshInterval);
    }

    if (this.dataRefreshInterval) {
      clearInterval(this.dataRefreshInterval);
    }

    window.removeEventListener("wishlistUpdated", this.handleWishlistUpdate);
    document.removeEventListener("click", this.handleClickOutside);
  }

  handleClickOutside = (event) => {
    const notificationPanel = document.querySelector(
      ".notification-slide-panel"
    );
    const notificationBtn = document.querySelector(".notification-btn");

    if (
      notificationPanel &&
      !notificationPanel.contains(event.target) &&
      notificationBtn &&
      !notificationBtn.contains(event.target)
    ) {
      this.setState({ showNotifications: false });
    }
  };

  fetchNotifications = async () => {
    try {
      const userData = JSON.parse(localStorage.getItem("user") || "{}");
      if (!userData || !userData.id) {
        console.log("No user data, setting empty notifications");
        this.setState({ notifications: [] });
        return;
      }

      console.log("Fetching notifications for user:", userData.id);

      const response = await fetch(
        `${this.state.baseUrl}/api/notifications/${userData.id}`
      );

      if (response.ok) {
        const data = await response.json();
        console.log("✅ Received notifications from API:", data);

        if (data.success && Array.isArray(data.notifications)) {
          this.setState({
            notifications: data.notifications,
          });
          console.log(
            `✅ Set ${data.notifications.length} notifications in state`
          );
        } else {
          console.warn("Invalid notifications response format:", data);
          this.setState({ notifications: [] });
        }
      } else {
        console.error(
          "Failed to fetch notifications, status:",
          response.status
        );
        const errorText = await response.text();
        console.error("Error response:", errorText);
        this.setState({ notifications: [] });
      }
    } catch (error) {
      console.error("❌ Error fetching notifications:", error);
      this.setState({ notifications: [] });
    }
  };

  updateStats = () => {
    const {
      orders,
      wishlist,
      bookings,
      myBookings = [],
      receivedOrders = [],
    } = this.state;

    // Calculate stats for My Orders (paid orders placed BY current user)
    const completedOrders = orders.filter(
      (order) => order.status === "Completed" || order.status === "completed"
    );

    const totalSpent = completedOrders.reduce(
      (sum, order) => sum + (order.amount || 0),
      0
    );

    const activeOrders = orders.filter(
      (order) =>
        order.status === "In Progress" ||
        order.status === "Pending" ||
        order.status === "pending"
    ).length;

    // Calculate stats for My Bookings (separate from orders)
    const totalMyBookings = Array.isArray(myBookings) ? myBookings.length : 0;
    const pendingMyBookings = Array.isArray(myBookings)
      ? myBookings.filter((b) => b.status === "pending").length
      : 0;

    // Freelancer-specific stats (orders received)
    let totalEarned = 0;
    let completedProjects = 0;

    if (this.isFreelancer()) {
      totalEarned = Array.isArray(receivedOrders)
        ? receivedOrders
            .filter((order) => order.status === "completed")
            .reduce((sum, order) => sum + (order.servicePrice || 0), 0)
        : 0;

      completedProjects = Array.isArray(receivedOrders)
        ? receivedOrders.filter((order) => order.status === "completed").length
        : 0;
    }

    const myOrdersCount = orders.length;

    this.setState({
      stats: {
        totalSpent,
        activeOrders,
        completedOrders: completedOrders.length,
        savedItems: wishlist.length,
        totalBookings: totalMyBookings,
        pendingBookings: pendingMyBookings,
        // Freelancer stats
        totalEarned,
        completedProjects,
        bookingRequestsCount: Array.isArray(bookings)
          ? bookings.filter((booking) => booking.status === "pending").length
          : 0,
        myOrdersCount,
      },
    });
  };

  // Toggle notification panel
  toggleNotifications = (e) => {
    e.stopPropagation();
    this.setState((prevState) => ({
      showNotifications: !prevState.showNotifications,
    }));
  };

  handleBookingSearch = (e) => {
    this.setState({ bookingSearchQuery: e.target.value });
  };

  getFilteredBookings = () => {
    const { bookings, bookingFilter, bookingSearchQuery } = this.state;

    let filtered = bookings;

    // Apply status filter
    if (bookingFilter !== "all") {
      filtered = filtered.filter((booking) => booking.status === bookingFilter);
    }

    // Apply search filter
    if (bookingSearchQuery.trim()) {
      const query = bookingSearchQuery.toLowerCase();
      filtered = filtered.filter(
        (booking) =>
          booking.serviceName.toLowerCase().includes(query) ||
          booking.clientName.toLowerCase().includes(query) ||
          booking.clientEmail.toLowerCase().includes(query) ||
          (booking.id && booking.id.toString().toLowerCase().includes(query))
      );
    }

    return filtered;
  };

  // Handle order search
  handleOrderSearch = (e) => {
    this.setState({ orderSearchQuery: e.target.value });
  };

  // Handle order filter
  handleOrderFilter = (e) => {
    this.setState({ orderFilter: e.target.value });
  };

  // Filter orders based on search and filter
  getFilteredOrders = () => {
    const { orders, orderSearchQuery, orderFilter } = this.state;

    let filtered = orders;

    // Apply status filter
    if (orderFilter !== "all") {
      filtered = filtered.filter((order) => {
        const normalizedStatus = order.status
          .toLowerCase()
          .replace(/\s+/g, "-");
        return normalizedStatus === orderFilter;
      });
    }

    // Apply search filter
    if (orderSearchQuery.trim()) {
      const query = orderSearchQuery.toLowerCase();
      filtered = filtered.filter(
        (order) =>
          order.service.toLowerCase().includes(query) ||
          order.provider.toLowerCase().includes(query) ||
          order.id.toLowerCase().includes(query)
      );
    }

    return filtered;
  };

  handleWishlistSearch = (e) => {
    this.setState({ wishlistSearchQuery: e.target.value });
  };

  //method to filter wishlist items:
  getFilteredWishlist = () => {
    const { wishlist, wishlistSearchQuery } = this.state;

    if (!wishlistSearchQuery.trim()) {
      return wishlist;
    }

    const query = wishlistSearchQuery.toLowerCase();
    return wishlist.filter(
      (item) =>
        item.service.toLowerCase().includes(query) ||
        item.provider.toLowerCase().includes(query) ||
        (item.description && item.description.toLowerCase().includes(query))
    );
  };

  checkWishlistConsistency = async () => {
    const userData = JSON.parse(localStorage.getItem("user") || "{}");
    if (!userData || !userData.id) return;

    try {
      const localWishlist = JSON.parse(
        localStorage.getItem(`wishlist_${userData.id}`) || "[]"
      );

      const response = await fetch(
        `${this.state.baseUrl}/api/wishlist/${userData.id}`
      );

      if (response.ok) {
        const serverWishlist = await response.json();

        console.log("WISHLIST CONSISTENCY CHECK:");
        console.log("- Server wishlist items:", serverWishlist.length);
        console.log("- Local wishlist items:", localWishlist.length);

        if (serverWishlist.length !== localWishlist.length) {
          console.warn(
            "⚠️ Wishlist inconsistency detected: different item counts"
          );
          console.log(
            "Server item IDs:",
            serverWishlist.map((item) => item.id)
          );
          console.log(
            "Local item IDs:",
            localWishlist.map((item) => item.id)
          );
        } else {
          console.log("✅ Wishlist item counts match");
        }
      } else {
        console.warn(
          "⚠️ Could not fetch server wishlist for consistency check"
        );
      }
    } catch (error) {
      console.error("Error checking wishlist consistency:", error);
    }
  };

  loadUserData = async () => {
    const userDataString = localStorage.getItem("user");
    if (userDataString) {
      try {
        let userData = JSON.parse(userDataString);

        if (!userData.voatId) {
          console.log("New user detected, generating VOAT ID");
          const randomPart = uuidv4().substring(0, 9).toUpperCase();
          const voatId = `VOAT-${randomPart.substring(
            0,
            4
          )}-${randomPart.substring(4, 8)}`;

          userData.voatId = voatId;
          userData.voatPoints = userData.voatPoints || 0;
          userData.badge = userData.badge || this.calculateBadge(0);

          localStorage.setItem("user", JSON.stringify(userData));

          if (userData.id) {
            await this.updateUserDataInDatabase(userData);
          }
        }

        this.setState({
          userData: userData,
          isLoading: true,
          formData: {
            name: userData.name || "",
            email: userData.email || "",
            role: userData.role || "",
            profession: userData.profession || "",
            phone: userData.phone || "",
          },
          previewImage: null,
        });

        const freshUserData = await this.refreshUserFromDatabase();

        if (freshUserData) {
          this.setState({
            userData: freshUserData,
            isLoading: false,
            formData: {
              name: freshUserData.name || "",
              email: freshUserData.email || "",
              role: freshUserData.role || "",
              profession: freshUserData.profession || "",
              phone: freshUserData.phone || "",
            },
            previewImage: freshUserData.profileImage
              ? this.getFullImageUrl(freshUserData.profileImage)
              : null,
          });
        } else {
          this.setState({
            isLoading: false,
            previewImage: null,
          });
        }
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

  generateInitials = (name) => {
    if (!name || typeof name !== "string") return "U";

    const cleanName = name.trim();
    const words = cleanName.split(/\s+/).filter((word) => word.length > 0);

    if (words.length === 0) return "U";

    if (words.length === 1) {
      const word = words[0];
      if (word.length >= 2) {
        return word.substring(0, 2).toUpperCase();
      } else {
        return word.charAt(0).toUpperCase();
      }
    } else {
      return words
        .slice(0, 2)
        .map((word) => word.charAt(0).toUpperCase())
        .join("");
    }
  };

  handleWishlistUpdate = (event) => {
    console.log("=== DASHBOARD RECEIVED WISHLIST UPDATE ===");
    if (event.detail && event.detail.updatedWishlist) {
      this.setState(
        {
          wishlist: event.detail.updatedWishlist,
        },
        () => {
          this.updateStats();
        }
      );
      console.log("Dashboard wishlist updated from cart sync");
    } else {
      this.fetchWishlist();
    }
  };

  updateUserDataInDatabase = async (userData) => {
    try {
      if (!userData.id) {
        console.error("Cannot update database: User ID is missing");
        return false;
      }

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

      if (response.ok) {
        return true;
      } else {
        console.error("Failed to update user data");
        return false;
      }
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
        const updatedUserData = {
          ...userData,
          ...result.user,
          voatId:
            result.user.voatId || userData.voatId || this.generateVoatId(),
          voatPoints:
            result.user.voatPoints !== undefined
              ? result.user.voatPoints
              : userData.voatPoints || 0,
          badge: result.user.badge || userData.badge || this.calculateBadge(0),
          profileImage: result.user.profileImage,
        };

        localStorage.setItem("user", JSON.stringify(updatedUserData));
        return updatedUserData;
      } else {
        console.error("Failed to fetch user data from database");
        return null;
      }
    } catch (error) {
      console.error("Error refreshing user data:", error);
      return null;
    }
  };

  isAdmin = () => {
    const { userData } = this.state;
    return userData && userData.email === "prasanya.webdev@gmail.com";
  };

  isFreelancer = () => {
    const { userData } = this.state;
    return userData && userData.role === "Freelancer/Service Provider";
  };

  generateVoatId = () => {
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
    try {
      console.log("=== FETCHING MY ORDERS ===");
      console.log("User ID:", this.state.userData?.id);

      if (!this.state.userData?.id) {
        console.log("No user ID available");
        this.setState({ orders: [] }, () => {
          this.updateStats();
        });
        return;
      }

      const response = await fetch(
        `${this.state.baseUrl}/api/orders/client/${this.state.userData.id}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const orders = await response.json();
        console.log("✅ Fetched orders:", orders);

        // Ensure orders is an array and has the correct structure
        const ordersArray = Array.isArray(orders) ? orders : [];

        // Transform orders to match the UI expectations
        const formattedOrders = ordersArray.map((order) => ({
          id: order.id || `ORD-${Math.random().toString(36).substr(2, 9)}`,
          service: order.service || order.serviceName,
          status: order.status || "Pending",
          date:
            order.date ||
            new Date(order.orderDate || Date.now()).toISOString().split("T")[0],
          amount: order.amount || order.totalAmount,
          provider: order.provider || order.freelancerName,
          providerImage: order.providerImage || null,
          providerEmail: order.providerEmail || order.freelancerEmail,
          providerId: order.providerId || order.freelancerId,
          orderId: order.orderId || order._id,
          orderType: order.orderType || "order",
        }));

        this.setState({ orders: formattedOrders }, () => {
          console.log("Orders set in state:", this.state.orders);
          this.updateStats();
        });
      } else {
        console.log("Failed to fetch orders, status:", response.status);
        this.setState({ orders: [] }, () => {
          this.updateStats();
        });
      }
    } catch (error) {
      console.error("Failed to fetch orders:", error);
      this.setState({ orders: [] }, () => {
        this.updateStats();
      });
    }
  };

  fetchBookingRequests = async () => {
    try {
      if (!this.state.userData || !this.state.userData.id) {
        return;
      }

      const response = await fetch(
        `${this.state.baseUrl}/api/bookings/${this.state.userData.id}`
      );

      if (response.ok) {
        const bookings = await response.json();

        const enrichedBookings = bookings.map((booking) => ({
          ...booking,
          serviceLevel: booking.serviceLevel || "Standard",
        }));

        this.setState({ bookings: enrichedBookings }, () => {
          this.updateStats(); // This is crucial for updating the sidebar count
        });
      } else {
        console.error("Failed to fetch bookings");
        this.setState({ bookings: [] }, () => {
          this.updateStats();
        });
      }
    } catch (error) {
      console.error("Error fetching bookings:", error);
      this.setState({ bookings: [] }, () => {
        this.updateStats(); // Also update stats on error
      });
    }
  };

  fetchOrdersReceived = async () => {
    try {
      if (!this.isFreelancer() || !this.state.userData?.id) return;

      const response = await fetch(
        `${this.state.baseUrl}/api/orders-received/${this.state.userData.id}`
      );

      if (response.ok) {
        const ordersReceived = await response.json();
        this.setState({ ordersReceived }, () => this.updateStats());
      } else {
        this.setState({ ordersReceived: [] });
      }
    } catch (error) {
      console.error("Failed to fetch orders received:", error);
      this.setState({ ordersReceived: [] });
    }
  };

  fetchFreelancerOrders = async () => {
    try {
      if (!this.isFreelancer() || !this.state.userData?.id) {
        console.log("Not a freelancer or no user ID");
        return;
      }

      console.log("=== FETCHING FREELANCER ORDERS ===");
      console.log("Freelancer ID:", this.state.userData.id);

      const response = await fetch(
        `${this.state.baseUrl}/api/orders/freelancer/${this.state.userData.id}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      console.log("Response status:", response.status);

      if (response.ok) {
        const receivedOrders = await response.json();
        console.log("✅ Raw API response:", receivedOrders);

        // Ensure it's an array
        const ordersArray = Array.isArray(receivedOrders) ? receivedOrders : [];

        // Transform orders to ensure we have the correct _id field
        const formattedOrders = ordersArray.map((order, index) => {
          console.log(`Processing order ${index + 1}:`, order);

          return {
            _id: order._id || order.orderId, // This is the MongoDB ObjectId we need for API calls
            id: order.id || `RCV-${String(index + 1).padStart(3, "0")}`, // This is for display
            serviceName: order.serviceName || order.service,
            clientId: order.clientId,
            clientName: order.clientName || order.client,
            clientEmail: order.clientEmail,
            clientProfileImage: order.clientProfileImage || order.clientImage,
            servicePrice: order.servicePrice || order.amount,
            status: order.status || "pending",
            requestDate: order.requestDate || order.date || order.orderDate,
            responseDate: order.responseDate,
            orderType: "order",
            paymentStatus: order.paymentStatus || "paid",
            serviceLevel: order.serviceLevel || "Standard",
          };
        });

        console.log("✅ Formatted orders:", formattedOrders);

        // Log each order's _id to verify
        formattedOrders.forEach((order, index) => {
          console.log(
            `Order ${index + 1} _id:`,
            order._id,
            "type:",
            typeof order._id
          );
        });

        this.setState({ receivedOrders: formattedOrders }, () => {
          console.log(
            "State after setting receivedOrders:",
            this.state.receivedOrders
          );
          this.updateStats();
        });
      } else {
        const errorText = await response.text();
        console.log(
          "Failed to fetch freelancer orders, status:",
          response.status,
          "Error:",
          errorText
        );
        this.setState({ receivedOrders: [] });
      }
    } catch (error) {
      console.error("Failed to fetch freelancer orders:", error);
      this.setState({ receivedOrders: [] });
    }
  };

  fetchWishlist = async () => {
    this.setState({ wishlistLoading: true });
    let userData;

    try {
      userData = JSON.parse(localStorage.getItem("user") || "{}");
      if (!userData || !userData.id) {
        console.log("No user data available, cannot fetch wishlist");
        this.setState({ wishlist: [], wishlistLoading: false }, () => {
          this.updateStats();
        });
        return;
      }

      // Fetch wishlist
      const response = await fetch(
        `${this.state.baseUrl}/api/wishlist/${userData.id}`
      );

      if (!response.ok) {
        throw new Error(
          `Server returned ${response.status}: ${await response.text()}`
        );
      }

      const apiWishlist = await response.json();

      // Fetch user's cart to check which items are already in cart
      try {
        const cartResponse = await fetch(
          `${this.state.baseUrl}/api/cart/${userData.id}`
        );

        let cartItems = [];
        if (cartResponse.ok) {
          const cartData = await cartResponse.json();
          cartItems = cartData.data || [];
        }

        // Update wishlist items with cart status
        const updatedWishlist = apiWishlist.map((item) => ({
          ...item,
          inCart: cartItems.some(
            (cartItem) =>
              cartItem.serviceName === item.service &&
              cartItem.freelancerName === item.provider
          ),
          serviceLevel: item.serviceLevel || "Standard",
          deliveryTime: item.deliveryTime || "7-14 days",
          description:
            item.description ||
            "Professional service with quality guarantee and timely delivery.",
          freelancerId: item.freelancerId || item.serviceId || item.id,
          providerEmail:
            item.providerEmail ||
            `${item.provider?.toLowerCase().replace(" ", "")}@example.com`,
        }));

        this.setState(
          {
            wishlist: updatedWishlist,
            cartItems: cartItems,
            wishlistLoading: false,
          },
          () => {
            this.updateStats();
          }
        );

        localStorage.setItem(
          `wishlist_${userData.id}`,
          JSON.stringify(updatedWishlist)
        );
      } catch (cartError) {
        console.error("Error fetching cart data:", cartError);
        // Continue with wishlist without cart status
        this.setState(
          {
            wishlist: Array.isArray(apiWishlist) ? apiWishlist : [],
            wishlistLoading: false,
          },
          () => {
            this.updateStats();
          }
        );
      }
    } catch (error) {
      console.error("Error fetching wishlist:", error);

      if (userData && userData.id) {
        try {
          const localWishlist = JSON.parse(
            localStorage.getItem(`wishlist_${userData.id}`) || "[]"
          );

          this.setState(
            {
              wishlist: localWishlist,
              wishlistLoading: false,
            },
            () => {
              this.updateStats();
            }
          );
        } catch (localError) {
          console.error(
            "Error loading wishlist from localStorage:",
            localError
          );
          this.setState({ wishlist: [], wishlistLoading: false });
        }
      } else {
        this.setState({ wishlist: [], wishlistLoading: false });
      }
    }
  };

  fetchPortfolioStatus = async () => {
    try {
      if (!this.state.userData || !this.state.userData.id) {
        console.log("No user data or user ID available");
        return;
      }

      const response = await fetch(
        `${this.state.baseUrl}/api/portfolio-status/${this.state.userData.id}`
      );

      if (response.ok) {
        const data = await response.json();
        if (this.portfolioStatusTimeout) {
          clearTimeout(this.portfolioStatusTimeout);
        }
        this.setState({ portfolioStatus: data.status });
      } else {
        this.setState({ portfolioStatus: null });
        this.checkLocalStorage();
        this.checkLocalSubmissions();
      }
    } catch (error) {
      console.error("Error fetching portfolio status:", error);
      this.checkLocalStorage();
      this.checkLocalSubmissions();
    }
  };

  checkLocalStorage = () => {
    try {
      const userId = this.state.userData?.id;
      if (!userId) return;

      const portfolioStatusKey = `portfolio_status_${userId}`;
      const storedStatus = localStorage.getItem(portfolioStatusKey);

      if (storedStatus) {
        this.setState({ portfolioStatus: storedStatus });
      } else {
        const userEmail = this.state.userData?.email;
        if (userEmail === "prasanya.webdev@gmail.com") {
          localStorage.setItem(portfolioStatusKey, "approved");
          this.setState({ portfolioStatus: "approved" });
        } else {
          this.setState({ portfolioStatus: null });
        }
      }
    } catch (error) {
      console.error("Error checking localStorage:", error);
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
            phone: this.state.userData.phone || "",
          }
        : prevState.formData,
      previewImage: !prevState.isEditing
        ? this.state.userData.profileImage
          ? this.getFullImageUrl(this.state.userData.profileImage)
          : null
        : this.state.previewImage,
      profileImage: !prevState.isEditing ? null : this.state.profileImage,
    }));
  };

  handleTabChange = (tab) => {
    this.setState({
      activeTab: tab,
      showPortfolioForm: false,
      showMobileSidebar: false,
      showNotifications: false, // Close notifications when changing tabs
    });
  };

  toggleMobileSidebar = () => {
    this.setState((prevState) => ({
      showMobileSidebar: !prevState.showMobileSidebar,
    }));
  };

  handleWorkFileChange = (e) => {
    const files = Array.from(e.target.files);
    const validFiles = [];
    const previews = [];

    files.forEach((file) => {
      // Validate file type
      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
        "video/mp4",
        "video/avi",
        "video/mov",
        "video/webm",
      ];

      if (allowedTypes.includes(file.mimetype || file.type)) {
        validFiles.push(file);

        // Create preview
        const reader = new FileReader();
        reader.onload = (e) => {
          const preview = {
            id: Date.now() + Math.random(),
            file: file,
            url: e.target.result,
            type: file.type.startsWith("video/") ? "video" : "image",
            name: file.name,
            size: file.size,
          };

          this.setState((prevState) => ({
            workPreviews: [...prevState.workPreviews, preview],
          }));
        };
        reader.readAsDataURL(file);
      }
    });

    this.setState((prevState) => ({
      selectedWorkFiles: [...prevState.selectedWorkFiles, ...validFiles],
    }));
  };

  removeWorkPreview = (previewId) => {
    this.setState((prevState) => ({
      workPreviews: prevState.workPreviews.filter(
        (preview) => preview.id !== previewId
      ),
      selectedWorkFiles: prevState.selectedWorkFiles.filter((file, index) => {
        const preview = prevState.workPreviews.find((p) => p.id === previewId);
        return preview ? file !== preview.file : true;
      }),
    }));
  };

  uploadWorksToServer = async (userId) => {
    const { selectedWorkFiles } = this.state;
    const uploadedWorks = [];

    this.setState({ uploadingWorks: true });

    for (const file of selectedWorkFiles) {
      try {
        const formData = new FormData();
        formData.append("workFile", file);
        formData.append("userId", userId);
        formData.append("title", file.name.split(".")[0]); // Use filename as title
        formData.append(
          "serviceName",
          this.state.portfolioFormData.serviceName || ""
        );

        const response = await fetch(`${this.state.baseUrl}/api/add-work`, {
          method: "POST",
          body: formData,
        });

        if (response.ok) {
          const result = await response.json();
          uploadedWorks.push(result);
        } else {
          console.error("Failed to upload work:", file.name);
        }
      } catch (error) {
        console.error("Error uploading work:", error);
      }
    }

    this.setState({ uploadingWorks: false });
    return uploadedWorks;
  };

  markNotificationAsRead = async (id) => {
    try {
      console.log("Marking notification as read:", id);

      // Update local state immediately for better UX
      this.setState((prevState) => ({
        notifications: Array.isArray(prevState.notifications)
          ? prevState.notifications.map((notification) =>
              notification.id === id
                ? { ...notification, read: true }
                : notification
            )
          : [],
      }));

      // Update on server
      const response = await fetch(
        `${this.state.baseUrl}/api/notifications/${id}/read`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        console.log("✅ Notification marked as read on server");
      } else {
        console.error("❌ Failed to mark notification as read on server");
        // Optionally revert the local state change here
      }
    } catch (error) {
      console.error("❌ Error marking notification as read:", error);
    }
  };

  // Update markAllNotificationsAsRead method
  markAllNotificationsAsRead = async () => {
    try {
      const userData = JSON.parse(localStorage.getItem("user") || "{}");
      if (!userData || !userData.id) return;

      console.log("Marking all notifications as read");

      // Update local state immediately
      this.setState((prevState) => ({
        notifications: Array.isArray(prevState.notifications)
          ? prevState.notifications.map((notification) => ({
              ...notification,
              read: true,
            }))
          : [],
      }));

      // Update on server
      const response = await fetch(
        `${this.state.baseUrl}/api/notifications/${userData.id}/read-all`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        console.log("✅ All notifications marked as read on server");
      } else {
        console.error("❌ Failed to mark all notifications as read on server");
      }
    } catch (error) {
      console.error("❌ Error marking all notifications as read:", error);
    }
  };

  // Add method to refresh notifications after activities
  refreshNotifications = () => {
    console.log("🔄 Refreshing notifications...");
    this.fetchNotifications();
  };

  addNotification = (notification) => {
    const newNotification = {
      id: Date.now(),
      read: false,
      time: new Date().toISOString(),
      ...notification,
    };

    this.setState((prevState) => ({
      notifications: Array.isArray(prevState.notifications)
        ? [newNotification, ...prevState.notifications.slice(0, 9)] // Keep only 10 most recent
        : [newNotification],
    }));

    // Refresh from server after a short delay
    setTimeout(() => {
      this.refreshNotifications();
    }, 1000);
  };

  formatTime = (timeString) => {
    try {
      const time = new Date(timeString);
      const now = new Date();
      const diffInMinutes = Math.floor((now - time) / (1000 * 60));

      if (diffInMinutes < 1) return "Just now";
      if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

      const diffInHours = Math.floor(diffInMinutes / 60);
      if (diffInHours < 24) return `${diffInHours}h ago`;

      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays < 7) return `${diffInDays}d ago`;

      return time.toLocaleDateString();
    } catch (error) {
      return timeString;
    }
  };

  // Notification Slide Panel Component
  renderNotificationPanel() {
    const { showNotifications, notifications = [] } = this.state; // ✅ Default to empty array

    if (!showNotifications) return null;

    // ✅ Safe filtering
    const unreadCount = Array.isArray(notifications)
      ? notifications.filter((n) => !n.read).length
      : 0;

    return (
      <div className="notification-slide-panel">
        <div className="notification-panel-header">
          <h3>Notifications</h3>
          <div className="notification-panel-actions">
            {unreadCount > 0 && (
              <button
                className="btn-mark-all-read"
                onClick={this.markAllNotificationsAsRead}
              >
                Mark all read
              </button>
            )}
            <button
              className="btn-close-panel"
              onClick={() => this.setState({ showNotifications: false })}
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>

        <div className="notification-panel-content">
          {/* ✅ Safe length check */}
          {!Array.isArray(notifications) || notifications.length === 0 ? (
            <div className="empty-notifications">
              <i className="fas fa-bell-slash"></i>
              <p>No notifications yet</p>
            </div>
          ) : (
            <div className="notification-list">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`notification-item ${
                    notification.read ? "read" : "unread"
                  }`}
                  onClick={() => this.markNotificationAsRead(notification.id)}
                >
                  <div className="notification-icon">
                    <i
                      className={`fas fa-${
                        notification.type === "booking"
                          ? "calendar-check"
                          : notification.type === "order"
                          ? "shopping-cart"
                          : notification.type === "portfolio"
                          ? "briefcase"
                          : "bell"
                      }`}
                    ></i>
                  </div>
                  <div className="userdashboard-notification-content">
                    <div className="notification-message">
                      {notification.message}
                    </div>
                    <div className="notification-time">
                      {this.formatTime(notification.time)}
                    </div>
                  </div>
                  {!notification.read && <div className="unread-dot"></div>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  renderUserProfile() {
    const { userData, stats, notifications } = this.state;
    const profileImageUrl = this.getFullImageUrl(userData.profileImage);
    const badgeColors = {
      bronze: "#CD7F32",
      silver: "#C0C0C0",
      gold: "#FFD700",
      platinum: "#E5E4E2",
    };

    return (
      <div className="dashboard-main-content">
        <div className="dashboard-header">
          <h1>My Dashboard</h1>
          <div className="dashboard-actions">
            <button
              className="notification-btn"
              onClick={this.toggleNotifications}
            >
              <i className="fas fa-bell"></i>
              {Array.isArray(notifications) &&
                notifications.filter((n) => !n.read).length > 0 && (
                  <span className="notification-badge">
                    {notifications.filter((n) => !n.read).length}
                  </span>
                )}
            </button>
            <div className="user-quick-info">
              <div className="user-avatar-small">
                {profileImageUrl ? (
                  <img src={profileImageUrl} alt={userData.name} />
                ) : (
                  <div className="avatar-placeholder">
                    {this.generateInitials(userData.name)}
                  </div>
                )}
              </div>
              <div className="user-name">{userData.name}</div>
            </div>
          </div>
        </div>

        <div className="profile-overview">
          <div className="profile-card">
            <div className="profile-card-header">
              <div className="profile-image-container">
                {profileImageUrl ? (
                  <img
                    src={profileImageUrl}
                    alt={userData.name}
                    className="userdashboard-profile-image"
                  />
                ) : (
                  <div className="dashboard-profile-placeholder">
                    {this.generateInitials(userData.name)}
                  </div>
                )}
                <div
                  className="profile-badge"
                  style={{ backgroundColor: badgeColors[userData.badge] }}
                >
                  {userData.badge.charAt(0).toUpperCase() +
                    userData.badge.slice(1)}
                </div>
              </div>
              <div className="profile-details">
                <h2 className="profile-name">{userData.name}</h2>
                <p className="profile-profession">
                  {userData.profession || "Add your profession"}
                </p>
                <div className="profile-id">VOAT ID: {userData.voatId}</div>
                <div className="profile-stats">
                  <div className="stat-item">
                    <span className="main-stat-value">
                      {userData.voatPoints || 0}
                    </span>
                    <span className="stat-label">VOAT Points</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="profile-card-body">
              <div className="profile-info-section">
                <div className="info-item">
                  <div className="info-icon">
                    <i className="fas fa-envelope"></i>
                  </div>
                  <div className="info-content">
                    <span className="info-label">Email: </span>
                    <span className="info-value">{userData.email}</span>
                  </div>
                </div>
                {userData.phone && (
                  <div className="info-item">
                    <div className="info-icon">
                      <i className="fas fa-phone"></i>
                    </div>
                    <div className="info-content">
                      <span className="info-label">Phone: </span>
                      <span className="info-value">{userData.phone}</span>
                    </div>
                  </div>
                )}
                {userData.role && (
                  <div className="info-item">
                    <div className="info-icon">
                      <i className="fas fa-user-tag"></i>
                    </div>
                    <div className="info-content">
                      <span className="info-label">Role: </span>
                      <span className="info-value">{userData.role}</span>
                    </div>
                  </div>
                )}
              </div>
              <div className="profile-actions">
                <button className="btn btn-edit" onClick={this.toggleEditMode}>
                  <i className="fas fa-edit"></i> Edit Profile
                </button>
              </div>
            </div>
          </div>

          <div className="activity-summary">
            <div className="activity-card">
              <div className="activity-header">
                <h3>Account Stats</h3>
                <i className="fas fa-chart-line"></i>
              </div>
              <div className="activity-body">
                <div className="activity-stats">
                  {/* Client Stats */}
                  {!this.isFreelancer() && (
                    <>
                      <div className="activity-stat">
                        <div className="stat-icon money">
                          <i className="fa-solid fa-indian-rupee-sign"></i>
                        </div>
                        <div className="stat-details">
                          <div className="stat-value">
                            ₹{stats.totalSpent || 0}
                          </div>
                          <div className="stat-label">Total Spent</div>
                        </div>
                      </div>
                      <div className="activity-stat">
                        <div className="stat-icon orders">
                          <i className="fas fa-shopping-cart"></i>
                        </div>
                        <div className="stat-details">
                          <div className="stat-value">
                            {stats.myOrdersCount || 0}
                          </div>
                          <div className="stat-label">My Orders</div>
                        </div>
                      </div>
                      <div className="activity-stat">
                        <div className="stat-icon completed">
                          <i className="fas fa-calendar-check"></i>
                        </div>
                        <div className="stat-details">
                          <div className="stat-value">
                            {stats.totalBookings || 0}
                          </div>
                          <div className="stat-label">My Bookings</div>
                        </div>
                      </div>
                      <div className="activity-stat">
                        <div className="stat-icon saved">
                          <i className="fas fa-bookmark"></i>
                        </div>
                        <div className="stat-details">
                          <div className="stat-value">
                            {stats.savedItems || 0}
                          </div>
                          <div className="stat-label">Saved</div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Freelancer Stats */}
                  {this.isFreelancer() && (
                    <>
                      <div className="activity-stat">
                        <div className="stat-icon money">
                          <i className="fa-solid fa-indian-rupee-sign"></i>
                        </div>
                        <div className="stat-details">
                          <div className="stat-value">
                            ₹{stats.totalSpent || 0}
                          </div>
                          <div className="stat-label">Total Spent</div>
                        </div>
                      </div>
                      <div className="activity-stat">
                        <div className="stat-icon earned">
                          <i className="fas fa-chart-line"></i>
                        </div>
                        <div className="stat-details">
                          <div className="stat-value">
                            ₹{stats.totalEarned || 0}
                          </div>
                          <div className="stat-label">Total Earned</div>
                        </div>
                      </div>
                      <div className="activity-stat">
                        <div className="stat-icon orders">
                          <i className="fas fa-clipboard-list"></i>
                        </div>
                        <div className="stat-details">
                          <div className="stat-value">
                            {stats.activeOrders || 0}
                          </div>
                          <div className="stat-label">Active Orders</div>
                        </div>
                      </div>
                      <div className="activity-stat">
                        <div className="stat-icon orders">
                          <i className="fas fa-shopping-cart"></i>
                        </div>
                        <div className="stat-details">
                          <div className="stat-value">
                            {stats.myOrdersCount || 0}
                          </div>
                          <div className="stat-label">My Orders</div>
                        </div>
                      </div>
                      <div className="activity-stat">
                        <div className="stat-icon requests">
                          <i className="fas fa-inbox"></i>
                        </div>
                        <div className="stat-details">
                          <div className="stat-value">
                            {stats.bookingRequestsCount || 0}
                          </div>
                          <div className="stat-label">Booking Requests</div>
                        </div>
                      </div>
                      <div className="activity-stat">
                        <div className="stat-icon completed">
                          <i className="fas fa-calendar-check"></i>
                        </div>
                        <div className="stat-details">
                          <div className="stat-value">
                            {stats.totalBookings || 0}
                          </div>
                          <div className="stat-label">My Bookings</div>
                        </div>
                      </div>
                      <div className="activity-stat">
                        <div className="stat-icon projects">
                          <i className="fas fa-star"></i>
                        </div>
                        <div className="stat-details">
                          <div className="stat-value">
                            {stats.completedProjects || 0}
                          </div>
                          <div className="stat-label">Completed Projects</div>
                        </div>
                      </div>
                      <div className="activity-stat">
                        <div className="stat-icon saved">
                          <i className="fas fa-heart"></i>
                        </div>
                        <div className="stat-details">
                          <div className="stat-value">
                            {stats.savedItems || 0}
                          </div>
                          <div className="stat-label">Wishlist</div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="recent-activity-card">
              <div className="activity-header">
                <h3>Recent Activity</h3>
                <i className="fas fa-history"></i>
              </div>
              <div className="activity-body">
                <div className="activity-list">
                  {this.state.orders.slice(0, 3).map((order, index) => (
                    <div className="activity-item" key={index}>
                      <div className="activity-icon">
                        <i
                          className={`fas fa-${
                            order.status === "Completed"
                              ? "check-circle"
                              : order.status === "In Progress"
                              ? "spinner"
                              : "clock"
                          }`}
                        ></i>
                      </div>
                      <div className="activity-details">
                        <div className="activity-title">
                          {order.service}{" "}
                          <span
                            className={`status ${order.status
                              .toLowerCase()
                              .replace(" ", "-")}`}
                          >
                            {order.status}
                          </span>
                        </div>
                        <div className="activity-meta">
                          <span className="activity-date">{order.date}</span>
                          <span className="activity-price">
                            ₹{order.amount}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {this.state.orders.length === 0 && (
                    <div className="empty-activity">
                      <i className="fas fa-info-circle"></i>
                      <p>No recent activity found</p>
                    </div>
                  )}
                </div>
                {this.state.orders.length > 0 && (
                  <button
                    className="btn btn-view-all"
                    onClick={() => this.handleTabChange("orders")}
                  >
                    View All Orders
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  renderOrders() {
    const { orders = [] } = this.state; // Ensure default empty array
    const filteredOrders = this.getFilteredOrders();

    console.log("=== RENDER ORDERS DEBUG ===");
    console.log("Orders from state:", orders);
    console.log("Filtered orders:", filteredOrders);
    console.log("Orders length:", orders.length);
    console.log("Filtered orders length:", filteredOrders.length);

    return (
      <div className="dashboard-main-content">
        <div className="dashboard-header">
          <h1>My Orders</h1>
          <div className="dashboard-actions">
            <button
              className="refresh-btn"
              onClick={() => {
                console.log("Refreshing orders...");
                this.fetchOrders();
              }}
              title="Refresh Orders"
            >
              <i className="fas fa-sync-alt"></i> Refresh
            </button>
            <div className="search-container">
              <i className="fas fa-search search-icon"></i>
              <input
                type="text"
                placeholder="Search orders..."
                className="search-input"
                value={this.state.orderSearchQuery}
                onChange={this.handleOrderSearch}
              />
            </div>
            <select
              className="filter-dropdown"
              value={this.state.orderFilter}
              onChange={this.handleOrderFilter}
            >
              <option value="all">All Orders</option>
              <option value="completed">Completed</option>
              <option value="in-progress">In Progress</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>

        {/* Orders Summary Stats */}
        <div className="orders-summary-stats-compact">
          <div className="summary-stat-compact">
            <div className="stat-icon-compact pending">
              <i className="fas fa-clock"></i>
            </div>
            <div className="stat-number-compact">
              {
                filteredOrders.filter(
                  (order) => order.status.toLowerCase() === "pending"
                ).length
              }
            </div>
            <div className="stat-label-compact">Pending</div>
          </div>
          <div className="summary-stat-compact">
            <div className="stat-icon-compact progress">
              <i className="fas fa-spinner"></i>
            </div>
            <div className="stat-number-compact">
              {
                filteredOrders.filter(
                  (order) =>
                    order.status.toLowerCase().includes("progress") ||
                    order.status.toLowerCase() === "in progress"
                ).length
              }
            </div>
            <div className="stat-label-compact">In Progress</div>
          </div>
          <div className="summary-stat-compact">
            <div className="stat-icon-compact completed">
              <i className="fas fa-check-circle"></i>
            </div>
            <div className="stat-number-compact">
              {
                filteredOrders.filter(
                  (order) => order.status.toLowerCase() === "completed"
                ).length
              }
            </div>
            <div className="stat-label-compact">Completed</div>
          </div>
          <div className="summary-stat-compact">
            <div className="stat-icon-compact total">
              <i className="fas fa-indian-rupee-sign"></i>
            </div>
            <div className="stat-number-compact">
              ₹
              {filteredOrders
                .reduce((sum, order) => sum + (order.amount || 0), 0)
                .toLocaleString()}
            </div>
            <div className="stat-label-compact">Total Value</div>
          </div>
        </div>

        {/* FIXED: Check the actual array length instead of a wrong condition */}
        {orders.length === 0 ? (
          <div className="empty-state-modern">
            <div className="empty-illustration">
              <div className="empty-icon">
                <i className="fas fa-clipboard-list"></i>
              </div>
            </div>
            <div className="empty-content">
              <h3>No Orders Found</h3>
              <p>
                {this.state.orderSearchQuery || this.state.orderFilter !== "all"
                  ? "No orders match your search criteria."
                  : "You haven't placed any paid orders yet. Orders appear here after payment is completed."}
              </p>
              {!this.state.orderSearchQuery &&
                this.state.orderFilter === "all" && (
                  <Link to="/portfolio-list">
                    <button className="btn btn-primary">
                      <i className="fas fa-compass"></i>
                      Explore Services
                    </button>
                  </Link>
                )}
            </div>
          </div>
        ) : (
          <div className="compact-orders-grid">
            {filteredOrders.map((order, index) => (
              <div
                className="compact-order-card"
                key={order.orderId || order.id || index}
              >
                {/* Order Header */}
                <div className="compact-order-header">
                  <div className="order-id-compact">
                    <i className="fas fa-hashtag"></i>
                    <span>{order.id}</span>
                  </div>
                  <div
                    className={`compact-order-status ${order.status
                      .toLowerCase()
                      .replace(" ", "-")}`}
                  >
                    <div className="status-dot"></div>
                    <span>{order.status}</span>
                  </div>
                </div>

                {/* Service Info */}
                <div className="compact-order-content">
                  <div className="service-info-compact">
                    <h3 className="service-name-compact">{order.service}</h3>
                  </div>

                  {/* Provider Section */}
                  <div className="provider-compact">
                    <div className="provider-avatar-compact">
                      {order.providerImage ? (
                        <img
                          src={this.getFullImageUrl(order.providerImage)}
                          alt={order.provider}
                          onError={(e) => {
                            e.target.style.display = "none";
                            e.target.nextSibling.style.display = "flex";
                          }}
                        />
                      ) : null}
                      <div
                        className="avatar-placeholder-compact"
                        style={{
                          display: order.providerImage ? "none" : "flex",
                        }}
                      >
                        {order.provider?.charAt(0).toUpperCase() || "P"}
                      </div>
                    </div>
                    <div className="provider-details-compact">
                      <h4 className="provider-name-compact">
                        {order.provider}
                      </h4>
                      <p className="provider-role-compact">Service Provider</p>
                    </div>
                  </div>

                  {/* Order Meta */}
                  <div className="order-meta-compact">
                    <div className="meta-item-compact">
                      <i className="fas fa-calendar-alt"></i>
                      <span className="meta-label">Date:</span>
                      <span className="meta-value">{order.date}</span>
                    </div>
                    <div className="meta-item-compact price-meta">
                      <i className="fas fa-indian-rupee-sign"></i>
                      <span className="meta-label">Amount:</span>
                      <span className="meta-value price-value">
                        ₹{order.amount?.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Order Actions */}
                <div className="compact-order-actions">
                  <button
                    className="action-btn-compact primary"
                    onClick={() =>
                      (window.location.href = `/my-portfolio/${
                        order.providerId || "unknown"
                      }`)
                    }
                  >
                    <i className="fas fa-eye"></i>
                    <span>View Details</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  handleCancelOrder = async (bookingId) => {
    if (!bookingId) {
      this.showNotification(
        "Unable to cancel order: Invalid booking ID",
        "error"
      );
      return;
    }

    const confirmCancel = window.confirm(
      "Are you sure you want to cancel this order? This action cannot be undone."
    );

    if (!confirmCancel) return;

    try {
      const userData = JSON.parse(localStorage.getItem("user") || "{}");
      if (!userData || !userData.id) {
        this.showNotification("Please login to cancel orders", "error");
        return;
      }

      const response = await fetch(
        `${this.state.baseUrl}/api/booking/${bookingId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ userId: userData.id }),
        }
      );

      if (response.ok) {
        this.setState(
          (prevState) => ({
            orders: prevState.orders.filter(
              (order) => order.bookingId !== bookingId && order.id !== bookingId
            ),
          }),
          () => {
            this.updateStats();
          }
        );

        this.showNotification("Order cancelled successfully", "success");
        this.fetchOrders();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to cancel order");
      }
    } catch (error) {
      console.error("Error cancelling order:", error);
      this.showNotification(
        error.message || "Failed to cancel order. Please try again.",
        "error"
      );
    }
  };

  renderEditForm() {
    const { formData, previewImage } = this.state;

    return (
      <div className="dashboard-main-content">
        <div className="dashboard-header">
          <h1>Edit Profile</h1>
          <button className="btn btn-back" onClick={this.toggleEditMode}>
            <i className="fas fa-arrow-left"></i> Back to Profile
          </button>
        </div>

        <div className="edit-profile-container">
          <form onSubmit={this.handleSubmit} className="edit-profile-form">
            <div className="form-header">
              <div className="avatar-upload">
                <div className="avatar-preview">
                  {previewImage ? (
                    <img
                      src={previewImage}
                      alt="Profile Preview"
                      className="avatar-image"
                    />
                  ) : (
                    <div className="avatar-placeholder">
                      {formData.name
                        ? formData.name.charAt(0).toUpperCase()
                        : "U"}
                    </div>
                  )}
                </div>
                <div className="avatar-actions">
                  <label htmlFor="profile-image" className="btn btn-upload">
                    <i className="fas fa-camera"></i> Change Photo
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
            </div>

            <div className="form-body">
              <div className="user-form-group">
                <label htmlFor="name">Full Name</label>
                <div className="input-container">
                  <i className="fas fa-user input-icon"></i>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={this.handleInputChange}
                    placeholder="Enter your full name"
                    required
                  />
                </div>
              </div>

              <div className="user-form-group">
                <label htmlFor="email">Email Address</label>
                <div className="input-container">
                  <i className="fas fa-envelope input-icon"></i>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={this.handleInputChange}
                    placeholder="Enter your email"
                    required
                  />
                </div>
              </div>

              <div className="user-form-group">
                <label htmlFor="phone">Phone Number</label>
                <div className="input-container">
                  <i className="fas fa-phone input-icon"></i>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={this.handleInputChange}
                    placeholder="Enter your phone number"
                  />
                </div>
              </div>

              <div className="user-form-group">
                <label htmlFor="role">Role</label>
                <div className="select-container">
                  <i className="fas fa-user-tag input-icon"></i>
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
                    <option value="Client/Individual">Client/Individual</option>
                  </select>
                </div>
              </div>

              <div className="user-form-group">
                <label htmlFor="profession">Profession</label>
                <div className="input-container">
                  <i className="fas fa-briefcase input-icon"></i>
                  <input
                    type="text"
                    id="profession"
                    name="profession"
                    value={formData.profession}
                    onChange={this.handleInputChange}
                    placeholder="Enter your profession"
                  />
                </div>
              </div>
            </div>

            <div className="form-footer">
              <button
                type="button"
                className="btn btn-cancel"
                onClick={this.toggleEditMode}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-save">
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  renderPortfolioForm() {
    const { portfolioFormData, userData, workPreviews, uploadingWorks } =
      this.state;

    return (
      <div className="dashboard-main-content">
        <div className="dashboard-header">
          <h1>Submit Portfolio</h1>
          <button
            className="btn btn-back"
            onClick={() => this.setState({ showPortfolioForm: false })}
          >
            <i className="fas fa-arrow-left"></i> Back to Dashboard
          </button>
        </div>

        <div className="portfolio-form-container">
          <form
            onSubmit={this.handlePortfolioSubmit}
            className="portfolio-form"
            encType="multipart/form-data"
          >
            <div className="form-section">
              <h3 className="section-title">Personal Information</h3>
              <div className="current-profile-preview">
                <label>Current Profile Image</label>
                <div className="profile-preview-container">
                  {userData && userData.profileImage ? (
                    <img
                      src={this.getFullImageUrl(userData.profileImage)}
                      alt="Current Profile"
                      className="current-profile-image"
                    />
                  ) : (
                    <div className="current-profile-placeholder">
                      {this.generateInitials(userData?.name)}
                    </div>
                  )}
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="portfolio-name">Full Name</label>
                  <div className="input-container">
                    <input
                      type="text"
                      id="portfolio-name"
                      name="name"
                      value={portfolioFormData.name}
                      onChange={this.handlePortfolioInputChange}
                      placeholder="Enter your full name"
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="portfolio-email">Email Address</label>
                  <div className="input-container">
                    <input
                      type="email"
                      id="portfolio-email"
                      name="email"
                      value={portfolioFormData.email}
                      onChange={this.handlePortfolioInputChange}
                      placeholder="Enter your email"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="portfolio-profession">Profession</label>
                  <div className="input-container">
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
                </div>

                <div className="form-group">
                  <label htmlFor="portfolio-experience">
                    Work Experience (Years)
                  </label>
                  <div className="input-container">
                    <input
                      type="number"
                      id="portfolio-experience"
                      name="workExperience"
                      value={portfolioFormData.workExperience}
                      onChange={this.handlePortfolioInputChange}
                      min="0"
                      placeholder="Years of experience"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="form-section">
              <h3 className="section-title">Professional Information</h3>

              <div className="form-group">
                <label htmlFor="portfolio-headline">Headline</label>
                <div className="input-container">
                  <input
                    type="text"
                    id="portfolio-headline"
                    name="headline"
                    value={portfolioFormData.headline}
                    onChange={this.handlePortfolioInputChange}
                    placeholder="e.g. Expert Web Developer with 5+ years experience"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="portfolio-about">About Me</label>
                <div className="textarea-container">
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
              </div>

              <div className="form-group">
                <label htmlFor="portfolio-link">Portfolio Website</label>
                <div className="input-container">
                  <input
                    type="url"
                    id="portfolio-link"
                    name="portfolioLink"
                    value={portfolioFormData.portfolioLink}
                    onChange={this.handlePortfolioInputChange}
                    placeholder="https://your-portfolio-website.com"
                  />
                </div>
              </div>
            </div>

            <div className="form-section">
              <h3 className="section-title">Service Details</h3>
              <div className="form-group">
                <label htmlFor="service-name">Service Name</label>
                <div className="input-container">
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
              </div>

              <div className="form-group">
                <label htmlFor="service-description">Service Description</label>
                <div className="textarea-container">
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
              </div>

              <h4 className="subsection-title">Pricing Packages</h4>
              <div className="pricing-packages">
                {portfolioFormData.pricing.map((pricing, index) => (
                  <div
                    key={index}
                    className={`pricing-package ${pricing.level.toLowerCase()}`}
                  >
                    <div className="package-header">
                      <div className="package-level">{pricing.level}</div>
                    </div>
                    <div className="package-inputs">
                      <div className="form-group">
                        <label htmlFor={`price-${index}`}>Price (₹)</label>
                        <div className="input-container">
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
                      </div>
                      <div className="form-group">
                        <label htmlFor={`timeFrame-${index}`}>
                          Delivery Time
                        </label>
                        <div className="input-container">
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
                  </div>
                ))}
              </div>
            </div>

            {/* Work Upload Section */}
            <div className="form-section">
              <h3 className="section-title">Portfolio Works</h3>
              <p className="section-description">
                Upload images or videos showcasing your previous work (Optional)
              </p>

              <div className="work-upload-container">
                <div className="file-upload-area">
                  <input
                    type="file"
                    id="work-files"
                    name="workFiles"
                    multiple
                    accept="image/*,video/*"
                    onChange={this.handleWorkFileChange}
                    style={{ display: "none" }}
                  />
                  <label htmlFor="work-files" className="file-upload-label">
                    <div className="upload-icon">
                      <i className="fas fa-cloud-upload-alt"></i>
                    </div>
                    <div className="upload-text">
                      <h4>Upload Your Works</h4>
                      <p>Drag & drop files or click to browse</p>
                      <span className="file-types">
                        Supports: JPG, PNG, GIF, MP4, AVI, MOV
                      </span>
                    </div>
                  </label>
                </div>

                {workPreviews.length > 0 && (
                  <div className="work-previews-grid">
                    <h4>Selected Works ({workPreviews.length})</h4>
                    <div className="previews-container">
                      {workPreviews.map((preview) => (
                        <div key={preview.id} className="work-preview-item">
                          <div className="preview-content">
                            {preview.type === "video" ? (
                              <video
                                src={preview.url}
                                className="preview-media"
                                controls={false}
                                muted
                              />
                            ) : (
                              <img
                                src={preview.url}
                                alt={preview.name}
                                className="preview-media"
                              />
                            )}
                            <div className="preview-overlay">
                              <div className="file-info">
                                <span className="file-name">
                                  {preview.name}
                                </span>
                                <span className="file-size">
                                  {(preview.size / 1024 / 1024).toFixed(2)} MB
                                </span>
                              </div>
                              <button
                                type="button"
                                className="remove-preview-btn"
                                onClick={() =>
                                  this.removeWorkPreview(preview.id)
                                }
                              >
                                <i className="fas fa-times"></i>
                              </button>
                            </div>
                            <div className="media-type-indicator">
                              <i
                                className={`fas fa-${
                                  preview.type === "video" ? "video" : "image"
                                }`}
                              ></i>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {uploadingWorks && (
                  <div className="uploading-indicator">
                    <div className="loading-spinner"></div>
                    <span>Uploading works...</span>
                  </div>
                )}
              </div>
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="btn btn-cancel"
                onClick={() => this.setState({ showPortfolioForm: false })}
                disabled={uploadingWorks}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={uploadingWorks}
              >
                {uploadingWorks ? "Uploading..." : "Submit Portfolio"}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  clearPortfolioForm = () => {
    this.setState({
      portfolioFormData: {
        name: "",
        profession: "",
        headline: "",
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
      selectedWorkFiles: [],
      workPreviews: [],
      uploadingWorks: false,
    });
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
      submitData.append("phone", formData.phone);
      submitData.append("userId", userData.id);
      submitData.append("voatId", userData.voatId);
      submitData.append("voatPoints", userData.voatPoints);
      submitData.append("badge", userData.badge);

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

      // Force refresh user data from database to get the latest profile image
      const freshUserData = await this.refreshUserFromDatabase();

      setTimeout(() => {
        this.refreshNotifications();
      }, 1000);

      if (freshUserData) {
        this.setState({
          userData: freshUserData,
          isLoading: false,
          isEditing: false,
          previewImage: freshUserData.profileImage
            ? this.getFullImageUrl(freshUserData.profileImage)
            : null,
        });
      } else {
        // Fallback to response data
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
      }

      // Add notification for profile update
      this.addNotification({
        type: "system",
        message: "Your profile has been updated successfully!",
        time: new Date().toISOString(),
      });
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
      const { portfolioFormData, userData, selectedWorkFiles } = this.state;
      const baseUrl = this.state.baseUrl || "http://localhost:5000";

      const formData = new FormData();

      // Add existing form data fields
      formData.append("name", portfolioFormData.name || "");
      formData.append("profession", portfolioFormData.profession || "");
      formData.append("headline", portfolioFormData.headline || "");
      formData.append("email", portfolioFormData.email);
      formData.append("workExperience", portfolioFormData.workExperience || "");
      formData.append("portfolioLink", portfolioFormData.portfolioLink || "");
      formData.append("about", portfolioFormData.about || "");

      if (userData && userData.id) {
        formData.append("userId", userData.id);
      }

      // Add profile image handling
      if (userData.profileImage) {
        formData.append("profileImagePath", userData.profileImage);
        formData.append("hasProfileImage", "true");
      } else {
        const initials = this.generateInitials(userData.name);
        formData.append("profileInitials", initials);
        formData.append("userName", userData.name || "User");
        formData.append("hasProfileImage", "false");
      }

      formData.append("isNewSubmission", "true");

      // Add service data
      if (
        portfolioFormData.serviceName &&
        portfolioFormData.serviceDescription
      ) {
        const service = {
          name: portfolioFormData.serviceName,
          description: portfolioFormData.serviceDescription,
          pricing: portfolioFormData.pricing || [],
        };
        formData.append("service", JSON.stringify(service));
      }

      // ✅ FIXED: Add work files with proper field name
      if (selectedWorkFiles && selectedWorkFiles.length > 0) {
        selectedWorkFiles.forEach((file, index) => {
          formData.append(`workFiles`, file); // Use 'workFiles' to match backend expectation
        });
      }

      // Submit portfolio
      const response = await fetch(`${baseUrl}/api/portfolio`, {
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

      // Clear portfolio status timeout
      if (this.portfolioStatusTimeout) {
        clearTimeout(this.portfolioStatusTimeout);
      }

      // Update state
      this.setState({
        isLoading: false,
        showPortfolioForm: false,
        portfolioStatus: "pending",
        selectedWorkFiles: [],
        workPreviews: [],
      });

      // Set timeout to refresh status
      this.portfolioStatusTimeout = setTimeout(() => {
        this.fetchPortfolioStatus();
      }, 1000);

      // Add notification
      this.addNotification({
        type: "portfolio",
        message: "Your portfolio has been submitted for review!",
        time: new Date().toISOString(),
      });

      alert(
        "Portfolio submitted successfully! It will be reviewed by the admin."
      );
    } catch (error) {
      console.error("Portfolio submission error:", error);
      this.setState({
        isLoading: false,
        error: error.message,
        uploadingWorks: false,
      });
      alert(`Failed to submit portfolio: ${error.message}`);
    }
  };

  checkLocalSubmissions = async () => {
    try {
      if (!this.state.userData || !this.state.userData.id) {
        console.log("No user data available for local submissions check");
        return;
      }

      // First try to directly fetch the user's portfolio
      const portfolioResponse = await fetch(
        `${this.state.baseUrl}/api/portfolio/user/${this.state.userData.id}`
      );

      if (portfolioResponse.ok) {
        const portfolioData = await portfolioResponse.json();
        if (portfolioData.hasPortfolio && portfolioData.portfolio) {
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
          this.setState({ portfolioStatus: userSubmission.status });
        }
      }
    } catch (error) {
      console.error("Error in local submissions check:", error);
    }
  };

  refreshProfileImage = async () => {
    try {
      const userData = JSON.parse(localStorage.getItem("user"));
      if (!userData || !userData.id) return;

      console.log("Refreshing profile image from database...");

      const response = await fetch(
        `${this.state.baseUrl}/api/user/${userData.id}`
      );

      if (response.ok) {
        const result = await response.json();

        // Update only the profile image
        const updatedUserData = {
          ...userData,
          profileImage: result.user.profileImage || null,
        };

        localStorage.setItem("user", JSON.stringify(updatedUserData));

        this.setState({
          userData: updatedUserData,
          previewImage: result.user.profileImage
            ? this.getFullImageUrl(result.user.profileImage)
            : null,
        });

        console.log("Profile image refreshed:", result.user.profileImage);
      }
    } catch (error) {
      console.error("Error refreshing profile image:", error);
    }
  };

  renderBookingRequests() {
    const { bookings, bookingFilter } = this.state;

    // Filter bookings based on selected filter
    const filteredBookings = this.getFilteredBookings();

    return (
      <div className="dashboard-main-content">
        <div className="dashboard-header">
          <h1>Booking Requests</h1>
          <div className="dashboard-actions">
            <button
              className="refresh-btn"
              onClick={this.refreshOrderData}
              title="Refresh Booking Requests"
            >
              <i className="fas fa-sync-alt"></i> Refresh
            </button>
            <div className="search-container">
              <i className="fas fa-search search-icon"></i>
              <input
                type="text"
                placeholder="Search bookings..."
                className="search-input"
                value={this.state.bookingSearchQuery}
                onChange={this.handleBookingSearch}
              />
            </div>
            <select
              className="filter-dropdown"
              value={bookingFilter}
              onChange={(e) => this.setState({ bookingFilter: e.target.value })}
            >
              <option value="all">All Bookings</option>
              <option value="pending">Pending</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        {/* Compact Booking Stats */}
        <div className="booking-stats-compact">
          <div className="booking-stat-compact">
            <div className="stat-icon-compact pending">
              <i className="fas fa-clock"></i>
            </div>
            <div className="stat-number-compact">
              {bookings.filter((b) => b.status === "pending").length}
            </div>
            <div className="stat-label-compact">Pending</div>
          </div>

          <div className="booking-stat-compact">
            <div className="stat-icon-compact accepted">
              <i className="fas fa-check-circle"></i>
            </div>
            <div className="stat-number-compact">
              {bookings.filter((b) => b.status === "accepted").length}
            </div>
            <div className="stat-label-compact">Active</div>
          </div>

          <div className="booking-stat-compact">
            <div className="stat-icon-compact completed">
              <i className="fas fa-trophy"></i>
            </div>
            <div className="stat-number-compact">
              {bookings.filter((b) => b.status === "completed").length}
            </div>
            <div className="stat-label-compact">Completed</div>
          </div>

          <div className="booking-stat-compact">
            <div className="stat-icon-compact revenue">
              <i className="fas fa-indian-rupee-sign"></i>
            </div>
            <div className="stat-number-compact">
              ₹
              {bookings
                .reduce((sum, b) => sum + (b.servicePrice || 0), 0)
                .toLocaleString()}
            </div>
            <div className="stat-label-compact">Total Value</div>
          </div>
        </div>

        {filteredBookings.length === 0 ? (
          <div className="empty-state-modern">
            <div className="empty-illustration">
              <div className="empty-icon">
                <i className="fas fa-calendar-check"></i>
              </div>
            </div>
            <div className="empty-content">
              <h3>No Booking Requests Yet</h3>
              <p>
                {bookingFilter !== "all"
                  ? `No ${bookingFilter} bookings found.`
                  : "You haven't received any booking requests yet. Complete your portfolio to start receiving bookings!"}
              </p>
              {!this.state.portfolioStatus && bookingFilter === "all" && (
                <button
                  className="btn btn-primary"
                  onClick={() => this.setState({ showPortfolioForm: true })}
                >
                  <i className="fas fa-plus"></i>
                  Create Portfolio
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="modern-bookings-grid">
            {filteredBookings.map((booking, index) => (
              <div className="modern-booking-card" key={index}>
                {/* Booking Header */}
                <div className="modern-booking-header">
                  <div className="booking-id-compact">
                    #{booking.id || `BK-${String(index + 1).padStart(3, "0")}`}
                  </div>
                  <div className={`modern-booking-status ${booking.status}`}>
                    <div className="status-dot"></div>
                    <span>
                      {booking.status.charAt(0).toUpperCase() +
                        booking.status.slice(1)}
                    </span>
                  </div>
                </div>

                {/* Service Info */}
                <div className="modern-booking-content">
                  <div className="service-header-compact">
                    <h3 className="service-name-compact">
                      {booking.serviceName}
                    </h3>
                    <div className="service-type-compact">
                      <i className="fas fa-layer-group"></i>
                      <span>{booking.serviceLevel || "Standard"}</span>
                    </div>
                  </div>

                  {/* Client Section */}
                  <div className="client-section-compact">
                    <div className="client-avatar-compact">
                      {booking.clientProfileImage ? (
                        <img
                          src={
                            booking.clientProfileImage.startsWith("http")
                              ? booking.clientProfileImage
                              : `${this.state.baseUrl}${booking.clientProfileImage}`
                          }
                          alt={booking.clientName}
                          onError={(e) => {
                            e.target.style.display = "none";
                            e.target.nextSibling.style.display = "flex";
                          }}
                        />
                      ) : null}
                      <div
                        className="avatar-placeholder-compact"
                        style={{
                          display: booking.clientProfileImage ? "none" : "flex",
                        }}
                      >
                        {booking.clientName?.charAt(0).toUpperCase() || "C"}
                      </div>
                      <div className="client-status-dot"></div>
                    </div>
                    <div className="client-info-compact">
                      <h4 className="client-name-compact">
                        {booking.clientName}
                      </h4>
                      <p className="client-email-compact">
                        {booking.clientEmail}
                      </p>
                    </div>
                  </div>

                  {/* Booking Meta */}
                  <div className="booking-meta-compact">
                    <div className="meta-item-compact">
                      <i className="fas fa-calendar-plus"></i>
                      <span className="meta-label">Requested:</span>
                      <span className="meta-value">
                        {new Date(booking.requestDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="meta-item-compact price-meta">
                      <i className="fas fa-indian-rupee-sign"></i>
                      <span className="meta-label">Amount:</span>
                      <span className="meta-value price-value">
                        ₹{booking.servicePrice?.toLocaleString()}
                      </span>
                    </div>
                    {booking.responseDate && (
                      <div className="meta-item-compact">
                        <i
                          className={`fas fa-${
                            booking.status === "accepted"
                              ? "check"
                              : booking.status === "rejected"
                              ? "times"
                              : "clock"
                          }`}
                        ></i>
                        <span className="meta-label">Responded:</span>
                        <span className="meta-value">
                          {new Date(booking.responseDate).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Booking Actions */}
                <div className="modern-booking-actions">
                  {booking.status === "pending" && (
                    <>
                      <button
                        className="action-btn-compact accept"
                        onClick={() =>
                          this.handleBookingAction(booking._id, "accept")
                        }
                      >
                        <i className="fas fa-check"></i>
                        <span>Accept</span>
                      </button>
                      <button
                        className="action-btn-compact reject"
                        onClick={() =>
                          this.handleBookingAction(booking._id, "reject")
                        }
                      >
                        <i className="fas fa-times"></i>
                        <span>Decline</span>
                      </button>
                    </>
                  )}

                  {booking.status === "accepted" && (
                    <>
                      <button
                        className="action-btn-compact details"
                        onClick={() => this.openBookingDetails(booking)}
                      >
                        <i className="fas fa-eye"></i>
                        <span>View Details</span>
                      </button>
                      <button
                        className="action-btn-compact primary"
                        onClick={() => this.addToCartFromBooking(booking)}
                      >
                        <i className="fas fa-shopping-cart"></i>
                        <span>Add to Cart</span>
                      </button>
                      <button
                        className="action-btn-compact cancel"
                        onClick={() => this.handleCancelBooking(booking._id)}
                      >
                        <i className="fas fa-ban"></i>
                        <span>Cancel</span>
                      </button>
                    </>
                  )}

                  {booking.status === "rejected" && (
                    <button
                      className="action-btn-compact details secondary"
                      onClick={() => this.openBookingDetails(booking)}
                    >
                      <i className="fas fa-eye"></i>
                      <span>View Details</span>
                    </button>
                  )}

                  {booking.status === "completed" && (
                    <button
                      className="action-btn-compact details secondary"
                      onClick={() => this.openBookingDetails(booking)}
                    >
                      <i className="fas fa-eye"></i>
                      <span>View Details</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Booking Details Overlay */}
        {this.state.selectedBooking && (
          <div
            className="booking-details-overlay"
            onClick={this.closeBookingDetails}
          >
            <div
              className="booking-details-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2>Booking Details</h2>
                <button
                  className="close-btn"
                  onClick={this.closeBookingDetails}
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>

              <div className="modal-content">
                {/* Client Information */}
                <div className="detail-section">
                  <h3>Client Information</h3>
                  <div className="client-details-full">
                    <div className="client-avatar-full">
                      {this.state.selectedBooking.clientProfileImage ? (
                        <img
                          src={
                            this.state.selectedBooking.clientProfileImage.startsWith(
                              "http"
                            )
                              ? this.state.selectedBooking.clientProfileImage
                              : `${this.state.baseUrl}${this.state.selectedBooking.clientProfileImage}`
                          }
                          alt={this.state.selectedBooking.clientName}
                        />
                      ) : (
                        <div className="avatar-placeholder-full">
                          {this.state.selectedBooking.clientName
                            ?.charAt(0)
                            .toUpperCase() || "C"}
                        </div>
                      )}
                    </div>
                    <div className="client-info-full">
                      <h4>{this.state.selectedBooking.clientName}</h4>
                      <p>{this.state.selectedBooking.clientEmail}</p>
                      <div className="client-badge">
                        <i className="fas fa-user"></i>
                        <span>Client</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Service Information */}
                <div className="detail-section">
                  <h3>Service Information</h3>
                  <div className="service-details-full">
                    <div className="detail-row">
                      <span className="detail-label">Service Name:</span>
                      <span className="detail-value">
                        {this.state.selectedBooking.serviceName}
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Service Type:</span>
                      <span className="detail-value service-type">
                        {this.state.selectedBooking.serviceLevel || "Standard"}
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Amount:</span>
                      <span className="detail-value price">
                        ₹
                        {this.state.selectedBooking.servicePrice?.toLocaleString()}
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Status:</span>
                      <span
                        className={`detail-value status-badge ${this.state.selectedBooking.status}`}
                      >
                        {this.state.selectedBooking.status
                          .charAt(0)
                          .toUpperCase() +
                          this.state.selectedBooking.status.slice(1)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Booking Timeline */}
                <div className="detail-section">
                  <h3>Booking Timeline</h3>
                  <div className="timeline">
                    <div className="timeline-item">
                      <div className="timeline-dot active"></div>
                      <div className="timeline-content">
                        <h5>Booking Requested</h5>
                        <p>
                          {new Date(
                            this.state.selectedBooking.requestDate
                          ).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    {this.state.selectedBooking.responseDate && (
                      <div className="timeline-item">
                        <div
                          className={`timeline-dot ${
                            this.state.selectedBooking.status !== "pending"
                              ? "active"
                              : ""
                          }`}
                        ></div>
                        <div className="timeline-content">
                          <h5>
                            {this.state.selectedBooking.status === "accepted"
                              ? "Booking Accepted"
                              : this.state.selectedBooking.status === "rejected"
                              ? "Booking Declined"
                              : "Response"}
                          </h5>
                          <p>
                            {new Date(
                              this.state.selectedBooking.responseDate
                            ).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  openBookingDetails = (booking) => {
    this.setState({
      selectedBooking: booking,
      showBookingDetails: true,
    });
  };

  closeBookingDetails = () => {
    this.setState({
      selectedBooking: null,
      showBookingDetails: false,
    });
  };

  handleCancelBooking = async (bookingId) => {
    const confirmCancel = window.confirm(
      "Are you sure you want to cancel this booking? The client will be notified."
    );

    if (!confirmCancel) return;

    try {
      const userData = JSON.parse(localStorage.getItem("user") || "{}");
      if (!userData || !userData.id) {
        this.addNotification({
          type: "system",
          message: "Please login to cancel bookings",
          time: new Date().toISOString(),
        });
        return;
      }

      const response = await fetch(
        `${this.state.baseUrl}/api/booking/${bookingId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ userId: userData.id }),
        }
      );

      if (response.ok) {
        // Remove the booking from local state
        this.setState((prevState) => ({
          bookings: prevState.bookings.filter(
            (booking) => booking._id !== bookingId
          ),
        }));

        this.addNotification({
          type: "system",
          message: "Booking cancelled successfully. Client has been notified.",
          time: new Date().toISOString(),
        });

        // Refresh bookings from server
        this.fetchBookings();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to cancel booking");
      }
    } catch (error) {
      console.error("Error cancelling booking:", error);
      this.addNotification({
        type: "system",
        message: error.message || "Failed to cancel booking. Please try again.",
        time: new Date().toISOString(),
      });
    }
  };

  handleBookingAction = async (bookingId, action) => {
    try {
      const response = await fetch(
        `${this.state.baseUrl}/api/booking/${bookingId}/action`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ action }),
        }
      );

      if (response.ok) {
        this.fetchBookings();
        this.showNotification(
          `Booking request ${action}ed successfully!`,
          "success"
        );
        setTimeout(() => {
          this.refreshNotifications();
        }, 1000);
      } else {
        throw new Error(`Failed to ${action} booking`);
      }
    } catch (error) {
      console.error(`Error ${action}ing booking:`, error);
      this.showNotification(`Failed to ${action} booking request`, "error");
    }
  };

  renderWishlist() {
    const { wishlist, wishlistLoading, wishlistSearchQuery } = this.state;
    const filteredWishlist = this.getFilteredWishlist();

    return (
      <div className="dashboard-main-content">
        <div className="dashboard-header">
          <h1>My Wishlist</h1>
          <div className="dashboard-actions">
            <div className="search-container">
              <i className="fas fa-search search-icon"></i>
              <input
                type="text"
                placeholder="Search saved services..."
                className="search-input"
                value={wishlistSearchQuery || ""}
                onChange={this.handleWishlistSearch}
              />
            </div>
            <div className="wishlist-stats-badge">
              <i className="fas fa-heart"></i>
              <span>{filteredWishlist.length} Services</span>
            </div>
          </div>
        </div>

        {wishlistLoading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading your wishlist...</p>
          </div>
        ) : filteredWishlist.length === 0 ? (
          <div className="empty-state-modern">
            <div className="empty-illustration">
              <div className="empty-icon">
                <i className="fas fa-heart-broken"></i>
              </div>
              <div className="empty-graphic">
                <div className="floating-elements">
                  <div className="float-item">💝</div>
                  <div className="float-item">⭐</div>
                  <div className="float-item">🎯</div>
                </div>
              </div>
            </div>
            <div className="empty-content">
              <h3>
                {wishlistSearchQuery && wishlistSearchQuery.trim()
                  ? "No Services Found"
                  : "Your Wishlist is Empty"}
              </h3>
              <p>
                {wishlistSearchQuery && wishlistSearchQuery.trim()
                  ? `No services match "${wishlistSearchQuery}". Try a different search term.`
                  : "Save your favorite services to your wishlist for easy access later! Discover amazing services and keep track of what you love."}
              </p>
              {(!wishlistSearchQuery || !wishlistSearchQuery.trim()) && (
                <Link to="/portfolio-list">
                  <button className="btn btn-primary">
                    <i className="fas fa-compass"></i>
                    Discover Services
                  </button>
                </Link>
              )}
              {wishlistSearchQuery && wishlistSearchQuery.trim() && (
                <button
                  className="btn btn-secondary"
                  onClick={() => this.setState({ wishlistSearchQuery: "" })}
                >
                  <i className="fas fa-times"></i>
                  Clear Search
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="wishlist-container">
            {/* Show search results count when searching */}
            {wishlistSearchQuery && wishlistSearchQuery.trim() && (
              <div className="search-results-info">
                <p>
                  Found {filteredWishlist.length} service
                  {filteredWishlist.length !== 1 ? "s" : ""}
                  matching "{wishlistSearchQuery}"
                  <button
                    className="clear-search-btn"
                    onClick={() => this.setState({ wishlistSearchQuery: "" })}
                  >
                    <i className="fas fa-times"></i>
                    Clear
                  </button>
                </p>
              </div>
            )}

            <div className="wishlist-grid-compact">
              {filteredWishlist.map((item, index) => (
                <div className="wishlist-card-compact" key={index}>
                  <div className="card-header-compact">
                    <button
                      className="btn-remove-heart"
                      onClick={() => this.removeFromWishlist(item.id)}
                      title="Remove from wishlist"
                    >
                      <i className="fas fa-heart"></i>
                    </button>
                    <div className="service-type-badge">
                      <i className="fas fa-star"></i>
                      <span>{item.serviceLevel || "Standard"}</span>
                    </div>
                  </div>

                  <div className="provider-section-compact">
                    <div className="provider-avatar-small">
                      {item.profileImage ? (
                        <img
                          src={
                            item.profileImage.startsWith("http")
                              ? item.profileImage
                              : `${this.state.baseUrl}${item.profileImage}`
                          }
                          alt={`${item.provider}'s profile`}
                          onError={(e) => {
                            e.target.style.display = "none";
                            e.target.nextSibling.style.display = "flex";
                          }}
                        />
                      ) : null}
                      <div
                        className="avatar-placeholder-small"
                        style={{
                          display: item.profileImage ? "none" : "flex",
                        }}
                      >
                        {item.provider?.charAt(0).toUpperCase() || "P"}
                      </div>
                      <div className="online-indicator"></div>
                    </div>
                    <div className="provider-info-compact">
                      <h4 className="provider-name-compact">{item.provider}</h4>
                      <span className="provider-badge-compact">Verified</span>
                    </div>
                  </div>

                  <div className="service-info-compact">
                    <h3 className="service-title-compact">{item.service}</h3>

                    <div className="service-meta-compact">
                      <div className="meta-item-compact">
                        <i className="fas fa-clock"></i>
                        <span>{item.deliveryTime || "7-14 days"}</span>
                      </div>
                      {/* <div className="meta-item-compact">
                        <i className="fas fa-shield-check"></i>
                        <span>Guaranteed</span>
                      </div> */}
                    </div>

                    <div className="price-section-compact">
                      <div className="price-display-compact">
                        <span className="price-label-compact">Starting at</span>
                        <div className="price-amount-compact">
                          <span className="currency-compact">₹</span>
                          <span className="amount-compact">
                            {item.price?.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="card-actions-compact">
                    <button
                      className="btn-cart-compact"
                      onClick={() => this.addToCart(item)}
                      disabled={item.inCart}
                    >
                      <i
                        className={`fas fa-${
                          item.inCart ? "check" : "shopping-cart"
                        }`}
                      ></i>
                      <span>{item.inCart ? "In Cart" : "Add to Cart"}</span>
                    </button>

                    <button
                      className="btn-book-compact"
                      onClick={() => this.bookService(item)}
                    >
                      <i className="fas fa-bolt"></i>
                      <span>Book Now</span>
                    </button>
                  </div>

                  <div className="card-footer-compact">
                    <div className="added-info">
                      <i className="fas fa-plus-circle"></i>
                      <span>Added {this.formatAddedDate(item.addedDate)}</span>
                    </div>
                    <button
                      className="btn-remove-text-compact"
                      onClick={() => this.removeFromWishlist(item.id)}
                    >
                      <i className="fas fa-trash-alt"></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Helper methods to add to the component

  addToCart = async (item) => {
    try {
      const userData = JSON.parse(localStorage.getItem("user") || "{}");
      if (!userData || !userData.id) {
        this.showNotification("Please login to add items to cart", "error");
        return;
      }

      // Check if already in cart
      if (item.inCart) {
        this.showNotification("This service is already in your cart", "info");
        return;
      }

      const cartData = {
        userId: userData.id,
        freelancerId: item.freelancerId || item.serviceId,
        freelancerName: item.provider,
        freelancerProfileImage: item.profileImage,
        serviceName: item.service,
        serviceLevel: item.serviceLevel || "Standard",
        basePrice: item.price,
        paymentType: "final",
      };

      const response = await fetch(`${this.state.baseUrl}/api/cart/add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(cartData),
      });

      if (response.ok) {
        this.setState((prevState) => ({
          wishlist: prevState.wishlist.map((wishlistItem) =>
            wishlistItem.id === item.id
              ? { ...wishlistItem, inCart: true }
              : wishlistItem
          ),
        }));

        setTimeout(() => {
          this.refreshNotifications();
        }, 1000);

        this.showNotification("Service added to cart successfully!", "success");
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to add to cart");
      }
    } catch (error) {
      console.error("Error adding to cart:", error);
      this.showNotification(
        error.message || "Failed to add service to cart",
        "error"
      );
    }
  };

  bookService = async (item) => {
    try {
      const userData = JSON.parse(localStorage.getItem("user") || "{}");
      if (!userData || !userData.id) {
        this.showNotification("Please login to book services", "error");
        return;
      }

      const bookingData = {
        clientId: userData.id,
        clientName: userData.name,
        clientEmail: userData.email,
        clientProfileImage: userData.profileImage,
        freelancerId: item.freelancerId || item.serviceId,
        freelancerName: item.provider,
        freelancerEmail:
          item.providerEmail ||
          `${item.provider.toLowerCase().replace(" ", "")}@example.com`,
        serviceName: item.service,
        servicePrice: item.price,
      };

      const response = await fetch(`${this.state.baseUrl}/api/create-booking`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(bookingData),
      });

      if (response.ok) {
        this.showNotification(
          `Booking request sent for ${item.service}!`,
          "success"
        );
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create booking");
      }
    } catch (error) {
      console.error("Error creating booking:", error);
      this.showNotification(error.message || "Failed to book service", "error");
    }
  };

  formatAddedDate = (dateString) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffTime = Math.abs(now - date);
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 0) return "today";
      if (diffDays === 1) return "yesterday";
      if (diffDays < 7) return `${diffDays} days ago`;
      if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
      return `${Math.floor(diffDays / 30)} months ago`;
    } catch (error) {
      return "recently";
    }
  };

  removeFromWishlist = async (itemId) => {
    try {
      const userData = JSON.parse(localStorage.getItem("user") || "{}");
      if (!userData || !userData.id) return;

      // Optimistic update
      const originalWishlist = [...this.state.wishlist];
      const updatedWishlist = this.state.wishlist.filter(
        (item) => item.id !== itemId
      );

      this.setState(
        {
          wishlist: updatedWishlist,
        },
        () => {
          this.updateStats();
        }
      );

      localStorage.setItem(
        `wishlist_${userData.id}`,
        JSON.stringify(updatedWishlist)
      );

      try {
        const deleteResponse = await fetch(
          `${this.state.baseUrl}/api/wishlist/remove/${itemId}`,
          {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ userId: userData.id }),
          }
        );

        if (!deleteResponse.ok) {
          throw new Error("Delete endpoint failed");
        }

        console.log("Item successfully removed from wishlist in database");

        // ✅ Refresh notifications after adding to cart
        setTimeout(() => {
          this.refreshNotifications();
        }, 500);

        this.addNotification({
          type: "system",
          message: "Service removed from your wishlist",
          time: new Date().toISOString(),
        });
      } catch (deleteError) {
        console.error("Error with DELETE endpoint:", deleteError);

        // Rollback on server error
        this.setState(
          {
            wishlist: originalWishlist,
          },
          () => {
            this.updateStats();
          }
        );

        localStorage.setItem(
          `wishlist_${userData.id}`,
          JSON.stringify(originalWishlist)
        );

        this.addNotification({
          type: "system",
          message: "Failed to remove item from wishlist. Please try again.",
          time: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error("Failed to remove from wishlist:", error);
      this.addNotification({
        type: "system",
        message: "An error occurred. Please try again.",
        time: new Date().toISOString(),
      });
    }
  };

  // Method to refresh cart status for wishlist items
  refreshCartStatus = async () => {
    try {
      const userData = JSON.parse(localStorage.getItem("user") || "{}");
      if (!userData || !userData.id) return;

      const cartResponse = await fetch(
        `${this.state.baseUrl}/api/cart/${userData.id}`
      );

      if (cartResponse.ok) {
        const cartData = await cartResponse.json();
        const cartItems = cartData.data || [];

        this.setState((prevState) => ({
          wishlist: prevState.wishlist.map((item) => ({
            ...item,
            inCart: cartItems.some(
              (cartItem) =>
                cartItem.serviceName === item.service &&
                cartItem.freelancerName === item.provider
            ),
          })),
          cartItems: cartItems,
        }));
      }
    } catch (error) {
      console.error("Error refreshing cart status:", error);
    }
  };

  renderError() {
    return (
      <div className="error-container">
        <div className="error-icon">
          <i className="fas fa-exclamation-circle"></i>
        </div>
        <h2 className="error-title">Session Alert</h2>
        <p className="error-message">{this.state.error}</p>
        <button className="btn btn-primary" onClick={this.handleLogout}>
          Login Again
        </button>
      </div>
    );
  }

  renderSidebarButton() {
    if (this.isAdmin()) {
      return (
        <Link to="/admin-dashboard" className="sidebar-admin-button">
          <i className="fas fa-cog"></i>
          <span>Admin Dashboard</span>
        </Link>
      );
    } else {
      if (this.state.portfolioStatus === "approved") {
        return (
          <button
            className="sidebar-button approved"
            onClick={() =>
              (window.location.href = `/my-portfolio/${this.state.userData.id}`)
            }
          >
            <i className="fas fa-user-tie"></i>
            <span>View My Portfolio</span>
          </button>
        );
      } else if (this.state.portfolioStatus === "pending") {
        return (
          <div className="sidebar-status pending">
            <i className="fas fa-hourglass-half"></i>
            <span>Portfolio Under Review</span>
          </div>
        );
      } else if (this.state.portfolioStatus === "rejected") {
        return (
          <button
            className="sidebar-button rejected"
            onClick={() => this.setState({ showPortfolioForm: true })}
          >
            <i className="fas fa-redo"></i>
            <span>Resubmit Portfolio</span>
          </button>
        );
      } else {
        return (
          <button
            className="sidebar-button new"
            onClick={() => this.setState({ showPortfolioForm: true })}
          >
            <i className="fas fa-plus-circle"></i>
            <span>Submit Portfolio</span>
          </button>
        );
      }
    }
  }

  renderMobileToggleButton() {
    return (
      <button
        className="mobile-sidebar-toggle"
        onClick={this.toggleMobileSidebar}
        aria-label="Toggle navigation"
      >
        <i
          className={`fas fa-${
            this.state.showMobileSidebar ? "times" : "bars"
          }`}
        ></i>
      </button>
    );
  }

  renderWorkUploadSection() {
    const { workPreviews, uploadingWorks } = this.state;

    return (
      <div className="form-section">
        <h3 className="section-title">Portfolio Works</h3>
        <p className="section-description">
          Upload images or videos showcasing your previous work (Optional)
        </p>

        <div className="work-upload-container">
          <div className="file-upload-area">
            <input
              type="file"
              id="work-files"
              multiple
              accept="image/*,video/*"
              onChange={this.handleWorkFileChange}
              style={{ display: "none" }}
            />
            <label htmlFor="work-files" className="file-upload-label">
              <div className="upload-icon">
                <i className="fas fa-cloud-upload-alt"></i>
              </div>
              <div className="upload-text">
                <h4>Upload Your Works</h4>
                <p>Drag & drop files or click to browse</p>
                <span className="file-types">
                  Supports: JPG, PNG, GIF, MP4, AVI, MOV
                </span>
              </div>
            </label>
          </div>

          {workPreviews.length > 0 && (
            <div className="work-previews-grid">
              <h4>Selected Works ({workPreviews.length})</h4>
              <div className="previews-container">
                {workPreviews.map((preview) => (
                  <div key={preview.id} className="work-preview-item">
                    <div className="preview-content">
                      {preview.type === "video" ? (
                        <video
                          src={preview.url}
                          className="preview-media"
                          controls={false}
                          muted
                        />
                      ) : (
                        <img
                          src={preview.url}
                          alt={preview.name}
                          className="preview-media"
                        />
                      )}
                      <div className="preview-overlay">
                        <div className="file-info">
                          <span className="file-name">{preview.name}</span>
                          <span className="file-size">
                            {(preview.size / 1024 / 1024).toFixed(2)} MB
                          </span>
                        </div>
                        <button
                          type="button"
                          className="remove-preview-btn"
                          onClick={() => this.removeWorkPreview(preview.id)}
                        >
                          <i className="fas fa-times"></i>
                        </button>
                      </div>
                      <div className="media-type-indicator">
                        <i
                          className={`fas fa-${
                            preview.type === "video" ? "video" : "image"
                          }`}
                        ></i>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {uploadingWorks && (
            <div className="uploading-indicator">
              <div className="loading-spinner"></div>
              <span>Uploading works...</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  showNotification = (message, type = "info") => {
    // Create notification element
    const notification = document.createElement("div");
    notification.className = `toast-notification toast-${type}`;
    notification.innerHTML = `
    <div class="toast-content">
      <i class="fas fa-${
        type === "success"
          ? "check-circle"
          : type === "error"
          ? "exclamation-circle"
          : "info-circle"
      }"></i>
      <span>${message}</span>
    </div>
    <button class="toast-close" onclick="this.parentElement.remove()">
      <i class="fas fa-times"></i>
    </button>
  `;

    // Add to page
    document.body.appendChild(notification);

    // Auto remove after 5 seconds
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 5000);
  };

  addToCartFromMyBooking = async (booking) => {
    try {
      const userData = JSON.parse(localStorage.getItem("user") || "{}");
      if (!userData || !userData.id) {
        this.showNotification("Please login to add items to cart", "error");
        return;
      }

      const cartData = {
        userId: userData.id,
        freelancerId: booking.freelancerId,
        freelancerName: booking.freelancerName,
        freelancerProfileImage: booking.freelancerProfileImage,
        serviceName: booking.serviceName,
        serviceLevel: "Standard",
        basePrice: booking.servicePrice,
        paymentType: "final",
      };

      const response = await fetch(`${this.state.baseUrl}/api/cart/add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(cartData),
      });

      if (response.ok) {
        this.showNotification("Service added to cart successfully!", "success");
        setTimeout(() => {
          this.refreshNotifications();
        }, 1000);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to add to cart");
      }
    } catch (error) {
      console.error("Error adding to cart:", error);
      this.showNotification(
        error.message || "Failed to add service to cart",
        "error"
      );
    }
  };

  handleCancelMyBooking = async (bookingId) => {
    if (!bookingId) {
      this.showNotification(
        "Unable to cancel booking: Invalid booking ID",
        "error"
      );
      return;
    }

    const confirmCancel = window.confirm(
      "Are you sure you want to cancel this booking request? This action cannot be undone."
    );

    if (!confirmCancel) return;

    try {
      const userData = JSON.parse(localStorage.getItem("user") || "{}");
      if (!userData || !userData.id) {
        this.showNotification("Please login to cancel bookings", "error");
        return;
      }

      const response = await fetch(
        `${this.state.baseUrl}/api/booking/${bookingId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ userId: userData.id }),
        }
      );

      if (response.ok) {
        this.setState(
          (prevState) => ({
            myBookings: prevState.myBookings.filter(
              (booking) => booking._id !== bookingId
            ),
          }),
          () => {
            this.updateStats();
          }
        );

        this.showNotification("Booking cancelled successfully", "success");

        // Refresh the bookings list
        this.fetchMyBookings();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to cancel booking");
      }
    } catch (error) {
      console.error("Error cancelling booking:", error);
      this.showNotification(
        error.message || "Failed to cancel booking. Please try again.",
        "error"
      );
    }
  };

  // Add these new methods to handle My Bookings functionality

  fetchMyBookings = async () => {
    try {
      if (!this.state.userData || !this.state.userData.id) {
        console.log("No user data available for fetching my bookings");
        this.setState({ myBookings: [] }, () => {
          this.updateStats();
        });
        return;
      }

      console.log("=== FETCHING MY BOOKINGS FROM FRONTEND ===");
      console.log("User ID:", this.state.userData.id);
      console.log("Base URL:", this.state.baseUrl);
      console.log(
        "Full URL:",
        `${this.state.baseUrl}/api/my-bookings/${this.state.userData.id}`
      );

      const response = await fetch(
        `${this.state.baseUrl}/api/my-bookings/${this.state.userData.id}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      console.log("Response status:", response.status);

      if (response.ok) {
        const myBookings = await response.json();
        console.log("✅ Successfully fetched my bookings:", myBookings);

        // Ensure it's an array
        const bookingsArray = Array.isArray(myBookings) ? myBookings : [];

        this.setState({ myBookings: bookingsArray }, () => {
          console.log("✅ My bookings set in state:", this.state.myBookings);
          this.updateStats();
        });
      } else {
        const errorText = await response.text();
        console.error(
          "❌ Failed to fetch my bookings:",
          response.status,
          errorText
        );
        this.setState({ myBookings: [] }, () => {
          this.updateStats();
        });
      }
    } catch (error) {
      console.error("❌ Error fetching my bookings:", error);
      this.setState({ myBookings: [] }, () => {
        this.updateStats();
      });
    }
  };

  fetchMyOrders = async () => {
    try {
      if (!this.state.userData || !this.state.userData.id) {
        return;
      }

      console.log("Fetching my orders for user:", this.state.userData.id);

      // Use the updated orders endpoint
      const response = await fetch(
        `${this.state.baseUrl}/api/orders/${this.state.userData.id}`
      );

      if (response.ok) {
        const myOrders = await response.json();
        console.log("Fetched my orders:", myOrders);

        // Set the orders in state
        this.setState({ orders: myOrders }, () => {
          this.updateStats();
        });
      } else {
        console.log("No orders found or failed to fetch my orders");
        this.setState({ orders: [] }, () => {
          this.updateStats();
        });
      }
    } catch (error) {
      console.error("Failed to fetch my orders:", error);
      this.setState({ orders: [] });
    }
  };

  // NEW: Fetch orders received by freelancer (Order Received)
  fetchReceivedOrders = async () => {
    try {
      // Only fetch if user is a freelancer
      if (
        !this.isFreelancer() ||
        !this.state.userData ||
        !this.state.userData.id
      ) {
        return;
      }

      console.log(
        "Fetching received orders for freelancer:",
        this.state.userData.id
      );

      const response = await fetch(
        `${this.state.baseUrl}/api/bookings/${this.state.userData.id}`
      );

      if (response.ok) {
        const receivedOrders = await response.json();
        console.log("Fetched received orders:", receivedOrders);

        this.setState({ receivedOrders }, () => {
          this.updateStats();
        });
      } else {
        console.log("No received orders found");
        this.setState({ receivedOrders: [] }, () => {
          this.updateStats();
        });
      }
    } catch (error) {
      console.error("Failed to fetch received orders:", error);
      this.setState({ receivedOrders: [] });
    }
  };

  renderMyOrders() {
    const { myOrders } = this.state;

    return (
      <div className="dashboard-main-content">
        <div className="dashboard-header">
          <h1>My Orders</h1>
          <div className="dashboard-actions">
            <div className="search-container">
              <i className="fas fa-search search-icon"></i>
              <input
                type="text"
                placeholder="Search orders..."
                className="search-input"
                value={this.state.orderSearchQuery}
                onChange={this.handleOrderSearch}
              />
            </div>
            <select
              className="filter-dropdown"
              value={this.state.orderFilter}
              onChange={this.handleOrderFilter}
            >
              <option value="all">All Orders</option>
              <option value="pending">Pending</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Orders Summary Stats */}
        <div className="orders-summary-stats-compact">
          <div className="summary-stat-compact">
            <div className="stat-icon-compact pending">
              <i className="fas fa-clock"></i>
            </div>
            <div className="stat-number-compact">
              {
                myOrders.filter(
                  (order) => order.status.toLowerCase() === "pending"
                ).length
              }
            </div>
            <div className="stat-label-compact">Pending</div>
          </div>
          <div className="summary-stat-compact">
            <div className="stat-icon-compact progress">
              <i className="fas fa-spinner"></i>
            </div>
            <div className="stat-number-compact">
              {
                myOrders.filter((order) =>
                  order.status.toLowerCase().includes("progress")
                ).length
              }
            </div>
            <div className="stat-label-compact">In Progress</div>
          </div>
          <div className="summary-stat-compact">
            <div className="stat-icon-compact completed">
              <i className="fas fa-check-circle"></i>
            </div>
            <div className="stat-number-compact">
              {
                myOrders.filter(
                  (order) => order.status.toLowerCase() === "completed"
                ).length
              }
            </div>
            <div className="stat-label-compact">Completed</div>
          </div>
          <div className="summary-stat-compact">
            <div className="stat-icon-compact total">
              <i className="fas fa-indian-rupee-sign"></i>
            </div>
            <div className="stat-number-compact">
              ₹
              {myOrders
                .reduce((sum, order) => sum + (order.amount || 0), 0)
                .toLocaleString()}
            </div>
            <div className="stat-label-compact">Total Value</div>
          </div>
        </div>

        {myOrders.length === 0 ? (
          <div className="empty-state-modern">
            <div className="empty-illustration">
              <div className="empty-icon">
                <i className="fas fa-shopping-cart"></i>
              </div>
            </div>
            <div className="empty-content">
              <h3>No Orders Found</h3>
              <p>
                You haven't placed any paid orders yet. Orders appear here after
                payment is completed.
              </p>
              <Link to="/portfolio-list">
                <button className="btn btn-primary">
                  <i className="fas fa-compass"></i>
                  Explore Services
                </button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="compact-orders-grid">
            {myOrders.map((order, index) => (
              <div className="compact-order-card" key={order.id || index}>
                {/* Rest of your existing order card rendering code */}
                {/* ... */}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  getFilteredReceivedOrders = () => {
    const { receivedOrders = [], orderSearchQuery, orderFilter } = this.state;

    let filtered = receivedOrders;

    // Apply status filter
    if (orderFilter && orderFilter !== "all") {
      filtered = filtered.filter((order) => {
        const normalizedStatus = order.status?.toLowerCase();
        const filterStatus = orderFilter.toLowerCase();
        return normalizedStatus === filterStatus;
      });
    }

    // Apply search filter
    if (orderSearchQuery && orderSearchQuery.trim()) {
      const query = orderSearchQuery.toLowerCase();
      filtered = filtered.filter(
        (order) =>
          order.serviceName?.toLowerCase().includes(query) ||
          order.clientName?.toLowerCase().includes(query) ||
          order.clientEmail?.toLowerCase().includes(query) ||
          (order.id && order.id.toString().toLowerCase().includes(query))
      );
    }

    return filtered;
  };

  renderReceivedOrders() {
    const { receivedOrders = [] } = this.state;

    console.log("=== RENDERING RECEIVED ORDERS ===");
    console.log("receivedOrders from state:", receivedOrders);
    console.log("receivedOrders length:", receivedOrders.length);

    return (
      <div className="dashboard-main-content">
        <div className="dashboard-header">
          <h1>Orders Received</h1>
          <p className="section-description">
            Paid orders received from clients ({receivedOrders.length} orders)
          </p>
          <div className="dashboard-actions">
            <button
              className="refresh-btn"
              onClick={() => {
                console.log("Manual refresh clicked");
                this.fetchFreelancerOrders();
              }}
              title="Refresh Orders"
            >
              <i className="fas fa-sync-alt"></i> Refresh
            </button>
            <div className="search-container">
              <i className="fas fa-search search-icon"></i>
              <input
                type="text"
                placeholder="Search orders..."
                className="search-input"
                value={this.state.orderSearchQuery || ""}
                onChange={(e) =>
                  this.setState({ orderSearchQuery: e.target.value })
                }
              />
            </div>
            <select
              className="filter-dropdown"
              value={this.state.orderFilter || "all"}
              onChange={(e) => this.setState({ orderFilter: e.target.value })}
            >
              <option value="all">All Orders</option>
              <option value="pending">Pending</option>
              <option value="accepted">Accepted</option>
              <option value="completed">Completed</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        {receivedOrders.length === 0 ? (
          <div className="empty-state-modern">
            <div className="empty-illustration">
              <div className="empty-icon">
                <i className="fas fa-inbox"></i>
              </div>
            </div>
            <div className="empty-content">
              <h3>No Orders Received</h3>
              <p>
                You haven't received any paid orders yet. Orders will appear
                here when clients complete payment for your services.
              </p>
              <button
                className="btn btn-secondary"
                onClick={() => this.fetchFreelancerOrders()}
              >
                Retry Loading Orders
              </button>
            </div>
          </div>
        ) : (
          <div className="compact-orders-grid">
            {this.getFilteredReceivedOrders().map((order, index) => {
              // Debug log for each order
              console.log(`Order ${index + 1}:`, {
                id: order.id,
                status: order.status,
                statusType: typeof order.status,
              });

              return (
                <div className="compact-order-card" key={order._id || index}>
                  <div className="compact-order-header">
                    <div className="order-id-compact">
                      <i className="fas fa-hashtag"></i>
                      <span>{order.id || `RCV-${index + 1}`}</span>
                    </div>
                    <div
                      className={`compact-order-status ${(
                        order.status || "pending"
                      )
                        .toLowerCase()
                        .replace(" ", "-")}`}
                    >
                      <div className="status-dot"></div>
                      <span>
                        {(order.status || "Pending").charAt(0).toUpperCase() +
                          (order.status || "pending").slice(1)}
                      </span>
                    </div>
                  </div>

                  <div className="compact-order-content">
                    <div className="service-info-compact">
                      <h3 className="service-name-compact">
                        {order.serviceName || "Unknown Service"}
                      </h3>
                    </div>

                    <div className="provider-compact">
                      <div className="provider-avatar-compact">
                        {order.clientProfileImage ? (
                          <img
                            src={this.getFullImageUrl(order.clientProfileImage)}
                            alt={order.clientName}
                            onError={(e) => {
                              e.target.style.display = "none";
                              e.target.nextSibling.style.display = "flex";
                            }}
                          />
                        ) : null}
                        <div
                          className="avatar-placeholder-compact"
                          style={{
                            display: order.clientProfileImage ? "none" : "flex",
                          }}
                        >
                          {(order.clientName || "C").charAt(0).toUpperCase()}
                        </div>
                      </div>
                      <div className="provider-details-compact">
                        <h4 className="provider-name-compact">
                          {order.clientName || "Unknown Client"}
                        </h4>
                        <p className="provider-role-compact">
                          {order.clientEmail || "No email provided"}
                        </p>
                      </div>
                    </div>

                    <div className="order-meta-compact">
                      <div className="meta-item-compact">
                        <i className="fas fa-cog"></i>
                        <span className="meta-label">Service:</span>
                        <span className="meta-value">{order.serviceName}</span>
                      </div>
                      <div className="meta-item-compact">
                        <i className="fas fa-clock"></i>
                        <span className="meta-label">Timeline:</span>
                        <span className="meta-value">
                          {order.serviceLevel || "Standard"} Package
                        </span>
                      </div>
                      <div className="meta-item-compact price-meta">
                        <i className="fas fa-indian-rupee-sign"></i>
                        <span className="meta-label">Cost:</span>
                        <span className="meta-value price-value">
                          ₹{(order.servicePrice || 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="meta-item-compact">
                        <i className="fas fa-calendar-alt"></i>
                        <span className="meta-label">Received:</span>
                        <span className="meta-value">
                          {order.requestDate
                            ? new Date(order.requestDate).toLocaleDateString(
                                "en-IN",
                                {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                }
                              )
                            : "Unknown"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* ORDER ACTIONS - Two States Only */}
                  <div className="compact-order-actions">
                    {(() => {
                      console.log(
                        `Rendering buttons for order ${order.id}, status: "${order.status}", _id: "${order._id}"`
                      );

                      const status = (order.status || "pending").toLowerCase();
                      const orderId = order._id || order.orderId; // Use the MongoDB _id for API calls

                      // Debug logging
                      console.log("Order object:", order);
                      console.log("Using orderId:", orderId);
                      console.log("Order._id:", order._id);
                      console.log("Order.orderId:", order.orderId);

                      if (status === "pending") {
                        return (
                          <>
                            <button
                              className="action-btn-compact accept"
                              onClick={() => this.handleAcceptOrder(orderId)}
                              disabled={!orderId}
                            >
                              <i className="fas fa-check"></i>
                              <span>Accept</span>
                            </button>
                            <button
                              className="action-btn-compact reject"
                              onClick={() => this.handleRejectOrder(orderId)}
                              disabled={!orderId}
                            >
                              <i className="fas fa-times"></i>
                              <span>Reject</span>
                            </button>
                          </>
                        );
                      } else if (status === "accepted") {
                        return (
                          <>
                            <button
                              className="action-btn-compact details"
                              onClick={() => this.openOrderDetails(order)}
                            >
                              <i className="fas fa-eye"></i>
                              <span>View Details</span>
                            </button>
                            <button
                              className="action-btn-compact complete"
                              onClick={() => this.handleMarkComplete(orderId)}
                              disabled={!orderId}
                            >
                              <i className="fas fa-check-circle"></i>
                              <span>Mark Complete</span>
                            </button>
                          </>
                        );
                      } else if (status === "completed") {
                        return (
                          <div className="order-completed-badge">
                            <i className="fas fa-check-circle"></i>
                            <span>Order Completed</span>
                          </div>
                        );
                      } else if (status === "rejected") {
                        return (
                          <div className="order-rejected-badge">
                            <i className="fas fa-times-circle"></i>
                            <span>Order Rejected</span>
                          </div>
                        );
                      } else {
                        // Fallback for any other status
                        return (
                          <div
                            style={{
                              padding: "10px",
                              color: "#666",
                              fontSize: "12px",
                            }}
                          >
                            Status: {status}
                            <br />
                            Order ID: {orderId ? "Present" : "Missing"}
                          </div>
                        );
                      }
                    })()}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  renderMyBookings() {
    const { myBookings = [], bookingSearchQuery, bookingFilter } = this.state;

    console.log("=== RENDERING MY BOOKINGS ===");
    console.log("myBookings from state:", myBookings);
    console.log("myBookings length:", myBookings.length);
    console.log(
      "myBookings type:",
      Array.isArray(myBookings) ? "array" : typeof myBookings
    );

    // Filter my bookings based on search and filter
    const filteredBookings = myBookings.filter((booking) => {
      // Apply status filter
      if (bookingFilter !== "all") {
        const normalizedStatus = booking.status?.toLowerCase();
        const filterStatus = bookingFilter.toLowerCase();
        if (normalizedStatus !== filterStatus) {
          return false;
        }
      }

      // Apply search filter
      if (bookingSearchQuery && bookingSearchQuery.trim()) {
        const query = bookingSearchQuery.toLowerCase();
        return (
          booking.serviceName?.toLowerCase().includes(query) ||
          booking.freelancerName?.toLowerCase().includes(query) ||
          booking.freelancerEmail?.toLowerCase().includes(query)
        );
      }

      return true;
    });

    console.log("Filtered bookings:", filteredBookings);

    return (
      <div className="dashboard-main-content">
        <div className="dashboard-header">
          <h1>My Bookings</h1>
          <p className="section-description">
            Services you have booked with freelancers
          </p>
          <div className="dashboard-actions">
            <div className="search-container">
              <i className="fas fa-search search-icon"></i>
              <input
                type="text"
                placeholder="Search my bookings..."
                className="search-input"
                value={bookingSearchQuery || ""}
                onChange={(e) =>
                  this.setState({ bookingSearchQuery: e.target.value })
                }
              />
            </div>
            <select
              className="filter-dropdown"
              value={bookingFilter}
              onChange={(e) => this.setState({ bookingFilter: e.target.value })}
            >
              <option value="all">All Bookings</option>
              <option value="pending">Pending</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        {/* My Bookings Summary Stats */}
        <div className="bookings-summary-stats-compact">
          <div className="summary-stat-compact">
            <div className="stat-icon-compact pending">
              <i className="fas fa-clock"></i>
            </div>
            <div className="stat-number-compact">
              {
                filteredBookings.filter(
                  (booking) => booking.status === "pending"
                ).length
              }
            </div>
            <div className="stat-label-compact">Pending</div>
          </div>
          <div className="summary-stat-compact">
            <div className="stat-icon-compact accepted">
              <i className="fas fa-check-circle"></i>
            </div>
            <div className="stat-number-compact">
              {
                filteredBookings.filter(
                  (booking) => booking.status === "accepted"
                ).length
              }
            </div>
            <div className="stat-label-compact">Accepted</div>
          </div>
          <div className="summary-stat-compact">
            <div className="stat-icon-compact rejected">
              <i className="fas fa-times-circle"></i>
            </div>
            <div className="stat-number-compact">
              {
                filteredBookings.filter(
                  (booking) => booking.status === "rejected"
                ).length
              }
            </div>
            <div className="stat-label-compact">Rejected</div>
          </div>
          <div className="summary-stat-compact">
            <div className="stat-icon-compact total">
              <i className="fas fa-indian-rupee-sign"></i>
            </div>
            <div className="stat-number-compact">
              ₹
              {filteredBookings
                .reduce((sum, booking) => sum + (booking.servicePrice || 0), 0)
                .toLocaleString()}
            </div>
            <div className="stat-label-compact">Total Value</div>
          </div>
        </div>

        {filteredBookings.length === 0 ? (
          <div className="empty-state-modern">
            <div className="empty-illustration">
              <div className="empty-icon">
                <i className="fas fa-calendar-check"></i>
              </div>
            </div>
            <div className="empty-content">
              <h3>No Bookings Found</h3>
              <p>
                {bookingSearchQuery || bookingFilter !== "all"
                  ? "No bookings match your search criteria."
                  : "You haven't made any booking requests yet. Explore services to make your first booking!"}
              </p>
              {!bookingSearchQuery && bookingFilter === "all" && (
                <Link to="/portfolio-list">
                  <button className="btn btn-primary">
                    <i className="fas fa-compass"></i>
                    Explore Services
                  </button>
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="my-bookings-grid">
            {filteredBookings.map((booking, index) => (
              <div className="my-booking-card" key={booking._id || index}>
                {/* Booking Header */}
                <div className="my-booking-header">
                  <div className="booking-id-compact">
                    <i className="fas fa-hashtag"></i>
                    <span>MB-{String(index + 1).padStart(3, "0")}</span>
                  </div>
                  <div className={`my-booking-status ${booking.status}`}>
                    <div className="status-dot"></div>
                    <span>
                      {booking.status.charAt(0).toUpperCase() +
                        booking.status.slice(1)}
                    </span>
                  </div>
                </div>

                {/* Service Info */}
                <div className="my-booking-content">
                  <div className="service-header-compact">
                    <h3 className="service-name-compact">
                      {booking.serviceName}
                    </h3>
                    <div className="service-type-compact">
                      <i className="fas fa-cog"></i>
                      <span>Service Request</span>
                    </div>
                  </div>

                  {/* Freelancer Section - This shows the freelancer you booked */}
                  <div className="freelancer-section-compact">
                    <div className="freelancer-avatar-compact">
                      {booking.freelancerProfileImage ? (
                        <img
                          src={
                            booking.freelancerProfileImage.startsWith("http")
                              ? booking.freelancerProfileImage
                              : `${this.state.baseUrl}${booking.freelancerProfileImage}`
                          }
                          alt={booking.freelancerName}
                          onError={(e) => {
                            e.target.style.display = "none";
                            e.target.nextSibling.style.display = "flex";
                          }}
                        />
                      ) : null}
                      <div
                        className="avatar-placeholder-compact"
                        style={{
                          display: booking.freelancerProfileImage
                            ? "none"
                            : "flex",
                        }}
                      >
                        {booking.freelancerName?.charAt(0).toUpperCase() || "F"}
                      </div>
                      <div className="freelancer-status-dot"></div>
                    </div>
                    <div className="freelancer-info-compact">
                      <h4 className="freelancer-name-compact">
                        {booking.freelancerName}
                      </h4>
                      <p className="freelancer-email-compact">
                        {booking.freelancerEmail}
                      </p>
                      <div className="freelancer-role-badge">
                        <i className="fas fa-user-tie"></i>
                        <span>Freelancer</span>
                      </div>
                    </div>
                  </div>

                  {/* Booking Meta Information */}
                  <div className="booking-meta-compact">
                    <div className="meta-item-compact">
                      <i className="fas fa-calendar-plus"></i>
                      <span className="meta-label">Requested:</span>
                      <span className="meta-value">
                        {new Date(booking.requestDate).toLocaleDateString(
                          "en-IN",
                          {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          }
                        )}
                      </span>
                    </div>
                    <div className="meta-item-compact price-meta">
                      <i className="fas fa-indian-rupee-sign"></i>
                      <span className="meta-label">Amount:</span>
                      <span className="meta-value price-value">
                        ₹{booking.servicePrice?.toLocaleString()}
                      </span>
                    </div>
                    {booking.responseDate && (
                      <div className="meta-item-compact">
                        <i
                          className={`fas fa-${
                            booking.status === "accepted"
                              ? "check"
                              : booking.status === "rejected"
                              ? "times"
                              : "clock"
                          }`}
                        ></i>
                        <span className="meta-label">Responded:</span>
                        <span className="meta-value">
                          {new Date(booking.responseDate).toLocaleDateString(
                            "en-IN",
                            {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            }
                          )}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Notes Section (if any) */}
                  {booking.notes && (
                    <div className="booking-notes">
                      <div className="notes-header">
                        <i className="fas fa-sticky-note"></i>
                        <span>Notes:</span>
                      </div>
                      <p className="notes-content">{booking.notes}</p>
                    </div>
                  )}
                </div>

                {/* Booking Actions */}
                <div className="my-booking-actions">
                  <button
                    className="action-btn-compact details"
                    onClick={() =>
                      (window.location.href = `/my-portfolio/${booking.freelancerId}`)
                    }
                  >
                    <i className="fas fa-eye"></i>
                    <span>View Portfolio</span>
                  </button>

                  {booking.status === "accepted" && (
                    <button
                      className="action-btn-compact cart"
                      onClick={() => this.addToCartFromMyBooking(booking)}
                    >
                      <i className="fas fa-shopping-cart"></i>
                      <span>Add to Cart</span>
                    </button>
                  )}

                  {booking.status === "pending" && (
                    <button
                      className="action-btn-compact cancel"
                      onClick={() => this.handleCancelMyBooking(booking._id)}
                    >
                      <i className="fas fa-times"></i>
                      <span>Cancel Request</span>
                    </button>
                  )}

                  {booking.status === "accepted" && (
                    <button
                      className="action-btn-compact message"
                      onClick={() => {
                        // You can implement messaging functionality here
                        alert(
                          `Contact ${booking.freelancerName} at ${booking.freelancerEmail}`
                        );
                      }}
                    >
                      <i className="fas fa-envelope"></i>
                      <span>Contact</span>
                    </button>
                  )}

                  {booking.status === "rejected" && (
                    <div className="rejection-info">
                      <i className="fas fa-info-circle"></i>
                      <span>Request was declined</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  openOrderDetails = (order) => {
    console.log("Opening order details for:", order);
    this.setState({
      selectedOrder: order,
      showOrderDetails: true,
    });
  };

  closeOrderDetails = () => {
    this.setState({
      selectedOrder: null,
      showOrderDetails: false,
    });
  };

  isAuthorizedToUpdateOrder = (order) => {
    const userData = JSON.parse(localStorage.getItem("user") || "{}");
    if (!userData || !userData.id) return false;

    // Check if current user is the freelancer for this order
    return (
      order.freelancerId === userData.id ||
      (order.freelancerId && order.freelancerId._id === userData.id)
    );
  };

  // Method to get order status badge class
  getOrderStatusBadgeClass = (status) => {
    const statusLower = status?.toLowerCase() || "";

    switch (statusLower) {
      case "pending":
        return "status-pending";
      case "accepted":
        return "status-accepted";
      case "in-progress":
        return "status-in-progress";
      case "completed":
        return "status-completed";
      case "rejected":
        return "status-rejected";
      case "cancelled":
        return "status-cancelled";
      default:
        return "status-default";
    }
  };

  // Method to get user-friendly status text
  getOrderStatusText = (status) => {
    const statusLower = status?.toLowerCase() || "";

    switch (statusLower) {
      case "pending":
        return "Pending";
      case "accepted":
        return "Accepted";
      case "in-progress":
        return "In Progress";
      case "completed":
        return "Completed";
      case "rejected":
        return "Rejected";
      case "cancelled":
        return "Cancelled";
      default:
        return status || "Unknown";
    }
  };

  // Enhanced error handling with better user feedback
  showOrderError = (error, action = "update order") => {
    console.error(`Error during ${action}:`, error);

    let message = `Failed to ${action}. `;

    if (error.message) {
      if (error.message.includes("not authorized")) {
        message += "You don't have permission to perform this action.";
      } else if (error.message.includes("not found")) {
        message += "The order was not found. It may have been deleted.";
      } else if (error.message.includes("already")) {
        message += "This order has already been processed.";
      } else {
        message += error.message;
      }
    } else {
      message += "Please try again or contact support if the problem persists.";
    }

    this.showNotification(message, "error");
  };

  // Method to handle order status changes with optimistic updates
  updateOrderStatusOptimistic = async (orderId, newStatus, action) => {
    // Find the order in current state
    const orderIndex = this.state.receivedOrders.findIndex(
      (order) => order._id === orderId
    );

    if (orderIndex === -1) {
      this.showOrderError(new Error("Order not found"), action);
      return;
    }

    const originalOrder = { ...this.state.receivedOrders[orderIndex] };

    // Optimistic update - update UI immediately
    this.setState((prevState) => ({
      receivedOrders: prevState.receivedOrders.map((order) =>
        order._id === orderId ? { ...order, status: newStatus } : order
      ),
    }));

    try {
      const userData = JSON.parse(localStorage.getItem("user") || "{}");

      const response = await fetch(
        `${this.state.baseUrl}/api/orders/${orderId}/status`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: newStatus,
            freelancerId: userData.id,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      const result = await response.json();

      // Success - show notification and refresh data
      this.showNotification(
        result.message || `Order ${action} successfully!`,
        "success"
      );

      // Refresh data from server to ensure consistency
      setTimeout(() => {
        this.fetchFreelancerOrders();
        this.refreshNotifications();
      }, 500);
    } catch (error) {
      // Revert optimistic update on error
      this.setState((prevState) => ({
        receivedOrders: prevState.receivedOrders.map((order) =>
          order._id === orderId ? originalOrder : order
        ),
      }));

      this.showOrderError(error, action);
    }
  };

  handleAcceptOrder = async (orderId) => {
    try {
      console.log("Accepting order:", orderId);

      // Optimistic UI update
      this.setState((prevState) => ({
        receivedOrders: prevState.receivedOrders.map((order) =>
          order._id === orderId ? { ...order, status: "accepted" } : order
        ),
      }));

      const userData = JSON.parse(localStorage.getItem("user") || "{}");

      const response = await fetch(
        `${this.state.baseUrl}/api/orders/${orderId}/status`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "accepted",
            freelancerId: userData.id,
          }),
        }
      );

      if (response.ok) {
        const result = await response.json();
        console.log("Order accepted successfully:", result);

        this.showNotification("Order accepted successfully!", "success");

        // Refresh notifications
        setTimeout(() => {
          this.refreshNotifications();
        }, 1000);

        // Refresh data to ensure consistency
        setTimeout(() => {
          this.fetchFreelancerOrders();
        }, 500);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to accept order");
      }
    } catch (error) {
      console.error("Error accepting order:", error);

      // Revert optimistic update on error
      this.fetchFreelancerOrders();

      this.showNotification(error.message || "Failed to accept order", "error");
    }
  };

  handleRejectOrder = async (orderId) => {
    try {
      console.log("=== REJECTING ORDER ===");
      console.log("Order ID:", orderId);
      console.log("Order ID type:", typeof orderId);

      // Validate orderId before making the request
      if (!orderId) {
        throw new Error("Order ID is required");
      }

      // Optimistic UI update
      this.setState((prevState) => ({
        receivedOrders: prevState.receivedOrders.map((order) =>
          order._id === orderId ? { ...order, status: "rejected" } : order
        ),
      }));

      const userData = JSON.parse(localStorage.getItem("user") || "{}");

      if (!userData.id) {
        throw new Error("User ID not found. Please login again.");
      }

      console.log("Making request to reject order...");

      const requestBody = {
        status: "rejected",
        freelancerId: userData.id,
      };

      console.log("Request body:", requestBody);

      const response = await fetch(
        `${this.state.baseUrl}/api/orders/${orderId}/status`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(requestBody),
        }
      );

      console.log("Response status:", response.status);
      console.log("Response ok:", response.ok);

      if (response.ok) {
        const result = await response.json();
        console.log("✅ Order rejected successfully:", result);

        this.showNotification("Order rejected successfully", "success");

        // Refresh notifications
        setTimeout(() => {
          this.refreshNotifications();
        }, 1000);

        // Refresh data to ensure consistency
        setTimeout(() => {
          this.fetchFreelancerOrders();
        }, 500);
      } else {
        // Log the full error response
        const errorText = await response.text();
        console.error("❌ Server error response:", errorText);

        let errorMessage = "Failed to reject order";
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          errorMessage = errorText || errorMessage;
        }

        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error("❌ Error rejecting order:", error);

      // Revert optimistic update on error
      this.fetchFreelancerOrders();

      this.showNotification(
        error.message || "Failed to reject order. Please try again.",
        "error"
      );
    }
  };

  handleMarkComplete = async (orderId) => {
    try {
      console.log("Marking order complete:", orderId);

      // Optimistic UI update
      this.setState((prevState) => ({
        receivedOrders: prevState.receivedOrders.map((order) =>
          order._id === orderId ? { ...order, status: "completed" } : order
        ),
      }));

      const userData = JSON.parse(localStorage.getItem("user") || "{}");

      const response = await fetch(
        `${this.state.baseUrl}/api/orders/${orderId}/status`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "completed",
            freelancerId: userData.id,
          }),
        }
      );

      if (response.ok) {
        const result = await response.json();
        console.log("Order marked complete successfully:", result);

        this.showNotification("Order marked as completed!", "success");

        // Refresh notifications
        setTimeout(() => {
          this.refreshNotifications();
        }, 1000);

        // Refresh data to ensure consistency
        setTimeout(() => {
          this.fetchFreelancerOrders();
        }, 500);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to mark order complete");
      }
    } catch (error) {
      console.error("Error marking order complete:", error);

      // Revert optimistic update on error
      this.fetchFreelancerOrders();

      this.showNotification(
        error.message || "Failed to mark order complete",
        "error"
      );
    }
  };

  updateOrderStatus = async (orderId, newStatus) => {
    try {
      const response = await fetch(
        `${this.state.baseUrl}/api/orders/${orderId}/status`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      if (response.ok) {
        // Refresh the orders after status update
        this.fetchFreelancerOrders();
        this.showNotification(
          `Order status updated to ${newStatus}`,
          "success"
        );
      } else {
        throw new Error("Failed to update order status");
      }
    } catch (error) {
      console.error("Error updating order status:", error);
      this.showNotification("Failed to update order status", "error");
    }
  };

  viewOrderDetails = (order) => {
    // Implementation for viewing order details
    console.log("Viewing order details:", order);
  };

  refreshOrderData = () => {
    console.log("=== AUTO REFRESHING ORDER DATA ===");
    console.log("Current user:", this.state.userData?.id);
    console.log("Is freelancer:", this.isFreelancer());

    // Only refresh if user is on order-related tabs
    const orderTabs = ["my-orders", "orders-received", "order-received"];
    if (orderTabs.includes(this.state.activeTab)) {
      this.fetchOrders(); // Fetch orders as CLIENT

      if (this.isFreelancer()) {
        this.fetchFreelancerOrders(); // Fetch orders received as FREELANCER
      }

      setTimeout(() => {
        this.updateStats();
      }, 1000);
    }
  };

  forceRefreshOrders = () => {
    console.log("Force refreshing orders...");
    this.setState({ receivedOrders: [] }, () => {
      setTimeout(() => {
        this.fetchFreelancerOrders();
      }, 100);
    });
  };

  refreshAfterPayment = () => {
    console.log("=== REFRESHING DATA AFTER PAYMENT ===");

    // Refresh all order-related data
    this.fetchOrders(); // My Orders (as client)
    this.fetchMyBookings(); // My Bookings
    this.fetchNotifications();

    if (this.isFreelancer()) {
      this.fetchBookingRequests(); // Booking Requests (as freelancer)
      this.fetchFreelancerOrders(); // Orders Received (as freelancer)
    }

    // Update stats after data refresh
    setTimeout(() => {
      this.updateStats();
    }, 2000);

    console.log("Data refresh completed after payment");
  };

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
      case "my-bookings":
        return this.renderMyBookings();
      case "my-orders":
        return this.renderOrders();
      case "booking-requests": // Only freelancers can access this
        return this.renderBookingRequests();
      case "order-received": // Only freelancers can access this
        return this.renderReceivedOrders();
      case "wishlist":
        return this.renderWishlist();
      default:
        return this.renderUserProfile();
    }
  }

  render() {
    const {
      isLoading,
      error,
      errorType,
      activeTab,
      showMobileSidebar,
      receivedOrders,
      showNotifications,
    } = this.state;

    console.log("=== RENDER CALLED ===");
    console.log("Active tab:", activeTab);
    console.log("Received orders length:", receivedOrders?.length);

    if (isLoading) {
      return (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading your dashboard...</p>
        </div>
      );
    }

    if (error && errorType !== "new_user_edit") {
      return <div className="dashboard-container">{this.renderError()}</div>;
    }

    const userData = this.state.userData;
    const profileImageUrl = userData
      ? this.getFullImageUrl(userData.profileImage)
      : null;

    return (
      <>
        <div className="dashboard-container">
          {this.renderMobileToggleButton()}

          {/* Notification Slide Panel */}
          {this.renderNotificationPanel()}

          <div
            className={`dashboard-sidebar ${
              showMobileSidebar ? "mobile-active" : ""
            }`}
          >
            <div className="sidebar-user">
              <div className="user-avatar">
                {profileImageUrl ? (
                  <img src={profileImageUrl} alt={userData.name} />
                ) : (
                  <div className="avatar-placeholder">
                    {userData.name
                      ? userData.name.charAt(0).toUpperCase()
                      : "U"}
                  </div>
                )}
              </div>
              <div className="user-info">
                <div className="user-name">{userData.name}</div>
                <div className="user-voat-id">{userData.voatId}</div>
                <div className={`user-badge ${userData.badge}`}>
                  {userData.badge.charAt(0).toUpperCase() +
                    userData.badge.slice(1)}
                </div>
              </div>
            </div>

            <nav className="sidebar-nav">
              <Link to="/" className="nav-link">
                <div className="nav-item">
                  <i className="fas fa-home nav-icon"></i>
                  <span className="nav-text">Home</span>
                </div>
              </Link>

              <button
                className={`nav-item ${
                  activeTab === "profile" ? "active" : ""
                }`}
                onClick={() => this.handleTabChange("profile")}
              >
                <i className="fas fa-user nav-icon"></i>
                <span className="nav-text">Dashboard</span>
              </button>

              {/* COMMON TABS - ALL users have these */}
              <button
                className={`nav-item ${
                  activeTab === "my-bookings" ? "active" : ""
                }`}
                onClick={() => this.handleTabChange("my-bookings")}
              >
                <i className="fas fa-calendar-check nav-icon"></i>
                <span className="nav-text">My Bookings</span>
                {this.state.myBookings &&
                  this.state.myBookings.filter((b) => b.status === "pending")
                    .length > 0 && (
                    <span className="nav-badge">
                      {
                        this.state.myBookings.filter(
                          (b) => b.status === "pending"
                        ).length
                      }
                    </span>
                  )}
              </button>

              <button
                className={`nav-item ${
                  activeTab === "my-orders" ? "active" : ""
                }`}
                onClick={() => this.handleTabChange("my-orders")}
              >
                <i className="fas fa-shopping-cart nav-icon"></i>
                <span className="nav-text">My Orders</span>
                {this.state.stats.myOrdersCount > 0 && (
                  <span className="nav-badge">
                    {this.state.stats.myOrdersCount}
                  </span>
                )}
              </button>

              {/* FREELANCER-ONLY TABS - Only freelancers see these */}
              {this.isFreelancer() && (
                <>
                  <button
                    className={`nav-item ${
                      activeTab === "booking-requests" ? "active" : ""
                    }`}
                    onClick={() => this.handleTabChange("booking-requests")}
                  >
                    <i className="fas fa-inbox nav-icon"></i>
                    <span className="nav-text">Booking Requests</span>
                    {this.state.stats.bookingRequestsCount > 0 && (
                      <span className="nav-badge">
                        {this.state.stats.bookingRequestsCount}
                      </span>
                    )}
                  </button>

                  <button
                    className={`nav-item ${
                      activeTab === "order-received" ? "active" : ""
                    }`}
                    onClick={() => this.handleTabChange("order-received")}
                  >
                    <i className="fas fa-credit-card nav-icon"></i>
                    <span className="nav-text">Orders Received</span>
                    {this.state.receivedOrders &&
                      this.state.receivedOrders.filter(
                        (o) => o.status === "pending"
                      ).length > 0 && (
                        <span className="nav-badge">
                          {
                            this.state.receivedOrders.filter(
                              (o) => o.status === "pending"
                            ).length
                          }
                        </span>
                      )}
                  </button>
                </>
              )}

              <button
                className={`nav-item ${
                  activeTab === "wishlist" ? "active" : ""
                }`}
                onClick={() => this.handleTabChange("wishlist")}
              >
                <i className="fas fa-heart nav-icon"></i>
                <span className="nav-text">Wishlist</span>
                {this.state.stats.savedItems > 0 && (
                  <span className="nav-badge">
                    {this.state.stats.savedItems}
                  </span>
                )}
              </button>

              <button className="nav-item" onClick={this.handleLogout}>
                <i className="fas fa-sign-out-alt nav-icon"></i>
                <span className="nav-text">Logout</span>
              </button>
            </nav>

            <div className="sidebar-footer">
              {this.renderSidebarButton()}

              <div className="sidebar-voat-points">
                <div className="points-icon">
                  <i className="fas fa-award"></i>
                </div>
                <div className="points-info">
                  <div className="points-value">{userData.voatPoints || 0}</div>
                  <div className="points-label">VOAT Points</div>
                </div>
              </div>
            </div>
          </div>

          <div className="dashboard-content">
            {error && errorType === "new_user_edit"
              ? this.renderError()
              : this.renderDashboardContent()}
          </div>
        </div>

        {/* Order Details Overlay */}
        {this.state.selectedOrder && (
          <div
            className="booking-details-overlay"
            onClick={this.closeOrderDetails}
          >
            <div
              className="booking-details-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2>Order Details</h2>
                <button className="close-btn" onClick={this.closeOrderDetails}>
                  <i className="fas fa-times"></i>
                </button>
              </div>

              <div className="modal-content">
                {/* Client Information */}
                <div className="detail-section">
                  <h3>Client Information</h3>
                  <div className="client-details-full">
                    <div className="client-avatar-full">
                      {this.state.selectedOrder.clientProfileImage ? (
                        <img
                          src={this.getFullImageUrl(
                            this.state.selectedOrder.clientProfileImage
                          )}
                          alt={this.state.selectedOrder.clientName}
                        />
                      ) : (
                        <div className="avatar-placeholder-full">
                          {this.state.selectedOrder.clientName
                            ?.charAt(0)
                            .toUpperCase() || "C"}
                        </div>
                      )}
                    </div>
                    <div className="client-info-full">
                      <h4>{this.state.selectedOrder.clientName}</h4>
                      <p>{this.state.selectedOrder.clientEmail}</p>
                      <div className="client-badge">
                        <i className="fas fa-user"></i>
                        <span>Client</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Service Information */}
                <div className="detail-section">
                  <h3>Service Information</h3>
                  <div className="service-details-full">
                    <div className="detail-row">
                      <span className="detail-label">Service Name:</span>
                      <span className="detail-value">
                        {this.state.selectedOrder.serviceName}
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Service Package:</span>
                      <span className="detail-value service-type">
                        {this.state.selectedOrder.serviceLevel || "Standard"}
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Amount:</span>
                      <span className="detail-value price">
                        ₹
                        {this.state.selectedOrder.servicePrice?.toLocaleString()}
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Status:</span>
                      <span
                        className={`detail-value status-badge ${this.state.selectedOrder.status}`}
                      >
                        {this.state.selectedOrder.status
                          ?.charAt(0)
                          .toUpperCase() +
                          this.state.selectedOrder.status?.slice(1)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Order Timeline */}
                <div className="detail-section">
                  <h3>Order Timeline</h3>
                  <div className="timeline">
                    <div className="timeline-item">
                      <div className="timeline-dot active"></div>
                      <div className="timeline-content">
                        <h5>Order Received</h5>
                        <p>
                          {new Date(
                            this.state.selectedOrder.requestDate
                          ).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    {this.state.selectedOrder.responseDate && (
                      <div className="timeline-item">
                        <div className="timeline-dot active"></div>
                        <div className="timeline-content">
                          <h5>
                            {this.state.selectedOrder.status === "accepted"
                              ? "Order Accepted"
                              : this.state.selectedOrder.status === "rejected"
                              ? "Order Rejected"
                              : "Status Updated"}
                          </h5>
                          <p>
                            {new Date(
                              this.state.selectedOrder.responseDate
                            ).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }
}

export default UserDashboard;
