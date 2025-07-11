const { createProxyMiddleware } = require("http-proxy-middleware");

module.exports = function proxy(app) {
  app.use(
    "/api",
    createProxyMiddleware({
      target: "http://localhost:3000",
      changeOrigin: true,
    })
  );
};
