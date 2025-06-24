import React, { Component } from "react";
import { X, Plus, Minus, ShoppingBag, Trash2 } from "lucide-react";
import "./index.css";

class CartSidebar extends Component {
  state = {
    cartItems: [],
    isLoading: false,
    error: null,
    baseUrl: "https://voat.onrender.com",
    currentUserId: null,
  };

  componentDidMount() {
    this.initializeCart();
  }

  componentDidUpdate(prevProps) {
    // Reload cart when sidebar opens
    if (this.props.isOpen && !prevProps.isOpen) {
      this.fetchCartItems();
    }
  }

  initializeCart = () => {
    const userData = localStorage.getItem("user");
    if (userData) {
      const parsedUserData = JSON.parse(userData);
      this.setState({ currentUserId: parsedUserData.id }, () => {
        this.fetchCartItems();
      });
    }
  };

  fetchCartItems = async () => {
    const { currentUserId } = this.state;

    if (!currentUserId) {
      console.log("No user ID found, skipping cart fetch");
      return;
    }

    console.log("=== FETCHING CART ITEMS ===");
    console.log("User ID:", currentUserId);

    this.setState({ isLoading: true, error: null });

    try {
      const url = `${this.state.baseUrl}/api/cart/${currentUserId}`;
      console.log("=== CART FETCH URL ===", url);

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });

      console.log("=== CART RESPONSE STATUS ===", response.status);
      console.log("=== RESPONSE HEADERS ===", [...response.headers.entries()]);

      // Check content type first
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const responseText = await response.text();
        console.error(
          "=== NON-JSON RESPONSE ===",
          responseText.substring(0, 500)
        );

