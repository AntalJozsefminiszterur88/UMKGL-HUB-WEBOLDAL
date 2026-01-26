
    const feedbackModal = document.getElementById('feedbackModal');
    const feedbackModalTitle = document.getElementById('feedbackModalTitle');
    const feedbackModalMessage = document.getElementById('feedbackModalMessage');
    const feedbackModalClose = document.getElementById('feedbackModalClose');
    const feedbackModalOk = document.getElementById('feedbackModalOk');
    let feedbackModalOnClose = null;

    const hideFeedbackModal = () => {
      feedbackModal.style.display = 'none';
      feedbackModalTitle.textContent = '';
      feedbackModalMessage.textContent = '';
      const onClose = feedbackModalOnClose;
      feedbackModalOnClose = null;
      if (typeof onClose === 'function') {
        onClose();
      }
    };

    const showFeedbackModal = ({ title, message, onClose }) => {
      feedbackModalTitle.textContent = title;
      feedbackModalMessage.textContent = message;
      feedbackModalOnClose = typeof onClose === 'function' ? onClose : null;
      feedbackModal.style.display = 'flex';
      feedbackModalOk.focus();
    };

    feedbackModalClose.addEventListener('click', hideFeedbackModal);
    feedbackModalOk.addEventListener('click', hideFeedbackModal);
    feedbackModal.addEventListener('click', (event) => {
      if (event.target === feedbackModal) {
        hideFeedbackModal();
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && feedbackModal.style.display === 'flex') {
        hideFeedbackModal();
      }
    });

    document.getElementById('registerForm').addEventListener('submit', async (e) => {
      e.preventDefault(); // Megakadályozza az oldal alapértelmezett újratöltését

      const username = document.getElementById('regUser').value;
      const password = document.getElementById('regPass').value;

      // Adatok elküldése a szerver '/register' végpontjára
      const response = await fetch('/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password })
      });

      // Válasz feldolgozása
      if (response.ok) {
        // Ha a szerver 2xx státuszkóddal válaszolt (siker)
        document.getElementById('registerForm').reset();
        showFeedbackModal({
          title: 'Sikeres regisztráció',
          message: 'Most már bejelentkezhetsz.',
          onClose: () => {
            window.location.href = '/';
          },
        });
      } else {
        // Ha a szerver 4xx vagy 5xx státuszkóddal válaszolt (hiba)
        const data = await response.json(); // A szerver által küldött hibaüzenet kiolvasása
        alert(`Hiba a regisztráció során: ${data.message}`); // Részletes hibaüzenet megjelenítése
      }
    });
  