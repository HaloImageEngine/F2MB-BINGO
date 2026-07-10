const PROXY_CONFIG = [
  {
    context: ['/gogi-api'],
    target: 'https://api.getgogi.com',
    secure: true,
    changeOrigin: true,
    logLevel: 'debug',
    pathRewrite: {
      '^/gogi-api': ''
    }
  }
];

module.exports = PROXY_CONFIG;