        if (
          responseText.includes("<html") ||
          responseText.includes("<!DOCTYPE")
        ) {
          throw new Error(
            "Cart API endpoint not found. Server returned HTML error page."
          );
        } else {
          throw new Error(`Server error: Expected JSON but got ${contentType}`);
        }
      }

      // Parse JSON response
      const cartResponse = await response.json();
      console.log("=== FETCHED CART RESPONSE ===", cartResponse);

      if (!response.ok) {
        throw new Error(
          cartResponse.message || `Failed to fetch cart: ${response.status}`
        );
      }

      // Handle the response - backend should return array directly
      let cartItems = [];
      if (Array.isArray(cartResponse)) {
        cartItems = cartResponse;
      } else if (cartResponse.success && cartResponse.data) {
        cartItems = cartResponse.data;
      } else if (cartResponse.items) {
        cartItems = cartResponse.items;
      }

      console.log("=== CART ITEMS TO PROCESS ===", cartItems);

      // Transform the data to match the expected format
      const transformedItems = cartItems.map((item) => ({
        id: item._id,
        name: `${item.serviceName} - ${item.serviceLevel}`,
        price: item.selectedPaymentAmount,
        quantity: 1,
        image: this.getProfileImageUrl(item.freelancerProfileImage),
        seller: item.freelancerName,
        category: item.serviceName,
        freelancerId: item.freelancerId,
        serviceLevel: item.serviceLevel,
        basePrice: item.basePrice,
        paymentStructure: item.paymentStructure,
        addedDate: item.addedDate,
      }));

      console.log("=== TRANSFORMED ITEMS ===", transformedItems);

      this.setState({
        cartItems: transformedItems,
        isLoading: false,
      });
    } catch (error) {
      console.error("=== CART FETCH ERROR ===");
      console.error("Error type:", error.constructor.name);
      console.error("Error message:", error.message);
      console.error("Full error:", error);

      this.setState({
        error: error.message,
        isLoading: false,
        cartItems: [],
      });
    }
  };

  getProfileImageUrl = (imagePath) => {
    if (!imagePath || imagePath === "/api/placeholder/150/150") {
      return "/api/placeholder/150/150";
    }

    if (imagePath.startsWith("http")) {
      return imagePath;
    }

    return `${this.state.baseUrl}${
      imagePath.startsWith("/") ? "" : "/"
    }${imagePath}`;
  };

  // Calculate total price
  calculateTotal = () => {
    return this.state.cartItems
      .reduce((total, item) => {
        return total + item.price * item.quantity;
      }, 0)
      .toFixed(2);
  };

  // Calculate total items count
  getTotalItemsCount = () => {
    return this.state.cartItems.reduce((total, item) => {
      return total + item.quantity;
    }, 0);
  };

  // Update item quantity (not really applicable for services, but keeping for consistency)
  updateQuantity = async (itemId, newQuantity) => {
    if (newQuantity < 1) return;

    // For services, quantity should always be 1, but we'll keep this for UI consistency
    this.setState((prevState) => ({
      cartItems: prevState.cartItems.map((item) =>
        item.id === itemId ? { ...item, quantity: newQuantity } : item
      ),
    }));
  };

  // Remove item from cart
  removeItem = async (itemId) => {
    const { currentUserId } = this.state;

    if (!currentUserId) {
      alert("User not logged in");
      return;
    }

    if (
      !window.confirm(
        "Are you sure you want to remove this item from your cart?"
      )
    ) {
      return;
    }

    try {
      console.log("=== REMOVING CART ITEM ===");
      console.log("Item ID:", itemId);
      console.log("User ID:", currentUserId);

      const response = await fetch(`${this.state.baseUrl}/api/cart/remove`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          userId: currentUserId,
          itemId: itemId,
        }),
      });

      console.log("=== REMOVE RESPONSE STATUS ===", response.status);

      // Get response text first
      const responseText = await response.text();
      console.log("=== REMOVE RAW RESPONSE ===", responseText);

      // Parse JSON
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error("=== REMOVE JSON PARSE ERROR ===", parseError);

        if (
          responseText.includes("<html") ||
          responseText.includes("<!DOCTYPE")
        ) {
          throw new Error("Server returned HTML error page.");
        } else {
          throw new Error(
            `Invalid response: ${responseText.substring(0, 100)}...`
          );
        }
      }

      if (!response.ok) {
        throw new Error(result.message || "Failed to remove item");
      }

      // Remove item from local state
      this.setState((prevState) => ({
        cartItems: prevState.cartItems.filter((item) => item.id !== itemId),
      }));

      console.log("Item removed from cart successfully");
    } catch (error) {
      console.error("Error removing item from cart:", error);
      alert("Error removing item from cart: " + error.message);
    }
  };

  // Clear entire cart
  clearCart = async () => {
    const { currentUserId } = this.state;

    if (!currentUserId) {
      alert("User not logged in");
      return;
    }

    if (!window.confirm("Are you sure you want to clear your entire cart?")) {
      return;
    }

    try {
      console.log("=== CLEARING CART ===");
      console.log("User ID:", currentUserId);

      const response = await fetch(
        `${this.state.baseUrl}/api/cart/clear/${currentUserId}`,
        {
          method: "DELETE",
          headers: {
            Accept: "application/json",
          },
        }
      );

      console.log("=== CLEAR RESPONSE STATUS ===", response.status);

      // Get response text first
      const responseText = await response.text();
      console.log("=== CLEAR RAW RESPONSE ===", responseText);

      // Parse JSON
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error("=== CLEAR JSON PARSE ERROR ===", parseError);

        if (
          responseText.includes("<html") ||
          responseText.includes("<!DOCTYPE")
        ) {
          throw new Error("Server returned HTML error page.");
        } else {
          throw new Error(
            `Invalid response: ${responseText.substring(0, 100)}...`
          );
        }
      }

      if (!response.ok) {
        throw new Error(result.message || "Failed to clear cart");
      }

      // Clear local state
      this.setState({ cartItems: [] });

      console.log("Cart cleared successfully");
    } catch (error) {
      console.error("Error clearing cart:", error);
      alert("Error clearing cart: " + error.message);
    }
  };

  // Handle checkout
  handleCheckout = () => {
    const { cartItems, currentUserId } = this.state;

    if (!currentUserId) {
      alert("Please log in to proceed with checkout");
      return;
    }

    if (cartItems.length === 0) {
      alert("Your cart is empty");
      return;
    }

    // Here you can implement the checkout logic
    console.log("Proceeding to checkout with items:", cartItems);

    // For now, just show a message
    alert(
      `Proceeding to checkout with ${
        cartItems.length
      } items. Total: ₹${this.calculateTotal()}`
    );

    // You could redirect to a checkout page or open a checkout modal
    // window.location.href = '/checkout';
  };

  // Handle individual item booking
  handleBookItem = async (item) => {
    const { currentUserId } = this.state;

    if (!currentUserId) {
      alert("Please log in to book services");
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
        freelancerId: item.freelancerId,
        freelancerName: item.seller,
        freelancerEmail: "", // We don't have this in cart data
        serviceName: item.name,
        servicePrice: item.price,
      };

      console.log("Creating booking for item:", bookingData);

      const response = await fetch(`${this.state.baseUrl}/api/create-booking`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(bookingData),
      });

      // Check if response is JSON
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.log("=== BOOKING NON-JSON RESPONSE ===", text);
        throw new Error(
          `Server returned non-JSON response: ${response.status}`
        );
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to create booking");
      }

      console.log("Booking created successfully:", result);
      alert("Booking request sent successfully!");

      // Optionally remove the item from cart after booking
      // await this.removeItem(item.id);
    } catch (error) {
      console.error("Error creating booking:", error);
      alert("Error creating booking: " + error.message);
    }
  };

  render() {
    const { isOpen, onClose } = this.props;
    const { cartItems, isLoading, error } = this.state;
    const totalPrice = this.calculateTotal();
    const totalItems = this.getTotalItemsCount();

    return (
      <>
        {/* Overlay */}
        <div
          className={`cartpage-overlay ${
            isOpen ? "cartpage-overlay-active" : ""
          }`}
          onClick={onClose}
        />

        {/* Cart Sidebar */}
        <div
          className={`cartpage-sidebar ${
            isOpen ? "cartpage-sidebar-open" : ""
          }`}
        >
          {/* Header */}
          <div className="cartpage-header">
            <div className="cartpage-title-section">
              <ShoppingBag size={24} className="cartpage-icon" />
              <h2 className="cartpage-title">Shopping Cart</h2>
              <span className="cartpage-item-count">({totalItems} items)</span>
            </div>
            <button
              className="cartpage-close-btn"
              onClick={onClose}
              aria-label="Close cart"
            >
              <X size={24} />
            </button>
          </div>

          {/* Cart Content */}
          <div className="cartpage-content">
            {isLoading ? (
              // Loading State
              <div className="cartpage-loading-state">
                <div className="loading-spinner"></div>
                <p className="loading-text">Loading cart items...</p>
              </div>
            ) : error ? (
              // Error State
              <div className="cartpage-error-state">
                <div className="error-icon">❌</div>
                <h3 className="error-title">Error Loading Cart</h3>
                <p className="error-text">{error}</p>
                <button
                  className="cartpage-retry-btn"
                  onClick={this.fetchCartItems}
                >
                  Try Again
                </button>
              </div>
            ) : cartItems.length === 0 ? (
              // Empty Cart State
              <div className="cartpage-empty-state">
                <ShoppingBag size={64} className="cartpage-empty-icon" />
                <h3 className="cartpage-empty-title">Your cart is empty</h3>
                <p className="cartpage-empty-description">
                  Browse our services and add items to your cart
                </p>
                <button className="cartpage-browse-btn" onClick={onClose}>
                  Continue Shopping
                </button>
              </div>
            ) : (
              // Cart Items
              <div className="cartpage-items-container">
                {cartItems.map((item) => (
                  <div key={item.id} className="cartpage-item">
                    <div className="cartpage-item-image">
                      <img
                        src={item.image}
                        alt={item.seller}
                        onError={(e) => {
                          e.target.src = "/api/placeholder/100x100";
                        }}
                      />
                    </div>

                    <div className="cartpage-item-details">
                      <h4 className="cartpage-item-name">{item.name}</h4>
                      <p className="cartpage-item-seller">by {item.seller}</p>
                      <span className="cartpage-item-category">
                        {item.category}
                      </span>

                      {/* Payment Structure Info */}
                      {item.paymentStructure && (
                        <div className="cartpage-payment-info">
                          <span className="payment-type">
                            {item.paymentStructure.description}
                          </span>
                        </div>
                      )}

                      <div className="cartpage-item-actions">
                        <div className="cartpage-quantity-controls">
                          <button
                            className="cartpage-quantity-btn"
                            onClick={() =>
                              this.updateQuantity(item.id, item.quantity - 1)
                            }
                            disabled={item.quantity <= 1}
                          >
                            <Minus size={16} />
                          </button>
                          <span className="cartpage-quantity">
                            {item.quantity}
                          </span>
                          <button
                            className="cartpage-quantity-btn"
                            onClick={() =>
                              this.updateQuantity(item.id, item.quantity + 1)
                            }
                          >
                            <Plus size={16} />
                          </button>
                        </div>

                        <button
                          className="cartpage-remove-btn"
                          onClick={() => this.removeItem(item.id)}
                          aria-label="Remove item"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      {/* Book Individual Item Button */}
                      <button
                        className="cartpage-book-item-btn"
                        onClick={() => this.handleBookItem(item)}
                        title="Book this service now"
                      >
                        <span className="btn-icon">⚡</span>
                        Book Now
                      </button>
                    </div>

                    <div className="cartpage-item-price">
                      <span className="cartpage-price">₹{item.price}</span>
                      {item.quantity > 1 && (
                        <span className="cartpage-total-price">
                          Total: ₹{(item.price * item.quantity).toFixed(2)}
                        </span>
                      )}
                      {item.basePrice !== item.price && (
                        <span className="cartpage-base-price">
                          Base: ₹{item.basePrice}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer with total and checkout */}
          {cartItems.length > 0 && (
            <div className="cartpage-footer">
              <div className="cartpage-total-section">
                <div className="cartpage-subtotal">
                  <span className="cartpage-subtotal-label">Subtotal:</span>
                  <span className="cartpage-subtotal-amount">
                    ₹{totalPrice}
                  </span>
                </div>
                <p className="cartpage-tax-note">
                  Final pricing will be confirmed with service provider
                </p>
              </div>

              <div className="cartpage-checkout-actions">
                <button
                  className="cartpage-checkout-btn"
                  onClick={this.handleCheckout}
                >
                  Proceed to Checkout
                </button>
                <button
                  className="cartpage-continue-shopping"
                  onClick={onClose}
                >
                  Continue Shopping
                </button>
                {cartItems.length > 1 && (
                  <button
                    className="cartpage-clear-cart"
                    onClick={this.clearCart}
                  >
                    Clear Cart
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </>
    );
  }
}

export default CartSidebar;
