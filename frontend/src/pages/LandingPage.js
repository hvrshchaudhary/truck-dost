import React from 'react';
import Hero from '../components/Hero';
import './LandingPage.css';

const LandingPage = () => {
    return (
        <div className="landing-page">
            <Hero />
            <section className="features-section">
                <div className="container">
                    <h2 className="section-title">Why Choose Truck Dost?</h2>
                    <div className="features-grid">
                        <div className="feature-card">
                            <div className="feature-icon">🚚</div>
                            <h3>Smart Logistics</h3>
                            <p>Efficient route planning and real-time tracking for your shipments</p>
                        </div>
                        <div className="feature-card">
                            <div className="feature-icon">🤝</div>
                            <h3>Trusted Network</h3>
                            <p>Connect with verified truck drivers and manufacturers</p>
                        </div>
                        <div className="feature-card">
                            <div className="feature-icon">💰</div>
                            <h3>Cost Effective</h3>
                            <p>Optimize your logistics costs with competitive pricing</p>
                        </div>
                    </div>
                </div>
            </section>
            <section className="cta-section">
                <div className="container">
                    <h2>Ready to Transform Your Logistics?</h2>
                    <p>Join thousands of businesses already using Truck Dost</p>
                </div>
            </section>
        </div>
    );
};

export default LandingPage; 