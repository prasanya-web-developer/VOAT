import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  Shield,
  CheckCircle,
  AlertCircle,
  Lock,
  Clock,
  User,
  Wallet,
  CreditCard,
  Smartphone,
  Building,
  RefreshCw,
  Award,
  DollarSign,
  ShoppingBag,
  Package,
  TrendingUp,
  Zap,
  FileText,
  Globe,
  Sparkles,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Receipt,
} from "lucide-react";
import "./index.css";
import { Link } from "react-router-dom";

// Dynamic base URL configuration
const getBaseUrl = () => {
  if (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
  ) {
    return "http://localhost:5000";
  }
  return "https://voat.onrender.com";
};

const PaymentGateway = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [orderData, setOrderData] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [error, setError] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [expandedItems, setExpandedItems] = useState({});

  useEffect(() => {
    initializePayment();
    loadRazorpayScript();
  }, []);

  const toggleItem = (itemId) => {
    setExpandedItems((prev) => {
      // Check if the clicked item is currently expanded
      const isCurrentlyExpanded = prev[itemId];

      if (isCurrentlyExpanded) {
        // If it's expanded, close it
        const newState = { ...prev };
        delete newState[itemId];
        return newState;
      } else {
        // If it's not expanded, close all others and open this one
        return { [itemId]: true };
      }
    });
  };

  const loadRazorpayScript = () => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => setRazorpayLoaded(true);
    script.onerror = () =>
      setError("Failed to load Razorpay. Please refresh the page.");
    document.body.appendChild(script);
  };

  const initializePayment = async () => {
    setIsLoadingData(true);

    // Get user data from localStorage
    const userData = localStorage.getItem("user");
    if (!userData) {
      setError("Please log in to continue with payment.");
      setIsLoadingData(false);
      return;
    }

    try {
      const parsedUserData = JSON.parse(userData);
      setCurrentUser(parsedUserData);

      // Check for checkout items from cart
      const checkoutItems = localStorage.getItem("checkout_items");
      if (checkoutItems) {
        const items = JSON.parse(checkoutItems);
        await processCheckoutItems(items, parsedUserData.id);
      } else {
        // Fallback: fetch cart data from backend
        await fetchCartData(parsedUserData.id);
      }
    } catch (error) {
      console.error("Error parsing user data:", error);
      setError("Invalid user data. Please log in again.");
      setIsLoadingData(false);
    }
  };

  const processCheckoutItems = async (items, userId) => {
    try {
      console.log("Processing checkout items:", items);

      // Transform cart items to order format with proper data
      const orderItems = await Promise.all(
        items.map(async (item) => {
          // Get freelancer details if available
          let freelancerDetails = null;
          try {
            if (item.freelancerId) {
              const baseUrl = getBaseUrl();
              const response = await fetch(
                `${baseUrl}/api/user/${item.freelancerId}`,
                {
                  headers: {
                    Accept: "application/json",
                    Origin: window.location.origin,
                  },
                }
              );

              if (response.ok) {
                const userData = await response.json();
                if (userData.success) {
                  freelancerDetails = userData.user;
                }
              }
            }
          } catch (err) {
            console.warn("Failed to fetch freelancer details:", err);
          }

          return {
            id: item.id || item._id,
            name: item.name || `${item.serviceName} - ${item.serviceLevel}`,
            seller: item.seller || item.freelancerName || "Unknown Seller",
            sellerImage:
              freelancerDetails?.profileImage ||
              item.freelancerProfileImage ||
              null,
            price:
              item.price || item.selectedPaymentAmount || item.basePrice || 0,
            basePrice: item.basePrice || item.price || 0,
            deliveryTime: "5-7 days",
            category: item.category || item.serviceName || "Service",
            serviceLevel: item.serviceLevel || "Standard",
            paymentStructure: item.paymentStructure || null,
            freelancerId: item.freelancerId,
            serviceName: item.serviceName,
            freelancerEmail: freelancerDetails?.email || item.freelancerEmail,
          };
        })
      );

      const total = orderItems.reduce((sum, item) => sum + item.price, 0);

      setOrderData({
        items: orderItems,
        total: total,
        selectedItemsCount: orderItems.length,
        subtotal: total,
        taxes: 0,
        discount: 0,
      });

      setIsLoadingData(false);
    } catch (error) {
      console.error("Error processing checkout items:", error);
      setError("Failed to process checkout items");
      setIsLoadingData(false);
    }
  };

  const fetchCartData = async (userId) => {
    try {
      console.log("Fetching cart data for user:", userId);

      const baseUrl = getBaseUrl();
      const response = await fetch(`${baseUrl}/api/cart/${userId}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Origin: window.location.origin,
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }

      const cartResponse = await response.json();
      console.log("Cart response:", cartResponse);

      let cartItems = [];
      if (cartResponse.success && cartResponse.data) {
        cartItems = cartResponse.data;
      } else if (Array.isArray(cartResponse)) {
        cartItems = cartResponse;
      }

      if (cartItems.length === 0) {
        setError("Your cart is empty. Please add items to cart first.");
        setIsLoadingData(false);
        return;
      }

      // Transform cart items to order format with proper ID handling
      const orderItems = cartItems.map((item) => ({
        id: item._id,
        name: `${item.serviceName} - ${item.serviceLevel}`,
        seller: item.freelancerName,
        sellerImage: item.freelancerProfileImage,
        price: item.selectedPaymentAmount || item.basePrice,
        basePrice: item.basePrice,
        deliveryTime: "5-7 days",
        category: item.serviceName,
        serviceLevel: item.serviceLevel,
        paymentStructure: item.paymentStructure,
        freelancerId: item.freelancerId, // This should be a valid ObjectId from cart
        serviceName: item.serviceName,
        freelancerEmail: null, // Will be fetched separately
      }));

      console.log("Transformed order items:", orderItems);

      const total = orderItems.reduce((sum, item) => sum + item.price, 0);

      setOrderData({
        items: orderItems,
        total: total,
        selectedItemsCount: orderItems.length,
        subtotal: total,
        taxes: 0,
        discount: 0,
      });

      setIsLoadingData(false);
    } catch (error) {
      console.error("Error fetching cart data:", error);
      setError("Failed to load cart data. Please try again.");
      setIsLoadingData(false);
    }
  };

  const createRazorpayOrder = async () => {
    try {
      const baseUrl = getBaseUrl();
      const response = await fetch(
        `${baseUrl}/api/payment/create-razorpay-order`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Origin: window.location.origin,
          },
          body: JSON.stringify({
            userId: currentUser.id,
            amount: orderData.total * 100, // Convert to paise
            currency: "INR",
            items: orderData.items.map((item) => ({
              serviceId: item.id,
              serviceName: item.serviceName,
              freelancerName: item.seller,
              amount: item.price,
            })),
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to create payment order");
      }

      const orderResponse = await response.json();
      if (!orderResponse.success) {
        throw new Error(
          orderResponse.message || "Failed to create payment order"
        );
      }

      return orderResponse;
    } catch (error) {
      throw new Error(error.message || "Failed to create payment order");
    }
  };

  const createOrdersFromCartItems = async () => {
    try {
      console.log("=== CREATING ORDERS FROM CART ITEMS ===");
      console.log("Order data items:", orderData.items);

      const baseUrl = getBaseUrl();

      // Create orders for each cart item
      const orderPromises = orderData.items.map(async (item) => {
        console.log("Creating order for item:", item);

        // Validate required IDs before sending
        if (!item.freelancerId) {
          throw new Error(`Missing freelancerId for item: ${item.name}`);
        }

        if (!currentUser.id) {
          throw new Error("Missing current user ID");
        }

        console.log("Freelancer ID:", item.freelancerId);
        console.log("Client ID:", currentUser.id);

        const orderPayload = {
          clientId: currentUser.id,
          clientName: currentUser.name,
          clientEmail: currentUser.email,
          freelancerId: item.freelancerId,
          freelancerName: item.seller,
          freelancerEmail:
            item.freelancerEmail ||
            `${item.seller.toLowerCase().replace(/\s+/g, "")}@example.com`,
          serviceName: item.serviceName || item.category || item.name,
          serviceLevel: item.serviceLevel || "Standard",
          totalAmount: parseFloat(item.price),
          paymentStatus: "paid",
        };

        console.log("Order payload being sent:", orderPayload);

        const response = await fetch(`${baseUrl}/api/orders/create`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Origin: window.location.origin,
          },
          body: JSON.stringify(orderPayload),
        });

        console.log("Order creation response status:", response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Order creation failed:", errorText);
          throw new Error(
            `Failed to create order for ${item.serviceName || item.name}: ${
              response.status
            } - ${errorText}`
          );
        }

        const result = await response.json();
        console.log("Order created successfully:", result);
        return result;
      });

      const createdOrders = await Promise.all(orderPromises);
      console.log("All orders created successfully:", createdOrders);
      return createdOrders;
    } catch (error) {
      console.error("Error creating orders from cart items:", error);
      throw new Error(
        `Failed to create orders after payment: ${error.message}`
      );
    }
  };

  const verifyPayment = async (paymentData) => {
    try {
      const baseUrl = getBaseUrl();
      const response = await fetch(`${baseUrl}/api/payment/verify-payment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Origin: window.location.origin,
        },
        body: JSON.stringify({
          ...paymentData,
          userId: currentUser.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Payment verification failed");
      }

      const verificationResponse = await response.json();
      if (!verificationResponse.success) {
        throw new Error(
          verificationResponse.message || "Payment verification failed"
        );
      }

      return verificationResponse;
    } catch (error) {
      throw new Error(error.message || "Payment verification failed");
    }
  };

  const processCartCheckout = async () => {
    try {
      console.log("=== PROCESSING CART CHECKOUT ===");
      const baseUrl = getBaseUrl();
      const selectedItemIds = orderData.items.map((item) => item.id);

      console.log("Clearing cart for user:", currentUser.id);
      console.log("Selected items to remove:", selectedItemIds);

      // Simply clear the entire cart since all items were paid for
      const response = await fetch(
        `${baseUrl}/api/cart/clear/${currentUser.id}`,
        {
          method: "DELETE",
          headers: {
            Accept: "application/json",
            Origin: window.location.origin,
          },
        }
      );

      console.log("Cart clear response status:", response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to clear cart");
      }

      const clearResponse = await response.json();
      console.log("Cart cleared successfully:", clearResponse);

      return clearResponse;
    } catch (error) {
      console.error("Cart checkout error:", error);
      // Don't throw error here - cart clearing failure shouldn't stop the process
      console.warn(
        "Cart clearing failed, but orders were created successfully"
      );
      return {
        success: true,
        message: "Orders created, cart clearing skipped",
      };
    }
  };

  const handleRazorpayPayment = async () => {
    if (!razorpayLoaded) {
      setError("Razorpay is still loading. Please wait and try again.");
      return;
    }

    if (!window.Razorpay) {
      setError(
        "Razorpay failed to load. Please refresh the page and try again."
      );
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Create order
      const orderResponse = await createRazorpayOrder();

      const options = {
        key: orderResponse.key,
        amount: orderResponse.amount,
        currency: orderResponse.currency,
        name: "VOAT Network",
        description: `Payment for ${orderData.selectedItemsCount} service(s)`,
        image: "/logo.png",
        order_id: orderResponse.id,
        handler: async function (response) {
          try {
            setIsLoading(true);
            console.log("Payment successful, starting order creation...");

            // Verify payment first
            await verifyPayment(response);
            console.log("Payment verified successfully");

            // Create orders from cart items
            await createOrdersFromCartItems();
            console.log("Orders created successfully");

            window.dispatchEvent(
              new CustomEvent("voatPointsUpdated", {
                detail: {
                  userId: currentUser.id,
                  pointsEarned: Math.floor(orderData.total * 0.01),
                  totalAmount: orderData.total,
                },
              })
            );

            // Try to clear cart, but don't fail if it doesn't work
            try {
              await processCartCheckout();
              console.log("Cart cleared successfully");
            } catch (cartError) {
              console.warn(
                "Cart clearing failed, but orders were created:",
                cartError.message
              );
              // Continue with success flow even if cart clearing fails
            }

            // Clear local storage regardless
            localStorage.removeItem(`cart_${currentUser.id}`);
            localStorage.removeItem("checkout_items");

            setPaymentStatus("success");

            // Redirect to dashboard after 3 seconds
            setTimeout(() => {
              window.location.href = "/user-dashboard";
            }, 3000);
          } catch (error) {
            console.error(
              "Payment verification or order creation failed:",
              error
            );
            setError(
              `Payment completed but order creation failed: ${error.message}`
            );
            setIsLoading(false);
          }
        },
        prefill: {
          name: currentUser.name,
          email: currentUser.email,
          contact: currentUser.phone || "",
        },
        notes: {
          userId: currentUser.id,
          voatId: currentUser.voatId,
          itemCount: orderData.selectedItemsCount,
        },
        theme: {
          color: "#025ba5",
        },
        modal: {
          ondismiss: function () {
            setIsLoading(false);
          },
        },
      };

      const razorpay = new window.Razorpay(options);

      razorpay.on("payment.failed", function (response) {
        setError(`Payment failed: ${response.error.description}`);
        setIsLoading(false);
      });

      razorpay.open();
    } catch (error) {
      console.error("Payment initiation failed:", error);
      setError(error.message);
      setIsLoading(false);
    }
  };

  const generateInitials = (name) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const getProfileImageUrl = (imagePath) => {
    if (!imagePath || imagePath === "/api/placeholder/150/150") {
      return null;
    }

    if (imagePath.startsWith("http")) {
      return imagePath;
    }

    const baseUrl = getBaseUrl();
    return `${baseUrl}${imagePath.startsWith("/") ? "" : "/"}${imagePath}`;
  };

  const retryDataLoad = () => {
    setError(null);
    initializePayment();
  };

  if (isLoadingData) {
    return (
      <div className="paymentpage-container">
        <div className="paymentpage-loading">
          <div className="paymentpage-loading-spinner">
            <div className="paymentpage-spinner"></div>
            <Sparkles className="paymentpage-loading-icon" />
          </div>
          <div className="paymentpage-loading-content">
            <h3>Preparing Your Payment</h3>
            <p>Setting up your secure checkout experience...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!orderData || !currentUser) {
    return (
      <div className="paymentpage-container">
        <div className="paymentpage-error-state">
          <div className="paymentpage-error-icon">
            <AlertCircle size={64} />
          </div>
          <div className="paymentpage-error-content">
            <h3>Unable to Load Payment Data</h3>
            <p>{error || "Something went wrong while loading your order."}</p>
            <button className="paymentpage-retry-btn" onClick={retryDataLoad}>
              <RefreshCw size={18} />
              <span>Try Again</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (paymentStatus === "success") {
    return (
      <div className="paymentpage-container">
        <div className="paymentpage-success">
          <div className="paymentpage-success-animation">
            <div className="paymentpage-success-icon">
              <CheckCircle size={80} />
            </div>
            <div className="paymentpage-success-waves"></div>
          </div>
          <div className="paymentpage-success-content">
            <h2>Payment Successful!</h2>
            <p>
              Your order has been placed successfully. You will receive a
              confirmation email shortly.
            </p>
            <div className="paymentpage-success-details">
              <div className="paymentpage-success-amount">
                ₹{orderData.total.toLocaleString()}
              </div>
              <div className="paymentpage-success-items">
                {orderData.selectedItemsCount} service(s) purchased
              </div>
            </div>
            <div className="paymentpage-redirect-notice">
              <Clock size={18} />
              <span>Redirecting to dashboard in 3 seconds...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="paymentpage-container">
      {/* Header */}
      <header className="paymentpage-header">
        <div className="paymentpage-header-content">
          <div className="paymentpage-header-left">
            <Link to="/">
              <button
                className="paymentpage-back-btn"
                onClick={() => window.history.back()}
                disabled={isLoading}
              >
                <ArrowLeft size={20} />
                <span>Back</span>
              </button>
            </Link>
          </div>

          <div className="paymentpage-header-center">
            <div className="paymentpage-brand">
              <h1>Secure Checkout</h1>
              <div className="paymentpage-security-badge">
                <Shield size={16} />
                <span>256-bit SSL Encrypted</span>
              </div>
            </div>
          </div>

          <div className="paymentpage-header-right">
            <div className="paymentpage-user-info">
              <div className="paymentpage-user-avatar">
                {getProfileImageUrl(currentUser.profileImage) ? (
                  <img
                    src={getProfileImageUrl(currentUser.profileImage)}
                    alt={currentUser.name}
                    onError={(e) => {
                      e.target.style.display = "none";
                      e.target.nextSibling.style.display = "flex";
                    }}
                  />
                ) : (
                  <div className="paymentpage-avatar-placeholder">
                    {generateInitials(currentUser.name)}
                  </div>
                )}
              </div>
              <div className="paymentpage-user-details">
                <span className="paymentpage-user-name">
                  {currentUser.name}
                </span>
                <span className="paymentpage-user-id">
                  {currentUser.voatId}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="paymentpage-main">
        <div className="paymentpage-content">
          {/* Order Summary */}
          <section className="paymentpage-order-section">
            <div className="paymentpage-order-card">
              <div className="paymentpage-order-header">
                <div className="paymentpage-order-title">
                  <ShoppingBag size={24} />
                  <h2>Order Summary</h2>
                </div>
                <div className="paymentpage-item-count">
                  {orderData.selectedItemsCount} items
                </div>
              </div>

              <div className="paymentpage-order-items">
                {orderData.items.map((item, index) => (
                  <div key={item.id} className="paymentpage-order-item-compact">
                    <div
                      className="paymentpage-item-summary"
                      onClick={() => toggleItem(item.id)}
                    >
                      <div className="paymentpage-item-left">
                        <div className="paymentpage-item-number">
                          {String(index + 1).padStart(2, "0")}
                        </div>

                        <div className="paymentpage-provider-compact">
                          <div className="paymentpage-provider-avatar">
                            {getProfileImageUrl(item.sellerImage) ? (
                              <img
                                src={getProfileImageUrl(item.sellerImage)}
                                alt={item.seller}
                                onError={(e) => {
                                  e.target.style.display = "none";
                                  e.target.nextSibling.style.display = "flex";
                                }}
                              />
                            ) : (
                              <div className="paymentpage-avatar-placeholder">
                                {generateInitials(item.seller)}
                              </div>
                            )}
                          </div>

                          <div className="paymentpage-service-info">
                            {/* <h3 className="paymentpage-service-name-compact">
                              {item.name}
                            </h3> */}
                            <span className="paymentpage-provider-name-compact">
                              {item.seller}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="paymentpage-item-right">
                        <div className="paymentpage-item-price-compact">
                          ₹{item.price.toLocaleString()}
                        </div>
                        <button
                          className="paymentpage-expand-btn"
                          type="button"
                        >
                          {expandedItems[item.id] ? (
                            <ChevronUp size={16} />
                          ) : (
                            <ChevronDown size={16} />
                          )}
                        </button>
                      </div>
                    </div>

                    {expandedItems[item.id] && (
                      <div className="paymentpage-item-details">
                        <div className="paymentpage-service-category-compact">
                          {item.category}
                        </div>

                        <div className="paymentpage-item-meta-compact">
                          <div className="paymentpage-delivery-time">
                            <Clock size={14} />
                            <span>{item.deliveryTime}</span>
                          </div>
                          <div className="paymentpage-service-level-compact">
                            {item.serviceLevel}
                          </div>
                        </div>

                        {item.paymentStructure && (
                          <div className="paymentpage-payment-structure">
                            <FileText size={14} />
                            <span>{item.paymentStructure.description}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="paymentpage-price-breakdown">
                <div className="paymentpage-breakdown-row">
                  <span>Subtotal</span>
                  <span>₹{orderData.subtotal.toLocaleString()}</span>
                </div>
                {orderData.discount > 0 && (
                  <div className="paymentpage-breakdown-row paymentpage-discount">
                    <span>Discount</span>
                    <span>-₹{orderData.discount.toLocaleString()}</span>
                  </div>
                )}
                {orderData.taxes > 0 && (
                  <div className="paymentpage-breakdown-row">
                    <span>Taxes & Fees</span>
                    <span>₹{orderData.taxes.toLocaleString()}</span>
                  </div>
                )}
                <div className="paymentpage-breakdown-row paymentpage-total">
                  <span>Total Amount</span>
                  <span>₹{orderData.total.toLocaleString()}</span>
                </div>
              </div>

              <div className="paymentpage-rewards">
                <Award size={20} />
                <div className="paymentpage-rewards-info">
                  <span className="paymentpage-rewards-text">You'll earn</span>
                  <span className="paymentpage-rewards-points">
                    {Math.floor(orderData.total * 0.01)} VOAT Points
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Payment Section */}
          <section className="paymentpage-payment-section">
            <div className="paymentpage-payment-card">
              <div className="paymentpage-payment-header">
                <h2>Payment Method</h2>
                <p>Choose your preferred payment option</p>
              </div>

              {error && (
                <div className="paymentpage-error-alert">
                  <AlertCircle size={20} />
                  <span>{error}</span>
                </div>
              )}

              <div className="paymentpage-payment-method">
                <div className="paymentpage-method-header">
                  <img
                    src="https://razorpay.com/assets/razorpay-logo.svg"
                    alt="Razorpay"
                    className="paymentpage-razorpay-logo"
                  />

                  <div className="paymentpage-method-info">
                    <h3>Razorpay Secure Payment</h3>
                    <p>India's most trusted payment gateway</p>
                  </div>
                </div>

                <div className="paymentpage-payment-options">
                  <div className="paymentpage-option">
                    <CreditCard size={20} />
                    <span>Credit/Debit Cards</span>
                  </div>
                  <div className="paymentpage-option">
                    <Smartphone size={20} />
                    <span>UPI Payments</span>
                  </div>
                  <div className="paymentpage-option">
                    <Building size={20} />
                    <span>Net Banking</span>
                  </div>
                  <div className="paymentpage-option">
                    <Wallet size={20} />
                    <span>Digital Wallets</span>
                  </div>
                </div>

                <div className="paymentpage-security-features">
                  <div className="paymentpage-feature">
                    <Shield size={16} />
                    <span>256-bit SSL</span>
                  </div>
                  <div className="paymentpage-feature">
                    <Lock size={16} />
                    <span>PCI Compliant</span>
                  </div>
                  <div className="paymentpage-feature">
                    <CheckCircle size={16} />
                    <span>100% Secure</span>
                  </div>
                </div>
              </div>

              <div className="paymentpage-payment-action">
                <button
                  className="paymentpage-pay-button"
                  onClick={handleRazorpayPayment}
                  disabled={isLoading || !razorpayLoaded}
                >
                  {isLoading ? (
                    <>
                      <div className="paymentpage-btn-spinner"></div>
                      <span>Processing Payment...</span>
                    </>
                  ) : !razorpayLoaded ? (
                    <>
                      <div className="paymentpage-btn-spinner"></div>
                      <span>Loading Payment Gateway...</span>
                    </>
                  ) : (
                    <>
                      <Lock size={20} />
                      <span>
                        Pay ₹{orderData.total.toLocaleString()} Securely
                      </span>
                      <ChevronRight size={20} />
                    </>
                  )}
                </button>

                <div className="paymentpage-payment-footer">
                  <div className="paymentpage-trust-indicators">
                    <div className="paymentpage-trust-item">
                      <Globe size={14} />
                      <span>Used by 50M+ customers</span>
                    </div>
                    <div className="paymentpage-trust-item">
                      <Zap size={14} />
                      <span>Instant confirmation</span>
                    </div>
                    <div className="paymentpage-trust-item">
                      <Receipt size={14} />
                      <span>Detailed invoice</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default PaymentGateway;
