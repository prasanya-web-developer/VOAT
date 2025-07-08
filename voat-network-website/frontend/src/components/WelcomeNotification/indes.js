import React from "react";
import "./index.css";

class WelcomeNotification extends React.Component {
  state = {
    visible: true,
  };

  componentDidMount() {
    setTimeout(() => {
      this.setState({ visible: false });
      if (this.props.onClose) {
        this.props.onClose();
      }
    }, 5000);
  }

  render() {
    if (!this.state.visible) return null;

    return (
      <div className="welcome-notification-overlay">
        <div className="welcome-notification-card">
          <p className="welcome-text">{this.props.message}</p>
        </div>
      </div>
    );
  }
}

export default WelcomeNotification;
