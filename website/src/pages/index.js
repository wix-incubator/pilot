import React from 'react';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import DemoSection from '@site/src/components/Homepage/DemoSection';
import styles from './index.module.scss';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  
  React.useEffect(() => {
    const plane = document.querySelector(`.${styles.paperPlane}`);
    
    // Scroll event handler
    const handleScroll = () => {
      const scrollY = window.scrollY;
      
      // Fly to top-right diagonally as user scrolls
      plane.style.transform = `translate(${scrollY * 0.6}px, ${-scrollY * 0.4}px) rotate(${scrollY * 0.02}deg) scale(${Math.max(1 - scrollY * 0.001, 0.5)})`;
      plane.style.opacity = Math.max(0.15 - scrollY * 0.0005, 0);
    };
    
    // Mouse move event handler
    const handleMouseMove = (e) => {
      // Only respond to mouse movement when near the top of the page
      if (window.scrollY > 300) return;
      
      const mouseX = e.clientX;
      const mouseY = e.clientY;
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      
      // Calculate mouse position as percentage of window
      const mouseXPercent = mouseX / windowWidth - 0.5; // -0.5 to 0.5
      const mouseYPercent = mouseY / windowHeight - 0.5; // -0.5 to 0.5
      
      // Subtle hover animation - simulates preparing to take off
      plane.style.transform = `translate(${mouseXPercent * 15}px, ${mouseYPercent * -20}px) rotate(${mouseXPercent * 3}deg)`;
      // Add slight shadow increase on hover
      plane.style.filter = `drop-shadow(0 ${4 + Math.abs(mouseYPercent * 8)}px ${10 + Math.abs(mouseYPercent * 10)}px rgba(0, 0, 0, ${0.15 + Math.abs(mouseYPercent * 0.05)}))`;
    
    };
    
    // Add event listeners
    window.addEventListener('scroll', handleScroll);
    window.addEventListener('mousemove', handleMouseMove);
    
    // Initial position
    handleScroll();
    
    // Remove event listeners on cleanup
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);
  
  return (
    <header className={styles.heroBanner}>
      <div className={styles.paperPlane}></div>
      <div className="container">
        <div className={styles.logoContainer}>
          <div className={styles.titleContainer}>
            <h1 className={styles.title}>Wix Pilot</h1>
          </div>
          <p className={styles.subtitle}>Transform testing with natural language commands. Engineered by the creators of Detox, born from real testing challenges, and open sourced for the community.</p>

          <div className={styles.ctaSection}>
            <Link
              className={styles.primaryButton}
              to="/docs/guides/integrating-with-testing-frameworks">
              Get Started
            </Link>
            <Link
              className={styles.secondaryButton}
              to="https://github.com/wix-incubator/pilot">
              View on GitHub
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

function FeatureSection({ title, description, link, linkText, boxStyle }) {
  return (
    <div className={`${styles.featureSection} ${boxStyle ? styles[boxStyle] : ''}`}>
      <div className="container">
        <h2>{title}</h2>
        <p>{description}</p>
        {link && (
          <Link
            className={styles.button}
            to={link}>
            {linkText}
          </Link>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Layout
      title="Wix Pilot - Natural Language Automation"
      description="Simplify your app testing with intuitive, natural language commands, making automation faster and more efficient.">
      <HomepageHeader />
      <main>
        <section className={styles.demoSection}>
          <div className="container">
            <h2>Experience the Power of Natural Language Testing</h2>
            <DemoSection />
          </div>
        </section>

        <FeatureSection
          title="Universal Testing Framework Support"
          description="Pilot is designed to work seamlessly with many testing frameworks, including Playwright, Puppeteer, Detox, and Appium. Write tests in natural language that work across any supported framework."
          link="/docs/pages/supported-frameworks"
          linkText="View Supported Frameworks"
          boxStyle="box-light-green"
        />

        <FeatureSection
          title="Open for Contributions"
          description="Join our growing community and help expand Pilot's capabilities. Add support for your favorite testing framework, improve documentation, or enhance existing features."
          link="/docs/guides/contributing-to-pilot"
          linkText="Contribute Now"
          boxStyle="box-dark-green"
        />

        <FeatureSection
          title="Professional Testing Made Simple"
          description="Write robust tests without learning complex APIs. Pilot handles the underlying details while you focus on describing your test flows naturally."
          link="/docs/guides/pilot-best-practices"
          linkText="Explore Best Practices"
          boxStyle=""
        />
      </main>
    </Layout>
  );
}
