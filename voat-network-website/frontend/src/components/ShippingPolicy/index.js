import { Component } from "react";
import { Link } from "react-router-dom";
import { Navigate } from "react-router-dom";
import {
  Home,
  Truck,
  Globe,
  MapPin,
  Clock,
  Package,
  Phone,
} from "lucide-react";
import "./index.css";

class ShippingPolicyPage extends Component {
  state = {
    acceptedPolicy: false,
    isSubmitting: false,
    redirectToLogin: false,
    errors: {},
  };

  // Handle checkbox change
  handleCheckboxChange = () => {
    this.setState((prevState) => ({
      acceptedPolicy: !prevState.acceptedPolicy,
      errors: {}, // Clear errors when checkbox is toggled
    }));
  };

  // Handle form submission
  handleSubmit = async (e) => {
    e.preventDefault();

    if (!this.state.acceptedPolicy) {
      this.setState({
        errors: {
          general:
            "Please accept the shipping & delivery policy terms to continue.",
        },
      });
      return;
    }

    this.setState({ isSubmitting: true, errors: {} });

    try {
      // Get user data from localStorage
      const userData = JSON.parse(localStorage.getItem("user") || "{}");

      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Update user data with shipping policy acceptance
      const updatedUserData = {
        ...userData,
        shippingPolicyAccepted: true,
        shippingPolicyAcceptedAt: new Date().toISOString(),
      };

      localStorage.setItem("user", JSON.stringify(updatedUserData));

      // Redirect to login page
      this.setState({ redirectToLogin: true });
    } catch (error) {
      console.error("Shipping policy submission error:", error);
      this.setState({
        errors: {
          general: "Something went wrong. Please try again.",
        },
        isSubmitting: false,
      });
    }
  };

