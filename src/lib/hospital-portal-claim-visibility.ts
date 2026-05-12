/**
 * Claims list / detail untuk portal hospital:
 * — Non-DRAFT: sama seperti klaim dari agen (sudah diajukan ke RS).
 * — DRAFT: hanya tampak jika dibuka oleh akun RS (created_by ada user_role HOSPITAL untuk hospital_id klaim).
 *   Draft dari agen ke RS tersebut tetap tersembunyi sampai status bukan DRAFT.
 */
export const HOSPITAL_PORTAL_CLAIM_VISIBILITY_SQL = `(
  c.status <> 'DRAFT'
  OR (
    c.status = 'DRAFT'
    AND EXISTS (
      SELECT 1
      FROM public.user_role urc
      WHERE urc.user_id = c.created_by_user_id
        AND urc.scope_type = 'HOSPITAL'
        AND urc.scope_id = c.hospital_id
    )
  )
)`;
