/* ============================================================================
   GRAPHICS / DESIGN GALLERY  -  edit this file to manage the graphics portfolio.
   ----------------------------------------------------------------------------
   Entry types:
     IMAGE:      { src: "assets/img/graphics/x.jpg", title: "...", tags: ["brand"] }
     IMAGE+PDF:  add  pdf: "assets/pdf/x.pdf"  to offer a download in the lightbox.
     MULTI-PAGE PDF (flip through pages in the lightbox):
                 { pages: ["...-01.jpg","...-02.jpg"], pdf: "assets/pdf/x.pdf",
                   title: "...", tags: ["guides"] }
   Tags can hold more than one value for crossovers, e.g. tags: ["brand", "print"].
   Edit OTG_FILTERS to rename / reorder the tabs.
   ========================================================================== */

window.OTG_HIDE_ALL = false;
window.OTG_FILTERS = [
  { tag: "brand", label: "Brand & Illustration", heading: "A brand people remember.", desc: "Logos, identities and illustration that give a business a face and a feeling, turning complex ideas into something instantly recognisable." },
  { tag: "ui", label: "App / UI", heading: "Interfaces built to be used.", desc: "Clean, intuitive product and app screens that turn complicated flows into journeys anyone can navigate with confidence." },
  { tag: "motion", label: "Motion Graphics", heading: "Design, brought to life.", desc: "Animated logos, explainers and product reveals that add energy and clarity to the moments where attention matters most." },
  { tag: "print", label: "Print & Collateral", heading: "Design you can hold.", desc: "Brochures, signage and event collateral, considered to the last detail so they feel as good in the hand as they look on the big stage." },
  { tag: "guides", label: "Guides", heading: "Complex information, made clear.", desc: "Structured, easy-to-follow guides and manuals that turn dense material into something clear, usable and unmistakably on-brand." }
];

window.OTG_GALLERY = [
  { video: "assets/video/fate-3d-logo.mp4", poster: "assets/img/graphics/fate-3d-logo-poster.jpg", title: "Fate Sports Group, 3D logo opening", tags: ["motion"] },
  { video: "assets/video/logo-motion-dark.mp4", poster: "assets/img/graphics/otg-logo-motion-poster.jpg", title: "On the Ground, logo animation", tags: ["motion"] },
  { pages: ["assets/img/graphics/qf-brandbook-01.jpg", "assets/img/graphics/qf-brandbook-02.jpg", "assets/img/graphics/qf-brandbook-03.jpg", "assets/img/graphics/qf-brandbook-04.jpg", "assets/img/graphics/qf-brandbook-05.jpg", "assets/img/graphics/qf-brandbook-06.jpg", "assets/img/graphics/qf-brandbook-07.jpg", "assets/img/graphics/qf-brandbook-08.jpg", "assets/img/graphics/qf-brandbook-09.jpg", "assets/img/graphics/qf-brandbook-10.jpg", "assets/img/graphics/qf-brandbook-11.jpg", "assets/img/graphics/qf-brandbook-12.jpg"], pdf: "assets/pdf/quantock-financial-brand-book.pdf", title: "Quantock Financial brand book", tags: ["guides"] },
  { src: "assets/img/graphics/ql-logo-set.jpg", title: "Quantock Lettings logo set", tags: ["brand"] },
  { src: "assets/img/graphics/sites-on-mobile.jpg", title: "Fate, Quantock Financial and Quantock Lettings on mobile", tags: ["ui"] },
  { pages: ["assets/img/graphics/ql-landlord-01.jpg", "assets/img/graphics/ql-landlord-02.jpg", "assets/img/graphics/ql-landlord-03.jpg", "assets/img/graphics/ql-landlord-04.jpg", "assets/img/graphics/ql-landlord-05.jpg", "assets/img/graphics/ql-landlord-06.jpg", "assets/img/graphics/ql-landlord-07.jpg", "assets/img/graphics/ql-landlord-08.jpg", "assets/img/graphics/ql-landlord-09.jpg", "assets/img/graphics/ql-landlord-10.jpg", "assets/img/graphics/ql-landlord-11.jpg", "assets/img/graphics/ql-landlord-12.jpg", "assets/img/graphics/ql-landlord-13.jpg"], pdf: "assets/pdf/quantock-lettings-landlord-guide.pdf", title: "Quantock Lettings Landlord Guide", tags: ["guides"] },
  { src: "assets/img/graphics/fate-email-signature-v2.jpg", title: "Fate Sports Group email signature", tags: ["brand"] },
  { src: "assets/img/graphics/qf-email-signature.jpg", title: "Quantock Financial email signature", tags: ["brand"] },
  { src: "assets/img/graphics/ql-email-signature.jpg", title: "Quantock Lettings email signature", tags: ["brand"] },
  { src: "assets/v2/img/fate-services.jpg", title: "Fate Sports Group website, services", tags: ["ui"] },
  { src: "assets/img/graphics/otg-business-cards.jpg", title: "On the Ground business cards", tags: ["print"] },
  { src: "assets/v2/img/qf-calculator.jpg", title: "Quantock Financial website, mortgage calculator", tags: ["ui"] },
  { src: "assets/v2/img/ql-homes.jpg", title: "Quantock Lettings website, homes to rent", tags: ["ui"] },
  { src: "assets/img/graphics/fate-digital-card.jpg", title: "Fate Sports Group digital business card", tags: ["brand"] },
];
