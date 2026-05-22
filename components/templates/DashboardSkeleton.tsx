"use client";

import { Skeleton } from "@/components/atoms/Skeleton";

export function DashboardSkeleton() {
  return (
    <main className="pageShell">
      {/* Sidebar skeleton */}
      <aside className="sidebar" aria-hidden>
        <div className="brandBlock">
          <Skeleton variant="circular" width={48} height={48} />
          <Skeleton variant="text" width={40} height={10} />
        </div>
        <div className="navStack">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="navItem" style={{ cursor: "default" }}>
              <Skeleton variant="circular" width={24} height={24} />
              <Skeleton variant="text" width={50} height={8} />
            </div>
          ))}
        </div>
        <div className="modelNote">
          <Skeleton variant="text" width={36} height={8} />
          <Skeleton variant="text" width={48} height={10} />
        </div>
      </aside>

      {/* Content skeleton */}
      <section className="content">
        {/* Topbar */}
        <header className="topbar">
          <div>
            <Skeleton variant="text" width={140} height={14} />
            <Skeleton variant="text" width={300} height={28} />
          </div>
        </header>

        {/* Metric grid */}
        <div className="metricGrid">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="metric">
              <Skeleton variant="circular" width={40} height={40} />
              <Skeleton variant="text" width={80} height={12} />
              <Skeleton variant="text" width={120} height={28} />
            </div>
          ))}
        </div>

        {/* Two-panel grid */}
        <section className="mainGrid" aria-label="Distribución de riesgo">
          <div className="panel">
            <div className="panelHeader">
              <div>
                <Skeleton variant="text" width={100} height={12} />
                <Skeleton variant="text" width={180} height={18} />
              </div>
              <Skeleton variant="circular" width={20} height={20} />
            </div>
            <div className="riskBars">
              {[1, 2, 3].map((i) => (
                <div key={i}>
                  <div className="riskBarLabel">
                    <Skeleton variant="text" width={60} height={16} />
                    <Skeleton variant="text" width={40} height={14} />
                  </div>
                  <Skeleton variant="bar" width="100%" height={8} />
                </div>
              ))}
            </div>
          </div>

          <div className="panel">
            <div className="panelHeader">
              <div>
                <Skeleton variant="text" width={100} height={12} />
                <Skeleton variant="text" width={180} height={18} />
              </div>
              <Skeleton variant="circular" width={20} height={20} />
            </div>
            <div className="destinationList">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="destinationRow">
                  <div>
                    <Skeleton variant="text" width={130} height={16} />
                    <Skeleton variant="text" width={80} height={12} />
                  </div>
                  <Skeleton variant="text" width={40} height={16} />
                  <Skeleton variant="bar" width="100%" height={4} />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Table panel */}
        <section className="panel" aria-label="Cartera priorizada">
          <div className="panelHeader">
            <div>
              <Skeleton variant="text" width={120} height={12} />
              <Skeleton variant="text" width={260} height={18} />
            </div>
            <Skeleton variant="circular" width={20} height={20} />
          </div>

          {/* Table controls */}
          <div className="tableControls">
            <Skeleton variant="rectangular" height={48} borderRadius="9999px" />
            <Skeleton variant="rectangular" height={48} borderRadius="4px" />
            <Skeleton variant="rectangular" height={48} borderRadius="4px" />
            <Skeleton variant="rectangular" height={48} borderRadius="4px" />
          </div>

          {/* Table header */}
          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <th key={i}>
                      <Skeleton variant="text" width={60} height={12} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <tr key={i}>
                    {[1, 2, 3, 4, 5].map((j) => (
                      <td key={j}>
                        <Skeleton
                          variant="text"
                          width={j === 0 ? 30 : j === 2 ? 160 : 70}
                          height={14}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Lower grid */}
        <section className="lowerGrid">
          <div className="panel">
            <Skeleton variant="text" width={100} height={12} />
            <Skeleton variant="text" width={160} height={18} />
            <div className="clientSnapshot" style={{ marginTop: 16 }}>
              <Skeleton variant="text" width={140} height={16} />
              <Skeleton variant="text" width={100} height={12} />
            </div>
            <div className="formGrid" style={{ marginTop: 16 }}>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="field">
                  <Skeleton variant="text" width={80} height={12} />
                  <Skeleton variant="rectangular" height={44} borderRadius="4px 4px 0 0" />
                </div>
              ))}
            </div>
            <div style={{ marginTop: 16 }}>
            <Skeleton variant="rectangular" height={40} borderRadius="9999px" />
          </div>
          </div>

          <div className="panel chatPanel">
            <div className="messages">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="message bot"
                  style={{ maxWidth: i === 1 ? "60%" : "75%" }}
                >
                  <Skeleton variant="text" width="100%" height={14} />
                  <Skeleton variant="text" width="70%" height={14} />
                </div>
              ))}
            </div>
            <div className="chatInput">
              <Skeleton variant="text" width="100%" height={20} />
              <Skeleton variant="circular" width={40} height={40} />
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
