Product Requirements Document (PRD)

Project: Interactive Haiku Experience - "Lost Boy Fireflies"

Core Concept:
A scrollable, interactive presentation of a haiku featuring animated text and firefly elements against a moody nighttime scene.

Image Requirements:
AI Image Prompt:
"A cinematic night scene of a teenage boy (15-17 years old) in a dark forest, backlit with moonlight, wearing casual modern clothes. Ethereal fireflies floating around him creating spots of golden light. Atmospheric fog, dark blue-green color palette, shallow depth of field, photorealistic style."

Technical Stack:

- AstroJS
- TailwindCSS
- GSAP for animations
- Intersection Observer API

Detailed Requirements:

1. Layout Structure

- Full viewport height sections
- Responsive design (mobile-first)
- Smooth scroll behavior
- Z-layer management for text, fireflies, and background

2. Visual Elements

- Background: Dark gradient atmosphere
- Main image: Centered, parallax effect
- Firefly elements: SVG with glow effects
- Text overlay: Custom typography with blur/glow effects

3. Animation Requirements

- Text animations:
  - Words appear sequentially
  - Fade-in/blur effects
  - Position shifts based on scroll
- Firefly animations:
  - Random movement patterns
  - Varying opacity (40-100%)
  - Different speeds
  - Glow effect

4. Interaction Requirements

- Scroll-triggered animations
- Smooth performance
- Accessible keyboard navigation
- Mobile touch support

Development Tickets Sequence:

MVP Phase (Sprint 1):

1. Setup basic AstroJS project with TailwindCSS
2. Create static postcard layout
3. Implement responsive image placement
4. Add basic text overlay

Text Animation Phase (Sprint 2): 5. Implement GSAP setup 6. Create text animation components 7. Add scroll triggers for text 8. Implement text fade-in effects

Firefly Animation Phase (Sprint 3): 9. Create SVG firefly components 10. Implement basic firefly movement 11. Add glow effects to fireflies 12. Create random movement patterns

Polish Phase (Sprint 4): 13. Add parallax scrolling 14. Optimize performance 15. Implement loading states 16. Add accessibility features
