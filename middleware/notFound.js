const path = require('path');

function notFound(req, res) {
  if (req.originalUrl.startsWith('/api')) {
    return res.status(404).json({
      error: {
        message: `Route not found: ${req.method} ${req.originalUrl}`,
        statusCode: 404
      }
    });
  }
  return res.status(404).sendFile(path.join(__dirname, '..', 'public', '404.html'), (err) => {
    if (err) {
      res.status(404).send('<h1>404 — Not Found</h1>');
    }
  });
}

module.exports = notFound;
