import { Component } from "react";
import NavBar from "../Navbar";
import Footer from "../Footer";
import {
  Mail,
  Instagram,
  Linkedin,
  Phone,
  MapPin,
  ArrowRight,
  Youtube,
} from "lucide-react";
import { FaWhatsapp, FaXTwitter } from "react-icons/fa6";

import "./index.css";

class ContactSection extends Component {
  state = {
    fullName: "",
    email: "",
    phone: "",
    profession: "",
    message: "",
  };

  handleSubmit = (e) => {
    e.preventDefault();
    console.log(this.state);
  };

  handleChange = (e) => {
    this.setState({
      [e.target.name]: e.target.value,
    });
  };

  render() {
    return (
      <>
        <NavBar />
        <div className="contact-container">
          {/* Contact Hero Banner Section */}
          <div className="hero-banner">
            <div className="hero-content">
              <h1 className="hero-title reveal-text">Contact Us</h1>
              <p className="hero-subtitle fade-in">
                Let's start a conversation
              </p>
              <div className="hero-divider slide-in"></div>
            </div>
          </div>

          <div className="main-container">
            {/* Contact Card Sections */}
            <div className="contact-cards-container slide-up">
              <div className="contact-cards">
                <div className="contact-card">
                  <div className="card-icon">
                    <Mail className="icon" />
                  </div>
                  <h4 className="card-title">Email</h4>
                  <p className="card-value">voatnetwork@gmail.com</p>
                </div>

                <div className="contact-card">
                  <div className="card-icon">
                    <Phone className="icon" />
                  </div>
                  <h4 className="card-title">Phone</h4>
                  <p className="card-value">+91 7799770919</p>
                </div>

                <div className="contact-card">
                  <div className="card-icon">
                    <MapPin className="icon" />
                  </div>
                  <h4 className="card-title">Address</h4>
                  <p className="card-value">124; Hogward School of Magic</p>
                </div>
              </div>
            </div>

            {/* Contact Form Section */}
            <div className="form-container">
              <div className="form-panel fade-in-up">
                <h2 className="form-title">Send us a Message</h2>
                <form onSubmit={this.handleSubmit} className="contact-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="fullName" className="form-label">
                        Full Name <span className="required">*</span>
                      </label>
                      <input
                        type="text"
                        id="fullName"
                        name="fullName"
                        required
                        value={this.state.fullName}
                        onChange={this.handleChange}
                        className="form-input"
                        placeholder="Enter your full name"
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="email" className="form-label">
                        Email <span className="required">*</span>
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        required
                        value={this.state.email}
                        onChange={this.handleChange}
                        className="form-input"
                        placeholder="example@gmail.com"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="phone" className="form-label">
                        Phone Number <span className="required">*</span>
                      </label>
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        required
                        value={this.state.phone}
                        onChange={this.handleChange}
                        className="form-input"
                        placeholder="+91 "
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="profession" className="form-label">
                        Profession <span className="required">*</span>
                      </label>
                      <input
                        type="text"
                        id="profession"
                        name="profession"
                        required
                        value={this.state.profession}
                        onChange={this.handleChange}
                        className="form-input"
                        placeholder="Web Developer"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="message" className="form-label">
                      Message <span className="required">*</span>
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      required
                      value={this.state.message}
                      onChange={this.handleChange}
                      rows={5}
                      className="form-textarea"
                      placeholder="Your message here..."
                    />
                  </div>

                  <button type="submit" className="submit-button">
                    <span>Send Message</span>
                    <ArrowRight className="button-icon" />
                  </button>
                </form>
              </div>
            </div>

            {/* Social Media Links Section */}
            <div className="social-container fade-in">
              <h3 className="social-title">Connect With Us</h3>
              <div className="social-icons">
                <a
                  href="mailto:voatnetwork@gmail.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="social-link"
                >
                  <Mail className="social-icon" />
                </a>
                <a
                  href="https://wa.me/917799770919"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="social-link"
                >
                  <FaWhatsapp className="social-icon" />
                </a>
                <a
                  href="https://instagram.com/voatnetwork"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="social-link"
                >
                  <Instagram className="social-icon" />
                </a>
                <a
                  href="https://linkedin.com/company/voatnetwork"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="social-link"
                >
                  <Linkedin className="social-icon" />
                </a>
                <a
                  href="https://x.com/voatnetwork"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="social-link"
                >
                  <FaXTwitter className="social-icon" />
                </a>
                <a
                  href="https://youtube.com/@voatnetwork"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="social-link"
                >
                  <Youtube className="social-icon" />
                </a>
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }
}

export default ContactSection;
