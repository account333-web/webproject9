function checkAuth(req, res, next) {
  if (req.session.userId) return next();
  if (req.originalUrl === '/trade.html' || req.originalUrl === '/dashboard.html') {
    return res.redirect('/menu.html');
  }
  res.redirect('/index.html?error=login');
}

module.exports = checkAuth;
  