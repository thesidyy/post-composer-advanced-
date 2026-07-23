import { useState, useEffect, useRef, useCallback } from 'react'
import './App.css'
import * as api from './api.js'

/* ── Constants ───────────────────────────────────────────── */
const MAX_CHARS        = 500
const MAX_IMAGES       = 4
const MAX_IMAGE_BYTES  = 8 * 1024 * 1024   // 8 MB
const VALID_IMG_TYPES  = ['image/jpeg', 'image/png', 'image/webp']
const THEME_KEY        = 'postcomposer_theme'
const RECENT_EMOJI_KEY = 'postcomposer_recent_emoji'

/* ── GIF data ────────────────────────────────────────────── */
// Set VITE_TENOR_API_KEY in a .env file at the project root for live Tenor search.
// Without it, the local fallback library below is used instead.
// TODO: add VITE_TENOR_API_KEY to .env for live search
const FALLBACK_GIFS = [
  { id: 'f01', title: 'Thumbs Up',   url: 'https://media.giphy.com/media/111ebonMs90YLu/giphy.gif' },
  { id: 'f02', title: 'Slow Clap',   url: 'https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif' },
  { id: 'f03', title: 'Mind Blown',  url: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif' },
  { id: 'f04', title: 'Nod',         url: 'https://media.giphy.com/media/XreQmk7ETCak0/giphy.gif' },
  { id: 'f05', title: 'Shrug',       url: 'https://media.giphy.com/media/Ll22ODKo6tMFO/giphy.gif' },
  { id: 'f06', title: 'Party',       url: 'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif' },
  { id: 'f07', title: 'LOL',         url: 'https://media.giphy.com/media/nNxT5qXR02FOM/giphy.gif' },
  { id: 'f08', title: 'Wow',         url: 'https://media.giphy.com/media/5VKbvrjxpVJCM/giphy.gif' },
  { id: 'f09', title: 'Facepalm',    url: 'https://media.giphy.com/media/XsUtdIeJ0MWMo/giphy.gif' },
  { id: 'f10', title: 'Yes',         url: 'https://media.giphy.com/media/d9IfL7seBexHG/giphy.gif' },
  { id: 'f11', title: 'No',          url: 'https://media.giphy.com/media/3o7TKSjRrfIPjeiVyM/giphy.gif' },
  { id: 'f12', title: 'Dance',       url: 'https://media.giphy.com/media/yoJC2GnSClbPOkV0eA/giphy.gif' },
]

async function fetchGifs(query) {
  const key = import.meta.env.VITE_TENOR_API_KEY
  if (!key) {
    const q = query.toLowerCase().trim()
    return q
      ? FALLBACK_GIFS.filter(g => g.title.toLowerCase().includes(q))
      : FALLBACK_GIFS
  }
  try {
    const endpoint = query
      ? `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(query)}&key=${key}&limit=12&media_filter=gif`
      : `https://tenor.googleapis.com/v2/featured?key=${key}&limit=12&media_filter=gif`
    const res  = await fetch(endpoint)
    const data = await res.json()
    return (data.results || []).map(r => ({
      id:    r.id,
      title: r.title || r.id,
      url:   r.media_formats?.gif?.url || r.media_formats?.tinygif?.url,
    }))
  } catch {
    return FALLBACK_GIFS
  }
}

/* ── Emoji data ──────────────────────────────────────────── */
const EMOJI_DATA = {
  Smileys: ['😀','😁','😂','🤣','😃','😄','😅','😆','😉','😊','😋','😎','😍','🥰','😘','🤩','😏','😒','😞','😔','😟','🙁','😣','😖','😫','😩','🥺','😢','😭','😤','😠','😡','🤬','🤯','😳','😱','😨','😰','😥','😓','🤗','🤔','😶','😐','😑','😬','🙄','😯','😦','😧','😮','😲','🥱','😴','🤤','😪','😵','🤐','🥴','🤢','🤮','🤧','😷','🤒','🤕'],
  People:  ['👋','🤚','🖐️','✋','🖖','👌','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🙏','💪','🤳','💁','🙋','🤷','🤦','🙅','🙆','💆','💇','🚶','🏃','💃','🕺','🧑','👦','👧','👨','👩','🧔','👴','👵','👼','🎅','🤶','🦸','🦹','🧙','🧚','🧛','🧜','🧝'],
  Nature:  ['🌱','🌿','☘️','🍀','🎋','🍃','🍂','🍁','🍄','🌾','💐','🌷','🌹','🥀','🌺','🌸','🌼','🌻','🌞','🌝','🌛','🌚','🌕','🌙','⭐','🌟','✨','💫','☄️','🔥','💧','🌊','🌈','❄️','⛄','🌬️','🌀','🌪️','🌅','🌄','🏙️','🐶','🐱','🐭','🐰','🦊','🐻','🐼','🐯','🦁','🐮','🐷','🐸','🐵','🐔','🦆','🦅','🦉','🐢','🐍','🦋','🐞','🐜','🐝','🐙','🦑','🐠','🐬','🐳','🦈','🐊','🐅','🐆','🦓','🦍','🐘','🦒','🦘','🐕','🐈'],
  Food:    ['🍕','🍔','🌮','🌯','🥗','🍝','🍜','🍛','🍣','🍱','🍤','🍙','🍚','🍘','🥮','🧆','🥚','🍳','🥞','🧇','🥓','🥩','🍗','🍖','🌭','🍟','🫓','🥪','🥙','🧈','🥫','🍲','🍡','🧁','🍰','🎂','🍮','🍭','🍬','🍫','🍿','🍩','🍪','🌰','🥜','🍯','🧃','🥤','🍵','☕','🍺','🍻','🥂','🍷','🥃','🍸','🍹','🧉','🧋','🍶','🍾','🥛'],
  Travel:  ['🚀','✈️','🛸','🚂','🚃','🚄','🚅','🚆','🚇','🚈','🚉','🚊','🚋','🚌','🚎','🚐','🚑','🚒','🚓','🚕','🚗','🚙','🛻','🚚','🚛','🚜','🏎️','🏍️','🛵','🚲','🛴','🛹','🚨','🚥','🚦','🛑','🚧','⛽','🗺️','🧭','🌍','🌎','🌏','🏔️','⛰️','🗻','🏕️','🏖️','🏜️','🏝️','🏞️','🏟️','🏛️','🏗️','🏘️','🏠','🏡','🏢','🏥','🏦','🏨','🏩','🏪','🏫','🏬','🏭','🏯','🏰','💒','🗼','🗽','⛪','🕌','🕍','⛩️','🕋','⛲','⛺','🌃','🌆','🌇','🌉','🌌'],
  Objects: ['💡','🔦','🕯️','🪔','🔑','🗝️','🔐','🔏','🔓','🔒','🔨','🪓','⛏️','⚒️','🛠️','🔧','🪛','🔩','⚙️','🗜️','⚖️','🔗','⛓️','🧲','💊','🩺','🩹','🩻','🔬','🔭','📡','💰','💳','💸','📱','💻','⌨️','🖥️','🖨️','🖱️','💾','💿','📀','📷','📸','📹','🎥','📽️','🎞️','📞','☎️','📟','📠','📺','📻','🧭','⏱️','⏲️','⏰','🕰️','⌛','⏳','🔋','🔌','🧰','🪤','🧺','🧹','🧻','🚪','🛏️','🛋️','🪑','🚽','🚿','🛁','🧴','🧷','🧼','🪥','🧽','🛒'],
  Symbols: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟','☮️','✝️','☯️','🔱','📛','🔰','⭕','✅','☑️','✔️','❌','❎','➕','➖','➗','✖️','♾️','💲','💱','™️','©️','®️','🔷','🔶','🔸','🔹','🔺','🔻','💠','🔘','🔲','🔳','⬛','⬜','◼️','◻️','◾','◽','▪️','▫️','🔈','🔉','🔊','📢','📣','🔔','🔕','🎵','🎶','✨','🎉','🎊','🎈','🎀','🎁','🏆','🥇','🥈','🥉','🏅','🎳','🎯','🎲','🎰','🎮','🕹️','🧩','♟️','🎭','🎨','🎬','🎤','🎧','🎼','🎹','🥁','🎷','🎺','🎸','🎻'],
}

/* ── Helpers ─────────────────────────────────────────────── */
function timeAgo(ts) {
  const diff = Date.now() - ts
  const s = Math.floor(diff / 1000)
  if (s < 60)  return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60)  return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24)  return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7)   return `${d}d ago`
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

