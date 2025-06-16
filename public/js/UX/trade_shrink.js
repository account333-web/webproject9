    document.addEventListener('DOMContentLoaded', function() {
      const header = document.querySelector('.header');
      const threshold = header.offsetHeight;
      window.addEventListener('scroll', function() {
        if (window.scrollY > threshold) {
          document.body.classList.add('shrink-mode');
        } else {
          document.body.classList.remove('shrink-mode');
        }
      });
    });