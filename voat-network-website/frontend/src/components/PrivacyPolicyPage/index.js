import { Component } from "react";
import { Link } from "react-router-dom";
import { Navigate } from "react-router-dom";
import { Home, Shield, Eye, Lock, Database, UserCheck } from "lucide-react";
import "./index.css";

class PrivacyPolicyPage extends Component {
  state = {
    checkedItems: {
      dataCollection: false,
      dataUsage: false,
      dataSharing: false,
      dataProtection: false,
      userRights: false,
      cookiePolicy: false,
      termsConditions: false,
    },
    allChecked: false,
    isSubmitting: false,
    redirectToLogin: false,
    errors: {},
  };

  // Check if all items are checked
  checkAllItems = () => {
    const { checkedItems } = this.state;
    const allChecked = Object.values(checkedItems).every(
      (item) => item === true
    );
    this.setState({ allChecked });
  };

  // Handle checkbox change
  handleCheckboxChange = (itemName) => {
    this.setState(
      (prevState) => ({
        checkedItems: {
          ...prevState.checkedItems,
          [itemName]: !prevState.checkedItems[itemName],
        },
      }),
      () => {
        this.checkAllItems();
      }
    );
  };

  // Handle form submission
  handleSubmit = async (e) => {
    e.preventDefault();

    if (!this.state.allChecked) {
      this.setState({
        errors: {
          general: "Please accept all privacy policy terms to continue.",
        },
      });
      return;
    }

    this.setState({ isSubmitting: true, errors: {} });

    try {
      // Get user data from localStorage
      const userData = JSON.parse(localStorage.getItem("user") || "{}");

      // You can add API call here to update user's privacy policy acceptance
      // For now, we'll just simulate the process

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
    const { checkedItems, allChecked, isSubmitting, redirectToLogin, errors } =
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
              {/* Data Collection */}
              <div className="privacypolicy-section">
                <div className="privacypolicy-section-header">
                  <Database className="privacypolicy-section-icon" />
                  <h3 className="privacypolicy-section-title">
                    Data Collection
                  </h3>
                </div>
                <div className="privacypolicy-section-content">
                  <p>
                    We collect information you provide directly to us, such as
                    when you create an account, update your profile, or contact
                    us. This includes your name, email address, phone number,
                    profession, and any other information you choose to provide.
                  </p>
                  <div className="privacypolicy-checkbox-container">
                    <label className="privacypolicy-checkbox-label">
                      <input
                        type="checkbox"
                        checked={checkedItems.dataCollection}
                        onChange={() =>
                          this.handleCheckboxChange("dataCollection")
                        }
                        className="privacypolicy-checkbox"
                      />
                      <span className="privacypolicy-checkbox-text">
                        I understand and accept the data collection practices
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Data Usage */}
              <div className="privacypolicy-section">
                <div className="privacypolicy-section-header">
                  <Eye className="privacypolicy-section-icon" />
                  <h3 className="privacypolicy-section-title">Data Usage</h3>
                </div>
                <div className="privacypolicy-section-content">
                  <p>
                    We use the information we collect to provide, maintain, and
                    improve our services, process transactions, send
                    communications, and protect VOAT Network and our users. We
                    may also use your information to personalize your experience
                    and show relevant content.
                  </p>
                  <div className="privacypolicy-checkbox-container">
                    <label className="privacypolicy-checkbox-label">
                      <input
                        type="checkbox"
                        checked={checkedItems.dataUsage}
                        onChange={() => this.handleCheckboxChange("dataUsage")}
                        className="privacypolicy-checkbox"
                      />
                      <span className="privacypolicy-checkbox-text">
                        I agree to the data usage practices described above
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Data Sharing */}
              <div className="privacypolicy-section">
                <div className="privacypolicy-section-header">
                  <UserCheck className="privacypolicy-section-icon" />
                  <h3 className="privacypolicy-section-title">Data Sharing</h3>
                </div>
                <div className="privacypolicy-section-content">
                  <p>
                    We do not sell, trade, or otherwise transfer your personal
                    information to third parties without your consent, except as
                    described in this policy. We may share information with
                    trusted partners who assist us in operating our platform,
                    conducting business, or serving users.
                  </p>
                  <div className="privacypolicy-checkbox-container">
                    <label className="privacypolicy-checkbox-label">
                      <input
                        type="checkbox"
                        checked={checkedItems.dataSharing}
                        onChange={() =>
                          this.handleCheckboxChange("dataSharing")
                        }
                        className="privacypolicy-checkbox"
                      />
                      <span className="privacypolicy-checkbox-text">
                        I understand the data sharing policies
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Data Protection */}
              <div className="privacypolicy-section">
                <div className="privacypolicy-section-header">
                  <Lock className="privacypolicy-section-icon" />
                  <h3 className="privacypolicy-section-title">
                    Data Protection
                  </h3>
                </div>
                <div className="privacypolicy-section-content">
                  <p>
                    We implement appropriate security measures to protect your
                    personal information against unauthorized access,
                    alteration, disclosure, or destruction. We use SSL
                    encryption, secure servers, and regular security audits to
                    safeguard your data.
                  </p>
                  <div className="privacypolicy-checkbox-container">
                    <label className="privacypolicy-checkbox-label">
                      <input
                        type="checkbox"
                        checked={checkedItems.dataProtection}
                        onChange={() =>
                          this.handleCheckboxChange("dataProtection")
                        }
                        className="privacypolicy-checkbox"
                      />
                      <span className="privacypolicy-checkbox-text">
                        I acknowledge the data protection measures
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {/* User Rights */}
              <div className="privacypolicy-section">
                <div className="privacypolicy-section-header">
                  <UserCheck className="privacypolicy-section-icon" />
                  <h3 className="privacypolicy-section-title">Your Rights</h3>
                </div>
                <div className="privacypolicy-section-content">
                  <p>
                    You have the right to access, update, or delete your
                    personal information. You can also object to processing,
                    request data portability, and withdraw consent at any time.
                    To exercise these rights, please contact us through our
                    support channels.
                  </p>
                  <div className="privacypolicy-checkbox-container">
                    <label className="privacypolicy-checkbox-label">
                      <input
                        type="checkbox"
                        checked={checkedItems.userRights}
                        onChange={() => this.handleCheckboxChange("userRights")}
                        className="privacypolicy-checkbox"
                      />
                      <span className="privacypolicy-checkbox-text">
                        I understand my rights regarding my personal data
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Cookie Policy */}
              <div className="privacypolicy-section">
                <div className="privacypolicy-section-header">
                  <Database className="privacypolicy-section-icon" />
                  <h3 className="privacypolicy-section-title">Cookie Policy</h3>
                </div>
                <div className="privacypolicy-section-content">
                  <p>
                    We use cookies and similar technologies to enhance your
                    experience, analyze usage patterns, and personalize content.
                    You can control cookie settings through your browser
                    preferences, though some features may not function properly
                    without cookies.
                  </p>
                  <div className="privacypolicy-checkbox-container">
                    <label className="privacypolicy-checkbox-label">
                      <input
                        type="checkbox"
                        checked={checkedItems.cookiePolicy}
                        onChange={() =>
                          this.handleCheckboxChange("cookiePolicy")
                        }
                        className="privacypolicy-checkbox"
                      />
                      <span className="privacypolicy-checkbox-text">
                        I accept the use of cookies as described
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Terms and Conditions */}
              <div className="privacypolicy-section">
                <div className="privacypolicy-section-header">
                  <Shield className="privacypolicy-section-icon" />
                  <h3 className="privacypolicy-section-title">
                    Terms and Conditions
                  </h3>
                </div>
                <div className="privacypolicy-section-content">
                  <p>
                    By using VOAT Network, you agree to our Terms of Service and
                    this Privacy Policy. These terms govern your use of our
                    platform and services. We may update these terms from time
                    to time, and continued use constitutes acceptance of any
                    changes.
                  </p>
                  <div className="privacypolicy-checkbox-container">
                    <label className="privacypolicy-checkbox-label">
                      <input
                        type="checkbox"
                        checked={checkedItems.termsConditions}
                        onChange={() =>
                          this.handleCheckboxChange("termsConditions")
                        }
                        className="privacypolicy-checkbox"
                      />
                      <span className="privacypolicy-checkbox-text">
                        I agree to the Terms and Conditions
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="privacypolicy-submit-container">
                <button
                  type="submit"
                  className={`privacypolicy-submit-button ${
                    !allChecked ? "privacypolicy-submit-disabled" : ""
                  }`}
                  disabled={!allChecked || isSubmitting}
                >
                  {isSubmitting
                    ? "Processing..."
                    : "Accept Privacy Policy & Continue"}
                </button>

                {!allChecked && (
                  <p className="privacypolicy-submit-note">
                    Please accept all terms above to continue
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
