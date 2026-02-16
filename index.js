    (function () {
      var contactForm = document.querySelector('.contact-form');
      var formStatus = document.querySelector('.form-status');
      var phoneField = contactForm ? contactForm.querySelector('input[name="phone"]') : null;
      var stepLabel = contactForm ? contactForm.querySelector('.form-step-label') : null;
      var formSteps = contactForm ? contactForm.querySelectorAll('.form-step') : [];
      var nextStepButton = contactForm ? contactForm.querySelector('[data-next-step]') : null;
      var prevStepButton = contactForm ? contactForm.querySelector('[data-prev-step]') : null;
      var lastSubmissionKey = 'apexpro_last_submit_at';
      var minSubmitIntervalMs = 30000;
      var openLinks = document.querySelectorAll('[data-open-modal]');
      var closeButtons = document.querySelectorAll('[data-close-modal]');
      var overlays = document.querySelectorAll('.modal-overlay');
      var externalLinks = document.querySelectorAll('a[target="_blank"]');
      var currentStep = 0;

      function formatPhone(value) {
        var digits = value.replace(/\D/g, '').slice(0, 10);
        if (!digits) return '';
        if (digits.length < 4) return '(' + digits;
        if (digits.length < 7) return '(' + digits.slice(0, 3) + ') ' + digits.slice(3);
        return '(' + digits.slice(0, 3) + ') ' + digits.slice(3, 6) + '-' + digits.slice(6);
      }

      function sanitizeText(value) {
        return value.replace(/[<>]/g, '').replace(/[\u0000-\u001F\u007F]/g, ' ').trim();
      }

      externalLinks.forEach(function (link) {
        var rel = (link.getAttribute('rel') || '').split(/\s+/).filter(Boolean);
        ['noopener', 'noreferrer', 'nofollow'].forEach(function (token) {
          if (rel.indexOf(token) === -1) rel.push(token);
        });
        link.setAttribute('rel', rel.join(' '));
      });

      if (phoneField) {
        phoneField.addEventListener('input', function () {
          phoneField.value = formatPhone(phoneField.value);
        });
      }

      function setFormStatus(message, type) {
        if (!formStatus) return;
        formStatus.textContent = message;
        formStatus.classList.remove('is-success', 'is-error');
        if (type) formStatus.classList.add(type);
      }

      function showStep(stepIndex) {
        if (!formSteps.length) return;
        currentStep = stepIndex;
        formSteps.forEach(function (step, index) {
          step.hidden = index !== stepIndex;
        });
        if (stepLabel) {
          stepLabel.textContent = stepIndex === 0 ? 'Step 1 of 2: Contact Info' : 'Step 2 of 2: Project Details';
        }
        setFormStatus('', '');
      }

      function validateStep(stepIndex) {
        if (!formSteps.length || !formSteps[stepIndex]) return true;
        var fields = formSteps[stepIndex].querySelectorAll('input, select, textarea');
        var isValid = true;
        Array.prototype.forEach.call(fields, function (field) {
          if (field.disabled || field.type === 'hidden') return;
          if (!field.checkValidity()) {
            if (isValid) field.reportValidity();
            isValid = false;
          }
        });
        return isValid;
      }

      if (contactForm && formSteps.length) {
        showStep(0);
      }

      if (nextStepButton) {
        nextStepButton.addEventListener('click', function () {
          if (!validateStep(0)) return;
          showStep(1);
        });
      }

      if (prevStepButton) {
        prevStepButton.addEventListener('click', function () {
          showStep(0);
        });
      }

      if (contactForm) {
        contactForm.addEventListener('submit', function (event) {
          event.preventDefault();
          var submitButton = contactForm.querySelector('button[type="submit"]');
          var emailField = contactForm.querySelector('input[name="email"]');
          var firstNameField = contactForm.querySelector('input[name="first_name"]');
          var lastNameField = contactForm.querySelector('input[name="last_name"]');
          var businessNameField = contactForm.querySelector('input[name="business_name"]');
          var subjectField = contactForm.querySelector('input[name="_subject"]');
          var now = Date.now();
          var lastSubmitAt = Number(window.localStorage.getItem(lastSubmissionKey) || 0);
          var formData = new FormData(contactForm);

          if (!validateStep(1)) return;

          if (now - lastSubmitAt < minSubmitIntervalMs) {
            setFormStatus('Please wait 30 seconds before sending another message.', 'is-error');
            return;
          }

          if (emailField && emailField.value) {
            formData.set('_replyto', emailField.value);
          }

          Array.prototype.forEach.call(contactForm.querySelectorAll('input[type="text"], input[type="url"], input[type="email"], textarea'), function (field) {
            field.value = sanitizeText(field.value);
            formData.set(field.name, field.value);
          });

          if (subjectField) {
            var subjectFirst = firstNameField && firstNameField.value ? firstNameField.value : 'New';
            var subjectLast = lastNameField && lastNameField.value ? lastNameField.value : 'Lead';
            var subjectBusiness = businessNameField && businessNameField.value ? businessNameField.value : 'No Business';
            var uniqueStamp = new Date().toISOString();
            var dynamicSubject = 'Lead: ' + subjectFirst + ' ' + subjectLast + ' | ' + subjectBusiness + ' | ' + uniqueStamp;
            subjectField.value = dynamicSubject;
            formData.set('_subject', dynamicSubject);
          }

          setFormStatus('Sending your message...', '');
          if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = 'Sending...';
          }

          fetch('https://formsubmit.co/ajax/apexpro.mktg@gmail.com', {
            method: 'POST',
            body: formData,
            headers: {
              Accept: 'application/json'
            }
          })
            .then(function (response) {
              if (!response.ok) throw new Error('Form submit failed');
              return response.json();
            })
            .then(function () {
              contactForm.reset();
              window.localStorage.setItem(lastSubmissionKey, String(Date.now()));
              showStep(0);
              setFormStatus('Message sent. We will get back to you shortly.', 'is-success');
            })
            .catch(function () {
              setFormStatus('Message failed to send. Please try again in a moment.', 'is-error');
            })
            .finally(function () {
              if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = 'Send Message';
              }
            });
        });
      }

      function closeAll() {
        overlays.forEach(function (overlay) {
          overlay.classList.remove('is-open');
          overlay.setAttribute('aria-hidden', 'true');
        });
        document.body.style.overflow = '';
      }

      openLinks.forEach(function (link) {
        link.addEventListener('click', function (event) {
          event.preventDefault();
          var modalId = link.getAttribute('data-open-modal');
          var modal = document.getElementById(modalId);
          if (!modal) return;
          closeAll();
          modal.classList.add('is-open');
          modal.setAttribute('aria-hidden', 'false');
          document.body.style.overflow = 'hidden';
        });
      });

      closeButtons.forEach(function (button) {
        button.addEventListener('click', closeAll);
      });

      overlays.forEach(function (overlay) {
        overlay.addEventListener('click', function (event) {
          if (event.target === overlay) closeAll();
        });
      });

      document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') closeAll();
      });
    })();
