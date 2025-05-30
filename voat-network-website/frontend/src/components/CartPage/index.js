import React, { Component } from "react";
import "./index.css";

class CartSlider extends Component {
  state = {
    isLoading: false,
    error: null,
    baseUrl: "http://localhost:8000",
  };

  componentDidMount() {
    if (this.props.isOpen) {
      document.body.style.overflow = "hidden";
    }
  }

  componentDidUpdate(prevProps) {
    if (prevProps.isOpen !== this.props.isOpen) {
      if (this.props.isOpen) {
        document.body.style.overflow = "hidden";
      } else {
        document.body.style.overflow = "unset";
      }
    }
  }

  componentWillUnmount() {
    document.body.style.overflow = "unset";
  }

  handleQuantityUpdate = async (itemId, newQuantity) => {
    const { currentUser, onCartUpdate } = this.props;

    if (!currentUser || !currentUser.id) return;

    this.setState({ isLoading: true });

    try {
      const response = await fetch(`${this.state.baseUrl}/api/cart/update`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: currentUser.id,
          itemId: itemId,
          quantity: newQuantity,
        }),
      });

      const data = await response.json();

      if (data.success) {
        onCartUpdate(data.cart);
        this.showNotification("Cart updated successfully");
      } else {
        throw new Error(data.error || "Failed to update cart");
      }
    } catch (error) {
      console.error("Error updating cart:", error);
      this.setState({ error: error.message });
    } finally {
      this.setState({ isLoading: false });
    }
  };

  handleRemoveItem = async (itemId) => {
    const { currentUser, onCartUpdate } = this.props;

    if (!currentUser || !currentUser.id) return;

    this.setState({ isLoading: true });

    try {
      const response = await fetch(
        `${this.state.baseUrl}/api/cart/remove/${currentUser.id}/${itemId}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (data.success) {
        onCartUpdate(data.cart);
        this.showNotification("Item removed from cart");
      } else {
        throw new Error(data.error || "Failed to remove item");
      }
    } catch (error) {
      console.error("Error removing item:", error);
      this.setState({ error: error.message });
    } finally {
      this.setState({ isLoading: false });
    }
  };

  handleClearCart = async () => {
    const { currentUser, onCartUpdate } = this.props;

    if (!currentUser || !currentUser.id) return;

    if (!window.confirm("Are you sure you want to clear your cart?")) {
      return;
    }

    this.setState({ isLoading: true });

    try {
      const response = await fetch(
        `${this.state.baseUrl}/api/cart/clear/${currentUser.id}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (data.success) {
        onCartUpdate(data.cart);
        this.showNotification("Cart cleared successfully");
      } else {
        throw new Error(data.error || "Failed to clear cart");
      }
    } catch (error) {
      console.error("Error clearing cart:", error);
      this.setState({ error: error.message });
    } finally {
      this.setState({ isLoading: false });
    }
  };

  showNotification = (message) => {
    if (this.props.onShowNotification) {
      this.props.onShowNotification(message, "success");
    }
  };

  getProfileImageUrl = (providerImage) => {
    if (!providerImage) return null;

    if (
      providerImage.startsWith("http") ||
      providerImage.startsWith("data:image")
    ) {
      return providerImage;
    }

    if (providerImage.startsWith("/uploads")) {
      return `${this.state.baseUrl}${providerImage}`;
    }

    return providerImage;
  };

  formatPrice = (price) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  render() {
    const { isOpen, onClose, cart } = this.props;
    const { isLoading, error } = this.state;

    if (!isOpen) return null;

    const cartItems = cart?.items || [];
    const totalAmount = cart?.totalAmount || 0;
    const totalItems = cart?.totalItems || 0;

    return (
      <>
        {/* Backdrop */}
        <div
          className={`cartpage-backdrop ${
            isOpen ? "cartpage-backdrop-open" : ""
          }`}
          onClick={onClose}
        />

        {/* Cart Slider */}
        <div
          className={`cartpage-slider ${isOpen ? "cartpage-slider-open" : ""}`}
        >
          {/* Header */}
          <div className="cartpage-header">
            <div className="cartpage-header-content">
              <h2 className="cartpage-title">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <path d="M16 10a4 4 0 0 1-8 0" />
                </svg>
                Shopping Cart
                {totalItems > 0 && (
                  <span className="cartpage-item-count">{totalItems}</span>
                )}
              </h2>
              <button className="cartpage-close-btn" onClick={onClose}>
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {cartItems.length > 0 && (
              <div className="cartpage-header-actions">
                <button
                  className="cartpage-clear-btn"
                  onClick={this.handleClearCart}
                  disabled={isLoading}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <polyline points="3,6 5,6 21,6" />
                    <path d="M19,6v14a2,2 0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2V6" />
                    <line x1="10" y1="11" x2="10" y2="17" />
                    <line x1="14" y1="11" x2="14" y2="17" />
                  </svg>
                  Clear All
                </button>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="cartpage-content">
            {error && (
              <div className="cartpage-error">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                {error}
              </div>
            )}

            {cartItems.length === 0 ? (
              <div className="cartpage-empty">
                <div className="cartpage-empty-icon">
                  <svg
                    width="80"
                    height="80"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1"
                  >
                    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <path d="M16 10a4 4 0 0 1-8 0" />
                  </svg>
                </div>
                <h3 className="cartpage-empty-title">Your cart is empty</h3>
                <p className="cartpage-empty-text">
                  Browse our amazing freelancers and add services to your cart
                </p>
                <button className="cartpage-continue-btn" onClick={onClose}>
                  Continue Shopping
                </button>
              </div>
            ) : (
              <>
                {/* Cart Items */}
                <div className="cartpage-items">
                  {cartItems.map((item) => {
                    const profileImageUrl = this.getProfileImageUrl(
                      item.providerImage
                    );

                    return (
                      <div key={item.id} className="cartpage-item">
                        <div className="cartpage-item-image">
                          {profileImageUrl ? (
                            <img
                              src={profileImageUrl}
                              alt={item.providerName}
                              onError={(e) => {
                                e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                  item.providerName
                                )}&background=667eea&color=fff&size=60`;
                              }}
                            />
                          ) : (
                            <div className="cartpage-item-avatar">
                              {item.providerName.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>

                        <div className="cartpage-item-details">
                          <h4 className="cartpage-item-service">
                            {item.serviceName}
                          </h4>
                          <p className="cartpage-item-provider">
                            by {item.providerName}
                          </p>
                          {item.serviceLevel && (
                            <span className="cartpage-item-level">
                              {item.serviceLevel.charAt(0).toUpperCase() +
                                item.serviceLevel.slice(1)}{" "}
                              Package
                            </span>
                          )}
                          <div className="cartpage-item-price">
                            {this.formatPrice(item.price)}
                          </div>
                        </div>

                        <div className="cartpage-item-actions">
                          <div className="cartpage-quantity-controls">
                            <button
                              className="cartpage-quantity-btn"
                              onClick={() =>
                                this.handleQuantityUpdate(
                                  item.id,
                                  item.quantity - 1
                                )
                              }
                              disabled={isLoading || item.quantity <= 1}
                            >
                              <svg
                                width="12"
                                height="12"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <line x1="5" y1="12" x2="19" y2="12" />
                              </svg>
                            </button>
                            <span className="cartpage-quantity">
                              {item.quantity}
                            </span>
                            <button
                              className="cartpage-quantity-btn"
                              onClick={() =>
                                this.handleQuantityUpdate(
                                  item.id,
                                  item.quantity + 1
                                )
                              }
                              disabled={isLoading}
                            >
                              <svg
                                width="12"
                                height="12"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <line x1="12" y1="5" x2="12" y2="19" />
                                <line x1="5" y1="12" x2="19" y2="12" />
                              </svg>
                            </button>
                          </div>

                          <button
                            className="cartpage-remove-btn"
                            onClick={() => this.handleRemoveItem(item.id)}
                            disabled={isLoading}
                          >
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <polyline points="3,6 5,6 21,6" />
                              <path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2V6" />
                              <line x1="10" y1="11" x2="10" y2="17" />
                              <line x1="14" y1="11" x2="14" y2="17" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Footer */}
                <div className="cartpage-footer">
                  <div className="cartpage-total">
                    <div className="cartpage-total-row">
                      <span>Subtotal ({totalItems} items)</span>
                      <span>{this.formatPrice(totalAmount)}</span>
                    </div>
                    <div className="cartpage-total-row cartpage-total-main">
                      <span>Total</span>
                      <span>{this.formatPrice(totalAmount)}</span>
                    </div>
                  </div>

                  <div className="cartpage-checkout-actions">
                    <button
                      className="cartpage-checkout-btn"
                      disabled={isLoading || cartItems.length === 0}
                    >
                      {isLoading ? (
                        <div className="cartpage-loading-spinner" />
                      ) : (
                        <>
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <rect
                              x="2"
                              y="3"
                              width="20"
                              height="14"
                              rx="2"
                              ry="2"
                            />
                            <line x1="8" y1="21" x2="16" y2="21" />
                            <line x1="12" y1="17" x2="12" y2="21" />
                          </svg>
                          Proceed to Checkout
                        </>
                      )}
                    </button>
                    <button
                      className="cartpage-continue-shopping"
                      onClick={onClose}
                    >
                      Continue Shopping
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </>
    );
  }
}

export default CartSlider;
