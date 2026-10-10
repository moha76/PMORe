import { Brand } from "../premium/Brand"
import {
  useState,
} from "react"

import type {
  FormEvent,
} from "react"

import {
  Link,
  useNavigate,
  useSearchParams,
} from "react-router-dom"

import {
  login,
} from "../api/auth"

import {
  ApiError,
} from "../api/client"

export function LoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    setError(null)
    setSubmitting(true)

    try {
      await login(
        email.trim(),
        password,
      )

      const next = searchParams.get("next")

      navigate(
        next && next.startsWith("/") && !next.startsWith("//")
          ? next
          : "/v5/discover",
        {
          replace: true,
        },
      )
    } catch (err) {
      if (
        err instanceof ApiError
        && err.status === 429
      ) {
        setError(
          "Trop de tentatives. Réessayez plus tard.",
        )
      } else if (
        err instanceof ApiError
        && err.status === 401
      ) {
        setError(
          "Adresse e-mail ou mot de passe incorrect.",
        )
      } else {
        setError(
          "Impossible de se connecter pour le moment.",
        )
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <Link to="/" className="login-brand-link"><Brand /></Link>

        <div className="login-heading">
          <span className="eyebrow">
            Espace professionnel
          </span>

          <h1>Connexion</h1>

          <p>
            Accédez à vos opportunités,
            analyses DCE et décisions.
          </p>
        </div>

        <form
          className="login-form"
          onSubmit={handleSubmit}
        >
          <label>
            Adresse e-mail

            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) =>
                setEmail(
                  event.target.value,
                )
              }
            />
          </label>

          <label>
            Mot de passe

            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) =>
                setPassword(
                  event.target.value,
                )
              }
            />
          </label>

          {error && (
            <div className="login-error" role="alert">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="login-button"
            disabled={submitting}
          >
            {submitting
              ? "Connexion…"
              : "Se connecter"}
          </button>
        </form>
        <Link className="login-back" to="/">← Revenir à MOR</Link>
      </section>
    </main>
  )
}
