export class ApiError extends Error {
  status: number
  payload: unknown

  constructor(
    status: number,
    payload: unknown,
  ) {
    super(`API error ${status}`)
    this.status = status
    this.payload = payload
  }
}

export async function apiGet<T>(
  path: string,
): Promise<T> {
  const response = await fetch(path, {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  })

  let payload: unknown

  try {
    payload = await response.json()
  } catch {
    payload = null
  }

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload,
    )
  }

  return payload as T
}


function readCookie(
  name: string,
): string | null {
  const prefix = `${name}=`

  const item = document.cookie
    .split("; ")
    .find((part) =>
      part.startsWith(prefix)
    )

  if (!item) {
    return null
  }

  return decodeURIComponent(
    item.slice(prefix.length)
  )
}


export async function apiPatch<T>(
  path: string,
  body: unknown,
): Promise<T> {
  const csrf = readCookie(
    "mor_csrf"
  )

  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  }

  if (csrf) {
    headers["X-CSRF-Token"] = csrf
  }

  const response = await fetch(path, {
    method: "PATCH",
    credentials: "include",
    headers,
    body: JSON.stringify(body),
  })

  let payload: unknown

  try {
    payload = await response.json()
  } catch {
    payload = null
  }

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload,
    )
  }

  return payload as T
}


export async function apiPost<T>(
  path: string,
  body?: unknown,
): Promise<T> {
  const csrf = readCookie("mor_csrf")

  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  }

  if (csrf) {
    headers["X-CSRF-Token"] = csrf
  }

  const response = await fetch(path, {
    method: "POST",
    credentials: "include",
    headers,
    body:
      body === undefined
        ? undefined
        : JSON.stringify(body),
  })

  let payload: unknown

  try {
    payload = await response.json()
  } catch {
    payload = null
  }

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload,
    )
  }

  return payload as T
}


export async function apiDelete<T>(
  path: string,
): Promise<T> {
  const csrf = readCookie("mor_csrf")

  const headers: Record<string, string> = {
    Accept: "application/json",
  }

  if (csrf) {
    headers["X-CSRF-Token"] = csrf
  }

  const response = await fetch(path, {
    method: "DELETE",
    credentials: "include",
    headers,
  })

  let payload: unknown

  try {
    payload = await response.json()
  } catch {
    payload = null
  }

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload,
    )
  }

  return payload as T
}


export async function apiUploadFile<T>(
  path: string,
  file: File,
): Promise<T> {
  const csrf = readCookie("mor_csrf")

  let contentType = file.type

  if (!contentType) {
    const name = file.name.toLowerCase()

    if (name.endsWith(".pdf")) {
      contentType = "application/pdf"
    } else if (
      name.endsWith(".jpg")
      || name.endsWith(".jpeg")
    ) {
      contentType = "image/jpeg"
    } else if (
      name.endsWith(".png")
    ) {
      contentType = "image/png"
    }
  }

  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type":
      contentType
      || "application/octet-stream",

    "X-MOR-Filename":
      file.name,
  }

  if (csrf) {
    headers["X-CSRF-Token"] = csrf
  }

  const response = await fetch(path, {
    method: "POST",
    credentials: "include",
    headers,
    body: file,
  })

  let payload: unknown

  try {
    payload = await response.json()
  } catch {
    payload = null
  }

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload,
    )
  }

  return payload as T
}
