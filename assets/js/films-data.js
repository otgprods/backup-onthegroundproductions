/* ============================================================================
   YOUR FILMS LIVE HERE  -  the only file you edit to add a film.
   ----------------------------------------------------------------------------
   Copy one { ... } block, paste it in, fill in the details, save. The first
   film in the list is shown as the large featured film; the rest appear as
   tiles below. Clicking any film opens it in a full-screen player.

   Fields:
     title       (required)  Name of the film.
     platform    (required)  "youtube", "vimeo" or "mp4".
     id          (required)  YouTube/Vimeo video ID, or for mp4 the file path.
     client                  Client / brand (optional).
     category                e.g. "Film", "Promo", "Interview", "Explainer".
     year                    e.g. "2025" (optional).
     description             1-2 sentences (great for SEO).

   Find the ID:  youtube.com/watch?v=ABC123 -> "ABC123"   |   youtu.be/ABC123 -> "ABC123"
   ========================================================================== */

window.OTG_FILMS_LAYOUT = "reel";

window.OTG_FILM_FILTERS = [
  { tag: "brand", label: "Brand Films" },
  { tag: "ai", label: "AI Film" },
  { tag: "interview", label: "Interviews" },
  { tag: "explainer", label: "Explainers" },
  { tag: "promo", label: "Promos" }
];

window.OTG_FILMS = [

  { title: "Anthony Paul, Designer Goldsmith", platform: "youtube", id: "64pjTo2JUh0", tags: ["brand"],
    client: "Anthony Paul", category: "Film",
    description: "A cinematic film capturing the craft, emotion and aesthetic of a bespoke goldsmith." },

  { title: "Fate Sports Group, Website Launch Reel", platform: "mp4", id: "assets/v2/video/fate-launch-reel.mp4", tags: ["promo"],
    poster: "assets/img/films/fate-launch-reel-poster.jpg", client: "Fate Sports Group", category: "Promo",
    description: "A launch reel for the new Fate Sports Group website, cut for social." },

  { title: "Quantock Financial, Launch Film", platform: "mp4", id: "assets/v2/video/qf-launch.mp4", tags: ["promo"],
    poster: "assets/img/films/qf-launch-poster.jpg", client: "Quantock Financial", category: "Promo",
    description: "A short launch film introducing the new Quantock Financial website." },

  { title: "Ash, 1977 Anniversary Tour Finale", platform: "mp4", id: "assets/video/ash-finale.mp4", tags: ["promo"],
    poster: "assets/img/films/ash-finale-poster.jpg", client: "Ash", category: "Promo",
    description: "A promo for the finale of Ash’s 1977 30th anniversary tour at the Roundhouse, London." },


  { title: "Unity", platform: "youtube", id: "3unfE4S5NH4", tags: ["brand"],
    category: "Film",
    description: "A film built on connection, purpose and shared vision." },

  { title: "Smart Village: Connected", platform: "youtube", id: "iYAOvIp4JwU", tags: ["brand"],
    poster: "assets/img/smart-village-connected.jpg",
    client: "World Mobile", category: "Film",
    description: "A documentary-style film following World Mobile's Smart Village, bringing connectivity to communities that have never had reliable internet." },

  { title: "Smart Village: Revisited", platform: "youtube", id: "hYlLA9emiaw", tags: ["brand"],
    poster: "assets/img/smart-village-revisited.jpg",
    client: "World Mobile", category: "Film",
    description: "Returning to the Smart Village to see how connectivity has transformed daily life, work and opportunity." },

  { title: "In Conversation with Dan Gill", platform: "youtube", id: "d4P8NOUnzKw", tags: ["interview"],
    category: "Interview",
    description: "A filmed conversation with Dan Gill." },


  { title: "Scout & Runner, Tutorial Film", platform: "youtube", id: "TFpkKpIYb9A", tags: ["explainer"],
    category: "Explainer / AI",
    description: "A tutorial film blending clear step-by-step guidance with AI-generated sequences." },

];
