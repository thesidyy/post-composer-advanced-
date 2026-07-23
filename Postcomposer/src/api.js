/**
 * PostComposer API client
 * All fetch calls to the backend are centralised here.
 *
 * In development the Vite proxy forwards /api/* to localhost:3001.
 * In production VITE_API_URL points to the Render service URL.
 */

const BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';                              // proxied in dev, same-origin fallback

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      message = body.error || message;
    } catch { /* ignore */ }
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }

  return res.json();
}

/* ── Posts ─────────────────────────────────────────────────── */

/**
 * Fetch posts.
 * @param {{ search?: string, tag?: string, sort?: 'asc'|'desc', limit?: number, skip?: number }} params
 */
export async function getPosts(params = {}) {
  const qs = new URLSearchParams();
  if (params.search)  qs.set('search', params.search);
  if (params.tag)     qs.set('tag',    params.tag);
  if (params.sort)    qs.set('sort',   params.sort);
  if (params.limit)   qs.set('limit',  params.limit);
  if (params.skip)    qs.set('skip',   params.skip);

  const query = qs.toString();
  return request(`/posts${query ? `?${query}` : ''}`);
}

/**
 * Create a post.
 * @param {{ text: string, tags: string[], images: Array<{id,url,publicId}>, gif: object|null }} data
 */
export async function createPost(data) {
  return request('/posts', {
    method:  'POST',
    body:    JSON.stringify(data),
  });
}

/** Toggle like on a post */
export async function likePost(id) {
  return request(`/posts/${id}/like`, { method: 'PATCH' });
}

/** Toggle bookmark on a post */
export async function bookmarkPost(id) {
  return request(`/posts/${id}/bookmark`, { method: 'PATCH' });
}

/** Delete a post */
export async function deletePost(id) {
  return request(`/posts/${id}`, { method: 'DELETE' });
}

/* ── Images ────────────────────────────────────────────────── */

/**
 * Upload image files to Cloudinary via the backend.
 * @param {File[]} files
 * @returns {Promise<Array<{id: string, url: string, publicId: string}>>}
 */
export async function uploadImages(files) {
  const formData = new FormData();
  for (const file of files) {
    formData.append('images', file);
  }

  const res = await fetch(`${BASE}/upload`, {
    method: 'POST',
    body:   formData,
    // Don't set Content-Type — browser sets multipart boundary automatically
  });

  if (!res.ok) {
    let message = `Upload failed (HTTP ${res.status})`;
    try {
      const body = await res.json();
      message = body.error || message;
    } catch { /* ignore */ }
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }

  const { images } = await res.json();
  return images;
}
