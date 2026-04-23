type DashboardCardProps = {
  title: string
  value: string
  description: string
}

export function DashboardCard({ title, value, description }: DashboardCardProps) {
  return (
    <div className="dashboard-card">
      <p>{title}</p>
      <strong>{value}</strong>
      <span>{description}</span>
    </div>
  )
}