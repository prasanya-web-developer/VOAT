import React, { Component } from "react";
import { Link } from "react-router-dom";
import { X, ShoppingBag, Trash2 } from "lucide-react";
import "./index.css";

class CartSidebar extends Component {
  state = {
    cartItems: [],
    selectedItems: new Set(),
    isLoading: false,
    isCheckingOut: false,
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

      // Initialize all items as selected by default
      const allItemIds = new Set(transformedItems.map((item) => item.id));

      this.setState({
        cartItems: transformedItems,
        selectedItems: allItemIds,
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
        selectedItems: new Set(),
      });
    }
  };

  getProfileImageUrl = (imagePath) => {
    if (!imagePath || imagePath === "/api/placeholder/150/150") {
      return null;
    }

    if (imagePath.startsWith("http")) {
      return imagePath;
    }

    return `${this.state.baseUrl}${
      imagePath.startsWith("/") ? "" : "/"
    }${imagePath}`;
  };

  // Generate initials from seller name
  getSellerInitials = (sellerName) => {
    if (!sellerName) return "U";

    const names = sellerName.trim().split(" ");
    if (names.length === 1) {
      return names[0].substring(0, 2).toUpperCase();
    } else {
      return (names[0][0] + names[1][0]).toUpperCase();
    }
  };

  // Handle individual item selection
  toggleItemSelection = (itemId) => {
    this.setState((prevState) => {
      const newSelectedItems = new Set(prevState.selectedItems);
      if (newSelectedItems.has(itemId)) {
        newSelectedItems.delete(itemId);
      } else {
        newSelectedItems.add(itemId);
      }
      return { selectedItems: newSelectedItems };
    });
  };

  // Handle select all / deselect all
  toggleSelectAll = () => {
    const { cartItems, selectedItems } = this.state;
    const allItemIds = cartItems.map((item) => item.id);
    const allSelected = allItemIds.every((id) => selectedItems.has(id));

    if (allSelected) {
      // Deselect all
      this.setState({ selectedItems: new Set() });
    } else {
      // Select all
      this.setState({ selectedItems: new Set(allItemIds) });
    }
  };

  // Calculate total price for selected items only
  calculateTotal = () => {
    const { cartItems, selectedItems } = this.state;
    return cartItems
      .filter((item) => selectedItems.has(item.id))
      .reduce((total, item) => total + item.price, 0)
      .toFixed(2);
  };

  // Calculate total items count
  getTotalItemsCount = () => {
    return this.state.cartItems.length;
  };

  // Get selected items count
  getSelectedItemsCount = () => {
    return this.state.selectedItems.size;
  };

  // Remove from both cart and wishlist
  removeFromWishlistIfExists = async (itemToRemove) => {
    try {
      const userData = JSON.parse(localStorage.getItem("user") || "{}");
      if (!userData || !userData.id) return;

      console.log("=== CHECKING WISHLIST FOR REMOVAL ===");
      console.log("Item to check:", itemToRemove);

      // Get current wishlist
      const wishlistResponse = await fetch(
        `${this.state.baseUrl}/api/wishlist/${userData.id}`
      );

      if (wishlistResponse.ok) {
        const currentWishlist = await wishlistResponse.json();
        console.log("Current wishlist:", currentWishlist);

        // Find matching wishlist item
        // Match by service name and provider name
        const matchingWishlistItem = currentWishlist.find((wishlistItem) => {
          const serviceMatch = wishlistItem.service === itemToRemove.category;
          const providerMatch = wishlistItem.provider === itemToRemove.seller;

          console.log("Checking match:", {
            wishlistService: wishlistItem.service,
            cartService: itemToRemove.category,
            wishlistProvider: wishlistItem.provider,
            cartProvider: itemToRemove.seller,
            serviceMatch,
            providerMatch,
          });

          return serviceMatch && providerMatch;
        });

        if (matchingWishlistItem) {
          console.log(
            "=== FOUND MATCHING WISHLIST ITEM ===",
            matchingWishlistItem
          );

          // Remove from wishlist
          const updatedWishlist = currentWishlist.filter(
            (item) => item.id !== matchingWishlistItem.id
          );

          // Update server wishlist
          await fetch(`${this.state.baseUrl}/api/wishlist/${userData.id}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(updatedWishlist),
          });

          // Update localStorage
          localStorage.setItem(
            `wishlist_${userData.id}`,
            JSON.stringify(updatedWishlist)
          );

          // Trigger dashboard wishlist refresh if callback exists
          if (this.props.onWishlistUpdate) {
            this.props.onWishlistUpdate();
          }

          // Dispatch custom event for dashboard to listen
          window.dispatchEvent(
            new CustomEvent("wishlistUpdated", {
              detail: { updatedWishlist },
            })
          );

          console.log("=== WISHLIST UPDATED AFTER CART REMOVAL ===");
        } else {
          console.log("=== NO MATCHING WISHLIST ITEM FOUND ===");
        }
      }
    } catch (error) {
      console.error("Error updating wishlist after cart removal:", error);
    }
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

      // Get the item details before removing it (for wishlist sync)
      const itemToRemove = this.state.cartItems.find(
        (item) => item.id === itemId
      );
      console.log("Item to remove:", itemToRemove);

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

      // Remove item from local state and selected items
      this.setState((prevState) => {
        const newSelectedItems = new Set(prevState.selectedItems);
        newSelectedItems.delete(itemId);

        return {
          cartItems: prevState.cartItems.filter((item) => item.id !== itemId),
          selectedItems: newSelectedItems,
        };
      });

      // Remove from wishlist if it exists there
      if (itemToRemove) {
        await this.removeFromWishlistIfExists(itemToRemove);
      }

      // Trigger dashboard orders refresh if callback exists
      if (this.props.onOrdersUpdate) {
        this.props.onOrdersUpdate();
      }

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

      // Store current cart items for wishlist sync
      const currentCartItems = [...this.state.cartItems];

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
      this.setState({
        cartItems: [],
        selectedItems: new Set(),
      });

      // Remove corresponding items from wishlist
      for (const cartItem of currentCartItems) {
        await this.removeFromWishlistIfExists(cartItem);
      }

      // Trigger dashboard orders refresh if callback exists
      if (this.props.onOrdersUpdate) {
        this.props.onOrdersUpdate();
      }

      console.log("Cart cleared successfully");
    } catch (error) {
      console.error("Error clearing cart:", error);
      alert("Error clearing cart: " + error.message);
    }
  };

  // Handle checkout for selected items only
  handleCheckout = async () => {
    const { cartItems, selectedItems, currentUserId } = this.state;

    if (!currentUserId) {
      alert("Please log in to proceed with checkout");
      return;
    }

    if (cartItems.length === 0) {
      alert("Your cart is empty");
      return;
    }

    if (selectedItems.size === 0) {
      alert("Please select at least one item to checkout");
      return;
    }

    // Get selected items for checkout
    const selectedCartItems = cartItems.filter((item) =>
      selectedItems.has(item.id)
    );

    console.log("=== PROCEEDING TO CHECKOUT ===");
    console.log("Selected items:", selectedCartItems);

    this.setState({ isCheckingOut: true });

    try {
      // Call the new checkout API endpoint
      const response = await fetch(`${this.state.baseUrl}/api/cart/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: currentUserId,
          selectedItems: Array.from(selectedItems),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to process checkout");
      }

      console.log("=== CHECKOUT SUCCESS ===", result);

      // Remove checked out items from local state
      this.setState((prevState) => ({
        cartItems: prevState.cartItems.filter(
          (item) => !selectedItems.has(item.id)
        ),
        selectedItems: new Set(),
        isCheckingOut: false,
      }));

      // Show success message
      alert(
        `Checkout successful! ${result.orders.length} orders created. Check your "My Orders" section to track progress.`
      );

      // Trigger dashboard orders refresh if callback exists
      if (this.props.onOrdersUpdate) {
        this.props.onOrdersUpdate();
      }

      // Dispatch custom event for dashboard to listen
      window.dispatchEvent(
        new CustomEvent("ordersUpdated", {
          detail: { newOrders: result.orders },
        })
      );

      // Close cart sidebar after successful checkout
      if (this.props.onClose) {
        this.props.onClose();
      }
    } catch (error) {
      console.error("Checkout error:", error);
      alert("Checkout failed: " + error.message);
      this.setState({ isCheckingOut: false });
    }
  };

  render() {
    const { isOpen, onClose } = this.props;
    const { cartItems, selectedItems, isLoading, isCheckingOut, error } =
      this.state;
    const totalPrice = this.calculateTotal();
    const totalItems = this.getTotalItemsCount();
    const selectedItemsCount = this.getSelectedItemsCount();
    const showCheckboxes = cartItems.length > 1;

    // Check if all items are selected
    const allSelected =
      cartItems.length > 0 &&
      cartItems.every((item) => selectedItems.has(item.id));
    const someSelected =
      selectedItems.size > 0 && selectedItems.size < cartItems.length;

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
                {/* Select All Header - Only show if more than 1 item */}
                {showCheckboxes && (
                  <div className="cartpage-select-all-header">
                    <label className="cartpage-select-all-label">
                      <input
                        type="checkbox"
                        className="cartpage-select-all-checkbox"
                        checked={allSelected}
                        ref={(input) => {
                          if (input) input.indeterminate = someSelected;
                        }}
                        onChange={this.toggleSelectAll}
                      />
                      <span className="cartpage-select-all-text">
                        {allSelected ? "Deselect All" : "Select All"}
                        {selectedItemsCount > 0 &&
                          ` (${selectedItemsCount} selected)`}
                      </span>
                    </label>
                  </div>
                )}

                {cartItems.map((item) => (
                  <div key={item.id} className="cartpage-item">
                    {/* Checkbox - Only show if more than 1 item */}
                    {showCheckboxes && (
                      <div className="cartpage-item-checkbox">
                        <input
                          type="checkbox"
                          className="cartpage-checkbox"
                          checked={selectedItems.has(item.id)}
                          onChange={() => this.toggleItemSelection(item.id)}
                        />
                      </div>
                    )}

                    <div className="cartpage-item-image">
                      {this.getProfileImageUrl(item.image) ? (
                        <img
                          src={this.getProfileImageUrl(item.image)}
                          alt={item.seller}
                          onError={(e) => {
                            e.target.style.display = "none";
                            e.target.nextSibling.style.display = "flex";
                          }}
                        />
                      ) : null}
                      <div
                        className="cartpage-profile-placeholder"
                        style={{
                          display: this.getProfileImageUrl(item.image)
                            ? "none"
                            : "flex",
                        }}
                      >
                        {this.getSellerInitials(item.seller)}
                      </div>
                    </div>

                    <div className="cartpage-item-details">
                      <h4 className="cartpage-item-name">{item.name}</h4>
                      <div className="cartpage-seller-row">
                        <p className="cartpage-item-seller">by {item.seller}</p>
                        <button
                          className="cartpage-remove-btn"
                          onClick={() => this.removeItem(item.id)}
                          aria-label="Remove item"
                          disabled={isCheckingOut}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="cartpage-item-price">
                      <span className="cartpage-price">₹{item.price}</span>
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
                  <span className="cartpage-subtotal-label">
                    Subtotal {showCheckboxes && `(${selectedItemsCount} items)`}
                    :
                  </span>
                  <span className="cartpage-subtotal-amount">
                    ₹{totalPrice}
                  </span>
                </div>
                <p className="cartpage-tax-note">
                  Services will be processed as orders after checkout
                </p>
              </div>

              <div className="cartpage-checkout-actions">
                <div className="cartpage-buttons-row">
                  <button
                    className="cartpage-checkout-btn"
                    onClick={this.handleCheckout}
                    disabled={selectedItemsCount === 0 || isCheckingOut}
                  >
                    {isCheckingOut ? (
                      <>
                        <div className="checkout-loading-spinner"></div>
                        Processing...
                      </>
                    ) : (
                      <Link to="/payment" className="checkout-link">
                        Checkout
                        {showCheckboxes &&
                          selectedItemsCount > 0 &&
                          ` (${selectedItemsCount})`}
                      </Link>
                    )}
                  </button>
                  <button
                    className="cartpage-continue-shopping"
                    onClick={onClose}
                    disabled={isCheckingOut}
                  >
                    <Link to="/services"> Continue Shopping</Link>
                  </button>
                </div>
                {cartItems.length > 1 && (
                  <button
                    className="cartpage-clear-cart"
                    onClick={this.clearCart}
                    disabled={isCheckingOut}
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
