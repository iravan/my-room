# Game Design Document: Visual Vinyl Showcase (Working Title)

## 1. High-Level Concept
**Visual Vinyl Showcase** is a cozy, interactive 3D/2D visual showcase game set in a personalized bedroom. Players can customize their room, manage a physical vinyl collection, edit album artwork and metadata, and place records on a classic LP turntable to display their musical tastes to visitors or friends. 

The core experience focuses on aesthetic appreciation, tactile interaction, and personal expression—highlighting the album art, liner notes, and physical presence of a vinyl collection rather than audio playback.

---

## 2. Target Audience & Core Experience
* **Target Audience:** Vinyl enthusiasts, aesthetic/cozy game players, people who want a personalized virtual room to showcase their favorite music taste to friends or on social media.
* **Core Emotional Drive:** Nostalgia, self-expression, pride of ownership, tactile satisfaction, cozy relaxation.

---

## 3. Key Features

### 3.1 The Bedroom Setup
* **Environment:** A customizable, intimate bedroom space featuring key furniture:
  * A bed (with customizable sheets/pillows).
  * A classic LP Turntable / Record Player on a dedicated stand or shelf.
  * Vinyl Storage Shelves/Crates displaying album spines and covers.
  * Lighting controls (day/night, mood lighting, lamp glow).
* **Camera Views:**
  * **Room Overview:** First-person or free-look camera to inspect the space.
  * **Turntable Focus View:** Close-up view of the classic LP player.
  * **Shelf Browser:** Tactical flip-through view of the record collection.

### 3.2 The Collection & LP Management
* **Record Flip Interaction:** Flip through vinyl records in a crate/shelf with realistic physical animations.
* **Album Inspector:** Pull an LP out of its sleeve, view the vinyl disc (color variations, splatter designs), inspect the front/back cover, and read liner notes.
* **Classic LP Player Interaction:** Place a selected LP onto the turntable, lower the tonearm, and watch the platter spin with physical needle drop animations (visuals/turntable hum only, no actual audio stream).

### 3.3 Custom Content Creation & Editing (The Collection Editor)
Players can add and edit their custom vinyl records with full metadata control:
* **Cover Art Upload/Import:** Custom images for Front Cover, Back Cover, Gatefold inner art, and Center Label design.
* **Vinyl Disc Customization:** Color, translucent effects, splatter pattern, etched designs, picture disc graphics.
* **Album Metadata Form:**
  * Album Title & Artist
  * Release Year & Record Label
  * Tracklist (Side A / Side B)
  * Personal Review / "Why I Love This Album" Note
  * Genre tags & Favorite Track Highlights

### 3.4 Showcase & Sharing Mode
* **Visitor/Showcase Mode:** Hide UI elements for cinematic camera shots and photo mode snapshots.
* **Interactive Inspection for Guests:** When sharing the space/file with someone, they can click on records to inspect your custom artwork, read your personal notes, and see what's currently spinning on the turntable.

---

## 4. UI / UX Design

| Screen / View | Primary Focus | Actions Available |
| :--- | :--- | :--- |
| **Room View** | Atmosphere & Room Setup | Navigate camera, open options, inspect bed/lighting, click on Turntable or Crate. |
| **Shelf View** | Tactile Crate Flipping | Flip left/right through album covers, pull album up to inspect, open Editor. |
| **Inspector View** | Detailed Album View | Rotate 3D LP sleeve, slide vinyl out, read custom notes/tracklist, take photo. |
| **Turntable View** | Classic LP Player | Drag LP to platter, lower tonearm, start spinning platter, tweak player dials. |
| **Album Editor UI** | Customization Modal | Add image files, fill text fields, select vinyl color/style, save to collection. |

---

## 5. Technical & Aesthetic Specifications
* **Art Style:** Warm, semi-realistic or low-poly cozy art with soft lighting and subtle depth of field.
* **Color Palette:** Warm wood tones, ambient lamp glows, deep vinyl blacks, and rich vibrant artwork contrast.
* **Audio Design:** Atmospheric ambient room sounds (rain on window, soft fan noise, gentle room tone) and physical mechanical sound effects (clicking switches, record sliding into sleeve, tonearm lift click).

---

## 6. Development Roadmap / Milestones
1. **Phase 1: Core Mechanics & Room (MVP)**
   * Implement 3D/2D bedroom environment with bed, shelf, and turntable.
   * Camera switching (Room View $\leftrightarrow$ Turntable View $\leftrightarrow$ Crate View).
2. **Phase 2: Album Data & Custom Editor**
   * Create JSON/local storage data structure for album metadata.
   * Build the UI for adding/editing albums and custom image imports.
3. **Phase 3: Tactile Interactions & Aesthetics**
   * Add physical flipping animation for record crates.
   * Add vinyl extraction, tonearm placement, and spinning platter animations.
4. **Phase 4: Showcase & Polish**
   * Implement Photo Mode, UI toggles, custom room lighting presets, and exportable showcase files.
```

eof

I have drafted a Game Design Document for your room-based LP showcase game. It outlines the core gameplay loops, user editing capabilities, camera setups, and technical specifications for sharing your favorite records with others!