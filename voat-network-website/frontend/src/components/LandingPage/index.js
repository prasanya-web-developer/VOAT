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
} from "lucide-react";

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
  };

  //scroll animations
  servicesRef = React.createRef();
  visionRef = React.createRef();
  chooseUsRef = React.createRef();

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
                  <Link
                    to="/contact-us"
                    className="landing-page-button landing-page-button-outline"
                  >
                    Get In Touch
                  </Link>
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

          {/* Vision Section - Updated with Modern Design */}
          <section
            className={`landing-page-vision-section ${
              this.state.visionInView ? "in-view" : ""
            }`}
            ref={this.visionRef}
            id="vision"
          >
            <div className="landing-page-vision-particles">
              <div className="landing-page-vision-particle particle-1"></div>
              <div className="landing-page-vision-particle particle-2"></div>
              <div className="landing-page-vision-particle particle-3"></div>
            </div>

            <div className="landing-page-container">
              <div className="landing-page-section-header">
                <h2 className="landing-page-section-title">Our Vision</h2>
                <p className="landing-page-vision-description">
                  To empower startups by fostering innovation, collaboration,
                  and growth, creating a thriving ecosystem where entrepreneurs
                  uplift each other and achieve sustainable success together.
                </p>
              </div>

              <div className="landing-page-vision-cards">
                {visionPoints.map((point, index) => (
                  <div
                    key={index}
                    className={`landing-page-vision-card landing-page-vision-card-${
                      index + 1
                    }`}
                  >
                    <div className="landing-page-vision-icon-wrapper">
                      {point.icon}
                    </div>
                    <h3>{point.title}</h3>
                    <p>{point.description}</p>
                  </div>
                ))}
              </div>
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
                  to="/services"
                  className="landing-page-button landing-page-button-primary"
                >
                  View All Services
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
                  <Link
                    to="/contact-us"
                    className="landing-page-button landing-page-button-light"
                  >
                    Partner With Us <ArrowRight size={18} />
                  </Link>
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

          {/* Call to Action - New Section */}
          <section className="landing-page-cta-section">
            <div className="landing-page-container">
              <div className="landing-page-cta-content">
                <h2>Ready to Transform Your Business?</h2>
                <p>
                  Let's work together to bring your vision to life and take your
                  business to the next level.
                </p>
                <Link
                  to="/contact-us"
                  className="landing-page-button landing-page-button-cta"
                >
                  Get Started Today <ArrowRight size={18} />
                </Link>
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
