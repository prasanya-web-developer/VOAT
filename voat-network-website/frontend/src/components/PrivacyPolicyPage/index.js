import { Component } from "react";
import { Link } from "react-router-dom";
import { Navigate } from "react-router-dom";
import {
  Home,
  Shield,
  Eye,
  Lock,
  Database,
  UserCheck,
  Cookie,
} from "lucide-react";
import "./index.css";

class PrivacyPolicyPage extends Component {
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
          general: "Please accept the privacy policy terms to continue.",
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

      // Update user data with privacy policy acceptance
      const updatedUserData = {
        ...userData,
        privacyPolicyAccepted: true,
        privacyPolicyAcceptedAt: new Date().toISOString(),
      };

      localStorage.setItem("user", JSON.stringify(updatedUserData));

      // Redirect to login page
      this.setState({ redirectToLogin: true });
    } catch (error) {
      console.error("Privacy policy submission error:", error);
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

    // Redirect to login page if privacy policy was accepted
    if (redirectToLogin) {
      return <Navigate to="/login" />;
    }

    return (
      <div className="privacypolicy-screen">
        <Link to="/" className="privacypolicy-home-button">
          <Home className="h-5 w-5" />
          <span>Home</span>
        </Link>

        <div className="privacypolicy-container">
          <div className="privacypolicy-header">
            <Shield className="privacypolicy-header-icon" />
            <h1 className="privacypolicy-title">Privacy Policy</h1>
            <p className="privacypolicy-subtitle">
              Please review and accept our privacy policy to continue using VOAT
              Network
            </p>
          </div>

          {errors.general && (
            <div className="privacypolicy-error-alert">{errors.general}</div>
          )}

          <div className="privacypolicy-content">
            <form onSubmit={this.handleSubmit} className="privacypolicy-form">
              {/* Introduction */}
              <div className="privacypolicy-section">
                <div className="privacypolicy-section-header">
                  <Shield className="privacypolicy-section-icon" />
                  <h3 className="privacypolicy-section-title">Introduction</h3>
                </div>
                <div className="privacypolicy-section-content">
                  <p>
                    <strong>Last updated on Jun 5 2025</strong>
                  </p>
                  <p>
                    This privacy policy sets out how VOAT NETWORK PRIVATE
                    LIMITED uses and protects any information that you give VOAT
                    NETWORK PRIVATE LIMITED when you visit their website and/or
                    agree to purchase from them.
                  </p>
                  <p>
                    VOAT NETWORK PRIVATE LIMITED is committed to ensuring that
                    your privacy is protected. Should we ask you to provide
                    certain information by which you can be identified when
                    using this website, then you can be assured that it will
                    only be used in accordance with this privacy statement.
                  </p>
                </div>
              </div>

              {/* Data Collection */}
              <div className="privacypolicy-section">
                <div className="privacypolicy-section-header">
                  <Database className="privacypolicy-section-icon" />
                  <h3 className="privacypolicy-section-title">
                    Information We Collect
                  </h3>
                </div>
                <div className="privacypolicy-section-content">
                  <p>We may collect the following information:</p>
                  <ul>
                    <li>Name</li>
                    <li>Contact information including email address</li>
                    <li>
                      Demographic information such as postcode, preferences and
                      interests, if required
                    </li>
                    <li>
                      Other information relevant to customer surveys and/or
                      offers
                    </li>
                  </ul>
                </div>
              </div>

              {/* Data Usage */}
              <div className="privacypolicy-section">
                <div className="privacypolicy-section-header">
                  <Eye className="privacypolicy-section-icon" />
                  <h3 className="privacypolicy-section-title">
                    How We Use Your Information
                  </h3>
                </div>
                <div className="privacypolicy-section-content">
                  <p>
                    We require this information to understand your needs and
                    provide you with a better service, and in particular for the
                    following reasons:
                  </p>
                  <ul>
                    <li>Internal record keeping</li>
                    <li>
                      We may use the information to improve our products and
                      services
                    </li>
                    <li>
                      We may periodically send promotional emails about new
                      products, special offers or other information which we
                      think you may find interesting using the email address
                      which you have provided
                    </li>
                    <li>
                      From time to time, we may also use your information to
                      contact you for market research purposes. We may contact
                      you by email, phone, fax or mail
                    </li>
                    <li>
                      We may use the information to customise the website
                      according to your interests
                    </li>
                  </ul>
                </div>
              </div>

              {/* Data Security */}
              <div className="privacypolicy-section">
                <div className="privacypolicy-section-header">
                  <Lock className="privacypolicy-section-icon" />
                  <h3 className="privacypolicy-section-title">Data Security</h3>
                </div>
                <div className="privacypolicy-section-content">
                  <p>
                    We are committed to ensuring that your information is
                    secure. In order to prevent unauthorised access or
                    disclosure we have put in suitable measures.
                  </p>
                </div>
              </div>

              {/* Cookie Policy */}
              <div className="privacypolicy-section">
                <div className="privacypolicy-section-header">
                  <Cookie className="privacypolicy-section-icon" />
                  <h3 className="privacypolicy-section-title">
                    How We Use Cookies
                  </h3>
                </div>
                <div className="privacypolicy-section-content">
                  <p>
                    A cookie is a small file which asks permission to be placed
                    on your computer's hard drive. Once you agree, the file is
                    added and the cookie helps analyze web traffic or lets you
                    know when you visit a particular site. Cookies allow web
                    applications to respond to you as an individual. The web
                    application can tailor its operations to your needs, likes
                    and dislikes by gathering and remembering information about
                    your preferences.
                  </p>
                  <p>
                    We use traffic log cookies to identify which pages are being
                    used. This helps us analyze data about webpage traffic and
                    improve our website in order to tailor it to customer needs.
                    We only use this information for statistical analysis
                    purposes and then the data is removed from the system.
                  </p>
                  <p>
                    You can choose to accept or decline cookies. Most web
                    browsers automatically accept cookies, but you can usually
                    modify your browser setting to decline cookies if you
                    prefer. This may prevent you from taking full advantage of
                    the website.
                  </p>
                </div>
              </div>

              {/* Personal Information Control */}
              <div className="privacypolicy-section">
                <div className="privacypolicy-section-header">
                  <UserCheck className="privacypolicy-section-icon" />
                  <h3 className="privacypolicy-section-title">
                    Controlling Your Personal Information
                  </h3>
                </div>
                <div className="privacypolicy-section-content">
                  <p>
                    You may choose to restrict the collection or use of your
                    personal information in the following ways:
                  </p>
                  <ul>
                    <li>
                      Whenever you are asked to fill in a form on the website,
                      look for the box that you can click to indicate that you
                      do not want the information to be used by anybody for
                      direct marketing purposes
                    </li>
                    <li>
                      If you have previously agreed to us using your personal
                      information for direct marketing purposes, you may change
                      your mind at any time by writing to or emailing us at
                      admin@voatnetwork.in
                    </li>
                  </ul>
                  <p>
                    We will not sell, distribute or lease your personal
                    information to third parties unless we have your permission
                    or are required by law to do so. We may use your personal
                    information to send you promotional information about third
                    parties which we think you may find interesting if you tell
                    us that you wish this to happen.
                  </p>
                  <p>
                    If you believe that any information we are holding on you is
                    incorrect or incomplete, please write to 13-68, RRV PURAM-
                    69 WARD, Revenue Ward 69 Visakhapatnam Visakhapatnam ANDHRA
                    PRADESH 531019 or contact us at 7799770919 or
                    admin@voatnetwork.in as soon as possible. We will promptly
                    correct any information found to be incorrect.
                  </p>
                </div>
              </div>

              {/* Single Acceptance Checkbox */}
              <div className="privacypolicy-acceptance-section">
                <div className="privacypolicy-checkbox-container">
                  <label className="privacypolicy-checkbox-label">
                    <input
                      type="checkbox"
                      checked={acceptedPolicy}
                      onChange={this.handleCheckboxChange}
                      className="privacypolicy-checkbox"
                    />
                    <span className="privacypolicy-checkbox-text">
                      I have read and agree to all the terms outlined in this
                      Privacy Policy, including data collection, usage, security
                      practices, cookie policy, and personal information
                      control. I understand my rights and consent to the
                      processing of my personal information as described above.
                    </span>
                  </label>
                </div>
              </div>

              {/* Submit Button */}
              <div className="privacypolicy-submit-container">
                <button
                  type="submit"
                  className={`privacypolicy-submit-button ${
                    !acceptedPolicy ? "privacypolicy-submit-disabled" : ""
                  }`}
                  disabled={!acceptedPolicy || isSubmitting}
                >
                  {isSubmitting
                    ? "Processing..."
                    : "Accept Privacy Policy & Continue"}
                </button>

                {!acceptedPolicy && (
                  <p className="privacypolicy-submit-note">
                    Please accept the privacy policy terms to continue
                  </p>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }
}

export default PrivacyPolicyPage;
