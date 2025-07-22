import { Component } from "react";
import { Link } from "react-router-dom";
import { Navigate } from "react-router-dom";
import {
  Home,
  Shield,
  FileText,
  Scale,
  AlertTriangle,
  Lock,
} from "lucide-react";
import "./index.css";

class TermsConditionsPage extends Component {
  state = {
    acceptedTerms: false,
    isSubmitting: false,
    redirectToLogin: false,
    errors: {},
  };

  // Handle checkbox change
  handleCheckboxChange = () => {
    this.setState((prevState) => ({
      acceptedTerms: !prevState.acceptedTerms,
      errors: {}, // Clear errors when checkbox is toggled
    }));
  };

  // Handle form submission
  handleSubmit = async (e) => {
    e.preventDefault();

    if (!this.state.acceptedTerms) {
      this.setState({
        errors: {
          general: "Please accept the terms and conditions to continue.",
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

      // Update user data with terms acceptance
      const updatedUserData = {
        ...userData,
        termsAccepted: true,
        termsAcceptedAt: new Date().toISOString(),
      };

      localStorage.setItem("user", JSON.stringify(updatedUserData));

      // Redirect to login page
      this.setState({ redirectToLogin: true });
    } catch (error) {
      console.error("Terms submission error:", error);
      this.setState({
        errors: {
          general: "Something went wrong. Please try again.",
        },
        isSubmitting: false,
      });
    }
  };

  render() {
    const { acceptedTerms, isSubmitting, redirectToLogin, errors } = this.state;

    // Redirect to login page if terms were accepted
    if (redirectToLogin) {
      return <Navigate to="/login" />;
    }

    return (
      <div className="terms-screen">
        <Link to="/" className="terms-home-button">
          <Home className="h-5 w-5" />
          <span>Home</span>
        </Link>

        <div className="terms-container">
          <div className="terms-header">
            <Shield className="terms-header-icon" />
            <h1 className="terms-title">Terms & Conditions</h1>
            <p className="terms-subtitle">
              Please review and accept our terms and conditions to continue
              using VOAT Network
            </p>
          </div>

          {errors.general && (
            <div className="terms-error-alert">{errors.general}</div>
          )}

          <div className="terms-content">
            <form onSubmit={this.handleSubmit} className="terms-form">
              {/* Introduction */}
              <div className="terms-section">
                <div className="terms-section-header">
                  <FileText className="terms-section-icon" />
                  <h3 className="terms-section-title">Introduction</h3>
                </div>
                <div className="terms-section-content">
                  <p>
                    <strong>Last updated on Jun 5 2025</strong>
                  </p>
                  <p>
                    For the purpose of these Terms and Conditions, the term
                    "we", "us", "our" used anywhere on this page shall mean VOAT
                    NETWORK PRIVATE LIMITED, whose registered/operational office
                    is 13-68, RRV PURAM- 69 WARD, Revenue Ward 69 Visakhapatnam
                    Visakhapatnam ANDHRA PRADESH 531019. "You", "your", "user",
                    "visitor" shall mean any natural or legal person who is
                    visiting our website and/or agreed to purchase from us.
                  </p>
                </div>
              </div>

              {/* Website Usage */}
              <div className="terms-section">
                <div className="terms-section-header">
                  <Scale className="terms-section-icon" />
                  <h3 className="terms-section-title">Website Usage</h3>
                </div>
                <div className="terms-section-content">
                  <p>
                    Your use of the website and/or purchase from us are governed
                    by these Terms and Conditions. The content of the pages of
                    this website is subject to change without notice.
                  </p>
                  <p>
                    Your use of any information or materials on our website
                    and/or product pages is entirely at your own risk, for which
                    we shall not be liable. It shall be your own responsibility
                    to ensure that any products, services or information
                    available through our website and/or product pages meet your
                    specific requirements.
                  </p>
                </div>
              </div>

              {/* Warranties and Disclaimers */}
              <div className="terms-section">
                <div className="terms-section-header">
                  <AlertTriangle className="terms-section-icon" />
                  <h3 className="terms-section-title">
                    Warranties and Disclaimers
                  </h3>
                </div>
                <div className="terms-section-content">
                  <p>
                    Neither we nor any third parties provide any warranty or
                    guarantee as to the accuracy, timeliness, performance,
                    completeness or suitability of the information and materials
                    found or offered on this website for any particular purpose.
                    You acknowledge that such information and materials may
                    contain inaccuracies or errors and we expressly exclude
                    liability for any such inaccuracies or errors to the fullest
                    extent permitted by law.
                  </p>
                </div>
              </div>

              {/* Intellectual Property */}
              <div className="terms-section">
                <div className="terms-section-header">
                  <Lock className="terms-section-icon" />
                  <h3 className="terms-section-title">Intellectual Property</h3>
                </div>
                <div className="terms-section-content">
                  <p>
                    Our website contains material which is owned by or licensed
                    to us. This material includes, but is not limited to, the
                    design, layout, look, appearance and graphics. Reproduction
                    is prohibited other than in accordance with the copyright
                    notice, which forms part of these terms and conditions.
                  </p>
                  <p>
                    All trademarks reproduced in our website which are not the
                    property of, or licensed to, the operator are acknowledged
                    on the website. Unauthorized use of information provided by
                    us shall give rise to a claim for damages and/or be a
                    criminal offense.
                  </p>
                </div>
              </div>

              {/* External Links */}
              <div className="terms-section">
                <div className="terms-section-header">
                  <FileText className="terms-section-icon" />
                  <h3 className="terms-section-title">External Links</h3>
                </div>
                <div className="terms-section-content">
                  <p>
                    From time to time our website may also include links to
                    other websites. These links are provided for your
                    convenience to provide further information.
                  </p>
                  <p>
                    You may not create a link to our website from another
                    website or document without VOAT NETWORK PRIVATE LIMITED's
                    prior written consent.
                  </p>
                </div>
              </div>

              {/* Governing Law */}
              <div className="terms-section">
                <div className="terms-section-header">
                  <Scale className="terms-section-icon" />
                  <h3 className="terms-section-title">Governing Law</h3>
                </div>
                <div className="terms-section-content">
                  <p>
                    Any dispute arising out of use of our website and/or
                    purchase with us and/or any engagement with us is subject to
                    the laws of India.
                  </p>
                  <p>
                    We shall be under no liability whatsoever in respect of any
                    loss or damage arising directly or indirectly out of the
                    decline of authorization for any Transaction, on Account of
                    the Cardholder having exceeded the preset limit mutually
                    agreed by us with our acquiring bank from time to time.
                  </p>
                </div>
              </div>

              {/* Single Acceptance Checkbox */}
              <div className="terms-acceptance-section">
                <div className="terms-checkbox-container">
                  <label className="terms-checkbox-label">
                    <input
                      type="checkbox"
                      checked={acceptedTerms}
                      onChange={this.handleCheckboxChange}
                      className="terms-checkbox"
                    />
                    <span className="terms-checkbox-text">
                      I have read and agree to all the terms and conditions
                      outlined above. I understand that by using VOAT Network's
                      services, I am bound by these terms and any future updates
                      to them. I acknowledge that disputes will be governed by
                      Indian law.
                    </span>
                  </label>
                </div>
              </div>

              {/* Submit Button */}
              <div className="terms-submit-container">
                <button
                  type="submit"
                  className={`terms-submit-button ${
                    !acceptedTerms ? "terms-submit-disabled" : ""
                  }`}
                  disabled={!acceptedTerms || isSubmitting}
                >
                  {isSubmitting ? "Processing..." : "Accept Terms & Conditions"}
                </button>

                {!acceptedTerms && (
                  <p className="terms-submit-note">
                    Please accept the terms and conditions to continue
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

export default TermsConditionsPage;
