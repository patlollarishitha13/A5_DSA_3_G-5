function StatCard({
  title,
  value,
  icon,
  description,
}) {
  return (
    <div className="stat-card">

      <div className="stat-top">

        <span className="stat-title">
          {title}
        </span>

        <span className="stat-icon">
          {icon}
        </span>

      </div>

      <div className="stat-value">
        {value}
      </div>

      <div className="stat-description">
        {description}
      </div>

    </div>
  );
}

export default StatCard;