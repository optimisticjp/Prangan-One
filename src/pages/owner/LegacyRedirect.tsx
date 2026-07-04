import { Navigate, useParams } from 'react-router-dom'

export default function OwnerLegacyRedirect() {
  const { id } = useParams()
  return <Navigate to={`/owner/societies/${id}`} replace />
}
