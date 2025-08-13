import { Component } from "react";
import { Link } from "react-router-dom";
import { Navigate } from "react-router-dom";
import {
  Home,
  XCircle,
  Clock,
  RefreshCw,
  AlertCircle,
  Phone,
  Shield,
} from "lucide-react";
import "./index.css";

class CancellationPolicyPage extends Component {
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
          general: "Please accept the cancellation policy terms to continue.",
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

      // Update user data with cancellation policy acceptance
      const updatedUserData = {
        ...userData,
        cancellationPolicyAccepted: true,
        cancellationPolicyAcceptedAt: new Date().toISOString(),
      };

      localStorage.setItem("user", JSON.stringify(updatedUserData));

      // Redirect to login page
      this.setState({ redirectToLogin: true });
    } catch (error) {
      console.error("Cancellation policy submission error:", error);
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

    // Redirect to login page if cancellation policy was accepted
    if (redirectToLogin) {
      return <Navigate to="/login" />;
    }

    return (
      <div className="cancellationpage-screen">
        <Link to="/" className="cancellationpage-home-button">
          <Home className="h-5 w-5" />
          <span>Home</span>
        </Link>

        <div className="cancellationpage-container">
          <div className="cancellationpage-header">
            <XCircle className="cancellationpage-header-icon" />
            <h1 className="cancellationpage-title">Cancellation Policy</h1>
            <p className="cancellationpage-subtitle">
              Please review our cancellation and refund policy for VOAT Network
              services
            </p>
          </div>

          {errors.general && (
            <div className="cancellationpage-error-alert">{errors.general}</div>
          )}

          <div className="cancellationpage-content">
            <form
              onSubmit={this.handleSubmit}
              className="cancellationpage-form"
            >
              {/* Introduction */}
              <div className="cancellationpage-section">
                <div className="cancellationpage-section-header">
                  <Shield className="cancellationpage-section-icon" />
                  <h3 className="cancellationpage-section-title">
                    Introduction
                  </h3>
                </div>
                <div className="cancellationpage-section-content">
                  <p>
                    <strong>Last updated on Jun 5 2025</strong>
                  </p>
                  <p>
                    This cancellation policy outlines the terms and conditions
                    for cancelling services provided by VOAT NETWORK PRIVATE
                    LIMITED. As we provide digital services, consultancy, and
                    business support solutions, this policy is specifically
                    designed for service-based offerings rather than physical
                    products.
                  </p>
                  <p>
                    We understand that circumstances may change, and we strive
                    to provide fair and transparent cancellation terms while
                    protecting the interests of both our clients and our
                    business operations.
                  </p>
                </div>
              </div>

              {/* Cancellation Timeline */}
              <div className="cancellationpage-section">
                <div className="cancellationpage-section-header">
                  <Clock className="cancellationpage-section-icon" />
                  <h3 className="cancellationpage-section-title">
                    Cancellation Timeline
                  </h3>
                </div>
                <div className="cancellationpage-section-content">
                  <p>
                    Cancellation requests must be submitted according to the
                    following timeline:
                  </p>
                  <ul>
                    <li>
                      <strong>Consultation Services:</strong> Can be cancelled
                      up to 24 hours before the scheduled appointment without
                      penalty
                    </li>
                    <li>
                      <strong>Project-based Services:</strong> Can be cancelled
                      within 48 hours of project initiation if work has not
                      commenced
                    </li>
                    <li>
                      <strong>Monthly/Ongoing Services:</strong> Require 30 days
                      written notice for cancellation
                    </li>
                    <li>
                      <strong>Training Programs:</strong> Can be cancelled up to
                      7 days before the program start date
                    </li>
                  </ul>
                </div>
              </div>

              {/* Refund Policy */}
              <div className="cancellationpage-section">
                <div className="cancellationpage-section-header">
                  <RefreshCw className="cancellationpage-section-icon" />
                  <h3 className="cancellationpage-section-title">
                    Refund Policy
                  </h3>
                </div>
                <div className="cancellationpage-section-content">
                  <p>
                    Refunds are processed based on the type of service and
                    timing of cancellation:
                  </p>
                  <ul>
                    <li>
                      <strong>Full Refund (100%):</strong> Cancellations made
                      within the specified timeline before service commencement
                    </li>
                    <li>
                      <strong>Partial Refund (50%):</strong> Cancellations made
                      after service has begun but before 25% completion
                    </li>
                    <li>
                      <strong>No Refund:</strong> Cancellations made after 25%
                      service completion or outside the specified timeline
                    </li>
                    <li>
                      <strong>Consultation Fees:</strong> Non-refundable if
                      cancelled within 24 hours of appointment
                    </li>
                  </ul>
                  <p>
                    All refunds will be processed within 7-14 business days to
                    the original payment method used for the transaction.
                  </p>
                </div>
              </div>

              {/* Non-Cancellable Services */}
              <div className="cancellationpage-section">
                <div className="cancellationpage-section-header">
                  <AlertCircle className="cancellationpage-section-icon" />
                  <h3 className="cancellationpage-section-title">
                    Non-Cancellable Services
                  </h3>
                </div>
                <div className="cancellationpage-section-content">
                  <p>
                    Certain services cannot be cancelled once initiated due to
                    their nature:
                  </p>
                  <ul>
                    <li>
                      Custom software development after code delivery has begun
                    </li>
                    <li>
                      Business registration and legal documentation services
                      once filing has started
                    </li>
                    <li>
                      Third-party service integrations that have been
                      implemented
                    </li>
                    <li>
                      Completed consultation sessions or delivered digital
                      assets
                    </li>
                    <li>
                      Services that have been fully delivered or completed
                    </li>
                  </ul>
                </div>
              </div>

              {/* Emergency Cancellations */}
              <div className="cancellationpage-section">
                <div className="cancellationpage-section-header">
                  <AlertCircle className="cancellationpage-section-icon" />
                  <h3 className="cancellationpage-section-title">
                    Emergency Cancellations
                  </h3>
                </div>
                <div className="cancellationpage-section-content">
                  <p>
                    In case of emergencies or unforeseen circumstances (medical
                    emergencies, natural disasters, etc.), we may consider
                    exceptions to our standard cancellation policy on a
                    case-by-case basis.
                  </p>
                  <p>
                    Such requests must be accompanied by appropriate
                    documentation and will be reviewed by our management team
                    within 48 hours.
                  </p>
                </div>
              </div>

              {/* How to Cancel */}
              <div className="cancellationpage-section">
                <div className="cancellationpage-section-header">
                  <Phone className="cancellationpage-section-icon" />
                  <h3 className="cancellationpage-section-title">
                    How to Request Cancellation
                  </h3>
                </div>
                <div className="cancellationpage-section-content">
                  <p>
                    To request a cancellation, please contact us through any of
                    the following methods:
                  </p>
                  <ul>
                    <li>
                      <strong>Email:</strong> admin@voatnetwork.in
                    </li>
                    <li>
                      <strong>Phone:</strong> 7799770919
                    </li>
                    <li>
                      <strong>Address:</strong> 13-68, RRV PURAM- 69 WARD,
                      Revenue Ward 69 Visakhapatnam Visakhapatnam ANDHRA PRADESH
                      531019
                    </li>
                  </ul>
                  <p>
                    Please include your order/service reference number, reason
                    for cancellation, and preferred refund method in your
                    cancellation request.
                  </p>
                  <p>
                    All cancellation requests will be acknowledged within 24
                    hours, and processing will be completed within 3-5 business
                    days.
                  </p>
                </div>
              </div>

              {/* Acceptance Section - Commented out as in original */}
              {/* 
              <div className="cancellationpage-acceptance-section">
                <div className="cancellationpage-checkbox-container">
                  <label className="cancellationpage-checkbox-label">
                    <input
                      type="checkbox"
                      checked={acceptedPolicy}
                      onChange={this.handleCheckboxChange}
                      className="cancellationpage-checkbox"
                    />
                    <span className="cancellationpage-checkbox-text">
                      I have read and understand the cancellation policy terms and conditions, including the refund timelines, non-cancellable services, and the process for requesting cancellations. I agree to abide by these terms for any services I engage with VOAT Network.
                    </span>
                  </label>
                </div>
              </div>

              <div className="cancellationpage-submit-container">
                <button
                  type="submit"
                  className={`cancellationpage-submit-button ${
                    !acceptedPolicy ? "cancellationpage-submit-disabled" : ""
                  }`}
                  disabled={!acceptedPolicy || isSubmitting}
                >
                  {isSubmitting
                    ? "Processing..."
                    : "Accept Cancellation Policy & Continue"}
                </button>

                {!acceptedPolicy && (
                  <p className="cancellationpage-submit-note">
                    Please accept the cancellation policy terms to continue
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

export default CancellationPolicyPage;