/* resizeImageToDataUrl removed — images now go directly to Cloudinary via API */

/* ── SVG Icons ───────────────────────────────────────────── */
const IconAttach = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
  </svg>
)

const IconEmoji = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <path d="M8 13s1.5 2 4 2 4-2 4-2" />
    <line x1="9" y1="9" x2="9.01" y2="9" strokeWidth="3" strokeLinecap="round" />
    <line x1="15" y1="9" x2="15.01" y2="9" strokeWidth="3" strokeLinecap="round" />
  </svg>
)

const IconTrash = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14H6L5 6" />
    <path d="M10 11v6M14 11v6M9 6V4h6v2" />
  </svg>
)

const IconX = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

const IconChevLeft = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="15 18 9 12 15 6" />
  </svg>
)

const IconChevRight = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="9 18 15 12 9 6" />
  </svg>
)

const IconSun = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
)

const IconMoon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
)

const IconSearch = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
)

/* ── Toast ───────────────────────────────────────────────── */
function Toast({ toasts }) {
  return (
    <div className="toast-container" aria-live="polite" aria-atomic="true">
      {toasts.map(t => <div key={t.id} className="toast" role="status">{t.msg}</div>)}
    </div>
  )
}

/* ── Lightbox ────────────────────────────────────────────── */
function Lightbox({ images, startIndex, onClose }) {
  const [idx, setIdx] = useState(startIndex)
  const total = images.length

  useEffect(() => {
    const onKey = e => {
      if (e.key === 'Escape')     onClose()
      if (e.key === 'ArrowLeft')  setIdx(i => Math.max(0, i - 1))
      if (e.key === 'ArrowRight') setIdx(i => Math.min(total - 1, i + 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [total, onClose])

  return (
    <div className="lightbox-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Image viewer">
      <button className="lightbox-close" onClick={onClose} aria-label="Close lightbox"><IconX /></button>

      {total > 1 && idx > 0 && (
        <button
          className="lightbox-arrow lightbox-arrow-left"
          onClick={e => { e.stopPropagation(); setIdx(i => i - 1) }}
          aria-label="Previous image"
        ><IconChevLeft /></button>
      )}

      <div className="lightbox-img-wrap" onClick={e => e.stopPropagation()}>
        <img src={images[idx].url || images[idx].dataUrl} alt={`Image ${idx + 1} of ${total}`} className="lightbox-img" draggable="false" />
        {total > 1 && <div className="lightbox-counter">{idx + 1} / {total}</div>}
      </div>

      {total > 1 && idx < total - 1 && (
        <button
          className="lightbox-arrow lightbox-arrow-right"
          onClick={e => { e.stopPropagation(); setIdx(i => i + 1) }}
          aria-label="Next image"
        ><IconChevRight /></button>
      )}
    </div>
  )
}

/* ── Post image grid ─────────────────────────────────────── */
function PostImageGrid({ images, onImageClick }) {
  const count = Math.min(images.length, 4)
  return (
    <div className={`post-image-grid count-${count}`}>
      {images.slice(0, 4).map((img, i) => (
        <button
          key={img.id}
          className="post-image-btn"
          onClick={() => onImageClick(i)}
          aria-label={`Open image ${i + 1} of ${count}`}
          tabIndex={0}
        >
          {/* img.url is a Cloudinary CDN URL; img.dataUrl kept for backward-compat preview */}
          <img src={img.url || img.dataUrl} alt="" className="post-img" loading="lazy" />
        </button>
      ))}
    </div>
  )
}

/* ── GIF Picker ──────────────────────────────────────────── */
function GifPicker({ onSelect, onClose }) {
  const [query, setQuery]     = useState('')
  const [gifs, setGifs]       = useState(FALLBACK_GIFS)
  const [loading, setLoading] = useState(false)
  const searchRef = useRef(null)

  useEffect(() => { searchRef.current?.focus() }, [])

  useEffect(() => {
    let cancelled = false
    const timer = setTimeout(async () => {
      setLoading(true)
      const results = await fetchGifs(query)
      if (!cancelled) { setGifs(results); setLoading(false) }
    }, 280)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [query])

  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className="picker-panel gif-picker" role="dialog" aria-label="GIF picker">
      <div className="picker-header">
        <span className="picker-title">GIFs</span>
        <button className="picker-close" onClick={onClose} aria-label="Close GIF picker"><IconX /></button>
      </div>
      <div className="picker-search">
        <span className="picker-search-icon"><IconSearch /></span>
        <input
          ref={searchRef}
          className="picker-search-input"
          placeholder="Search GIFs..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          aria-label="Search GIFs"
        />
      </div>
      {!import.meta.env.VITE_TENOR_API_KEY && (
        <p className="picker-api-note">Local fallback · add VITE_TENOR_API_KEY to .env for live results</p>
      )}
      <div className="gif-grid">
        {loading
          ? <p className="picker-loading">Loading…</p>
          : gifs.length === 0
            ? <p className="picker-empty">No results for &ldquo;{query}&rdquo;</p>
            : gifs.map(g => (
                <button
                  key={g.id}
                  className="gif-item"
                  onClick={() => onSelect(g)}
                  title={g.title}
                  aria-label={`Select GIF: ${g.title}`}
                >
                  <img src={g.url} alt={g.title} loading="lazy" />
                </button>
              ))
        }
      </div>
    </div>
  )
}

/* ── Emoji Picker ────────────────────────────────────────── */
function EmojiPicker({ onSelect, onClose, recentEmoji }) {
  const [search, setSearch]     = useState('')
  const [category, setCategory] = useState(recentEmoji.length > 0 ? 'Recent' : 'Smileys')
  const searchRef = useRef(null)
  const categories = Object.keys(EMOJI_DATA)

  useEffect(() => { searchRef.current?.focus() }, [])

  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const displayEmojis = (() => {
    if (search) {
      // Search by category name, fall back to showing all
      const q = search.toLowerCase().trim()
      const matchedCat = categories.find(c => c.toLowerCase().startsWith(q))
      return matchedCat ? EMOJI_DATA[matchedCat] : [...new Set(categories.flatMap(c => EMOJI_DATA[c]))]
    }
    if (category === 'Recent') return recentEmoji
    return EMOJI_DATA[category] || []
  })()

  return (
    <div className="picker-panel emoji-picker" role="dialog" aria-label="Emoji picker">
      <div className="picker-header">
        <span className="picker-title">Emoji</span>
        <button className="picker-close" onClick={onClose} aria-label="Close emoji picker"><IconX /></button>
      </div>
      <div className="picker-search">
        <span className="picker-search-icon"><IconSearch /></span>
        <input
          ref={searchRef}
          className="picker-search-input"
          placeholder="Category name to filter…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          aria-label="Filter emoji by category"
        />
      </div>
      {!search && (
        <div className="emoji-category-tabs" role="tablist">
          {recentEmoji.length > 0 && (
            <button
              className={`emoji-cat-btn ${category === 'Recent' ? 'active' : ''}`}
              onClick={() => setCategory('Recent')}
              title="Recently used"
              role="tab"
              aria-selected={category === 'Recent'}
            >🕐</button>
          )}
          {categories.map(cat => (
            <button
              key={cat}
              className={`emoji-cat-btn ${category === cat ? 'active' : ''}`}
              onClick={() => setCategory(cat)}
              title={cat}
              role="tab"
              aria-selected={category === cat}
            >
              {EMOJI_DATA[cat][0]}
            </button>
          ))}
        </div>
      )}
      {displayEmojis.length === 0
        ? <p className="picker-empty">No recent emoji yet</p>
        : (
          <div className="emoji-grid" role="group" aria-label={`${category} emoji`}>
            {displayEmojis.map((emoji, i) => (
              <button
                key={`${emoji}-${i}`}
                className="emoji-btn"
                onClick={() => onSelect(emoji)}
                aria-label={emoji}
                title={emoji}
              >{emoji}</button>
            ))}
          </div>
        )
      }
    </div>
  )
}

/* ── Post Card ───────────────────────────────────────────── */
function PostCard({ post, onLike, onBookmark, onDelete, onTagClick }) {
  const [lightboxIdx, setLightboxIdx] = useState(null)

  return (
    <article className="post-card" id={`post-${post.id}`}>
      {/* Header */}
      <div className="post-card-header">
        <div className="post-meta-row">
          <div className="post-avatar" aria-hidden="true">Y</div>
          <div>
            <div className="post-author">You</div>
            <time className="post-time" dateTime={new Date(post.ts).toISOString()}>
              {timeAgo(post.ts)}
            </time>
          </div>
        </div>
        <div className="post-actions">
          <button
            className="action-btn delete"
            onClick={() => onDelete(post.id)}
            title="Delete post"
            aria-label="Delete post"
            id={`delete-${post.id}`}
          ><IconTrash /></button>
        </div>
      </div>

      {/* Text body */}
      {post.text && <p className="post-body">{post.text}</p>}

      {/* Images */}
      {post.images?.length > 0 && (
        <PostImageGrid images={post.images} onImageClick={i => setLightboxIdx(i)} />
      )}

      {/* GIF — autoplays, no sound needed (it's an img) */}
      {post.gif?.url && (
        <div className="post-gif-wrap">
          <img src={post.gif.url} alt={post.gif.title || 'GIF'} className="post-gif" loading="lazy" />
        </div>
      )}

      {/* Tags */}
      {post.tags?.length > 0 && (
        <div className="post-tags">
          {post.tags.map(t => (
            <button
              key={t}
              className="post-tag"
              onClick={() => onTagClick(t)}
              title={`Filter by #${t}`}
              id={`tag-${post.id}-${t}`}
            >#{t}</button>
          ))}
        </div>
      )}

      {/* Reactions */}
      <div className="post-footer">
        <button
          id={`like-${post.id}`}
          className={`react-btn ${post.liked ? 'active' : ''}`}
          onClick={() => onLike(post.id)}
          aria-pressed={post.liked}
          aria-label={post.liked ? 'Unlike' : 'Like'}
        >
          <em className="react-icon">{post.liked ? '♥' : '♡'}</em>
          {post.likes > 0 && <span className="react-count">{post.likes}</span>}
        </button>

        <button
          id={`bookmark-${post.id}`}
          className={`react-btn ${post.bookmarked ? 'active' : ''}`}
          onClick={() => onBookmark(post.id)}
          aria-pressed={post.bookmarked}
          aria-label={post.bookmarked ? 'Remove bookmark' : 'Bookmark'}
        >
          <em className="react-icon">{post.bookmarked ? '◈' : '◇'}</em>
          <span className="react-count">{post.bookmarked ? 'Saved' : 'Save'}</span>
        </button>
      </div>

      {/* Lightbox */}
      {lightboxIdx !== null && post.images?.length > 0 && (
        <Lightbox
          images={post.images}
          startIndex={lightboxIdx}
          onClose={() => setLightboxIdx(null)}
        />
      )}
    </article>
  )
}

/* ── Main App ────────────────────────────────────────────── */
export default function App() {
  /* Draft state */
  const [text, setText]               = useState('')
  const [tagInput, setTagInput]       = useState('')
  const [draftTags, setDraftTags]     = useState([])
  const [draftImages, setDraftImages] = useState([])    // [{id, url, publicId}] — Cloudinary
  const [draftGif, setDraftGif]       = useState(null)  // null | {id, title, url}
  const [imageError, setImageError]   = useState('')
  const [uploadingImages, setUploadingImages] = useState(false)
  const [dragOver, setDragOver]       = useState(false)

  /* Picker state */
  const [gifPickerOpen, setGifPickerOpen]     = useState(false)
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false)

  /* Feed state */
  const [posts, setPosts]         = useState([])
  const [feedLoading, setFeedLoading] = useState(true)
  const [feedError, setFeedError]     = useState('')
  const [publishing, setPublishing]   = useState(false)
  const [search, setSearch]       = useState('')
  const [filterTag, setFilterTag] = useState(null)
  const [sortAsc, setSortAsc]     = useState(false)
  const [theme, setTheme]         = useState(() =>
    localStorage.getItem(THEME_KEY) || 'dark'
  )
  const [toasts, setToasts]       = useState([])
  const [recentEmoji, setRecentEmoji] = useState(() => {
    try { return JSON.parse(localStorage.getItem(RECENT_EMOJI_KEY)) || [] }
    catch { return [] }
  })

  /* Refs */
  const textareaRef     = useRef(null)
  const cursorPosRef    = useRef(0)
  const pendingCursorRef = useRef(null)

  /* ── Load posts from API on mount ── */
  const loadPosts = useCallback(async (params = {}) => {
    setFeedLoading(true)
    setFeedError('')
    try {
      const { posts: fetched } = await api.getPosts(params)
      setPosts(fetched)
    } catch (err) {
      setFeedError(err.message || 'Failed to load posts.')
    } finally {
      setFeedLoading(false)
    }
  }, [])

  useEffect(() => { loadPosts() }, [loadPosts])

  /* Apply theme to <html> */
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem(THEME_KEY, theme)
  }, [theme])

  /* Restore cursor after emoji insert */
  useEffect(() => {
    if (pendingCursorRef.current !== null && textareaRef.current) {
      const pos = pendingCursorRef.current
      textareaRef.current.focus()
      textareaRef.current.setSelectionRange(pos, pos)
      pendingCursorRef.current = null
    }
  }, [text])

  /* Close pickers on outside click */
  useEffect(() => {
    if (!gifPickerOpen && !emojiPickerOpen) return
    const handler = e => {
      if (!e.target.closest('.composer-toolbar-wrap') && !e.target.closest('.picker-panel')) {
        setGifPickerOpen(false)
        setEmojiPickerOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [gifPickerOpen, emojiPickerOpen])

  /* Toast helper */
  const toast = useCallback((msg) => {
    const id = crypto.randomUUID()
    setToasts(p => [...p, { id, msg }])
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3000)
  }, [])

  /* ── Image handling ── */
  const handleImageFiles = useCallback(async (files) => {
    setImageError('')
    const available = MAX_IMAGES - draftImages.length
    if (available <= 0) {
      setImageError(`Maximum ${MAX_IMAGES} images per post`)
      return
    }

    const allFiles  = Array.from(files)
    const toUpload  = []
    const errors    = []

    for (const file of allFiles.slice(0, available)) {
      if (!VALID_IMG_TYPES.includes(file.type)) {
        errors.push(`${file.name}: only JPG, PNG or WebP allowed`)
        continue
      }
      if (file.size > MAX_IMAGE_BYTES) {
        errors.push(`${file.name}: exceeds 8 MB limit`)
        continue
      }
      toUpload.push(file)
    }

    if (errors.length) { setImageError(errors[0]); if (!toUpload.length) return }

    setUploadingImages(true)
    try {
      const uploaded = await api.uploadImages(toUpload)   // [{id, url, publicId}]
      setDraftGif(null)   // images and GIFs are mutually exclusive
      setDraftImages(p => [...p, ...uploaded].slice(0, MAX_IMAGES))
    } catch (err) {
      setImageError(err.message || 'Image upload failed.')
    } finally {
      setUploadingImages(false)
    }
  }, [draftImages.length])

  const removeImage = useCallback(id => setDraftImages(p => p.filter(img => img.id !== id)), [])

  /* Drag-and-drop */
  const handleDragOver  = e => { e.preventDefault(); setDragOver(true) }
  const handleDragLeave = () => setDragOver(false)
  const handleDrop = useCallback(async e => {
    e.preventDefault()
    setDragOver(false)
    await handleImageFiles([...e.dataTransfer.files])
  }, [handleImageFiles])

  /* Paste from clipboard */
  const handlePaste = useCallback(async e => {
    const items = [...(e.clipboardData?.items || [])]
      .filter(item => item.kind === 'file' && VALID_IMG_TYPES.includes(item.type))
    if (!items.length) return
    e.preventDefault()
    await handleImageFiles(items.map(i => i.getAsFile()).filter(Boolean))
  }, [handleImageFiles])

  /* GIF selection (clears images — mutually exclusive) */
  const handleGifSelect = useCallback(gif => {
    setDraftImages([])
    setDraftGif(gif)
    setGifPickerOpen(false)
  }, [])

  /* Track cursor position for emoji insertion */
  const handleTextareaEvent = e => { cursorPosRef.current = e.target.selectionStart }

  /* Emoji insertion at cursor */
  const handleEmojiSelect = useCallback(emoji => {
    const pos     = cursorPosRef.current
    const newText = text.slice(0, pos) + emoji + text.slice(pos)
    setText(newText)
    pendingCursorRef.current = pos + [...emoji].length  // correct for multi-codepoint emoji

    setRecentEmoji(prev => {
      const filtered = prev.filter(e => e !== emoji)
      const updated  = [emoji, ...filtered].slice(0, 8)
      localStorage.setItem(RECENT_EMOJI_KEY, JSON.stringify(updated))
      return updated
    })
    setEmojiPickerOpen(false)
  }, [text])

  /* Tags */
  const handleTagKeyDown = e => {
    const val = tagInput.trim().replace(/^#+/, '')
    if ((e.key === 'Enter' || e.key === ',') && val) {
      e.preventDefault()
      if (!draftTags.includes(val) && draftTags.length < 5) setDraftTags(p => [...p, val])
      setTagInput('')
    }
    if (e.key === 'Backspace' && !tagInput && draftTags.length) setDraftTags(p => p.slice(0, -1))
  }
  const removeTag = t => setDraftTags(p => p.filter(x => x !== t))

  /* Publish */
  const handlePost = useCallback(async () => {
    const hasContent = text.trim() || draftImages.length || draftGif
    if (!hasContent || text.length > MAX_CHARS || publishing) return
    setPublishing(true)
    try {
      const newPost = await api.createPost({
        text:   text.trim(),
        tags:   draftTags,
        images: draftImages,   // already have {id, url, publicId} from Cloudinary
        gif:    draftGif,
      })
      setPosts(p => [newPost, ...p])
      setText('')
      setDraftTags([])
      setTagInput('')
      setDraftImages([])
      setDraftGif(null)
      setImageError('')
      toast('Post published')
      textareaRef.current?.focus()
    } catch (err) {
      toast(`Failed to publish: ${err.message}`)
    } finally {
      setPublishing(false)
    }
  }, [text, draftTags, draftImages, draftGif, publishing, toast])

  const handleKeyDown = e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); handlePost() }
  }

  /* Post mutations — optimistic UI + API sync */
  const toggleLike = useCallback(async (id) => {
    // Optimistic update
    setPosts(p => p.map(post =>
      post.id === id
        ? { ...post, liked: !post.liked, likes: post.liked ? post.likes - 1 : post.likes + 1 }
        : post
    ))
    try {
      const updated = await api.likePost(id)
      setPosts(p => p.map(post => post.id === id ? updated : post))
    } catch {
      // Revert on failure
      setPosts(p => p.map(post =>
        post.id === id
          ? { ...post, liked: !post.liked, likes: post.liked ? post.likes - 1 : post.likes + 1 }
          : post
      ))
    }
  }, [])

  const toggleBookmark = useCallback(async (id) => {
    setPosts(p => p.map(post =>
      post.id === id ? { ...post, bookmarked: !post.bookmarked } : post
    ))
    try {
      const updated = await api.bookmarkPost(id)
      setPosts(p => p.map(post => post.id === id ? updated : post))
    } catch {
      setPosts(p => p.map(post =>
        post.id === id ? { ...post, bookmarked: !post.bookmarked } : post
      ))
    }
  }, [])

  const deletePost = useCallback(async (id) => {
    setPosts(p => p.filter(post => post.id !== id))
    try {
      await api.deletePost(id)
      toast('Post deleted')
    } catch (err) {
      toast(`Delete failed: ${err.message}`)
      loadPosts()   // reload to restore if delete failed
    }
  }, [toast, loadPosts])

  /* Derived */
  const allTags = [...new Set(posts.flatMap(p => p.tags || []))]
  const visiblePosts = posts
    .filter(p => {
      const q           = search.toLowerCase()
      const matchSearch = !q || (p.text || '').toLowerCase().includes(q) ||
                          (p.tags || []).some(t => t.toLowerCase().includes(q))
      const matchTag    = !filterTag || (p.tags || []).includes(filterTag)
      return matchSearch && matchTag
    })
    .sort((a, b) => sortAsc ? a.ts - b.ts : b.ts - a.ts)

  const chars      = text.length
  const charClass  = chars > MAX_CHARS ? 'danger' : chars > MAX_CHARS * 0.8 ? 'warn' : ''
  const isDisabled = (!text.trim() && !draftImages.length && !draftGif) || chars > MAX_CHARS || publishing || uploadingImages

  return (
    <div className="app-shell">
      {/* ── Topbar ── */}
      <header className="topbar">
        <div className="topbar-brand">
          <span className="brand-mark" aria-hidden="true">✦</span>
          <span className="brand-name">PostComposer</span>
        </div>
        <div className="topbar-actions">
          <button
            className="icon-btn"
            onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
            id="theme-toggle"
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
          >
            {theme === 'dark' ? <IconSun /> : <IconMoon />}
          </button>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="main-content">

        {/* ── Composer ── */}
        <div
          className={`composer-card${dragOver ? ' drag-over' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="composer-header">
            <div className="avatar" aria-hidden="true">Y</div>
            <div className="composer-meta">
              <strong>You</strong>
              <span>Compose a post</span>
            </div>
          </div>

          <textarea
            id="composer-textarea"
            ref={textareaRef}
            className="composer-textarea"
            placeholder="Start writing... (Ctrl+Enter to post)"
            value={text}
            onChange={e => { setText(e.target.value); handleTextareaEvent(e) }}
            onKeyDown={handleKeyDown}
            onClick={handleTextareaEvent}
            onSelect={handleTextareaEvent}
            onPaste={handlePaste}
            maxLength={MAX_CHARS + 100}
            aria-label="Post content"
          />

          {/* Image thumbnails */}
          {uploadingImages && (
            <div className="upload-status" role="status" aria-live="polite">
              <span className="upload-spinner" aria-hidden="true">⏳</span> Uploading…
            </div>
          )}
          {draftImages.length > 0 && (
            <div className="image-thumb-strip" aria-label="Attached images">
              {draftImages.map(img => (
                <div key={img.id} className="thumb-wrap">
                  <img src={img.url || img.dataUrl} alt="" className="thumb-img" />
                  <button
                    className="thumb-remove"
                    onClick={() => removeImage(img.id)}
                    aria-label="Remove this image"
                  ><IconX /></button>
                </div>
              ))}
              {draftImages.length < MAX_IMAGES && (
                <span className="thumb-count-hint">{draftImages.length}/{MAX_IMAGES}</span>
              )}
            </div>
          )}

          {/* GIF draft preview */}
          {draftGif && (
            <div className="gif-preview-wrap">
              <img src={draftGif.url} alt={draftGif.title || 'GIF'} className="gif-preview" />
              <button className="gif-remove" onClick={() => setDraftGif(null)} aria-label="Remove GIF">
                <IconX />
              </button>
            </div>
          )}

          {/* Validation error */}
          {imageError && <p className="image-error" role="alert">{imageError}</p>}

          {/* Drag overlay */}
          {dragOver && <div className="drag-overlay" aria-hidden="true">Drop images here</div>}

          {/* Tag input */}
          <div className="tag-input-row" aria-label="Tags">
            {draftTags.map(t => (
              <span key={t} className="tag-chip">
                #{t}
                <button className="remove-tag" onClick={() => removeTag(t)} aria-label={`Remove tag ${t}`}>×</button>
              </span>
            ))}
            <input
              id="tag-input"
              className="tag-input"
              placeholder={draftTags.length < 5 ? '#tag, press Enter' : 'Max 5 tags'}
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              disabled={draftTags.length >= 5}
              aria-label="Add a tag"
            />
          </div>

          {/* Toolbar + pickers */}
          <div className="composer-toolbar-wrap">
            <div className="composer-toolbar">
              <div className="toolbar-left">

                {/* Image attach */}
                <label
                  className="icon-btn"
                  title={draftImages.length >= MAX_IMAGES ? 'Max 4 images attached' : 'Attach images (JPG, PNG, WebP, up to 4)'}
                  htmlFor="image-file-input"
                  tabIndex={draftImages.length >= MAX_IMAGES ? -1 : 0}
                  style={{ opacity: draftImages.length >= MAX_IMAGES ? 0.3 : 1, pointerEvents: draftImages.length >= MAX_IMAGES ? 'none' : 'auto' }}
                  onKeyDown={e => e.key === 'Enter' && document.getElementById('image-file-input')?.click()}
                  aria-label="Attach images"
                  aria-disabled={draftImages.length >= MAX_IMAGES}
                >
                  <IconAttach />
                  <input
                    id="image-file-input"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    hidden
                    onChange={async e => {
                      await handleImageFiles(e.target.files)
                      e.target.value = ''
                    }}
                  />
                </label>

                {/* GIF button */}
                <button
                  className={`icon-btn${gifPickerOpen ? ' active' : ''}`}
                  title="Attach a GIF"
                  onClick={() => { setGifPickerOpen(v => !v); setEmojiPickerOpen(false) }}
                  aria-expanded={gifPickerOpen}
                  aria-controls="gif-picker-panel"
                  id="gif-btn"
                  style={{ fontFamily: "'Space Grotesk', system-ui", fontSize: '11px', fontWeight: 700, letterSpacing: '0.03em' }}
                >
                  GIF
                </button>

                {/* Emoji button */}
                <button
                  className={`icon-btn${emojiPickerOpen ? ' active' : ''}`}
                  title="Insert emoji"
                  onClick={() => { setEmojiPickerOpen(v => !v); setGifPickerOpen(false) }}
                  aria-expanded={emojiPickerOpen}
                  aria-controls="emoji-picker-panel"
                  id="emoji-btn"
                >
                  <IconEmoji />
                </button>

              </div>

              <div className="toolbar-right">
                <span className={`char-counter ${charClass}`} aria-live="polite" aria-label={`${chars} of ${MAX_CHARS} characters`}>
                  {chars}/{MAX_CHARS}
                </span>
                <button
                  id="post-btn"
                  className="post-btn"
                  onClick={handlePost}
                  disabled={isDisabled}
                  aria-disabled={isDisabled}
                >
                  {publishing ? 'Publishing…' : 'Publish'}
                  {!publishing && <span className="shortcut-hint" aria-hidden="true">⌘↵</span>}
                </button>
              </div>
            </div>

            {/* GIF picker */}
            {gifPickerOpen && (
              <div id="gif-picker-panel" className="picker-anchor picker-anchor-left">
                <GifPicker onSelect={handleGifSelect} onClose={() => setGifPickerOpen(false)} />
              </div>
            )}

            {/* Emoji picker */}
            {emojiPickerOpen && (
              <div id="emoji-picker-panel" className="picker-anchor picker-anchor-left">
                <EmojiPicker
                  onSelect={handleEmojiSelect}
                  onClose={() => setEmojiPickerOpen(false)}
                  recentEmoji={recentEmoji}
                />
              </div>
            )}
          </div>
        </div>

        {/* ── API error banner ── */}
        {feedError && (
          <div className="feed-error" role="alert">
            ⚠️ {feedError}
            <button onClick={() => loadPosts()} className="feed-error-retry">Retry</button>
          </div>
        )}

        {/* ── Feed controls ── */}
        {posts.length > 0 && (
          <>
            <div className="feed-controls">
              <div className="search-wrap">
                <span className="search-icon"><IconSearch /></span>
                <input
                  id="search-input"
                  className="search-input"
                  placeholder="Search posts"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  aria-label="Search posts"
                />
              </div>
              <button
                className="sort-btn"
                onClick={() => setSortAsc(s => !s)}
                id="sort-btn"
                aria-label={sortAsc ? 'Showing oldest first' : 'Showing newest first'}
              >
                {sortAsc ? '↑ Oldest' : '↓ Newest'}
              </button>
            </div>

            {allTags.length > 0 && (
              <div className="tag-filter-row" role="group" aria-label="Filter by tag">
                <button
                  className={`filter-chip${!filterTag ? ' active' : ''}`}
                  onClick={() => setFilterTag(null)}
                  id="filter-all"
                  aria-pressed={!filterTag}
                >All</button>
                {allTags.map(t => (
                  <button
                    key={t}
                    className={`filter-chip${filterTag === t ? ' active' : ''}`}
                    onClick={() => setFilterTag(f => f === t ? null : t)}
                    id={`filter-${t}`}
                    aria-pressed={filterTag === t}
                  >#{t}</button>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Feed header ── */}
        <div className="feed-header" aria-live="polite">
          <span className="feed-title">Feed</span>
          <span className="posts-count">{visiblePosts.length} {visiblePosts.length === 1 ? 'post' : 'posts'}</span>
        </div>

        {/* ── Posts ── */}
        {feedLoading
          ? (
            <div className="feed-loading" role="status" aria-label="Loading posts">
              <div className="feed-spinner" aria-hidden="true" />
              <span>Loading posts…</span>
            </div>
          )
          : visiblePosts.length === 0
          ? (
            <div className="empty-state">
              <div className="empty-title">
                {posts.length === 0 ? 'Nothing here yet' : 'No results found'}
              </div>
              <div className="empty-sub">
                {posts.length === 0
                  ? "Write your first post above — it'll appear here."
                  : 'Try a different search or clear the active filter.'}
              </div>
            </div>
          )
          : visiblePosts.map(post => (
            <PostCard
              key={post.id}
              post={post}
              onLike={toggleLike}
              onBookmark={toggleBookmark}
              onDelete={deletePost}
              onTagClick={t => setFilterTag(f => f === t ? null : t)}
            />
          ))
        }
      </main>

      <Toast toasts={toasts} />
    </div>
  )
}