  render() {
    const { acceptedPolicy, isSubmitting, redirectToLogin, errors } =
      this.state;

    // Redirect to login page if shipping policy was accepted
    if (redirectToLogin) {
      return <Navigate to="/login" />;
    }

    return (
      <div className="shippingpage-screen">
        <Link to="/" className="shippingpage-home-button">
          <Home className="h-5 w-5" />
          <span>Home</span>
        </Link>

        <div className="shippingpage-container">
          <div className="shippingpage-header">
            <Truck className="shippingpage-header-icon" />
            <h1 className="shippingpage-title">Shipping & Delivery Policy</h1>
            <p className="shippingpage-subtitle">
              Comprehensive shipping and delivery terms for VOAT Network
              services and products
            </p>
          </div>

          {errors.general && (
            <div className="shippingpage-error-alert">{errors.general}</div>
          )}

          <div className="shippingpage-content">
            <form onSubmit={this.handleSubmit} className="shippingpage-form">
              {/* Introduction */}
              <div className="shippingpage-section">
                <div className="shippingpage-section-header">
                  <Package className="shippingpage-section-icon" />
                  <h3 className="shippingpage-section-title">Introduction</h3>
                </div>
                <div className="shippingpage-section-content">
                  <p>
                    <strong>Last updated on Jun 5 2025</strong>
                  </p>
                  <p>
                    For International buyers, orders are shipped and delivered
                    through registered international courier companies and/or
                    International speed post only. For domestic buyers, orders
                    are shipped through registered domestic courier companies
                    and /or speed post only. Orders are shipped within 0-7 days
                    or as per the delivery date agreed at the time of order
                    confirmation and delivering of the shipment subject to
                    Courier Company / post office norms.
                  </p>
                </div>
              </div>

              {/* International Shipping */}
              <div className="shippingpage-section">
                <div className="shippingpage-section-header">
                  <Globe className="shippingpage-section-icon" />
                  <h3 className="shippingpage-section-title">
                    International Shipping
                  </h3>
                </div>
                <div className="shippingpage-section-content">
                  <p>
                    For International buyers, orders are shipped and delivered
                    through registered international courier companies and/or
                    International speed post only.
                  </p>
                  <ul>
                    <li>
                      All international shipments are sent via registered
                      courier services
                    </li>
                    <li>
                      International speed post is available for document
                      delivery
                    </li>
                    <li>
                      Tracking information will be provided for all
                      international shipments
                    </li>
                    <li>
                      Customs duties and taxes are the responsibility of the
                      buyer
                    </li>
                    <li>
                      Delivery times may vary based on destination country and
                      customs processing
                    </li>
                  </ul>
                </div>
              </div>

              {/* Domestic Shipping */}
              <div className="shippingpage-section">
                <div className="shippingpage-section-header">
                  <MapPin className="shippingpage-section-icon" />
                  <h3 className="shippingpage-section-title">
                    Domestic Shipping (India)
                  </h3>
                </div>
                <div className="shippingpage-section-content">
                  <p>
                    For domestic buyers, orders are shipped through registered
                    domestic courier companies and/or speed post only.
                  </p>
                  <ul>
                    <li>Trusted courier partners for reliable delivery</li>
                    <li>Speed post available for faster delivery options</li>
                    <li>
                      Real-time tracking provided for all domestic shipments
                    </li>
                    <li>
                      Cash on delivery may be available for select locations
                    </li>
                    <li>
                      Free shipping may apply for orders above certain value
                      thresholds
                    </li>
                  </ul>
                </div>
              </div>

              {/* Shipping Timeline */}
              <div className="shippingpage-section">
                <div className="shippingpage-section-header">
                  <Clock className="shippingpage-section-icon" />
                  <h3 className="shippingpage-section-title">
                    Shipping Timeline
                  </h3>
                </div>
                <div className="shippingpage-section-content">
                  <p>
                    Orders are shipped within 0-7 days or as per the delivery
                    date agreed at the time of order confirmation and delivering
                    of the shipment subject to Courier Company / post office
                    norms.
                  </p>
                  <ul>
                    <li>
                      <strong>Processing Time:</strong> 0-7 days from order
                      confirmation
                    </li>
                    <li>
                      <strong>Delivery Timeline:</strong> As agreed at time of
                      order confirmation
                    </li>
                    <li>
                      <strong>Digital Services:</strong> Delivered immediately
                      via email upon confirmation
                    </li>
                    <li>
                      <strong>Physical Documents:</strong> Shipped within 2-3
                      business days
                    </li>
                    <li>
                      <strong>Custom Products:</strong> Timeline specified
                      during order placement
                    </li>
                  </ul>
                </div>
              </div>

              {/* Delivery Terms & Liability */}
              <div className="shippingpage-section">
                <div className="shippingpage-section-header">
                  <Truck className="shippingpage-section-icon" />
                  <h3 className="shippingpage-section-title">
                    Delivery Terms & Liability
                  </h3>
                </div>
                <div className="shippingpage-section-content">
                  <p>
                    VOAT NETWORK PRIVATE LIMITED is not liable for any delay in
                    delivery by the courier company / postal authorities and
                    only guarantees to hand over the consignment to the courier
                    company or postal authorities within 0-7 days from the date
                    of the order and payment or as per the delivery date agreed
                    at the time of order confirmation.
                  </p>
                  <ul>
                    <li>
                      Delivery responsibility transfers to courier upon handover
                    </li>
                    <li>
                      Delays due to courier/postal authorities are beyond our
                      control
                    </li>
                    <li>Force majeure events may affect delivery timelines</li>
                    <li>
                      Multiple delivery attempts will be made by courier
                      partners
                    </li>
                    <li>
                      Undelivered packages will be returned to sender after
                      attempts
                    </li>
                  </ul>
                </div>
              </div>

              {/* Delivery Address */}
              <div className="shippingpage-section">
                <div className="shippingpage-section-header">
                  <MapPin className="shippingpage-section-icon" />
                  <h3 className="shippingpage-section-title">
                    Delivery Address & Requirements
                  </h3>
                </div>
                <div className="shippingpage-section-content">
                  <p>
                    Delivery of all orders will be to the address provided by
                    the buyer. Delivery of our services will be confirmed on
                    your mail ID as specified during registration.
                  </p>
                  <ul>
                    <li>
                      Accurate delivery address is customer's responsibility
                    </li>
                    <li>
                      Address changes after shipping may incur additional
                      charges
                    </li>
                    <li>PO Box deliveries available for documents only</li>
                    <li>Signature required for high-value shipments</li>
                    <li>
                      Digital services delivered to registered email address
                    </li>
                    <li>
                      Service confirmations sent via email upon completion
                    </li>
                  </ul>
                </div>
              </div>

              {/* Digital Service Delivery */}
              <div className="shippingpage-section">
                <div className="shippingpage-section-header">
                  <Globe className="shippingpage-section-icon" />
                  <h3 className="shippingpage-section-title">
                    Digital Service Delivery
                  </h3>
                </div>
                <div className="shippingpage-section-content">
                  <p>
                    Since VOAT Network primarily provides digital services, most
                    deliveries are electronic:
                  </p>
                  <ul>
                    <li>
                      <strong>Consultancy Reports:</strong> Delivered via secure
                      email within 24-48 hours
                    </li>
                    <li>
                      <strong>Digital Assets:</strong> Provided through cloud
                      storage links
                    </li>
                    <li>
                      <strong>Software Solutions:</strong> Access credentials
                      sent via email
                    </li>
                    <li>
                      <strong>Training Materials:</strong> Available in client
                      portal immediately
                    </li>
                    <li>
                      <strong>Certificates:</strong> Digital copies emailed,
                      physical copies shipped if requested
                    </li>
                  </ul>
                </div>
              </div>

              {/* Contact & Support */}
              <div className="shippingpage-section">
                <div className="shippingpage-section-header">
                  <Phone className="shippingpage-section-icon" />
                  <h3 className="shippingpage-section-title">
                    Contact & Support
                  </h3>
                </div>
                <div className="shippingpage-section-content">
                  <p>
                    For any issues in utilizing our services you may contact our
                    helpdesk on 7799770919 or admin@voatnetwork.in
                  </p>
                  <ul>
                    <li>
                      <strong>Phone:</strong> 7799770919
                    </li>
                    <li>
                      <strong>Email:</strong> admin@voatnetwork.in
                    </li>
                    <li>
                      <strong>Address:</strong> 13-68, RRV PURAM- 69 WARD,
                      Revenue Ward 69 Visakhapatnam Visakhapatnam ANDHRA PRADESH
                      531019
                    </li>
                  </ul>
                  <p>
                    Our support team is available during business hours to
                    assist with any shipping-related queries, tracking
                    information, or delivery concerns.
                  </p>
                </div>
              </div>

              {/* Acceptance Section - Commented out as in original */}
              {/* 
              <div className="shippingpage-acceptance-section">
                <div className="shippingpage-checkbox-container">
                  <label className="shippingpage-checkbox-label">
                    <input
                      type="checkbox"
                      checked={acceptedPolicy}
                      onChange={this.handleCheckboxChange}
                      className="shippingpage-checkbox"
                    />
                    <span className="shippingpage-checkbox-text">
                      I have read and understand the shipping and delivery policy terms, including shipping timelines, delivery liability, address requirements, and digital service delivery methods. I agree to abide by these terms for any services or products I order from VOAT Network.
                    </span>
                  </label>
                </div>
              </div>

              <div className="shippingpage-submit-container">
                <button
                  type="submit"
                  className={`shippingpage-submit-button ${
                    !acceptedPolicy ? "shippingpage-submit-disabled" : ""
                  }`}
                  disabled={!acceptedPolicy || isSubmitting}
                >
                  {isSubmitting
                    ? "Processing..."
                    : "Accept Shipping Policy & Continue"}
                </button>

                {!acceptedPolicy && (
                  <p className="shippingpage-submit-note">
                    Please accept the shipping policy terms to continue
                  </p>
                )}
              </div> */}
            </form>
          </div>
        </div>
      </div>
    );
  }
}

export default ShippingPolicyPage;
