const header = document.querySelector(".site-header");
const mobileToggle = document.querySelector(".mobile-toggle");
const nav = document.querySelector(".main-nav");
const dropdowns = document.querySelectorAll(".nav-dropdown");
const revealItems = document.querySelectorAll(".reveal");
const accordionItems = document.querySelectorAll(".accordion-item");

const syncHeaderState = () => {
  if (!header) return;
  header.classList.toggle("scrolled", window.scrollY > 10);
};

const closeDropdowns = (current) => {
  dropdowns.forEach((dropdown) => {
    const shouldClose = current ? dropdown !== current : true;
    if (shouldClose) {
      dropdown.classList.remove("open");
      const button = dropdown.querySelector(".nav-link-with-caret");
      if (button) button.setAttribute("aria-expanded", "false");
    }
  });
};

if (header) {
  window.addEventListener("scroll", syncHeaderState, { passive: true });
  syncHeaderState();
}

if (mobileToggle && nav) {
  mobileToggle.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("is-open");
    mobileToggle.setAttribute("aria-expanded", String(isOpen));
    if (!isOpen) closeDropdowns();
  });
}

dropdowns.forEach((dropdown) => {
  const button = dropdown.querySelector(".nav-link-with-caret");
  if (!button) return;

  button.addEventListener("click", () => {
    const isDesktop = window.innerWidth > 820;
    if (isDesktop) {
      const willOpen = !dropdown.classList.contains("open");
      closeDropdowns(dropdown);
      dropdown.classList.toggle("open", willOpen);
      button.setAttribute("aria-expanded", String(willOpen));
      return;
    }

    const willOpen = !dropdown.classList.contains("open");
    closeDropdowns(dropdown);
    dropdown.classList.toggle("open", willOpen);
    button.setAttribute("aria-expanded", String(willOpen));
  });
});

document.addEventListener("click", (event) => {
  const clickedInsideDropdown = event.target.closest(".nav-dropdown");
  if (!clickedInsideDropdown) closeDropdowns();
});

document.querySelectorAll(".main-nav a").forEach((link) => {
  link.addEventListener("click", () => {
    nav?.classList.remove("is-open");
    mobileToggle?.setAttribute("aria-expanded", "false");
    closeDropdowns();
  });
});

accordionItems.forEach((item) => {
  const trigger = item.querySelector(".accordion-trigger");
  if (!trigger) return;

  trigger.addEventListener("click", () => {
    const willOpen = !item.classList.contains("is-open");

    accordionItems.forEach((entry) => {
      entry.classList.remove("is-open");
      entry.querySelector(".accordion-trigger")?.setAttribute("aria-expanded", "false");
    });

    item.classList.toggle("is-open", willOpen);
    trigger.setAttribute("aria-expanded", String(willOpen));
  });
});

if ("IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    {
      threshold: 0.2,
      rootMargin: "0px 0px -40px 0px",
    }
  );

  revealItems.forEach((item) => revealObserver.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add("is-visible"));
}

const contactMapCard = document.getElementById("contactMapCard");
const contactMapActivate = contactMapCard?.querySelector(".contact-map-activate");

if (contactMapCard && contactMapActivate) {
  contactMapActivate.addEventListener("click", (event) => {
    event.stopPropagation();
    contactMapCard.classList.add("is-interactive");
  });

  document.addEventListener("click", (event) => {
    if (!contactMapCard.contains(event.target)) {
      contactMapCard.classList.remove("is-interactive");
    }
  });
}
