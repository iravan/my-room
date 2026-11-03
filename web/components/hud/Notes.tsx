"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useGame } from "@/lib/store";
import { useNotes, type Book } from "@/lib/notes";

const close = () => useGame.setState({ dialog: "" });
const setPages = (pages: string[]) => useNotes.setState({ pages });

// The notebook from the desk: one page at a time in handwriting on lined paper; edit, add, delete, turn pages.
function NotesDialog() {
  const open = useGame((s) => s.dialog === "notes"), pages = useNotes((s) => s.pages);
  const [page, setPage] = useState(0), [draft, setDraft] = useState<string | null>(null);
  const at = Math.min(page, pages.length - 1);
  const apply = () => { if (draft !== null) setPages(pages.with(at, draft)); setDraft(null); };
  const turn = (d: number) => { apply(); setPage(Math.min(pages.length - 1, Math.max(0, at + d))); };
  const add = () => { apply(); setPages([...pages.slice(0, at + 1), "", ...pages.slice(at + 1)]); setPage(at + 1); setDraft(""); };
  const remove = () => { if (pages[at] && !confirm("Delete this page?")) return; setDraft(null); setPages(pages.length > 1 ? pages.filter((_, i) => i !== at) : [""]); setPage(Math.max(0, at - 1)); };
  return (
    // Closing keeps an unapplied edit rather than throwing it away.
    <Dialog open={open} onOpenChange={(o) => { if (!o) { apply(); close(); } }}>
      <DialogContent className="sm:max-w-2xl" onKeyDown={(e) => { if (draft === null && e.key === "ArrowLeft") turn(-1); if (draft === null && e.key === "ArrowRight") turn(1); }}>
        <DialogHeader><DialogTitle>Notebook</DialogTitle></DialogHeader>
        {draft !== null ? (
          <Textarea autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} className="h-[55dvh] resize-none" placeholder="Write your note…" />
        ) : (
          <div
            onDoubleClick={() => setDraft(pages[at])}
            className="h-[55dvh] overflow-y-auto whitespace-pre-wrap break-words rounded-md border-l-8 border-double border-rose-300 bg-[#fdfbf3] px-6 pt-1 text-[1.7rem] leading-[2.25rem] text-[#1c2a6b] [background-image:repeating-linear-gradient(transparent_0,transparent_calc(2.25rem-1px),#b9cde6_calc(2.25rem-1px),#b9cde6_2.25rem)] [background-attachment:local]"
            style={{ fontFamily: "var(--font-hand), var(--font-hand-zh), var(--font-hand-ko), cursive" }}
          >
            {pages[at] || <span className="text-[#1c2a6b]/35">Empty page. Press Edit (or double-click) to write.</span>}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-1">
          <Button size="sm" variant="outline" disabled={at === 0} onClick={() => turn(-1)}>‹ Prev</Button>
          <span className="w-24 text-center text-zinc-400">Page {at + 1} / {pages.length}</span>
          <Button size="sm" variant="outline" disabled={at === pages.length - 1} onClick={() => turn(1)}>Next ›</Button>
          <div className="ml-auto flex gap-1">
            {draft !== null ? (
              <>
                <Button size="sm" variant="secondary" onClick={() => setDraft(null)}>Cancel</Button>
                <Button size="sm" onClick={apply}>Apply</Button>
              </>
            ) : (
              <>
                <Button size="sm" variant="outline" onClick={remove}>Delete page</Button>
                <Button size="sm" variant="outline" onClick={add}>+ New page</Button>
                <Button size="sm" onClick={() => setDraft(pages[at])}>Edit</Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const W = 1000, H = 700; // same aspect as the board in the room (1 × 0.7 m)
const INKS = ["#1a1a1a", "#1d4ed8", "#dc2626", "#16a34a"];
const SIZES = [4, 10, 22];

// The whiteboard on the wall: draw with a marker, erase, wipe. Saved after every stroke, shown on the board in the room.
function BoardDialog() {
  const open = useGame((s) => s.dialog === "board");
  const [ink, setInk] = useState(INKS[0]), [size, setSize] = useState(SIZES[1]), [eraser, setEraser] = useState(false);
  const canvas = useRef<HTMLCanvasElement | null>(null), last = useRef<[number, number] | null>(null);
  const ctx = () => canvas.current!.getContext("2d")!;
  const wipe = () => { const c = ctx(); c.fillStyle = "#fff"; c.fillRect(0, 0, W, H); };
  // A fresh canvas each time the dialog opens: white, then the saved drawing on top.
  const mount = (el: HTMLCanvasElement | null) => {
    canvas.current = el;
    if (!el) return;
    wipe();
    const saved = useNotes.getState().board;
    if (saved) { const img = new Image(); img.onload = () => ctx().drawImage(img, 0, 0, W, H); img.src = saved; }
  };
  const at = (e: React.PointerEvent): [number, number] => {
    const r = canvas.current!.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H];
  };
  const stroke = (to: [number, number]) => {
    const c = ctx(), from = last.current ?? to;
    c.strokeStyle = eraser ? "#fff" : ink; c.lineWidth = eraser ? 40 : size; c.lineCap = c.lineJoin = "round";
    c.beginPath(); c.moveTo(...from); c.lineTo(...to); c.stroke();
    last.current = to;
  };
  const save = () => { if (last.current) useNotes.setState({ board: canvas.current!.toDataURL("image/png") }); last.current = null; };
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) close(); }}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader><DialogTitle>Whiteboard</DialogTitle></DialogHeader>
        <canvas
          ref={mount} width={W} height={H}
          className="aspect-[10/7] max-h-[65dvh] w-full touch-none rounded-md border-8 border-zinc-300 bg-white"
          style={{ cursor: "crosshair" }}
          onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); last.current = null; stroke(at(e)); }}
          onPointerMove={(e) => { if (e.buttons) stroke(at(e)); }}
          onPointerUp={save}
          onPointerCancel={save}
        />
        <div className="flex flex-wrap items-center gap-1">
          {INKS.map((c) => (
            <button key={c} aria-label={`Marker ${c}`} onClick={() => { setInk(c); setEraser(false); }}
              className={`size-7 rounded-full border-2 ${!eraser && ink === c ? "border-cyan-300" : "border-transparent"}`} style={{ background: c }} />
          ))}
          {SIZES.map((s) => (
            <Button key={s} size="sm" variant={!eraser && size === s ? "default" : "outline"} onClick={() => { setSize(s); setEraser(false); }}>
              <span className="rounded-full bg-current" style={{ width: s / 1.5 + 2, height: s / 1.5 + 2 }} />
            </Button>
          ))}
          <Button size="sm" variant={eraser ? "default" : "outline"} onClick={() => setEraser(true)}>Eraser</Button>
          <Button size="sm" variant="outline" className="ml-auto" onClick={() => { wipe(); useNotes.setState({ board: "" }); }}>Wipe board</Button>
          <Button size="sm" onClick={close}>Done</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const setBooks = (books: Book[]) => useNotes.setState({ books });
