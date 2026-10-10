import {
  useEffect,
  useState,
} from "react"

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"

import {
  useParams,
} from "react-router-dom"

import {
  Circle,
  CircleCheck,
  CircleX,
  Clock3,
  LoaderCircle,
  Save,
} from "lucide-react"

import {
  getDossierActions,
  updateDossierAction,
} from "../../api/dossiers"

import type {
  DossierActionStatus,
} from "../../api/dossiers"

import type {
  MatchCheck,
} from "../../api/types"


function sameLot(
  left: string | null | undefined,
  right: string | null | undefined,
) {
  const a =
    left === null
    || left === undefined
    || left === ""
      ? null
      : String(left)

  const b =
    right === null
    || right === undefined
    || right === ""
      ? null
      : String(right)

  return a === b
}


function statusLabel(
  status: DossierActionStatus,
) {
  switch (status) {
    case "IN_PROGRESS":
      return "En cours"

    case "READY":
      return "Prêt"

    case "IMPOSSIBLE":
      return "Impossible"

    case "PENDING":
    default:
      return "À faire"
  }
}


function statusIcon(
  status: DossierActionStatus,
) {
  switch (status) {
    case "IN_PROGRESS":
      return (
        <Clock3
          size={15}
          strokeWidth={2.2}
        />
      )

    case "READY":
      return (
        <CircleCheck
          size={15}
          strokeWidth={2.2}
        />
      )

    case "IMPOSSIBLE":
      return (
        <CircleX
          size={15}
          strokeWidth={2.2}
        />
      )

    case "PENDING":
    default:
      return (
        <Circle
          size={15}
          strokeWidth={2.2}
        />
      )
  }
}


export function DossierActionControl({
  check,
  lotNumber,
}: {
  check: MatchCheck
  lotNumber?: string | null
}) {
  const {
    refConsultation,
    orgAcronyme,
  } = useParams()

  const queryClient =
    useQueryClient()

  const requirementType =
    String(
      check.code || ""
    )
      .trim()
      .toUpperCase()

  const actionsQuery =
    useQuery({
      queryKey: [
        "dossier-actions",
        refConsultation,
        orgAcronyme,
      ],

      enabled:
        Boolean(
          refConsultation
          && orgAcronyme
          && requirementType,
        ),

      queryFn: () =>
        getDossierActions(
          refConsultation!,
          orgAcronyme!,
        ),
    })


  const action =
    actionsQuery.data?.data.find(
      (item) =>
        item.requirement_type
          .toUpperCase()
          === requirementType
        && sameLot(
          item.lot_number,
          lotNumber,
        ),
    )


  const recommendedAction =
    check.user_view?.action
      ? String(
          check.user_view.action,
        ).trim()
      : ""


  const [notes, setNotes] =
    useState("")


  useEffect(
    () => {
      if (
        action?.notes
        && action.notes.trim()
      ) {
        setNotes(
          action.notes,
        )

        return
      }

      if (recommendedAction) {
        setNotes(
          recommendedAction,
        )

        return
      }

      setNotes("")
    },
    [
      action?.id,
      action?.notes,
      recommendedAction,
    ],
  )


  const mutation =
    useMutation({
      mutationFn: ({
        status,
        nextNotes,
      }: {
        status: DossierActionStatus
        nextNotes: string
      }) =>
        updateDossierAction(
          refConsultation!,
          orgAcronyme!,
          {
            lot_number:
              lotNumber ?? null,

            requirement_type:
              requirementType,

            status,

            notes:
              nextNotes.trim()
                || null,
          },
        ),

      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: [
              "dossier-actions",
              refConsultation,
              orgAcronyme,
            ],
          }),

          queryClient.invalidateQueries({
            queryKey: [
              "pilotage-overview",
            ],
          }),

          queryClient.invalidateQueries({
            queryKey: [
              "dossiers",
            ],
          }),
        ])
      },
    })


  if (!requirementType) {
    return null
  }


  const currentStatus:
    DossierActionStatus =
      action?.status
      ?? "PENDING"


  function saveStatus(
    status: DossierActionStatus,
  ) {
    mutation.mutate({
      status,
      nextNotes: notes,
    })
  }


  function saveNotes() {
    mutation.mutate({
      status: currentStatus,
      nextNotes: notes,
    })
  }


  return (
    <div
      className="dossier-human-action"
      data-status={currentStatus}
      data-requirement-type={
        requirementType
      }
      data-lot-number={
        lotNumber == null
          ? ""
          : String(lotNumber)
      }
    >
      <div className="dossier-human-action-head">
        <div>
          <span>
            ÉTAT DE PRÉPARATION
          </span>

          <strong
            className={
              "dossier-v56-current-status "
              + currentStatus.toLowerCase()
            }
          >
            {statusIcon(currentStatus)}

            <span>
              {statusLabel(currentStatus)}
            </span>
          </strong>
        </div>

        {mutation.isPending && (
          <small className="dossier-v56-saving">
            <LoaderCircle
              size={14}
              className="mor-icon-spin"
            />
            Enregistrement…
          </small>
        )}
      </div>


      <div className="dossier-action-buttons">
        {(
          [
            [
              "PENDING",
              "À faire",
            ],
            [
              "IN_PROGRESS",
              "En cours",
            ],
            [
              "READY",
              "Prêt",
            ],
            [
              "IMPOSSIBLE",
              "Impossible",
            ],
          ] as [
            DossierActionStatus,
            string,
          ][]
        ).map(
          ([
            value,
            label,
          ]) => (
            <button
              key={value}
              type="button"
              className={
                currentStatus
                  === value
                  ? "active "
                    + value
                      .toLowerCase()
                  : ""
              }
              disabled={
                mutation.isPending
              }
              onClick={() =>
                saveStatus(value)
              }
            >
              {statusIcon(value)}
              <span>
                {label}
              </span>
            </button>
          ),
        )}
      </div>


      <div className="dossier-action-notes">
        <label>
          Note de préparation
        </label>

        {!action?.notes
          && recommendedAction && (
          <div className="dossier-action-suggestion">
            Proposition MOR — modifiable
          </div>
        )}

        <textarea
          value={notes}
          rows={2}
          maxLength={4000}
          placeholder={
            "Ex. document demandé, "
            + "personne responsable, "
            + "information à obtenir…"
          }
          onChange={(event) =>
            setNotes(
              event.target.value,
            )
          }
        />

        <button
          type="button"
          disabled={
            mutation.isPending
          }
          onClick={saveNotes}
        >
          {mutation.isPending ? (
            <LoaderCircle
              size={15}
              className="mor-icon-spin"
            />
          ) : (
            <Save size={15} />
          )}

          <span>
            Enregistrer
          </span>
        </button>
      </div>


      {mutation.isError && (
        <p className="dossier-action-error">
          Impossible d’enregistrer
          cette action.
        </p>
      )}


      <p className="dossier-action-disclaimer">
        État de préparation saisi par
        l’utilisateur. Il ne remplace pas
        la qualification MOR ni une preuve
        documentaire validée.
      </p>
    </div>
  )
}
