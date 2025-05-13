import React, { Component } from "react";
import { Link } from "react-router-dom";
import NavBar from "../Navbar";
import Footer from "../Footer";
import ErrorBoundary from "../ErrorBoundary";
import "./index.css";
import {
  Code,
  Megaphone,
  Users,
  Palette,
  Globe,
  Rocket,
  Target,
  Zap,
  Shield,
  ArrowRight,
  Calculator,
  Camera,
  Sparkles,
  Lightbulb,
  Award,
  Mail,
  Instagram,
  Linkedin,
  Phone,
  MapPin,
  Youtube,
} from "lucide-react";
import { FaWhatsapp, FaXTwitter } from "react-icons/fa6";

class LandingPage extends Component {
  state = {
    currentSlide: 0,
    images: [
      "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&h=1080",
      "https://images.unsplash.com/photo-1497366811353-6870744d04b2?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&h=1080",
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&h=1080",
    ],
    servicesInView: false,
    visionInView: false,
    chooseUsInView: false,
    contactInView: false,
    // Contact form state
    fullName: "",
    email: "",
    phone: "",
    profession: "",
    message: "",
  };

  //scroll animations
  servicesRef = React.createRef();
  visionRef = React.createRef();
  chooseUsRef = React.createRef();
  contactRef = React.createRef();

  componentDidMount() {
    this.slideInterval = setInterval(this.nextSlide.bind(this), 5000);
    window.addEventListener("scroll", this.handleScroll);
    this.handleScroll();
  }

  componentWillUnmount() {
    clearInterval(this.slideInterval);
    window.removeEventListener("scroll", this.handleScroll);
  }

  nextSlide() {
    this.setState({
      currentSlide: (this.state.currentSlide + 1) % this.state.images.length,
    });
  }

  setSlide = (index) => {
    clearInterval(this.slideInterval);
    this.setState({ currentSlide: index });
    this.slideInterval = setInterval(this.nextSlide.bind(this), 5000);
  };

  isElementInViewport = (el) => {
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    return (
      rect.top <=
        (window.innerHeight || document.documentElement.clientHeight) * 0.8 &&
      rect.bottom >= 0
    );
  };

  handleScroll = () => {
    this.setState({
      servicesInView: this.isElementInViewport(this.servicesRef.current),
      visionInView: this.isElementInViewport(this.visionRef.current),
      chooseUsInView: this.isElementInViewport(this.chooseUsRef.current),
      contactInView: this.isElementInViewport(this.contactRef.current),
    });
  };

  // Contact form methods
  handleSubmit = (e) => {
    e.preventDefault();
    console.log({
      fullName: this.state.fullName,
      email: this.state.email,
      phone: this.state.phone,
      profession: this.state.profession,
      message: this.state.message,
    });
    // Add your form submission logic here
  };

  handleChange = (e) => {
    this.setState({
      [e.target.name]: e.target.value,
    });
  };

