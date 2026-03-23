import React from 'react';

// ── Shimmer animation injected once ──────────────────
const shimmerStyle = `
  @keyframes shimmer {
    0%   { background-position: -600px 0; }
    100% { background-position:  600px 0; }
  }
`;

// ── Base skeleton block ───────────────────────────────
// Every skeleton piece uses this — just give it a width,
// height, and optional borderRadius override.
const Skeleton = ({ width = '100%', height = 14, borderRadius = 6, style = {} }) => (
  <>
    <style>{shimmerStyle}</style>
    <div
      style={{
        width,
        height,
        borderRadius,
        background: 'linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%)',
        backgroundSize: '600px 100%',
        animation: 'shimmer 1.4s infinite linear',
        ...style,
      }}
    />
  </>
);

// ── 1. Text skeleton ──────────────────────────────────
// Shows several lines of varying width — mimics a paragraph.
// Used anywhere text content is loading (descriptions, feedback, messages).
const TextSkeleton = ({ lines = 4 }) => {
  // Vary the widths so it looks natural, not robotic
  const widths = ['60%', '90%', '75%', '50%', '80%', '65%'];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} width={widths[i % widths.length]} height={14} />
      ))}
    </div>
  );
};

// ── 2. Card skeleton ──────────────────────────────────
// Mimics a module card — track tag, title, description, button.
// Used in LearnerDashboard while modules are loading.
const CardSkeleton = () => (
  <div
    style={{
      background: '#fff',
      borderRadius: 12,
      padding: 20,
      border: '1px solid #e2e8f0',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
    }}
  >
    {/* track tag */}
    <Skeleton width="38%" height={10} borderRadius={99} />
    {/* title */}
    <Skeleton width="75%" height={18} />
    {/* description line 1 */}
    <Skeleton width="100%" height={12} />
    {/* description line 2 */}
    <Skeleton width="60%" height={12} />
    {/* spacer */}
    <div style={{ marginTop: 4 }} />
    {/* button */}
    <Skeleton width="100%" height={36} borderRadius={10} />
  </div>
);

// ── 3. Grid skeleton ──────────────────────────────────
// Renders N card skeletons in a responsive grid.
// Used in LearnerDashboard — replace the module grid while loading.
// Usage: <GridSkeleton count={6} />
const GridSkeleton = ({ count = 6 }) => (
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
      gap: 20,
    }}
  >
    {Array.from({ length: count }).map((_, i) => (
      <CardSkeleton key={i} />
    ))}
  </div>
);

// ── 4. Table row skeleton ─────────────────────────────
// Mimics one row of a data table — several columns of varying width.
// Used in AdminSubmissions, PaymentHistory while data is loading.
// Usage: <TableRowSkeleton columns={4} />
const TableRowSkeleton = ({ columns = 4 }) => {
  const colWidths = ['70%', '50%', '60%', '40%', '80%'];
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: 16,
        padding: '12px 16px',
        borderBottom: '1px solid #f1f5f9',
        alignItems: 'center',
      }}
    >
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} width={colWidths[i % colWidths.length]} height={12} />
      ))}
    </div>
  );
};

// ── 5. Profile skeleton ───────────────────────────────
// Mimics the user profile header — avatar circle + name + role + bio line.
// Used in PortfolioPage and EditProfile while user data is loading.
const ProfileSkeleton = () => (
  <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', padding: '8px 0' }}>
    {/* avatar */}
    <Skeleton width={56} height={56} borderRadius={50} style={{ flexShrink: 0 }} />
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 4 }}>
      {/* name */}
      <Skeleton width="45%" height={18} />
      {/* role / track */}
      <Skeleton width="30%" height={12} />
      {/* bio line */}
      <Skeleton width="70%" height={12} />
    </div>
  </div>
);

// ── 6. Certificate skeleton ───────────────────────────
// Mimics a certificate list item — icon + title + date + buttons.
// Used in MyCertificates while the list is loading.
const CertificateSkeleton = () => (
  <div
    style={{
      background: '#fff',
      borderRadius: 12,
      padding: '16px 20px',
      border: '1px solid #e2e8f0',
      display: 'flex',
      alignItems: 'center',
      gap: 16,
    }}
  >
    {/* icon placeholder */}
    <Skeleton width={40} height={40} borderRadius={10} style={{ flexShrink: 0 }} />
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* cert title */}
      <Skeleton width="55%" height={14} />
      {/* issued date */}
      <Skeleton width="30%" height={11} />
    </div>
    {/* action buttons */}
    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
      <Skeleton width={60} height={30} borderRadius={8} />
      <Skeleton width={60} height={30} borderRadius={8} />
    </div>
  </div>
);

export {
  Skeleton,
  TextSkeleton,
  CardSkeleton,
  GridSkeleton,
  TableRowSkeleton,
  ProfileSkeleton,
  CertificateSkeleton,
};
