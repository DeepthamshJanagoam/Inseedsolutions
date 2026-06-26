const contactForm = document.querySelector("[data-contact-form]");

if (contactForm) {
  const statusElement = document.getElementById("contactFormStatus");
  const apiBase = window.APP_API_BASE || "";
  const phoneInput = contactForm.querySelector("input[name='phone']");

  const normalizeDigits = (value) => String(value || "").replace(/\D/g, "");
  let toastTimer;

  const showToast = (message, state = "success") => {
    let toast = document.getElementById("contactFormToast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "contactFormToast";
      toast.className = "contact-form-toast";
      toast.setAttribute("role", "status");
      toast.setAttribute("aria-live", "polite");
      document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.dataset.state = state;
    toast.classList.add("is-visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 4200);
  };

  phoneInput?.addEventListener("input", () => {
    phoneInput.setCustomValidity("");
  });

  contactForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const submitButton = contactForm.querySelector("button[type='submit']");

    if (phoneInput?.value && normalizeDigits(phoneInput.value).length < 10) {
      phoneInput.setCustomValidity("Please enter a valid phone number with at least 10 digits.");
    } else {
      phoneInput?.setCustomValidity("");
    }

    if (!contactForm.reportValidity()) {
      if (statusElement) statusElement.textContent = "Please complete the required fields before submitting.";
      return;
    }

    const formData = Object.fromEntries(new FormData(contactForm).entries());
    const originalButtonText = submitButton?.textContent || "Submit Inquiry";

    if (statusElement) statusElement.textContent = "Sending your inquiry...";
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Sending...";
    }

    try {
      const response = await fetch(`${apiBase}${contactForm.dataset.api}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Submission failed");

      contactForm.reset();
      if (statusElement) {
        statusElement.textContent = result.message || "Thank you. Your inquiry has been sent successfully.";
      }
      showToast("Thank you. Your inquiry has been sent successfully.", "success");
    } catch (error) {
      if (statusElement) {
        statusElement.textContent = error.message || "We could not send the inquiry. Please try again or email hello@inseedsolutions.com.";
      }
      showToast(
        error.message || "We could not send the inquiry. Please try again or email hello@inseedsolutions.com.",
        "error"
      );
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = originalButtonText;
      }
    }
  });
}