const cell = "w-full bg-transparent px-2 py-1.5 outline-none focus:bg-cyan-400/10 focus:ring-1 focus:ring-cyan-400";

// The bookshelf's list, edited like a spreadsheet: type straight into the cells (Tab = next cell, Enter = next row's
// title, a new row at the end), click a star to rate.
function BooksDialog() {
  const open = useGame((s) => s.dialog === "books"), books = useNotes((s) => s.books);
  const table = useRef<HTMLTableElement>(null);
  const edit = (i: number, b: Partial<Book>) => setBooks(books.with(i, { ...books[i], ...b }));
  const focus = (row: number, col: number) => requestAnimationFrame(() => table.current?.querySelector<HTMLInputElement>(`[data-cell="${row}-${col}"]`)?.focus());
  const add = () => { setBooks([...books, { title: "", author: "", stars: 3 }]); focus(books.length, 0); };
  const enter = (i: number) => (e: React.KeyboardEvent) => {
    if (e.key !== "Enter") return;
    if (i === books.length - 1) add(); else focus(i + 1, 0);
  };
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) close(); }}>
      <DialogContent className="sm:max-w-5xl">
        <DialogHeader><DialogTitle>Bookshelf</DialogTitle></DialogHeader>
        <div className="max-h-[60dvh] overflow-y-auto rounded-md border border-zinc-700">
          <table ref={table} className="w-full border-collapse text-sm [&_td]:border [&_td]:border-zinc-700 [&_th]:border [&_th]:border-zinc-700">
            <thead className="sticky top-0 bg-zinc-800 text-left text-zinc-300">
              <tr><th className="w-10 px-2 py-1.5 text-center">#</th><th className="px-2 py-1.5">Title</th><th className="px-2 py-1.5">Author</th><th className="w-36 px-2 py-1.5">Rating</th><th className="px-2 py-1.5">Remark</th><th className="w-9" /></tr>
            </thead>
            <tbody>
              {books.map((b, i) => (
                <tr key={i}>
                  <td className="bg-zinc-800/60 text-center text-zinc-500">{i + 1}</td>
                  <td><input data-cell={`${i}-0`} aria-label={`Title ${i + 1}`} className={cell} value={b.title} onChange={(e) => edit(i, { title: e.target.value })} onKeyDown={enter(i)} /></td>
                  <td><input data-cell={`${i}-1`} aria-label={`Author ${i + 1}`} className={cell} value={b.author} onChange={(e) => edit(i, { author: e.target.value })} onKeyDown={enter(i)} /></td>
                  <td className="px-2 whitespace-nowrap">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button key={n} aria-label={`${n} stars`} onClick={() => edit(i, { stars: n })}
                        className={`px-0.5 text-lg leading-none ${n <= b.stars ? "text-amber-400" : "text-zinc-600 hover:text-amber-200"}`}>★</button>
                    ))}
                  </td>
                  <td><input data-cell={`${i}-2`} aria-label={`Remark ${i + 1}`} className={cell} value={b.remark ?? ""} onChange={(e) => edit(i, { remark: e.target.value })} onKeyDown={enter(i)} /></td>
                  <td className="text-center">
                    <button aria-label={`Delete row ${i + 1}`} className="px-2 text-zinc-500 hover:text-red-400"
                      onClick={() => { if ((!b.title && !b.author && !b.remark) || confirm(`Delete “${b.title || b.author}”?`)) setBooks(books.filter((_, j) => j !== i)); }}>✕</button>
                  </td>
                </tr>
              ))}
              {!books.length && <tr><td colSpan={6} className="px-2 py-6 text-center text-zinc-500">No books yet. Add one below.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="outline" onClick={add}>+ Add book</Button>
          <span className="ml-2 text-zinc-500">{books.length} book{books.length === 1 ? "" : "s"}</span>
          <Button size="sm" className="ml-auto" onClick={close}>Done</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function NotesDialogs() {
  return <><NotesDialog /><BoardDialog /><BooksDialog /></>;
}
