import { Component } from "react";
import { Link } from "react-router-dom";
import { HashLink } from "react-router-hash-link";
import {
  FaInstagram,
  FaWhatsapp,
  FaLinkedinIn,
  FaPhone,
  FaMapMarkerAlt,
  FaEnvelope,
  FaYoutube,
} from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import "./Footer.css";

class Footer extends Component {
  render() {
    return (
      <div className="footer-main-container">
        <div className="footer-content-container">
          {/* Logo, Description and About Section */}

          <div className="footer-column logo-about-container">
            <img
              src="https://res.cloudinary.com/dffu1ungl/image/upload/v1744022957/VOAT_Network_LOGO_cfdzrf.png"
              alt="logo"
            />
            <p>
              VOAT NETWORK supports startups and creative minds with the tools,
              guidance, and space they need to grow—without any initial
              investment.
            </p>
          </div>

          {/* Quick Links Section */}

          <div className="footer-column menu-list-container">
            <h1>Quick Links</h1>
            <div className="section-divider"></div>
            <ul>
              <li>
                <HashLink className="footer-links" to="/#home">
                  Home
                </HashLink>
              </li>
              <li>
                <HashLink className="footer-links" to="/#vision">
                  Our Vision
                </HashLink>
              </li>
              <li>
                <Link className="footer-links" to="/services">
                  Services
                </Link>
              </li>
              <li>
                <Link className="footer-links" to="/portfolio-list">
                  Portfolios
                </Link>
              </li>
              <li>
                <HashLink className="footer-links" to="#why-choose-us">
                  Why Choose Us
                </HashLink>
              </li>
            </ul>
          </div>

          {/* Contact Us Section */}

          <div className="footer-column footer-contact-container">
            <h1>Contact Us</h1>
            <div className="section-divider"></div>
            <div className="footer-icon-container">
              <div className="icon-circle">
                <FaEnvelope />
              </div>
              <p>voatnetwork@gmail.com</p>
            </div>
            <div className="footer-icon-container">
              <div className="icon-circle">
                <FaPhone />
              </div>
              <p>+91 7799770919</p>
            </div>
            <div className="footer-icon-container">
              <div className="icon-circle">
                <FaMapMarkerAlt />
              </div>
              <p>124; Hogward School of Magic</p>
            </div>
          </div>

          {/* Connect With Us Section */}

          <div className="footer-column footer-social-container">
            <h1>Connect With Us</h1>
            <div className="section-divider"></div>

            <div className="footer-icon-container">
              <div className="icon-circle">
                <FaWhatsapp />
              </div>
              <p>
                <a
                  href="https://wa.me/917799770919"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="social-media-icons-text"
                >
                  Whatsapp
                </a>
              </p>
            </div>
            <div className="footer-icon-container">
              <div className="icon-circle">
                <FaInstagram />
              </div>
              <p>
                <a
                  href="https://www.instagram.com/voatnetwork/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="social-media-icons-text"
                >
                  Instagram
                </a>
              </p>
            </div>
            <div className="footer-icon-container">
              <div className="icon-circle">
                <FaXTwitter />
              </div>
              <p>
                <a
                  href="https://x.com/voatnetwork"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="social-media-icons-text"
                >
                  X (Twitter)
                </a>
              </p>
            </div>
            <div className="footer-icon-container">
              <div className="icon-circle">
                <FaYoutube />
              </div>
              <p>
                <a
                  href="https://www.youtube.com/@voatnetwork/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="social-media-icons-text"
                >
                  YouTube
                </a>
              </p>
            </div>
            <div className="footer-icon-container">
              <div className="icon-circle">
                <FaLinkedinIn />
              </div>
              <p>
                <a
                  href="https://www.linkedin.com/company/voat-network/?viewAsMember=true"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="social-media-icons-text"
                >
                  LinkedIn
                </a>
              </p>
            </div>
          </div>
        </div>

        <hr className="footer-hr" />

        <div className="copy-right-container">
          <p>© 2024 VOAT Network. All rights reserved.</p>
        </div>
      </div>
    );
  }
}

export default Footer;
