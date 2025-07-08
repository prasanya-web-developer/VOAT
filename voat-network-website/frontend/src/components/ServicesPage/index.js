import { Component } from "react";
import { Link } from "react-router-dom";
import NavBar from "../Navbar";
import Footer from "../Footer";
import {
  Code,
  Megaphone,
  Search,
  Lightbulb,
  Calculator,
  Camera,
  Bot,
  Home,
} from "lucide-react";
import "./index.css";
import { HashLink } from "react-router-hash-link";

class ServicesPage extends Component {
  render() {
    const services = [
      {
        id: 1,
        title: "Web Development",
        description:
          "Custom websites and web applications tailored to your business needs with responsive design and modern technologies.",
        icon: <Code size={28} />,
        color: "#6b5ce7",
        filterValue: "Web Developer",
      },
      {
        id: 2,
        title: "Digital Marketing",
        description:
          "Strategic campaigns designed to boost your online presence and drive qualified traffic to your business.",
        icon: <Megaphone size={28} />,
        color: "#7b6cff",
        filterValue: "Digital Marketing Specialist",
      },
      {
        id: 3,
        title: "SEO & SMM",
        description:
          "Enhance your visibility online through search engine optimization and strategic social media management.",
        icon: <Search size={28} />,
        color: "#604ee0",
        filterValue: "SEO Specialist",
      },
      {
        id: 4,
        title: "Brand Development",
        description:
          "Create a memorable identity with logos, color schemes, and messaging that resonates with your target audience.",
        icon: <Lightbulb size={28} />,
        color: "#8974ff",
        filterValue: "Brand Designer",
      },
      {
        id: 5,
        title: "Taxation",
        description:
          "Professional tax planning and compliance services to optimize your financial position and minimize liabilities.",
        icon: <Calculator size={28} />,
        color: "#6b5ce7",
        filterValue: "Tax Consultant",
      },
      {
        id: 6,
        title: "Photo and Video Editing",
        description:
          "Professional editing services to transform your raw footage into polished, engaging visual content.",
        icon: <Camera size={28} />,
        color: "#7b6cff",
        filterValue: "Video Editor",
      },
      {
        id: 7,
        title: "Automation",
        description:
          "Streamline your business processes with custom automation solutions that save time and reduce errors.",
        icon: <Bot size={28} />,
        color: "#604ee0",
        filterValue: "Automation Specialist",
      },
      {
        id: 8,
        title: "Interior Design",
        description:
          "Transform spaces with creative design solutions that balance aesthetics, functionality, and your personal style.",
        icon: <Home size={28} />,
        color: "#8974ff",
        filterValue: "Interior Designer",
      },
    ];

    return (
      <>
        <NavBar />
        <div className="service-page-container">
          <div className="service-page-header">
            <h1 className="service-page-title">Our Services</h1>
            <p className="service-page-subtitle">
              Comprehensive solutions tailored to your business needs
            </p>
          </div>

          <section className="service-page-services">
            <div className="service-page-services-grid">
              {services.map((service) => (
                <Link
                  key={service.id}
                  to={`/portfolio-list?profession=${encodeURIComponent(
                    service.filterValue
                  )}`}
                  className="service-page-service-card-link"
                >
                  <div
                    className="service-page-service-card"
                    data-aos="fade-up"
                    data-aos-delay={service.id * 100}
                    style={{ "--card-color": service.color }}
                  >
                    <div className="service-page-service-circle">
                      {service.icon}
                    </div>
                    <div className="service-page-service-content">
                      <h3>{service.title}</h3>
                      <p>{service.description}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <section className="service-page-cta">
            <div className="service-page-cta-content">
              <h2>Ready to Transform Your Business?</h2>
              <p>
                Contact us today for a free consultation and discover how our
                services can help you achieve your goals.
              </p>
              <HashLink to="/#contact-us" className="service-page-cta-button">
                Get Started
              </HashLink>
            </div>
            <div className="service-page-cta-blob"></div>
            <div className="service-page-cta-blob blob-2"></div>
          </section>
        </div>
        <Footer />
      </>
    );
  }
}

export default ServicesPage;
