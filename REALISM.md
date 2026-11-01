# Realism checklist: every item in the room

Goal: each object should read as the real thing up close, not as a stack of boxes. The bed sets the bar
(`web/components/room/Bed.tsx`): real proportions, rounded edges, soft or detailed geometry where it matters,
proper materials, and a slightly lived-in irregularity.

Loop rule: one item per pass, in order → rebuild it, `npm run build` + `lint` + `test` pass, close-up screenshots in
headless Chrome from two angles (fix what looks wrong), `npm run check` (no flash/tile artifacts, 60 fps), tick with a
short note, commit. Keep each item's click behaviour and anything that rests on or plugs into it working.
Shared helpers (rounded boxes, UV projection, soft shapes) move out of Bed.tsx into `Surface.tsx` the first time a
second item needs them. `(ask)` items wait for the owner.

## Done
- [x] Bed: walnut frame, tufted headboard, rounded mattress, plump pillows, draped cloth duvet, knitted throw (9e48fcc).
- [x] Window: real opening onto a 3D city with parallax (d3dd0ef).

## Furniture
- [x] Desk: rounded walnut top with edge banding, steel legs with feet, a cable tray, a proper desk mat (stitched edge, cloth texture). — `Desk.tsx`: rounded walnut top (9 mm radius), black powder-coated steel T-legs (uprights, feet with levelling pads, top brackets, beam), cable tray under the back edge, cloth mat with a stitched border. `projectUVs`/`rounded` moved from Bed.tsx to Surface.tsx for reuse. Top stays at T = 0.75, so everything on it is unchanged. Close-up + low-angle screenshots checked; check 0 flagged, 60 fps.
- [x] Gaming chair: curved bucket seat and back (soft shapes), side bolsters, headrest pillow, armrests on posts, gas lift, 5-star base with caster wheels. — `Chair.tsx`: bucket seat with raised bolsters and a sitting dip; racing back narrowing at the waist, bolsters wrapping forward, lumbar push; two-tone via vertex colours (black centre, the per-load accent on the bolsters); headrest pillow (hidden when the hoodie is draped over); armrest brackets, posts and pads; seat mechanism, chrome gas lift, 5-star base with twin-wheel casters. Leather keeps the photo's grain and roughness only (`grainOnly`: the photo is orange-brown and turned cyan accents green). New shared `softBox()` in Surface.tsx: evenly subdivided (~1.2 cm), self-rounded box with a deform + tint callback (three's RoundedBoxGeometry leaves flat faces as one quad, so nothing could bend or two-tone). Three angles checked (magenta and cyan accents across loads); check 0 flagged, 60 fps.
- [x] Nightstand: drawer with a gap line and handle, rounded edges, legs or plinth (currently a metal box). — `Nightstand.tsx`: mid-century walnut — top with a slight overhang, rounded carcass, two drawer fronts with real 4 mm gaps over a dark backing, brass bar pulls on posts, four splayed tapered legs, magenta LED under the top's front edge. Lamp height unchanged (top at 0.54). Front and side screenshots checked; check 0 flagged, 60 fps.
- [ ] Record cabinet: real shelving unit (wood or painted MDF), rounded edges, back panel, small kick plate; records keep their cubbies.
- [ ] Record crate: wooden slats with gaps and hand-hole cutouts, rounded corners.
- [ ] Closet: sliding doors with frames, recessed handles, top rail and a sliver of the track; hoodie hook.
- [ ] Door: panelled door (raised panels), casing with profile, lever handle and rose, hinges.
- [ ] Wall shelf: floating shelf; books with spines (titles band, varied heights, slight lean), bookends; plant in a pot with real leaves.

## Desk setup and gadgets
- [ ] Monitor: thin bezel, curved back with vents, V-shaped stand, the game screen with a little glow; webcam with lens.
- [ ] Keyboard: keycaps as rows of keys with per-key RGB under them, wrist rest; mouse with real mouse shape and scroll wheel.
- [ ] Speakers: rounded cabinets with woofer and tweeter cones, grilles.
- [ ] Headset: proper headband arc, padded ear cups with cushions, stand with a weighted base.
- [ ] PC tower: tempered-glass side showing GPU, RAM and RGB fans with blades; front mesh; power LED.
- [ ] Laptop: thin chassis with hinge, keyboard deck with keys and trackpad, screen bezel.
- [ ] Phone and controller: rounded phone with camera bump; controller with real grips, sticks, D-pad and buttons.
- [ ] Drinks and bin: cans with tapered top and ring pull, a mug with a handle; mesh/plastic bin with a rim; crumpled paper balls (lumpy, not spheres).

## Clothes and clutter
- [ ] Hoodie: soft cloth with hood, sleeves and pocket (on the chair, the floor or the hook).
- [ ] Jeans: crumpled denim with legs and waistband, denim colour/texture.
- [ ] Sneakers: sole with toe spring, upper with laces and collar opening.
- [x] ~~Backpack: padded body with zip lines, front pocket, straps, top handle.~~ Removed: owner doesn't want a backpack.
- [ ] Basketball: pebbled orange ball with black seams.
- [ ] Skateboard: concave deck with kicktails and grip tape, trucks and wheels.

## Turntable and records
- [ ] Turntable: plinth with rounded edges, metal platter with slipmat, strobe dots, real tonearm (S-shape, counterweight, headshell), dust cover hinges, start button and speed selector.
- [ ] Records: sleeves with card thickness and slightly worn corners; disc label and grooves already there; framed favourites in real frames.

## Room details
- [ ] Walls and ceiling: subtle wall corners / skirting profile, ceiling light as a real fixture (diffuser + rim), smoke detector shape.
- [ ] Sockets and switch: proper faceplates with screws and socket holes.
- [ ] Blinds: slats with a slight curve, ladder cords, tilt wand.
- [ ] Posters: paper with a slight curl, pins or tape at the corners, faint gloss.
- [ ] Rug: (ask) keep the glowing grid, or a real rug with pile, fringe and a printed grid.
- [ ] Lamp: shade with a real rim and fabric, bulb glow inside, cable, base with switch.
- [ ] Cables: plugs at the socket ends, slight sag and a cable clip or two.

## Last
- [ ] Whole-room pass: consistent scale, materials and brightness across all items; perf check (draw calls, 60 fps at 4× CPU throttle); merge static meshes if draws grow past ~600.
