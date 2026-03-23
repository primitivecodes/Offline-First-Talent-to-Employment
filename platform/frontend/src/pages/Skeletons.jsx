/**
 * Skeleton loading components
 * Usage:
 *   <Skeleton width="100%" height={20} />
 *   <CardSkeleton />
 *   <TableRowSkeleton cols={4} rows={5} />
 */

const pulse = {
  background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)',
  backgroundSize: '400% 100%',
  animation: 'shimmer 1.4s ease infinite',
  borderRadius: 6,
};

export const Skeleton = ({ width = '100%', height = 16, style = {} }) => (
  <>
    <style>{`@keyframes shimmer { 0%{background-position:100% 0} 100%{background-position:-100% 0} }`}</style>
    <div style={{ ...pulse, width, height, ...style }} />
  </>
);

export const CardSkeleton = () => (
  <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', gap: 12 }}>
    <Skeleton height={20} width="60%" />
    <Skeleton height={14} width="85%" />
    <Skeleton height={14} width="70%" />
    <Skeleton height={36} style={{ marginTop: 8, borderRadius: 8 }} />
  </div>
);

export const TableRowSkeleton = ({ cols = 4, rows = 5 }) => (
  <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
    {/* Header */}
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 16, padding: '14px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
      {Array.from({ length: cols }).map((_, i) => <Skeleton key={i} height={12} width="60%" />)}
    </div>
    {/* Rows */}
    {Array.from({ length: rows }).map((_, ri) => (
      <div key={ri} style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 16, padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
        {Array.from({ length: cols }).map((_, ci) => <Skeleton key={ci} height={14} width={ci === 0 ? '80%' : '50%'} />)}
      </div>
    ))}
  </div>
);

export const GridSkeleton = ({ count = 6 }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px,1fr))', gap: 20 }}>
    {Array.from({ length: count }).map((_, i) => <CardSkeleton key={i} />)}
  </div>
);