  render() {
    const visionPoints = [
      {
        icon: <Rocket />,
        title: "Innovation",
        description:
          "Fostering groundbreaking ideas and solutions that push boundaries and create new possibilities.",
      },
      {
        icon: <Users />,
        title: "Collaboration",
        description:
          "Building strong partnerships for mutual growth, sharing knowledge and resources for success.",
      },
      {
        icon: <Target />,
        title: "Growth",
        description:
          "Driving sustainable business expansion through strategic planning and market adaptation.",
      },
      {
        icon: <Lightbulb />,
        title: "Creativity",
        description:
          "Encouraging fresh perspectives and unique approaches to solve complex business challenges.",
      },
      {
        icon: <Award />,
        title: "Excellence",
        description:
          "Striving for the highest standards in everything we do to deliver superior results.",
      },
      {
        icon: <Sparkles />,
        title: "Inspiration",
        description:
          "Motivating teams and businesses to reach their full potential through visionary leadership.",
      },
    ];

    const chooseUsPoints = [
      {
        icon: <Zap />,
        title: "Innovative Approach",
        description:
          "We combine creativity with strategic thinking to deliver unique solutions that set your business apart.",
      },
      {
        icon: <Shield />,
        title: "Proven Expertise",
        description:
          "Our team brings years of experience and a track record of successful business transformations.",
      },
      {
        icon: <Users />,
        title: "Dedicated Support",
        description:
          "We're committed to your success with personalized guidance every step of the way.",
      },
    ];

    const carouselServices = [
      {
        title: "Web Development",
        description:
          "Custom websites and applications with cutting-edge technology",
      },
      {
        title: "Digital Marketing",
        description: "Strategic solutions to boost your online presence",
      },
      {
        title: "Brand Design",
        description: "Creative branding that makes your business stand out",
      },
    ];

    return (
      <>
        <ErrorBoundary>
          <NavBar />
        </ErrorBoundary>
        <div className="landing-page">
          {/* Hero Section - Updated Modern Design */}
          <section className="landing-page-hero">
            <div className="landing-page-carousel-slides-container">
              {this.state.images.map((image, index) => (
                <div
                  key={index}
                  className={`landing-page-carousel-slide ${
                    index === this.state.currentSlide ? "active" : ""
                  }`}
                >
                  <div className="landing-page-carousel-overlay"></div>
                  <img src={image} alt={`Slide ${index + 1}`} />
                </div>
              ))}
            </div>

            <div className="landing-page-hero-content-wrapper">
              <div className="landing-page-hero-content">
                <h1 className="landing-page-hero-title">
                  Empowering
                  <br />
                  Innovation{" "}
                  <span className="landing-page-text-gradient">&</span>
                  <br />
                  <span className="landing-page-text-gradient">Growth</span>
                </h1>
                <p className="landing-page-hero-description">
                  We help startups and businesses transform their ideas into
                  successful realities with our comprehensive digital solutions.
                </p>
                <div className="landing-page-hero-buttons">
                  <a
                    href="#services"
                    className="landing-page-button landing-page-button-primary"
                  >
                    Our Services
                    <ArrowRight className="landing-page-button-icon" />
                  </a>
                  <a
                    href="#contact"
                    className="landing-page-button landing-page-button-outline"
                  >
                    Get In Touch
                  </a>
                </div>
              </div>
            </div>

            <div className="landing-page-service-content-card">
              <h2>{carouselServices[this.state.currentSlide].title}</h2>
              <p>{carouselServices[this.state.currentSlide].description}</p>
            </div>

            <div className="landing-page-carousel-indicators">
              {this.state.images.map((_, index) => (
                <button
                  key={index}
                  className={`landing-page-indicator ${
                    index === this.state.currentSlide ? "active" : ""
                  }`}
                  onClick={() => this.setSlide(index)}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          </section>

          {/* Services Section - Updated with Modern Design */}
          <section
            className={`landing-page-services-section ${
              this.state.servicesInView ? "in-view" : ""
            }`}
            ref={this.servicesRef}
            id="services"
          >
            <div className="landing-page-services-blob landing-page-services-blob-1"></div>
            <div className="landing-page-services-blob landing-page-services-blob-2"></div>

            <div className="landing-page-container">
              <div className="landing-page-section-header">
                <h2 className="landing-page-section-title">Our Services</h2>
                <p className="landing-page-services-description">
                  We offer a comprehensive range of digital services to help
                  your business thrive in the online world and achieve
                  sustainable growth.
                </p>
              </div>

              <div className="landing-page-services-grid">
                {[
                  {
                    icon: <Code size={28} />,
                    title: "Web Development",
                    description:
                      "Custom websites and web applications built with cutting-edge technology that deliver exceptional user experiences.",
                  },
                  {
                    icon: <Megaphone size={28} />,
                    title: "Digital Marketing",
                    description:
                      "Strategic digital marketing solutions to boost your online presence and reach your target audience effectively.",
                  },
                  {
                    icon: <Globe size={28} />,
                    title: "SEO & SMM",
                    description:
                      "Optimize your search rankings and social media presence to connect with your audience and drive organic growth.",
                  },
                  {
                    icon: <Palette size={28} />,
                    title: "Brand Development",
                    description:
                      "Creative branding solutions that make your business stand out with a memorable and impactful identity.",
                  },
                  {
                    icon: <Calculator size={28} />,
                    title: "Taxation",
                    description:
                      "Expert tax planning and preparation services to optimize your financial position and ensure compliance.",
                  },
                  {
                    icon: <Camera size={28} />,
                    title: "Photo & Video Editing",
                    description:
                      "Professional photo and video editing services to create stunning visual content for your brand.",
                  },
                ].map((service, index) => (
                  <div
                    key={index}
                    className={`landing-page-service-card landing-page-service-card-${
                      index + 1
                    }`}
                  >
                    <div className="landing-page-service-content">
                      <div className="landing-page-service-icon-wrapper">
                        {service.icon}
                      </div>
                      <h3>{service.title}</h3>
                      <p>{service.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="landing-page-services-view-all">
                <Link
                  to={"/services"}
                  className="landing-page-button landing-page-button-primary"
                >
                  View more
                  <ArrowRight className="landing-page-button-icon" />
                </Link>
              </div>
            </div>
          </section>

          {/* Why Choose Us Section - Modernized */}
          <section
            className={`landing-page-choose-us-section ${
              this.state.chooseUsInView ? "in-view" : ""
            }`}
            ref={this.chooseUsRef}
            id="why-choose-us"
          >
            <div className="landing-page-container">
              <h2 className="landing-page-section-title">Why Choose Us</h2>

              <div className="landing-page-choose-us-content">
                <div className="landing-page-choose-us-statement">
                  <h3>What Sets Us Apart</h3>
                  <p>
                    At VOAT NETWORK, we have a unique approach that focuses on
                    fostering creativity and innovation. We believe in
                    empowering individuals and businesses by providing them with
                    the support they need to thrive.
                  </p>
                  <p>
                    Our platform is designed to connect people with fresh ideas
                    to the resources and expertise they need to bring those
                    ideas to life.
                  </p>
                  <a
                    href="#contact"
                    className="landing-page-button landing-page-button-light"
                  >
                    Partner With Us <ArrowRight size={18} />
                  </a>
                </div>

                <div className="landing-page-choose-us-points">
                  {chooseUsPoints.map((point, index) => (
                    <div
                      key={index}
                      className={`landing-page-choose-us-point landing-page-choose-us-point-${
                        index + 1
                      }`}
                    >
                      <div className="landing-page-choose-us-icon-wrapper">
                        {point.icon}
                      </div>
                      <div className="landing-page-choose-us-point-content">
                        <h3>{point.title}</h3>
                        <p>{point.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="landing-page-choose-us-shape"></div>
          </section>

          {/* Vision Section - Redesigned with Modern UI */}
          <section
            className={`landing-page-vision-section-new ${
              this.state.visionInView ? "in-view" : ""
            }`}
            ref={this.visionRef}
            id="vision"
          >
            <div className="landing-page-vision-waves"></div>
            {/* Removed orb-1 which was on the top right */}
            <div className="landing-page-vision-orb orb-2"></div>
            <div className="landing-page-vision-orb orb-3"></div>

            <div className="landing-page-container">
              <div className="landing-page-section-header">
                <h2 className="landing-page-section-title landing-page-vision-title">
                  Our Vision
                </h2>
                <div className="landing-page-vision-subtitle-container">
                  <span className="landing-page-vision-subtitle-line"></span>
                  <p className="landing-page-vision-subtitle">
                    Shaping the future together
                  </p>
                  <span className="landing-page-vision-subtitle-line"></span>
                </div>
                <p className="landing-page-vision-description">
                  To empower startups by fostering innovation, collaboration,
                  and growth, creating a thriving ecosystem where entrepreneurs
                  uplift each other and achieve sustainable success together.
                </p>
              </div>

              <div className="landing-page-vision-cards-grid">
                {visionPoints.map((point, index) => (
                  <div
                    key={index}
                    className={`landing-page-vision-card-new landing-page-vision-card-${
                      index + 1
                    }`}
                  >
                    <div className="landing-page-vision-card-inner">
                      <div className="landing-page-vision-icon-wrapper-new">
                        {point.icon}
                      </div>
                      <h3>{point.title}</h3>
                      <p>{point.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Contact Us Section - Styled like other sections */}
          <section
            className={`landing-page-contact-section ${
              this.state.contactInView ? "in-view" : ""
            }`}
            ref={this.contactRef}
            id="contact"
          >
            <div className="landing-page-contact-blob landing-page-contact-blob-1"></div>
            <div className="landing-page-contact-blob landing-page-contact-blob-2"></div>

            <div className="landing-page-container">
              <div className="landing-page-section-header">
                <h2 className="landing-page-section-title">Contact Us</h2>
                <p className="landing-page-contact-description">
                  Get in touch with our team of experts today. We're here to
                  help answer your questions and create solutions tailored to
                  your business needs.
                </p>
              </div>

              {/* Contact Card Sections */}
              <div className="landing-page-contact-cards-container">
                <div className="landing-page-contact-cards">
                  <div className="landing-page-contact-card landing-page-contact-card-1">
                    <div className="landing-page-contact-card-content">
                      <div className="landing-page-contact-icon-wrapper">
                        <Mail size={28} />
                      </div>
                      <h3>Email</h3>
                      <p>voatnetwork@gmail.com</p>
                      <a
                        href="mailto:voatnetwork@gmail.com"
                        className="landing-page-contact-link"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Send Email <ArrowRight size={16} />
                      </a>
                    </div>
                  </div>

                  <div className="landing-page-contact-card landing-page-contact-card-2">
                    <div className="landing-page-contact-card-content">
                      <div className="landing-page-contact-icon-wrapper">
                        <Phone size={28} />
                      </div>
                      <h3>Phone</h3>
                      <p>+91 7799770919</p>
                      <a
                        href="tel:+917799770919"
                        className="landing-page-contact-link"
                      >
                        Call Now <ArrowRight size={16} />
                      </a>
                    </div>
                  </div>

                  <div className="landing-page-contact-card landing-page-contact-card-3">
                    <div className="landing-page-contact-card-content">
                      <div className="landing-page-contact-icon-wrapper">
                        <MapPin size={28} />
                      </div>
                      <h3>Address</h3>
                      <p>Vishakapatnam Andhra Pradesh, 531019</p>
                      <a
                        href="https://maps.app.goo.gl/QeVzKgkZp5htyUUn7"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="landing-page-contact-link"
                      >
                        View on Map <ArrowRight size={16} />
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact Form Section */}
              <div className="landing-page-contact-form-container">
                <div className="landing-page-contact-form-panel">
                  <h3 className="landing-page-contact-form-title">
                    Send us a Message
                  </h3>
                  <form
                    onSubmit={this.handleSubmit}
                    className="landing-page-contact-form"
                  >
                    <div className="landing-page-contact-form-row">
                      <div className="landing-page-contact-form-group">
                        <label
                          htmlFor="fullName"
                          className="landing-page-contact-form-label"
                        >
                          Full Name{" "}
                          <span className="landing-page-contact-required">
                            *
                          </span>
                        </label>
                        <input
                          type="text"
                          id="fullName"
                          name="fullName"
                          required
                          value={this.state.fullName}
                          onChange={this.handleChange}
                          className="landing-page-contact-form-input"
                          placeholder="Enter your full name"
                        />
                      </div>

                      <div className="landing-page-contact-form-group">
                        <label
                          htmlFor="email"
                          className="landing-page-contact-form-label"
                        >
                          Email{" "}
                          <span className="landing-page-contact-required">
                            *
                          </span>
                        </label>
                        <input
                          type="email"
                          id="email"
                          name="email"
                          required
                          value={this.state.email}
                          onChange={this.handleChange}
                          className="landing-page-contact-form-input"
                          placeholder="example@gmail.com"
                        />
                      </div>
                    </div>

                    <div className="landing-page-contact-form-row">
                      <div className="landing-page-contact-form-group">
                        <label
                          htmlFor="phone"
                          className="landing-page-contact-form-label"
                        >
                          Phone Number{" "}
                          <span className="landing-page-contact-required">
                            *
                          </span>
                        </label>
                        <input
                          type="tel"
                          id="phone"
                          name="phone"
                          required
                          value={this.state.phone}
                          onChange={this.handleChange}
                          className="landing-page-contact-form-input"
                          placeholder="+91 "
                        />
                      </div>

                      <div className="landing-page-contact-form-group">
                        <label
                          htmlFor="profession"
                          className="landing-page-contact-form-label"
                        >
                          Profession{" "}
                          <span className="landing-page-contact-required">
                            *
                          </span>
                        </label>
                        <input
                          type="text"
                          id="profession"
                          name="profession"
                          required
                          value={this.state.profession}
                          onChange={this.handleChange}
                          className="landing-page-contact-form-input"
                          placeholder="Web Developer"
                        />
                      </div>
                    </div>

                    <div className="landing-page-contact-form-group">
                      <label
                        htmlFor="message"
                        className="landing-page-contact-form-label"
                      >
                        Message{" "}
                        <span className="landing-page-contact-required">*</span>
                      </label>
                      <textarea
                        id="message"
                        name="message"
                        required
                        value={this.state.message}
                        onChange={this.handleChange}
                        rows={5}
                        className="landing-page-contact-form-textarea"
                        placeholder="Your message here..."
                      />
                    </div>

                    <button
                      type="submit"
                      className="landing-page-button landing-page-button-primary landing-page-contact-submit-button"
                    >
                      <span>Send Message</span>
                      <ArrowRight className="landing-page-button-icon" />
                    </button>
                  </form>
                </div>
              </div>

              {/* Social Media Links Section */}
              <div className="landing-page-contact-social-container">
                <h3 className="landing-page-contact-social-title">
                  Connect With Us
                </h3>
                <div className="landing-page-contact-social-icons">
                  <a
                    href="mailto:voatnetwork@gmail.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="landing-page-contact-social-link"
                  >
                    <Mail className="landing-page-contact-social-icon" />
                  </a>
                  <a
                    href="https://wa.me/917799770919"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="landing-page-contact-social-link"
                  >
                    <FaWhatsapp className="landing-page-contact-social-icon" />
                  </a>
                  <a
                    href="https://instagram.com/voatnetwork"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="landing-page-contact-social-link"
                  >
                    <Instagram className="landing-page-contact-social-icon" />
                  </a>
                  <a
                    href="https://linkedin.com/company/voatnetwork"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="landing-page-contact-social-link"
                  >
                    <Linkedin className="landing-page-contact-social-icon" />
                  </a>
                  <a
                    href="https://x.com/voatnetwork"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="landing-page-contact-social-link"
                  >
                    <FaXTwitter className="landing-page-contact-social-icon" />
                  </a>
                  <a
                    href="https://youtube.com/@voatnetwork"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="landing-page-contact-social-link"
                  >
                    <Youtube className="landing-page-contact-social-icon" />
                  </a>
                </div>
              </div>
            </div>
          </section>

          {/* Call to Action - New Section */}
          <section className="landing-page-cta-section">
            <div className="landing-page-container">
              <div className="landing-page-cta-content">
                <h2>Ready to Transform Your Business?</h2>
                <p>
                  Let's work together to bring your vision to life and take your
                  business to the next level.
                </p>
                <a
                  href="#contact"
                  className="landing-page-button landing-page-button-cta"
                >
                  Get Started Today <ArrowRight size={18} />
                </a>
              </div>
            </div>
          </section>
        </div>
        <Footer />
      </>
    );
  }
}

export default LandingPage;
