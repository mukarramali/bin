module.exports = {
  siteMetadata: {
    title: 'Personal Blog of Mukku',
  },
  plugins: [
    'gatsby-plugin-react-helmet',
    'gatsby-plugin-catch-links',
    {
      resolve: `gatsby-source-filesystem`,
      options: {
        path: `${__dirname}/src/pages`,
        name: 'pages',
      },
    },
    'gatsby-transformer-remark'
  ],
  pathPrefix: `/mukarramali.github.io`,
}
