function Sidebar({ activePage, setActivePage }) {
  const menuItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: "⌂",
    },
    {
      id: "documents",
      label: "Documents",
      icon: "▤",
    },
    {
      id: "results",
      label: "Results",
      icon: "◫",
    },
    {
      id: "pipeline",
      label: "Pipeline",
      icon: "⌘",
    },
  ];

  return (
    <aside className="sidebar">

      <div className="brand">
        <div className="brand-mark">
          ND
        </div>

        <div className="brand-text">
          <strong>NearDetect</strong>
          <span>Detection Framework</span>
        </div>
      </div>

      <nav className="navigation">

        <p className="nav-title">
          WORKSPACE
        </p>

        {menuItems.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${
              activePage === item.id ? "active" : ""
            }`}
            onClick={() =>
              setActivePage(item.id)
            }
          >
            <span className="nav-icon">
              {item.icon}
            </span>

            <span>
              {item.label}
            </span>
          </button>
        ))}

      </nav>

      <div className="sidebar-bottom">

        <div className="algorithm-info">

          <span className="mini-dot"></span>

          <div>
            <strong>
              Algorithm Engine
            </strong>

            <p>
              Jaccard Similarity
            </p>
          </div>

        </div>

        <div className="sidebar-footer">
          NearDetect v1.0
        </div>

      </div>

    </aside>
  );
}

export default Sidebar;