import React from "react";
import PropTypes from "prop-types";
import Link from "gatsby-link";
import Helmet from "react-helmet";

import "./index.css";
import "../styles/layout-overide.css";

import Media from "react-media";

const Header = () => (
  <div
    style={{
      background: "#f5f5f5",
      marginBottom: "3rem",
      borderBottom: "2px solid #e6e6e6"
    }}
  >
    <div
      style={{
        margin: "0 auto",
        maxWidth: 980,
        padding: "1.45rem 1.0875rem"
      }}
    >
      <h1 style={{ margin: 0, textAlign: "center", fontSize: "18px" }}>
        <Link
          to="/"
          style={{
            color: "black",
            textDecoration: "none"
          }}
        >
          Chai with Mukku
        </Link>
      </h1>
    </div>
  </div>
);

const Sidebar = props => (
  <div
    style={{
      border: "2px solid #e6e6e6",
      maxWidth: 960,
      padding: "0.5rem",
      marginBottom: "25px"
    }}
  >
    {props.link ?
      (<Link to={props.link}><strong>{props.title}</strong></Link>) :
      (<strong>{props.title}<br/></strong>)
    }
    {props.description}
  </div>
);

const ProfileLink = "static/profile/index.html";

const TemplateWrapper = ({ children }) => (
  <div>
    <Helmet
      title="Personal Blog"
      meta={[
        { name: "description", content: "Tech" },
        { name: "keywords", content: "tech, ideas" }
      ]}
    />
    <Header />
    <div
      style={{
        margin: "0 auto",
        maxWidth: 980,
        display: "flex",
        flexDirection: "row",
        justifyContent: "space-between",
        height: "100%"
      }}
    >
      <Media query={{ maxWidth: 848 }}>
        {matches =>
          matches ? (
            <div
              style={{
                margin: "0 auto",
                maxWidth: 980,
                display: "flex",
                flexDirection: "row",
                justifyContent: "space-between",
                height: "100%",
                padding: "25px"
              }}
            >
              <div style={{ flex: 1 }}>{children()}</div>
            </div>
          ) : (
            <div
              style={{
                margin: "0 auto",
                maxWidth: 980,
                display: "flex",
                flexDirection: "row",
                justifyContent: "space-between",
                height: "100%",
                padding: "25px"
              }}
            >
              <div style={{ flex: 2.5, paddingRight: "30px" }}>
                {children()}
              </div>
              <div style={{ flex: 1 }}>
                <Link to={ProfileLink}>
                  <Sidebar
                    title="Profile"
                    description="Projects worked on and experiences. If that matters. Just in case."
                    />
                </Link>
                <Sidebar
                  title="About author"
                  description="Mukarram is a Full-stack Developer who loves to explore random tech shits. Loving RoRoR. Never heard? React on Ruby on Rails. Made few projects on Android as well. Based in Bengaluru."
                />
              </div>
            </div>
          )
        }
      </Media>
    </div>
  </div>
);

TemplateWrapper.propTypes = {
  children: PropTypes.func
};

export default TemplateWrapper;
